/**
 * account · 业务
 *
 * 本地开发不依赖微信服务器：把 `code` 哈希成稳定的伪 openid，
 * 同一 plat + 同一 code 永远落到同一个 player —— 反复重启联调不会换号、不会丢存档。
 *
 * 接真机/生产时只改 resolveOpenId()：换 `integrations/wechat/code2session`（已留目录）。
 */
import { createHash, randomUUID } from 'node:crypto';
import type { Platform } from '@wodefa/contracts';
import { ERR } from '@wodefa/contracts';
import { withTx } from '../../core/db.ts';
import {
  currentRegion,
  findIdentity,
  findPlayer,
  insertIdentity,
  insertPlayer,
  insertTicket,
  findTicket,
  consumeTicket,
  moveIdentity,
  findSnapshot,
  insertFork,
  recordAudit,
} from './repo.ts';

export interface LoginInput {
  code: string;
  plat: Platform;
  anonymousSaveId?: string;
}

export interface LoginOutput {
  playerId: string;
  region: string;
  isNew: boolean;
}

/** 生产：调平台 code2session 换 openid。本地：按 code 派生稳定伪 openid。 */
function resolveOpenId(plat: Platform, code: string): string {
  if (process.env.WDF_AUTH_MODE === 'platform') {
    // TODO(G-04 真机阶段)：微信 code2session / 抖音 code2session
    throw new Error('platform auth mode 尚未接入，设置 WDF_AUTH_MODE=dev 使用本地登录');
  }
  const h = createHash('sha256').update(`${plat}:${code}`).digest('hex').slice(0, 24);
  return `dev_${h}`;
}

/** 登录流程的业务错误：携带错误码，handler 层据此转 RpcResponse（同 BindError 范式）。 */
export class LoginError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = 'LoginError';
    this.code = code;
  }
}

/**
 * 玩家当前是否处于封禁期（banned_until 在未来）。
 * 供 login / assertNotBanned 共用**同一段判断**，不复制第二份（FIX-27）。
 * 未封禁、玩家不存在、或已过截止 → null；否则返回截止时间。
 */
async function activeBanUntil(playerId: string, nowMs: number): Promise<Date | null> {
  const player = await findPlayer(playerId);
  if (!player?.banned_until) return null;
  const until = new Date(player.banned_until);
  return until.getTime() > nowMs ? until : null;
}

/**
 * 封号校验：玩家处于封禁期 → 写 audit_log(actor=plat, action='refresh_banned') 并抛 2003 BANNED。
 * 供会话刷新（account.refresh）在重签发令牌前调用，保证封号对"已登录会话"也生效（FIX-27）。
 * nowMs 为服务端时间（handler 的 t 注入），不用 Date.now()。
 */
export async function assertNotBanned(playerId: string, plat: Platform, nowMs: number): Promise<void> {
  const until = await activeBanUntil(playerId, nowMs);
  if (until) {
    await recordAudit(plat, 'refresh_banned', { playerId, banned_until: until.toISOString() });
    throw new LoginError(ERR.BANNED, `account banned until ${until.toISOString()}`);
  }
}

/**
 * 登录。nowMs 为服务端当前时间（毫秒，由 handler 的 t 传入），
 * 用于封号判断——不用 Date.now()，保证测试可注入。
 * 封号（banned_until 在未来）→ 抛 2003 BANNED，并写 audit_log 留痕（可追溯）。
 */
export async function login(input: LoginInput, nowMs: number): Promise<LoginOutput> {
  const openId = resolveOpenId(input.plat, input.code);

  const identity = await findIdentity(input.plat, openId);
  if (identity) {
    const player = await findPlayer(identity.player_id);
    if (player) {
      const until = await activeBanUntil(player.id, nowMs);
      if (until) {
        await recordAudit(input.plat, 'login_banned', {
          playerId: player.id,
          banned_until: until.toISOString(),
        });
        throw new LoginError(ERR.BANNED, `account banned until ${until.toISOString()}`);
      }
      return { playerId: player.id, region: player.region, isNew: false };
    }
  }

  const region = await currentRegion();
  const playerId = `p_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
  await insertPlayer(playerId, region);
  await insertIdentity(input.plat, openId, playerId);
  return { playerId, region, isNew: true };
}

/**
 * 玩家是否真实存在（令牌里的 sub 有可能指向已注销的号）。
 * 供其他模块调用的出口 —— 跨模块只允许依赖 service，不允许直接读别的模块 repo。
 */
export async function playerExists(playerId: string): Promise<boolean> {
  const player = await findPlayer(playerId);
  return Boolean(player);
}

// —— 账号合并（AT-2201）——
//
// 合并方向（architecture-overview.md:161）：A 平台 `bindStart` 锚定 A 的 player（票据记 player_id=A）；
// B 平台 `bindConfirm(ticket)` 把 B 在当前平台上的 identity 改挂到 A；若 B 已有存档则标记 forkPending
// 并登记 save_fork(source='bind')，由 AT-2202 save.resolveFork 裁决，两方存档"不相加"。
//
// 错误码：TASK-4015 契约解冻后，票据失败（不存在 / 过期 / 已用 / 自绑 / 无身份）
// 统一抛 2004 BIND_TICKET_INVALID（原复用 2001 的缺口已关闭，D-12）。
// 2001 仍只表示"确实没登录/没身份"的上下文缺失，不表示票据本身无效。

/** 票据有效期：10 分钟（一次性，过期作废）。 */
const BIND_TICKET_TTL_MS = 10 * 60 * 1000;

/** 合并流程的业务错误：携带错误码，handler 层据此转 RpcResponse。 */
export class BindError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = 'BindError';
    this.code = code;
  }
}

export interface BindStartResult {
  ticket: string;
  expiresAt: number;
}

/** 为当前 player 签发一次性绑定票据。幂等由网关 idempotency 表（同 player+rid）保证。 */
export async function bindStart(playerId: string, t: number): Promise<BindStartResult> {
  const ticket = randomUUID();
  const expiresAt = t + BIND_TICKET_TTL_MS;
  await insertTicket(ticket, playerId, expiresAt);
  return { ticket, expiresAt };
}

export interface BindConfirmResult {
  /** 锚定方 playerId（A 平台，合并后双方共用） */
  playerId: string;
  /** B 方并入前已有存档 → true，需走 save.resolveFork */
  forkPending: boolean;
}

/**
 * 校验票据并把"确认方"在当前平台上的 identity 改挂到锚定方。
 * 全程包在事务里：任一环节失败整体回滚，避免"身份已挪但分叉未登记"导致串号/丢档。
 */
export async function bindConfirm(
  ticket: string,
  confirmerPlayerId: string,
  confirmerPlat: Platform,
  t: number,
): Promise<BindConfirmResult> {
  return withTx(async (tx) => {
    const row = await findTicket(ticket, tx);
    if (!row) throw new BindError(ERR.BIND_TICKET_INVALID, 'bind ticket not found');
    if (row.used_at) throw new BindError(ERR.BIND_TICKET_INVALID, 'bind ticket already used');
    if (new Date(row.expires_at).getTime() < t) throw new BindError(ERR.BIND_TICKET_INVALID, 'bind ticket expired');

    const anchor = row.player_id;
    if (anchor === confirmerPlayerId) {
      throw new BindError(ERR.BIND_TICKET_INVALID, 'cannot bind a player to itself');
    }

    const moved = await moveIdentity(confirmerPlat, confirmerPlayerId, anchor, tx);
    if (moved === 0) throw new BindError(ERR.BIND_TICKET_INVALID, 'no identity to bind on this platform');

    const snap = await findSnapshot(confirmerPlayerId, tx);
    let forkPending = false;
    if (snap) {
      await insertFork(anchor, snap.body, tx);
      forkPending = true;
    }

    await consumeTicket(ticket, t, tx);
    return { playerId: anchor, forkPending };
  });
}
