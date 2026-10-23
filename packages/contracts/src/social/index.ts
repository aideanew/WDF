export interface SendReq { channel: 'region' | 'world'; phraseId: string }
export interface ChatMsg { id: string; playerId: string; name: string; phraseId: string; at: number }
export interface PullReq { channel: 'region' | 'world'; after?: string }
export interface PullRes { items: ChatMsg[] }
