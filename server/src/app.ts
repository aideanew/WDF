import { createServer } from 'node:http';
import { handleRpc } from './gateway/rpc.ts';

/** 先用 node:http 跑通骨架；锁定技术选型后换 Fastify（只改本文件与 gateway）。 */
export function createApp() {
  return createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/v1/rpc') {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const out = await handleRpc(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out));
      return;
    }
    if (req.url === '/healthz') { res.writeHead(200); res.end('ok'); return; }
    res.writeHead(404); res.end();
  });
}
