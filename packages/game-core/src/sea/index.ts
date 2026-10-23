import { HOUR_MS, MINUTE_MS } from '../common/time';

/** 已定：浅海按真实时间每 6 小时一波潮，每波 10 分钟。基准时刻由配置给出（服务器时间）。 */
export const TIDE_PERIOD_MS = 6 * HOUR_MS;
export const TIDE_DURATION_MS = 10 * MINUTE_MS;

export function tideState(nowMs: number, anchorMs: number): { active: boolean; nextStartMs: number; endsMs: number | null } {
  const offset = (((nowMs - anchorMs) % TIDE_PERIOD_MS) + TIDE_PERIOD_MS) % TIDE_PERIOD_MS;
  const cycleStart = nowMs - offset;
  const active = offset < TIDE_DURATION_MS;
  return {
    active,
    nextStartMs: active ? cycleStart + TIDE_PERIOD_MS : cycleStart + TIDE_PERIOD_MS,
    endsMs: active ? cycleStart + TIDE_DURATION_MS : null,
  };
}

/** 已定：同屏漂浮物 ≤ 20。 */
export const MAX_FLOATING_ON_SCREEN = 20;
