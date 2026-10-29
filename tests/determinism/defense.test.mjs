/**
 * 确定性测试（PD7-08）—— 战斗簇数据（units/waves/defenses/throwables/islands/protection_cards）。
 *
 * 读 `server/generated/config/*.json`（gen:config 产物）+ 骨架 `packages/game-core/src/defense/index.ts`。
 * B-L5：设计源没给的数值一律不编。
 *
 * 注：waves 表因设计源无波次数值（DS §7 无「第几波几个」）→ 留空 + BLOCKED（卡 PD7-08 阻塞条件），
 * 本测试对 waves 仅断言「当前为空表」，波次模拟无法测（待设计源补波次数值，见 UNKNOWN-TABLES）。
 *
 * 骨架（distanceField/allEntrancesReachable）为纯寻路，与 waves 无关，可测确定性（A3）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', p), 'utf8'));

const units = read('units.json');
const waves = read('waves.json');
const defenses = read('defenses.json');
const throwables = read('throwables.json');
const islands = read('islands.json');
const protectionCards = read('protection_cards.json');

test('df 1 A2 units 恰 3 行，覆盖近战/远程/坦克（U-02：v1.0 各 1）', () => {
  assert.equal(units.length, 3, 'units 应恰 3 兵种（非 9）');
  const cats = units.map((r) => r.category).sort();
  assert.deepEqual(cats, ['melee', 'ranged', 'tank'], '3 兵种覆盖近战/远程/坦克各 1');
  for (const r of units) assert.ok(r.name && r.name.trim().length > 0, `${r.id} name 非空`);
});

test('df 2 units 兵种数值待定（§7.2:517）→ 全部留空，不得编造', () => {
  for (const r of units) {
    for (const k of ['hp', 'speed', 'attack', 'range', 'unlock_level']) {
      assert.ok(r[k] === undefined || r[k] === '' || r[k] === null, `${r.id}.${k} 应留空（数值待定）`);
    }
  }
});

test('df 3 waves 空表（BLOCKED：设计源无波次数值，DS §7 无「第几波几个」）', () => {
  assert.equal(waves.length, 0, 'waves 应空表（BLOCKED，不得编波次）');
});

test('df 4 defenses 3 防御建筑，配方有源（§7.2:520），数值待定留空', () => {
  assert.equal(defenses.length, 3, 'defenses 应恰 3 种（箭塔/投石机/弓弩车）');
  const byId = Object.fromEntries(defenses.map((r) => [r.id, r]));
  assert.ok(byId.def_arrow_tower.recipe.includes('木板×10') && byId.def_arrow_tower.recipe.includes('木棍×10'), '箭塔配方');
  assert.ok(byId.def_catapult.recipe.includes('粗绳×2'), '投石机配方');
  assert.equal(byId.def_crossbow_cart.level_max, 3, '弓弩车 1/2/3 级');
  for (const r of defenses) {
    for (const k of ['damage', 'range', 'hp']) {
      assert.ok(r[k] === undefined || r[k] === '' || r[k] === null, `${r.id}.${k} 应留空（数值待定）`);
    }
  }
});

test('df 5 throwables 烟雾罐/火罐配方有源（§7.3:538），时长可调留空', () => {
  assert.equal(throwables.length, 2, 'throwables 应恰 2 种（烟雾罐/火罐）');
  const byId = Object.fromEntries(throwables.map((r) => [r.id, r]));
  assert.ok(byId.throw_smoke.recipe.includes('木炭') && byId.throw_smoke.recipe.includes('布×2'), '烟雾罐配方');
  assert.ok(byId.throw_fire.recipe.includes('燃油'), '火罐配方');
  for (const r of throwables) {
    assert.ok(r.duration_sec === undefined || r.duration_sec === '' || r.duration_sec === null, `${r.id}.duration_sec 应留空（数值可调）`);
  }
});

test('df 6 islands 4 模板，登陆口 2-3（§7.2:530），面积待定留空', () => {
  assert.equal(islands.length, 4, 'islands 应恰 4 模板');
  const names = islands.map((r) => r.name);
  assert.deepEqual(names.sort(), ['双港湾岛', '岩脊岛', '矿产岛', '高地岛'].sort(), '4 模板名');
  for (const r of islands) {
    assert.ok(r.landing_zones >= 2 && r.landing_zones <= 3, `${r.id} 登陆口应 2-3`);
    assert.ok(r.area === undefined || r.area === '' || r.area === null, `${r.id}.area 应留空（面积待定）`);
  }
});

test('df 7 protection_cards 三种卡，时长为定值有源（§4.4:355），价格待定留空', () => {
  assert.equal(protectionCards.length, 3, 'protection_cards 应恰 3 种（30天/7天/24小时）');
  const byId = Object.fromEntries(protectionCards.map((r) => [r.id, r]));
  assert.equal(byId.prot_30d.duration_hours, 720, '30 天卡 = 720 小时');
  assert.equal(byId.prot_7d.duration_hours, 168, '7 天卡 = 168 小时');
  assert.equal(byId.prot_24h.duration_hours, 24, '24 小时卡 = 24 小时');
  for (const r of protectionCards) {
    assert.ok(r.price === undefined || r.price === '' || r.price === null, `${r.id}.price 应留空（价格待定 §4.4:367）`);
  }
});

test('df 8 A3 骨架 distanceField 正确性 + 确定性：同输入两次同输出、阻挡不可达、入口可达性', async () => {
  const { distanceField, allEntrancesReachable } = await import('../../packages/game-core/src/defense/index.ts');
  const grid = [
    [0, 0, 0, 1, 0],
    [0, 1, 0, 1, 0],
    [0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0],
  ];
  const gate = [2, 2];
  const d1 = distanceField(grid, gate[0], gate[1]);
  const d2 = distanceField(grid, gate[0], gate[1]);
  assert.deepEqual(d1, d2, '同输入两次结果相同（A3 确定性）');
  assert.equal(d1[2][2], 0, '大门处步数 0');
  assert.equal(d1[0][3], -1, '阻挡格不可达');
  // 全登陆口可达性（入口坐标为 [x,y]）：门口 [0,0] 应可达；被挡格 [3,0]（row0 col3=1）不可作为入口
  assert.equal(allEntrancesReachable(grid, gate, [[0, 0]]), true, '入口 [0,0] 可达大门');
  assert.equal(allEntrancesReachable(grid, gate, [[3, 0]]), false, '入口 [3,0] 在被挡格上，不可达');
});
