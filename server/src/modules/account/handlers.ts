/** account · 动作实现 */
import type { Handler } from '../../gateway/handlers.ts';
// 根入口用 `export * as account` 聚合，类型走深路径引入，避免与各模块同名类型互相污染
import type { LoginReq, LoginRes, RefreshRes, BindStartRes, BindConfirmReq, BindConfirmRes } from '@wodefa/contracts/src/account/index.ts';
import type { Platform } from '@wodefa/contracts';
import { ERR } from '@wodefa/contracts';
import { issueToken, refreshClaims } from '../../gateway/auth.ts';
import { login, bindStart, bindConfirm, BindError, LoginError } from './service.ts';

export const accountHandlers = {
  'account.login': (async (req, t) => {
    const p = req.p as LoginReq;
    try {
      const out = await login({ code: p.code, plat: p.plat, anonymousSaveId: p.anonymousSaveId }, t);
      const res: LoginRes = {
        token: issueToken({ sub: out.playerId, region: out.region, plat: p.plat }),
        playerId: out.playerId,
        region: out.region,
        isNew: out.isNew,
        serverTime: t,
      };
      return { c: 0, d: res, t };
    } catch (e) {
      // 封号（2003 BANNED）：有现成错误码，不新造；信息带截止时间（D-53）。
      if (e instanceof LoginError) return { c: e.code, msg: e.message, t };
      throw e;
    }
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

  /**
   * 发起绑定：为当前登录玩家签发一次性票据（存 bind_ticket）。
   * auth:true + idempotent:true → 网关要求 rid，且同 (player, rid) 回放同一票据。
   */
  'account.bindStart': (async (_req, t, ctx) => {
    const playerId = ctx.claims?.sub;
    if (!playerId) return { c: ERR.NOT_LOGGED_IN, msg: 'not logged in', t };
    const out = await bindStart(playerId, t);
    const res: BindStartRes = { ticket: out.ticket, expiresAt: out.expiresAt };
    return { c: 0, d: res, t };
  }) as Handler,

  /**
   * 确认绑定：校验票据后把"确认方"在当前平台上的 identity 改挂到锚定方。
   * 票据失败（不存在/过期/已用/自绑/无身份）统一抛 2004 BIND_TICKET_INVALID（TASK-4015，见 service.ts 注释）。
   */
  'account.bindConfirm': (async (req, t, ctx) => {
    const playerId = ctx.claims?.sub;
    if (!playerId) return { c: ERR.NOT_LOGGED_IN, msg: 'not logged in', t };
    const plat = ctx.claims?.plat as Platform;
    try {
      const out = await bindConfirm((req.p as BindConfirmReq).ticket, playerId, plat, t);
      const res: BindConfirmRes = { playerId: out.playerId, forkPending: out.forkPending };
      return { c: 0, d: res, t };
    } catch (e) {
      if (e instanceof BindError) return { c: e.code, msg: e.message, t };
      throw e;
    }
  }) as Handler,
};
