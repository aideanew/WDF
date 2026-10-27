/**
 * sellValue 纯函数测试（TASK-406.2，≥6 用例，含三档区域边界）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sellValue, recyclePrice } from '../../packages/game-core/src/economy/index.ts';

test('渔村 region_bp=10000：sellValue = recycle_bp（等价 50% 原价）', () => {
  // item_0001: base=10, recycle_bp=5
  assert.equal(sellValue(10, 5, 10000), 5);
  // item_0033: base=24000, recycle_bp=12000
  assert.equal(sellValue(24000, 12000, 10000), 12000);
});

test('流浪 region_bp=8500：sellValue = floor(recycle_bp × 0.85)', () => {
  assert.equal(sellValue(10, 5, 8500), 4);     // floor(4.25) = 4
  assert.equal(sellValue(20, 10, 8500), 8);    // floor(8.5) = 8
  assert.equal(sellValue(24000, 12000, 8500), 10200); // floor(10200) = 10200
});

test('黑市 region_bp=13000：sellValue = floor(recycle_bp × 1.3)', () => {
  assert.equal(sellValue(10, 5, 13000), 6);    // floor(6.5) = 6
  assert.equal(sellValue(20, 10, 13000), 13);  // floor(13) = 13
  assert.equal(sellValue(24000, 12000, 13000), 15600); // floor(15600) = 15600
});

test('与既有 recyclePrice 等价（bp = regionBp - 10000）', () => {
  // village: bp=0, regionBp=10000
  assert.equal(sellValue(10, 5, 10000), recyclePrice(10, 0));
  // wander: bp=-1500, regionBp=8500
  assert.equal(sellValue(10, 5, 8500), recyclePrice(10, -1500));
  // black: bp=3000, regionBp=13000
  assert.equal(sellValue(10, 5, 13000), recyclePrice(10, 3000));
});

test('负数/0 防御：返回 0', () => {
  assert.equal(sellValue(10, -5, 10000), 0);
  assert.equal(sellValue(10, 5, -100), 0);
  assert.equal(sellValue(10, 0, 10000), 0);
  assert.equal(sellValue(10, 5, 0), 0);
});

test('非有限数防御：返回 0', () => {
  assert.equal(sellValue(10, NaN, 10000), 0);
  assert.equal(sellValue(10, 5, Infinity), 0);
  assert.equal(sellValue(10, Infinity, 10000), 0);
});

test('向下取整验证', () => {
  // 5 × 8500 / 10000 = 4.25 → 4
  assert.equal(sellValue(10, 5, 8500), 4);
  // 5 × 13000 / 10000 = 6.5 → 6
  assert.equal(sellValue(10, 5, 13000), 6);
  // 15 × 8500 / 10000 = 12.75 → 12
  assert.equal(sellValue(30, 15, 8500), 12);
});
