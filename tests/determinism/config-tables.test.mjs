/**
 * 确定性测试（PD8-06 · PLAN-R5）—— 客户端配置表可达性：TableName 11 → 46。
 *
 * 证明 `tables.ts` 的 46 张表真的能从 `client/assets/resources/config/*.json` 加载出来：
 *  - `setLoader` 注入真实 loader（node:fs + JSON.parse，路径从 import.meta.url 推，不写死盘符）
 *  - `preload(TABLE_NAMES)` → loaded=46 / failed=0
 *  - 40 张非空表逐表 `.length > 0`（显式列名，不许循环兜底）
 *  - 6 张设计语义空表逐表 `.length === 0`（显式列名）
 *  - 40 + 6 = 46，两数组互不重叠且并集 = TABLE_NAMES
 *  - `configVersion()` 返回非空字符串（证明 _manifest 也被读）
 *
 * 运行：node --import ./tools/runtime/register.mjs --test tests/determinism/config-tables.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  setLoader,
  preload,
  table,
  configVersion,
  TABLE_NAMES,
} from '../../client/assets/scripts/services/config/tables.ts';

// 从 import.meta.url 推仓库根，不写死盘符
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const configDir = join(repoRoot, 'client', 'assets', 'resources', 'config');

// 真实 loader：读 config/${name}.json
setLoader(async (path) => {
  const name = path.replace(/^config\//, '');
  const raw = readFileSync(join(configDir, `${name}.json`), 'utf8');
  return JSON.parse(raw);
});

// 40 张非空表（显式列名；46 - 6 设计空表 = 40）
const NON_EMPTY = [
  'ad_placements', 'bait', 'blueprints', 'buildings', 'chests', 'consumers',
  'crew_traits', 'defenses', 'event_drops', 'events', 'facilities', 'fish',
  'foods', 'generators', 'guide_steps', 'hooks', 'islands', 'items', 'jobs',
  'levels', 'lines', 'lockpick_tools', 'locks', 'merchants', 'oil', 'prices',
  'protection_cards', 'quality', 'raft_tiles', 'recipes', 'rooms', 'seasons',
  'shipwrecks', 'spawns', 'throwables', 'tides', 'titles', 'units', 'unlocks',
  'zones',
];

// 6 张设计语义空表（显式列名；drops 属 D-27 无规则、explore §3.5 无探索点、
// limits 无独立锚点、phrases §9.4 无文案、regions D-53 不种数据、waves 无波次）
const DESIGN_EMPTY = ['drops', 'explore', 'limits', 'phrases', 'regions', 'waves'];

test('ct 0 测试自检：40 + 6 = 46 且互不重叠、并集 = TABLE_NAMES', () => {
  assert.equal(NON_EMPTY.length, 40, '非空表应恰 40 张');
  assert.equal(DESIGN_EMPTY.length, 6, '设计空表应恰 6 张');
  const union = new Set([...NON_EMPTY, ...DESIGN_EMPTY]);
  assert.equal(union.size, 46, '两数组并集应恰 46（互不重叠）');
  assert.deepEqual(
    [...union].sort(),
    [...TABLE_NAMES].sort(),
    '并集必须与 TABLE_NAMES 完全一致（防止漏表却两边都没提）',
  );
});

test('ct 1 preload(TABLE_NAMES) → loaded=46 / failed=0', async () => {
  const res = await preload([...TABLE_NAMES]);
  assert.equal(res.loaded.length, 46, `应加载 46 张，实得 ${res.loaded.length}`);
  assert.equal(res.failed.length, 0, `应无失败，实得 ${res.failed.join(',')}`);
});

test('ct 2 40 张非空表逐表 .length > 0（显式列名）', () => {
  for (const n of NON_EMPTY) {
    const rows = table(n);
    assert.ok(rows.length > 0, `表 ${n} 应非空，实得 ${rows.length}`);
  }
});

test('ct 3 6 张设计空表逐表 .length === 0（显式列名）', () => {
  for (const n of DESIGN_EMPTY) {
    const rows = table(n);
    assert.equal(rows.length, 0, `设计空表 ${n} 应恰 0 行，实得 ${rows.length}`);
  }
});

test('ct 4 configVersion() 返回非空字符串（_manifest 也被读）', () => {
  const v = configVersion();
  assert.equal(typeof v, 'string');
  assert.ok(v.length > 0, 'configVersion 不应为空');
});
