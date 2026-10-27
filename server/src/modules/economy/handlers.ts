/** economy · 动作实现 */
import type { Handler } from '../../gateway/handlers.ts';
import { ERR } from '@wodefa/contracts';
import type { SellReq } from '@wodefa/contracts/src/economy/index.ts';
import { sell, EconomyError } from './service.ts';

export const economyHandlers = {
  /** 商人回收物品（ADR-0012 影子账本校验）。merchantId 从 params 传（客户端选了哪个商人）。 */
  'economy.sell': (async (req, t, ctx) => {
    const playerId = ctx.claims?.sub;
    if (!playerId) return { c: ERR.NOT_LOGGED_IN, msg: 'not logged in', t };
    const p = req.p as SellReq & { merchantId?: string };
    try {
      const res = await sell(playerId, p, p.merchantId ?? 'merchant_village', t, req.m?.rid);
      return { c: 0, d: res, t };
    } catch (e) {
      if (e instanceof EconomyError) return { c: e.code, msg: e.message, t };
      throw e;
    }
  }) as Handler,
};
