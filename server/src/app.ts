/** Fastify 应用（ADR-0003：单入口 `/v1/rpc` + `/healthz`）。 */
import Fastify, { type FastifyInstance } from 'fastify';
import { ERR } from '@wodefa/contracts';
import type { RpcRequest } from '@wodefa/contracts';
import { handleRpc } from './gateway/rpc.ts';
import { bearerOf } from './gateway/auth.ts';
import { now } from './core/clock.ts';

/** 业务错误默认 HTTP 200；仅限流与内部错误用真实状态码，便于网关/监控识别。 */
function httpStatusOf(code: number): number {
  if (code === ERR.RATE_LIMITED) return 429;
  if (code === ERR.INTERNAL) return 500;
  return 200;
}

export function createApp(): FastifyInstance {
  const app = Fastify({ logger: false, bodyLimit: 4 * 1024 * 1024 });

  app.get('/healthz', async () => ({ ok: true, t: now() }));

  app.post('/v1/rpc', async (request, reply) => {
    const body = (request.body ?? {}) as RpcRequest & { token?: string };
    const token = body.token ?? bearerOf(request.headers.authorization);
    try {
      const out = await handleRpc(body, { token, ip: request.ip });
      reply.code(httpStatusOf(out.c)).send(out);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      reply.code(500).send({ c: ERR.INTERNAL, msg, t: now() });
    }
  });

  return app;
}
