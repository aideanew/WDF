/** config · 动作实现（auth:false —— 启动链第一跳，早于登录） */
import type { Handler } from '../../gateway/handlers.ts';
import type { ConfigManifestRes } from '@wodefa/contracts/src/config/index.ts';
import { manifest } from './service.ts';

export const configHandlers = {
  'config.manifest': (async (_req, t) => {
    const res: ConfigManifestRes = await manifest();
    return { c: 0, d: res, t };
  }) as Handler,
};
