export interface EventStartReq { hookItemId: string; lockpickToolIds: string[] }
export interface EventStartRes { sessionId: string; seed: number; configVersion: string; endsAt: number }
export interface EventOp { t: number; kind: 'cast' | 'pick' | 'unlock' | 'skip'; target?: number; pointer?: number }
export interface EventSubmitReq { sessionId: string; ops: EventOp[] }
export interface EventSubmitRes { totalValue: number; items: { itemId: string; count: number }[] }
export interface EventResultRes { totalValue: number; rank?: number; settled: boolean }
