/** telemetry · 动作实现 */
import type { Handler } from '../../gateway/handlers.ts';
import { track, TelemetryError } from './service.ts';

export const telemetryHandlers = {
  /**
   * 批量埋点上报（auth:false，无令牌也可上报崩溃/错误）。
   * 超批量上限 → 4001；写库失败静默丢弃仍返回成功（绝阻塞主流程）。
   */
  'telemetry.track': (async (req, t, ctx) => {
    try {
      const res = await track((req.p as { events?: unknown }).events, ctx.ip ?? 'anon');
      return { c: 0, d: res, t };
    } catch (e) {
      if (e instanceof TelemetryError) return { c: e.code, msg: e.message, t };
      throw e;
    }
  }) as Handler,
};
