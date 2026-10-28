/**
 * ads · 业务与事务（ADR-0014：只信客户端 + 日限，明确这是可被刷的）。
 *
 * ⚠ v1.0 效果未落地：hook_cooldown（无冷却字段）/ offline_double（无离线结算）/
 * shop_refresh（无商店），三个 placement 均为"发一个不存在的效果"。冻结至 v1.1，
 * 届时需先落地对应载体（R-1 / FIX-2）。
 */
import type { AdClaimRes } from '@wodefa/contracts/src/ads/index.ts';
import { ERR } from '@wodefa/contracts';
import { withTx } from '../../core/db.ts';
import { countClaimsToday, recordClaim } from './repo.ts';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const adPlacementsJson: Array<{ id: string; daily_cap: number }> =
  JSON.parse(readFileSync(join(__root, 'generated', 'config', 'ad_placements.json'), 'utf8'));
const adPlacementMap = new Map(adPlacementsJson.map((r) => [r.id, r.daily_cap]));

/** 业务错误（携带错误码）。 */
export class AdsError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = 'AdsError';
    this.code = code;
  }
}

/** 服务端当天（Asia/Shanghai 自然日，同 economy/sell 的 dayOf）。 */
function dayOf(serverNow: number): string {
  return new Date(serverNow + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 当日零点（Asia/Shanghai）的 UTC 毫秒：计数口径 `created_at >= 此值`。 */
function dayStartUtcMs(serverNow: number): number {
  return Date.parse(`${dayOf(serverNow)}T00:00:00+08:00`);
}

/** 幂等缓存（同 rid 返回上次结果，MVP 内存，同 economy/sell）。 */
const idempotencyMap = new Map<string, AdClaimRes>();

/**
 * 看一次激励视频 → 按当日计数发奖（ADR-0014）。
 * 校验链：placement 合法 → 当日计数 → 达 cap 抛 3002 → 写流水 → 返回。
 * 失败：1001（placement 非法）/ 3002（当日已达上限）。
 *
 * 注意（ADR-0014 §0）：服务端**不复核**广告是否真看完 —— 作弊者可直接调 claim，
 * 服务端无法分辨。这是本 ADR 已声明的"可被刷"边界，唯一防线是日限（每天 cap 次）。
 * 发奖口径：按 `ledger_entry` 当日 `reason='ads.claim' AND ref=placement` 计数（复用
 * economy.sell 的"用流水算配额"策略，`04 §3.1`）。asset 存 placement 作计数维度
 * （三个位面发的是**效果**——冷却/双倍/刷新——非物品，故无 ad_placements 奖励字段）。
 */
export async function claim(
  playerId: string,
  placement: string,
  serverNow: number,
  rid?: string,
): Promise<AdClaimRes> {
  const idemKey = rid ? `${playerId}:${rid}` : '';
  if (idemKey && idempotencyMap.has(idemKey)) {
    return idempotencyMap.get(idemKey)!;
  }

  if (typeof placement !== 'string' || placement.length === 0) {
    throw new AdsError(ERR.BAD_PAYLOAD, 'placement required');
  }
  const cap = adPlacementMap.get(placement);
  if (cap === undefined) {
    throw new AdsError(ERR.BAD_PAYLOAD, `unknown placement: ${placement}`);
  }

  const dayStart = dayStartUtcMs(serverNow);
  const used = await countClaimsToday(playerId, placement, dayStart);
  if (used >= cap) {
    throw new AdsError(ERR.QUOTA_EXHAUSTED, `daily cap reached: ${used}/${cap}`);
  }

  await withTx(async (tx) => {
    await recordClaim(playerId, placement, tx);
  });

  const remainingToday = cap - (used + 1);
  const res: AdClaimRes = { granted: true, remainingToday };
  if (idemKey) idempotencyMap.set(idemKey, res);
  return res;
}
