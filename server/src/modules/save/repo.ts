/** save · 数据访问（save_snapshot 一人一行，PK = player_id） */
import { q } from '../../core/db.ts';

export interface SnapshotRow {
  player_id: string;
  revision: number;
  schema_version: number;
  config_version: string;
  checksum: number;
  body: unknown;
  saved_at: string;
}

export async function findSnapshot(playerId: string): Promise<SnapshotRow | null> {
  const rows = await q<SnapshotRow>(
    `SELECT player_id, revision, schema_version, config_version, checksum, body, saved_at
       FROM save_snapshot WHERE player_id = $1`,
    [playerId],
  );
  return rows[0] ?? null;
}

export interface SnapshotWrite {
  revision: number;
  schemaVersion: number;
  configVersion: string;
  checksum: number;
  body: unknown;
  savedAt: number;
}

export async function insertSnapshot(playerId: string, s: SnapshotWrite): Promise<void> {
  await q(
    `INSERT INTO save_snapshot (player_id, revision, schema_version, config_version, checksum, body, saved_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [playerId, s.revision, s.schemaVersion, s.configVersion, s.checksum, JSON.stringify(s.body), new Date(s.savedAt)],
  );
}

export async function updateSnapshot(playerId: string, s: SnapshotWrite): Promise<void> {
  await q(
    `UPDATE save_snapshot
        SET revision = $2, schema_version = $3, config_version = $4, checksum = $5, body = $6, saved_at = $7
      WHERE player_id = $1`,
    [playerId, s.revision, s.schemaVersion, s.configVersion, s.checksum, JSON.stringify(s.body), new Date(s.savedAt)],
  );
}
