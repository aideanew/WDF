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
import { activeMinClient, isOlderThan } from '../modules/config/service.ts';

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

  if (def.auth) {
    const v = verifyToken(ctx.token);
    if (!v.ok) return { c: v.code, msg: v.msg, t };
    ctx.claims = v.claims;

    if (useIdempotency && req.m?.rid) {
      const hit = await findIdempotent(v.claims.sub, req.m.rid);
      if (hit) return hit;
    }
  }

  const handler = HANDLERS[req.a as ActionName];
  const out = await handler(req, t, ctx);

  if (useIdempotency && req.m?.rid && out.c === 0 && ctx.claims) {
    await rememberIdempotent(ctx.claims.sub, req.m.rid, out);
  }
  return out;
}
