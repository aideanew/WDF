/**
 * 客户端合成用例回归（TASK-3103）：CraftingModel 的「判定 → 扣/加 → 封印 → 零副作用」闭环。
 *
 * CraftingModel 不依赖 cc（只依赖 generated/game-core 的确定性核心与存档封印），Node 直载可测，
 * 因此 S-10.6 / S-10.7 的核心语义**不需要录屏就能自动化**：
 *  - 材料足够 → 扣材料 + 产出 + revision+1，且 verifySave 通过；
 *  - 材料不足 → **原样返回入参同一引用**（不落盘、revision 不动）；
 *  - 入参不可变；JSON 往返（模拟杀进程）后状态保留；
 *  - invalid 输入串与未知产物配方被剔除并计数。
 *
 * 与 tests/integration/hook-save.test.mjs 同源：HookModel/CraftingModel 走 client 的 generated 副本，
 * 封印函数取自 packages/game-core 源（二者字节一致，算法相同）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONFIG_VERSION, CLIENT_VERSION } from '../fixtures/version.mjs';

const { CraftingModel } = await import('../../client/assets/scripts/features/crafting/model/CraftingModel.ts');
const { SAVE_SCHEMA_VERSION, sealSave, verifySave } = await import('../../packages/game-core/src/save/index.ts');

const RECIPES = JSON.parse(readFileSync('client/assets/resources/config/recipes.json', 'utf8'));
const ITEMS = Object.fromEntries(
  JSON.parse(readFileSync('client/assets/resources/config/items.json', 'utf8')).map((r) => [r.id, r]),
);

function seed(revision, inventory) {
  return sealSave({
    schemaVersion: SAVE_SCHEMA_VERSION,
    configVersion: CONFIG_VERSION,
    saveId: 's_craft_flow_test',
    revision,
    savedAt: 1,
    modules: inventory ? { inventory } : {},
  });
}

test('S-10.6 材料足够 → 扣材料 + 产出 + revision+1，verifySave 通过', () => {
  const m = new CraftingModel();
  const { shapes } = m.toShapes([RECIPES.find((r) => r.id === 'recipe_0001')]); // 漂流木×1 → item_0019×2
  const recipe = shapes[0];
  assert.equal(recipe.out, 'item_0019');
  assert.equal(recipe.outCount, 2);
  assert.deepEqual(recipe.inputs, [{ id: 'item_0001', count: 1 }]);

  const before = seed(3, { item_0001: 5 });
  const next = m.applyToSave(before, recipe);

  assert.notEqual(next, before, '材料足够时必须产出新档');
  assert.equal(next.revision, 4, 'revision 必须 +1');
  assert.equal(next.modules.inventory.item_0001, 4, '材料必须 -1');
  assert.equal(next.modules.inventory.item_0019, 2, '产物必须 +outCount');
  assert.equal(verifySave(next), true, '剥离旧 checksum 后重新封印必须通过校验');
  assert.equal(before.revision, 3, '入参档 revision 不被改动');
  assert.equal(before.modules.inventory.item_0001, 5, '入参档库存不被改动');
});

test('S-10.7 材料不足 → 原样返回同一引用（零副作用，不落盘）', () => {
  const m = new CraftingModel();
  const { shapes } = m.toShapes([RECIPES.find((r) => r.id === 'recipe_0043')]); // 3 输入配方
  const recipe = shapes[0];

  // 只给 1 种材料，缺 2 种
  const before = seed(7, { item_0058: 1 });
  const next = m.applyToSave(before, recipe);

  assert.equal(next, before, '缺料必须返回入参同一引用');
  assert.equal(next.revision, 7, 'revision 不动');
  assert.deepEqual(next.modules.inventory, { item_0058: 1 }, '库存不动');
});

test('S-10.7 空存档（无 inventory 段）→ 同样零副作用', () => {
  const m = new CraftingModel();
  const { shapes } = m.toShapes([RECIPES.find((r) => r.id === 'recipe_0001')]);
  const before = seed(0);
  assert.equal(m.applyToSave(before, shapes[0]), before, '无背包段时不得制作');
});

test('杀进程重启（JSON 往返）后 revision 与库存保留，可继续合成', () => {
  const m = new CraftingModel();
  const { shapes } = m.toShapes([RECIPES.find((r) => r.id === 'recipe_0001')]);

  const afterHit = m.applyToSave(seed(0, { item_0001: 3 }), shapes[0]);
  const persisted = JSON.stringify(afterHit);
  const reloaded = JSON.parse(persisted);

  assert.equal(verifySave(reloaded), true, '重启后 checksum 仍有效');
  assert.equal(reloaded.revision, 1, '重启后 revision 保留');
  assert.equal(reloaded.modules.inventory.item_0001, 2, '重启后材料保留');
  assert.equal(reloaded.modules.inventory.item_0019, 2, '重启后产物保留');

  const m2 = new CraftingModel();
  const second = m2.applyToSave(reloaded, shapes[0]);
  assert.equal(second.revision, 2, '重启后第二笔合成 revision 递增');
  assert.equal(second.modules.inventory.item_0019, 4, '产物累加');
});

test('S-10.5 分组：可制作 / 材料不足，缺料文案按 inputs 顺序', () => {
  const m = new CraftingModel();
  const rows = RECIPES.filter((r) => ['recipe_0001', 'recipe_0002', 'recipe_0043'].includes(r.id));
  const { shapes } = m.toShapes(rows);

  // 给 recipe_0001 的材料（漂流木），缺 recipe_0002 的（原木）与 recipe_0043 的三种
  const plan = m.project(shapes, { item_0001: 2 }, ITEMS);

  assert.equal(plan.craftable.length, 1, '只有材料齐的配方进可制作');
  assert.equal(plan.craftable[0].id, 'recipe_0001');
  assert.equal(plan.craftable[0].outName, ITEMS.item_0019.name);
  assert.equal(plan.lacking.length, 2, '其余进材料不足');

  const r1 = plan.lacking.find((r) => r.id === 'recipe_0002');
  assert.deepEqual(r1.missing, [`缺 ${ITEMS.item_0002.name} ×1`], '缺料文案带真实名称');

  const r3 = plan.lacking.find((r) => r.id === 'recipe_0043');
  assert.equal(r3.missing.length, 3, '3 输入配方全缺时列出 3 条');
  assert.deepEqual(
    r3.missing.map((s) => s.split(' ')[1]),
    [ITEMS.item_0058.name, ITEMS.item_0031.name, ITEMS.item_0035.name],
    '缺料顺序必须与 inputs 顺序一致（禁排序）',
  );
});

test('S-10.3 invalid 输入串配方被剔除并计数，不进任何分组', () => {
  const m = new CraftingModel();
  const rows = [
    { id: 'ok', output: 'item_0019', output_count: 1, inputs: 'item_0001*1' },
    { id: 'bad_no_star', output: 'item_0019', output_count: 1, inputs: 'item_0001' },
    { id: 'bad_zero', output: 'item_0019', output_count: 1, inputs: 'item_0001*0' },
    { id: 'bad_float', output: 'item_0019', output_count: 1, inputs: 'item_0001*1.5' },
    { id: 'bad_mixed', output: 'item_0019', output_count: 1, inputs: 'item_0001*1;broken' },
  ];
  const { shapes, skippedInvalid } = m.toShapes(rows);
  assert.equal(skippedInvalid, 4, '4 条非法串必须被剔除');
  assert.deepEqual(shapes.map((s) => s.id), ['ok']);

  const plan = m.project(shapes, { item_0001: 1 }, ITEMS);
  assert.equal(plan.total, 1, '非法配方不参与分组');
  assert.equal(plan.craftable.length, 1);
});

test('产物 id 不在 items 表的配方被剔除并计数（不显示空名字）', () => {
  const m = new CraftingModel();
  const { shapes } = m.toShapes([
    { id: 'r_unknown_out', output: 'item_9999', output_count: 1, inputs: 'item_0001*1' },
    { id: 'r_ok', output: 'item_0019', output_count: 1, inputs: 'item_0001*1' },
  ]);
  const plan = m.project(shapes, { item_0001: 1 }, ITEMS);
  assert.equal(plan.skippedUnknown, 1);
  assert.deepEqual(plan.craftable.map((r) => r.id), ['r_ok']);
});

test('output_count 非法值兜底为 1（不显示 ×0 或 ×NaN）', () => {
  const m = new CraftingModel();
  const { shapes } = m.toShapes([
    { id: 'r0', output: 'item_0019', output_count: 0, inputs: 'item_0001*1' },
    { id: 'rN', output: 'item_0019', output_count: 3, inputs: 'item_0001*1' },
  ]);
  assert.equal(shapes[0].outCount, 1);
  assert.equal(shapes[1].outCount, 3);
});

test('真实 80 条配方全部可解析：skippedInvalid === 0（校正任务卡"21 条"的错误前提）', () => {
  const m = new CraftingModel();
  const { shapes, skippedInvalid } = m.toShapes(RECIPES);
  assert.equal(RECIPES.length, 80, 'recipes.json 行数');
  assert.equal(skippedInvalid, 0, '当前数据 0 条非法输入串');
  assert.equal(shapes.length, 80);

  const plan = m.project(shapes, {}, ITEMS);
  assert.equal(plan.skippedUnknown, 0, '产物与输入材料全在 items 表内');
  assert.equal(plan.craftable.length, 0, '空库存时无人可制作');
  assert.equal(plan.lacking.length, 80, '全部落入材料不足');
  assert.equal(plan.total, 80);
});

test('非法 section 兜底：不崩溃、全部材料不足', () => {
  const m = new CraftingModel();
  const { shapes } = m.toShapes([RECIPES.find((r) => r.id === 'recipe_0001')]);
  for (const bad of [undefined, null, [], 'item_0001', 42, true]) {
    const plan = m.project(shapes, bad, ITEMS);
    assert.equal(plan.craftable.length, 0, `section=${String(bad)} 不得误判为可制作`);
    assert.equal(plan.lacking.length, 1);
  }
});
