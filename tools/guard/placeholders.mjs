// npm run placeholders [--strict] [--all]：扫描 server/generated/config/*.json，
// 找出"全表同值"字段与"空表"。
// 判定（FIX-8/R-2，2026-10-28 W2-3）：某字段在 rows>3 的表里 unique 值恰为 1 → 占位值嫌疑。
//   items.stack=99 / items.unlock_level=0 / recipes.unlock_level=0 / facilities.effect_bp=10000 等。
// 设计取舍：
//   - 排除来源注释字段（note/notes/desc）：它们是 DS-D-xx 溯源注解，非数据值，不参与。
//   - rows>3：chests(3 行, smashable=true/size=1) 与 ad_placements(3 行, daily_cap=3) 是
//     D-09/D-06 **裁决过的真实设计值**，不是占位符 —— 阈值天然排除，避免对已定值误报。
//   - recipes.station（11 个唯一值/80 行）非恒定，不判；recipes.job 全 undefined（字段缺失，非值）。
// FIX-12（W5-3，2026-10-28）：补"空表"报告 —— 47 张表里 31 张 0 行，在"已转录"叙事下不可见。
//   空表检查放在 rows 阈值**之前**（0 行的表必须单独列出，不能被阈值静默吞掉）。
//   --all 时把阈值放宽到 ≥1，额外报告"小表（≤3 行）全表同值"段 —— 含已裁决真实值
//   （chests.smashable/ad_placements.daily_cap，D-09/D-06），标注为已裁决小表，不作门禁。
// 本工具只**报告**（默认 exit 0，挂 stage 不挂 verify —— R-2 口径）；--strict 时
// 占位值嫌疑或空表任一命中则 exit 1（作门禁用；小表段不参与门禁）。
// FIX-21/R-7（PD1-02，2026-10-28）：并入 run-all 成为第 10 项守卫。baseline.json 记录当前
//   债务（5 同值 + 31 空表）；命中在 baseline 内只报告不阻断，baseline 外的新命中即红（exit 1）。
import { p, read, readJson, walk, rel } from '../lib/util.mjs';

const ANNOTATION_FIELDS = new Set(['note', 'notes', 'desc']);

const all = process.argv.includes('--all');
const strict = process.argv.includes('--strict');

/**
 * 扫描 server/generated/config 的占位值与空表（纯函数，供 run-all 守卫与 CLI 共用）。
 * @returns {{ hits: Array, empties: string[], smallHits: Array }} hits=rows>3 全表同值；empties=0 行表；smallHits=≤3 行小表
 */
export function scanPlaceholders() {
  const hits = [];
  const empties = [];
  const smallHits = [];
  const cfgDir = p('server/generated/config');
  for (const f of walk(cfgDir, (x) => x.endsWith('.json'))) {
    const table = rel(f).split(/[\\/]/).pop().replace('.json', '');
    let rows;
    try { rows = JSON.parse(read(f)); } catch { continue; }
    if (!Array.isArray(rows)) continue;
    if (rows.length === 0) { empties.push(table); continue; } // FIX-12：空表单独列出
    if (rows.length <= 3 && !all) continue; // rows>3 阈值（--all 时放宽到 ≥1）
    const fields = Object.keys(rows[0]);
    for (const k of fields) {
      if (ANNOTATION_FIELDS.has(k)) continue;
      const vals = new Set(rows.map((r) => JSON.stringify(r[k])));
      if (vals.size !== 1) continue;
      const hit = { table, field: k, value: [...vals][0], rows: rows.length };
      if (rows.length <= 3) smallHits.push(hit); else hits.push(hit);
    }
  }
  return { hits, empties, smallHits };
}

/**
 * baseline 比对（FIX-21/R-7）：命中在 baseline 内 → 旧债，只报告不报错；
 * baseline 外的新命中 → 计入"新增"，作为守卫问题返回。
 * @returns {string[]} 问题数组（新增命中），空 = 守卫通过
 */
export function checkPlaceholders() {
  const base = readJson(p('tools/guard/placeholders.baseline.json'));
  const sameBase = new Set((base.same_value_hits || []).map((h) => `${h.table}.${h.field}`));
  const emptyBase = new Set(base.empty_tables || []);
  const { hits, empties } = scanPlaceholders();
  const problems = [];
  // 同值：baseline 外的新同值 → 新增
  for (const h of hits) if (!sameBase.has(`${h.table}.${h.field}`)) problems.push(`占位值新增（baseline 外）：${h.table}.${h.field} = ${h.value} (rows ${h.rows})`);
  // 空表：baseline 外的新空表 → 新增
  for (const t of empties) if (!emptyBase.has(t)) problems.push(`空表新增（baseline 外）：${t}`);
  return problems;
}

// CLI 入口（默认 exit 0 只报告；--strict 时 baseline 外新命中 exit 1）。
// isMain 守卫：被 run-all import 时只导出函数，不跑 CLI、不 process.exit（否则会终止 run-all 进程）。
import { pathToFileURL } from 'node:url';
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { hits, empties, smallHits } = scanPlaceholders();
  const base = readJson(p('tools/guard/placeholders.baseline.json'));
  const sameBase = new Set((base.same_value_hits || []).map((h) => `${h.table}.${h.field}`));
  const emptyBase = new Set(base.empty_tables || []);
  const newHits = hits.filter((h) => !sameBase.has(`${h.table}.${h.field}`));
  const newEmpties = empties.filter((t) => !emptyBase.has(t));

  console.log(`⚠ 空表 ${empties.length} 张（0 行，未转录/无源；FIX-12）${newEmpties.length ? `，其中新增 ${newEmpties.length} 张（baseline 外）` : '（均在 baseline 内）'}：`);
  for (const t of empties) console.log(`  ${t}${emptyBase.has(t) ? '' : '  ← 新增'}`);
  if (hits.length === 0) {
    console.log('✅ 无占位值嫌疑（rows>3 全表同值字段 = 0）');
  } else {
    console.log(`⚠ 占位值嫌疑 ${hits.length} 项（rows>3 且全表同值）${newHits.length ? `，其中新增 ${newHits.length} 项（baseline 外）` : '（均在 baseline 内）'}：`);
    for (const h of hits) console.log(`  ${h.table}.${h.field} = ${h.value}  (rows ${h.rows})${sameBase.has(`${h.table}.${h.field}`) ? '' : '  ← 新增'}`);
  }
  if (all) {
    console.log(`⚠ 小表（≤3 行）全表同值 ${smallHits.length} 项（--all 放宽阈值；含已裁决真实值，不作门禁）：`);
    for (const h of smallHits) console.log(`  ${h.table}.${h.field} = ${h.value}  (rows ${h.rows})`);
  }
  if (strict && (newHits.length > 0 || newEmpties.length > 0)) {
    console.log(`\n❌ 占位值新增 ${newHits.length + newEmpties.length} 项（baseline 外）——守卫失败`);
    process.exit(1);
  }
  process.exit(0);
}
