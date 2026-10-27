/**
 * 服务端集成测试（AT-2204）：telemetry.track 批量埋点。
 *
 * 覆盖的契约面（TrackReq{events}，auth:false 无令牌也可上报）：
 *  - 正常上报写 audit_log（actor=IP），返回 accepted 数
 *  - 超批量上限 → 4001（env 可调）
 *  - 空批次 / 非数组 → accepted 0，不报错
 *  - 失败容忍：埋点链路任何异常不得影响其他动作（绝阻塞主流程）
 */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_VERSION, CLIENT_VERSION } from '../fixtures/version.mjs';

process.env.WDF_DB_DIR = ':memory:';
process.env.WDF_AUTH_MODE = 'dev';
process.env.WDF_TOKEN_SECRET = 'test-secret-用于telemetry集成测试';

const { initDb, closeDb } = await import('../../server/src/core/db.ts');
const { handleRpc } = await import('../../server/src/gateway/rpc.ts');

await initDb();
after(async () => {
  await closeDb();
});

const CV = CLIENT_VERSION;
const CFG = CONFIG_VERSION;
let seq = 0;
const rid = (tag) => `tm-${tag}-${(seq += 1)}`;

function call(a, p = {}, opts = {}) {
  const m = { rid: opts.rid ?? rid('m'), cv: CV, cfg: CFG, sv: 1, plat: opts.plat ?? 'wechat' };
  const ctx = opts.token ? { token: opts.token } : {};
  if (opts.ip) ctx.ip = opts.ip;
  return handleRpc({ a, p, m }, ctx);
}

const ev = (name, props) => ({ name, at: Date.now(), props });

test('AT-2204 正常上报入库（audit_log，actor=IP）+ 空批次零副作用', async () => {
  const r = await call('telemetry.track', { events: [ev('hook.hit', { power: 8123 }), ev('app.start')] }, { ip: '10.0.0.8' });
  assert.equal(r.c, 0);
  assert.equal(r.d.accepted, 2, '2 条事件全部接受');
  assert.equal(typeof r.t, 'number');

  // 空批次：accepted 0，不写库
  const empty = await call('telemetry.track', { events: [] });
  assert.equal(empty.c, 0);
  assert.equal(empty.d.accepted, 0);

  // 断言 audit_log 落库
  const { q } = await import('../../server/src/core/db.ts');
  const logs = await q("SELECT actor, action, detail FROM audit_log WHERE action = 'telemetry' AND actor = '10.0.0.8'");
  assert.equal(logs.length, 1, '只落一条批量记录（空批次不落）');
  assert.equal(logs[0].detail.length, 2);
  assert.equal(logs[0].detail[0].name, 'hook.hit');
});

test('AT-2204 超批量上限 → 4001（明确码，非 500）', async () => {
  process.env.WDF_TELEMETRY_MAX_BATCH = '3';
  try {
    const d = await loginForToken();
    const big = { events: [ev('a'), ev('b'), ev('c'), ev('d')] };
    const r = await call('telemetry.track', big, { token: d });
    assert.equal(r.c, 4001, '超上限必须 4001');
    assert.ok(typeof r.msg === 'string' && r.msg.length > 0);
  } finally {
    delete process.env.WDF_TELEMETRY_MAX_BATCH;
  }
});

test('AT-2204 无令牌可上报（auth:false）+ 主流程不受影响', async () => {
  // 不带令牌：崩溃/错误上报场景（actor 兜底 'anon'）
  const r = await call('telemetry.track', { events: [ev('client.error', { code: 'E001' })] });
  assert.equal(r.c, 0, 'auth:false 动作无令牌也必须放行');
  const { q } = await import('../../server/src/core/db.ts');
  const anonLogs = await q("SELECT actor, detail FROM audit_log WHERE action = 'telemetry' AND actor = 'anon'");
  assert.equal(anonLogs.length, 1, '无 IP 时 actor 必须兜底为 anon 且落库');
  assert.equal(anonLogs[0].detail[0].name, 'client.error');

  // 埋点之后其他动作照常（主流程不受影响）
  const login = await call('account.login', { code: `tm-after-${Date.now()}`, plat: 'wechat' });
  assert.equal(login.c, 0, '埋点后登录链路照常');
});

async function loginForToken() {
  const res = await call('account.login', { code: `tm-token-${Date.now()}`, plat: 'wechat' });
  assert.equal(res.c, 0);
  return res.d.token;
}
