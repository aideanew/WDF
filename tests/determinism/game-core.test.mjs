import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng, seedFrom } from '../../packages/game-core/src/common/rng.ts';
import { sealSave, verifySave } from '../../packages/game-core/src/save/schema.ts';
import { migrate } from '../../packages/game-core/src/save/migrations.ts';
import * as raft from '../../packages/game-core/src/raft/index.ts';
import * as chest from '../../packages/game-core/src/chest/index.ts';
import * as sea from '../../packages/game-core/src/sea/index.ts';
import * as defense from '../../packages/game-core/src/defense/index.ts';
import * as economy from '../../packages/game-core/src/economy/index.ts';

test('rng：同种子同序列（前后端一致的基础）', () => {
  const a = createRng(seedFrom('event-20261023:player-1')), b = createRng(seedFrom('event-20261023:player-1'));
  for (let i = 0; i < 1000; i++) assert.equal(a.next(), b.next());
  const c = createRng(42); const v = Array.from({ length: 5 }, () => c.int(1, 6));
  assert.deepEqual(v, Array.from({ length: 5 }, ((r) => () => r.int(1, 6))(createRng(42))));
});

test('存档：校验和能发现篡改；迁移拒绝比客户端新的版本', () => {
  const s = sealSave({ schemaVersion: 1, configVersion: 'x', saveId: 's', revision: 0, savedAt: 1, modules: { inventory: { a: 1 } } });
  assert.ok(verifySave(s));
  assert.ok(!verifySave({ ...s, modules: { inventory: { a: 999 } } }));
  assert.equal(migrate(s).status, 'ok');
  assert.equal(migrate({ ...s, schemaVersion: 99 }).status, 'too-new');
});

test('浮力：整船浮力 ≥ 总重量，不足时给出差额', () => {
  const hull = [{ capacity: 100, weight: 20 }, { capacity: 100, weight: 20 }];
  assert.equal(raft.remainingBuoyancy(hull, 50), 110);
  const r = raft.checkChange(hull, 50, 200);
  assert.equal(r.ok, false);
});

test('开锁期望：公式与边界', () => {
  assert.equal(chest.expectedAttempts(1, 4), 4);
  assert.ok(Math.abs(chest.expectedAttempts(0.5, 1) - 2) < 1e-9);
  assert.ok(Math.abs(chest.expectedAttempts(0.6, 4) - 16.79) < 0.01); // 立项评审第五点五节：p=0.6 约 17 根
});

test('潮汐：每 6 小时一波、持续 10 分钟', () => {
  const anchor = 0;
  assert.equal(sea.tideState(5 * 60_000, anchor).active, true);
  assert.equal(sea.tideState(11 * 60_000, anchor).active, false);
  assert.equal(sea.tideState(6 * 3_600_000 + 1, anchor).active, true);
});

test('塔防：反向 BFS 距离场；堵死入口能被检测', () => {
  const open = [[0, 0, 0], [0, 1, 0], [0, 0, 0]];
  assert.equal(defense.distanceField(open, 2, 2)[0][0], 4);
  const blocked = [[0, 1, 0], [1, 1, 0], [0, 0, 0]];
  assert.equal(defense.allEntrancesReachable(blocked, [2, 2], [[0, 0]]), false);
});

test('经济：回收价 = 原价 × 50%，地区 ±30% 截断', () => {
  assert.equal(economy.recyclePrice(1000), 500);
  assert.equal(economy.recyclePrice(1000, 3000), 650);
  assert.equal(economy.recyclePrice(1000, 9999), 650);
});
