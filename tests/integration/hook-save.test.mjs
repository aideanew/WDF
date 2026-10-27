/**
 * 服务端集成测试（AT-2103）：出钩接线——命中 → 入包 → 本地存档 revision/checksum 闭环。
 *
 * HookModel 为不依赖 cc 的纯逻辑（仅依赖 generated/game-core 的确定性核心与存档封印），
 * Node 直载测「命中入包」全链路；"杀进程重启物品还在"用 JSON 往返模拟持久化重启。
 *
 * 覆盖：
 *  - 命中 → inventory[item_0001] +1、revision 递增、verifySave 通过
 *  - 脱钩 → 存档不动（revision/物品数不变）
 *  - 持久化往返（JSON 序列化→解析→verifySave→load 语义）后物品与 revision 保留
 *  - 存档损坏（改一位数值）→ verifySave 拒绝（checksum 有效性）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_VERSION, CLIENT_VERSION } from '../fixtures/version.mjs';

const { HookModel, HOOK_DEMO_ITEM_ID } = await import('../../client/assets/scripts/features/hook/model/HookModel.ts');
const { DEFAULT_HOOK_CONFIG } = await import('../../packages/game-core/src/hook/index.ts');
const { SAVE_SCHEMA_VERSION, sealSave, verifySave } = await import('../../packages/game-core/src/save/index.ts');

const CFG = DEFAULT_HOOK_CONFIG;

/** 用 HookModel 状态机真实走一钩（蓄力时长决定力度 → 确定性命中/脱钩）。 */
function throwOnce(holdMs, targetDist) {
  const m = new HookModel();
  m.beginCharge(1000);
  const outcome = m.release(1000 + holdMs, 15, targetDist, CFG);
  assert.ok(outcome, 'charging 状态下 release 必须产出 outcome');
  return { m, outcome };
}

test('AT-2103 命中 → 物品 +1、revision 递增、checksum 有效', () => {
  const seed = sealSave({
    schemaVersion: SAVE_SCHEMA_VERSION,
    configVersion: CONFIG_VERSION,
    saveId: 's_hook_save_test',
    revision: 0,
    savedAt: 1,
    modules: {},
  });
  assert.equal(seed.revision, 0);

  // 满力（hold 600ms = 峰值）+ 目标 600：reach = 1000*cos(15°) ≈ 966 > 600 → 必命中
  const { m, outcome } = throwOnce(600, 600);
  assert.equal(outcome.hit, true, '满力平抛必须命中 600 距离目标');

  const next = m.applyToSave(seed, outcome);
  assert.equal(next.revision, 1, 'revision 必须 +1');
  assert.equal(next.modules.inventory?.[HOOK_DEMO_ITEM_ID], 1, '漂流木必须 +1');
  assert.equal(verifySave(next), true, 'sealSave 产物必须通过 checksum 校验');
});

test('AT-2103 脱钩 → 存档原样（revision/物品不变）', () => {
  const seed = sealSave({
    schemaVersion: SAVE_SCHEMA_VERSION,
    configVersion: CONFIG_VERSION,
    saveId: 's_hook_save_test',
    revision: 3,
    savedAt: 1,
    modules: { inventory: { [HOOK_DEMO_ITEM_ID]: 5 } },
  });

  // 微力（hold 10ms）+ 目标 900：reach ≈ 1000*cos(15°)*0.008 ≈ 8 → 必脱钩
  const { m, outcome } = throwOnce(10, 900);
  assert.equal(outcome.hit, false, '微力必须脱钩');

  const next = m.applyToSave(seed, outcome);
  assert.equal(next, seed, '脱钩必须原样返回同一档（revision/物品都不动）');
});

test('AT-2103 杀进程重启（JSON 往返）后物品与 revision 保留', () => {
  const seed = sealSave({
    schemaVersion: SAVE_SCHEMA_VERSION,
    configVersion: CONFIG_VERSION,
    saveId: 's_hook_save_test',
    revision: 0,
    savedAt: 1,
    modules: {},
  });

  const { m, outcome } = throwOnce(600, 600);
  const afterHit = m.applyToSave(seed, outcome);

  // 模拟：写入 storage（JSON 字符串）→ "杀进程" → 重新 load（parse + verify）
  const persisted = JSON.stringify(afterHit);
  const reloaded = JSON.parse(persisted);
  assert.equal(verifySave(reloaded), true, '重启后 checksum 必须仍然有效');
  assert.equal(reloaded.revision, 1, '重启后 revision 保留');
  assert.equal(reloaded.modules.inventory[HOOK_DEMO_ITEM_ID], 1, '重启后物品还在');

  // 重启后第二钩命中 → revision 2、物品 2
  const { m: m2, outcome: o2 } = throwOnce(600, 600);
  const second = m2.applyToSave(reloaded, o2);
  assert.equal(second.revision, 2, '第二钩 revision 递增');
  assert.equal(second.modules.inventory[HOOK_DEMO_ITEM_ID], 2, '物品累加到 2');
  assert.equal(verifySave(second), true);
});

test('AT-2103 存档被篡改 → verifySave 拒绝（损坏走云端档的前置）', () => {
  const seed = sealSave({
    schemaVersion: SAVE_SCHEMA_VERSION,
    configVersion: CONFIG_VERSION,
    saveId: 's_hook_save_test',
    revision: 1,
    savedAt: 1,
    modules: { inventory: { [HOOK_DEMO_ITEM_ID]: 7 } },
  });
  const tampered = JSON.parse(JSON.stringify(seed));
  tampered.modules.inventory[HOOK_DEMO_ITEM_ID] = 999; // 改物品数不改 checksum
  assert.equal(verifySave(tampered), false, '篡改必须被 checksum 拒绝');
});
