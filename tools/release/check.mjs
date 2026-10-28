#!/usr/bin/env node
/**
 * `npm run release:check`：提审可机检项一键核验（FIX-11/R-2，2026-10-28 W3-1）。
 *
 * 把 review-checklist.md 里"本可机检"的 4 项从人工勾选改为脚本判定（剩余 13 项需真机/资质，仍人工）：
 *   1. configVersion 一致性：copyright-materials.md + review-checklist.md 里写的 configVersion
 *      必须等于 client/assets/resources/config/_manifest.json 实测值（清单第 7 条）。
 *   2. 微信主包 ≤ 4MB：复用 tools/measure-bundle.mjs（主包 = 构建产物除 subpackages/ 外全部文件）。
 *   3. chests.csv：恰好 3 行且 lock 全为 none（v1.0 只做无锁开箱，清单第 1 节；提审材料不得出现开锁界面）。
 *   4. ad_placements：∑ daily_cap ≤ 9（三币制硬上限，清单第 5 节）。
 *
 * 退出码：0 = 4 项全过；1 = 任一失败或构建产物缺失。
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { p, ROOT } from '../lib/util.mjs';

const manifest = JSON.parse(readFileSync(p('client/assets/resources/config/_manifest.json'), 'utf8'));
const cfgVersion = manifest.configVersion;

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

// 1. configVersion 一致性
{
  const docs = [
    'docs/07_release/compliance/copyright-materials.md',
    'docs/07_release/compliance/review-checklist.md',
  ];
  const bad = [];
  for (const d of docs) {
    const text = readFileSync(p(d), 'utf8');
    const written = [...text.matchAll(/`?([0-9a-f]{16})`?/g)].map((m) => m[1]);
    const stale = written.filter((v) => v !== cfgVersion);
    if (stale.length) bad.push(`${d} 出现过期值 ${stale.join(', ')}`);
  }
  check('configVersion 一致性', bad.length === 0,
    bad.length ? bad.join('；') : `${cfgVersion}（manifest 实测，与两份提审文档一致）`);
}

// 2. 微信主包 ≤ 4MB（复用 measure-bundle）
{
  const r = spawnSync(process.execPath, [join(ROOT, 'tools/measure-bundle.mjs'), '--json'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    check('微信主包 ≤ 4MB', false, `构建产物缺失或测量失败（status ${r.status}）`);
  } else {
    const m = JSON.parse(r.stdout);
    const bytes = typeof m.bytes === 'number' ? m.bytes : m.mainBytes ?? m.totalBytes ?? 0;
    check('微信主包 ≤ 4MB', bytes <= 4 * 1024 * 1024,
      `${(bytes / 1024 / 1024).toFixed(3)}MB / 4MB 预算`);
  }
}

// 3. chests.csv 恰好 3 行且 lock 全 none
{
  const text = readFileSync(p('game-data/source/chests.csv'), 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('id,'));
  const locks = lines.map((l) => l.split(',')[2]?.trim());
  check('chests.csv 3 行全无锁', lines.length === 3 && locks.every((x) => x === 'none'),
    `${lines.length} 行，lock=[${locks.join(',')}]`);
}

// 4. ad_placements ∑ daily_cap ≤ 9
{
  const rows = JSON.parse(readFileSync(p('server/generated/config/ad_placements.json'), 'utf8'));
  const sum = rows.reduce((s, r) => s + (r.daily_cap ?? 0), 0);
  check('广告位每日上限合计 ≤ 9', rows.length > 0 && sum <= 9,
    `${rows.length} 个位面 × 合计 ${sum} / 上限 9`);
}

let fail = 0;
console.log('\n## release:check（提审可机检项）\n');
for (const r of results) {
  console.log(`  ${r.ok ? '✅' : '❌'} ${r.name}  ——  ${r.detail}`);
  if (!r.ok) fail++;
}
console.log(`\n${fail === 0 ? '✅ 全部通过' : `❌ ${fail} 项失败`}\n`);
process.exit(fail ? 1 : 0);
