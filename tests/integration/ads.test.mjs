/**
 * 服务端集成测试（TASK-7020 · V-702.1）—— ads.claim 激励视频发奖（ADR-0014）。
 *
 * 不走 HTTP：直接调 `handleRpc`，PGlite 内存库（WDF_DB_DIR=:memory:），范式同 economy-sell.test.mjs。
 *
 * 覆盖五例：
 *  1. 正常 claim：placement 合法 → granted=true，remainingToday = cap-1（cap 读 ad_placements 配置）
 *  2. 达上限：第 cap+1 次同 placement → 3002（QUOTA_EXHAUSTED）
 *  3. 未知 placement：不存在的 placement → 1001（BAD_PAYLOAD），零副作用
 *  4. 跨日重置：用服务层直调 + 未来的 serverNow 模拟新一天 → 计数归零，remainingToday 恢复 cap
 *  5. 同 rid 重放：同 rid 返回上次结果（幂等），不重复计数
 */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CONFIG_VERSION, CLIENT_VERSION } from '../fixtures/version.mjs';

process.env.WDF_DB_DIR = ':memory:';
process.env.WDF_AUTH_MODE = 'dev';
process.env.WDF_TOKEN_SECRET = 'test-secret-用于集成测试';

const { initDb, closeDb } = await import('../../server/src/core/db.ts');
const { handleRpc } = await import('../../server/src/gateway/rpc.ts');
const { countClaimsToday } = await import('../../server/src/modules/ads/repo.ts');
const { claim } = await import('../../server/src/modules/ads/service.ts');

await initDb();
after(async () => {
  await closeDb();
});

const CV = CLIENT_VERSION;
const CFG = CONFIG_VERSION;
let seq = 0;
const rid = (tag) => `ads-${tag}-${(seq += 1)}`;

function call(a, p = {}, opts = {}) {
  const m = { rid: opts.rid ?? rid('m'), cv: CV, cfg: CFG, sv: 1, plat: 'wechat' };
  const ctx = opts.token ? { token: opts.token } : {};
  return handleRpc({ a, p, m }, ctx);
}

async function login(code) {
  const res = await call('account.login', { code, plat: 'wechat' });
  assert.equal(res.c, 0, '登录应成功');
  return res.d;
}

// 夹具：从 server/generated/config/ad_placements.json 取一个位面及其 cap
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const adPlacements = JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', 'ad_placements.json'), 'utf8'));
const PLACEMENT = adPlacements[0].id;
const CAP = adPlacements[0].daily_cap;
assert.ok(CAP > 0, 'ad_placements 的 daily_cap 应为正');

test('ads-1 正常 claim：granted=true，remainingToday 递减', async () => {
  const { token, playerId } = await login(`ads-ok-${(seq += 1)}`);
  const r = await call('ads.claim', { placement: PLACEMENT }, { token });
  assert.equal(r.c, 0, '正常 claim 应成功');
  assert.equal(r.d.granted, true);
  assert.equal(r.d.remainingToday, CAP - 1);
  // 计数与账本条数互补（验收：remainingToday = cap - used）
  const used = await countClaimsToday(playerId, PLACEMENT, 0);
  assert.equal(used, 1);
});

test('ads-2 达上限：第 cap+1 次 → 3002，remainingToday=0 口径由 3002 表达', async () => {
  const { token } = await login(`ads-cap-${(seq += 1)}`);
  for (let i = 0; i < CAP; i++) {
    const r = await call('ads.claim', { placement: PLACEMENT }, { token });
    assert.equal(r.c, 0, `第 ${i + 1} 次应成功`);
  }
  const over = await call('ads.claim', { placement: PLACEMENT }, { token });
  assert.equal(over.c, 3002, '第 cap+1 次应达上限');
});

test('ads-3 未知 placement：→ 1001，零副作用', async () => {
  const { token, playerId } = await login(`ads-unknown-${(seq += 1)}`);
  const before = await countClaimsToday(playerId, 'nope', 0);
  const r = await call('ads.claim', { placement: 'nope' }, { token });
  assert.equal(r.c, 1001, '未知 placement 应 1001');
  const after = await countClaimsToday(playerId, 'nope', 0);
  assert.equal(after, before, '未知 placement 不应写流水');
});

test('ads-4 跨日重置：昨天耗尽 cap，未来 serverNow 计数归零可再 claim', async () => {
  const { token, playerId } = await login(`ads-day-${(seq += 1)}`);
  // 今天耗尽 cap：cap 次成功，随后今天再 claim → 3002（已满）
  for (let i = 0; i < CAP; i++) {
    const r = await call('ads.claim', { placement: PLACEMENT }, { token });
    assert.equal(r.c, 0, `第 ${i + 1} 次应成功`);
  }
  const todayOver = await call('ads.claim', { placement: PLACEMENT }, { token });
  assert.equal(todayOver.c, 3002, '今天已满应 3002');
  // 服务层直调 + 2 天后的 serverNow：新一天的当日计数归零（昨天的流水不计入）→ 可再 claim
  const r2 = await claim(playerId, PLACEMENT, Date.now() + 2 * 86400000, rid('day'));
  assert.equal(r2.granted, true, '跨日后应可再 claim（昨日 cap 不结转）');
  assert.equal(r2.remainingToday, CAP - 1, '新一天首次 claim 后 remainingToday = cap-1');
});

test('ads-5 同 rid 重放：同 rid 返回上次结果，不重复计数', async () => {
  const { token, playerId } = await login(`ads-idem-${(seq += 1)}`);
  const sameRid = rid('idem');
  const r1 = await call('ads.claim', { placement: PLACEMENT }, { token, rid: sameRid });
  assert.equal(r1.c, 0);
  const usedAfterFirst = await countClaimsToday(playerId, PLACEMENT, 0);
  assert.equal(usedAfterFirst, 1);
  // 同 rid 重放 → 返回上次结果（幂等），不重复写
  const r2 = await call('ads.claim', { placement: PLACEMENT }, { token, rid: sameRid });
  assert.equal(r2.c, 0);
  assert.deepEqual(r2.d, r1.d, '同 rid 重放应返回相同结果');
  const usedAfterSecond = await countClaimsToday(playerId, PLACEMENT, 0);
  assert.equal(usedAfterSecond, 1, '同 rid 重放不应增加计数');
});
