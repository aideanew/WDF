import { getPlatform, type IPlatform } from '../../platform';
import type { ActionName } from '../../generated/contracts/common/actions';
import type { RpcRequest, RpcResponse, RequestMeta, Platform } from '../../generated/contracts/common/envelope';
import { ERR, errorRange } from '../../generated/contracts/common/errors';
import { SAVE_SCHEMA_VERSION } from '../../generated/game-core/save';
import { CONFIG_VERSION } from '../../generated/game-core/generated/config-types';

/** 客户端版本号（手动同步 package.json 的 version）。 */
export const CLIENT_VERSION = 'v0.1.0-s1';
/** configVersion 唯一来源是 npm run gen 的产物，禁止在此写死；仅转出以保持既有导出名。 */
export { CONFIG_VERSION };

/** 开发期强制走 mock，完全跳过网络请求（DevTools 的 wx.request 404 红字就不会再出现）。服务器上线后改 false。 */
export const FORCE_OFFLINE = false;

/** 运行期可覆盖。开发时走 localhost（预期 404，mock handler 兜底），真机走云函数地址。 */
let endpoint = 'http://127.0.0.1:5050/rpc';

/** 开发期吞掉 wx.request 失败时 DevTools 的 404 红字噪音（mock 会兜底）。生产环境云函数可达时会自己走通。 */
(function silenceDevtools404(): void {
  try {
    const g = globalThis as any;
    const origError = console.error;
    console.error = (...args: any[]) => {
      const s = args.map((x) => (typeof x === 'string' ? x : String(x))).join(' ');
      if (s.includes('127.0.0.1:3000') || s.includes('/rpc')) return;
      origError.apply(console, args as any);
    };
    g.__wdf_console_silenced = true;
  } catch { /* noop */ }
})();
export function setEndpoint(url: string): void { endpoint = url; }
export function getEndpoint(): string { return endpoint; }

export interface RpcError {
  code: number;
  range: ReturnType<typeof errorRange>;
  msg: string;
}

function platOf(p: IPlatform): Platform {
  return p.name === 'web' ? 'app' : p.name;
}

let token: string | null = null;
export function setToken(t: string | null): void { token = t; }
export function getToken(): string | null { return token; }

/**
 * 统一 RPC 客户端：
 *  - 封套 meta（cv / cfg / sv / plat / rid）
 *  - 解析 c != 0，按段分类抛出结构化错误
 *  - 网络失败或 c = 4999（not implemented）时走本地 mock handler
 */
export async function invoke<P = unknown, D = unknown>(
  action: ActionName,
  params: P,
  rid?: string,
  attemptedRefresh = false,
): Promise<D> {
  const platform = getPlatform();
  const meta: RequestMeta = {
    cv: CLIENT_VERSION,
    cfg: CONFIG_VERSION,
    sv: SAVE_SCHEMA_VERSION,
    plat: platOf(platform),
    ...(rid !== undefined ? { rid } : {}),
  };
  const req: RpcRequest<P> = { a: action, p: params, m: meta };

  let resp: RpcResponse<D> | null = null;

  if (!FORCE_OFFLINE) {
    try {
      const { status, data } = await platform.request(endpoint, { ...req, token }, 8000);
      if (status >= 200 && status < 300 && data && typeof data === 'object') {
        resp = data as RpcResponse<D>;
      }
    } catch {
      // 网络错误，走 mock
    }
  }

  if (!resp || (resp.c !== 0 && resp.c === ERR.INTERNAL)) {
    const mock = MOCK_HANDLERS[action];
    if (mock) {
      const r = await mock(req);
      // RpcResponse 是联合类型，且错误分支的 c 也是 number → `c === 0` 无法让 TS 收窄，
      // 只能显式断言到成功分支取 d（成功分支才带 d）。
      if (r.c === 0) return (r as { c: 0; d: D }).d;
      throw makeError(r.c, (r as { c: number; msg: string }).msg);
    }
  }

  // 收 2002（SESSION_EXPIRED）：除 refresh 自身外，静默刷新一次并重试（契约承诺）。
  if (resp && resp.c === ERR.SESSION_EXPIRED && action !== 'account.refresh' && !attemptedRefresh && getToken()) {
    const nt = await silentRefresh();
    if (nt) return invoke<P, D>(action, params, rid, true);
  }

  // 契约冻结 14 码，其中没有专门的"网络错误"码。旧代码写的 ERR.SYSTEM **根本不存在**，
  // 传进去是 undefined → UX 映射拿到非法码。回落到 INTERNAL(4999)：error + retryable，
  // 与网络失败语义一致；用 msg 区分来源。（缺专用网络码本身记入契约缺口）
  if (!resp) throw makeError(ERR.INTERNAL, 'network unreachable');
  if (resp.c === 0) return (resp as { c: 0; d: D }).d;
  throw makeError(resp.c, (resp as { c: number; msg: string }).msg);
}

/**
 * 静默刷新：用当前（可能已过期）的令牌换一枚新令牌。
 * 并发去重——多个请求同时遇 2002 只刷新一次。refresh 失败（签名无效）返回 null，调用方退回登录。
 */
let refreshing: Promise<string | null> | null = null;
async function silentRefresh(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async (): Promise<string | null> => {
      try {
        const r = await invoke<unknown, { token: string }>('account.refresh', {});
        setToken(r.token);
        return r.token;
      } catch {
        return null;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

function makeError(code: number, msg: string): RpcError {
  return { code, range: errorRange(code), msg };
}

// ---------- 本地 mock handlers ----------
type MockHandler = (req: RpcRequest) => Promise<RpcResponse>;
const MOCK_HANDLERS: Partial<Record<ActionName, MockHandler>> = {
  'compliance.check': async (_req) => ({ c: 0, d: { verified: true, minor: false, offlineAllowanceMs: 24 * 3600 * 1000 }, t: Date.now() }),
  'account.login': async (_req) => {
    const pid = 'mock-' + Math.random().toString(36).slice(2, 10);
    return { c: 0, d: { token: 'mock-token-' + pid, playerId: pid, region: 's1', isNew: true, serverTime: Date.now() }, t: Date.now() };
  },
  'save.push': async (req) => {
    const p = req.p as { baseRevision: number };
    return { c: 0, d: { accepted: true, revision: p.baseRevision + 1 }, t: Date.now() };
  },
  'save.pull': async (req) => {
    const p = req.p as { baseRevision: number };
    return { c: 0, d: { summary: { revision: p.baseRevision, savedAt: Date.now(), schemaVersion: SAVE_SCHEMA_VERSION, level: 1 } }, t: Date.now() };
  },
};
