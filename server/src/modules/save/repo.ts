/** save · 数据访问（save_snapshot 一人一行，PK = player_id） */
import { q } from '../../core/db.ts';

// 事务注意（与 account/repo.ts 同款，PGlite 实测）：事务回调内禁止调全局 q()
// （走 getDb() 与已开启事务争抢同一单连接会死锁），必须用回调入参 tx。
// 以下函数均带可选 tx 尾参：resolveFork 的事务路径传 tx，pull/push 非事务路径省略。

/** 事务感知执行器：tx 提供时用 tx.query，否则退回全局 q。 */
async function qx<T>(tx: unknown, sql: string, params: unknown[] = []): Promise<T[]> {
  if (tx) {
    const res = await (tx as { query: (s: string, p: unknown[]) => Promise<{ rows: T[] }> }).query(sql, params);
    return res.rows;
  }
  return q<T>(sql, params);
}

export interface SnapshotRow {
  player_id: string;
  revision: number;
  schema_version: number;
  config_version: string;
  checksum: number;
  body: unknown;
  saved_at: string;
}

export async function findSnapshot(playerId: string, tx?: unknown): Promise<SnapshotRow | null> {
  const rows = await qx<SnapshotRow>(
    tx,
    `SELECT player_id, revision, schema_version, config_version, checksum, body, saved_at
       FROM save_snapshot WHERE player_id = $1`,
    [playerId],
  );
  return rows[0] ?? null;
}

export interface SnapshotWrite {
  revision: number;
  schemaVersion: number;
  configVersion: string;
  checksum: number;
  body: unknown;
  savedAt: number;
}

export async function insertSnapshot(playerId: string, s: SnapshotWrite, tx?: unknown): Promise<void> {
  await qx(
    tx,
    `INSERT INTO save_snapshot (player_id, revision, schema_version, config_version, checksum, body, saved_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [playerId, s.revision, s.schemaVersion, s.configVersion, s.checksum, JSON.stringify(s.body), new Date(s.savedAt)],
  );
}

export async function updateSnapshot(playerId: string, s: SnapshotWrite, tx?: unknown): Promise<void> {
  await qx(
    tx,
    `UPDATE save_snapshot
        SET revision = $2, schema_version = $3, config_version = $4, checksum = $5, body = $6, saved_at = $7
      WHERE player_id = $1`,
    [playerId, s.revision, s.schemaVersion, s.configVersion, s.checksum, JSON.stringify(s.body), new Date(s.savedAt)],
  );
}

// —— 分叉裁决（AT-2202）：save_fork 无状态列，"另一支标记废弃"以 audit_log 留痕 ——

/** 该 player 当前未决分叉行数。 */
export async function countForks(playerId: string, tx?: unknown): Promise<number> {
  const rows = await qx<{ n: string }>(
    tx,
    'SELECT count(*)::text AS n FROM save_fork WHERE player_id = $1',
    [playerId],
  );
  return Number(rows[0]?.n ?? 0);
}

/** 删除该 player 全部未决分叉（裁决即收敛），返回删除行数。 */
export async function deleteForks(playerId: string, tx?: unknown): Promise<number> {
  const rows = await qx<{ player_id: string }>(
    tx,
    'DELETE FROM save_fork WHERE player_id = $1 RETURNING player_id',
    [playerId],
  );
  return rows.length;
}

/** 裁决留痕：写 audit_log（通用审计表，actor=playerId）。 */
export async function logForkResolved(actor: string, detail: Record<string, unknown>, tx?: unknown): Promise<void> {
  await qx(
    tx,
    "INSERT INTO audit_log (actor, action, detail) VALUES ($1, 'resolve_fork', $2)",
    [actor, JSON.stringify(detail)],
  );
}
