/** ops · 数据访问（regions 表 + 封禁 player.banned_until）。
 *  运维开关模块，卡面明定职责含「封禁」，故可碰 account 的 player 表（SQL 级，非跨模块 import）。 */
import { q } from '../../core/db.ts';

/** 事务感知执行器（同 account/repo.ts 范式）：tx 提供时用 tx.query，否则退回全局 q。 */
async function qx<T>(tx: unknown, sql: string, params: unknown[] = []): Promise<T[]> {
  if (tx) {
    const res = await (tx as { query: (s: string, p: unknown[]) => Promise<{ rows: T[] }> }).query(sql, params);
    return res.rows;
  }
  return q<T>(sql, params);
}

/**
 * 开新区并置为当前开放区。
 * 事务内先把现有 current 全部置 false，再插入/置为新区 —— 保证全表至多一行 is_current=true。
 * 部分唯一索引兜底：若某实现误把两区都置 current，第二笔违反唯一约束报错（不是靠代码自觉）。
 * FIX-29：重开同一区（ON CONFLICT DO UPDATE）**不重写 opened_at**——开区时间只写一次，
 * 改名/改状态可以，但「首次开区时间」不该被冲成现在。
 */
export async function openRegion(id: string, name: string, tx?: unknown): Promise<void> {
  await qx(tx, 'UPDATE regions SET is_current = false WHERE is_current', []);
  await qx(
    tx,
    `INSERT INTO regions (id, name, status, is_current) VALUES ($1, $2, 'open', true)
     ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name, status = 'open', is_current = true`,
    [id, name],
  );
}

/** 封禁玩家：把 banned_until 设为给定时间。返回命中的行数（0 = 玩家不存在）。 */
export async function banPlayer(playerId: string, untilIso: string, tx?: unknown): Promise<number> {
  const rows = await qx<{ id: string }>(
    tx,
    'UPDATE player SET banned_until = $2 WHERE id = $1 RETURNING id',
    [playerId, untilIso],
  );
  return rows.length;
}

/** 审计留痕（通用 audit_log 表，actor=操作者）。 */
export async function recordAudit(actor: string, action: string, detail: Record<string, unknown>, tx?: unknown): Promise<void> {
  await qx(
    tx,
    'INSERT INTO audit_log (actor, action, detail) VALUES ($1, $2, $3)',
    [actor, action, JSON.stringify(detail)],
  );
}
