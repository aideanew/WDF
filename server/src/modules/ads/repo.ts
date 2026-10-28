/** ads · 数据访问（ledger_entry 计数：reason='ads.claim' 当日条数） */
import { q } from '../../core/db.ts';

/** 当日已 claim 次数（无记录=0）。dayStartUtcMs 为 Asia/Shanghai 当日零点的 UTC 毫秒。 */
export async function countClaimsToday(
  playerId: string,
  placement: string,
  dayStartUtcMs: number,
): Promise<number> {
  const rows = await q<{ n: string }>(
    `SELECT count(*) AS n FROM ledger_entry
     WHERE player_id = $1 AND reason = 'ads.claim' AND ref = $2
       AND created_at >= to_timestamp($3 / 1000.0)`,
    [playerId, placement, dayStartUtcMs],
  );
  return Number(rows[0]?.n ?? 0);
}

/** 写一条 claim 流水（asset=placement 作计数维度，delta=1，reason='ads.claim'，ref=placement）。 */
export async function recordClaim(playerId: string, placement: string, tx?: unknown): Promise<void> {
  const exec = tx
    ? (sql: string, params: unknown[]) =>
        (tx as { query: (s: string, p: unknown[]) => Promise<unknown> }).query(sql, params)
    : (sql: string, params: unknown[]) => q(sql, params);
  await exec(
    `INSERT INTO ledger_entry (player_id, asset, delta, reason, ref) VALUES ($1, $2, $3, 'ads.claim', $4)`,
    [playerId, placement, 1, placement],
  );
}
