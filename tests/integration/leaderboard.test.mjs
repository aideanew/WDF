/**
 * 服务端集成测试（AT-2203）：leaderboard.report / leaderboard.query 总收益榜。
 *
 * 与 auth/bind/fork 测试同范式：不走 HTTP，直接调 handleRpc，PGlite 内存库。
 *
 * 覆盖的契约面（ReportReq{seq, events} / QueryReq{scope, cursor?, limit}）：
 *  - report：合法事件写 income_daily 并刷新快照；非法事件剔除不报错；seq 回退幂等返回
 *  - 超频 4001（内存限频，env 可调间隔）
 *  - 收益超 cap → flagged=true 且不入榜（WDF_INCOME_HOURLY_CAP 注入）
 *  - query：上报 3 人 → 快照排序正确（value desc）；me 定位；province 空榜
 */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_VERSION, CLIENT_VERSION } from '../fixtures/version.mjs';

process.env.WDF_DB_DIR = ':memory:';
process.env.WDF_AUTH_MODE = 'dev';
process.env.WDF_TOKEN_SECRET = 'test-secret-用于leaderboard集成测试';
process.env.WDF_REPORT_MIN_INTERVAL_MS = '60000'; // 拉大间隔：同 player 二次上报触发 4001；不同 player 互不影响

const { initDb, closeDb } = await import('../../server/src/core/db.ts');
const { handleRpc } = await import('../../server/src/gateway/rpc.ts');

await initDb();
after(async () => {
  await closeDb();
});

const CV = CLIENT_VERSION;
const CFG = CONFIG_VERSION;
let seq = 0;
const rid = (tag) => `lb-${tag}-${(seq += 1)}`;

function call(a, p = {}, opts = {}) {
  const m = { rid: opts.rid ?? rid('m'), cv: CV, cfg: CFG, sv: 1, plat: opts.plat ?? 'wechat' };
  const ctx = opts.token ? { token: opts.token } : {};
  return handleRpc({ a, p, m }, ctx);
}

async function login(code, plat = 'wechat') {
  const res = await call('account.login', { code, plat }, { plat });
  assert.equal(res.c, 0, `登录应成功：${code}`);
  return res.d;
}

const ev = (itemId, value, source = 'hook') => ({ itemId, value, at: Date.now(), source });

test('AT-2203 report 3 人 → query 排序正确 + me 定位', async () => {
  const alice = await login(`lb-alice-${Date.now()}`);
  const bob = await login(`lb-bob-${Date.now()}`);
  const carol = await login(`lb-carol-${Date.now()}`);

  const r1 = await call('leaderboard.report', { seq: 1, events: [ev('item_a', 100), ev('item_b', 50)] }, { token: alice.token, rid: rid('r1') });
  assert.equal(r1.c, 0);
  assert.equal(r1.d.acceptedSeq, 1);
  assert.equal(r1.d.flagged, false);

  await call('leaderboard.report', { seq: 1, events: [ev('item_a', 300)] }, { token: bob.token, rid: rid('r2') });
  await call('leaderboard.report', { seq: 1, events: [ev('item_a', 200)] }, { token: carol.token, rid: rid('r3') });

  const q1 = await call('leaderboard.query', { scope: 'global', limit: 10 }, { token: alice.token });
  assert.equal(q1.c, 0);
  assert.equal(q1.d.items.length, 3, '3 人入榜');
  assert.deepEqual(q1.d.items.map((r) => r.value), [300, 200, 150], '按 value 降序');
  assert.equal(q1.d.items[0].rank, 1);
  assert.equal(q1.d.me.playerId, alice.playerId, 'me 定位到查询者');
  assert.equal(q1.d.me.rank, 3);
  assert.ok(q1.d.snapshotAt > 0, '快照时间戳有效');

  // 分页：limit=1 + cursor 翻页
  const p1 = await call('leaderboard.query', { scope: 'global', limit: 1 }, { token: alice.token });
  assert.equal(p1.d.items.length, 1);
  assert.equal(p1.d.items[0].value, 300);
  const p2 = await call('leaderboard.query', { scope: 'global', limit: 1, cursor: p1.d.next }, { token: alice.token });
  assert.equal(p2.d.items[0].value, 200, 'cursor 翻页取第二名');
});

test('AT-2203 report 非法事件剔除；seq 回退幂等返回当前进度', async () => {
  const d = await login(`lb-sanitize-${Date.now()}`);

  // 负值/零值/空 itemId/非法 source 全部剔除；只有 60 有效
  const r = await call('leaderboard.report', {
    seq: 5,
    events: [ev('item_ok', 60), ev('bad', -5), ev('bad', 0), { itemId: '', value: 10, at: 1, source: 'hook' }, { itemId: 'x', value: 10, at: 1, source: 'hacked' }],
  }, { token: d.token, rid: rid('s1') });
  assert.equal(r.c, 0);
  assert.equal(r.d.acceptedSeq, 5);

  // seq 回退（≤ 上次 acceptedSeq）→ 幂等返回，不写库
  const replay = await call('leaderboard.report', { seq: 3, events: [ev('item_a', 9999)] }, { token: d.token, rid: rid('s2') });
  assert.equal(replay.c, 0);
  assert.equal(replay.d.acceptedSeq, 5, 'seq 回退应返回当前 acceptedSeq 而非推进');

  const q = await call('leaderboard.query', { scope: 'global', limit: 100 }, { token: d.token });
  const me = q.d.items.find((row) => row.playerId === d.playerId);
  assert.equal(me.value, 60, '回退上报不得写入；非法事件不得计入');
});

test('AT-2203 超频 → 4001（同 player 间隔过短）', async () => {
  const d = await login(`lb-rate-${Date.now()}`);
  const first = await call('leaderboard.report', { seq: 1, events: [ev('item_a', 10)] }, { token: d.token, rid: rid('f1') });
  assert.equal(first.c, 0);

  const second = await call('leaderboard.report', { seq: 2, events: [ev('item_a', 10)] }, { token: d.token, rid: rid('f2') });
  assert.equal(second.c, 4001, '间隔内二次上报必须 4001');
  assert.ok(typeof second.msg === 'string' && second.msg.length > 0);
});

test('AT-2203 收益超 cap → flagged 且不入榜', async () => {
  process.env.WDF_INCOME_HOURLY_CAP = '100'; // 注入 cap（默认不启用）
  try {
    const d = await login(`lb-flag-${Date.now()}`);
    const r = await call('leaderboard.report', { seq: 1, events: [ev('item_a', 500)] }, { token: d.token, rid: rid('g1') });
    assert.equal(r.c, 0);
    assert.equal(r.d.flagged, true, '500 > 100*1.2 → 必须标记复核');

    const q = await call('leaderboard.query', { scope: 'global', limit: 100 }, { token: d.token });
    assert.equal(q.d.items.find((row) => row.playerId === d.playerId), undefined, 'flagged 玩家不入榜');
    assert.equal(q.d.me, undefined, 'me 也不出现');
  } finally {
    delete process.env.WDF_INCOME_HOURLY_CAP;
  }
});

test('AT-2203 province 快照未产出 → 空榜（契约合法）', async () => {
  const d = await login(`lb-prov-${Date.now()}`);
  const q = await call('leaderboard.query', { scope: 'province', limit: 10 }, { token: d.token });
  assert.equal(q.c, 0);
  assert.deepEqual(q.d.items, [], 'province 榜暂无快照，返回空 items');
});
