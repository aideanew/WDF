/**
 * 进程入口：初始化数据库（跑迁移）→ 构建 app → 监听。
 *
 * 端口默认 5050，与客户端 `RpcClient` 的默认 endpoint 对齐。
 * 只监听 127.0.0.1：本地开发不去碰防火墙；真机联调时再改 API_HOST=0.0.0.0（并自担风险）。
 */
import { createApp } from './app.ts';
import { initDb } from './core/db.ts';

const port = Number(process.env.API_PORT ?? 5050);
const host = process.env.API_HOST ?? '127.0.0.1';

await initDb();
const app = createApp();

try {
  await app.listen({ port, host });
  console.log(`[wdf] server ready: http://${host}:${port}  (POST /v1/rpc, GET /healthz)`);
  console.log(`[wdf] auth mode: ${process.env.WDF_AUTH_MODE ?? 'dev'}  db: ${process.env.WDF_DB_DIR ?? '.local/pg'}`);
} catch (err) {
  console.error('[wdf] 启动失败', err);
  process.exit(1);
}
