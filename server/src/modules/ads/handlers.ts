/** ads · 动作实现 */
import type { Handler } from '../../gateway/handlers.ts';
import { ERR } from '@wodefa/contracts';
import type { AdClaimReq } from '@wodefa/contracts/src/ads/index.ts';
import { claim, AdsError } from './service.ts';

export const adsHandlers = {
  /** 看一次激励视频（ADR-0014 只信客户端 + 日限）。placement 从 params 传。 */
  'ads.claim': (async (req, t, ctx) => {
    const playerId = ctx.claims?.sub;
    if (!playerId) return { c: ERR.NOT_LOGGED_IN, msg: 'not logged in', t };
    const p = req.p as AdClaimReq;
    try {
      const res = await claim(playerId, p.placement, t, req.m?.rid);
      return { c: 0, d: res, t };
    } catch (e) {
      if (e instanceof AdsError) return { c: e.code, msg: e.message, t };
      throw e;
    }
  }) as Handler,
};
