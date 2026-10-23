import type { ActionName, RpcRequest, RpcResponse } from '@wodefa/contracts';
import { ERR } from '@wodefa/contracts';

export type Handler = (req: RpcRequest, t: number) => Promise<RpcResponse>;
const todo: Handler = async (_req, t) => ({ c: ERR.INTERNAL, msg: 'not implemented', t });

/** 动作 → 实现。`satisfies` 保证 contracts 里登记的每个动作都有实现，漏了编译失败。 */
export const HANDLERS = {
  'account.login': todo,
  'account.refresh': todo,
  'account.bindStart': todo,
  'account.bindConfirm': todo,
  'compliance.check': todo,
  'save.pull': todo,
  'save.push': todo,
  'save.resolveFork': todo,
  'salvage.claimInfo': todo,
  'economy.buyQuota': todo,
  'leaderboard.report': todo,
  'leaderboard.query': todo,
  'event.start': todo,
  'event.submit': todo,
  'event.result': todo,
  'social.send': todo,
  'social.pull': todo,
  'ads.claim': todo,
  'telemetry.track': todo,
  'config.manifest': todo,
} satisfies Record<ActionName, Handler>;
