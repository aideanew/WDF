/** account · 数据访问（只碰 player / identity 两张表） */
import { q } from '../../core/db.ts';

export interface IdentityRow {
  platform: string;
  open_id: string;
  union_id: string | null;
  player_id: string;
}

export interface PlayerRow {
  id: string;
  region: string;
  province: string | null;
  created_at: string;
  banned_until: string | null;
}

export async function findIdentity(platform: string, openId: string): Promise<IdentityRow | null> {
  const rows = await q<IdentityRow>(
    'SELECT platform, open_id, union_id, player_id FROM identity WHERE platform = $1 AND open_id = $2',
    [platform, openId],
  );
  return rows[0] ?? null;
}

export async function findPlayer(playerId: string): Promise<PlayerRow | null> {
  const rows = await q<PlayerRow>(
    'SELECT id, region, province, created_at, banned_until FROM player WHERE id = $1',
    [playerId],
  );
  return rows[0] ?? null;
}

export async function insertPlayer(id: string, region: string): Promise<void> {
  await q('INSERT INTO player (id, region) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [id, region]);
}

export async function insertIdentity(platform: string, openId: string, playerId: string): Promise<void> {
  await q(
    'INSERT INTO identity (platform, open_id, player_id) VALUES ($1, $2, $3) ON CONFLICT (platform, open_id) DO NOTHING',
    [platform, openId, playerId],
  );
}

/**
 * 当前开放区服（D-53，2026-10-29）。
 * 先查 regions 表里 is_current 的那一行；查不到（表为空或未开放）时
 * 回落到 `WDF_DEFAULT_REGION ?? 's1'`，并打一次告警——**不允许静默**。
 * 回落值保留是为了保证 231 个既有测试不变红（D-53 约束①），
 * 表为空是本地开发常态（区名由运营给定，不种数据，约束③）。
 */
export async function currentRegion(): Promise<string> {
  const rows = await q<{ id: string }>('SELECT id FROM regions WHERE is_current LIMIT 1');
  if (rows[0]) return rows[0].id;
  const fallback = process.env.WDF_DEFAULT_REGION ?? 's1';
  console.warn(`[region] regions 表无当前开放区，回落本地默认区 ${fallback}（区名由运营给定，不种数据）`);
  return fallback;
}

/** 审计留痕（通用 audit_log 表，actor=操作者）。用于封号拒绝登录等可追溯动作。 */
export async function recordAudit(actor: string, action: string, detail: Record<string, unknown>, tx?: unknown): Promise<void> {
  await qx(
    tx,
    'INSERT INTO audit_log (actor, action, detail) VALUES ($1, $2, $3)',
    [actor, action, JSON.stringify(detail)],
  );
}

// —— 账号合并（AT-2201）：bind_ticket / identity 改挂 / save_fork 数据准备 ——
//
// 事务注意（PGlite 实测）：事务回调内**禁止**调用全局 q()（其内部走 getDb()，
// 与已开启的事务争抢同一单连接会永久死锁）；必须使用回调入参 tx 执行查询。
// 因此以下函数均带可选 tx 尾参：bindConfirm 的事务路径传 tx，非事务调用省略。

/** 事务感知执行器：tx 提供时用 tx.query，否则退回全局 q。 */
async function qx<T>(tx: unknown, sql: string, params: unknown[] = []): Promise<T[]> {
  if (tx) {
    const res = await (tx as { query: (s: string, p: unknown[]) => Promise<{ rows: T[] }> }).query(sql, params);
    return res.rows;
  }
  return q<T>(sql, params);
}

export interface BindTicketRow {
  ticket: string;
  player_id: string;
  expires_at: string;
  used_at: string | null;
}

export async function insertTicket(ticket: string, playerId: string, expiresAtMs: number, tx?: unknown): Promise<void> {
  await qx(
    tx,
    'INSERT INTO bind_ticket (ticket, player_id, expires_at) VALUES ($1, $2, to_timestamp($3 / 1000.0))',
    [ticket, playerId, expiresAtMs],
  );
}

export async function findTicket(ticket: string, tx?: unknown): Promise<BindTicketRow | null> {
  const rows = await qx<BindTicketRow>(
    tx,
    'SELECT ticket, player_id, expires_at, used_at FROM bind_ticket WHERE ticket = $1',
    [ticket],
  );
  return rows[0] ?? null;
}

export async function consumeTicket(ticket: string, usedAtMs: number, tx?: unknown): Promise<void> {
  await qx(
    tx,
    'UPDATE bind_ticket SET used_at = to_timestamp($2 / 1000.0) WHERE ticket = $1',
    [ticket, usedAtMs],
  );
}

/**
 * 把某玩家在某个平台上的 identity 改挂到另一个 player。返回受影响行数（0 表示没有可移动的 identity）。
 * 主键是 (platform, open_id)，只改 player_id，不会触碰主键，因而无唯一冲突。
 */
export async function moveIdentity(platform: string, fromPlayerId: string, toPlayerId: string, tx?: unknown): Promise<number> {
  const rows = await qx<{ platform: string; open_id: string }>(
    tx,
    'UPDATE identity SET player_id = $3 WHERE platform = $1 AND player_id = $2 RETURNING platform, open_id',
    [platform, fromPlayerId, toPlayerId],
  );
  return rows.length;
}

export interface SaveSnapshotRow {
  player_id: string;
  revision: number;
  schema_version: number;
  config_version: string;
  checksum: bigint;
  body: unknown;
  saved_at: string;
}

/** 读取玩家存档快照（用于 bindConfirm 判断 forkPending）。无则 null。 */
export async function findSnapshot(playerId: string, tx?: unknown): Promise<SaveSnapshotRow | null> {
  const rows = await qx<SaveSnapshotRow>(
    tx,
    `SELECT player_id, revision, schema_version, config_version, checksum, body, saved_at
     FROM save_snapshot WHERE player_id = $1`,
    [playerId],
  );
  return rows[0] ?? null;
}

/** 把"被合并方"的旧存档登记成分叉（source='bind'），供 AT-2202 save.resolveFork 裁决。 */
export async function insertFork(playerId: string, body: unknown, tx?: unknown): Promise<void> {
  await qx(
    tx,
    "INSERT INTO save_fork (player_id, source, body) VALUES ($1, 'bind', $2)",
    [playerId, JSON.stringify(body)],
  );
}
