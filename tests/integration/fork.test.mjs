/**
 * 服务端集成测试（AT-2202）：save.resolveFork 存档分叉裁决。
 *
 * 与 auth/bind 测试同范式：不走 HTTP，直接调 handleRpc，PGlite 内存库。
 *
 * 覆盖的契约面（冻结入参 ResolveForkReq{keep, localSnapshot?}，返回 {revision}）：
 *  - push 冲突分叉：push 拿 conflict → keep='local' 用本地档收敛 → pull 得选定档（revision+1）
 *  - bind 合并分叉（AT-2201 场景）：bindConfirm 产生 forkPending → keep='cloud' 保留锚定档 + fork 清空
 *  - bind 合并分叉 → keep='local' → pull 得 B 方旧档（revision = 锚定 rev+1）
 *  - keep='local' 缺 localSnapshot → 1001
 *  - resolveFork 为 idempotent 动作：缺 rid → 1001；同 rid 回放首次结果
 *  - "另一支标记废弃"以 audit_log 留痕（save_fork 无状态列）
 */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_VERSION, CLIENT_VERSION } from '../fixtures/version.mjs';

process.env.WDF_DB_DIR = ':memory:';
process.env.WDF_AUTH_MODE = 'dev';
process.env.WDF_TOKEN_SECRET = 'test-secret-用于fork集成测试';

const { initDb, closeDb } = await import('../../server/src/core/db.ts');
const { handleRpc } = await import('../../server/src/gateway/rpc.ts');

await initDb();
after(async () => {
  await closeDb();
});

const CV = CLIENT_VERSION;
const CFG = CONFIG_VERSION;
let seq = 0;
const rid = (tag) => `fork-${tag}-${(seq += 1)}`;

function call(a, p = {}, opts = {}) {
  const m = { rid: opts.rid ?? rid('m'), cv: CV, cfg: CFG, sv: 1, plat: opts.plat ?? 'wechat' };
  const ctx = opts.token ? { token: opts.token } : {};
  return handleRpc({ a, p, m }, ctx);
}

async function login(code, plat = 'wechat') {
  const res = await call('account.login', { code, plat }, { plat });
  assert.equal(res.c, 0, `登录应成功：${code}(${plat})`);
  return res.d;
}

const snap = (saveId, checksum) => ({
  schemaVersion: 1,
  configVersion: CFG,
  saveId,
  revision: 0,
  savedAt: Date.now(),
  modules: {},
  checksum,
});

/** 复现 AT-2201 bind 分叉：A(wechat) 锚定 + B(douyin, 有档) 合并，返回 {a, b, confirm}。 */
async function makeBindFork(tag) {
  const a = await login(`fk-${tag}-a-${Date.now()}`, 'wechat');
  const aSnap = snap(`s_${tag}_a`, 11);
  const pushA = await call('save.push', { baseRevision: 0, snapshot: aSnap, checksum: 11 }, { token: a.token, rid: rid(`${tag}pa`) });
  assert.equal(pushA.c, 0);

  const start = await call('account.bindStart', {}, { token: a.token, rid: rid(`${tag}s`) });
  const b = await login(`fk-${tag}-b-${Date.now()}`, 'douyin');
  const bSnap = snap(`s_${tag}_b`, 22);
  const pushB = await call('save.push', { baseRevision: 0, snapshot: bSnap, checksum: 22 }, { token: b.token, rid: rid(`${tag}pb`) });
  assert.equal(pushB.c, 0);

  const confirm = await call('account.bindConfirm', { ticket: start.d.ticket }, { token: b.token, rid: rid(`${tag}c`) });
  assert.equal(confirm.c, 0);
  assert.equal(confirm.d.forkPending, true, `${tag}: 前置——bind 应产生 forkPending`);
  return { a, b, confirm, aSnap, bSnap };
}

test('AT-2202 push 冲突分叉 → keep=local 收敛到本地档', async () => {
  const d = await login(`fk-push-${Date.now()}`);
  const s1 = snap('s_push_cloud', 11);
  const first = await call('save.push', { baseRevision: 0, snapshot: s1, checksum: 11 }, { token: d.token, rid: rid('p1') });
  assert.equal(first.d.revision, 1);

  // 旧 baseRevision + 新 rid → 冲突（另一设备视角：本地 rev0 档与云端 rev1 分叉）
  const local = snap('s_push_local', 33);
  const conflict = await call('save.push', { baseRevision: 0, snapshot: local, checksum: 33 }, { token: d.token, rid: rid('p2') });
  assert.equal(conflict.d.accepted, false, '前置——push 应报冲突');

  // 裁决：保留本地 → 云端收敛到本地档，revision 递增
  const resolve = await call('save.resolveFork', { keep: 'local', localSnapshot: local }, { token: d.token, rid: rid('r1') });
  assert.equal(resolve.c, 0);
  assert.equal(resolve.d.revision, 2, 'keep=local 应在云端 revision 基础上 +1');

  const pulled = await call('save.pull', {}, { token: d.token });
  assert.equal(pulled.d.summary.revision, 2);
  assert.equal(pulled.d.snapshot.saveId, 's_push_local', 'pull 必须得到选定（本地）档');
  assert.equal(pulled.d.snapshot.checksum, 33);
});

test('AT-2202 bind 分叉 → keep=cloud 保留锚定档并清空 fork', async () => {
  const { a, b, aSnap } = await makeBindFork('cloud');

  const resolve = await call('save.resolveFork', { keep: 'cloud' }, { token: a.token, rid: rid('rc') });
  assert.equal(resolve.c, 0);
  assert.equal(resolve.d.revision, 1, 'keep=cloud 返回云端当前 revision');

  const pulled = await call('save.pull', {}, { token: a.token });
  assert.equal(pulled.d.snapshot.saveId, 's_cloud_a', '云端档必须原样保留（锚定方 A 的档）');
  void b;
  void aSnap;

  // fork 行已清空（forkPending 数据源消失）
  const { q } = await import('../../server/src/core/db.ts');
  const forks = await q('SELECT player_id FROM save_fork WHERE player_id = $1', [a.playerId]);
  assert.equal(forks.length, 0, '裁决后未决 fork 行必须清空');
});

test('AT-2202 bind 分叉 → keep=local 收敛到被合并方旧档', async () => {
  const { a, bSnap } = await makeBindFork('local');

  const resolve = await call('save.resolveFork', { keep: 'local', localSnapshot: bSnap }, { token: a.token, rid: rid('rl') });
  assert.equal(resolve.c, 0);
  assert.equal(resolve.d.revision, 2, '锚定档 rev1 + 本地档收敛 → rev2');

  const pulled = await call('save.pull', {}, { token: a.token });
  assert.equal(pulled.d.snapshot.saveId, 's_local_b', 'pull 必须得到选定（B 方）档');
});

test('AT-2202 失败路径：缺 localSnapshot → 1001；缺 rid → 1001；同 rid 幂等回放', async () => {
  const { a } = await makeBindFork('fail');

  // keep=local 但缺 localSnapshot → 1001 BAD_PAYLOAD
  const missing = await call('save.resolveFork', { keep: 'local' }, { token: a.token, rid: rid('m1') });
  assert.equal(missing.c, 1001, 'keep=local 缺 localSnapshot 应为 BAD_PAYLOAD');

  // idempotent 动作缺 rid → 1001（网关层）
  const noRid = await handleRpc({
    a: 'save.resolveFork',
    p: { keep: 'cloud' },
    m: { cv: CV, cfg: CFG, sv: 1, plat: 'wechat' }, // m 里不带 rid
  }, { token: a.token });
  assert.equal(noRid.c, 1001, 'idempotent 动作缺 rid → BAD_PAYLOAD');

  // 同 rid 幂等：keep=local 重复提交回放首次结果，revision 不再递增
  const again = snap('s_fail_b', 22);
  const sameRid = rid('same');
  const r1 = await call('save.resolveFork', { keep: 'local', localSnapshot: again }, { token: a.token, rid: sameRid });
  assert.equal(r1.c, 0);
  const r2 = await call('save.resolveFork', { keep: 'local', localSnapshot: again }, { token: a.token, rid: sameRid });
  assert.deepEqual(r2, r1, '同 rid 应回放首次响应');
  const pulled = await call('save.pull', {}, { token: a.token });
  assert.equal(pulled.d.summary.revision, r1.d.revision, '幂等回放不得再递增 revision');
});

test('AT-2202 裁决留痕：audit_log 有 resolve_fork 记录', async () => {
  const { a } = await makeBindFork('audit');
  await call('save.resolveFork', { keep: 'cloud' }, { token: a.token, rid: rid('a1') });

  const { q } = await import('../../server/src/core/db.ts');
  const logs = await q(
    "SELECT actor, action, detail FROM audit_log WHERE actor = $1 AND action = 'resolve_fork'",
    [a.playerId],
  );
  assert.equal(logs.length, 1, '必须留一条 resolve_fork 审计');
  assert.equal(logs[0].detail.keep, 'cloud');
  assert.equal(logs[0].detail.discardedForks, 1, '废弃（删除）的 fork 行数必须留痕');
});
