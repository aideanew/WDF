/**
 * 网关限流（IP 维度固定窗口）—— 2026-10-27 裁决 1 的实现（F-42b）。
 *
 * ## 为什么需要
 *
 * `ACTIONS` 里有 4 个动作是 `auth: false`：
 * `account.login` / `account.refresh` / `telemetry.track` / `config.manifest`。
 * 它们**发生在登录前或本身无令牌 → 没有 player 维度约束 → 任何人可无限调用**。
 * 其中 `telemetry.track` 会写 `audit_log`、`account.*` 要做 HMAC 验签/签发，
 * 属于"攻击成本极低、收益为负"的资源耗尽面。
 *
 * ## 口径（裁决原文见 `docs/04_planning/plan-v009/05-pending-decisions.md`）
 *
 * 1. **只覆盖 `auth: false` 的动作。** 有令牌的动作已有 `(player_id, rid)` 之类约束，
 *    再叠一层 IP 维度只会误伤 NAT 后的正常玩家，收益为负。
 * 2. **固定窗口，不是令牌桶。** MVP 的目标是"堵住无限"，不是精确配额；
 *    固定窗口实现小、可预测、易测。精确限速留给 v1.1（需先有设备维度）。
 * 3. **阈值宁松。** 国内运营商 CGNAT 下一个公网 IP 可能承载成百上千玩家，
 *    阈值定紧会直接让正常玩家进不去游戏 —— **误杀正常玩家的代价远大于多放几个脚本请求**。
 *    默认 10 QPS（600 次/分钟），`config.manifest` 是启动必经路径，单独放到 20 QPS。
 * 4. **拿了不到 IP 就不限流。** 不误杀优先；拿不到 IP 说明部署层没透传，属配置问题，
 *    应在网关层修，不该在业务层猜一个 key 出来。
 * 5. **单进程内存**（与 `leaderboard/service.ts` 的内存限频器同一档：MVP 口径）。
 *    **多实例部署时每个实例各算各的，实际阈值 = N × 单实例阈值** —— 这是已知限制，
 *    升级条件见 `docs/03_solution/data/gateway-gaps.md`。
 *
 * ## 已知限制（写在这里，不要靠下次想起来）
 *
 * - **IP 维度在 CGNAT 下天然有误伤上限。** 真解是按 `plat + openid` 或设备 id 维度，
 *   但那需要契约在 `RequestMeta` 加字段（契约冻结期，见 ADR / 03-contract-freeze）。
 * - 单实例内存，重启即清空（可接受：限流窗口本来就是分钟级）。
 * - 不做 IPv6 前缀聚合：`/64` 下一个攻击者可轮换地址。v1.1 再说。
 */
import { now } from '../core/clock.ts';

/** 一分钟固定窗口。 */
const WINDOW_MS = 60_000;

/** 默认每分钟次数（10 QPS）。 */
const DEFAULT_PER_MIN = 600;

/**
 * 启动必经路径，单独放宽到 20 QPS：
 * 若它成为瓶颈，玩家会**连游戏都进不去**（拿不到 configVersion → 无法校验配置）。
 */
const PER_ACTION_DEFAULT: Record<string, number> = {
  'config.manifest': 1200,
};

/**
 * key 数量上限：超过就清扫过期项，仍超则按插入顺序丢最旧的一批。
 * 防内存被稀疏 IP 打爆。20k 个 IP ≈ 20k × ~60B ≈ 1.2MB，可接受。
 * 导出是为了让测试能断言「桶数量有界」——这条不测的话，内存泄漏会静默发生。
 */
export const RATE_LIMIT_MAX_KEYS = 20_000;

interface Window {
  count: number;
  resetAt: number;
}

/** key = `${action}|${ip}` */
const buckets = new Map<string, Window>();

export interface RateDecision {
  ok: boolean;
  /** 距窗口重置还有多少毫秒（ok 时无意义） */
  retryAfterMs: number;
  /** 本窗口剩余可用次数（ok 时 >= 0） */
  remaining: number;
}

/** 按 key 记一次。时间由调用方传入，做成确定性的便于测试。 */
export function hit(key: string, limit: number, windowMs: number, at: number): RateDecision {
  const resetAt = Math.floor(at / windowMs) * windowMs + windowMs;
  const cur = buckets.get(key);

  // 没有记录，或记录属于上一个窗口（陈旧）→ 开新窗口
  if (!cur || cur.resetAt <= at) {
    if (buckets.size >= RATE_LIMIT_MAX_KEYS) sweep(at);
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, retryAfterMs: 0, remaining: Math.max(0, limit - 1) };
  }

  if (cur.count >= limit) {
    return { ok: false, retryAfterMs: resetAt - at, remaining: 0 };
  }

  cur.count += 1;
  return { ok: true, retryAfterMs: 0, remaining: Math.max(0, limit - cur.count) };
}

/** 清过期项；仍超上限则按插入顺序丢最旧的一批（Map 保序）。 */
function sweep(at: number): void {
  for (const [k, w] of buckets) {
    if (w.resetAt <= at) buckets.delete(k);
  }
  if (buckets.size < RATE_LIMIT_MAX_KEYS) return;
  let drop = buckets.size - RATE_LIMIT_MAX_KEYS + 1;
  for (const k of buckets.keys()) {
    if (drop <= 0) break;
    buckets.delete(k);
    drop -= 1;
  }
}

/**
 * 每分钟配额。优先级（高 → 低）：
 *
 *   1. `WDF_RL_<ACTION>_PER_MIN`  动作级，最具体
 *   2. `WDF_RL_DEFAULT_PER_MIN`   全局兜底
 *   3. 内置 `PER_ACTION_DEFAULT[action]`（仅 config.manifest 单独放宽）
 *   4. 内置 `DEFAULT_PER_MIN`
 *
 * ★ 第 2 高于第 3 是**故意的**：运维写「全部收紧到 30」时，启动必经的
 * `config.manifest` 不能被内置的 1200 豁免掉 —— 那会让「一键收紧」留一个后门。
 * 要单独放宽就写动作级 env，别依赖内置值。
 *
 * **`0` = 显式关闭该动作的限流**（应急开关，不需要改代码重发）。
 * 非法值（NaN / 负数 / 空白）回落，不静默变成 0 —— 写错配置不该等于关防护。
 */
export function limitPerMinFor(action: string): number {
  const fallback = PER_ACTION_DEFAULT[action] ?? DEFAULT_PER_MIN;
  const envName = `WDF_RL_${action.replace(/[.-]/g, '_').toUpperCase()}_PER_MIN`;
  const raw = process.env[envName] ?? process.env.WDF_RL_DEFAULT_PER_MIN;
  // 必须先 trim 再判空：`Number('   ')` 是 0，会把「配了个空值」变成「关掉限流」。
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return fallback;
  const n = Number(trimmed);
  // 非法值（NaN / 负数）一律回落默认，不静默变成 0 —— 写错配置不该等于关防护。
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

/**
 * 网关入口调用。返回 `null` = 本次不限流。
 * 返回 `RateDecision` 且 `ok === false` 时，调用方应回 `ERR.RATE_LIMITED`(4001)。
 */
export function checkGatewayRate(action: string, ip: string | undefined, at: number = now()): RateDecision | null {
  if (!ip) return null;
  const limit = limitPerMinFor(action);
  if (limit <= 0) return null;
  return hit(`${action}|${ip}`, limit, WINDOW_MS, at);
}

/** 测试用：清空所有窗口。 */
export function resetGatewayRate(): void {
  buckets.clear();
}

/** 测试/运维观测用：当前桶数量。 */
export function rateKeyCount(): number {
  return buckets.size;
}
