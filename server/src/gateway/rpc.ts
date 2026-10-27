/**
 * 网关：动作校验 → payload 校验 → 鉴权 → 幂等 → 分发。
 *
 * 幂等说明：只对 `auth && idempotent` 的动作走 idempotency 表（表需要 player_id）。
 * `account.login` 虽然标了 idempotent，但它发生在登录前，其幂等性由
 * "同 plat + 同 code → 同一 player" 的身份映射天然保证，不重复缓存。
 */
import { ACTIONS, ERR } from '@wodefa/contracts';
import type { ActionName, RpcRequest, RpcResponse } from '@wodefa/contracts';
import { HANDLERS } from './handlers.ts';
import type { HandlerCtx } from './handlers.ts';
import { now } from '../core/clock.ts';
import { verifyToken } from './auth.ts';
import { checkPayload } from './payload.ts';
import { findIdempotent, rememberIdempotent } from './idempotency.ts';
import { checkGatewayRate } from './ratelimit.ts';
import { attachCfgHint } from './version.ts';
import { activeMinClient, activeConfigVersion, isOlderThan } from '../modules/config/service.ts';

/** 不受版本闸约束的动作（少到可以硬编码，加了 ADR 再说）。 */
const VERSION_GATE_EXEMPT = new Set<string>(['config.manifest']);

export async function handleRpc(req: RpcRequest, ctx: HandlerCtx = {}): Promise<RpcResponse> {
  const t = now();

  if (!req || typeof req.a !== 'string') {
    return { c: ERR.BAD_PAYLOAD, msg: 'missing action', t };
  }

  const def = (ACTIONS as Record<string, { auth: boolean; idempotent: boolean }>)[req.a];
  if (!def) return { c: ERR.UNKNOWN_ACTION, msg: `unknown action: ${req.a}`, t };
  if (def.idempotent && !req.m?.rid) return { c: ERR.BAD_PAYLOAD, msg: 'rid required', t };

  // 限流（F-42b，2026-10-27 裁决 1）：**只作用于 auth:false 的动作**。
  // 它们发生在登录前或本身无令牌 → 没有 player 维度约束 → 任何人可无限调用。
  // 放在版本闸之前：纯内存判断，比查 config_release 便宜，且能替它挡掉洪水。
  // 有令牌的动作不加 IP 维度限流 —— 那只会在 CGNAT 下误伤正常玩家，收益为负。
  if (!def.auth) {
    const decision = checkGatewayRate(req.a, ctx.ip, t);
    if (decision && !decision.ok) {
      return {
        c: ERR.RATE_LIMITED,
        msg: `rate limited: ${req.a}，请 ${Math.ceil(decision.retryAfterMs / 1000)}s 后重试`,
        t,
      };
    }
  }

  // 版本闸（MUST-09）：放在鉴权之前 —— 旧客户端连登录都不该放进来。
  // 只有登记过 config_release 才生效，本地开发默认不拦人。
  // `config.manifest` 必须豁免：客户端要靠它才知道"自己太旧、该更新到哪个版本"，
  // 把它一起拦了会形成死锁（拿不到更新信息 → 永远升不上去）。
  if (!VERSION_GATE_EXEMPT.has(req.a)) {
    const minClient = await activeMinClient();
    if (minClient && isOlderThan(req.m?.cv, minClient)) {
      return { c: ERR.CLIENT_TOO_OLD, msg: `client too old: ${req.m?.cv ?? '(none)'} < ${minClient}`, t };
    }
  }

  const payloadCheck = checkPayload(req.a as ActionName, req.p);
  if (!payloadCheck.ok) return { c: ERR.BAD_PAYLOAD, msg: payloadCheck.msg, t };

  const useIdempotency = def.auth && def.idempotent;

  /**
   * cfg 提示（F-42a，裁决 2）：只做提示，不拒请求，每次按**当前**版本现算。
   *
   * 之所以做成函数而不是"末尾统一加一次"，是因为幂等命中会 `return hit` **提前返回**，
   * 绕不过末尾那段 —— 那条路径同样要附提示（客户端重试时更需要知道版本变了）。
   * 本函数在 handler 返回之后（或缓存命中时）调用，事务已提交，
   * 不会与 `withTx` 争同一连接。
   */
  async function withCfgHint(res: RpcResponse): Promise<RpcResponse> {
    if (res.c !== 0) return res;
    return attachCfgHint(res, req.m?.cfg, await activeConfigVersion());
  }

  if (def.auth) {
    const v = verifyToken(ctx.token);
    if (!v.ok) return { c: v.code, msg: v.msg, t };
    ctx.claims = v.claims;

    if (useIdempotency && req.m?.rid) {
      const hit = await findIdempotent(v.claims.sub, req.m.rid);
      if (hit) return withCfgHint(hit);
    }
  }

  const handler = HANDLERS[req.a as ActionName];
  const out = await handler(req, t, ctx);

  // 幂等缓存**先于** cfg 提示写入：缓存里只存业务结果。
  // 否则一条 24h 前落下的缓存会把当时的 configVersion 当成"最新"回给客户端，
  // 客户端永远升不上去 —— 比不实现更糟。
  if (useIdempotency && req.m?.rid && out.c === 0 && ctx.claims) {
    await rememberIdempotent(ctx.claims.sub, req.m.rid, out);
  }

  return withCfgHint(out);
}
