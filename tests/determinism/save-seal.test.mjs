import test from 'node:test';
import assert from 'node:assert/strict';
import { sealSave, verifySave } from '../../packages/game-core/src/save/schema.ts';

/**
 * 本文件不覆盖 client/assets/scripts/services/save/LocalSave.ts 本体：
 * getPlatform() 是模块级单例且**无注入点**（client/assets/scripts/platform/index.ts），
 * Node 环境下也无法 import cc/env。故这里测的是**同一条规则的纯函数层**
 * （packages/game-core/src/save/schema.ts），不是客户端接线。
 * 要覆盖接线需先给 platform 增加测试注入点 —— 属业务代码变更，未获授权（TASK-3302 已知局限）。
 */

const body = {
  schemaVersion: 1,
  configVersion: 'b249f288e985da48',
  saveId: 'save-test-1',
  revision: 0,
  savedAt: 1_700_000_000_000,
  modules: { inventory: { item_0001: 3 } },
};

const roundtrip = (v) => JSON.parse(JSON.stringify(v));

test('封印 1：sealSave → JSON 往返（模拟落盘/读盘）→ verifySave 为 true', () => {
  const sealed = sealSave(body);
  assert.equal(typeof sealed.checksum, 'number');
  assert.equal(verifySave(roundtrip(sealed)), true);
});

test('封印 2（反例）：把已封印对象直接再 sealSave → verifySave 为 false（不剥离旧 checksum 必坏）', () => {
  const sealed = sealSave(body);
  const resealed = sealSave({ ...sealed });
  assert.notEqual(resealed.checksum, sealed.checksum, '把旧 checksum 混进校验体后，新值必然改变');
  assert.equal(verifySave(resealed), false, '不剥离旧 checksum 就重封 → 校验必失败');
});

test('封印 3（正解）：先解构剥离旧 checksum 再 sealSave → verifySave 为 true', () => {
  const sealed = sealSave(body);
  const { checksum: _stale, ...rest } = sealed;
  const resealed = sealSave(rest);
  assert.equal(verifySave(resealed), true);
  assert.equal(resealed.checksum, sealed.checksum, '同内容同校验和');
});

test('封印 4：改 modules 任一字段而不重封印 → verifySave 为 false（篡改必被发现）', () => {
  const sealed = sealSave(body);
  for (const patch of [
    { modules: { inventory: { item_0001: 999 } } },
    { modules: { inventory: { item_0001: 3 }, extra: 1 } },
    { revision: sealed.revision + 1 },
    { savedAt: sealed.savedAt + 1 },
    { saveId: 'someone-else' },
  ]) {
    assert.equal(verifySave({ ...sealed, ...patch }), false, `篡改 ${JSON.stringify(patch)} 应被检出`);
  }
  assert.equal(verifySave(sealSave({ ...body, revision: body.revision + 1 })), true, '重封印后应恢复合法');
});

test('封印 5：checksum 为非整数（字符串/浮点/缺失）→ verifySave 为 false 且不抛异常', () => {
  const sealed = sealSave(body);
  for (const bad of ['123', 'abc', 1.5, null, undefined, [], {}, true, -1]) {
    let result;
    assert.doesNotThrow(() => {
      result = verifySave({ ...sealed, checksum: bad });
    }, `checksum=${JSON.stringify(bad)}`);
    assert.equal(result, false, `checksum=${JSON.stringify(bad)} 应判为损坏`);
  }
});

test('封印 6：负数 checksum 仍判 false，且合法整数 checksum 才通过', () => {
  const sealed = sealSave(body);
  assert.equal(verifySave({ ...sealed, checksum: -1 }), false);
  assert.equal(verifySave({ ...sealed, checksum: sealed.checksum }), true);
});
