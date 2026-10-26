/** 动作注册表：contracts 的动作名 → 具体实现。 */
import type { ActionName, RpcRequest, RpcResponse } from '@wodefa/contracts';
import { ERR } from '@wodefa/contracts';
import type { Claims } from './auth.ts';
import { accountHandlers } from '../modules/account/handlers.ts';
import { complianceHandlers } from '../modules/compliance/handlers.ts';
import { configHandlers } from '../modules/config/handlers.ts';
import { leaderboardHandlers } from '../modules/leaderboard/handlers.ts';
import { saveHandlers } from '../modules/save/handlers.ts';

/** 每个请求的上下文。鉴权后的 claims 由网关填好，handler 不再自己解 token。 */
export interface HandlerCtx {
  /** 原始令牌（未鉴权动作也可能需要，如 account.refresh） */
  token?: string;
  /** 鉴权通过后的声明；auth:false 的动作里为 undefined */
  claims?: Claims;
  /** 客户端 IP，用于限流与审计 */
  ip?: string;
}

export type Handler = (req: RpcRequest, t: number, ctx: HandlerCtx) => Promise<RpcResponse>;

/** 未实现的占位：返回 5xxx 而不是 200，避免客户端把"没写"当成"业务失败"重试。 */
const todo: Handler = async (_req, t) => ({ c: ERR.INTERNAL, msg: 'not implemented', t });

/**
 * 动作 → 实现。`satisfies` 保证 contracts 里登记的每个动作都有实现，漏了编译失败。
 * 当前已落地 11 件：account.login / account.refresh / account.bindStart / account.bindConfirm / compliance.check / save.pull / save.push / save.resolveFork / leaderboard.report / leaderboard.query / config.manifest。
 */
export const HANDLERS = {
  'account.login': accountHandlers['account.login'],
  'account.refresh': accountHandlers['account.refresh'],
  'account.bindStart': accountHandlers['account.bindStart'],
  'account.bindConfirm': accountHandlers['account.bindConfirm'],
  'compliance.check': complianceHandlers['compliance.check'],
  'save.pull': saveHandlers['save.pull'],
  'save.push': saveHandlers['save.push'],
  'save.resolveFork': saveHandlers['save.resolveFork'],
  'salvage.claimInfo': todo,
  'economy.buyQuota': todo,
  'leaderboard.report': leaderboardHandlers['leaderboard.report'],
  'leaderboard.query': leaderboardHandlers['leaderboard.query'],
  'event.start': todo,
  'event.submit': todo,
  'event.result': todo,
  'social.send': todo,
  'social.pull': todo,
  'ads.claim': todo,
  'telemetry.track': todo,
  'config.manifest': configHandlers['config.manifest'],
} satisfies Record<ActionName, Handler>;
