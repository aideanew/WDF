export interface ClaimInfoReq { tier: 'normal' | 'advanced' | 'exclusive' }
export interface ClaimInfoRes { granted: boolean; infoId?: string; seed?: number; remainingToday: number }
