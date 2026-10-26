/**
 * 契约测试（E-07）：遍历 ACTIONS，断言每个动作要么有 payload schema，要么显式豁免。
 * 防止"新增动作忘了补入参校验"——zod 与 TS 类型漂移时，这条测试第一个红。
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const { ACTIONS } = await import('@wodefa/contracts');
const { PAYLOAD_SCHEMAS, EXEMPT, checkPayload } = await import('../../server/src/gateway/payload.ts');

test('E-07 每个动作都有 payload schema 或显式豁免', () => {
  const names = Object.keys(ACTIONS);
  assert.ok(names.length >= 20, 'ACTIONS 应至少登记 20 个动作');
  for (const a of names) {
    const hasSchema = a in PAYLOAD_SCHEMAS;
    const isExempt = a in EXEMPT;
    assert.ok(hasSchema || isExempt, `动作 ${a} 既无 schema 也未被豁免`);
  }
});

test('E-07 已知 schema 能正确放行/拒绝', () => {
  // 放行
  assert.equal(checkPayload('economy.buyQuota', { itemId: 'item_x', count: 2 }).ok, true);
  assert.equal(checkPayload('account.bindConfirm', { ticket: 't1' }).ok, true);
  assert.equal(checkPayload('save.resolveFork', { keep: 'local' }).ok, true);
  // 拒绝
  assert.equal(checkPayload('economy.buyQuota', { itemId: '', count: 2 }).ok, false, '空 itemId 应被拒');
  assert.equal(checkPayload('economy.buyQuota', { itemId: 'x', count: 0 }).ok, false, 'count<1 应被拒');
  assert.equal(checkPayload('save.resolveFork', { keep: 'middle' }).ok, false, '非法 keep 应被拒');
  assert.equal(checkPayload('leaderboard.query', { scope: 'galaxy', limit: 10 }).ok, false, '非法 scope 应被拒');
});
