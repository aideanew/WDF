/**
 * 服务端集成测试（TASK-4006 · V-406.5）—— economy.sell 商人回收（ADR-0012）。
 *
 * 不走 HTTP：直接调 `handleRpc`，PGlite 内存库（WDF_DB_DIR=:memory:），范式同 auth.test.mjs。
 *
 * 覆盖五例：
 *  1. 正常卖：先 recordGain 造获得，herbDelta = floor(base×recycle_bp/10000×region_bp/10000)×count，quotaLeft 递减
 *  2. 影子不一致（超卖）：available=0 时卖出 → 1001，零副作用
 *  3. 重复 rid：同 rid 重放返回上次结果（幂等），不重复扣账
 *  4. 限购尽：merchant_black（dailyLimit=5，service.ts 硬编码 D-01）卖满后第 6 次 → 3002
 *  5. 失败零副作用（V-406.c）：失败前后 ledgerSum 与 quotaUsed 快照相等
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
const { recordGain, ledgerSum, quotaUsed } = await import('../../server/src/modules/economy/repo.ts');

await initDb();
after(async () => {
  await closeDb();
});

const CV = CLIENT_VERSION;
const CFG = CONFIG_VERSION;
let seq = 0;
const rid = (tag) => `sell-${tag}-${(seq += 1)}`;
/** 与 service.ts dayOf 同式：Asia/Shanghai 自然日 */
const day = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

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

// 夹具：从 server/generated/config/prices.json 选一个可回收物品（recycle_bp>0）
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const prices = JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', 'prices.json'), 'utf8'));
const sellable = prices.find((r) => typeof r.recycle_bp === 'number' && r.recycle_bp > 0);
if (!sellable) throw new Error('prices.json 中没有 recycle_bp>0 的物品，集成测试无法构造卖出行');
const ITEM = sellable.id;

test('sell-1 正常卖：herbDelta 按 D-01 公式，quotaLeft 递减', async () => {
  const { token, playerId } = await login(`sell-ok-${(seq += 1)}`);
  await recordGain(playerId, ITEM, 3, 'salvage');
  const res = await call('economy.sell', { itemId: ITEM, count: 2, merchantId: 'merchant_village' }, { token });
  assert.equal(res.c, 0, `卖出应成功: ${JSON.stringify(res)}`);
  // merchant_village: regionBp=10000, dailyLimit=20（service.ts D-01 硬编码）
  // 回收价 = floor(recycle_bp × region_bp/10000)（recycle_bp 为回收基数，2026-10-27 主控修正量纲）
  const expected = Math.floor((sellable.recycle_bp * 10000) / 10000) * 2;
  assert.equal(res.d.herbDelta, expected, 'herbDelta = floor(recycle_bp×region_bp/10000)×count');
  assert.equal(res.d.quotaLeft, 18, 'quotaLeft = 20 - 2');
  const after = await ledgerSum(playerId, ITEM);
  assert.equal(after.gained, 3);
  assert.equal(after.sold, 2, '卖出后影子账本应记负流水');
});

test('sell-2 影子不一致（超卖）：available=0 时卖 → 1001，零副作用', async () => {
  const { token, playerId } = await login(`sell-over-${(seq += 1)}`);
  const beforeQuota = await quotaUsed(playerId, 'merchant_village', day());
  const res = await call('economy.sell', { itemId: ITEM, count: 1, merchantId: 'merchant_village' }, { token });
  assert.equal(res.c, 1001, `超卖应被影子校验拒绝: ${JSON.stringify(res)}`);
  const afterSum = await ledgerSum(playerId, ITEM);
  assert.equal(afterSum.sold, 0, '失败不得写卖出流水');
  assert.equal(await quotaUsed(playerId, 'merchant_village', day()), beforeQuota, '失败不得扣限购');
});

test('sell-3 重复 rid：幂等重放返回相同结果，不重复扣账', async () => {
  const { token, playerId } = await login(`sell-rid-${(seq += 1)}`);
  await recordGain(playerId, ITEM, 5, 'salvage');
  const r = rid('replay');
  const first = await call('economy.sell', { itemId: ITEM, count: 1, merchantId: 'merchant_village' }, { token, rid: r });
  assert.equal(first.c, 0, '首次应成功');
  const replay = await call('economy.sell', { itemId: ITEM, count: 1, merchantId: 'merchant_village' }, { token, rid: r });
  assert.equal(replay.c, 0, '同 rid 重放应命中幂等缓存（否则会因 available 减少而 1001）');
  assert.equal(replay.d.herbDelta, first.d.herbDelta, '重放结果应与首次一致');
  assert.equal((await ledgerSum(playerId, ITEM)).sold, 1, '重放不得重复写流水');
});

test('sell-4 限购尽：merchant_black 卖满 5 次后第 6 次 → 3002', async () => {
  const { token, playerId } = await login(`sell-quota-${(seq += 1)}`);
  await recordGain(playerId, ITEM, 10, 'salvage');
  for (let i = 0; i < 5; i += 1) {
    const res = await call('economy.sell', { itemId: ITEM, count: 1, merchantId: 'merchant_black' }, { token });
    assert.equal(res.c, 0, `第 ${i + 1} 次卖出应成功`);
  }
  const sixth = await call('economy.sell', { itemId: ITEM, count: 1, merchantId: 'merchant_black' }, { token });
  assert.equal(sixth.c, 3002, `限购尽应返回 3002: ${JSON.stringify(sixth)}`);
});

test('sell-5 失败零副作用（V-406.c）：前后快照相等', async () => {
  const { token, playerId } = await login(`sell-clean-${(seq += 1)}`);
  await recordGain(playerId, ITEM, 1, 'salvage');
  const ok = await call('economy.sell', { itemId: ITEM, count: 1, merchantId: 'merchant_village' }, { token });
  assert.equal(ok.c, 0, '先成功卖 1 个');
  const before = { sum: await ledgerSum(playerId, ITEM), quota: await quotaUsed(playerId, 'merchant_village', day()) };
  const bad = await call('economy.sell', { itemId: ITEM, count: 3, merchantId: 'merchant_village' }, { token });
  assert.equal(bad.c, 1001, '超卖应失败');
  assert.deepEqual(await ledgerSum(playerId, ITEM), before.sum, '失败前后影子账本快照相等');
  assert.equal(await quotaUsed(playerId, 'merchant_village', day()), before.quota, '失败前后限购快照相等');
});
