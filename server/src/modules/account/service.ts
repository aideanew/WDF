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

export async function login(input: LoginInput): Promise<LoginOutput> {
  const openId = resolveOpenId(input.plat, input.code);

  const identity = await findIdentity(input.plat, openId);
  if (identity) {
    const player = await findPlayer(identity.player_id);
    if (player) return { playerId: player.id, region: player.region, isNew: false };
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
// 错误码：合同冻结只有 14 码且无专用"票据无效"码（TASK-1401 禁止自造数字）。
// 票据失败（不存在 / 过期 / 已用 / 自绑 / 无身份）统一复用 2001 NOT_LOGGED_IN —— 属 AUTH 段、
// 客户端按"鉴权失败"优雅回登录重来，不会像 2002 那样触发静默刷新死循环。属缺口填补，
// 待合同解冻后可新增 2004 BIND_TICKET_INVALID 精确区分。

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
    if (!row) throw new BindError(ERR.NOT_LOGGED_IN, 'bind ticket not found');
    if (row.used_at) throw new BindError(ERR.NOT_LOGGED_IN, 'bind ticket already used');
    if (new Date(row.expires_at).getTime() < t) throw new BindError(ERR.NOT_LOGGED_IN, 'bind ticket expired');

    const anchor = row.player_id;
    if (anchor === confirmerPlayerId) {
      throw new BindError(ERR.NOT_LOGGED_IN, 'cannot bind a player to itself');
    }

    const moved = await moveIdentity(confirmerPlat, confirmerPlayerId, anchor, tx);
    if (moved === 0) throw new BindError(ERR.NOT_LOGGED_IN, 'no identity to bind on this platform');

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
