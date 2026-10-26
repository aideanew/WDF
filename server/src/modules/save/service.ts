/**
 * save · 业务（乐观锁，MUST-05 / 06.5）
 *
 * 规则：
 *  - 首次上传：baseRevision 必须为 0，写入 revision=1；
 *  - 后续上传：baseRevision 必须等于云端当前 revision，成功则 revision+1；
 *  - 不匹配：**不报错**，返回 `{accepted:false, conflict}`，由客户端决定（S5 的 resolveFork）。
 */
import type { SavePullRes, SavePushReq, SavePushRes, SaveSummary } from '@wodefa/contracts';
import { findSnapshot, insertSnapshot, updateSnapshot } from './repo.ts';

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
