/** account · 数据访问（只碰 player / identity 两张表） */
import { q } from '../../core/db.ts';

export interface IdentityRow {
  platform: string;
  open_id: string;
  union_id: string | null;
  player_id: string;
}

export interface PlayerRow {
  id: string;
  region: string;
  province: string | null;
  created_at: string;
  banned_until: string | null;
}

export async function findIdentity(platform: string, openId: string): Promise<IdentityRow | null> {
  const rows = await q<IdentityRow>(
    'SELECT platform, open_id, union_id, player_id FROM identity WHERE platform = $1 AND open_id = $2',
    [platform, openId],
  );
  return rows[0] ?? null;
}

export async function findPlayer(playerId: string): Promise<PlayerRow | null> {
  const rows = await q<PlayerRow>(
    'SELECT id, region, province, created_at, banned_until FROM player WHERE id = $1',
    [playerId],
  );
  return rows[0] ?? null;
}

export async function insertPlayer(id: string, region: string): Promise<void> {
  await q('INSERT INTO player (id, region) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [id, region]);
}

export async function insertIdentity(platform: string, openId: string, playerId: string): Promise<void> {
  await q(
    'INSERT INTO identity (platform, open_id, player_id) VALUES ($1, $2, $3) ON CONFLICT (platform, open_id) DO NOTHING',
    [platform, openId, playerId],
  );
}

/** 当前开放区服。TODO(M-01)：`0002_regions.sql` 落地后改为读 regions 表里 status='open' 的最新一行。 */
export async function currentRegion(): Promise<string> {
  return process.env.WDF_DEFAULT_REGION ?? 's1';
}
