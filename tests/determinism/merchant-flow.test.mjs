/**
 * 客户端商人用例回归（TASK-4007）：EconomyModel 的「单价复算 / 可卖列表 / 落盘」闭环。
 *
 * EconomyModel 不依赖 cc（只依赖 generated/game-core 的确定性核心与存档封印），Node 直载可测，
 * 因此卡面验收 b（金币增加）的**核心语义不需要录屏就能自动化**（G-07 替代证据）：
 *  - 单价只经 sellValue（D-16 公式单点），三档区域与既有语义一致；
 *  - 可卖列表只含 recycle_bp>0 且持有 >0，排序确定（单价降序、id 升序）；
 *  - applySell：背包 −count、`modules.wallet.gold` +herbDelta、revision+1，且 verifySave 通过；
 *  - 卖光删除键；入参不可变；JSON 往返（模拟杀进程）后状态保留；
 *  - goldOf 对缺键/非法值容错为 0。
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const {
  unitPrice, sellableRows, applySell, goldOf, merchantOptions, quotaText,
} = await import('../../client/assets/scripts/features/economy/model/EconomyModel.ts');
const { SAVE_SCHEMA_VERSION, sealSave, verifySave } = await import('../../packages/game-core/src/save/index.ts');

const CV = '38fc1faf915f8bbf';

function freshSave(modules = {}) {
  return sealSave({
    schemaVersion: SAVE_SCHEMA_VERSION,
    configVersion: CV,
    saveId: 'test-save',
    revision: 0,
    savedAt: 1_700_000_000_000,
    modules,
  });
}

const ITEMS = [
  { id: 'item_a', name: '漂流木' },
  { id: 'item_b', name: '铁片' },
  { id: 'item_c', name: '无用石' },
];
const PRICES = [
  { id: 'item_a', base_price: 10, recycle_bp: 5 },
  { id: 'item_b', base_price: 24000, recycle_bp: 12000 },
  { id: 'item_c', base_price: 100, recycle_bp: 0 }, // 无回收价
];

test('单价只经 sellValue：三档区域与既有回收语义一致（D-16）', () => {
  assert.equal(unitPrice(10, 5, 10000), 5);      // 渔村 100%
  assert.equal(unitPrice(10, 5, 8500), 4);       // 流浪 85% → floor(4.25)
  assert.equal(unitPrice(10, 5, 13000), 6);      // 黑市 130% → floor(6.5)
  assert.equal(unitPrice(24000, 12000, 10000), 12000);
});

test('可卖列表：过滤无回收价/零持有/未知 id，排序确定', () => {
  const inv = { item_a: 3, item_b: 1, item_c: 9, ghost: 5 };
  const rows = sellableRows(inv, ITEMS, PRICES, 10000);
  assert.deepEqual(rows.map((r) => r.itemId), ['item_b', 'item_a'], '单价降序');
  assert.equal(rows[0].unit, 12000);
  assert.equal(rows[1].count, 3);
  assert.equal(rows[1].name, '漂流木');
});

test('applySell：背包 −count + 金币 +herbDelta + revision+1，且封印可验', () => {
  const save = freshSave({ inventory: { item_a: 3 }, wallet: { gold: 40 } });
  const next = applySell(save, 'item_a', 2, 10);
  assert.equal(next.modules.inventory.item_a, 1);
  assert.equal(next.modules.wallet.gold, 50);
  assert.equal(next.revision, 1);
  assert.equal(verifySave(next), true, 'sealSave 产物必须通过 verify');
});

test('applySell：卖光删除键，金币按 herbDelta 累加', () => {
  const save = freshSave({ inventory: { item_a: 1 } });
  const next = applySell(save, 'item_a', 1, 5);
  assert.equal('item_a' in next.modules.inventory, false, '扣到 0 应删键');
  assert.equal(next.modules.wallet.gold, 5);
});

test('applySell 不改入参（不可变）', () => {
  const save = freshSave({ inventory: { item_a: 2 }, wallet: { gold: 0 } });
  const before = JSON.stringify(save);
  applySell(save, 'item_a', 1, 5);
  assert.equal(JSON.stringify(save), before, '原存档对象不得被修改');
});

test('JSON 往返后状态保留（模拟杀进程重载）', () => {
  const save = freshSave({ inventory: { item_b: 2 } });
  const next = applySell(save, 'item_b', 1, 12000);
  const reloaded = JSON.parse(JSON.stringify(next));
  assert.equal(verifySave(reloaded), true);
  assert.equal(reloaded.modules.inventory.item_b, 1);
  assert.equal(goldOf(reloaded), 12000);
});

test('goldOf 容错：null / 缺键 / 非法值 → 0', () => {
  assert.equal(goldOf(null), 0);
  assert.equal(goldOf(freshSave({})), 0);
  assert.equal(goldOf(freshSave({ wallet: { gold: 'x' } })), 0);
  assert.equal(goldOf(freshSave({ wallet: { gold: -5 } })), 0);
  assert.equal(goldOf(freshSave({ wallet: { gold: 7.9 } })), 7);
});

test('merchantOptions 与 quotaText（D-17 顶部额度文案）', () => {
  const rows = [
    { id: 'merchant_village', name: '渔村商人', region_bp: 10000, daily_limit: 20 },
    { id: 'merchant_black', name: '黑市', region_bp: 13000, daily_limit: 5 },
  ];
  assert.equal(merchantOptions(rows).length, 2);
  assert.equal(quotaText(18, 20), '今日剩余额度 18 / 20');
  assert.equal(quotaText(-3, 20), '今日剩余额度 0 / 20');
});
