/** 写操作按 (player_id, rid) 去重：命中则返回已存响应（保存 24 小时）。 */
export const MIDDLEWARE = 'idempotency';
