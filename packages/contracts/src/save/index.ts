export interface SaveSummary { revision: number; savedAt: number; schemaVersion: number; level: number; device?: string }
export interface SavePullRes { summary: SaveSummary | null; snapshot?: unknown }
export interface SavePushReq { baseRevision: number; snapshot: unknown; checksum: number }
export type SavePushRes = { accepted: true; revision: number } | { accepted: false; conflict: SaveSummary };
export interface ResolveForkReq { keep: 'local' | 'cloud'; localSnapshot?: unknown }
