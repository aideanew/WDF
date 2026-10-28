/** 动作注册表：contracts 的动作名 → 具体实现。 */
import type { ActionName, RpcRequest, RpcResponse } from '@wodefa/contracts';
import { ERR } from '@wodefa/contracts';
import type { Claims } from './auth.ts';
import { accountHandlers } from '../modules/account/handlers.ts';
import { complianceHandlers } from '../modules/compliance/handlers.ts';
import { configHandlers } from '../modules/config/handlers.ts';
import { economyHandlers } from '../modules/economy/handlers.ts';
import { leaderboardHandlers } from '../modules/leaderboard/handlers.ts';
import { saveHandlers } from '../modules/save/handlers.ts';
import { telemetryHandlers } from '../modules/telemetry/handlers.ts';

import { chestHandlers } from '../modules/chest/handlers.ts';
import { adsHandlers } from '../modules/ads/handlers.ts';

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

/** 功能未开放信号（D-46=A 裁决，2026-10-28）：7 个 todo 动作统一返回此 msg。
 * 客户端据 `4999 + FEATURE_NOT_AVAILABLE` 走"未开放"态（不重试），而非当系统错误。
 * msg 用作协议是坏味道，但本期零契约变更（B 新增 4998 登记为解冻窗口候选）。 */
export const FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE';

/** 未实现的占位：返回 4999 + 固定 msg，客户端据此不重试、走"未开放"态。 */
const todo: Handler = async (_req, t) => ({ c: ERR.INTERNAL, msg: FEATURE_NOT_AVAILABLE, t });

/**
 * 动作 → 实现。`satisfies` 保证 contracts 里登记的每个动作都有实现，漏了编译失败。
 * 实测（2026-10-28）：**22 个动作，已落地 15 件，剩 7 个 todo**（TASK-7020 落地 ads.claim）。
 * todo 返回 `ERR.INTERNAL + FEATURE_NOT_AVAILABLE`（D-46=A），客户端走"未开放"态不重试 → 见 TASK-7003 未开放语义：
 *   todo = salvage.claimInfo / economy.buyQuota / event.start / event.submit / event.result / social.send / social.pull
 * 已实现 15 件 = account.login / account.refresh / account.bindStart / account.bindConfirm / compliance.check /
 *   save.pull / save.push / save.resolveFork / chest.open / economy.sell / leaderboard.report / leaderboard.query /
 *   ads.claim / telemetry.track / config.manifest。
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
  'chest.open': chestHandlers['chest.open'],
  'economy.buyQuota': todo,
  'economy.sell': economyHandlers['economy.sell'],
  'leaderboard.report': leaderboardHandlers['leaderboard.report'],
  'leaderboard.query': leaderboardHandlers['leaderboard.query'],
  'event.start': todo,
  'event.submit': todo,
  'event.result': todo,
  'social.send': todo,
  'social.pull': todo,
  'ads.claim': adsHandlers['ads.claim'],
  'telemetry.track': telemetryHandlers['telemetry.track'],
  'config.manifest': configHandlers['config.manifest'],
} satisfies Record<ActionName, Handler>;
