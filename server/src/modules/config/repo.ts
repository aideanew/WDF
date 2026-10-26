/** config · 数据访问（`config_release` 表）。 */
import { q } from '../../core/db.ts';

export interface ReleaseRow {
  version: string;
  min_client: string;
  pack_url: string | null;
  released_at: string;
}

/**
 * 当前生效的配置发布记录。
 * D-05：表里**没有 status 字段**，按 `released_at` 取最新一条当作 active；
 * 要支持"回滚到旧版本"必须先加 status（走 ADR + 新迁移），不要在这里打补丁。
 */
export async function latestRelease(): Promise<ReleaseRow | null> {
  const rows = await q<ReleaseRow>(
    'SELECT version, min_client, pack_url, released_at FROM config_release ORDER BY released_at DESC LIMIT 1',
  );
  return rows[0] ?? null;
}

/** 运维/测试用：登记一条发布记录（同 version 覆盖，可重复调用）。 */
export async function upsertRelease(input: { version: string; minClient: string; packUrl?: string | null }): Promise<void> {
  await q(
    `INSERT INTO config_release (version, min_client, pack_url)
     VALUES ($1, $2, $3)
     ON CONFLICT (version) DO UPDATE SET min_client = EXCLUDED.min_client, pack_url = EXCLUDED.pack_url`,
    [input.version, input.minClient, input.packUrl ?? null],
  );
}
