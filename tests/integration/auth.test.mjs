/**
 * 服务端集成测试（AT-0104 / AT-0105 / AT-0107）。
 *
 * 不走 HTTP：直接调 `handleRpc`，用 PGlite **内存库**（WDF_DB_DIR=:memory:），
 * 每个进程一份干净数据，跑完销毁 —— CI 里不需要装 PostgreSQL、不占端口。
 *
 * 覆盖的契约面：
 *  - 令牌：签发/验签、缺令牌 2001、坏签名与过期 2002（03-contracts-freeze §3.4.3）
 *  - account.login：新号 isNew=true、同 plat+code 复用 player、rid 必填
 *  - compliance.check：未登录拒绝、登录后 verified=true、offlineAllowanceMs=0（ADR-0008）
 *  - save.push：乐观锁 baseRevision、同 rid 幂等回放、冲突不报错只返回 accepted:false
 */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CONFIG_VERSION, CLIENT_VERSION } from '../fixtures/version.mjs';

// 必须在 import db.ts 之前设定：db.ts 在加载时读取环境变量
process.env.WDF_DB_DIR = ':memory:';
process.env.WDF_AUTH_MODE = 'dev';
process.env.WDF_TOKEN_SECRET = 'test-secret-用于集成测试';

const { initDb, closeDb } = await import('../../server/src/core/db.ts');
const { handleRpc } = await import('../../server/src/gateway/rpc.ts');
const { upsertRelease } = await import('../../server/src/modules/config/repo.ts');
const { invalidateConfigCache } = await import('../../server/src/modules/config/service.ts');

await initDb();
after(async () => {
  await closeDb();
});

const CV = CLIENT_VERSION;
const CFG = CONFIG_VERSION;
let seq = 0;
const rid = (tag) => `test-${tag}-${(seq += 1)}`;

/** 走网关的调用：令牌放在 **ctx**（等价于 HTTP 上放 body.token / Authorization），不放进 req。 */
function call(a, p = {}, opts = {}) {
  const m = { rid: opts.rid ?? rid('m'), cv: CV, cfg: CFG, sv: 1, plat: 'wechat' };
  const ctx = opts.token ? { token: opts.token } : {};
  return handleRpc({ a, p, m }, ctx);
}

/** 按线上格式手工造令牌，用来打"坏签名/过期"这两条路径（不依赖 TTL 环境变量）。 */
function forge(claims, secret = process.env.WDF_TOKEN_SECRET) {
  const payload = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

async function login(code) {
  const res = await call('account.login', { code, plat: 'wechat' });
  assert.equal(res.c, 0, '登录应成功');
  return res.d;
}

test('AT-0104 令牌签发与鉴权口径', async () => {
  const d = await login(`code-token-${Date.now()}`);
  assert.match(d.token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, '令牌应为 payload.signature 两段式 base64url');
  assert.match(d.playerId, /^p_[0-9a-f]{20}$/, 'playerId 形如 p_ + 20 位 hex');
  assert.equal(d.isNew, true, '新 code 应为新号');
  assert.equal(typeof d.serverTime, 'number');

  const claims = JSON.parse(Buffer.from(d.token.split('.')[0], 'base64url').toString('utf8'));
  assert.equal(claims.sub, d.playerId, 'claims.sub 必须是 playerId');
  assert.equal(claims.admin, false, '玩家令牌的 admin 恒为 false');
  assert.ok(claims.exp > claims.iat, 'exp 必须晚于 iat');

  // 缺令牌 → 2001（客户端该去登录）
  const noToken = await call('save.pull');
  assert.equal(noToken.c, 2001);

  // 坏签名 → 2002（令牌不可信 = 会话无效，客户端先静默刷新一次）
  const tampered = await call('save.pull', {}, { token: forge({ sub: d.playerId, exp: Date.now() + 1e6 }, '错误的密钥') });
  assert.equal(tampered.c, 2002);

  // 过期 → 2002
  const expired = await call('save.pull', {}, {
    token: forge({ sub: d.playerId, region: 's1', plat: 'wechat', iat: 1, exp: Date.now() - 1000, jti: 'x', admin: false }),
  });
  assert.equal(expired.c, 2002);
});

test('AT-0104 account.login 身份复用与参数校验', async () => {
  const code = `code-reuse-${Date.now()}`;
  const a = await login(code);
  const b = await login(code);
  assert.equal(b.playerId, a.playerId, '同 plat + 同 code 必须落到同一个 player');
  assert.equal(b.isNew, false, '二次登录 isNew 应为 false');

  // 另一个平台同 code 是另一个号（跨平台不共用身份）
  const other = await call('account.login', { code, plat: 'douyin' });
  assert.equal(other.c, 0);
  assert.notEqual(other.d.playerId, a.playerId, '不同平台同 code 不得共用 player');

  const bad = await call('account.login', { code: '', plat: 'wechat' });
  assert.equal(bad.c, 1001, '空 code → BAD_PAYLOAD');

  const noRid = await handleRpc({ a: 'account.login', p: { code: 'x', plat: 'wechat' }, m: { cv: CV, cfg: CFG, sv: 1, plat: 'wechat' } });
  assert.equal(noRid.c, 1001, 'idempotent 动作缺 rid → BAD_PAYLOAD');
});

test('AT-0105 account.refresh 刷新会话（过期令牌也可）', async () => {
  const d = await login(`code-refresh-${Date.now()}`);

  // 过期但签名有效的令牌 → 应成功重签发新令牌（handler 自校验签名，不查过期）
  const expired = forge({ sub: d.playerId, region: 's1', plat: 'wechat', iat: 1, exp: Date.now() - 1000, jti: 'x', admin: false });
  const r = await call('account.refresh', {}, { token: expired });
  assert.equal(r.c, 0, '过期令牌签名有效应成功刷新');
  assert.match(r.d.token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, '刷新返回新令牌');
  assert.notEqual(r.d.token, expired, '新令牌必须不同于旧令牌');

  // 新令牌应能正常鉴权
  const pull = await call('save.pull', {}, { token: r.d.token });
  assert.equal(pull.c, 0, '刷新得到的新令牌应能鉴权');

  // 坏签名 → 2002（不可刷新，退回登录）
  const bad = forge({ sub: d.playerId, region: 's1', plat: 'wechat', iat: Date.now(), exp: Date.now() + 1e6, jti: 'y', admin: false }, '错误密钥');
  const r2 = await call('account.refresh', {}, { token: bad });
  assert.equal(r2.c, 2002, '坏签名不可刷新');

  // 缺令牌 → 2002
  const r3 = await call('account.refresh', {});
  assert.equal(r3.c, 2002, '无令牌不可刷新');
});

test('AT-0105 compliance.check', async () => {
  const d = await login(`code-cc-${Date.now()}`);

  const res = await call('compliance.check', {}, { token: d.token });
  assert.equal(res.c, 0);
  assert.equal(res.d.verified, true, '本地口径：能登录即实名通过');
  assert.equal(res.d.minor, false);
  assert.equal(res.d.offlineAllowanceMs, 0, 'ADR-0008 必须联网，离线额度为 0');
});

test('AT-0107 save.push 乐观锁与幂等', async () => {
  const d = await login(`code-save-${Date.now()}`);
  const token = d.token;
  const snap = (checksum) => ({
    schemaVersion: 1,
    configVersion: CFG,
    saveId: 's_integration',
    revision: 0,
    savedAt: Date.now(),
    modules: {},
    checksum,
  });

  const empty = await call('save.pull', {}, { token });
  assert.equal(empty.c, 0);
  assert.equal(empty.d.summary, null, '新号云端无存档');

  const pushRid = rid('push');
  const first = await call('save.push', { baseRevision: 0, snapshot: snap(11), checksum: 11 }, { token, rid: pushRid });
  assert.equal(first.c, 0);
  assert.equal(first.d.accepted, true);
  assert.equal(first.d.revision, 1, '首次上传 revision = 1');

  // 同 rid 重放：必须回放首次响应，revision 不得 +1
  const replay = await call('save.push', { baseRevision: 0, snapshot: snap(11), checksum: 11 }, { token, rid: pushRid });
  assert.equal(replay.d.revision, 1, '同 rid 幂等，revision 不递增');

  // 旧 baseRevision + 新 rid → 冲突（不是错误码）
  const s22 = snap(22);
  const stale = await call('save.push', { baseRevision: 0, snapshot: s22, checksum: 22 }, { token });
  assert.equal(stale.c, 0, '冲突属正常业务分支，c 仍为 0');
  assert.equal(stale.d.accepted, false);
  assert.equal(stale.d.conflict.revision, 1);

  // 正确 baseRevision → +1
  const second = await call('save.push', { baseRevision: 1, snapshot: s22, checksum: 22 }, { token });
  assert.equal(second.d.accepted, true);
  assert.equal(second.d.revision, 2);

  const latest = await call('save.pull', {}, { token });
  assert.equal(latest.d.summary.revision, 2);
  // 验收标准 4：save.pull 取回的 body 与 push 上去的**完全一致**（deepEqual，不是只比 checksum）
  assert.deepEqual(latest.d.snapshot, s22, '拉回的 snapshot 必须与推上去的逐字段一致');
});

test('未实现动作返回 4999，不伪装成业务失败', async () => {
  // event.start 是 auth=true 的动作，必须先带上合法令牌 + 合法入参才会走到 handler
  const d = await login(`code-todo-${Date.now()}`);
  const res = await call('event.start', { hookItemId: 'item_hook', lockpickToolIds: [] }, { token: d.token });
  assert.equal(res.c, 4999);
});

test('未知动作返回 1002', async () => {
  const res = await call('nope.nothing');
  assert.equal(res.c, 1002);
});

test('AT-0105 config.manifest 与版本闸', async () => {
  // 1) 没有任何 config_release 记录：用 npm run gen 的产物，且不启用版本闸
  const before = await call('config.manifest');
  assert.equal(before.c, 0);
  // configVersion 由 game-data 内容哈希得出，不再硬编码（E-06 后随数值变化）
  const genManifest = JSON.parse(readFileSync(new URL('../../server/generated/config/_manifest.json', import.meta.url), 'utf8'));
  assert.equal(before.d.configVersion, genManifest.configVersion, '未发布时 configVersion 必须等于 gen 产物');
  assert.equal(before.d.packUrl, undefined, 'packUrl 为空时字段不出现');
  assert.equal(before.d.minClientVersion, 'v0.1.0-s1', '兜底下限 = 当前客户端版本');

  // 2) 登记一条更高门槛的发布记录 → 旧客户端被 9001 拦下
  await upsertRelease({ version: 'deadbeefdeadbeef', minClient: 'v9.0.0', packUrl: 'https://example.com/pack.zip' });
  invalidateConfigCache();

  const blocked = await call('save.pull');
  assert.equal(blocked.c, 9001, 'cv 低于 minClientVersion → CLIENT_TOO_OLD');

  const after = await call('config.manifest');
  assert.equal(after.d.configVersion, 'deadbeefdeadbeef', '有发布记录时以表为准');
  assert.equal(after.d.minClientVersion, 'v9.0.0');
  assert.equal(after.d.packUrl, 'https://example.com/pack.zip');

  // 3) 把门槛降回当前版本 → 放行（也验证 60s 缓存可失效）
  await upsertRelease({ version: 'deadbeefdeadbeef', minClient: 'v0.1.0-s1', packUrl: null });
  invalidateConfigCache();
  const passed = await call('save.pull');
  assert.notEqual(passed.c, 9001, '门槛不高于当前客户端时应放行');
});
