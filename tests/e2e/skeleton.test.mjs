/**
 * e2e 骨架（AT-2402）：login → telemetry → save.push → save.pull 全链路一条。
 *
 * 与集成测试同范式（内存 PGlite + handleRpc，不起 HTTP），但按"真实客户端会话"
 * 的动作顺序串联，作为后续真 HTTP e2e 的骨架（升级条件：跑真 HTTP → opus）。
 *
 * 断言链：登录 → 埋点（不阻塞主流程）→ 首推 revision=1 → 拉回 body 逐字段一致、
 * checksum 与推入值一致 → 二推 revision=2 → 拉回 revision=2。
 */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_VERSION, CLIENT_VERSION } from '../fixtures/version.mjs';

process.env.WDF_DB_DIR = ':memory:';
process.env.WDF_AUTH_MODE = 'dev';
process.env.WDF_TOKEN_SECRET = 'test-secret-用于e2e骨架';

const { initDb, closeDb } = await import('../../server/src/core/db.ts');
const { handleRpc } = await import('../../server/src/gateway/rpc.ts');

await initDb();
after(async () => {
  await closeDb();
});

const CV = CLIENT_VERSION;
const CFG = CONFIG_VERSION;

function call(a, p = {}, opts = {}) {
  const m = { rid: opts.rid ?? `e2e-${a}-${Math.random().toString(36).slice(2)}`, cv: CV, cfg: CFG, sv: 1, plat: 'wechat' };
  const ctx = opts.token ? { token: opts.token } : {};
  return handleRpc({ a, p, m }, ctx);
}

test('e2e 骨架：login → telemetry → push → pull 闭环', async () => {
  // 1) 登录
  const login = await call('account.login', { code: `e2e-${Date.now()}`, plat: 'wechat' });
  assert.equal(login.c, 0, '登录必须成功');
  const { token, playerId, isNew, serverTime } = login.d;
  assert.equal(isNew, true);
  assert.match(playerId, /^p_[0-9a-f]{20}$/);
  assert.ok(serverTime > 0);

  // 2) 埋点（崩溃/行为上报；失败也不得阻塞主流程——这里链路健康应成功）
  const track = await call('telemetry.track', {
    events: [{ name: 'session.start', at: Date.now(), props: { plat: 'wechat' } }],
  }, { token });
  assert.equal(track.c, 0, '埋点上报应成功');
  assert.equal(track.d.accepted, 1);

  // 3) 首推存档（baseRevision=0 → revision=1）
  const snapshot = {
    schemaVersion: 1,
    configVersion: CFG,
    saveId: 's_e2e_skeleton',
    revision: 0,
    savedAt: Date.now(),
    modules: { inventory: { item_0001: 3 } },
    checksum: 777,
  };
  const push1 = await call('save.push', { baseRevision: 0, snapshot, checksum: 777 }, { token });
  assert.equal(push1.c, 0);
  assert.deepEqual(push1.d, { accepted: true, revision: 1 }, '首推必须 accepted 且 revision=1');

  // 4) 拉回：revision=1、checksum=777、body 逐字段一致
  const pull1 = await call('save.pull', {}, { token });
  assert.equal(pull1.c, 0);
  assert.equal(pull1.d.summary.revision, 1, 'pull revision 必须为 1');
  assert.equal(pull1.d.snapshot.checksum, 777, 'pull checksum 必须与推入值一致');
  assert.deepEqual(pull1.d.snapshot, snapshot, '拉回 body 必须与推上完全一致');

  // 5) 二推（baseRevision=1 → revision=2）→ 拉回 revision=2
  const snapshot2 = { ...snapshot, revision: 1, modules: { inventory: { item_0001: 4 } }, checksum: 888 };
  const push2 = await call('save.push', { baseRevision: 1, snapshot: snapshot2, checksum: 888 }, { token });
  assert.equal(push2.d.revision, 2, '二推 revision=2');

  const pull2 = await call('save.pull', {}, { token });
  assert.equal(pull2.d.summary.revision, 2);
  assert.equal(pull2.d.snapshot.modules.inventory.item_0001, 4, '拉回最新物品数');
});
