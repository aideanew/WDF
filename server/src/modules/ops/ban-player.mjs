#!/usr/bin/env node
/**
 * ops · 封号 CLI（TASK-1401，2026-10-29）。
 * 用法（走 TS loader，PGlite 单写锁）：
 *   node --import ./tools/runtime/register.mjs server/src/modules/ops/ban-player.mjs <playerId> <untilIso>
 *   例：... ban-player.mjs p_abc123 2026-12-31T00:00:00.000Z
 * 行为：事务内更新 player.banned_until + 写 audit_log(actor=ops, action=ban_player)。
 * 截止时间必须是 ISO 字符串；玩家不存在时输出告警并退出码 1。
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb, closeDb } from '../../core/db.ts';
import { banUntil } from './service.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const DB_DIR = process.env.WDF_DB_DIR ?? join(ROOT, '.local', 'pg');

function usage() {
  console.log(`封号 CLI
用法：node --import ./tools/runtime/register.mjs server/src/modules/ops/ban-player.mjs <playerId> <untilIso>
  例：... ban-player.mjs p_abc123 2026-12-31T00:00:00.000Z
数据库：${DB_DIR}（可用 WDF_DB_DIR 覆盖，测试用 ':memory:'）`);
  process.exit(1);
}

const [playerId, untilIso] = process.argv.slice(2);
if (!playerId || !untilIso) usage();
if (Number.isNaN(new Date(untilIso).getTime())) {
  console.error(`❌ 截止时间不是合法 ISO 时间：${untilIso}`);
  process.exit(1);
}

await initDb();
try {
  const n = await banUntil(playerId, untilIso, 'ops');
  if (n === 0) {
    console.error(`❌ 玩家不存在：${playerId}（未更新，未审计）`);
    process.exit(1);
  }
  console.log(`✅ 已封禁玩家 ${playerId} 至 ${untilIso}`);
} finally {
  await closeDb();
}
