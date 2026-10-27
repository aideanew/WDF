/**
 * `cfg` 提示集成测试（plan-v009 裁决 2 / F-42a）
 *
 * 背景：契约 `RpcResponse.cfg?: string` 声明了「configVersion 不一致 → 响应附带最新 cfg」，
 * 客户端 `RpcClient.ts:81` 也一直在发 `m.cfg`，但服务端 `grep -rn "cfg:" server/src` **零命中**
 * —— 发得出去、声明得出、注释写得下，唯独没人实现。
 *
 * 本文件覆盖 5 条断言：
 *  1. 纯函数三条分支：失败不修饰 / 一致不修饰 / 服务端没版本不修饰
 *  2. cfg 一致 → 字段不出现（避免噪声）
 *  3. cfg 不一致 → 带 cfg，**且 c 仍为 0**（裁决口径：只做提示，不拒请求）
 *  4. 失败响应不带 cfg（优先暴露真实错误）
 *  5. **幂等缓存里不含 hint** —— 缓存一条响应后改服务端版本再重放，
 *     重放的 hint 必须是**新版本**，不是落缓存时的旧版本
 *
 * 第 5 条是决定性的，而且**它第一次跑就抓到了两个不同的失败形态**：
 *  a) 若 hint 被写进幂等缓存（`gateway/idempotency.ts` 会存整个响应），
 *     一条 24h 前的缓存会把当时的 configVersion 当成"最新"回给客户端，客户端永远升不上去；
 *  b) 幂等命中走的是 `return hit` **提前返回**，会直接绕过末尾统一加 hint 的那段代码
 *     —— 第一次实现就是踩的这个（实测 `cfg === undefined`）。
 * 修法：把 hint 抽成 `withCfgHint()`，**两条返回路径都经过它**，且缓存里只存业务结果。
 *
 * ⚠ 用例顺序是有意的：`config_release` 表没有删除接口，一旦登记就影响后续所有请求
 * （`activeConfigVersion` 一律以表为准）。所以**所有写表动作放在最后一个用例**。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_VERSION, CLIENT_VERSION } from '../fixtures/version.mjs';

process.env.WDF_DB_DIR = ':memory:';
process.env.WDF_AUTH_MODE = 'dev';
process.env.WDF_TOKEN_SECRET = 'test-secret-用于-cfg-提示测试';

const { initDb, closeDb } = await import('../../server/src/core/db.ts');
const { handleRpc } = await import('../../server/src/gateway/rpc.ts');
const { attachCfgHint } = await import('../../server/src/gateway/version.ts');
const { upsertRelease } = await import('../../server/src/modules/config/repo.ts');
const { invalidateConfigCache } = await import('../../server/src/modules/config/service.ts');

await initDb();
test.after(async () => {
  await closeDb();
});

const CV = CLIENT_VERSION;
const CFG = CONFIG_VERSION;
const C_OK = 0;
const C_NOT_LOGGED_IN = 2001;
const STALE = 'a1b2c3d4e5f60718'; // 一个肯定不是当前值的 configVersion

let seq = 0;
const rid = (tag) => `ch-${tag}-${(seq += 1)}`;

function call(a, p = {}, opts = {}) {
  const m = { rid: opts.rid ?? rid('m'), cv: CV, cfg: opts.cfg ?? CFG, sv: 1, plat: 'wechat' };
  const ctx = opts.token ? { token: opts.token } : {};
  return handleRpc({ a, p, m }, ctx);
}

async function login(suffix) {
  const res = await call('account.login', { code: `ch-test-${suffix}`, plat: 'wechat' });
  assert.equal(res.c, C_OK, 'account.login failed: ' + JSON.stringify(res));
  return { token: res.d.token, pid: res.d.playerId };
}

// ───────────────────────── 纯函数 ─────────────────────────

test('cfg 1：attachCfgHint 三条分支（失败不修饰 / 一致不修饰 / 服务端无版本不修饰）', () => {
  const ok = { c: 0, d: { x: 1 }, t: 1 };

  // 失败响应：原样返回，不加 cfg
  const failed = attachCfgHint({ c: 1001, msg: 'bad', t: 1 }, STALE, CFG);
  assert.equal('cfg' in failed, false, '失败响应不该被修饰');

  // 一致：字段不出现
  const same = attachCfgHint(ok, CFG, CFG);
  assert.equal('cfg' in same, false, 'cfg 一致时字段不该出现（避免噪声）');

  // 客户端没报 cfg（undefined）：视为不一致 → 补上
  const missing = attachCfgHint(ok, undefined, CFG);
  assert.equal(missing.cfg, CFG, '客户端没报 cfg 时应补提示');

  // 服务端没拿到版本：宁可不说
  const noLatest = attachCfgHint(ok, STALE, '');
  assert.equal('cfg' in noLatest, false, '服务端拿不到版本时不该瞎补');

  // 不一致：补上，且业务字段完好
  const hint = attachCfgHint(ok, STALE, CFG);
  assert.equal(hint.cfg, CFG);
  assert.equal(hint.c, 0);
  assert.deepEqual(hint.d, { x: 1 }, '修饰不能动业务数据');
});

// ───────────────────────── 网关集成 ─────────────────────────

test('cfg 2：客户端 cfg 与当前一致 → 响应里没有 cfg 字段', async () => {
  const res = await call('config.manifest', {}, { cfg: CFG });
  assert.equal(res.c, C_OK);
  assert.equal('cfg' in res, false, '一致时不该出现 cfg 字段');
});

test('cfg 3：客户端 cfg 过期 → 响应附带最新 cfg，且 c 仍为 0（只提示，不拒请求）', async () => {
  const res = await call('config.manifest', {}, { cfg: STALE });
  assert.equal(res.c, C_OK, '裁决口径：只做提示，不拒请求 —— 旧配置算出的结果未必错');
  assert.equal(res.cfg, CFG, '必须附带服务端当前 configVersion');
  assert.equal(res.d.configVersion, CFG, '业务数据不受影响');
});

test('cfg 4：失败响应不带 cfg（优先暴露真实错误，不混入版本提示）', async () => {
  const res = await call('save.pull', {}, { cfg: STALE }); // 无令牌 → 2001
  assert.equal(res.c, C_NOT_LOGGED_IN);
  assert.equal('cfg' in res, false, '失败响应不该被版本提示混淆');
});

test('cfg 5（决定性）：幂等缓存里不含 hint —— 改版本后重放，hint 必须是新版本', async () => {
  const { token } = await login(`idem-${Date.now()}`);
  const R = rid('push');

  // 1) 首次提交，cfg 过期 → hint = 当前生成的版本
  const first = await call('save.push', {
    baseRevision: 0,
    checksum: 111,
    snapshot: { modules: {}, schemaVersion: 1 },
  }, { token, rid: R, cfg: STALE });
  assert.equal(first.c, C_OK, 'save.push failed: ' + JSON.stringify(first));
  assert.equal(first.d.accepted, true);
  assert.equal(first.cfg, CFG, '首次响应应带当前版本提示');

  // 2) 登记一条新的发布记录（模拟服务端配置升级），失效缓存
  const NEW_VERSION = 'ffffeeeeddddcccc';
  await upsertRelease({ version: NEW_VERSION, minClient: 'v0.0.1', packUrl: null });
  invalidateConfigCache();

  // 3) 同 rid 重放：业务结果走幂等缓存，但 hint 必须现算成新版本
  const replay = await call('save.push', {
    baseRevision: 0,
    checksum: 111,
    snapshot: { modules: {}, schemaVersion: 1 },
  }, { token, rid: R, cfg: STALE });

  assert.equal(replay.c, C_OK, '幂等重放应返回首次成功结果');
  assert.deepEqual(replay.d, first.d, '业务结果必须与首次一致（缓存生效）');
  assert.equal(
    replay.cfg,
    NEW_VERSION,
    `hint 必须现算：期望 ${NEW_VERSION}，实际 ${replay.cfg}。` +
      '若等于旧值说明 cfg 被写进了幂等缓存 —— 那客户端永远升不上去，比不实现更糟',
  );

  // 4) 客户端已是最新版本 → 不再有 hint
  const fresh = await call('config.manifest', {}, { cfg: NEW_VERSION });
  assert.equal('cfg' in fresh, false, '版本一致后不该再有提示');
});
