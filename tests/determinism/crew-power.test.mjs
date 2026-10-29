/**
 * 确定性测试（PD7-07）—— 生产簇数据（jobs/foods/crew_traits/generators/consumers）。
 *
 * 读 `server/generated/config/*.json`（gen:config 产物）。
 * B-L5：设计源没有的数值一律不编。本测试锁「结构有源 + 无源字段留空」：
 *  - jobs：7 岗位（§5.3:421-430）；produces 有源岗位的每个产出物 id 必须在 items 存在（A3 外键）
 *  - crew_traits：幸福感 4 项，每项最高 25 / 每次升降 5（§5.3:460-464）
 *  - generators：3 种发电，标称出力比例 1:3:10（§6:471-474 + §6:481）
 *  - consumers：耗电设备清单（§6:470,478,479）；power_draw 无源留空（§6:481 待定）
 *  - foods：食物项（§5.2:413）在 items 存在
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const jobs = JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', 'jobs.json'), 'utf8'));
const foods = JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', 'foods.json'), 'utf8'));
const traits = JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', 'crew_traits.json'), 'utf8'));
const generators = JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', 'generators.json'), 'utf8'));
const consumers = JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', 'consumers.json'), 'utf8'));
const items = JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', 'items.json'), 'utf8'));

const itemIds = new Set(items.map((r) => r.id));

test('cp 1 jobs 恰 7 岗位且 id/name 齐（§5.3:421-430）', () => {
  assert.equal(jobs.length, 7, 'jobs 应恰 7 岗位');
  const ids = new Set(jobs.map((r) => r.id));
  assert.equal(ids.size, 7, 'job id 应唯一');
  const expected = ['soldier', 'cook', 'smith', 'carpenter', 'mechanic', 'researcher', 'worker'];
  assert.deepEqual(jobs.map((r) => r.id), expected, '7 岗位顺序与 enum 一致');
  for (const r of jobs) assert.ok(r.name && r.name.trim().length > 0, `${r.id} name 非空`);
});

test('cp 2 A3 外键：每个 job 的 produces 产出物 id 都在 items 存在', () => {
  for (const r of jobs) {
    const produced = (r.produces ?? '').split(';').filter(Boolean);
    for (const pid of produced) {
      assert.ok(itemIds.has(pid), `${r.id} 产出物 ${pid} 应在 items 存在`);
    }
  }
});

test('cp 3 有源产出物仅铁匠/机械师（§5.3:437），其余留空（产出物不固定）', () => {
  const smith = jobs.find((r) => r.id === 'smith');
  const mechanic = jobs.find((r) => r.id === 'mechanic');
  assert.ok(smith.produces.includes('item_0031') && smith.produces.includes('item_0033'), '铁匠应产钢材/金锭');
  assert.ok(mechanic.produces.includes('item_0034') && mechanic.produces.includes('item_0037'), '机械师应产电线/钢缆');
  // 士兵/厨师/木匠/研究员/工人：产出物不固定（§5.3:422-430 职责描述）→ 留空
  for (const id of ['soldier', 'cook', 'carpenter', 'researcher', 'worker']) {
    assert.equal((jobs.find((r) => r.id === id).produces ?? ''), '', `${id} 产出物应留空（不固定）`);
  }
});

test('cp 4 crew_traits 幸福感 4 项，每项最高 25 / 每次升降 5（§5.3:460-464）', () => {
  assert.equal(traits.length, 4, 'crew_traits 应恰 4 项（收益/食物/工作休息/其他）');
  const ids = new Set(traits.map((r) => r.id));
  assert.equal(ids.size, 4, 'trait id 应唯一');
  for (const r of traits) {
    assert.ok(r.name && r.name.trim().length > 0, `${r.id} name 非空`);
    assert.equal(r.max_value, 25, `${r.id} max_value 应为 25（§5.3:460）`);
    assert.equal(r.step, 5, `${r.id} step 应为 5（§5.3:460）`);
  }
});

test('cp 5 generators 3 种发电，标称出力比例 1:3:10（§6:481）', () => {
  assert.equal(generators.length, 3, 'generators 应恰 3 种');
  const byId = Object.fromEntries(generators.map((r) => [r.id, r]));
  assert.deepEqual(Object.keys(byId).sort(), ['eel', 'oil', 'solar'], '3 种发电 id');
  assert.equal(byId.solar.output_ratio, 1);
  assert.equal(byId.eel.output_ratio, 3);
  assert.equal(byId.oil.output_ratio, 10);
  for (const r of generators) assert.ok(r.output_ratio > 0, `${r.id} output_ratio 应 > 0`);
});

test('cp 6 consumers 耗电设备清单非空，power_draw 无源留空（§6:481 待定）', () => {
  assert.ok(consumers.length >= 5, `consumers 应 ≥5 耗电设备，得 ${consumers.length}`);
  const ids = new Set(consumers.map((r) => r.id));
  assert.equal(ids.size, consumers.length, 'consumer id 应唯一');
  for (const r of consumers) {
    assert.ok(r.name && r.name.trim().length > 0, `${r.id} name 非空`);
    // 耗电值无源（§6:481 待定）→ 必须留空（undefined/''），不得编造
    assert.ok(r.power_draw === undefined || r.power_draw === '' || r.power_draw === null, `${r.id} power_draw 应留空（无源）`);
  }
});

test('cp 7 foods 食物项在 items 存在（§5.2:413 配方）', () => {
  assert.ok(foods.length >= 5, `foods 应 ≥5 食物项，得 ${foods.length}`);
  const ids = new Set(foods.map((r) => r.id));
  assert.equal(ids.size, foods.length, 'food id 应唯一');
  for (const r of foods) {
    assert.ok(itemIds.has(r.id), `foods ${r.id} 应在 items 存在`);
    assert.ok(r.name && r.name.trim().length > 0, `${r.id} name 非空`);
  }
});
