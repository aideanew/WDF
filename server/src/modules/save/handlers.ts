/** save · 动作实现 */
import type { Handler } from '../../gateway/handlers.ts';
import { ERR } from '@wodefa/contracts';
import type { SavePullRes, SavePushReq, SavePushRes, ResolveForkReq } from '@wodefa/contracts/src/save/index.ts';
import { pull, push, resolveFork, ForkError } from './service.ts';

export const saveHandlers = {
  'save.pull': (async (_req, t, ctx) => {
    const playerId = ctx.claims?.sub;
    if (!playerId) return { c: ERR.NOT_LOGGED_IN, msg: 'not logged in', t };
    const res: SavePullRes = await pull(playerId);
    return { c: 0, d: res, t };
  }) as Handler,

  'save.push': (async (req, t, ctx) => {
    const playerId = ctx.claims?.sub;
    if (!playerId) return { c: ERR.NOT_LOGGED_IN, msg: 'not logged in', t };
    const res: SavePushRes = await push(playerId, req.p as SavePushReq, t);
    return { c: 0, d: res, t };
  }) as Handler,

  /**
   * 分叉裁决：keep='cloud' 云端原样保留；keep='local' 用 localSnapshot 覆盖云端。
   * "另一支标记废弃"以 audit_log 留痕（save_fork 无状态列，见 service.ts 注释）。
   */
  'save.resolveFork': (async (req, t, ctx) => {
    const playerId = ctx.claims?.sub;
    if (!playerId) return { c: ERR.NOT_LOGGED_IN, msg: 'not logged in', t };
    try {
      const res = await resolveFork(playerId, req.p as ResolveForkReq, t);
      return { c: 0, d: res, t };
    } catch (e) {
      if (e instanceof ForkError) return { c: e.code, msg: e.message, t };
      throw e;
    }
  }) as Handler,
};
