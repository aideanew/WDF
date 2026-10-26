/**
 * 会话令牌：HMAC-SHA256 自签（不引第三方 JWT 库，省依赖与包体）。
 *
 * 规则（GOV/03 契约 3.4.3）：
 *  - 玩家令牌 `admin` 恒为 false 或缺失；管理端另走独立鉴权域；
 *  - access 2h（可用 WDF_TOKEN_TTL_MS 覆盖）；过期返回 SESSION_EXPIRED；
 *  - `sub` = playerId，`region` 绑定后不可变。
 *
 * 生产注意：WDF_TOKEN_SECRET **必须**由环境变量注入，默认值仅供本地开发。
 */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { ERR } from '@wodefa/contracts';

const SECRET = process.env.WDF_TOKEN_SECRET ?? 'dev-only-secret-change-me';
const TTL_MS = Number(process.env.WDF_TOKEN_TTL_MS ?? 2 * 3600 * 1000);

export interface Claims {
  sub: string;
  region: string;
  plat: string;
  iat: number;
  exp: number;
  jti: string;
  admin?: boolean;
}

export type VerifyResult = { ok: true; claims: Claims } | { ok: false; code: number; msg: string };

function b64u(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64url');
}

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('base64url');
}

export function issueToken(input: Omit<Claims, 'iat' | 'exp' | 'jti'>): string {
  const at = Date.now();
  const claims: Claims = { ...input, admin: false, iat: at, exp: at + TTL_MS, jti: randomUUID() };
  const payload = b64u(JSON.stringify(claims));
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token?: string | null): VerifyResult {
  // 语义严格按 03-contracts-freeze.md：
  //   2001 NOT_LOGGED_IN = 压根没带令牌（客户端该去登录）
  //   2002 SESSION_EXPIRED = 令牌过期/无效（客户端可先静默刷新一次，失败再跳登录）
  if (!token) return { ok: false, code: ERR.NOT_LOGGED_IN, msg: 'not logged in' };
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return { ok: false, code: ERR.SESSION_EXPIRED, msg: 'malformed token' };

  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expect = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, code: ERR.SESSION_EXPIRED, msg: 'bad signature' };
  }

  let claims: Claims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Claims;
  } catch {
    return { ok: false, code: ERR.SESSION_EXPIRED, msg: 'bad payload' };
  }
  if (typeof claims.exp !== 'number' || claims.exp < Date.now()) {
    return { ok: false, code: ERR.SESSION_EXPIRED, msg: 'session expired' };
  }
  return { ok: true, claims };
}

export function bearerOf(authorization?: string): string | undefined {
  if (!authorization) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return m?.[1];
}

/**
 * 刷新专用：只校验签名、不校验过期。
 * 令牌即便已过期，只要签名有效就返回 claims，供 account.refresh 重签发新令牌。
 * 签名无效/畸形 → 返回 null（客户端应退回登录）。
 */
export function refreshClaims(token?: string | null): Claims | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expect = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Claims;
  } catch {
    return null;
  }
}
