// transcribe.mjs — 读 decision-sheet 锁定值（D-01~D-10）写 game-data/source/*.csv
// 用法：node tools/gen/transcribe.mjs [--dry-run]
// --dry-run: 只报告差异不写入；二次跑 0 变更 = 幂等（V-402.5）
//
// 数值唯一来源 = docs/04_planning/plan-v003/decision-sheet.md（status: accepted，2026-10-27 "全按建议值"）
// 每行的 note 列标注 DS-D-xx 以便溯源。字段级填充（D-07~D-10）改现有 CSV 的空字段。
import { p, read, write } from '../lib/util.mjs';

const dryRun = process.argv.includes('--dry-run');
let changes = 0;

/** 生成 CSV 文本（无引号需求；所有值不含逗号/换行）。 */
function csv(rows) {
  return rows.map((r) => r.join(',')).join('\n') + '\n';
}

/** 对比现有文件，相同则跳过，不同则写入（或 dry-run 报告）。 */
function apply(name, content) {
  const path = p('game-data/source', `${name}.csv`);
  const existing = read(path);
  if (existing.replace(/\r\n/g, '\n') === content) {
    console.log(`  ✓ ${name}.csv — 无变化`);
    return;
  }
  changes++;
  if (dryRun) {
    console.log(`  Δ ${name}.csv — 将写入（内容不同）`);
  } else {
    write(path, content);
    console.log(`  ✅ ${name}.csv — 已写入`);
  }
}

/** 读现有 CSV → 返回 [header, ...rows]，每行是字符串数组。 */
function readCsv(name) {
  const raw = read(p('game-data/source', `${name}.csv`)).replace(/\r\n/g, '\n');
  return raw.split('\n').filter((l) => l.trim()).map((l) => l.split(','));
}

// ===== A. 6 张新表（D-01~D-06，完整 CSV）=====

// D-01 merchants：3 行
apply('merchants', csv([
  ['id', 'name', 'region_bp', 'daily_limit', 'note'],
  ['merchant_village', '渔村', '10000', '20', 'DS-D-01'],
  ['merchant_wander', '流浪商人', '8500', '10', 'DS-D-01'],
  ['merchant_black', '黑市商人', '13000', '5', 'DS-D-01'],
]));

// D-02 facilities：9 行，station 取 recipes 原工位串
apply('facilities', csv([
  ['id', 'name', 'effect_bp', 'station', 'note'],
  ['furnace', '熔炉', '10000', '熔炉', 'DS-D-02'],
  ['stove', '灶台', '10000', '灶台', 'DS-D-02'],
  ['saw_table', '锯台', '10000', '', 'DS-D-02'],
  ['anvil', '砧台', '10000', '', 'DS-D-02'],
  ['charcoal_kiln', '木炭窑', '10000', '木炭窑', 'DS-D-02'],
  ['oil_refinery', '炼油炉', '10000', '炼油炉', 'DS-D-02'],
  ['blast_furnace', '高炉', '10000', '高炉/铁匠', 'DS-D-02'],
  ['locksmith', '锁匠铺', '10000', '', 'DS-D-02'],
  ['mechanic_workshop', '机械工坊', '10000', '机械工坊/机械师', 'DS-D-02'],
]));

// D-03 buildings：6 行，效果字段 storage_bp
apply('buildings', csv([
  ['id', 'name', 'storage_bp', 'note'],
  ['warehouse', '大仓库', '50', 'DS-D-03'],
  ['cargo_hold', '货舱', '20', 'DS-D-03'],
  ['barracks', '兵营', '0', 'DS-D-03'],
  ['kitchen', '厨房', '0', 'DS-D-03'],
  ['farm', '农田', '0', 'DS-D-03'],
  ['diving_workshop', '潜水工坊', '0', 'DS-D-03'],
]));

// D-04 hooks：1 行，max_power_bp 等值迁移自 DEFAULT_HOOK_CONFIG.maxPowerBp=10000
apply('hooks', csv([
  ['id', 'name', 'target_dist', 'angle_deg', 'max_power_bp', 'note'],
  ['hook_default', '默认出钩', '600', '15', '10000', 'DS-D-04'],
]));

// D-05 guide_steps：5 行
apply('guide_steps', csv([
  ['id', 'name', 'text', 'target_panel', 'note'],
  ['step_1', '出钩', '出钩收获第一件物品', 'hook', 'DS-D-05'],
  ['step_2', '背包', '查看背包', 'inventory', 'DS-D-05'],
  ['step_3', '合成', '完成一次合成', 'crafting', 'DS-D-05'],
  ['step_4', '回收', '商人处回收', 'merchant', 'DS-D-05'],
  ['step_5', '榜单', '查看榜单', 'leaderboard', 'DS-D-05'],
]));

// D-06 ad_placements：3 行
apply('ad_placements', csv([
  ['id', 'name', 'daily_cap', 'note'],
  ['hook_cooldown', '出钩冷却广告', '3', 'DS-D-06'],
  ['offline_double', '离线双倍广告', '3', 'DS-D-06'],
  ['shop_refresh', '商店刷新广告', '3', 'DS-D-06'],
]));

// ===== B. 字段级填充（D-07~D-10，改现有 CSV 空字段）=====

// D-07 items：weight=1 / capacity=0 / stack=99 / unlock_level=0（全 106 行）
{
  const [header, ...rows] = readCsv('items');
  const idx = {};
  header.forEach((h, i) => { idx[h] = i; });
  const filled = rows.map((cells) => {
    if ((cells[idx.weight] ?? '').trim() === '') cells[idx.weight] = '1';
    if ((cells[idx.capacity] ?? '').trim() === '') cells[idx.capacity] = '0';
    if ((cells[idx.stack] ?? '').trim() === '') cells[idx.stack] = '99';
    if ((cells[idx.unlock_level] ?? '').trim() === '') cells[idx.unlock_level] = '0';
    return cells.join(',');
  });
  apply('items', [header.join(','), ...filled].join('\n') + '\n');
}

// D-08 locks：hits_required none=0/iron=3/copper=5/silver=8/gold=12，zone_bp 全 0
{
  const [header, ...rows] = readCsv('locks');
  const idx = {};
  header.forEach((h, i) => { idx[h] = i; });
  const hits = { none: '0', iron: '3', copper: '5', silver: '8', gold: '12' };
  const filled = rows.map((cells) => {
    const lockId = (cells[idx.id] ?? '').trim();
    if ((cells[idx.hits_required] ?? '').trim() === '') cells[idx.hits_required] = hits[lockId] ?? '0';
    if ((cells[idx.zone_bp] ?? '').trim() === '') cells[idx.zone_bp] = '0';
    return cells.join(',');
  });
  apply('locks', [header.join(','), ...filled].join('\n') + '\n');
}

// D-09 chests：smashable=true / size=1（全 3 行）
{
  const [header, ...rows] = readCsv('chests');
  const idx = {};
  header.forEach((h, i) => { idx[h] = i; });
  const filled = rows.map((cells) => {
    if ((cells[idx.smashable] ?? '').trim() === '') cells[idx.smashable] = 'true';
    if ((cells[idx.size] ?? '').trim() === '') cells[idx.size] = '1';
    return cells.join(',');
  });
  apply('chests', [header.join(','), ...filled].join('\n') + '\n');
}

// D-10 recipes：unlock_level=0（全 80 行），job 保持空
{
  const [header, ...rows] = readCsv('recipes');
  const idx = {};
  header.forEach((h, i) => { idx[h] = i; });
  const filled = rows.map((cells) => {
    if ((cells[idx.unlock_level] ?? '').trim() === '') cells[idx.unlock_level] = '0';
    return cells.join(',');
  });
  apply('recipes', [header.join(','), ...filled].join('\n') + '\n');
}

console.log(`\n${dryRun ? 'dry-run' : '转录'}完成：${changes} 个文件变更`);
