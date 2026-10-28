/**
 * 排行与称号 · 用例与状态（TASK-3104，不依赖 cc）。
 *
 * 与 HookModel 的分层一致：IO 走 `services/net`（本身 cc-free），本类不碰 cc 节点；
 * 界面态一律由契约 `toUxState(code)` 推导，本类不写 `if (code === 4001)` 之外的分支判断。
 *
 * 语义要点：
 *  - **失败不清榜**：`_items` 只在成功时替换，`loading` / 错误期间保留旧数据（S-08.7）；
 *  - `me` 可能不在本页（服务端从全量快照里单独找），故单列 `meOffPage` 供界面补一行；
 *  - `4001` 只来自 `leaderboard.report`，`leaderboard.query` 目前只会返回 0 / 2001；
 *    这里按契约通用处理，冷却 3s 防抖，不假设它一定出现。
 */
import { invoke, type RpcError } from '../../../services/net/RpcClient';
import { ERR } from '../../../generated/contracts/common/errors';
import { toUxState, type UxView } from '../../../generated/contracts/common/ux';
import type { QueryReq, QueryRes, RankRow } from '../../../generated/contracts/leaderboard/index';

/** 榜单页大小（UI 常量，非业务数值）。 */
export const DEFAULT_LIMIT = 20;
/** 4001 限流后的冷却时间（ms）。 */
export const RATE_LIMIT_COOLDOWN_MS = 3000;

const EMPTY: readonly RankRow[] = [];

export type LeaderboardScope = QueryReq['scope'];

export class LeaderboardModel {
  private version = 0;
  private _items: readonly RankRow[] = EMPTY;
  private _me: RankRow | null = null;
  private _next: string | null = null;
  private _snapshotAt = 0;
  private _ux: UxView = { state: 'empty', retryable: false };
  private _loading = false;
  private _coolUntil = 0;
  private _scope: LeaderboardScope = 'global';

  get stateVersion(): number { return this.version; }
  get items(): readonly RankRow[] { return this._items; }
  get me(): RankRow | null { return this._me; }
  /** 用于高亮的 playerId；无数据时为 null。 */
  get meId(): string | null { return this._me ? this._me.playerId : null; }
  get next(): string | null { return this._next; }
  get snapshotAt(): number { return this._snapshotAt; }
  get ux(): UxView { return this._ux; }
  get loading(): boolean { return this._loading; }
  get scope(): LeaderboardScope { return this._scope; }
  /** `me` 有数据但不在当前页（页外名次），界面需补一行。 */
  get meOffPage(): boolean {
    if (!this._me) return false;
    return !this._items.some((r) => r.playerId === this._me!.playerId);
  }
  /** 冷却剩余毫秒（nowMs 由调用方传入，便于测试）。 */
  coolRemaining(nowMs: number): number { return Math.max(0, this._coolUntil - nowMs); }

  protected touch(): void { this.version++; }

  /** 冷却内拒绝发起请求（不读网络、不改状态）。 */
  canFetch(nowMs: number): boolean { return nowMs >= this._coolUntil; }

  /**
   * 拉取榜单快照。成功 → `success`（有数据）/ `empty`（0 行）；失败 → `toUxState(code)`。
   * 失败时**保留旧榜**，只更新界面态。
   */
  async fetch(scope: LeaderboardScope = 'global', limit = DEFAULT_LIMIT): Promise<UxView> {
    const now = Date.now();
    if (!this.canFetch(now)) return this._ux;

    this._loading = true;
    this._scope = scope;
    try {
      const res = await invoke<QueryReq, QueryRes>('leaderboard.query', { scope, limit });
      this._coolUntil = 0;
      const list: RankRow[] = Array.isArray(res?.items) ? res.items : [];
      this._items = list;
      this._me = res?.me ?? null;
      this._next = res?.next ?? null;
      this._snapshotAt = typeof res?.snapshotAt === 'number' ? res.snapshotAt : 0;
      this._ux = list.length > 0
        ? { state: 'success', code: 0, retryable: false }
        : { state: 'empty', retryable: false };
    } catch (e) {
      // FIX-14（W5-4，2026-10-28）：`RpcClient` 网络不可达时用本地合成码
      // `NET_CODE_OFFLINE = -1`（FIX-6/R-3，W2-2），不再用契约里不存在的系统错误码。
      // code 恒为 number；兜成 INTERNAL 仅为防御未来契约漂移。
      const code = typeof (e as RpcError | null)?.code === 'number'
        ? (e as RpcError).code
        : ERR.INTERNAL;
      if (code === ERR.RATE_LIMITED) this._coolUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      this._ux = toUxState(code);
    } finally {
      this._loading = false;
      this.touch();
    }
    return this._ux;
  }

  /** 清空状态（切走或登出时）。 */
  clear(): void {
    this._items = EMPTY;
    this._me = null;
    this._next = null;
    this._snapshotAt = 0;
    this._coolUntil = 0;
    this._ux = { state: 'empty', retryable: false };
    this.touch();
  }
}
