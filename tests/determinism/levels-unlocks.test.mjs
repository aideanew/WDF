/**
 * 确定性测试（TASK-7032 · V-703.2）—— levels/unlocks 落地（D-42=C 代定/转录）。
 *
 * 读 `server/generated/config/levels.json` / `unlocks.json`（gen:config 产物）。
 * D-42=C：只补核心循环必需 4 张表；levels exp 曲线代定（线性 100+20×(lv−1)），
 * unlocks 为等级解锁表-草案的等级段注册表（段结构已定、内容 Hark 建议）。
 *
 * 覆盖七例：
 *  1. levels 恰 49 行，id 恰为 1..49（无缺号、无重号）
 *  2. exp_to_next 均为非负整数，且随等级单调不减（越往后越难）
 *  3. 经验曲线代定公式：exp_to_next(lv) = 100 + 20×(lv−1)（逐行核验）
 *  4. 里程碑：等级 20 存在（驶出浅海）且 19→20 经验为正常阈值
 *  5. 总经验量级合理：累计到 49 级约 27k（量级自检，非精确断言）
 *  6. unlocks 恰 11 行（等级段），id 唯一、name 非空、note 含内容
 *  7. unlocks 等级段起点与设计源一致（1/6/11/16/20/25/30/35/40/45），20 级段标记"驶出浅海"
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const levels = JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', 'levels.json'), 'utf8'));
const unlocks = JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', 'unlocks.json'), 'utf8'));
const items = JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', 'items.json'), 'utf8'));
const facilities = JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', 'facilities.json'), 'utf8'));
const buildings = JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', 'buildings.json'), 'utf8'));

test('lv 1 levels 恰 49 行且 id 为 1..49', () => {
  assert.equal(levels.length, 49, 'levels 应恰 49 行（首版上限 49）');
  assert.deepEqual(levels.map((r) => r.id), Array.from({ length: 49 }, (_, i) => i + 1), 'id 应为连续 1..49');
});

test('lv 2 exp_to_next 非负整数且随等级单调不减', () => {
  for (const r of levels) assert.ok(Number.isInteger(r.exp_to_next) && r.exp_to_next >= 0, `lv ${r.id}`);
  for (let i = 1; i < levels.length; i++) assert.ok(levels[i].exp_to_next >= levels[i - 1].exp_to_next, `lv ${i}→${i + 1} 不应下降`);
});

test('lv 3 经验曲线代定公式 exp_to_next = 100 + 20×(lv−1)', () => {
  for (const r of levels) assert.equal(r.exp_to_next, 100 + 20 * (r.id - 1), `lv ${r.id} 公式核验`);
});

test('lv 4 里程碑：等级 20 存在（驶出浅海）', () => {
  const lv20 = levels.find((r) => r.id === 20);
  assert.ok(lv20, '等级 20 应存在');
  assert.ok(lv20.exp_to_next > 0, '19→20 应为正常正阈值');
});

test('lv 5 总经验量级自检（到 49 级累计 ≈27k）', () => {
  const total = levels.slice(0, 48).reduce((s, r) => s + r.exp_to_next, 0); // L1..L48（到 49 级）
  assert.ok(total > 20000 && total < 35000, `累计到 49 级经验应约 27k，得 ${total}`);
});

test('lv 6 unlocks 为结构化目标表（每行一目标，方案 B）', () => {
  // PD7-06：由 11 段行展开为 82 行（每行一个解锁目标），level/kind/target_id 三列齐
  assert.equal(unlocks.length, 82, 'unlocks 应恰 82 行（方案 B 每行一目标，PD7-06）');
  const ids = new Set(unlocks.map((r) => r.id));
  assert.equal(ids.size, unlocks.length, 'unlock id 应唯一');
  for (const r of unlocks) {
    assert.ok(r.name && r.name.trim().length > 0, `${r.id} name 非空`);
    assert.ok(r.note && r.note.length > 0, `${r.id} note 非空`);
    assert.ok(Number.isInteger(r.level) && r.level >= 1 && r.level <= 49, `${r.id} level 应为 1..49 整数`);
    assert.ok(['ability', 'buildable', 'milestone'].includes(r.kind), `${r.id} kind 应 ∈ {ability,buildable,milestone}`);
    assert.ok(r.target_id && r.target_id.trim().length > 0, `${r.id} target_id 非空`);
  }
});

test('lv 7 unlocks 等级段起点与设计源一致（含 20 级驶出浅海里程碑）', () => {
  // 段起点 = 1/6/11/16/20/20/25/30/35/40/45（20 级里程碑 + 20-24 段同起 20）
  const starts = [...new Set(unlocks.map((r) => r.level))].sort((a, b) => a - b);
  assert.deepEqual(starts, [1, 6, 11, 16, 20, 25, 30, 35, 40, 45], '等级段起点应为 1/6/11/16/20/25/30/35/40/45');
  const lv20milestone = unlocks.find((r) => r.level === 20 && r.kind === 'milestone');
  assert.ok(lv20milestone, '应有 20 级里程碑');
  assert.ok(/驶出浅海/.test(lv20milestone.name), '20 级里程碑应含"驶出浅海"');
  // 每个 20 级段（里程碑 + 20-24）都必须存在
  assert.ok(unlocks.some((r) => r.level === 20 && r.kind === 'ability' && /塔防布阵/.test(r.name)), '20-24 段应有塔防布阵能力');
});

test('lv 8 每个 buildable 目标都能在 items/facilities/buildings 解析到实体', () => {
  // target_id 无外键（D2 拍板），但 buildable 行必须指向真实实体；ability/milestone 行 target_id = name
  const itemIds = new Set(items.map((r) => r.id));
  const facIds = new Set(facilities.map((r) => r.id));
  const bldIds = new Set(buildings.map((r) => r.id));
  for (const r of unlocks) {
    if (r.kind === 'buildable') {
      const ok = itemIds.has(r.target_id) || facIds.has(r.target_id) || bldIds.has(r.target_id);
      assert.ok(ok, `${r.id} buildable 目标 ${r.target_id} 应存在于 items/facilities/buildings`);
    } else {
      assert.equal(r.target_id, r.name, `${r.id} ${r.kind} 行 target_id 应 = name（无实体，存能力/里程碑名）`);
    }
  }
});

test('lv 9 等级段覆盖 1..49（每级都落在某段，progression 可查）', () => {
  // 段起点覆盖：1 起，且相邻段起点连续覆盖到 45（45-49 段到 49 上限）
  const starts = [...new Set(unlocks.map((r) => r.level))].sort((a, b) => a - b);
  assert.equal(starts[0], 1, '第一段应从 1 级起');
  for (let i = 1; i < starts.length; i++) {
    // 每段起点必须 > 前一段起点（严格递增，除 20 重复已去重），且覆盖无断档
    assert.ok(starts[i] > starts[i - 1], `段起点 ${starts[i]} 应 > ${starts[i - 1]}`);
  }
  assert.ok(starts[starts.length - 1] <= 49, '最后一段起点 ≤ 49（首版上限 49）');
  // 每个等级 1..49 至少有一个 unlock（level <= N 的最近段存在 → 该级解锁非空）
  for (let n = 1; n <= 49; n++) {
    const applicable = unlocks.filter((r) => r.level <= n);
    assert.ok(applicable.length > 0, `等级 ${n} 应有可解锁项`);
  }
});
