/**
 * 确定性测试（PD7-09）—— 玩法簇数据（zones/tides/spawns/fish/bait/shipwrecks/oil/explore/
 * seasons/titles/events/event_drops/regions/limits/drops/lines/lockpick_tools/blueprints + locks/chests 补全）。
 *
 * 读 `server/generated/config/*.json`（gen:config 产物）。
 * B-L5：设计源没给的数值一律不编、留空登记。
 *
 * 注：drops（D-27 设计源未定义掉落规则）、explore（无具体探索点）、limits（商人限购已由
 * merchants.daily_limit 表达 D-01）、phrases（§9.4 无具体短语文案）、regions（D-53 区名由运营给定，
 * 不种数据）—— 5 张表**设计上留空**（非漏填），本测试断言其为空表并注明设计依据。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(readFileSync(join(repoRoot, 'server', 'generated', 'config', p), 'utf8'));

const zones = read('zones.json');
const tides = read('tides.json');
const spawns = read('spawns.json');
const fish = read('fish.json');
const bait = read('bait.json');
const shipwrecks = read('shipwrecks.json');
const oil = read('oil.json');
const explore = read('explore.json');
const seasons = read('seasons.json');
const titles = read('titles.json');
const events = read('events.json');
const eventDrops = read('event_drops.json');
const regions = read('regions.json');
const limits = read('limits.json');
const drops = read('drops.json');
const phrases = read('phrases.json');
const lines = read('lines.json');
const lockpickTools = read('lockpick_tools.json');
const blueprints = read('blueprints.json');
const locks = read('locks.json');
const chests = read('chests.json');

test('pl 1 zones 三圈海域：浅海/深海/远洋（§2.1:90-94），仅深海 size=800 有源', () => {
  assert.equal(zones.length, 3, 'zones 应 3 行（浅海/深海/远洋）');
  const byId = Object.fromEntries(zones.map((r) => [r.id, r]));
  assert.equal(byId.zone_shallow.position, 'inner');
  assert.equal(byId.zone_deep.position, 'middle');
  assert.equal(byId.zone_ocean.position, 'outer');
  assert.equal(byId.zone_deep.size_km, 800, '深海 800×800 km（§2.1:96）');
  assert.ok(byId.zone_shallow.size_km === undefined || byId.zone_shallow.size_km === '', '浅海尺寸待定留空');
});

test('pl 2 tides 每 6 小时一波、每波 10 分钟（§2.2:105）', () => {
  assert.equal(tides.length, 1);
  assert.equal(tides[0].period_min, 360, '6 小时 = 360 分钟');
  assert.equal(tides[0].duration_min, 10, '每波 10 分钟');
});

test('pl 3 spawns 漂浮物（§3.1:126），刷出率待定留空', () => {
  assert.equal(spawns.length, 8, '8 种漂浮物（漂流木/布/塑料/废铁/废铜/种子/铁钉/少量铁锭）');
  for (const r of spawns) {
    assert.ok(r.item, `${r.id} item 非空`);
    assert.ok(r.rate_bp === undefined || r.rate_bp === '' || r.rate_bp === null, `${r.id}.rate_bp 应留空（刷出率待定）`);
  }
});

test('pl 4 fish 鱼/电鳗/灯笼鱼（§3.2:139）', () => {
  assert.equal(fish.length, 3);
  const names = fish.map((r) => r.name).sort();
  assert.deepEqual(names, ['灯笼鱼', '电鳗', '鱼'].sort());
});

test('pl 5 shipwrecks 三级信息 + 锁档比例合计 10000（§3.3:148-184）', () => {
  assert.equal(shipwrecks.length, 3);
  const byId = Object.fromEntries(shipwrecks.map((r) => [r.id, r]));
  assert.equal(byId.wreck_normal.quota, 100);
  assert.equal(byId.wreck_advanced.quota, 10);
  assert.equal(byId.wreck_exclusive.quota, 3);
  for (const r of shipwrecks) {
    const sum = r.unlocked_bp + r.iron_bp + r.copper_bp + r.silver_bp + r.gold_bp;
    assert.equal(sum, 10000, `${r.id} 锁档比例合计应 10000`);
  }
});

test('pl 6 titles 10 档加成：+25%~+1%（§10.3:724-726）', () => {
  assert.equal(titles.length, 10);
  assert.equal(titles[0].rank, 1);
  assert.equal(titles[0].bonus_bp, 2500, '第 1 名 +25%');
  assert.equal(titles[9].rank, 10);
  assert.equal(titles[9].bonus_bp, 100, '第 10 名 +1%');
});

test('pl 7 events 每日一海 20-21 点 3 分钟（§10.2:683）', () => {
  const daily = events.find((r) => r.id === 'event_daily_sea');
  assert.ok(daily, '每日一海存在');
  assert.equal(daily.daily_start_hour, 20);
  assert.equal(daily.daily_end_hour, 21);
  assert.equal(daily.duration_min, 3);
  assert.equal(daily.settle_minute, 1265, '21:05 结算');
});

test('pl 8 event_drops 锁档+箱大小分布，各维度合计 10000（§10.2:687-701）', () => {
  const lockRows = eventDrops.filter((r) => r.dimension === 'lock');
  const sizeRows = eventDrops.filter((r) => r.dimension === 'size');
  assert.equal(lockRows.length, 5, '锁档 5 档（无锁/铁/铜/银/金）');
  assert.equal(sizeRows.length, 4, '箱大小 4 档（小/中/大/巨）');
  const lockSum = lockRows.reduce((a, r) => a + r.weight_bp, 0);
  const sizeSum = sizeRows.reduce((a, r) => a + r.weight_bp, 0);
  assert.equal(lockSum, 10000, '锁档分布合计 10000');
  assert.equal(sizeSum, 10000, '箱大小分布合计 10000');
  assert.equal(lockRows.find((r) => r.value === '金').weight_bp, 20, '金锁箱 0.2%（§10.2:687）');
});

test('pl 9 blueprints 7 种高级/精密材料需图纸（§13.3:971-984）', () => {
  assert.equal(blueprints.length, 7);
  const items = blueprints.map((r) => r.item).sort();
  assert.deepEqual(items, ['item_0031', 'item_0032', 'item_0033', 'item_0034', 'item_0035', 'item_0036', 'item_0037'].sort());
});

test('pl 10 lockpick_tools 三级，价格 300/2000/12000（§8.4:596,600）', () => {
  assert.equal(lockpickTools.length, 3);
  const byId = Object.fromEntries(lockpickTools.map((r) => [r.id, r]));
  assert.equal(byId.lockpick_normal.price, 300);
  assert.equal(byId.lockpick_fine.price, 2000);
  assert.equal(byId.lockpick_advanced.price, 12000);
  assert.equal(byId.lockpick_advanced.daily_region_quota, 3, '高级每区服每天 3 个（§8.4:601）');
});

test('pl 11 locks.zone_bp 命中区：2000/1500/1000/500（§8.4:583-588）', () => {
  const byId = Object.fromEntries(locks.map((r) => [r.id, r]));
  assert.equal(byId.iron.zone_bp, 2000, '铁锁命中区 20%');
  assert.equal(byId.copper.zone_bp, 1500, '铜锁 15%');
  assert.equal(byId.silver.zone_bp, 1000, '银锁 10%');
  assert.equal(byId.gold.zone_bp, 500, '金锁 5%');
});

test('pl 12 chests.smashable 差异化：木箱可砸、铜/铁箱砸不开（§3.6:250,260）', () => {
  const byId = Object.fromEntries(chests.map((r) => [r.id, r]));
  assert.equal(byId.chest_wood.smashable, true, '木箱可砸');
  assert.equal(byId.chest_copper.smashable, false, '铜箱砸不开只能开锁');
  assert.equal(byId.chest_iron.smashable, false, '铁箱砸不开只能开锁');
});

test('pl 13 设计上留空的 5 张表（B-L5/D-27/D-53，非漏填）', () => {
  // drops：D-27 设计源未定义掉落规则（server/src/modules/chest/service.ts:47-49）
  assert.equal(drops.length, 0, 'drops 空表（D-27：设计源未定义掉落规则）');
  // explore：无具体探索点清单（§3.5 只给定性）
  assert.equal(explore.length, 0, 'explore 空表（§3.5 无具体探索点）');
  // limits：商人限购已由 merchants.daily_limit 表达（D-01）
  assert.equal(limits.length, 0, 'limits 空表（商人限购已由 merchants 表达）');
  // phrases：无具体短语文案（§9.4:656-657）
  assert.equal(phrases.length, 0, 'phrases 空表（§9.4 无具体短语文案）');
  // regions：D-53 区名由运营给定，不种数据（server/src/modules/account/repo.ts:51）
  assert.equal(regions.length, 0, 'regions 空表（D-53：区名由运营给定，不种数据）');
});
