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

test('lv 6 unlocks 恰 11 行等级段注册表', () => {
  assert.equal(unlocks.length, 11, 'unlocks 应恰 11 行（等级段）');
  const ids = new Set(unlocks.map((r) => r.id));
  assert.equal(ids.size, unlocks.length, 'unlock id 应唯一');
  for (const r of unlocks) assert.ok(r.name && r.name.trim().length > 0, `${r.id} name 非空`);
  for (const r of unlocks) assert.ok(r.note && r.note.length > 0, `${r.id} note 非空`);
});

test('lv 7 unlocks 等级段起点与设计源一致（含 20 级驶出浅海）', () => {
  // 从 name 解析段起点（如 "6-10级"→6、"20级"→20）
  const starts = unlocks.map((r) => parseInt(r.name, 10));
  assert.deepEqual(starts, [1, 6, 11, 16, 20, 20, 25, 30, 35, 40, 45], '等级段起点应为 1/6/11/16/20/20/25/30/35/40/45');
  const lv20 = unlocks.find((r) => r.name.startsWith('20级'));
  assert.ok(lv20, '应有 20 级段');
  assert.ok(/驶出浅海/.test(lv20.note), '20 级段应标记"驶出浅海"');
});
