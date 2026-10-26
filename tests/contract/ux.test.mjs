/**
 * 契约测试（TASK-3001）：UX 态映射。
 *
 * 唯一依据 `docs/03_solution/design/DESIGN-0001-ux-states.md` §2。
 * 这里把期望值**硬编码**一份，是为了让"改了映射表却没改文档"或反过来的漂移当场变红。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UX_BY_ERROR_NAME,
  toUxState,
  conflictOf,
} from '../../packages/contracts/src/common/ux.ts';
import { ERR } from '../../packages/contracts/src/common/errors.ts';

/** DESIGN-0001 §2 的逐行期望（码名 → 态/可重试/出口） */
const EXPECTED = {
  BAD_PAYLOAD: { state: 'error', retryable: false },
  UNKNOWN_ACTION: { state: 'error', retryable: false },
  NOT_LOGGED_IN: { state: 'noPermission', retryable: false, next: 'login' },
  SESSION_EXPIRED: { state: 'noPermission', retryable: false, next: 'login' },
  BANNED: { state: 'noPermission', retryable: false, next: 'contact' },
  MINOR_TIME_LIMIT: { state: 'noPermission', retryable: false, next: 'wait' },
  DUPLICATE_REQUEST: { state: 'success', retryable: false },
  QUOTA_EXHAUSTED: { state: 'empty', retryable: false, next: 'tomorrow' },
  EVENT_CLOSED: { state: 'noPermission', retryable: false, next: 'wait' },
  EVENT_ALREADY_PLAYED: { state: 'success', retryable: false },
  RATE_LIMITED: { state: 'error', retryable: true, next: 'retry' },
  INTERNAL: { state: 'error', retryable: true, next: 'retry' },
  REVIEW_PENDING: { state: 'error', retryable: false, next: 'wait' },
  CLIENT_TOO_OLD: { state: 'noPermission', retryable: false, next: 'update' },
};

test('14 个错误码全覆盖，且逐行与 DESIGN-0001 §2 一致', () => {
  const codeNames = Object.keys(ERR).sort();
  assert.equal(codeNames.length, 14, 'ERR 码数量应为 14（合同冻结）');
  assert.deepEqual(Object.keys(UX_BY_ERROR_NAME).sort(), codeNames, '每个码都必须有映射');
  for (const name of codeNames) {
    const expected = EXPECTED[name];
    assert.ok(expected, `新增了错误码 ${name} 但没更新 DESIGN-0001 §2 与本测试`);
    assert.deepEqual(
      UX_BY_ERROR_NAME[name],
      expected,
      `${name} 的映射与文档不一致`,
    );
  }
});

test('code===0 → success，不携带出口', () => {
  const v = toUxState(0);
  assert.equal(v.state, 'success');
  assert.equal(v.retryable, false);
  assert.equal(v.next, undefined);
});

test('幂等回放 3001 是 success（绝不可当冲突/错误）', () => {
  const v = toUxState(ERR.DUPLICATE_REQUEST);
  assert.equal(v.code, 3001);
  assert.equal(v.state, 'success');
  assert.notEqual(v.state, 'conflict');
});

test('三类典型态：售罄=empty、封禁=noPermission、超频=可重试', () => {
  assert.equal(toUxState(ERR.QUOTA_EXHAUSTED).state, 'empty');
  const banned = toUxState(ERR.BANNED);
  assert.equal(banned.state, 'noPermission');
  assert.equal(banned.next, 'contact');
  const limited = toUxState(ERR.RATE_LIMITED);
  assert.equal(limited.state, 'error');
  assert.equal(limited.retryable, true);
});

test('noPermission 一律不可重试，且必须给出下一步出口', () => {
  for (const name of Object.keys(ERR)) {
    const v = toUxState(ERR[name]);
    if (v.state !== 'noPermission') continue;
    assert.equal(v.retryable, false, `${name} 是 noPermission 却标了可重试`);
    assert.ok(v.next, `${name} 是 noPermission 却没给出口（login/update/wait/contact）`);
  }
});

test('未知错误码 → error 可重试，绝不静默当成功', () => {
  const v = toUxState(7777);
  assert.equal(v.state, 'error');
  assert.equal(v.retryable, true);
  assert.equal(v.next, 'retry');
});

test('只有 accepted:false 算冲突，accepted:true 不算', () => {
  assert.equal(conflictOf({ accepted: true, revision: 3 }), false);
  assert.equal(
    conflictOf({ accepted: false, conflict: { revision: 2, savedAt: 1, schemaVersion: 1, level: 1 } }),
    true,
  );
});
