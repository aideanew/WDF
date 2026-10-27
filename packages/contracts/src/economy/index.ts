export interface BuyQuotaReq { itemId: string; count: number }
export interface BuyQuotaRes { granted: number; remainingToday: number; goldAfter?: number }

/** 商人回收请求（ADR-0012）。rid 必带（幂等）。 */
export interface SellReq { itemId: string; count: number }
/** 商人回收成功响应。失败走错误码：1001 影子不一致 / 3002 限购尽。 */
export interface SellRes { accepted: true; herbDelta: number; quotaLeft: number }
