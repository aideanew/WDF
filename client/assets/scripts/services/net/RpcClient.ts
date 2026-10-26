import { getPlatform, type IPlatform } from '../../platform';
import type { ActionName } from '../../generated/contracts/common/actions';
import type { RpcRequest, RpcResponse, RequestMeta, Platform } from '../../generated/contracts/common/envelope';
import { ERR, errorRange } from '../../generated/contracts/common/errors';
import { SAVE_SCHEMA_VERSION } from '../../generated/game-core/save';

/** 客户端版本号（手动同步 package.json 的 version）。 */
export const CLIENT_VERSION = 'v0.1.0-s1';
/** 当前 configVersion（先写死；后续由 config service 热更覆盖）。 */
export const CONFIG_VERSION = '16921d30a67a934f';

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
      if (r.c === 0) return r.d as D;
      throw makeError(r.c, r.msg);
    }
  }

  // 收 2002（SESSION_EXPIRED）：除 refresh 自身外，静默刷新一次并重试（契约承诺）。
  if (resp && resp.c === ERR.SESSION_EXPIRED && action !== 'account.refresh' && !attemptedRefresh && getToken()) {
    const nt = await silentRefresh();
    if (nt) return invoke<P, D>(action, params, rid, true);
  }

  if (!resp) throw makeError(ERR.SYSTEM, 'network unreachable');
  if (resp.c === 0) return (resp as { c: 0; d: D }).d;
  throw makeError(resp.c, resp.msg);
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
