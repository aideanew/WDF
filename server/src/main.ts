/** 进程入口：读取环境变量 → 构建 app → 监听端口。 */
import { createApp } from './app.ts';

const port = Number(process.env.API_PORT ?? 8080);
createApp().listen(port);
