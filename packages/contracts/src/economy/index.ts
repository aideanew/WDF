export interface BuyQuotaReq { itemId: string; count: number }
export interface BuyQuotaRes { granted: number; remainingToday: number; goldAfter?: number }

/** 商人回收请求（ADR-0012）。rid 必带（幂等）。D-18：merchantId 缺省 = 渔村（服务端兜底）。 */
export interface SellReq {
  itemId: string;
  count: number;
  merchantId?: 'merchant_village' | 'merchant_wander' | 'merchant_black';
}
/** 商人回收成功响应。失败走错误码：1001 影子不一致 / 3002 限购尽。 */
export interface SellRes { accepted: true; herbDelta: number; quotaLeft: number }
