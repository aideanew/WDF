/** leaderboard · 数据访问（income_daily 累加 + leaderboard_snapshot 快照） */
import { q } from '../../core/db.ts';

// 事务注意（与 account/save repo 同款，PGlite 实测）：事务回调内禁止调全局 q()，
// 必须用回调入参 tx。以下函数均带可选 tx 尾参。

/** 事务感知执行器：tx 提供时用 tx.query，否则退回全局 q。 */
async function qx<T>(tx: unknown, sql: string, params: unknown[] = []): Promise<T[]> {
  if (tx) {
    const res = await (tx as { query: (s: string, p: unknown[]) => Promise<{ rows: T[] }> }).query(sql, params);
    return res.rows;
  }
  return q<T>(sql, params);
}

export interface IncomeRow {
  player_id: string;
  season: string;
  day: string;
  value: string; // bigint 列经驱动返回为 string
  flagged: boolean;
}

/** 当日收益累加（UPSERT），返回累加后的行。 */
export async function addIncome(
  playerId: string,
  season: string,
  day: string,
  delta: number,
  flagged: boolean,
  tx?: unknown,
): Promise<IncomeRow> {
  const rows = await qx<IncomeRow>(
    tx,
    `INSERT INTO income_daily (player_id, season, day, value, flagged)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (player_id, season, day)
     DO UPDATE SET value = income_daily.value + $4, flagged = income_daily.flagged OR $5
     RETURNING player_id, season, day, value, flagged`,
    [playerId, season, day, delta, flagged],
  );
  // INSERT ... RETURNING 必然回一行；这里 throw 是不可达防御 ——
  // 但它把「契约被破」从"静默返回 undefined"变成"显式崩"，比悄悄坏掉好。
  const row = rows[0];
  if (!row) throw new Error(`income_daily upsert 未返回行：player=${playerId} day=${day}`);
  return row;
}

export interface TopRow {
  player_id: string;
  value: string;
  region: string | null;
  province: string | null;
}

/** 当日收益 top N（排除已标记复核的玩家），联 player 表取 region/province。 */
export async function topIncomes(season: string, day: string, limit: number, tx?: unknown): Promise<TopRow[]> {
  return qx<TopRow>(
    tx,
    `SELECT i.player_id, i.value, p.region, p.province
       FROM income_daily i
       JOIN player p ON p.id = i.player_id
      WHERE i.season = $1 AND i.day = $2 AND i.flagged = false
      ORDER BY i.value DESC, i.player_id ASC
      LIMIT $3`,
    [season, day, limit],
  );
}

export interface SnapshotRow {
  season: string;
  scope: string;
  taken_at: string;
  rows: unknown;
}

/** 写入一份新快照（taken_at=now，PK 三元组含 taken_at，历史快照自然保留）。 */
export async function insertSnapshot(
  season: string,
  scope: string,
  takenAtMs: number,
  rows: unknown,
  tx?: unknown,
): Promise<void> {
  await qx(
    tx,
    `INSERT INTO leaderboard_snapshot (season, scope, taken_at, rows)
     VALUES ($1, $2, to_timestamp($3 / 1000.0), $4)`,
    [season, scope, takenAtMs, JSON.stringify(rows)],
  );
}

/** 最新一份快照（按 taken_at 倒序取一）。无则 null。 */
export async function latestSnapshot(season: string, scope: string, tx?: unknown): Promise<SnapshotRow | null> {
  const rows = await qx<SnapshotRow>(
    tx,
    `SELECT season, scope, taken_at, rows
       FROM leaderboard_snapshot
      WHERE season = $1 AND scope = $2
      ORDER BY taken_at DESC
      LIMIT 1`,
    [season, scope],
  );
  return rows[0] ?? null;
}
