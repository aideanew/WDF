/**
 * 客户端开箱用例回归（TASK-5007）：ChestModel 的「投影 → 扣箱 → 发奖 → 封印」闭环。
 *
 * `ChestModel` 不依赖 cc（只依赖 generated/game-core 的存档封印与配置行类型），Node 直载可测。
 * 这是本步**唯一能自动化验证的部分** —— `ChestPanel` 依赖 `'cc'`，Node 天然测不到，
 * 面板行为只能靠 tsc + 结构走查 + 人工录屏（见 plan-v008 `07` §4）。
 *
 * 覆盖：
 *  - 投影只认 `chests.csv` 的 `item_id` 列（四种锁 item_0068~0071 不是箱子，不得出现）；
 *  - 脏数据（负数 / 字符串 / 缺段）按 0 处理，不崩溃、不误判为可开；
 *  - `lock !== 'none'` 必须标 `openable: false`（v1.1 开锁前不得静默当成可开箱）；
 *  - `applyOpen` 扣 1 箱 + 加奖励 + revision+1 + `verifySave` 通过 + 入参不变。
 *
 * 与 `tests/determinism/crafting-flow.test.mjs` 同源范式。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { ChestModel, projectChests, applyOpen, lockText, materialText } = await import(
  '../../client/assets/scripts/features/chest/model/ChestModel.ts'
);
const { SAVE_SCHEMA_VERSION, sealSave, verifySave } = await import(
  '../../packages/game-core/src/save/index.ts'
);

const CHESTS = JSON.parse(readFileSync('client/assets/resources/config/chests.json', 'utf8'));
const ITEMS = Object.fromEntries(
  JSON.parse(readFileSync('client/assets/resources/config/items.json', 'utf8')).map((r) => [r.id, r]),
);

const WOOD = 'item_0065';
const COPPER = 'item_0066';
const IRON = 'item_0067';
/** v1.0 的保底奖励（D-27 临时口径，与服务端 chest/service.ts 的 REWARD_ITEM_ID 一致）。 */
const REWARD = 'item_0020';

function seed(revision, inventory) {
  return sealSave({
    schemaVersion: SAVE_SCHEMA_VERSION,
    configVersion: '16921d30a67a934f',
    saveId: 's_chest_flow_test',
    revision,
    savedAt: 1,
    modules: inventory ? { inventory } : {},
  });
}

// —————————————————————————— 投影 ——————————————————————————

test('投影：只列背包里 count > 0 的箱子，顺序与配置表一致', () => {
  const rows = projectChests({ [IRON]: 2, [WOOD]: 1 }, CHESTS, ITEMS);

  assert.deepEqual(rows.map((r) => r.itemId), [WOOD, IRON], '顺序 = chests.json 行序（木→铜→铁），不排序');
  assert.equal(rows[0].name, ITEMS[WOOD].name, '名称取 items.name，不显示裸 id');
  assert.equal(rows[0].count, 1);
  assert.equal(rows[1].count, 2);
  for (const r of rows) {
    assert.equal(r.lock, 'none');
    assert.equal(r.openable, true, 'v1.0 三箱全无锁 → 全部可开');
  }
});

test('投影：四种锁不是箱子，永不出现（锁是独立物品）', () => {
  // item_0068=铁锁 item_0069=铜锁 item_0070=银锁 item_0071=金锁
  const inventory = { item_0068: 1, item_0069: 1, item_0070: 1, item_0071: 1, [WOOD]: 1 };
  const rows = projectChests(inventory, CHESTS, ITEMS);
  assert.deepEqual(rows.map((r) => r.itemId), [WOOD], '只有 item_0065 是箱子');
});

test('投影：背包里没有箱子 → 空数组（面板走 empty 态）', () => {
  const rows = projectChests({ item_0001: 99, [REWARD]: 5 }, CHESTS, ITEMS);
  assert.deepEqual(rows, [], '有非箱子物品不等于有箱子');
});

test('投影：脏数据不崩溃、不误判为可开（负数 / 字符串 / 缺段 / 非法段）', () => {
  const bad = [
    undefined,
    null,
    [],
    'item_0065',
    42,
    true,
    { [WOOD]: -3 },
    { [WOOD]: '10' },
    { [WOOD]: Number.NaN },
    { [WOOD]: 0 },
  ];
  for (const section of bad) {
    const label = String(JSON.stringify(section));
    assert.deepEqual(projectChests(section, CHESTS, ITEMS), [], `section=${label} 不得投影出箱子`);
  }
});

test('投影：数量向下取整（1.9 个箱子显示为 1）', () => {
  const rows = projectChests({ [WOOD]: 1.9 }, CHESTS, ITEMS);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].count, 1);
});

test('投影：lock !== none 时 openable=false（v1.1 开锁前不得静默当可开箱）', () => {
  const locked = [
    { id: 'chest_wood', material: 'wood', lock: 'iron', smashable: true, size: 1, item_id: WOOD },
  ];
  const rows = projectChests({ [WOOD]: 1 }, locked, ITEMS);
  assert.equal(rows.length, 1, '有锁箱子仍要显示（玩家需要看到它为什么开不了）');
  assert.equal(rows[0].openable, false, '有锁 → 必须禁用开箱按钮');
});

test('投影：配置缺 item_id 的行被跳过（旧产物缺陷，不猜）', () => {
  const broken = [
    { id: 'chest_wood', material: 'wood', lock: 'none', smashable: true, size: 1 },
    { id: 'chest_iron', material: 'iron', lock: 'none', smashable: true, size: 1, item_id: IRON },
  ];
  const rows = projectChests({ [WOOD]: 1, [IRON]: 1 }, broken, ITEMS);
  assert.deepEqual(rows.map((r) => r.itemId), [IRON], '缺 item_id 的行既不显示也不崩');
});

test('文案兜底：未知材质/锁档回落到原值，不上屏 undefined', () => {
  assert.equal(materialText('wood'), '木箱');
  assert.equal(materialText('steel'), 'steel', '未知材质回落原值，避免显示空白');
  assert.equal(lockText('none'), '无锁');
  assert.equal(lockText('mythril'), 'mythril');
});

// —————————————————————————— 真实配置 —— ——————————————————————————

test('真实配置自检：3 箱 item_id 全在 items 表内、lock 全 none', () => {
  assert.equal(CHESTS.length, 3, 'chests.json 行数');
  for (const c of CHESTS) {
    assert.equal(typeof c.item_id, 'string', `${c.id} 缺 item_id`);
    assert.ok(ITEMS[c.item_id], `${c.id}.item_id=${c.item_id} 不在 items 表内`);
    assert.equal(c.lock, 'none', `${c.id} 在 v1.0 必须是无锁`);
  }
});

// —————————————————————————— applyOpen ——————————————————————————

test('applyOpen：扣 1 箱 + 发奖 + revision+1，verifySave 通过，入参不变', () => {
  const before = seed(3, { [IRON]: 2 });
  const next = applyOpen(before, IRON, [{ itemId: REWARD, count: 1 }]);

  assert.notEqual(next, before, '必须产出新档');
  assert.equal(next.revision, 4, 'revision 必须 +1');
  assert.equal(next.modules.inventory[IRON], 1, '铁箱扣 1 剩 1');
  assert.equal(next.modules.inventory[REWARD], 1, '奖励 +1');
  assert.equal(verifySave(next), true, '剥离旧 checksum 后重新封印必须通过校验');

  assert.equal(before.revision, 3, '入参档 revision 不被改动');
  assert.equal(before.modules.inventory[IRON], 2, '入参档库存不被改动');
});

test('applyOpen：最后一个箱子被完全移除，不留 0 值字段', () => {
  const before = seed(0, { [WOOD]: 1 });
  const next = applyOpen(before, WOOD, [{ itemId: REWARD, count: 1 }]);
  assert.equal(next.modules.inventory[WOOD], undefined, '数量归零必须删字段');
  assert.equal(next.modules.inventory[REWARD], 1);
});

test('applyOpen：奖励为空数组 → 只扣箱（服务端返回什么就落什么）', () => {
  const before = seed(1, { [WOOD]: 2 });
  const next = applyOpen(before, WOOD, []);
  assert.equal(next.modules.inventory[WOOD], 1);
  assert.deepEqual(Object.keys(next.modules.inventory), [WOOD], '不得凭空添加物品');
});

test('applyOpen：多件奖励累加，同 id 多次出现累加而非覆盖', () => {
  const before = seed(0, { [WOOD]: 1, [REWARD]: 3 });
  const next = applyOpen(before, WOOD, [
    { itemId: REWARD, count: 2 },
    { itemId: REWARD, count: 5 },
  ]);
  assert.equal(next.modules.inventory[REWARD], 10, '3 + 2 + 5');
});

test('杀进程重启（JSON 往返）后可继续开第二个箱子', () => {
  const first = applyOpen(seed(0, { [WOOD]: 2 }), WOOD, [{ itemId: REWARD, count: 1 }]);
  const reloaded = JSON.parse(JSON.stringify(first));

  assert.equal(verifySave(reloaded), true, '重启后 checksum 仍有效');
  assert.equal(reloaded.revision, 1);
  assert.equal(reloaded.modules.inventory[WOOD], 1);

  const second = applyOpen(reloaded, WOOD, [{ itemId: REWARD, count: 1 }]);
  assert.equal(second.revision, 2, '第二笔 revision 递增');
  assert.equal(second.modules.inventory[REWARD], 2, '奖励累加');
  assert.equal(second.modules.inventory[WOOD], undefined, '箱用完删字段');
});

// —————————————————————————— ChestModel ——————————————————————————

test('ChestModel：project 刷新脏标记，countOf 反映当前持有数', () => {
  const m = new ChestModel();
  assert.equal(m.stateVersion, 0);
  assert.deepEqual(m.rows, []);

  const rows = m.project({ [WOOD]: 2, [IRON]: 1 }, CHESTS, ITEMS);
  assert.equal(rows.length, 2);
  assert.equal(m.stateVersion, 1, '每次 project 递增，供 lateUpdate 脏标记判断');
  assert.equal(m.countOf(WOOD), 2);
  assert.equal(m.countOf(IRON), 1);
  assert.equal(m.countOf(COPPER), 0, '没有的箱子返回 0');

  m.clear();
  assert.deepEqual(m.rows, []);
  assert.equal(m.stateVersion, 2);
  assert.equal(m.countOf(WOOD), 0);

  const v = m.stateVersion;
  m.clear();
  assert.equal(m.stateVersion, v, '已是空态时 clear 不再递增（避免无意义重渲染）');
});
