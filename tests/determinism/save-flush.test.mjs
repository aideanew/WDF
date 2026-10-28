/**
 * 确定性测试（TASK-7042 · V-704.2）—— 切后台尽力保存（save.flush）规则。
 *
 * LocalSave 本体因 `getPlatform()`（client/assets/scripts/platform/index.ts）静态 import `cc/env`，
 * Node 下不可直载（save-seal.test.mjs 已记录此限制）。本文件在**纯函数层**验证 flush 依赖的
 * 不变式：把最近一次写入的存档剥离旧 checksum、以新 savedAt 重新 seal，结果必须
 * ① verifySave 通过 ② schemaVersion 保持 ③ savedAt 刷新（≥ 原值）——这正是 LocalSave.flush()
 * 的核心语义（client/assets/scripts/services/save/LocalSave.ts `flush()`）。
 *
 * 覆盖五例：
 *  1. seal→flush 重封印 → verifySave 为 true（剥离旧 checksum 后重 seal 有效）
 *  2. 重封印保留 schemaVersion（1）
 *  3. 重封印刷新 savedAt（≥ 原 savedAt）
 *  4. 重封印后 revision/saveId/configVersion 不变（内容不丢）
 *  5. 反例：不剥离旧 checksum 直接 seal → verifySave 为 false（证明剥离是必要前提，非可省）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sealSave, verifySave, SAVE_SCHEMA_VERSION } from '../../packages/game-core/src/save/schema.ts';

const CONFIG = '20a313a478737571';

test('flush 1 剥离旧 checksum 重封印 → verifySave 通过', () => {
  const first = sealSave({ schemaVersion: SAVE_SCHEMA_VERSION, configVersion: CONFIG, saveId: 's1', revision: 3, savedAt: 1000, modules: {} });
  const { checksum: _stale, ...body } = first;
  const flushed = sealSave({ ...body, savedAt: 2000, schemaVersion: SAVE_SCHEMA_VERSION });
  assert.equal(verifySave(flushed), true, '重封印后应通过 verifySave');
});

test('flush 2 重封印保留 schemaVersion', () => {
  const first = sealSave({ schemaVersion: SAVE_SCHEMA_VERSION, configVersion: CONFIG, saveId: 's1', revision: 3, savedAt: 1000, modules: {} });
  const { checksum: _stale, ...body } = first;
  const flushed = sealSave({ ...body, savedAt: 2000, schemaVersion: SAVE_SCHEMA_VERSION });
  assert.equal(flushed.schemaVersion, SAVE_SCHEMA_VERSION);
});

test('flush 3 重封印刷新 savedAt（≥ 原值）', () => {
  const first = sealSave({ schemaVersion: SAVE_SCHEMA_VERSION, configVersion: CONFIG, saveId: 's1', revision: 3, savedAt: 1000, modules: {} });
  const { checksum: _stale, ...body } = first;
  const flushed = sealSave({ ...body, savedAt: 2000, schemaVersion: SAVE_SCHEMA_VERSION });
  assert.ok(flushed.savedAt >= first.savedAt, 'flush 后 savedAt 应 ≥ 原值');
});

test('flush 4 重封印内容不丢（revision/saveId/configVersion 不变）', () => {
  const first = sealSave({ schemaVersion: SAVE_SCHEMA_VERSION, configVersion: CONFIG, saveId: 's1', revision: 7, savedAt: 1000, modules: {} });
  const { checksum: _stale, ...body } = first;
  const flushed = sealSave({ ...body, savedAt: 2000, schemaVersion: SAVE_SCHEMA_VERSION });
  assert.equal(flushed.revision, 7);
  assert.equal(flushed.saveId, 's1');
  assert.equal(flushed.configVersion, CONFIG);
});

test('flush 5 反例：不剥离旧 checksum 直接 seal → verifySave 为 false（剥离是必要前提）', () => {
  const first = sealSave({ schemaVersion: SAVE_SCHEMA_VERSION, configVersion: CONFIG, saveId: 's1', revision: 3, savedAt: 1000, modules: {} });
  const bad = sealSave({ ...first, savedAt: 2000 });
  assert.equal(verifySave(bad), false, '不剥离旧 checksum 直接重 seal 应失败（证明剥离必要）');
});
