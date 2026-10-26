import type { Platform } from '../common/envelope';
export interface LoginReq { code: string; plat: Platform; anonymousSaveId?: string }
export interface LoginRes { token: string; playerId: string; region: string; province?: string; isNew: boolean; serverTime: number }
export interface BindStartRes { ticket: string; expiresAt: number }
export interface BindConfirmReq { ticket: string }
export interface BindConfirmRes { playerId: string; forkPending: boolean }
export interface RefreshRes { token: string; serverTime: number }
