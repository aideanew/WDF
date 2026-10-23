/** 规则函数统一返回值：成功带值，失败带业务错误码（与 contracts 的 3xxx 段对应）。 */
export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; code: number; reason: string };
export type Result<T> = Ok<T> | Err;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = (code: number, reason: string): Err => ({ ok: false, code, reason });
