/**
 * sellValue 纯函数测试（TASK-406.2，≥6 用例，含三档区域边界）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

// ——————————————————————————————————————————————————————————
// F-40：设定硬约束（2026-10-27 补，此前注释承诺但代码零实现）
//
// 设定原文（材料与工具总表.md:182 / 我的筏-深度设计方案-v5.5.md:1140）：
//   「原价 = 商人卖价；回收价 = 商人收购价 = 原价 × 50%。
//     各地商人在此基础上 ±30% 浮动。」
//
// 旧 sellValue 两个守卫都没有：region_bp 填 20000 就是 +100%，recycle_bp 填超原价就能
// 买低卖高无限刷灵草。现在与同文件 recyclePrice() 的 ±30% 钳制保持同口径。
// ——————————————————————————————————————————————————————————

test('F-40 ①：区域系数钳在 +30%（填 20000 不得突破）', () => {
  // 设定上限 = 原价 50% × 1.3 = 原价 65%
  assert.equal(sellValue(10, 5, 13000), 6);      // 合法上限：floor(6.5)
  assert.equal(sellValue(10, 5, 20000), 6, '+100% 必须被钳回 +30%');
  assert.equal(sellValue(10, 5, 999999), 6, '离谱值同样钳回 +30%');
  // 与 recyclePrice 同口径（它一直这么做）
  assert.equal(sellValue(10, 5, 20000), recyclePrice(10, 10000));
});

test('F-40 ①：区域系数钳在 -30%（填 1 不得低于 -30%）', () => {
  assert.equal(sellValue(10, 5, 7000), 3);   // 合法下限：floor(3.5)
  assert.equal(sellValue(10, 5, 1), 3, '0.01% 必须被钳回 -30%');
  assert.equal(sellValue(10, 5, 1), recyclePrice(10, -3000));
});

test('F-40 ②：回收价不得超过原价（填错 recycle_bp 不得买低卖高）', () => {
  // recycle_bp 本应 = 原价的 50%；填成 12（> 原价 10）是错的
  assert.equal(sellValue(10, 12, 13000), 10, '必须截到原价 10，不能算出 15');
  assert.equal(sellValue(10, 12, 10000), 10);
  assert.equal(sellValue(10, 9, 13000), 10, 'floor(11.7)=11 也要截到 10');
  // 边界：恰好等于原价时不截
  assert.equal(sellValue(10, 10, 10000), 10);
  // 正常数据（50%）完全不受影响
  assert.equal(sellValue(10, 5, 13000), 6);
});

test('F-40 ③：原价 0 = 不可回收（设定：海水 原价 0 / 不收）', () => {
  assert.equal(sellValue(0, 5, 10000), 0, '原价 0 不得卖出任何灵草');
  assert.equal(sellValue(-5, 5, 10000), 0, '负原价同样 0');
});

test('F-40 ④：区域系数 0 = 未配置/不收，不得被钳成 -30% 照付', () => {
  // 既有契约；本次加钳制时差点破坏它（0 → 7000 → 卖 3）
  assert.equal(sellValue(10, 5, 0), 0);
});

test('F-40 ⑤：真实 106 行价格表——加守卫后行为零变化', () => {
  const prices = JSON.parse(
    readFileSync('server/generated/config/prices.json', 'utf8'),
  );
  assert.equal(prices.length, 106, 'prices.json 行数');

  const MERCHANTS = { village: 10000, wander: 8500, black: 13000 };
  let checked = 0;
  for (const r of prices) {
    if (typeof r.recycle_bp !== 'number' || r.recycle_bp <= 0) continue;
    for (const [name, regionBp] of Object.entries(MERCHANTS)) {
      const v = sellValue(r.base_price, r.recycle_bp, regionBp);
      // 守卫后必须同时满足：不超过原价、不超过"50%×1.3"
      assert.ok(v <= r.base_price, `${r.id}@${name}: 卖价 ${v} 不得超过原价 ${r.base_price}`);
      const ceil = Math.floor((r.base_price * 0.5 * (regionBp === 13000 ? 1.3 : 1)) + 1);
      assert.ok(v <= ceil, `${r.id}@${name}: 卖价 ${v} 不得超过 50%×浮动上限 ${ceil}`);
      // 加守卫前后必须完全一致（现有数据本来就不越界）
      const legacy = Math.floor((r.recycle_bp * regionBp) / 10000);
      assert.equal(v, legacy, `${r.id}@${name}: 守卫不得改变正常数据的结果（${v} vs ${legacy}）`);
      checked += 1;
    }
  }
  assert.equal(checked, 105 * 3, '105 行可回收 × 3 档商人');
});
