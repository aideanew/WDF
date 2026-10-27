/**
 * 契约测试（AT-2401）：handler 覆盖补强。
 *
 * 反"全占位也全绿"（问题 C10）：
 *  1. 已实现动作：静态断言其动作名在集成测试源码中至少出现一次（防新增动作不写测试）；
 *  2. 未实现动作：带合法令牌 + 合法入参实调 → 必须返回 4999（不得伪装成功/业务失败）。
 *
 * 遍历 ACTIONS 全表 —— 新增动作后若既没实现也没测试，本文件直接红。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { CONFIG_VERSION, CLIENT_VERSION } from '../fixtures/version.mjs';

process.env.WDF_DB_DIR = ':memory:';
process.env.WDF_AUTH_MODE = 'dev';
process.env.WDF_TOKEN_SECRET = 'test-secret-用于handler契约测试';

const { initDb, closeDb } = await import('../../server/src/core/db.ts');
const { handleRpc } = await import('../../server/src/gateway/rpc.ts');

await initDb();
test.after(async () => { await closeDb(); });

const CV = CLIENT_VERSION;
const CFG = CONFIG_VERSION;
let seq = 0;
const rid = (tag) => `hc-${tag}-${(seq += 1)}`;

function call(a, p = {}, opts = {}) {
  const m = { rid: opts.rid ?? rid('m'), cv: CV, cfg: CFG, sv: 1, plat: opts.plat ?? 'wechat' };
  const ctx = opts.token ? { token: opts.token } : {};
  return handleRpc({ a, p, m }, ctx);
}

const read = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');

/** 从 actions.ts 提取动作名与 auth/idempotent 配置。 */
function parseActions() {
  const src = read('packages/contracts/src/common/actions.ts');
  const out = {};
  for (const m of src.matchAll(/'([a-z]+\.[A-Za-z]+)':\s*\{[^}]*auth:\s*(true|false)[^}]*\}/g)) {
    out[m[1]] = { auth: m[2] === 'true' };
  }
  return out;
}

/** 从 gateway/handlers.ts 提取"仍为 todo 的动作"。 */
function parseTodos() {
  const src = read('server/src/gateway/handlers.ts');
  const out = new Set();
  for (const m of src.matchAll(/'([a-z]+\.[A-Za-z]+)':\s*todo/g)) out.add(m[1]);
  return out;
}

const ACTIONS = parseActions();
const TODOS = parseTodos();
const IMPLEMENTED = Object.keys(ACTIONS).filter((a) => !TODOS.has(a));

test('AT-2401 ACTIONS 全表可解析（22 动作，TASK-4009 增 chest.open）', () => {
  assert.equal(Object.keys(ACTIONS).length, 22, `ACTIONS 应为 22 个，实得 ${Object.keys(ACTIONS).length}`);
});

test('AT-2401 已实现动作都有集成测试覆盖（静态检查）', () => {
  const dir = new URL('../../tests/integration/', import.meta.url);
  const sources = readdirSync(dir)
    .filter((f) => f.endsWith('.test.mjs'))
    .map((f) => readFileSync(new URL('../../tests/integration/' + f, import.meta.url), 'utf8'))
    .join('\n');
  const missing = IMPLEMENTED.filter((a) => !sources.includes(`'${a}'`));
  assert.deepEqual(missing, [], `以下已实现动作在 tests/integration 无任何覆盖：${missing.join(', ')}`);
});

// —— 未实现动作逐个实调，断言 4999 ——

async function login() {
  const res = await call('account.login', { code: `hc-${Date.now()}-${(seq += 1)}`, plat: 'wechat' });
  assert.equal(res.c, 0);
  return res.d.token;
}

const TODO_PAYLOADS = {
  'salvage.claimInfo': { tier: 'normal' },
  'economy.buyQuota': { itemId: 'item_hook', count: 1 },
  'event.start': { hookItemId: 'item_hook', lockpickToolIds: [] },
  'event.submit': { sessionId: 's_x', ops: [] },
  'event.result': { sessionId: 's_x' },
  'social.send': { channel: 'world', phraseId: 'ph_1' },
  'social.pull': { channel: 'world' },
  'ads.claim': { placement: 'pl_1' },
};

test('AT-2401 全部 todo 动作实调返回 4999（不伪装成功/业务失败）', async (t) => {
  assert.equal(TODOS.size, 8, `todo 应为 8 个，实得 ${TODOS.size}（实现进展后请同步更新本断言）`);
  const token = await login();
  for (const action of [...TODOS].sort()) {
    await t.test(`${action} → 4999`, async () => {
      const res = await call(action, TODO_PAYLOADS[action] ?? {}, { token, rid: rid(action) });
      assert.equal(res.c, 4999, `${action} 未实现必须返回 INTERNAL(4999)`);
    });
  }
});
