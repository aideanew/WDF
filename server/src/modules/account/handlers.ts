/** account · 动作实现 */
import type { Handler } from '../../gateway/handlers.ts';
// 根入口用 `export * as account` 聚合，类型走深路径引入，避免与各模块同名类型互相污染
import type { LoginReq, LoginRes, RefreshRes } from '@wodefa/contracts/src/account/index.ts';
import type { Platform } from '@wodefa/contracts';
import { ERR } from '@wodefa/contracts';
import { issueToken, refreshClaims } from '../../gateway/auth.ts';
import { login } from './service.ts';

export const accountHandlers = {
  'account.login': (async (req, t) => {
    const p = req.p as LoginReq;
    const out = await login({ code: p.code, plat: p.plat, anonymousSaveId: p.anonymousSaveId });
    const res: LoginRes = {
      token: issueToken({ sub: out.playerId, region: out.region, plat: p.plat }),
      playerId: out.playerId,
      region: out.region,
      isNew: out.isNew,
      serverTime: t,
    };
    return { c: 0, d: res, t };
  }) as Handler,

  /**
   * 刷新会话：
   *  - 标 auth:false（网关不预先验令牌），由本 handler 用 refreshClaims 自校验签名；
   *  - 签名有效即重签发新令牌（沿用原 sub/region/plat），即便原令牌已过期；
   *  - 签名无效 → 2002，客户端退回登录流程。
   */
  'account.refresh': (async (_req, t, ctx) => {
    const claims = refreshClaims(ctx.token);
    if (!claims) return { c: ERR.SESSION_EXPIRED, msg: 'cannot refresh token', t };
    const token = issueToken({ sub: claims.sub, region: claims.region, plat: claims.plat as Platform });
    const res: RefreshRes = { token, serverTime: t };
    return { c: 0, d: res, t };
  }) as Handler,
};
