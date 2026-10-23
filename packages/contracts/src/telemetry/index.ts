export interface TrackEvent { name: string; at: number; props?: Record<string, string | number | boolean> }
export interface TrackReq { events: TrackEvent[] }
