#!/usr/bin/env node
/**
 * ops · 开新区 CLI（TASK-1401，2026-10-29）。
 * 用法（走 TS loader，PGlite 单写锁）：
 *   node --import ./tools/runtime/register.mjs server/src/modules/ops/open-region.mjs <id> <name>
 *   例：node --import ./tools/runtime/register.mjs server/src/modules/ops/open-region.mjs s2 二服
 * 行为：事务内清旧 current、置新区为 current、写 audit_log(actor=ops, action=open_region)。
 * 区名由运营给定；**禁止自编**（D-53 约束③）。
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb, closeDb } from '../../core/db.ts';
import { openNewRegion } from './service.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const DB_DIR = process.env.WDF_DB_DIR ?? join(ROOT, '.local', 'pg');

function usage() {
  console.log(`开新区 CLI
用法：node --import ./tools/runtime/register.mjs server/src/modules/ops/open-region.mjs <id> <name>
  例：... open-region.mjs s2 二服
数据库：${DB_DIR}（可用 WDF_DB_DIR 覆盖，测试用 ':memory:'）`);
  process.exit(1);
}

const [id, name] = process.argv.slice(2);
if (!id || !name) usage();

await initDb();
try {
  await openNewRegion(id, name, 'ops');
  console.log(`✅ 已开新区 ${id}（${name}），并置为当前开放区`);
} finally {
  await closeDb();
}
