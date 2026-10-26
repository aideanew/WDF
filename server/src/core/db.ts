/**
 * 数据库层。
 *
 * 选型（ADR-0004 的本地落地）：**同一套 PostgreSQL SQL，两种运行时**。
 *  - 生产 / 联调：真 PostgreSQL（后续接 `pg` 驱动，只需换 createClient()）
 *  - 本地开发：PGlite（PostgreSQL 18 编译成 WASM，纯 JS，零安装）
 * 好处：本地不需要装 PG 服务、CI 不需要容器，SQL 方言与生产完全一致（jsonb / bigserial / timestamptz 都可）。
 * 代价：PGlite 是单连接，不适合多进程；本地够用。
 */
import { PGlite } from '@electric-sql/pglite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = join(HERE, '..', '..');
const MIGRATIONS_DIR = join(SERVER_ROOT, 'db', 'migrations');
// 数据目录放仓库根的 `.local/`：已在 .gitignore 里，也不会污染 workspace 目录树
// （PGlite 会建一堆空子目录，落在 server/ 下会触发 guard 的「无空目录」规则）。
const DEFAULT_DATA_DIR = join(SERVER_ROOT, '..', '.local', 'pg');

export type Row = Record<string, unknown>;

let client: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;

/** 打开数据库并跑完所有未执行的迁移。幂等，多次调用返回同一实例。 */
export function initDb(): Promise<PGlite> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const dir = process.env.WDF_DB_DIR ?? DEFAULT_DATA_DIR;
    if (dir !== ':memory:') mkdirSync(dir, { recursive: true });
    client = new PGlite(dir === ':memory:' ? undefined : dir);
    await migrate(client);
    return client;
  })();
  return initPromise;
}

export function getDb(): PGlite {
  if (!client) throw new Error('db 未初始化：先 await initDb()');
  return client;
}

/** 顺序执行 `db/migrations/*.sql`，已执行的记进 schema_migrations，永不重复执行。 */
async function migrate(db: PGlite): Promise<void> {
  await db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());',
  );
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const f of files) {
    const version = f.replace(/\.sql$/, '');
    const done = await db.query<{ x: number }>('SELECT 1 AS x FROM schema_migrations WHERE version = $1', [version]);
    if (done.rows.length > 0) continue;
    await db.exec(readFileSync(join(MIGRATIONS_DIR, f), 'utf8'));
    await db.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
    console.log(`[db] 迁移已执行：${f}`);
  }
}

/** 只读/单语句查询，直接给 rows。 */
export async function q<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await getDb().query<T>(sql, params);
  return res.rows;
}

/** 事务：回调内抛错即整体回滚。 */
export async function withTx<T>(fn: (tx: PGlite) => Promise<T>): Promise<T> {
  return getDb().transaction(async (tx) => fn(tx as unknown as PGlite)) as Promise<T>;
}

/** 测试用：清空库目录句柄（不删数据文件）。 */
export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    initPromise = null;
  }
}
