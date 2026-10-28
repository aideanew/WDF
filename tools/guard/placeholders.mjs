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
import { p, read, walk, rel } from '../lib/util.mjs';

const ANNOTATION_FIELDS = new Set(['note', 'notes', 'desc']);

const all = process.argv.includes('--all');
const strict = process.argv.includes('--strict');

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

console.log(`⚠ 空表 ${empties.length} 张（0 行，未转录/无源；FIX-12）：`);
for (const t of empties) console.log(`  ${t}`);
if (hits.length === 0) {
  console.log('✅ 无占位值嫌疑（rows>3 全表同值字段 = 0）');
} else {
  console.log(`⚠ 占位值嫌疑 ${hits.length} 项（rows>3 且全表同值；--strict 时作门禁）：`);
  for (const h of hits) console.log(`  ${h.table}.${h.field} = ${h.value}  (rows ${h.rows})`);
}
if (all) {
  console.log(`⚠ 小表（≤3 行）全表同值 ${smallHits.length} 项（--all 放宽阈值；含已裁决真实值，不作门禁）：`);
  for (const h of smallHits) console.log(`  ${h.table}.${h.field} = ${h.value}  (rows ${h.rows})`);
}
process.exit(strict && (hits.length > 0 || empties.length > 0) ? 1 : 0);
