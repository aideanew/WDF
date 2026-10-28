/**
 * 确定性测试（TASK-7041 · V-704.1）—— 面板六态提示的纯映射规则。
 *
 * 在纯函数层验证 `uxHintPlan`（client/assets/scripts/app/ux-hint.ts，无 cc 依赖可直载）：
 * 依据 DESIGN-0001 §4：
 *  - `empty`：提示 + 下一步（若有 next），不可重试（§4.4 空态必须给下一步）；
 *  - `error`：可归因文案（texts 覆盖）+ 重试按钮（仅 view.retryable，§4.2）；
 *  - `noPermission`：提示 + 出口按钮（next 必带，§4.3），不可重试；
 *  - `loading`/`success`/`conflict`：返回 null（由调用方处理，§2 铁律）。
 *
 * 覆盖八例：
 *  1. empty 透传 next + 不可重试
 *  2. empty 无 next → 无按钮
 *  3. error 透传 retryable 与 next
 *  4. error 文案可归因覆盖（texts.error）
 *  5. noPermission 透传 next + 不可重试
 *  6. loading/success/conflict → null（调用方处理）
 *  7. 缺省兜底文案
 *  8. 六种 UxNext 出口都有按钮文案
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { uxHintPlan, UX_NEXT_LABEL } from '../../client/assets/scripts/app/ux-hint.ts';

test('ux 1 empty 透传 next + 不可重试', () => {
  const plan = uxHintPlan({ state: 'empty', retryable: false, next: 'login' });
  assert.ok(plan);
  assert.equal(plan.text, '暂无数据');
  assert.equal(plan.next, 'login');
  assert.equal(plan.retryable, false, 'empty 态不可重试');
});

test('ux 2 empty 无 next → 无按钮', () => {
  const plan = uxHintPlan({ state: 'empty', retryable: false });
  assert.ok(plan);
  assert.equal(plan.next, undefined);
});

test('ux 3 error 透传 retryable 与 next', () => {
  const retry = uxHintPlan({ state: 'error', retryable: true, next: 'retry' });
  assert.ok(retry);
  assert.equal(retry.retryable, true);
  assert.equal(retry.next, 'retry');
  const noRetry = uxHintPlan({ state: 'error', retryable: false, next: 'wait' });
  assert.ok(noRetry);
  assert.equal(noRetry.retryable, false);
  assert.equal(noRetry.next, 'wait');
});

test('ux 4 error 文案可归因覆盖（§4.2）', () => {
  const plan = uxHintPlan({ state: 'error', retryable: true, next: 'retry' }, { error: '网络开小差了' });
  assert.ok(plan);
  assert.equal(plan.text, '网络开小差了', 'error 态应使用调用方归因文案');
});

test('ux 5 noPermission 透传 next + 不可重试', () => {
  const plan = uxHintPlan({ state: 'noPermission', retryable: false, next: 'update' });
  assert.ok(plan);
  assert.equal(plan.next, 'update');
  assert.equal(plan.retryable, false, 'noPermission 不可重试（铁律 3）');
});

test('ux 6 loading/success/conflict → null（调用方处理）', () => {
  assert.equal(uxHintPlan({ state: 'loading', retryable: false }), null);
  assert.equal(uxHintPlan({ state: 'success', retryable: false }), null);
  assert.equal(uxHintPlan({ state: 'conflict', retryable: false }), null);
});

test('ux 7 缺省兜底文案', () => {
  assert.equal(uxHintPlan({ state: 'empty', retryable: false })?.text, '暂无数据');
  assert.equal(uxHintPlan({ state: 'error', retryable: false })?.text, '操作失败');
  assert.equal(uxHintPlan({ state: 'noPermission', retryable: false, next: 'login' })?.text, '无权进行此操作');
});

test('ux 8 六种 UxNext 出口都有按钮文案', () => {
  const expected = ['去登录', '去更新', '稍后再试', '联系客服', '明日再来', '重试'];
  const keys = Object.keys(UX_NEXT_LABEL);
  assert.deepEqual(keys, ['login', 'update', 'wait', 'contact', 'tomorrow', 'retry']);
  assert.deepEqual(keys.map((k) => UX_NEXT_LABEL[k]), expected);
});
