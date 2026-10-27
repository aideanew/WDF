/** economy · 数据访问（ledger_entry 影子账本 + daily_quota 限购） */
import { q } from '../../core/db.ts';

export interface LedgerSum {
  gained: number;
  sold: number;
}

/** 查某玩家某物品的获得/卖出累计（影子账本校验基准）。 */
export async function ledgerSum(playerId: string, asset: string): Promise<LedgerSum> {
  const rows = await q<{ delta: string; }>(
    `SELECT delta FROM ledger_entry WHERE player_id = $1 AND asset = $2`,
    [playerId, asset],
  );
  let gained = 0;
  let sold = 0;
  for (const r of rows) {
    const d = Number(r.delta);
    if (d > 0) gained += d;
    else sold += -d;
  }
  return { gained, sold };
}

/** 写一条卖出流水（delta 为负数）。 */
export async function recordSell(playerId: string, asset: string, count: number, herbDelta: number, tx?: unknown): Promise<void> {
  const exec = tx
    ? (sql: string, params: unknown[]) => (tx as { query: (s: string, p: unknown[]) => Promise<unknown> }).query(sql, params)
    : (sql: string, params: unknown[]) => q(sql, params);
  await exec(
    `INSERT INTO ledger_entry (player_id, asset, delta, reason, ref) VALUES ($1, $2, $3, 'sell', $4)`,
    [playerId, asset, -count, `herb:${herbDelta}`],
  );
}

/** 写一条获得流水（delta 为正数，供 salvage.claimInfo 复用，TASK-4009）。 */
export async function recordGain(playerId: string, asset: string, count: number, reason: string, tx?: unknown): Promise<void> {
  const exec = tx
    ? (sql: string, params: unknown[]) => (tx as { query: (s: string, p: unknown[]) => Promise<unknown> }).query(sql, params)
    : (sql: string, params: unknown[]) => q(sql, params);
  await exec(
    `INSERT INTO ledger_entry (player_id, asset, delta, reason) VALUES ($1, $2, $3, $4)`,
    [playerId, asset, count, reason],
  );
}

/** 写一条扣除流水（delta 为负数）。开箱消耗箱子、活动消耗道具等走这里。 */
export async function recordLoss(playerId: string, asset: string, count: number, reason: string, tx?: unknown): Promise<void> {
  const exec = tx
    ? (sql: string, params: unknown[]) => (tx as { query: (s: string, p: unknown[]) => Promise<unknown> }).query(sql, params)
    : (sql: string, params: unknown[]) => q(sql, params);
  await exec(
    `INSERT INTO ledger_entry (player_id, asset, delta, reason) VALUES ($1, $2, $3, $4)`,
    [playerId, asset, -count, reason],
  );
}

// —— daily_quota（商人日限购）——

/** 查今日已用量（无记录=0）。day 取服务端 Asia/Shanghai 自然日。 */
export async function quotaUsed(playerId: string, merchantId: string, day: string): Promise<number> {
  const rows = await q<{ used: string }>(
    `SELECT used FROM daily_quota WHERE region = $1 AND day = $2 AND key = $3`,
    [playerId, day, `sell:${merchantId}`],
  );
  return Number(rows[0]?.used ?? 0);
}

/** 增加用量（upsert）。返回更新后的用量。 */
export async function quotaIncrement(playerId: string, merchantId: string, day: string, count: number, cap: number, tx?: unknown): Promise<number> {
  const exec = tx
    ? (sql: string, params: unknown[]) => (tx as { query: (s: string, p: unknown[]) => Promise<{ rows: { used: string }[] }> }).query(sql, params)
    : (sql: string, params: unknown[]) => q<{ used: string }>(sql, params);
  const rows = await exec(
    `INSERT INTO daily_quota (region, day, key, used, cap)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (region, day, key) DO UPDATE SET used = daily_quota.used + $4, cap = $5
     RETURNING used`,
    [playerId, day, `sell:${merchantId}`, count, cap],
  );
  return Number(rows[0]?.used ?? count);
}
