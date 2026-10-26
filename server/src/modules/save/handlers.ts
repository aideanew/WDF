/** save · 动作实现 */
import type { Handler } from '../../gateway/handlers.ts';
import { ERR } from '@wodefa/contracts';
import type { SavePullRes, SavePushReq, SavePushRes } from '@wodefa/contracts/src/save/index.ts';
import { pull, push } from './service.ts';

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
};
