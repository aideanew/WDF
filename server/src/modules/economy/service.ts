/** economy · 业务与事务（ADR-0012 影子账本 + D-01 商人限购） */
import type { SellReq, SellRes } from '@wodefa/contracts/src/economy/index.ts';
import { sellValue } from '@wodefa/game-core/src/economy/index.ts';
import { ERR } from '@wodefa/contracts';
import { withTx } from '../../core/db.ts';
import { ledgerSum, recordSell, recordGain, recordLoss, quotaUsed, quotaIncrement } from './repo.ts';

/** 业务错误（携带错误码）。 */
export class EconomyError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = 'EconomyError';
    this.code = code;
  }
}

/** 服务端当天（Asia/Shanghai 自然日，ADR-0012 限购日界）。 */
function dayOf(serverNow: number): string {
  // UTC+8 自然日：把 serverNow 加 8h 后取 ISO 日期
  return new Date(serverNow + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 商人配置（D-01 裁决值，MVP 硬编码；后续改读 merchants 表）。 */
const MERCHANTS: Record<string, { regionBp: number; dailyLimit: number }> = {
  merchant_village: { regionBp: 10000, dailyLimit: 20 },
  merchant_wander: { regionBp: 8500, dailyLimit: 10 },
  merchant_black: { regionBp: 13000, dailyLimit: 5 },
};

/** prices 表缓存（启动时从 config JSON 读，避免每次卖都查 DB）。 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const pricesJson: Array<{ id: string; base_price: number; recycle_bp?: number }> =
  JSON.parse(readFileSync(join(__root, 'generated', 'config', 'prices.json'), 'utf8'));
const priceMap = new Map(pricesJson.map((r) => [r.id, r]));

/** 幂等缓存（同 rid 返回上次结果，MVP 内存）。 */
const idempotencyMap = new Map<string, SellRes>();

/**
 * 商人回收（ADR-0012）。
 * 校验链：限购 → 影子账本 → 写流水 → 返回。
 * 失败：1001（影子不一致 / 参数非法）/ 3002（限购尽）。
 */
export async function sell(
  playerId: string,
  input: SellReq,
  merchantId: string,
  serverNow: number,
  rid?: string,
): Promise<SellRes> {
  // 幂等：同 rid 返回上次结果
  const idemKey = rid ? `${playerId}:${rid}` : '';
  if (idemKey && idempotencyMap.has(idemKey)) {
    return idempotencyMap.get(idemKey)!;
  }

  // 参数校验
  if (typeof input.itemId !== 'string' || input.itemId.length === 0) {
    throw new EconomyError(ERR.BAD_PAYLOAD, 'itemId required');
  }
  if (!Number.isInteger(input.count) || input.count <= 0) {
    throw new EconomyError(ERR.BAD_PAYLOAD, 'count must be positive integer');
  }

  const merchant = MERCHANTS[merchantId];
  if (!merchant) {
    throw new EconomyError(ERR.BAD_PAYLOAD, `unknown merchant: ${merchantId}`);
  }

  const price = priceMap.get(input.itemId);
  if (!price || typeof price.recycle_bp !== 'number' || price.recycle_bp <= 0) {
    throw new EconomyError(ERR.BAD_PAYLOAD, `no recycle price for ${input.itemId}`);
  }

  const day = dayOf(serverNow);

  // 1) 限购检查
  const used = await quotaUsed(playerId, merchantId, day);
  if (used + input.count > merchant.dailyLimit) {
    throw new EconomyError(ERR.QUOTA_EXHAUSTED, `daily quota exhausted: ${used}/${merchant.dailyLimit}`);
  }

  // 2) 影子账本校验（容差=0）
  const { gained, sold } = await ledgerSum(playerId, input.itemId);
  const available = gained - sold;
  if (input.count > available) {
    throw new EconomyError(ERR.BAD_PAYLOAD, `shadow ledger mismatch: available=${available}, sell=${input.count}`);
  }

  // 3) 计算回收价 + 写流水
  const unitPrice = sellValue(price.base_price, price.recycle_bp, merchant.regionBp);
  const herbDelta = unitPrice * input.count;

  await withTx(async (tx) => {
    await recordSell(playerId, input.itemId, input.count, herbDelta, tx);
    await quotaIncrement(playerId, merchantId, day, input.count, merchant.dailyLimit, tx);
  });

  const quotaLeft = merchant.dailyLimit - (used + input.count);
  const res: SellRes = { accepted: true, herbDelta, quotaLeft };

  if (idemKey) idempotencyMap.set(idemKey, res);
  return res;
}

// —— 跨模块发放 / 扣除入口 ——
//
// 守卫「服务端依赖边界」规定：跨模块只能调用对方 service，禁止直接摸对方 repo。
// 因此 chest / ads / event 等模块要发放或扣除物品，必须经下面两个函数，
// 由本模块（账本属主）统一写 ledger_entry。
//
// 事务纪律（PGlite 单连接，事务内调全局 q() 会永久死锁）：
// 调用方若已开启事务，**必须**把 tx 传进来。

/** 发放物品（写一条 delta > 0 的流水）。count 必须为正。 */
export async function grantItem(
  playerId: string, itemId: string, count: number, reason: string, tx?: unknown,
): Promise<void> {
  // 防"负数当扣除用"：负数会写出一条 delta<0 的流水，语义反转，必须显式拒绝
  if (!Number.isInteger(count) || count <= 0) {
    throw new EconomyError(ERR.BAD_PAYLOAD, `grantItem count must be a positive integer, got ${count}`);
  }
  await recordGain(playerId, itemId, count, reason, tx);
}

/** 扣除物品（写一条 delta < 0 的流水）。count 必须为正，内部取负。 */
export async function consumeItem(
  playerId: string, itemId: string, count: number, reason: string, tx?: unknown,
): Promise<void> {
  if (!Number.isInteger(count) || count <= 0) {
    throw new EconomyError(ERR.BAD_PAYLOAD, `consumeItem count must be a positive integer, got ${count}`);
  }
  await recordLoss(playerId, itemId, count, reason, tx);
}
