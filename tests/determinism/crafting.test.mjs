import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseInputs, canCraft, consume, MODULE_ID } from '../../packages/game-core/src/crafting/index.ts';

// 用真实配方表驱动测试：80 行的输入串分布必须与 EXEC-BRIEF BASE-04 一致（单31/双44/三2/四3）。
const RECIPES = JSON.parse(readFileSync('client/assets/resources/config/recipes.json', 'utf8'));

const recipe = (inputs, out, outCount = 1, id = 'r') => ({
  id,
  out,
  outCount,
  rawInputs: inputs,
  inputs: parseInputs(inputs).inputs,
});

test('crafting：MODULE_ID 保留（守卫 catalogConsistency 依赖模块目录导出）', () => {
  assert.equal(MODULE_ID, 'crafting');
});

test('parseInputs：单输入 → ok，missing 为空', () => {
  const r = recipe('item_0001*1');
  assert.deepEqual(canCraft(r, { item_0001: 1 }), { ok: true, missing: [] });
});

test('parseInputs：缺 1 个材料 → missing 精确含该 id，need/have 分别取配方值与库存值', () => {
  const r = recipe('item_0001*3;item_0002*1');
  assert.deepEqual(canCraft(r, { item_0002: 1, item_0001: 2 }), {
    ok: false,
    missing: [{ id: 'item_0001', need: 3, have: 2 }],
  });
});

test('parseInputs：真实存在的 3 输入配方（recipe_0043）', () => {
  const row = RECIPES.find((x) => x.id === 'recipe_0043');
  const r = recipe(row.inputs, row.output, row.output_count, row.id);
  assert.equal(r.inputs.length, 3);
  assert.deepEqual(canCraft(r, {}), {
    ok: false,
    missing: [
      { id: 'item_0058', need: 1, have: 0 },
      { id: 'item_0031', need: 1, have: 0 },
      { id: 'item_0035', need: 1, have: 0 },
    ],
  });
});

test('parseInputs：真实存在的 4 输入配方（recipe_0078）', () => {
  const row = RECIPES.find((x) => x.id === 'recipe_0078');
  const r = recipe(row.inputs, row.output, row.output_count, row.id);
  assert.equal(r.inputs.length, 4);
  const inv = Object.fromEntries(r.inputs.map((i) => [i.id, i.count]));
  assert.deepEqual(canCraft(r, inv), { ok: true, missing: [] });
});

test('parseInputs：非法片段收集进 invalid，不抛异常', () => {
  assert.deepEqual(parseInputs(''), { inputs: [], invalid: [] });
  assert.deepEqual(parseInputs('item_0001*1;bad;item_0002*0;nope*2.5;item_0003*'), {
    inputs: [{ id: 'item_0001', count: 1 }],
    invalid: ['bad', 'item_0002*0', 'nope*2.5', 'item_0003*'],
  });
});

test('canCraft：空库存 → 全部材料缺，ok=false', () => {
  const r = recipe('item_0001*2;item_0002*1');
  const res = canCraft(r, {});
  assert.equal(res.ok, false);
  assert.deepEqual(
    res.missing.map((m) => m.id),
    ['item_0001', 'item_0002'],
  );
});

test('consume：不改入参（同对象调两次结果相同 = 未改入参）', () => {
  const r = recipe('item_0001*2', 'item_0099', 3);
  const inv = { item_0001: 5, item_0002: 7 };
  const before = { ...inv };
  const a = consume(r, inv);
  const b = consume(r, inv);
  assert.deepEqual(inv, before, '入参不得被修改');
  assert.deepEqual(a, b, '同输入同输出');
  assert.deepEqual(a, { item_0001: 3, item_0002: 7, item_0099: 3 });
});

test('consume：库存不足时夹到 0 而非负数', () => {
  const r = recipe('item_0001*5', 'item_0099', 1);
  assert.deepEqual(consume(r, { item_0001: 2 }), { item_0001: 0, item_0099: 1 });
});

test('确定性：canCraft 与 parseInputs 连续两次调用深比较相等', () => {
  const r = recipe('item_0001*2;item_0002*1');
  assert.deepEqual(canCraft(r, { item_0001: 1 }), canCraft(r, { item_0001: 1 }));
  assert.deepEqual(parseInputs('item_0001*2;item_0002*1'), parseInputs('item_0001*2;item_0002*1'));
});

test('真实数据：80 条配方全部可解析，且输入串分布为 单31/双44/三2/四3', () => {
  assert.equal(RECIPES.length, 80);
  const dist = {};
  for (const row of RECIPES) {
    const parsed = parseInputs(row.inputs);
    assert.deepEqual(parsed.invalid, [], `${row.id} 存在无法解析的输入串: ${row.inputs}`);
    assert.equal(parsed.inputs.length, row.inputs.split(';').length);
    const n = parsed.inputs.length;
    dist[n] = (dist[n] ?? 0) + 1;
  }
  assert.deepEqual(dist, { 1: 31, 2: 44, 3: 2, 4: 3 });
});
