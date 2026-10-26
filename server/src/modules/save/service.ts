/**
 * save · 业务（乐观锁，MUST-05 / 06.5）
 *
 * 规则：
 *  - 首次上传：baseRevision 必须为 0，写入 revision=1；
 *  - 后续上传：baseRevision 必须等于云端当前 revision，成功则 revision+1；
 *  - 不匹配：**不报错**，返回 `{accepted:false, conflict}`，由客户端决定（S5 的 resolveFork）。
 */
import type { SavePullRes, SavePushReq, SavePushRes, SaveSummary, ResolveForkReq } from '@wodefa/contracts';
import { ERR } from '@wodefa/contracts';
import { withTx } from '../../core/db.ts';
import { findSnapshot, insertSnapshot, updateSnapshot, countForks, deleteForks, logForkResolved } from './repo.ts';

interface SnapshotShape {
  schemaVersion?: unknown;
  configVersion?: unknown;
  modules?: Record<string, unknown>;
}

function summaryOf(row: {
  revision: number;
  schema_version: number;
  saved_at: string;
  body: unknown;
}): SaveSummary {
  const body = (row.body ?? {}) as SnapshotShape;
  const progression = (body.modules?.progression ?? {}) as { level?: unknown };
  const level = typeof progression.level === 'number' ? progression.level : 1;
  return {
    revision: row.revision,
    savedAt: new Date(row.saved_at).getTime(),
    schemaVersion: row.schema_version,
    level,
  };
}

export async function pull(playerId: string): Promise<SavePullRes> {
  const row = await findSnapshot(playerId);
  if (!row) return { summary: null };
  return { summary: summaryOf(row), snapshot: row.body };
}

export async function push(playerId: string, input: SavePushReq, serverNow: number): Promise<SavePushRes> {
  const body = (input.snapshot ?? {}) as SnapshotShape;
  const schemaVersion = typeof body.schemaVersion === 'number' ? body.schemaVersion : 1;
  const configVersion = typeof body.configVersion === 'string' ? body.configVersion : 'unknown';

  const current = await findSnapshot(playerId);

  if (!current) {
    if (input.baseRevision !== 0) {
      // 云端没有档，客户端却以为有 —— 按冲突处理，让玩家选，不静默覆盖
      return {
        accepted: false,
        conflict: { revision: 0, savedAt: serverNow, schemaVersion, level: 1 },
      };
    }
    await insertSnapshot(playerId, {
      revision: 1,
      schemaVersion,
      configVersion,
      checksum: input.checksum,
      body: input.snapshot,
      savedAt: serverNow,
    });
    return { accepted: true, revision: 1 };
  }

  if (input.baseRevision !== current.revision) {
    return { accepted: false, conflict: summaryOf(current) };
  }

  const next = current.revision + 1;
  await updateSnapshot(playerId, {
    revision: next,
    schemaVersion,
    configVersion,
    checksum: input.checksum,
    body: input.snapshot,
    savedAt: serverNow,
  });
  return { accepted: true, revision: next };
}

// —— 分叉裁决（AT-2202）——
//
// 契约冻结口径（v001 03-contracts-freeze §动作表）：入参 `ResolveForkReq{keep:'local'|'cloud'; localSnapshot?}`，
// 返回 `{revision}`。任务卡 ES 旧文 `resolveFork(baseRevision, chosenRevision)` 与冻结契约冲突，以契约为准。
//
// 语义（覆盖两类分叉来源，不以 save_fork 行存在为前置——push 冲突场景不产生 fork 行）：
//  - keep='cloud'：云端原样保留（无副作用，可重复），清除未决 fork 行；返回当前云端 revision（无档为 0）。
//  - keep='local'：localSnapshot 必填（缺 → 1001）；写入 save_snapshot（revision=当前+1 或 1），
//    清除未决 fork 行；返回新 revision。不同 rid 重复提交内容收敛（同一份本地档覆盖），无害。
//  - "另一支标记废弃"：save_fork 表无状态列（0001 已执行不得改），以 audit_log(action='resolve_fork') 留痕。
//
// 校验口径与 push 一致（schemaVersion/configVersion 从 body 提取兜底）；checksum 同 push 信任口径
// （从 body.checksum 读，非整数兜底 0）——客户端 checksum 权威化留待统一收紧，此处登记 NOTE。

/** 分叉裁决的业务错误：携带错误码，handler 层据此转 RpcResponse。 */
export class ForkError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = 'ForkError';
    this.code = code;
  }
}

export interface ResolveForkOutput {
  revision: number;
}

export async function resolveFork(playerId: string, input: ResolveForkReq, serverNow: number): Promise<ResolveForkOutput> {
  return withTx(async (tx) => {
    const current = await findSnapshot(playerId, tx);

    if (input.keep === 'local') {
      if (input.localSnapshot === undefined || input.localSnapshot === null) {
        throw new ForkError(ERR.BAD_PAYLOAD, 'localSnapshot required when keep=local');
      }
      const body = (input.localSnapshot ?? {}) as SnapshotShape & { checksum?: unknown };
      const schemaVersion = typeof body.schemaVersion === 'number' ? body.schemaVersion : 1;
      const configVersion = typeof body.configVersion === 'string' ? body.configVersion : 'unknown';
      const checksum = typeof body.checksum === 'number' && Number.isInteger(body.checksum) ? body.checksum : 0;
      const revision = (current?.revision ?? 0) + 1;
      const write = { revision, schemaVersion, configVersion, checksum, body: input.localSnapshot, savedAt: serverNow };
      if (current) await updateSnapshot(playerId, write, tx);
      else await insertSnapshot(playerId, write, tx);
      await deleteForks(playerId, tx);
      await logForkResolved(playerId, { keep: 'local', revision }, tx);
      return { revision };
    }

    // keep='cloud'：云端原样保留，清除未决分叉（bind 场景 forkPending 的数据源即 fork 行）
    const discarded = await deleteForks(playerId, tx);
    if (discarded > 0) {
      await logForkResolved(playerId, { keep: 'cloud', discardedForks: discarded }, tx);
    }
    return { revision: current?.revision ?? 0 };
  });
}

/** 未决分叉数（供 handler 之外的调用方了解 forkPending 状态，如 AT-2402 e2e）。 */
export async function pendingForks(playerId: string): Promise<number> {
  return countForks(playerId);
}
