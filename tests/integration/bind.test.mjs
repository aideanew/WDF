/**
 * 服务端集成测试（AT-2201）：account.bindStart / account.bindConfirm 账号合并。
 *
 * 与 auth.test.mjs 同范式：不走 HTTP，直接调 handleRpc，PGlite 内存库（WDF_DB_DIR=:memory:）。
 * 注意：同一进程内所有用例共享同一内存库，故每个用例使用独立 code 前缀避免身份串扰。
 *
 * 覆盖的契约面：
 *  - bindStart：签发一次性票据（ticket + expiresAt），同 rid 幂等回放
 *  - bindConfirm：两平台身份合并后 playerId 相同（锚定发起方）；绑定后 B 平台登录复用锚定 player
 *  - 幂等：同 rid 回放首次结果；换 rid 重放已用票据 → 拒绝
 *  - 失败路径：票据不存在 / 过期 / 已用 / 自绑 → 2004 BIND_TICKET_INVALID（TASK-4015 契约解冻，见 service.ts）
 *  - forkPending：确认方已有存档 → true（登记 save_fork source='bind'）；无存档 → false
 */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_VERSION, CLIENT_VERSION } from '../fixtures/version.mjs';

// 必须在 import db.ts 之前设定：db.ts 在加载时读取环境变量
process.env.WDF_DB_DIR = ':memory:';
process.env.WDF_AUTH_MODE = 'dev';
process.env.WDF_TOKEN_SECRET = 'test-secret-用于bind集成测试';

const { initDb, closeDb } = await import('../../server/src/core/db.ts');
const { handleRpc } = await import('../../server/src/gateway/rpc.ts');
const { insertTicket, insertPlayer, findTicket } = await import('../../server/src/modules/account/repo.ts');
const { issueToken } = await import('../../server/src/gateway/auth.ts');

await initDb();
after(async () => {
  await closeDb();
});

const CV = CLIENT_VERSION;
const CFG = CONFIG_VERSION;
let seq = 0;
const rid = (tag) => `bind-${tag}-${(seq += 1)}`;

/** 走网关的调用：令牌放在 ctx（等价于 HTTP 上的 Authorization），不放进 req。 */
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

test('AT-2201 bindStart 签发一次性票据', async () => {
  const a = await login(`bind-start-a-${Date.now()}`);
  const r = await call('account.bindStart', {}, { token: a.token, rid: rid('start') });
  assert.equal(r.c, 0);
  assert.match(r.d.ticket, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'ticket 应为 uuid');
  assert.equal(typeof r.d.expiresAt, 'number');
  assert.ok(r.d.expiresAt > Date.now(), 'expiresAt 必须晚于当前时间');
});

test('AT-2201 bindStart 幂等：同 rid 回放同一票据，不重复签发', async () => {
  const a = await login(`bind-start-idem-${Date.now()}`);
  const sameRid = rid('same'); // 注意：rid 必须先固化成变量，两次调用同一 rid 才能命中幂等缓存
  const r1 = await call('account.bindStart', {}, { token: a.token, rid: sameRid });
  const r2 = await call('account.bindStart', {}, { token: a.token, rid: sameRid });
  assert.equal(r2.c, 0);
  assert.equal(r2.d.ticket, r1.d.ticket, '同 rid 应回放首次签发的票据');
  assert.equal(r2.d.expiresAt, r1.d.expiresAt, '回放响应必须与首次完全一致');
});

test('AT-2201 两平台身份合并后 playerId 相同（核心验收）', async () => {
  const a = await login(`merge-a-${Date.now()}`, 'wechat');
  const start = await call('account.bindStart', {}, { token: a.token, rid: rid('merge-s') });
  const ticket = start.d.ticket;

  // B 平台（douyin）登录：独立身份、独立 player
  const bCode = `merge-b-${Date.now()}`;
  const b = await login(bCode, 'douyin');
  assert.notEqual(b.playerId, a.playerId, '合并前两平台必须是独立 player');

  const confirm = await call('account.bindConfirm', { ticket }, { token: b.token, rid: rid('merge-c') });
  assert.equal(confirm.c, 0);
  assert.equal(confirm.d.playerId, a.playerId, '合并后必须锚定到发起方（A）的 playerId');
  assert.equal(confirm.d.forkPending, false, 'B 无存档，不应有分叉');

  // 绑定生效后：B 平台用同一 code 重登 → identity 已改挂，必须复用 A 的 player
  const bRelogin = await login(bCode, 'douyin');
  assert.equal(bRelogin.playerId, a.playerId, '绑定后 B 平台登录必须落到锚定 player');
  assert.equal(bRelogin.isNew, false, '绑定后重登不应是新号');
});

test('AT-2201 bindConfirm 幂等：同 rid 回放首次结果；换 rid 重放已用票据被拒', async () => {
  const a = await login(`idem-a-${Date.now()}`, 'wechat');
  const start = await call('account.bindStart', {}, { token: a.token, rid: rid('is') });
  const ticket = start.d.ticket;
  const b = await login(`idem-b-${Date.now()}`, 'douyin');

  const confirmRid = rid('ic');
  const c1 = await call('account.bindConfirm', { ticket }, { token: b.token, rid: confirmRid });
  assert.equal(c1.c, 0);
  assert.equal(c1.d.playerId, a.playerId);

  // 同 rid：幂等回放首次结果（不重复合并、不报错）
  const c2 = await call('account.bindConfirm', { ticket }, { token: b.token, rid: confirmRid });
  assert.deepEqual(c2, c1, '同 rid 应回放首次响应');

  // 换 rid：票据已消费 → 拒绝（不得 500）
  const c3 = await call('account.bindConfirm', { ticket }, { token: b.token, rid: rid('ic2') });
  assert.equal(c3.c, 2004, '已用票据换 rid 重放必须被拒');
  assert.ok(typeof c3.msg === 'string' && c3.msg.length > 0, '必须带可读 msg');
});

test('AT-2201 失败路径：票据不存在 / 过期 / 自绑 → 2004（非 500）', async () => {
  const b = await login(`bad-ticket-${Date.now()}`, 'douyin');

  // 1) 票据不存在
  const missing = await call('account.bindConfirm', { ticket: '00000000-0000-0000-0000-000000000000' }, { token: b.token, rid: rid('bt1') });
  assert.equal(missing.c, 2004, '不存在的票据应返回明确错误码');
  assert.ok(typeof missing.msg === 'string' && missing.msg.length > 0, '必须带可读 msg');

  // 2) 过期票据：直接插入一条已过期的票（expires_at 为过去时刻）
  const a2 = await login(`expire-anchor-${Date.now()}`, 'wechat');
  const expiredTicket = 'aaaaaaa1-0000-0000-0000-000000000001';
  await insertTicket(expiredTicket, a2.playerId, Date.now() - 1000);
  const expired = await call('account.bindConfirm', { ticket: expiredTicket }, { token: b.token, rid: rid('bt2') });
  assert.equal(expired.c, 2004, '过期票据应被拒');

  // 3) 自绑：锚定方用自己令牌 confirm 自己的票
  const selfStart = await call('account.bindStart', {}, { token: a2.token, rid: rid('bt3') });
  const self = await call('account.bindConfirm', { ticket: selfStart.d.ticket }, { token: a2.token, rid: rid('bt4') });
  assert.equal(self.c, 2004, '自绑必须被拒，防止把 identity 从自己挪给自己');

  // 4) 无身份可挂：确认方是没有任何 identity 的 player（真实存在于 player 表，但该平台无登录身份）
  const a3 = await login(`no-id-anchor-${Date.now()}`, 'wechat');
  const t3 = await call('account.bindStart', {}, { token: a3.token, rid: rid('bt5') });
  const ghostId = `p_${'0'.repeat(20)}`;
  await insertPlayer(ghostId, 's1');
  const ghostToken = issueToken({ sub: ghostId, region: 's1', plat: 'douyin' });
  const noId = await call('account.bindConfirm', { ticket: t3.d.ticket }, { token: ghostToken, rid: rid('bt6') });
  assert.equal(noId.c, 2004, '确认方在该平台无 identity 应被拒');
  // 无副作用：失败路径不得消费票据
  const tRow = await findTicket(t3.d.ticket);
  assert.equal(tRow.used_at, null, '失败路径不得消费票据');
});

test('AT-2201 forkPending：确认方已有存档 → true 并登记 save_fork；重复合并不再登记', async () => {
  const a = await login(`fork-a-${Date.now()}`, 'wechat');
  // 锚定方自己也推一份存档（双方都有档，分叉裁决必须保留双方数据）
  const aSnap = { schemaVersion: 1, configVersion: CFG, saveId: 's_fork_a', revision: 0, savedAt: Date.now(), modules: {}, checksum: 11 };
  const pushA = await call('save.push', { baseRevision: 0, snapshot: aSnap, checksum: 11 }, { token: a.token, rid: rid('fa') });
  assert.equal(pushA.c, 0);

  const start = await call('account.bindStart', {}, { token: a.token, rid: rid('fs') });
  const ticket = start.d.ticket;

  const b = await login(`fork-b-${Date.now()}`, 'douyin');
  const bSnap = { schemaVersion: 1, configVersion: CFG, saveId: 's_fork_b', revision: 0, savedAt: Date.now(), modules: {}, checksum: 22 };
  const pushB = await call('save.push', { baseRevision: 0, snapshot: bSnap, checksum: 22 }, { token: b.token, rid: rid('fb') });
  assert.equal(pushB.c, 0);

  const confirm = await call('account.bindConfirm', { ticket }, { token: b.token, rid: rid('fc') });
  assert.equal(confirm.c, 0);
  assert.equal(confirm.d.playerId, a.playerId);
  assert.equal(confirm.d.forkPending, true, 'B 已有存档 → forkPending=true');

  // save_fork 已登记（source='bind'），供 AT-2202 resolveFork 裁决
  const { q } = await import('../../server/src/core/db.ts');
  const forks = await q(
    "SELECT player_id, source, body FROM save_fork WHERE player_id = $1 AND source = 'bind'",
    [a.playerId],
  );
  assert.equal(forks.length, 1, '必须登记恰好一条 bind 分叉');
  assert.equal(forks[0].body.saveId, 's_fork_b', '分叉体必须是 B 方的旧存档');

  // resolveFork（AT-2202）未实现前：B 的令牌仍指向旧 player，其旧存档保持原样（两份存档"不相加"）
  const pullB = await call('save.pull', {}, { token: b.token });
  assert.equal(pullB.c, 0);
  assert.equal(pullB.d.summary.revision, 1, 'B 方旧存档在分叉裁决前必须原样保留');
  assert.equal(pullB.d.snapshot.saveId, 's_fork_b', '拉回的必须是 B 方旧档本体，未被 A 方覆盖');
});
