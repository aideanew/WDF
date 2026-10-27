/**
 * chest.open 集成测试（TASK-5004 / 5005）
 *
 * 覆盖 7 条断言，对应 plan-v008 缺陷表中的 F-29 / F-31 / F-32 / F-33：
 *  - 用例 1 正常开箱         —— 扣箱 + 发奖 + 存档落地
 *  - 用例 2 箱子不足          —— 1001，且存档与账本**均未变**（同事务回滚，F-33）
 *  - 用例 3 幂等重放          —— 同 rid 返回首次结果，不重复扣
 *  - 用例 4 非箱子物品        —— 1001（木棍 item_0020 不能被当箱子"开"）
 *  - 用例 5 锁当箱子          —— 1001（F-31：item_0068~0071 是锁，不是箱子）
 *  - 用例 6 **账本一致性**    —— 开箱后立刻卖奖励物必须 c=0（F-29 的决定性断言）
 *  - 用例 7 无存档            —— 2001（F-32：旧实现静默返回成功）
 *
 * 用例 6 是本次最关键的一条：它把"开箱不写 ledger_entry"这个隐性缺陷变成显性红灯。
 * 没有它，F-29 可以一直绿着——因为存档里的物品数是够的，只有影子账本对不上。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { q } from '../../server/src/core/db.ts';

process.env.WDF_DB_DIR = ':memory:';
process.env.WDF_AUTH_MODE = 'dev';

const { initDb, closeDb } = await import('../../server/src/core/db.ts');
const { handleRpc } = await import('../../server/src/gateway/rpc.ts');

await initDb();
test.after(async () => { await closeDb(); });

const CV = 'v0.1.0-s1';
const CFG = '16921d30a67a934f';

/** 契约 15 码表里的常量（tests 不直接 import contracts，避免 Node 类型剥离差异）。 */
const C_OK = 0;
const C_BAD_PAYLOAD = 1001;
const C_NOT_LOGGED_IN = 2001;

/** 箱型 → 背包物品 id（`chests.csv` 的 item_id 列）。 */
const CHEST_WOOD = 'item_0065';
const CHEST_COPPER = 'item_0066';
const CHEST_IRON = 'item_0067';
/** 保底奖励（D-27 临时口径，与 service.ts 的 REWARD_ITEM_ID 保持一致）。 */
const REWARD = 'item_0020';

let seq = 0;
const rid = (tag) => `co-${tag}-${(seq += 1)}`;

function call(a, p = {}, opts = {}) {
  const m = { rid: opts.rid ?? rid('m'), cv: CV, cfg: CFG, sv: 1, plat: opts.plat ?? 'wechat' };
  const ctx = opts.token ? { token: opts.token } : {};
  return handleRpc({ a, p, m }, ctx);
}

async function login(suffix) {
  const res = await call('account.login', { code: `co-test-${suffix}`, plat: 'wechat' });
  assert.equal(res.c, C_OK, 'account.login failed: ' + JSON.stringify(res));
  return { token: res.d.token, pid: res.d.playerId };
}

/** 建一个带指定背包的账号，返回 token/pid 与可继续 push 的 revision。 */
async function seed(inventory) {
  const { token, pid } = await login(String((seq += 1)));
  const res = await call('save.push', {
    baseRevision: 0,
    checksum: 12345,
    snapshot: { modules: { inventory } },
  }, { token, rid: rid('push') });
  assert.equal(res.c, C_OK, 'save.push failed: ' + JSON.stringify(res));
  assert.equal(res.d.accepted, true, 'save.push not accepted: ' + JSON.stringify(res.d));
  return { token, pid };
}

async function inventoryOf(token) {
  const res = await call('save.pull', {}, { token });
  assert.equal(res.c, C_OK, 'save.pull failed: ' + JSON.stringify(res));
  return res.d.snapshot.modules.inventory ?? {};
}

/** 直接查账本，绕开业务层，验证"到底写没写流水"。 */
async function ledgerRows(pid) {
  return q(
    `SELECT asset, delta, reason FROM ledger_entry WHERE player_id = $1 ORDER BY id`,
    [pid],
  );
}

// ——————————————————————————————————————————————————————————
// 用例 1：正常开箱
// ——————————————————————————————————————————————————————————
test('chest.open 正常开箱：扣 1 个箱子、得保底奖励、写两条账本', async () => {
  const { token, pid } = await seed({ [CHEST_IRON]: 2 });

  const res = await call('chest.open', { itemId: CHEST_IRON }, { token, rid: rid('open') });
  assert.equal(res.c, C_OK, 'open failed: ' + JSON.stringify(res));
  assert.equal(res.d.success, true);
  assert.deepEqual(res.d.rewards, [{ itemId: REWARD, count: 1 }]);

  const inv = await inventoryOf(token);
  assert.equal(inv[CHEST_IRON], 1, '铁箱扣 1 剩 1');
  assert.equal(inv[REWARD], 1, '获得奖励 1 个');

  // F-29：扣箱 + 发奖各一条流水，reason 统一为动作名，便于按 reason 对账
  const rows = await ledgerRows(pid);
  const chest = rows.filter((r) => r.asset === CHEST_IRON);
  const reward = rows.filter((r) => r.asset === REWARD);
  assert.equal(chest.length, 1, '扣箱必须写 1 条流水');
  assert.equal(Number(chest[0].delta), -1, '扣箱流水 delta 必须为负');
  assert.equal(chest[0].reason, 'chest.open');
  assert.equal(reward.length, 1, '发奖必须写 1 条流水');
  assert.equal(Number(reward[0].delta), 1, '发奖流水 delta 必须为正');
  assert.equal(reward[0].reason, 'chest.open');
});

// ——————————————————————————————————————————————————————————
// 用例 2：箱子不足 —— 必须整体回滚，不能"扣了别的 / 记了账又没落地"
// ——————————————————————————————————————————————————————————
test('chest.open 箱子不足：报 1001，且存档与账本均无变化', async () => {
  const { token, pid } = await seed({ [CHEST_WOOD]: 1 });

  const res = await call('chest.open', { itemId: CHEST_IRON }, { token, rid: rid('open') });
  assert.equal(res.c, C_BAD_PAYLOAD, '背包里没有铁箱，应报 1001（旧实现自造 3103）');

  const inv = await inventoryOf(token);
  assert.deepEqual(inv, { [CHEST_WOOD]: 1 }, '失败的请求不能改动存档');
  assert.equal(inv[REWARD], undefined, '失败的请求不能发奖');

  const rows = await ledgerRows(pid);
  assert.deepEqual(rows, [], '失败的请求不能留下任何流水（同事务回滚）');
});

// ——————————————————————————————————————————————————————————
// 用例 3：幂等重放
// ——————————————————————————————————————————————————————————
test('chest.open 幂等重放：同 rid 返回首次结果，不重复扣除', async () => {
  const { token } = await seed({ [CHEST_WOOD]: 1 });
  const myRid = rid('open-idemp');

  const res1 = await call('chest.open', { itemId: CHEST_WOOD }, { token, rid: myRid });
  assert.equal(res1.c, C_OK, 'first open failed: ' + JSON.stringify(res1));

  const res2 = await call('chest.open', { itemId: CHEST_WOOD }, { token, rid: myRid });
  assert.equal(res2.c, C_OK, 'replay 应命中网关幂等缓存，而不是因为没箱子报 1001');
  assert.deepEqual(res1.d, res2.d, '重放必须返回首次结果');

  const inv = await inventoryOf(token);
  assert.equal(inv[CHEST_WOOD], undefined, '木箱被完全扣除（0 时删字段）');
  assert.equal(inv[REWARD], 1, '奖励只给一次');
});

// ——————————————————————————————————————————————————————————
// 用例 4：非箱子物品
// ——————————————————————————————————————————————————————————
test('chest.open 非箱子物品：报 1001，不消耗物品', async () => {
  const { token, pid } = await seed({ [REWARD]: 3 });

  const res = await call('chest.open', { itemId: REWARD }, { token, rid: rid('open') });
  assert.equal(res.c, C_BAD_PAYLOAD, 'item_0020 是木棍不是箱子');

  const inv = await inventoryOf(token);
  assert.equal(inv[REWARD], 3, '非箱子物品不能被消耗');
  assert.deepEqual(await ledgerRows(pid), [], '拒绝请求不能留流水');
});

// ——————————————————————————————————————————————————————————
// 用例 5：四种锁当箱子 —— F-31 的核心断言
// 锁是独立物品（材料与工具总表.md:100「任意箱子 + 一把锁（装上即成）」），
// 不是箱子本身。若不拦，玩家可把 29640 的金锁"开"掉换一个保底奖励。
// ——————————————————————————————————————————————————————————
test('chest.open 把四种锁当箱子：全部报 1001', async () => {
  const LOCKS = ['item_0068', 'item_0069', 'item_0070', 'item_0071']; // 铁/铜/银/金
  const { token, pid } = await seed(Object.fromEntries(LOCKS.map((l) => [l, 1])));

  for (const lock of LOCKS) {
    const res = await call('chest.open', { itemId: lock }, { token, rid: rid('open') });
    assert.equal(res.c, C_BAD_PAYLOAD, `${lock} 是锁不是箱子，必须报 1001`);
  }

  const inv = await inventoryOf(token);
  for (const lock of LOCKS) {
    assert.equal(inv[lock], 1, `${lock} 不能被当作箱子消耗掉`);
  }
  assert.deepEqual(await ledgerRows(pid), [], '全部被拒，账本必须为空');
});

// ——————————————————————————————————————————————————————————
// 用例 6：账本一致性 ★ F-29 的决定性断言
//
// 先证明"没开箱就拿不到账本里的东西"（卖不出去），
// 再证明"开箱之后立刻能卖出去"（账本已写）。
// 这一前一后两条断言合起来，才真正锁死 F-29：
// 如果开箱只改存档不记账，第二条断言必然返回 1001。
// ——————————————————————————————————————————————————————————
test('chest.open 账本一致性：开箱后奖励物立即可回收（F-29）', async () => {
  const { token } = await seed({ [CHEST_WOOD]: 1 });

  // ① 开箱之前：影子账本里 item_0020 的可用量为 0，卖必须失败
  const before = await call('economy.sell', { itemId: REWARD, count: 1, merchantId: 'merchant_village' }, { token, rid: rid('sell') });
  assert.equal(before.c, C_BAD_PAYLOAD, '开箱前影子账本无 item_0020 获得记录，应报 1001（' + JSON.stringify(before) + '）');

  // ② 开箱
  const opened = await call('chest.open', { itemId: CHEST_WOOD }, { token, rid: rid('open') });
  assert.equal(opened.c, C_OK, 'open failed: ' + JSON.stringify(opened));

  // ③ 开箱之后：同一件物品立刻可以回收 → 证明 ledger_entry 真的写了
  const after = await call('economy.sell', { itemId: REWARD, count: 1, merchantId: 'merchant_village' }, { token, rid: rid('sell') });
  assert.equal(after.c, C_OK, '开箱未写账本的症状就在这一行：' + JSON.stringify(after));
  assert.equal(after.d.accepted, true);
  assert.ok(after.d.herbDelta > 0, '回收应产出灵草');

  const inv = await inventoryOf(token);
  assert.equal(inv[REWARD], 1, '卖出不扣背包（MVP 口径：sell 只写流水，背包同步由客户端投影）');
});

// ——————————————————————————————————————————————————————————
// 用例 7：无存档 —— F-32
// 旧实现 `if (!current) return;` 让调用方以为更新成功，实际什么都没发生。
// ——————————————————————————————————————————————————————————
test('chest.open 无存档：报 2001，不再静默成功', async () => {
  const { token } = await login('no-save');

  const res = await call('chest.open', { itemId: CHEST_WOOD }, { token, rid: rid('open') });
  assert.equal(res.c, C_NOT_LOGGED_IN, '无存档应报 2001，不能静默成功');
  assert.equal(res.d, undefined, '错误响应不应带数据体');
});
