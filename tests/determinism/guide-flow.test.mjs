/**
 * 客户端引导用例回归（TASK-4004 补测）：GuideModel 的「读完成态 / 推进 / 落盘」闭环。
 *
 * GuideModel 不依赖 cc（只依赖 generated/game-core 的存档封印），Node 直载可测。
 * 本文件补 EVD-4004 §5 登记的缺口——当时只有代码走查，没有自动化断言。
 *
 * 覆盖：
 *  - readDone：null 存档 / 缺 guide 键 / done 非数组 / 数组混入非字符串 → 全部容错
 *  - hydrate：无完成 → 第 0 步；部分完成 → 首个未完成步；全完成 → isFinished 且无当前步
 *  - applyDone：追加 done + revision+1 + 封印可验 + 保留 saveId/configVersion
 *  - applyDone 零副作用：全部完成时返回**同一引用**
 *  - 入参不可变；JSON 往返后 hydrate 恢复（模拟杀进程重进，已完成步骤不再出现）
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const { GuideModel } = await import('../../client/assets/scripts/features/guide/model/GuideModel.ts');
const { SAVE_SCHEMA_VERSION, sealSave, verifySave } = await import('../../packages/game-core/src/save/index.ts');

const CV = '38fc1faf915f8bbf';
const STEPS = ['step_1', 'step_2', 'step_3', 'step_4', 'step_5'];

function freshSave(modules = {}) {
  return sealSave({
    schemaVersion: SAVE_SCHEMA_VERSION,
    configVersion: CV,
    saveId: 'guide-test',
    revision: 0,
    savedAt: 1_700_000_000_000,
    modules,
  });
}

test('readDone 容错：null / 缺键 / 非数组 / 混入非字符串', () => {
  assert.deepEqual(GuideModel.readDone(null), []);
  assert.deepEqual(GuideModel.readDone(freshSave({})), [], '缺 guide 键 → []');
  assert.deepEqual(GuideModel.readDone(freshSave({ guide: 'oops' })), [], 'guide 非对象 → []');
  assert.deepEqual(GuideModel.readDone(freshSave({ guide: { done: 'step_1' } })), [], 'done 非数组 → []');
  assert.deepEqual(
    GuideModel.readDone(freshSave({ guide: { done: ['step_1', 42, null, 'step_2'] } })),
    ['step_1', 'step_2'],
    '只保留字符串项',
  );
});

test('hydrate：无完成 → 第 0 步，未结束', () => {
  const m = new GuideModel();
  m.hydrate(STEPS, []);
  assert.equal(m.totalSteps, 5);
  assert.equal(m.currentStep, 0);
  assert.equal(m.currentStepId(), 'step_1');
  assert.equal(m.isFinished, false);
});

test('hydrate：已完成 2 步 → 当前指向第 3 步', () => {
  const m = new GuideModel();
  m.hydrate(STEPS, ['step_1', 'step_2']);
  assert.equal(m.currentStep, 2);
  assert.equal(m.currentStepId(), 'step_3');
});

test('hydrate：全部完成 → isFinished 且无当前步', () => {
  const m = new GuideModel();
  m.hydrate(STEPS, STEPS.slice());
  assert.equal(m.isFinished, true);
  assert.equal(m.currentStepId(), null);
});

test('applyDone：追加完成态 + revision+1 + 封印可验 + 保留身份字段', () => {
  const save = freshSave({});
  const m = new GuideModel();
  m.hydrate(STEPS, []);
  const next = m.applyDone(save);

  assert.deepEqual(next.modules.guide.done, ['step_1']);
  assert.equal(next.revision, 1);
  assert.equal(next.saveId, 'guide-test');
  assert.equal(next.configVersion, CV);
  assert.equal(verifySave(next), true, 'sealSave 产物必须通过 verify');
  assert.equal(m.currentStep, 1, '内存态同步推进');
});

test('applyDone：全部完成时返回同一引用（零副作用）', () => {
  const save = freshSave({ guide: { done: STEPS.slice() } });
  const m = new GuideModel();
  m.hydrate(STEPS, GuideModel.readDone(save));
  const out = m.applyDone(save);
  assert.equal(out, save, '无更多步骤必须原样返回同一引用');
});

test('applyDone 不改入参（不可变）', () => {
  const save = freshSave({ guide: { done: [] } });
  const before = JSON.stringify(save);
  const m = new GuideModel();
  m.hydrate(STEPS, []);
  m.applyDone(save);
  assert.equal(JSON.stringify(save), before, '原存档对象不得被修改');
});

test('JSON 往返后恢复：已完成的步骤不再出现（首启→重启闭环）', () => {
  const m1 = new GuideModel();
  m1.hydrate(STEPS, []);
  let save = freshSave({});
  for (let i = 0; i < 5; i += 1) {
    save = m1.applyDone(save);
  }
  assert.equal(m1.isFinished, true, '5 步走完');

  // 模拟杀进程重进：序列化 → 解析 → 重新 hydrate
  const reloaded = JSON.parse(JSON.stringify(save));
  assert.equal(verifySave(reloaded), true);
  const m2 = new GuideModel();
  m2.hydrate(STEPS, GuideModel.readDone(reloaded));
  assert.equal(m2.isFinished, true, '重进后引导不再出现');
  assert.equal(m2.currentStepId(), null);
});
