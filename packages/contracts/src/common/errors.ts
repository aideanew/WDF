/** 错误码分段：客户端按段处理，不逐个硬编码。 */
export const ERROR_RANGES = {
  OK: 0,
  CONTRACT: 1000,   // 1xxx 参数/契约
  AUTH: 2000,       // 2xxx 登录/权限
  RULE: 3000,       // 3xxx 业务规则拒绝（与 game-core Result.code 对应）
  SYSTEM: 4000,     // 4xxx 系统依赖
  RISK: 5000,       // 5xxx 风控/复核不一致
  UPGRADE: 9000,    // 9xxx 版本过低需更新
} as const;

export const ERR = {
  BAD_PAYLOAD: 1001,
  UNKNOWN_ACTION: 1002,
  NOT_LOGGED_IN: 2001,
  SESSION_EXPIRED: 2002,
  BANNED: 2003,
  MINOR_TIME_LIMIT: 2101,
  DUPLICATE_REQUEST: 3001,
  QUOTA_EXHAUSTED: 3002,
  EVENT_CLOSED: 3201,
  EVENT_ALREADY_PLAYED: 3202,
  RATE_LIMITED: 4001,
  INTERNAL: 4999,
  REVIEW_PENDING: 5001,
  CLIENT_TOO_OLD: 9001,
} as const;

export function errorRange(code: number): keyof typeof ERROR_RANGES {
  if (code === 0) return 'OK';
  const k = Math.floor(code / 1000) * 1000;
  const hit = (Object.keys(ERROR_RANGES) as (keyof typeof ERROR_RANGES)[]).find((n) => ERROR_RANGES[n] === k);
  return hit ?? 'SYSTEM';
}
