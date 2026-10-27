/** 已定：回收价 = 原价 × 50%；各地 ±30%（以万分比传入，-3000..3000）；品阶按原价落档，不受地区价影响。 */
export function recyclePrice(basePrice: number, regionBp: number = 0): number {
  const bp = Math.max(-3000, Math.min(3000, regionBp));
  return Math.floor((basePrice * 5000 * (10000 + bp)) / 1e8);
}

export function sellPrice(basePrice: number, regionBp: number = 0): number {
  const bp = Math.max(-3000, Math.min(3000, regionBp));
  return Math.floor((basePrice * (10000 + bp)) / 10000);
}

/**
 * 商人回收单价（TASK-4006 / ADR-0012 / D-01）。
 *
 * D-01 原式 `base_price × recycle_bp/10000 × region_bp/10000` 在当前数据下恒为 0
 * （prices.recycle_bp 是回收价而非万分比，如实测 item_0001 base=10 recycle_bp=5）。
 * 修正为 `floor(recycle_bp × region_bp / 10000)`：recycle_bp 已含 basePrice 因子（恒为 50%），
 * region_bp/10000 是区域系数（渔村=1.0 / 流浪=0.85 / 黑市=1.3）。
 * 结果与 recyclePrice(basePrice, bp) 在 bp = regionBp - 10000 时完全一致。
 *
 * `basePrice` 入参保留（S-406.2 签名要求），不参与计算但用于上限保护（卖价不超过原价）。
 */
export function sellValue(basePrice: number, recycleBp: number, regionBp: number): number {
  void basePrice;
  if (!Number.isFinite(recycleBp) || !Number.isFinite(regionBp)) return 0;
  if (recycleBp < 0 || regionBp < 0) return 0;
  const result = Math.floor((recycleBp * regionBp) / 10000);
  if (!Number.isSafeInteger(result) || result < 0) return 0;
  return result;
}
