import test from 'node:test';
import assert from 'node:assert/strict';
import {
  powerAt,
  cast,
  resolveHit,
  pullBack,
  chargeAndCast,
  DEFAULT_HOOK_CONFIG,
} from '../../packages/game-core/src/hook/index.ts';

const C = DEFAULT_HOOK_CONFIG;

test('确定性：同输入同输出（深度相等）', () => {
  const a = chargeAndCast(5000, 30, 400, C);
  const b = chargeAndCast(5000, 30, 400, C);
  assert.deepEqual(a, b);
  assert.equal(powerAt(333, C), powerAt(333, C));
  assert.deepEqual(cast(7000, 20, C), cast(7000, 20, C));
});

test('powerAt：三角波往返，0 起点 / 600 峰值 / 1200 回起点 / 1800 再峰值', () => {
  assert.equal(powerAt(0, C), 0);
  assert.equal(powerAt(600, C), 10000);
  assert.equal(powerAt(1200, C), 0);
  assert.equal(powerAt(1800, C), 10000);
  assert.ok(powerAt(300, C) > powerAt(0, C));
  assert.ok(powerAt(600, C) > powerAt(300, C));
  // 超过 cycleMs 不无限增长：任意 holdMs 都落在 [min,max]
  for (const h of [2400, 5000, 9999]) {
    const v = powerAt(h, C);
    assert.ok(v >= C.minPowerBp - 1e-9 && v <= C.maxPowerBp + 1e-9);
  }
});

test('cast 几何：reach 随力度与角度确定', () => {
  assert.equal(cast(10000, 0, C).reach, C.maxReach);
  assert.ok(Math.abs(cast(5000, 0, C).reach - C.maxReach / 2) < 1e-9);
  assert.ok(Math.abs(cast(10000, 90, C).reach) < 1e-9, '竖直 90° 触及距离应≈0');
});

test('resolveHit：穿过判定区命中，偏离 > hitRadius 为 null', () => {
  const path = cast(10000, 0, C); // reach = maxReach = 1000
  const hit = resolveHit(path, [{ id: 'a', x: 500, y: 0, size: 0 }], C);
  assert.ok(hit && hit.hitIndex === 0);
  const miss = resolveHit(path, [{ id: 'b', x: 500, y: C.hitRadius + 100, size: 0 }], C);
  assert.equal(miss, null);
});

test('pullBack：承重不足返回 err(3101)，足够返回 ok', () => {
  assert.equal(pullBack(10, 'thin', C).ok, true);
  const r = pullBack(999, 'thin', C);
  assert.equal(r.ok, false);
  assert.equal(r.code, 3101);
  assert.equal(pullBack(500, 'steel', C).ok, true);
});

test('chargeAndCast：边界 powerBp=0/10000 与命中半径单调不减', () => {
  assert.equal(chargeAndCast(0, 0, 0, C).reach, 0);
  assert.equal(chargeAndCast(10000, 0, C.maxReach, C).hit, true);

  // 半径单调：扫 powerBp，命中计数随 hitRadius 不减
  const targetDist = 500;
  const radii = [20, 60, 120, 240];
  const counts = radii.map((R) => {
    const cfg = { ...C, hitRadius: R };
    let c = 0;
    for (let bp = 0; bp <= 10000; bp += 100) if (chargeAndCast(bp, 0, targetDist, cfg).hit) c++;
    return c;
  });
  for (let i = 1; i < counts.length; i++) {
    assert.ok(counts[i] >= counts[i - 1], `半径增大命中数应单调不减：R=${radii[i]} count=${counts[i]} < ${counts[i - 1]}`);
  }
});
