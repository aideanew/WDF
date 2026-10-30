/**
 * 确定性测试（TASK-7031 · V-703.1）—— items.weight/capacity 代定（D-43=B）。
 *
 * 读 `server/generated/config/items.json`（npm run gen:config 产物，即运行时数据）。
 * D-43=B：物品重量按品类 原料1/工具3/设备10。
 * D-54 Q2=A（2026-10-28）：`items.capacity` 一律归 0——容量语义已搬到 `raft_tiles.capacity`，
 * 本列保留列位（PD8-18 对齐测试口径）。浮力自洽已由 `raft-tiles.test.mjs` 的 `raft-t 5` 覆盖。
 *
 * 覆盖五例（PD8-18 后；原六例删去 items-w 6 浮力自洽）：
 *  1. 全表 weight ∈ {1,3,10}（品类代定）
 *  2. 品类→weight 映射：raw/material/food/misc=1、tool/lock/chest=3、equipment/facility=10
 *  3. `items.capacity` 按 D-54 一律归 0（容量语义在 `raft_tiles`）
 *  4. 非容器 capacity=0
 *  5. weight/capacity 均为非负整数
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

test('items-w 3 items.capacity 按 D-54 一律归 0（容量语义在 raft_tiles）', () => {
  // D-54 Q2=A：浮力只看 raft_tiles.capacity；items.capacity 一律归 0，列位保留。
  // 若有人把某个 capacity 改成非 0，这条必须变红（现状断言，非"永真"）。
  assert.ok(items.every((it) => it.capacity === 0), 'items.capacity 应全为 0（D-54 归 0）');
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

