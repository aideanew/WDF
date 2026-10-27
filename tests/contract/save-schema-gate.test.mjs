/**
 * 存档 schema 版本的**到期提醒**（ADR-0013 §7.3 硬触发）
 *
 * ## 这个文件为什么存在
 *
 * ADR-0013 的裁决是「**服务端完全不管 `sv`**」+「**云档版本不符保持报错**」，
 * 也就是维持现状、零行为改动。这个裁决**在当前版本是安全的**，因为：
 *
 *   - `SAVE_SCHEMA_VERSION` 当前是 `1`，`MIGRATIONS` 链是空的；
 *   - 根本不存在 v1→v2 的迁移，`migrate()` 的 `too-new` / `broken` 两态都不会被触发。
 *
 * **但它有到期日**：`SAVE_SCHEMA_VERSION` 一旦从 `1` 变成 `2`，三条缺口同时生效：
 *   - G-3 服务端不校验 `sv` → 旧客户端能把 v1 档推上云端**覆盖** v2 档；
 *   - G-1 `migrate()` 零调用 → 没有迁移能力；
 *   - G-2 云档版本不符直接报错 → 换设备的玩家载入失败。
 *
 * 而"存档被覆盖"是**不可恢复**的（云端只有一份）。
 *
 * ## 这个文件在干什么
 *
 * 1. **到期提醒**：断言 `SAVE_SCHEMA_VERSION === 1`。谁把它改成 2，这条立刻红灯，
 *    并在失败信息里指向 ADR-0013 §7 —— **必须先重开 ADR 并实现迁移接线，才能把这个红灯改绿**。
 * 2. **把已接受的行为锁成断言**：服务端不校验 `sv`、缺 `schemaVersion` 按 1 存。
 *    这样将来有人"顺手"给服务端加校验时，会先撞上测试，从而必须回来看 ADR-0013 而不是默默改口径。
 *
 * > 这两条都是「让忘记的代价变高」，不是「让代码变好」。ADR-0013 的裁决就是不改代码。
 */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_VERSION, CLIENT_VERSION } from '../fixtures/version.mjs';

process.env.WDF_DB_DIR = ':memory:';
process.env.WDF_AUTH_MODE = 'dev';
process.env.WDF_TOKEN_SECRET = 'test-secret-用于存档版本门禁';

const { initDb, closeDb } = await import('../../server/src/core/db.ts');
const { handleRpc } = await import('../../server/src/gateway/rpc.ts');
const { SAVE_SCHEMA_VERSION, SAVE_MIGRATION_IS_EMPTY, migrate } =
  await import('../../packages/game-core/src/save/index.ts');

await initDb();
after(async () => {
  await closeDb();
});

const CV = CLIENT_VERSION;
const CFG = CONFIG_VERSION;
const ADR = 'docs/03_solution/decisions/ADR-0013-save-schema-version.md §7';

let seq = 0;
const rid = (tag) => `sv-${tag}-${(seq += 1)}`;

/** `sv` 显式可传，用来证明服务端确实不看它。 */
function call(a, p = {}, opts = {}) {
  const m = { rid: opts.rid ?? rid('m'), cv: CV, cfg: CFG, sv: opts.sv ?? SAVE_SCHEMA_VERSION, plat: 'wechat' };
  return handleRpc({ a, p, m }, opts.token ? { token: opts.token } : {});
}

async function login(suffix) {
  const res = await call('account.login', { code: `sv-test-${suffix}`, plat: 'wechat' });
  assert.equal(res.c, 0, 'account.login failed: ' + JSON.stringify(res));
  return res.d.token;
}

// ───────────────────── 1. 到期提醒（核心） ─────────────────────

test('sv-门禁 1【到期提醒】：SAVE_SCHEMA_VERSION 必须仍为 1', () => {
  assert.equal(
    SAVE_SCHEMA_VERSION,
    1,
    `SAVE_SCHEMA_VERSION 已变成 ${SAVE_SCHEMA_VERSION}，但 ADR-0013 的裁决前提是「版本恒为 1、无迁移链」。` +
      `\n\n⚠ 停手。请先重开 ${ADR}：` +
      `\n  1) 服务端要不要校验 sv（裁决目前是 A：不管）；` +
      `\n  2) 客户端要不要接 migrate()（裁决目前是：不接，云档不符保持报错）；` +
      `\n  3) 两条都不做的话，旧客户端会把旧档推上云端**覆盖**新档 —— 存档不可恢复。` +
      `\n\n处理完 ADR 之后，把本断言改成新版本号，并补齐迁移链与测试。`,
  );
});

test('sv-门禁 2【到期提醒】：MIGRATIONS 链为空（没有 v1→v2 就说明现在切版本等于裸奔）', () => {
  assert.equal(
    SAVE_MIGRATION_IS_EMPTY,
    true,
    `MIGRATIONS 链已非空，但 ADR-0013 的裁决是「客户端不接 migrate()」——` +
      `\n写了迁移函数却没人调，等于代码里躺着一段永远不会执行的逻辑。` +
      `\n请重开 ${ADR}，先决定要不要接上再往上加迁移。`,
  );
});

test('sv-门禁 3：migrate() 三态可用（能力在，只是没人接 —— 这是 G-1 的事实基线）', () => {
  // ★ base 用 `SAVE_SCHEMA_VERSION` 构造，**不写死 1**：
  //   本用例只测「三态语义」，不该被版本号变化连坐。版本变了由用例 1 单独报警，
  //   这样红灯永远指向一个原因（精确失败），而不是一串模板消息。
  const base = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    configVersion: CFG,
    saveId: 's1',
    revision: 1,
    savedAt: 1,
    modules: {},
    checksum: 0,
  };
  // 同版本：ok
  assert.equal(migrate(base).status, 'ok');
  // 比当前新：too-new（绝不覆盖）
  const tooNew = migrate({ ...base, schemaVersion: SAVE_SCHEMA_VERSION + 1 });
  assert.equal(tooNew.status, 'too-new');
  // 比当前旧但无迁移函数：broken（MIGRATIONS 链空 → 任何降版本都无路可走）
  const broken = migrate({ ...base, schemaVersion: 0 });
  assert.equal(broken.status, 'broken');
  assert.equal(broken.from, 0);
});

// ───────────────────── 2. 锁定已接受的行为 ─────────────────────

test('sv-门禁 4：服务端**不校验** m.sv（裁决 A 的事实锁定；传离谱的 sv 也照常放行）', async () => {
  const token = await login(`sv-ignore-${Date.now()}`);
  for (const sv of [0, 1, 99, -1]) {
    const res = await call('config.manifest', {}, { token, sv });
    assert.equal(res.c, 0, `sv=${sv} 被拒绝了 —— 说明服务端开始校验 sv，与 ADR-0013 裁决 A 冲突。` +
      `若这是有意的，请先重开 ${ADR}`);
  }
});

test('sv-门禁 5：缺 schemaVersion 的存档被**静默按 1 存**（已裁决行为，不是疏漏）', async () => {
  const token = await login(`sv-missing-${Date.now()}`);
  const res = await call('save.push', {
    baseRevision: 0,
    checksum: 4242,
    // ★ 故意不带 schemaVersion
    snapshot: { modules: {}, configVersion: CFG },
  }, { token, rid: rid('push') });
  assert.equal(res.c, 0, 'save.push failed: ' + JSON.stringify(res));
  assert.equal(res.d.accepted, true);

  const pulled = await call('save.pull', {}, { token });
  assert.equal(pulled.c, 0);
  assert.equal(
    pulled.d.summary.schemaVersion,
    1,
    `缺 schemaVersion 时服务端按 1 存 —— 这是 ADR-0013 §7 裁决保留的行为（同 F-39 那类"静默容错"）。` +
      `\n如果这里变成了报错，说明有人改了口径，请先回看 ${ADR}。`,
  );
});
