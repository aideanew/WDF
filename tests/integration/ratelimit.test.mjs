/**
 * 网关限流集成测试（plan-v009 裁决 1 / F-42b）
 *
 * 背景：`ratelimit.ts` 此前只有一行 `MIDDLEWARE = 'ratelimit'` 常量、**全仓零引用**，
 * 限流完全没实现。而 `ACTIONS` 里有 4 个 `auth: false` 的动作
 * （`account.login` / `account.refresh` / `telemetry.track` / `config.manifest`），
 * 它们没有令牌、没有 player 维度约束，任何人可无限调用。
 *
 * 本文件覆盖 9 条断言：
 *  1. 纯函数窗口语义：第 limit 次放行，第 limit+1 次拒绝
 *  2. `retryAfterMs` 指向窗口末尾（不是固定值）
 *  3. 窗口滚过后重新计数
 *  4. 不同 key 互相独立
 *  5. env 阈值覆盖生效
 *  6. **env 写非法值 → 回落默认，不静默关防护**（这条最容易出事）
 *  7. `WDF_RL_..._PER_MIN=0` 才是显式关闭
 *  8. **网关集成：同 IP 超限 → 4001；不同 IP 不受影响**
 *  9. **无 IP 不限流**（不误杀）+ **有令牌的动作不受 IP 限流**
 *
 * 第 6 与第 9 条是本文件的重点：
 *  - 第 6：把 `Number('abc') → NaN → 当成 0 → 关掉限流` 这个经典错误钉死。
 *  - 第 9：证明限流不会误伤 NAT 后的正常玩家（有令牌走 player 维度，不走 IP 维度）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_VERSION, CLIENT_VERSION } from '../fixtures/version.mjs';

process.env.WDF_DB_DIR = ':memory:';
process.env.WDF_AUTH_MODE = 'dev';
process.env.WDF_TOKEN_SECRET = 'test-secret-用于限流测试';

const { initDb, closeDb } = await import('../../server/src/core/db.ts');
const { handleRpc } = await import('../../server/src/gateway/rpc.ts');
const { hit, checkGatewayRate, limitPerMinFor, resetGatewayRate, rateKeyCount, RATE_LIMIT_MAX_KEYS } =
  await import('../../server/src/gateway/ratelimit.ts');

await initDb();
test.after(async () => {
  await closeDb();
});

const CV = CLIENT_VERSION;
const CFG = CONFIG_VERSION;
const C_OK = 0;
const C_RATE_LIMITED = 4001;

const WINDOW = 60_000;
/** 固定时间锚点，避免测试跨真实窗口边界抖动。 */
const T0 = 1_700_000_000_000;

let seq = 0;
const rid = (tag) => `rl-${tag}-${(seq += 1)}`;

function call(a, p = {}, opts = {}) {
  const m = { rid: opts.rid ?? rid('m'), cv: CV, cfg: CFG, sv: 1, plat: 'wechat' };
  const ctx = {};
  if (opts.token) ctx.token = opts.token;
  if (opts.ip) ctx.ip = opts.ip;
  return handleRpc({ a, p, m }, ctx);
}

/**
 * 临时改 env，用完恢复。
 *
 * ★ 必须是 async 且 `await fn()`：若写成同步 `return fn()`，`finally` 会在
 * `fn` 的**第一个 await 处**就执行（此时回调还没跑完），env 被提前还原，
 * 于是"限流阈值只有 3"的用例会静默退化成"用默认 600"、永远测不出限流。
 * 这个坑本文件第 8 条用例踩过一次，修好后留注释。
 */
async function withEnv(pairs, fn) {
  const saved = {};
  for (const k of Object.keys(pairs)) saved[k] = process.env[k];
  for (const [k, v] of Object.entries(pairs)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// ───────────────────────── 纯函数：窗口语义 ─────────────────────────

test('限流 1/2/3：窗口内放行 limit 次，第 limit+1 次拒绝；retryAfterMs 指向窗口末；窗口滚过重新计数', () => {
  resetGatewayRate();
  const key = 'k|1.1.1.1';

  for (let i = 1; i <= 3; i += 1) {
    const d = hit(key, 3, WINDOW, T0);
    assert.equal(d.ok, true, `第 ${i} 次应放行`);
    assert.equal(d.remaining, 3 - i, `第 ${i} 次剩余应为 ${3 - i}`);
  }

  // 第 4 次：拒绝，且 retryAfterMs = 距本窗口结束的毫秒数
  const blocked = hit(key, 3, WINDOW, T0);
  assert.equal(blocked.ok, false, '第 4 次必须拒绝');
  assert.equal(blocked.remaining, 0);
  const windowEnd = Math.floor(T0 / WINDOW) * WINDOW + WINDOW;
  assert.equal(blocked.retryAfterMs, windowEnd - T0, 'retryAfterMs 必须是距窗口结束的真实时长');
  assert.ok(blocked.retryAfterMs > 0 && blocked.retryAfterMs <= WINDOW);

  // 窗口滚过 → 新窗口重新计数
  const next = hit(key, 3, WINDOW, T0 + WINDOW);
  assert.equal(next.ok, true, '新窗口应重新放行');
  assert.equal(next.remaining, 2);
});

test('限流 4：不同 key 互相独立（同 IP 不同动作、不同 IP 同动作都不互相吃配额）', () => {
  resetGatewayRate();
  assert.equal(hit('a|1.1.1.1', 1, WINDOW, T0).ok, true);
  assert.equal(hit('a|1.1.1.1', 1, WINDOW, T0).ok, false, '同 key 第二次必须拒绝');
  assert.equal(hit('b|1.1.1.1', 1, WINDOW, T0).ok, true, '同 IP 不同动作独立');
  assert.equal(hit('a|2.2.2.2', 1, WINDOW, T0).ok, true, '同动作不同 IP 独立');
});

test('桶数量有界：打 20k+ 个不同 key 后不超过上限（防内存被稀疏 IP 打爆）', () => {
  resetGatewayRate();
  const n = RATE_LIMIT_MAX_KEYS + 500;
  for (let i = 0; i < n; i += 1) hit(`flood-${i}|9.9.9.9`, 1, WINDOW, T0);
  const count = rateKeyCount();
  assert.ok(count <= RATE_LIMIT_MAX_KEYS, `桶数量必须 <= ${RATE_LIMIT_MAX_KEYS}，实际 ${count}`);
  assert.ok(count > 0, '清扫不能把桶清空到失效');
});

// ───────────────────────── env 阈值口径 ─────────────────────────

test('限流 5：优先级 动作级 env > 全局 env > 内置动作默认 > 内置默认', async () => {
  // 只有全局 env → 全局 env 生效（**故意**压过 config.manifest 的内置 1200：
  // 运维写「全部收紧」时，启动必经路径不能留后门）
  await withEnv({ WDF_RL_DEFAULT_PER_MIN: '77' }, () => {
    assert.equal(limitPerMinFor('telemetry.track'), 77, '未单独配置的动作应用全局 env');
    assert.equal(limitPerMinFor('config.manifest'), 77, '全局 env 必须压过内置动作默认（否则一键收紧会漏掉它）');
  });

  // 动作级 env 最高
  await withEnv({ WDF_RL_DEFAULT_PER_MIN: '77', WDF_RL_ACCOUNT_LOGIN_PER_MIN: '5' }, () => {
    assert.equal(limitPerMinFor('account.login'), 5, '动作级 env 优先级最高');
    assert.equal(limitPerMinFor('telemetry.track'), 77, '其他动作仍用全局 env');
  });

  // 都没有 env → 内置默认：config.manifest 1200，其余 600
  await withEnv({ WDF_RL_DEFAULT_PER_MIN: undefined, WDF_RL_CONFIG_MANIFEST_PER_MIN: undefined }, () => {
    assert.equal(limitPerMinFor('config.manifest'), 1200, '内置动作默认：启动必经路径放宽到 20 QPS');
    assert.equal(limitPerMinFor('telemetry.track'), 600, '其余动作 10 QPS');
  });

  // 点号/连字符转下划线：account.login → ACCOUNT_LOGIN
  await withEnv({ WDF_RL_DEFAULT_PER_MIN: undefined, WDF_RL_ACCOUNT_LOGIN_PER_MIN: '3' }, () => {
    assert.equal(limitPerMinFor('account.login'), 3);
  });
});

test('限流 6：env 写非法值必须回落默认，绝不静默关掉防护（Number("abc")=NaN / Number("  ")=0 陷阱）', async () => {
  for (const bad of ['abc', '-1', 'NaN', '   ', '']) {
    await withEnv({ WDF_RL_DEFAULT_PER_MIN: bad }, () => {
      const n = limitPerMinFor('telemetry.track');
      assert.ok(Number.isFinite(n) && n > 0, `非法值 "${bad}" 回落到了 ${n}，必须 > 0`);
      assert.equal(n, 600, `非法值 "${bad}" 应回落内置默认 600，实际 ${n}`);
    });
  }
});

test('限流 7：只有显式写 0 才是关闭限流', async () => {
  await withEnv({ WDF_RL_TELEMETRY_TRACK_PER_MIN: '0' }, () => {
    assert.equal(limitPerMinFor('telemetry.track'), 0);
    const d = checkGatewayRate('telemetry.track', '1.1.1.1', T0);
    assert.equal(d, null, '0 = 不限流，返回 null');
  });
});

// ───────────────────────── 网关集成 ─────────────────────────

test('限流 8：同 IP 超限 → 4001；不同 IP 不受影响（config.manifest 是 auth:false）', async () => {
  resetGatewayRate();
  const IP = '203.0.113.7';

  await withEnv({ WDF_RL_CONFIG_MANIFEST_PER_MIN: '3' }, async () => {
    for (let i = 1; i <= 3; i += 1) {
      const ok = await call('config.manifest', {}, { ip: IP });
      assert.equal(ok.c, C_OK, `第 ${i} 次应放行，实际 ${JSON.stringify(ok)}`);
    }
    const blocked = await call('config.manifest', {}, { ip: IP });
    assert.equal(blocked.c, C_RATE_LIMITED, `第 4 次必须 4001，实际 ${JSON.stringify(blocked)}`);
    assert.match(blocked.msg, /rate limited/, '错误信息应说明是限流');

    // 换 IP：不受影响（证明 key 里有 IP 维度）
    const other = await call('config.manifest', {}, { ip: '203.0.113.8' });
    assert.equal(other.c, C_OK, '不同 IP 不应被连坐');
  });
});

test('限流 9：无 IP 不限流（不误杀）；有令牌的动作不受 IP 维度限流', async () => {
  resetGatewayRate();

  // (a) 拿不到 IP → 不限流。部署层没透传 IP 是配置问题，业务层不该猜一个 key 出来。
  await withEnv({ WDF_RL_ACCOUNT_LOGIN_PER_MIN: '1' }, async () => {
    for (let i = 0; i < 5; i += 1) {
      const r = await call('account.login', { code: `rl-noip-${i}-${Date.now()}`, plat: 'wechat' });
      assert.equal(r.c, C_OK, '无 IP 时不应触发限流');
    }
  });

  // (b) 有令牌的动作（save.pull 是 auth:true）即使同 IP 连打也不走 IP 限流
  const login = await call('account.login', { code: `rl-token-${Date.now()}`, plat: 'wechat' });
  assert.equal(login.c, C_OK);
  const token = login.d.token;
  const IP = '198.51.100.9';

  await withEnv({ WDF_RL_DEFAULT_PER_MIN: '1' }, async () => {
    for (let i = 0; i < 5; i += 1) {
      const r = await call('save.pull', {}, { token, ip: IP });
      assert.notEqual(r.c, C_RATE_LIMITED, `auth:true 的动作不该被 IP 维度限流（第 ${i + 1} 次）`);
    }
  });
});
