import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOCK_HITS,
  createSession,
  attempt,
  isHit,
} from '../../packages/game-core/src/chest/index.ts';

test('开锁状态机：连中达标开锁；失误重置连续但不减已中数', () => {
  assert.equal(LOCK_HITS.silver, 3);
  let s = createSession('silver', 10);
  let r;
  for (let i = 0; i < 3; i++) {
    r = attempt(s, true);
    s = r.session;
  }
  assert.equal(s.consecutiveHits, 3);
  assert.equal(s.totalHits, 3);
  assert.equal(s.unlocked, true);

  // 第 4 次失误：连续归零，但"已中数"仍 3、已开锁不回退
  r = attempt(s, false);
  s = r.session;
  assert.equal(s.consecutiveHits, 0);
  assert.equal(s.totalHits, 3, '已中数仍 3');
  assert.equal(s.unlocked, true);
});

test('开锁状态机：工具耗尽终止（用一次断一根）', () => {
  let s = createSession('iron', 2); // iron 需 1 连中
  let r = attempt(s, true); // 第 1 次命中 → 开锁，工具剩 1
  s = r.session;
  assert.equal(s.unlocked, true);
  assert.equal(s.toolsLeft, 1);
  assert.equal(r.terminated, false);

  r = attempt(s, false); // 第 2 次：工具 0 → 终止
  s = r.session;
  assert.equal(s.toolsLeft, 0);
  assert.equal(r.terminated, true);
});

test('isHit：指针落在命中区内（半开区间）', () => {
  assert.equal(isHit(5000, 4000, 2000), true); // 4000..6000
  assert.equal(isHit(3999, 4000, 2000), false);
  assert.equal(isHit(6000, 4000, 2000), false);
});

test('确定性：同输入同输出（attempt 不修改入参）', () => {
  const s = createSession('gold', 5);
  const a = attempt(s, true);
  const b = attempt(s, true);
  assert.deepEqual(a, b);
  assert.deepEqual(s, createSession('gold', 5), '入参未被修改');
});
