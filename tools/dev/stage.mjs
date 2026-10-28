#!/usr/bin/env node
/**
 * `npm run stage <关键词>`：定向体检 = 影响面模块 + 该模块所有测试，一条命令跑完（I-4）。
 *
 * 与全量 `npm run verify`（gen + guard + 全测 + 双端类型检查）不同：`stage` 是**定向**的，
 * 只跑关键词命中模块涉及的测试，用于「单卡只跑它改到的测试」（N-6 阶段体检），不做门禁。
 *
 * 两步（TASK-7050）：
 *  1. 定位模块：复用 `tools/guard/impact.mjs` 的匹配谓词（`id === kw || tables.includes(kw)
 *     || save.includes(kw) || name.includes(kw)`，`module-catalog.json` 权威）。
 *  2. 映射到测试：`tests/{determinism,integration,contract}/<module>*.test.mjs`（文件名前缀）
 *     ∪ 内容整体词引用模块 id 的测试（跨模块联动测试，如 chest 的 game-core/items-weights/handlers）。
 *     串行跑，逐文件汇总；**找不到测试时明确打印"该模块无测试"**，不静默成功（I-4 / 验收 2）。
 *
 * 用法：`npm run stage chest`（跑 chest 模块全部测试）；`npm run stage fishing`（打印"无测试"）。
 * 退出码：0 = 全部通过或无测试；1 = 有测试失败或用法错误。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { ROOT, catalog } from '../lib/util.mjs';

const kw = process.argv[2];
if (!kw) {
  console.log('用法：npm run stage <关键词>  例：npm run stage chest');
  process.exit(1);
}

const TEST_DIRS = ['tests/determinism', 'tests/integration', 'tests/contract'];

// 1. 定位模块（与 impact.mjs 同谓词，module-catalog 唯一登记处）
const mods = catalog().modules.filter(
  (m) => m.id === kw || m.tables.includes(kw) || m.save.includes(kw) || m.name.includes(kw),
);
if (!mods.length) {
  console.log(`\n# stage ${kw}：关键词未命中任何模块（module-catalog.json）\n`);
  process.exit(1);
}

// 2. 映射到测试文件（文件名前缀 ∪ 内容整体词引用模块 id）
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const files = new Set();
for (const m of mods) {
  const word = new RegExp(`\\b${escape(m.id)}\\b`);
  for (const dir of TEST_DIRS) {
    const abs = join(ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) {
      if (!f.endsWith('.test.mjs')) continue;
      const name = basename(f, '.test.mjs');
      if (name.startsWith(m.id)) { files.add(join(dir, f)); continue; }
      if (word.test(readFileSync(join(abs, f), 'utf8'))) files.add(join(dir, f));
    }
  }
}

const sorted = [...files].sort();
const modIds = mods.map((m) => m.id).join(', ');
if (!sorted.length) {
  console.log(`\n# stage ${kw}：命中模块 ${modIds}，但该模块无测试（tests/{determinism,integration,contract}/ 无引用）\n`);
  process.exit(0); // 明确打印"无测试"，不静默成功
}

// 3. 串行跑，逐文件汇总
console.log(`\n# stage ${kw}：模块 ${modIds} → ${sorted.length} 个测试文件\n`);
let fail = 0;
for (const f of sorted) {
  const r = spawnSync(process.execPath, ['--import', './tools/runtime/register.mjs', '--test', f], {
    stdio: 'inherit',
    cwd: ROOT,
  });
  if (r.status !== 0) fail++;
}
// R-2/FIX-8（2026-10-28 W2-3）：定向体检时附带跑占位值机检清单（report-only，exit 恒 0，不挂 verify、不影响 stage 退出码）。
console.log(`\n# stage ${kw}：附带占位值机检（npm run placeholders，report-only）\n`);
spawnSync(process.execPath, ['tools/guard/placeholders.mjs'], { stdio: 'inherit', cwd: ROOT });
console.log(`\n# stage ${kw} 汇总：${sorted.length} 个文件，失败 ${fail} 个\n`);
process.exit(fail ? 1 : 0);
