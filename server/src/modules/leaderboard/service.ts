/** leaderboard · 业务与事务（AT-2203 总收益榜） */
import type { QueryReq, QueryRes, RankRow, ReportReq, ReportRes } from '@wodefa/contracts/src/leaderboard/index.ts';
import { exceedsHourlyCap } from '@wodefa/game-core/src/leaderboard/index.ts';
import { withTx } from '../../core/db.ts';
import { addIncome, topIncomes, insertSnapshot, latestSnapshot } from './repo.ts';

// 设计口径（辩证决策，记执行日志 §6）：
//  - season：0001 迁移无 season 表 → 模块常量 'S1'，season 系统落地后替换。
//  - 风控上限：纪律禁止把业务数值写死进代码 → 默认不启用（cap=Infinity 永不 flag），
//    env `WDF_INCOME_HOURLY_CAP` 注入后启用 exceedsHourlyCap（game-core 只读复用）。
//    数值表（game-data）就位后改读 config 注入。
//  - 4001 超频：内存限频器（单进程 MVP；生产换 Redis 见升级条件）。间隔 env
//    `WDF_REPORT_MIN_INTERVAL_MS` 默认 30s。seq 回退不报错：返回当前 acceptedSeq（幂等语义，
//    客户端比对后发现未前进自行重发），避免乱序重试陷入 4001 循环。
//  - 快照：report 成功即刷新 global + region:<id> 两份（rows 为 jsonb 宽结构，含 region/province
//    供 query 过滤）；flagged 玩家不入榜（复核中）。province 全员为 null，暂不产 province 快照，
//    query province 返回空 items（契约合法），province 数值就位后补。
//  - name：player 表无昵称列 → 兜底 `玩家<playerId 后4位>`，昵称系统落地后替换。

const CURRENT_SEASON = 'S1';
const SNAPSHOT_LIMIT = 100;

/** 超时收益标记复核（5001 语义）时返回的业务错误。 */
export class RateError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = 'RateError';
    this.code = code;
  }
}

interface RateState {
  lastAt: number;
  lastSeq: number;
}

/** 内存限频 + seq 状态（单进程 MVP）。 */
const rateState = new Map<string, RateState>();

function minIntervalMs(): number {
  const n = Number(process.env.WDF_REPORT_MIN_INTERVAL_MS);
  return Number.isFinite(n) && n >= 0 ? n : 30_000;
}

function hourlyCap(): number {
  const n = Number(process.env.WDF_INCOME_HOURLY_CAP);
  return Number.isFinite(n) && n > 0 ? n : Infinity;
}

/** 服务器当天（UTC 日期，与区服日结算口径一致）。 */
function dayOf(serverNow: number): string {
  return new Date(serverNow).toISOString().slice(0, 10);
}

const VALID_SOURCES = new Set(['hook', 'salvage', 'fishing', 'chest', 'crew', 'other']);

function sanitizeEvents(events: unknown): { itemId: string; value: number }[] {
  if (!Array.isArray(events)) return [];
  const out: { itemId: string; value: number }[] = [];
  for (const e of events) {
    const item = e as { itemId?: unknown; value?: unknown; source?: unknown };
    if (typeof item.itemId !== 'string' || item.itemId.length === 0) continue;
    if (typeof item.value !== 'number' || !Number.isFinite(item.value) || item.value <= 0) continue;
    if (typeof item.source !== 'string' || !VALID_SOURCES.has(item.source)) continue;
    out.push({ itemId: item.itemId, value: item.value });
  }
  return out;
}

function displayName(playerId: string): string {
  return `玩家${playerId.slice(-4)}`;
}

export async function report(playerId: string, input: ReportReq, serverNow: number): Promise<ReportRes> {
  const state = rateState.get(playerId);

  // seq 回退/重放：不写库、不报错，返回当前进度（幂等语义）
  if (state && input.seq <= state.lastSeq) {
    return { acceptedSeq: state.lastSeq, flagged: false };
  }

  // 频率限制：间隔过短 → 4001（同一 player 维度）
  const interval = minIntervalMs();
  if (state && interval > 0 && serverNow - state.lastAt < interval) {
    throw new RateError(4001, 'report too frequent');
  }

  const events = sanitizeEvents(input.events);
  const sum = events.reduce((acc, e) => acc + e.value, 0);
  const flagged = exceedsHourlyCap(sum, hourlyCap());

  await withTx(async (tx) => {
    if (sum > 0) {
      await addIncome(playerId, CURRENT_SEASON, dayOf(serverNow), sum, flagged, tx);
    }
    // 快照刷新（global + region:<id> 两份；rows 宽结构含 region/province 供 query 过滤）
    const day = dayOf(serverNow);
    const tops = await topIncomes(CURRENT_SEASON, day, SNAPSHOT_LIMIT, tx);
    const rows = tops.map((r, i) => ({
      rank: i + 1,
      playerId: r.player_id,
      name: displayName(r.player_id),
      value: Number(r.value),
      region: r.region,
      province: r.province,
    }));
    await insertSnapshot(CURRENT_SEASON, 'global', serverNow, rows, tx);
    const regionScope = `region:${process.env.WDF_DEFAULT_REGION ?? 's1'}`;
    await insertSnapshot(CURRENT_SEASON, regionScope, serverNow, rows, tx);
  });

  rateState.set(playerId, { lastAt: serverNow, lastSeq: input.seq });
  return { acceptedSeq: input.seq, flagged };
}

export async function query(input: QueryReq, mePlayerId: string, meRegion: string): Promise<QueryRes> {
  let scopeKey = 'global';
  if (input.scope === 'region') scopeKey = `region:${meRegion}`;
  // scope='province'：当前 player.province 全为 null（claims 亦无 province），无 province 快照 →
  // 用永不命中的占位键查空（契约合法），province 数值就位后改为查 player.province 拼真实键。
  else if (input.scope === 'province') scopeKey = 'province:unknown';

  const snap = await latestSnapshot(CURRENT_SEASON, scopeKey);
  if (!snap) return { items: [], snapshotAt: 0 };

  const all = (Array.isArray(snap.rows) ? snap.rows : []) as (RankRow & { region?: string | null; province?: string | null })[];
  const snapshotAt = new Date(snap.taken_at).getTime();

  // cursor = 上一页最后一名的 rank（字符串数字），取 rank 更大者
  const fromRank = input.cursor ? Number.parseInt(input.cursor, 10) : 0;
  const filtered = Number.isFinite(fromRank) && fromRank > 0 ? all.filter((r) => r.rank > fromRank) : all;
  const page = filtered.slice(0, input.limit);
  const items: RankRow[] = page.map((r) => ({ rank: r.rank, playerId: r.playerId, name: r.name, value: r.value }));

  const meRow = all.find((r) => r.playerId === mePlayerId);
  const me: RankRow | undefined = meRow
    ? { rank: meRow.rank, playerId: meRow.playerId, name: meRow.name, value: meRow.value }
    : undefined;

  const last = page[page.length - 1];
  const next = last && filtered.length > page.length ? String(last.rank) : undefined;
  return { items, me, next, snapshotAt };
}
