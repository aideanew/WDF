/**
 * 服务端集成测试：TASK-1401 开新区 + 封号（AT-1401）。
 *
 * 不走 HTTP：直接调 handleRpc + ops 的 service 函数（CLI 只是薄包装，走同一 service）。
 * PGlite 内存库（WDF_DB_DIR=:memory:），每个进程一份干净数据。
 *
 * 覆盖：
 *  - 表空时 currentRegion() 回落到 s1 并打告警（D-53 约束①②）
 *  - open-region 后 is_current 唯一、新玩家落在当前区
 *  - ban-player 后登录返 2003、audit_log ≥2 条（ban_player + login_banned）
 *  - 突变验证：部分唯一索引是「至多一区 current」的约束来源（删索引则约束消失）
 */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_VERSION, CLIENT_VERSION } from '../fixtures/version.mjs';

// 必须在 import db.ts 之前设定：db.ts 在加载时读取环境变量
process.env.WDF_DB_DIR = ':memory:';
process.env.WDF_AUTH_MODE = 'dev';
process.env.WDF_TOKEN_SECRET = 'test-secret-用于 ops 集成测试';
process.env.WDF_DEFAULT_REGION = 's1'; // 显式定回落值，断言可复跑

const { initDb, closeDb, q } = await import('../../server/src/core/db.ts');
const { handleRpc } = await import('../../server/src/gateway/rpc.ts');
const { openNewRegion, banUntil } = await import('../../server/src/modules/ops/service.ts');
const { currentRegion } = await import('../../server/src/modules/account/repo.ts');

await initDb();
after(async () => {
  await closeDb();
});

const CV = CLIENT_VERSION;
const CFG = CONFIG_VERSION;
let seq = 0;
const rid = (tag) => `test-${tag}-${(seq += 1)}`;

function call(a, p = {}, opts = {}) {
  const m = { rid: opts.rid ?? rid('m'), cv: CV, cfg: CFG, sv: 1, plat: 'wechat' };
  const ctx = opts.token ? { token: opts.token } : {};
  return handleRpc({ a, p, m }, ctx);
}

async function login(code) {
  const res = await call('account.login', { code, plat: 'wechat' });
  return res; // 不 assert c=0，调用方按需判（登录被拒时 c=2003）
}

test('AT-1401-1 表空时 currentRegion 回落 s1 并打告警（D-53）', async () => {
  // 尚未开任何区 → regions 表空 → 回落到 WDF_DEFAULT_REGION ?? 's1'
  const warn = [];
  const orig = console.warn;
  console.warn = (m) => warn.push(String(m));
  try {
    const region = await currentRegion();
    assert.equal(region, 's1', '表空应回落 s1');
  } finally {
    console.warn = orig;
  }
  assert.ok(
    warn.some((m) => m.includes('regions 表无当前开放区')),
    '回落必须打告警（D-53 约束②，不允许静默）',
  );
});

test('AT-1401-2 开新区后 is_current 唯一、新玩家落在当前区', async () => {
  await openNewRegion('region_test', '测试区', 'ops');

  // is_current 唯一：全表恰好一行 is_current=true，且是 region_test
  const currents = await q('SELECT id FROM regions WHERE is_current');
  assert.equal(currents.length, 1, 'is_current 必须恰好一行');
  assert.equal(currents[0].id, 'region_test', '当前区应为刚开的 region_test');

  // 新玩家落在当前区
  const res = await login(`region-new-${Date.now()}`);
  assert.equal(res.c, 0, '新玩家登录应成功');
  assert.equal(res.d.region, 'region_test', '新玩家 region 应等于当前开放区');
});

test('AT-1401-3 封号后登录返 2003 且 audit_log ≥2 条', async () => {
  const code = `ban-${Date.now()}`;
  const res = await login(code);
  assert.equal(res.c, 0, '登录应成功');
  const playerId = res.d.playerId;

  // 封禁至未来某时刻
  const until = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const hit = await banUntil(playerId, until, 'ops');
  assert.equal(hit, 1, '应命中玩家（1 行）');

  // 再登录 → 2003
  const banned = await login(code);
  assert.equal(banned.c, 2003, '封号后登录应返 2003 BANNED');
  assert.match(banned.msg, /banned until/, '错误信息应带截止时间');

  // audit_log ≥2 条：ban_player + login_banned
  const audits = await q(
    "SELECT action FROM audit_log WHERE actor = 'wechat' OR action = 'ban_player'",
  );
  const actions = audits.map((r) => r.action);
  assert.ok(actions.includes('ban_player'), '应有一条 ban_player 审计');
  assert.ok(actions.includes('login_banned'), '应有一条 login_banned 审计');
  assert.ok(audits.length >= 2, `audit_log 应 ≥2 条，实得 ${audits.length}`);
});

test('AT-1401-4 突变验证：部分唯一索引是「至多一区 current」的约束来源', async () => {
  // WITH index：region_test 已是 current，再直接插入一行 is_current=true（模拟误实现）
  // → 违反唯一索引，必须报错。
  let withIndexErr = null;
  try {
    await q(
      "INSERT INTO regions (id, name, is_current) VALUES ('region_bug', 'bug区', true)",
    );
  } catch (e) {
    withIndexErr = e;
  }
  assert.ok(withIndexErr, '有索引时插入第二行 current 必须报错（唯一约束）');

  // MUTATION：删掉部分唯一索引 → 同样的插入不再报错 → 证明约束是索引给的，不是代码自觉。
  await q('DROP INDEX regions_current_idx');
  await q("INSERT INTO regions (id, name, is_current) VALUES ('region_bug2', 'bug区2', true)");
  const twoCurrents = await q('SELECT id FROM regions WHERE is_current');
  assert.equal(twoCurrents.length, 2, '无索引时两行 current 都成功（约束已消失）');

  // 复原：先删掉 bug 行（此刻 index 已删，删行无约束问题），再重建唯一索引 ——
  // 顺序必须先删后建，否则重建索引时 region_bug2 仍 current 会违反唯一约束。
  await q("DELETE FROM regions WHERE id IN ('region_bug', 'region_bug2')");
  await q('CREATE UNIQUE INDEX regions_current_idx ON regions (is_current) WHERE is_current');
  const restored = await q('SELECT id FROM regions WHERE is_current');
  assert.equal(restored.length, 1, '复原后回到单 current');
  assert.equal(restored[0].id, 'region_test', '复原后当前区仍为 region_test');
});
