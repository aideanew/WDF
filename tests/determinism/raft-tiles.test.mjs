/**
 * 确定性测试（TASK-7033 · V-703.3）—— raft_tiles/rooms 落地（D-42=C 代定/注册）。
 *
 * 读 `server/generated/config/raft_tiles.json` / `rooms.json` / `items.json`（gen:config 产物）。
 * D-42=C：只补核心循环必需 4 张表（levels/unlocks/raft_tiles/rooms）；raft_tiles 船体材料容量/重量代定，
 * rooms 为设计源室内房间类型注册表。
 * raft_tiles.capacity = 浮力贡献（DS 3.19「浮力=船体材料容量之和」），与 items.capacity（储物）不同义。
 *
 * 覆盖六例：
 *  1. raft_tiles 恰 1 行（筏块为当前唯一船体材料）
 *  2. raft_block.item 引用存在且指向 facility 类物品（筏块，items.json）
 *  3. 筏块 capacity>weight（净浮力为正 → 扩筏可行）
 *  4. capacity/weight 均为非负整数
 *  5. 浮力自洽：N 块筏块 + 合理货重 → 剩余浮力为正（复用 game-core remainingBuoyancy）
 *  6. rooms 为设计源室内房间类型注册表：≥8 个、id 唯一、name 非空、均取自设计源语义（note 含 DS 引用）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tiles = JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', 'raft_tiles.json'), 'utf8'));
const rooms = JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', 'rooms.json'), 'utf8'));
const items = JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', 'items.json'), 'utf8'));

const { remainingBuoyancy } = await import('../../packages/game-core/src/raft/index.ts');

test('raft-t 1 恰 1 行（筏块为当前唯一船体材料）', () => {
  assert.equal(tiles.length, 1, 'raft_tiles 应恰 1 行（仅筏块是船体材料）');
  assert.equal(tiles[0].id, 'raft_block');
});

test('raft-t 2 item 引用存在且为 facility 类（筏块）', () => {
  const it = items.find((x) => x.id === tiles[0].item);
  assert.ok(it, `raft_block.item=${tiles[0].item} 应在 items 中存在`);
  assert.equal(it.name, '筏块');
  assert.equal(it.category, 'facility');
});

test('raft-t 3 筏块净浮力为正（扩筏可行）', () => {
  const t = tiles[0];
  assert.ok(t.capacity > t.weight, `筏块 capacity=${t.capacity} 应 > weight=${t.weight}（净浮力为正）`);
});

test('raft-t 4 capacity/weight 非负整数', () => {
  for (const t of tiles) {
    assert.ok(Number.isInteger(t.capacity) && t.capacity >= 0, `${t.id} capacity`);
    assert.ok(Number.isInteger(t.weight) && t.weight >= 0, `${t.id} weight`);
  }
});

test('raft-t 5 浮力自洽：N 块筏块 + 货重 → 正浮力（复用 remainingBuoyancy）', () => {
  const t = tiles[0];
  const hull = Array.from({ length: 5 }, () => ({ capacity: t.capacity, weight: t.weight }));
  const left = remainingBuoyancy(hull, 100); // 5 块筏块 + 100 货重
  assert.ok(left > 0, `5 块筏块载 100 货重后剩余浮力应为正，得 ${left}`);
});

test('raft-t 6 rooms 为设计源室内房间类型注册表', () => {
  assert.ok(rooms.length >= 8, `rooms 应 ≥8 个室内房间类型，得 ${rooms.length}`);
  const ids = new Set(rooms.map((r) => r.id));
  assert.equal(ids.size, rooms.length, 'room id 应唯一');
  for (const r of rooms) assert.ok(r.name && r.name.trim().length > 0, `${r.id} name 非空`);
  for (const r of rooms) assert.ok(/DS /.test(r.note ?? ''), `${r.id} note 应含设计源引用`);
});

// ── PD7-01（D-54 Q2=A）追加：把「浮力口径」锁进公式，防日后有人把 items.capacity 当浮力 ──
test('raft-t 7 正算：1 块筏块（capacity50/weight10）→ 剩余浮力 = 50−10−货重（D-54 Q2=A 口径）', () => {
  // D-54 Q2=A：浮力 = Σ raft_tiles.capacity − (Σ 船体地块自重 + 货重)。1 块筏块载 30 货重：
  const hull = [{ capacity: 50, weight: 10 }];
  assert.equal(remainingBuoyancy(hull, 30), 50 - 10 - 30);
});

test('raft-t 8 反证：remainingBuoyancy 不读 items.capacity（D-54 Q2=A，只认 Load[] 入参）', () => {
  // 用内存构造的 Load[]，不读 items.csv（坑二：读 items.csv 测的是数据文件不是公式）。
  // D-54 Q2=A 判 items.capacity「不参与浮力」。若公式日后被改成查 items.capacity，则它要么
  // import items（违反 game-core 纯度），要么改签名——两者本测试都会暴露。此处显式断言：
  // 结果只由传入 Load[] 决定，与 items 表无关：把 Load.capacity 从 50 换成 100，结果按
  // Load.capacity 线性变化（50−10−40 → 100−10−40），证明读的是 Load.capacity 而非外部表。
  const base = [{ capacity: 50, weight: 10 }];
  assert.equal(remainingBuoyancy(base, 40), 50 - 10 - 40);
  const inflated = [{ capacity: 100, weight: 10 }]; // 模拟「把 items.capacity 设成 100」
  assert.equal(remainingBuoyancy(inflated, 40), 100 - 10 - 40);
});
