import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listRows, MODULE_ID } from '../../packages/game-core/src/inventory/index.ts';

// 用真实物品表驱动：items 106 行（EXEC-BRIEF BASE-03）。
const ITEMS = Object.fromEntries(
  JSON.parse(readFileSync('client/assets/resources/config/items.json', 'utf8')).map((r) => [r.id, r]),
);

test('inventory：MODULE_ID 保留（守卫 catalogConsistency 依赖模块目录导出）', () => {
  assert.equal(MODULE_ID, 'inventory');
});

test('listRows：3 个已知 + 1 个未知 id → known 3 行，unknownIds 保留原顺序', () => {
  const res = listRows(
    { item_0001: 3, item_0002: 1, item_0099: 2, bad_id: 5 },
    ITEMS,
  );
  assert.equal(res.known.length, 3);
  assert.deepEqual(res.unknownIds, ['bad_id']);
  for (const row of res.known) {
    assert.equal(row.name, ITEMS[row.id].name);
    assert.equal(row.basePrice, ITEMS[row.id].base_price);
    assert.equal(row.category, ITEMS[row.id].category);
  }
});

test('listRows：各种非法 section 一律返回空结果，不抛异常', () => {
  for (const bad of [undefined, null, [], 'item_0001', 42, true, false, {}, 0, NaN]) {
    assert.deepEqual(listRows(bad, ITEMS), { known: [], unknownIds: [] }, `section=${String(bad)}`);
  }
});

test('listRows：数量 ≤0 或非整数不出现在 known', () => {
  const res = listRows(
    { item_0001: 0, item_0002: -1, item_0003: 1.5, item_0004: 2, item_0005: '3' },
    ITEMS,
  );
  assert.deepEqual(res.known.map((r) => r.id), ['item_0004']);
  assert.equal(res.known[0].count, 2);
});

test('listRows：基准价降序，同价按 id 升序（确定性排序）', () => {
  const res = listRows(
    { item_0099: 1, item_0001: 1, item_0019: 1 },
    ITEMS,
  );
  const prices = res.known.map((r) => r.basePrice);
  assert.deepEqual(prices, [...prices].sort((a, b) => b - a), '价格必须降序');
  const same = {};
  for (const row of res.known) (same[row.basePrice] ??= []).push(row.id);
  for (const ids of Object.values(same)) assert.deepEqual(ids, [...ids].sort());
});

test('listRows：两次调用结果深比较相等（确定性，不依赖对象键顺序）', () => {
  const section = { item_0001: 3, item_0002: 1, item_0019: 2, item_0099: 1 };
  assert.deepEqual(listRows(section, ITEMS), listRows({ ...section }, ITEMS));
});

test('listRows：不改入参', () => {
  const section = { item_0001: 3, item_0002: 1 };
  const before = { ...section };
  listRows(section, ITEMS);
  assert.deepEqual(section, before);
});

test('listRows：真实存档段（HookModel 写入的扁平结构）能全部解析', () => {
  // modules.inventory 是扁平 id→数量 map，没有嵌套的 items 一层（EXEC-BRIEF BASE-19）
  const res = listRows({ item_0001: 5, item_0002: 2, item_0019: 1 }, ITEMS);
  assert.deepEqual(res.unknownIds, []);
  assert.equal(res.known.length, 3);
  assert.equal(res.known.reduce((s, r) => s + r.count, 0), 8);
});
