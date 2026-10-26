/** leaderboard · 动作实现 */
import type { Handler } from '../../gateway/handlers.ts';
import { ERR } from '@wodefa/contracts';
import type { QueryReq, ReportReq } from '@wodefa/contracts/src/leaderboard/index.ts';
import { report, query, RateError } from './service.ts';

export const leaderboardHandlers = {
  /** 批量上报联网实时收获：写 income_daily + 刷新快照；超频 4001；seq 回退幂等返回。 */
  'leaderboard.report': (async (req, t, ctx) => {
    const playerId = ctx.claims?.sub;
    if (!playerId) return { c: ERR.NOT_LOGGED_IN, msg: 'not logged in', t };
    try {
      const res = await report(playerId, req.p as ReportReq, t);
      return { c: 0, d: res, t };
    } catch (e) {
      if (e instanceof RateError) return { c: e.code, msg: e.message, t };
      throw e;
    }
  }) as Handler,

  /** 查询榜单快照（读 leaderboard_snapshot 最新一份，不打实时库）。 */
  'leaderboard.query': (async (req, t, ctx) => {
    const claims = ctx.claims;
    if (!claims) return { c: ERR.NOT_LOGGED_IN, msg: 'not logged in', t };
    const res = await query(req.p as QueryReq, claims.sub, claims.region);
    return { c: 0, d: res, t };
  }) as Handler,
};
