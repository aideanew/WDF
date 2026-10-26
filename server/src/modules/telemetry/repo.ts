/** telemetry · 数据访问（复用 audit_log 落地，专用 TTL 表留待 0002 迁移） */
import { q } from '../../core/db.ts';

/** 批量写入埋点事件（audit_log：actor=客户端标识，action='telemetry'，detail=事件数组）。 */
export async function insertEvents(actor: string, events: unknown[]): Promise<void> {
  await q(
    "INSERT INTO audit_log (actor, action, detail) VALUES ($1, 'telemetry', $2)",
    [actor, JSON.stringify(events)],
  );
}
