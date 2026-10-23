import { ACTIONS, ERR } from '@wodefa/contracts';
import type { ActionName, RpcRequest, RpcResponse } from '@wodefa/contracts';
import { HANDLERS } from './handlers.ts';
import { now } from '../core/clock.ts';

/** 网关：校验动作 → 鉴权 → 版本 → 幂等 → 分发。具体中间件在同目录各文件中实现。 */
export async function handleRpc(req: RpcRequest): Promise<RpcResponse> {
  const t = now();
  const def = (ACTIONS as Record<string, (typeof ACTIONS)[ActionName]>)[req?.a];
  if (!def) return { c: ERR.UNKNOWN_ACTION, msg: 'unknown action', t };
  if (def.idempotent && !req.m?.rid) return { c: ERR.BAD_PAYLOAD, msg: 'rid required', t };
  const handler = HANDLERS[req.a as ActionName];
  return handler(req, t);
}
