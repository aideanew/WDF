/**
 * 确定性测试（TASK-7031 · V-703.1）—— items.weight/capacity 代定（D-43=B）。
 *
 * 读 `server/generated/config/items.json`（npm run gen:config 产物，即运行时数据）。
 * D-43=B：物品重量按品类 原料1/工具3/设备10；容量仅容器>0（可调值，非设计源原值）。
 *
 * 覆盖六例：
 *  1. 全表 weight ∈ {1,3,10}（品类代定）
 *  2. 品类→weight 映射：raw/material/food/misc=1、tool/lock/chest=3、equipment/facility=10
 *  3. 容器（chest）capacity>0 且随品质递增（木<铜<铁）
 *  4. 非容器 capacity=0
 *  5. weight/capacity 均为非负整数
 *  6. 浮力自洽：真实容器 + 合理货重 → 浮力可为正（结构自检，非平衡断言）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const items = JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', 'items.json'), 'utf8'));

const W_CAT = { raw: 1, material: 1, food: 1, misc: 1, tool: 3, lock: 3, chest: 3, equipment: 10, facility: 10 };

test('items-w 1 全表 weight ∈ {1,3,10}', () => {
  for (const it of items) assert.ok([1, 3, 10].includes(it.weight), `${it.id} weight=${it.weight}`);
});

test('items-w 2 品类→weight 映射', () => {
  for (const it of items) assert.equal(it.weight, W_CAT[it.category], `${it.id}(${it.category}) weight=${it.weight}`);
});

test('items-w 3 容器 capacity>0 且递增', () => {
  const chests = items.filter((it) => it.category === 'chest');
  assert.equal(chests.length, 3, '应有 3 个容器');
  const caps = chests.map((it) => it.capacity).sort((a, b) => a - b);
  assert.ok(caps[0] > 0, '容器 capacity 应为正');
  assert.ok(caps[0] < caps[1] && caps[1] < caps[2], '容器容量应随品质递增');
});

test('items-w 4 非容器 capacity=0', () => {
  const nonChests = items.filter((it) => it.category !== 'chest');
  for (const it of nonChests) assert.equal(it.capacity, 0, `${it.id} 非容器 capacity 应为 0`);
});

test('items-w 5 weight/capacity 非负整数', () => {
  for (const it of items) {
    assert.ok(Number.isInteger(it.weight) && it.weight >= 0, `${it.id} weight`);
    assert.ok(Number.isInteger(it.capacity) && it.capacity >= 0, `${it.id} capacity`);
  }
});

test('items-w 6 浮力自洽：容器装载后可留正浮力', () => {
  // 结构自检：一个容量 60 的容器 + 若干重 1 的货 → 浮力为正（不依赖 raft_tiles）
  const hull = items.filter((it) => it.category === 'chest').map((it) => ({ capacity: it.capacity, weight: it.weight }));
  const maxCap = Math.max(...hull.map((h) => h.capacity));
  const totalW = hull.reduce((s, h) => s + h.weight, 0);
  // 货重 = 10 件重 1 的原料
  assert.ok(maxCap - (totalW + 10) > 0, '容器装载 10 件原料后应留正浮力（结构自检）');
});
