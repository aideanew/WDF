/** 已定：回收价 = 原价 × 50%；各地 ±30%（以万分比传入，-3000..3000）；品阶按原价落档，不受地区价影响。 */
export function recyclePrice(basePrice: number, regionBp: number = 0): number {
  const bp = Math.max(-3000, Math.min(3000, regionBp));
  return Math.floor((basePrice * 5000 * (10000 + bp)) / 1e8);
}

export function sellPrice(basePrice: number, regionBp: number = 0): number {
  const bp = Math.max(-3000, Math.min(3000, regionBp));
  return Math.floor((basePrice * (10000 + bp)) / 10000);
}
