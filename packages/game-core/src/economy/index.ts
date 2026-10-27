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
 * ## 两条设定硬约束（F-40，此前只写在注释里、代码零实现）
 *
 * 设定原文（`材料与工具总表.md:182`、`我的筏-深度设计方案-v5.5.md:1140`）：
 * **「原价 = 商人卖价；回收价 = 商人收购价 = 原价 × 50%。各地商人在此基础上 ±30% 浮动。」**
 *
 * 1. **区域系数钳在 ±30%**（`region_bp ∈ [7000, 13000]`）。
 *    同文件的 `recyclePrice()` 一直这么做（`Math.max(-3000, Math.min(3000, bp))`），
 *    但 `sellValue` 是后来补的，把这个钳制丢了 —— 配置里把 `region_bp` 写成 20000
 *    就等于 +100%，直接突破设定。现在两边同口径。
 *
 * 2. **回收价不得超过原价**。原注释承诺的"上限保护"此前是 `void basePrice;`，一行都没实现。
 *    正常数据下永不触发（50%×1.3 = 65% 原价），但数据巧合不是守卫：
 *    一旦有人把 `recycle_bp` 填成大于 `base_price`，买低卖高即可无限刷灵草。
 *
 * `basePrice <= 0` 视为"无价"直接返回 0（设定：海水 原价 0 / 不收）。
 */
export function sellValue(basePrice: number, recycleBp: number, regionBp: number): number {
  if (!Number.isFinite(recycleBp) || !Number.isFinite(regionBp)) return 0;
  if (recycleBp < 0 || regionBp < 0) return 0;
  // 原价 0 = 不可回收物（设定：海水 原价 0 / 不收），卖价恒 0
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 0;
  // 区域系数 0 = 未配置/不收（既有契约 sellValue(10,5,0) === 0）。
  // 注意不能把 0 当 "-100%" 再钳到 7000 —— 那会让"漏配 region_bp"变成照付 70%。
  if (regionBp === 0) return 0;

  // ① 区域系数钳在 ±30%（与 recyclePrice 的 bp 钳制等价：[7000, 13000]）
  const region = Math.max(7000, Math.min(13000, regionBp));

  let result = Math.floor((recycleBp * region) / 10000);
  // ② 回收价不得超过原价（防填错 recycle_bp 后买低卖高）
  if (result > basePrice) result = Math.floor(basePrice);

  if (!Number.isSafeInteger(result) || result < 0) return 0;
  return result;
}
