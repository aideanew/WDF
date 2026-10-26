/**
 * 写操作幂等（MUST-07）：同一 (playerId, rid) 在 24h 内重复提交，返回首次成功结果。
 *
 * 口径：**只缓存成功响应**（c === 0）。失败不缓存，允许客户端用同一 rid 重试——
 * 否则一次瞬时失败会把该 rid 永久钉死，反而更难恢复。
 */
import type { RpcResponse } from '@wodefa/contracts';
import { q } from '../core/db.ts';

const TTL_MS = 24 * 3600 * 1000;

export async function findIdempotent(playerId: string, rid: string): Promise<RpcResponse | null> {
  const rows = await q<{ response: RpcResponse; created_at: string }>(
    'SELECT response, created_at FROM idempotency WHERE player_id = $1 AND rid = $2',
    [playerId, rid],
  );
  if (rows.length === 0) return null;
  const age = Date.now() - new Date(rows[0].created_at).getTime();
  if (age > TTL_MS) return null;
  return rows[0].response;
}

export async function rememberIdempotent(playerId: string, rid: string, response: RpcResponse): Promise<void> {
  await q(
    `INSERT INTO idempotency (player_id, rid, response) VALUES ($1, $2, $3)
     ON CONFLICT (player_id, rid) DO NOTHING`,
    [playerId, rid, JSON.stringify(response)],
  );
}
