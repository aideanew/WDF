export interface BuyQuotaReq { itemId: string; count: number }
export interface BuyQuotaRes { granted: number; remainingToday: number; goldAfter?: number }
