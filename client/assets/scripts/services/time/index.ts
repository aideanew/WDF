/**
 * 服务器时间同步（SR-06）：每个 RPC 响应带 `t`（服务端 `Date.now()`），
 * 客户端据此维护偏移，`now()` 返回校准后的服务器时间。
 * 规则层只接受传入的时间，本模块是唯一的时间来源。
 *
 * 纯客户端，不 import 'cc'；无网络时保持上次偏移（离线可用）。
 */

/** 当前偏移（服务器时间 - 本机时间），由 `syncFromResponse` 更新。 */
let offset = 0;

/** 用响应里的服务器时间 `t` 校准偏移。 */
export function syncFromResponse(serverT: number): void {
  offset = serverT - Date.now();
}

/** 校准后的服务器时间（毫秒时间戳）。 */
export function now(): number {
  return Date.now() + offset;
}

/** 当前偏移（毫秒）。 */
export function offsetMs(): number {
  return offset;
}

/** 仅测试用：清零偏移。 */
export function resetForTest(): void {
  offset = 0;
}
