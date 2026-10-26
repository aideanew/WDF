/** compliance · 动作实现 */
import type { Handler } from '../../gateway/handlers.ts';
import { ERR } from '@wodefa/contracts';
import { check } from './service.ts';

export const complianceHandlers = {
  'compliance.check': (async (_req, t, ctx) => {
    const playerId = ctx.claims?.sub;
    if (!playerId) return { c: ERR.NOT_LOGGED_IN, msg: 'not logged in', t };
    const res = await check(playerId);
    return { c: 0, d: res, t };
  }) as Handler,
};
