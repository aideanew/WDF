/** telemetry · 业务（AT-2204：批量上报入库；超额拒绝；失败只 log 不抛，绝阻塞主流程） */
import { insertEvents } from './repo.ts';

// 设计口径（记执行日志 §7）：
//  - 落地：复用 audit_log（actor + action='telemetry' + detail），专用 TTL 表走 0002 迁移（升级条件）。
//  - 批量上限：env `WDF_TELEMETRY_MAX_BATCH` 默认 100；超限 → 4001（限流语义，error-catalog
//    4001 相关动作本就含 telemetry.track），不做逐条限频（埋点走批量，天然低频）。
//  - 失败容忍：写库失败仅 console.error 并仍返回成功 —— 埋点可丢，绝不能拖垮玩家主流程。
//  - 鉴权：telemetry.track 为 auth:false，actor 用客户端 IP（无则 'anon'），不与玩家身份强绑。

const DEFAULT_MAX_BATCH = 100;

export class TelemetryError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = 'TelemetryError';
    this.code = code;
  }
}

function maxBatch(): number {
  const n = Number(process.env.WDF_TELEMETRY_MAX_BATCH);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BATCH;
}

export interface TrackOutput {
  accepted: number;
}

export async function track(events: unknown, actor: string): Promise<TrackOutput> {
  const list = Array.isArray(events) ? events : [];
  if (list.length > maxBatch()) {
    throw new TelemetryError(4001, `batch too large: ${list.length} > ${maxBatch()}`);
  }
  if (list.length === 0) return { accepted: 0 };

  try {
    await insertEvents(actor, list);
  } catch (e) {
    // 埋点可丢：失败只记录，绝不向上抛（主流程不受影响）
    console.error('[telemetry] 落库失败（已丢弃）:', e);
  }
  return { accepted: list.length };
}
