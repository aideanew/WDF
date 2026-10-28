// npm run placeholders [--strict]：扫描 server/generated/config/*.json，找出"全表同值"的字段。
// 判定（FIX-8/R-2，2026-10-28 W2-3）：某字段在 rows>3 的表里 unique 值恰为 1 → 占位值嫌疑。
//   items.stack=99 / items.unlock_level=0 / recipes.unlock_level=0 / facilities.effect_bp=10000 等。
// 设计取舍：
//   - 排除来源注释字段（note/notes）：它们是 DS-D-xx 溯源注解（D-01~D-18 引用），非数据值，不参与。
//   - rows>3：chests(3 行, smashable=true/size=1) 与 ad_placements(3 行, daily_cap=3) 是
//     D-09/D-06 **裁决过的真实设计值**，不是占位符 —— 阈值天然排除，避免对已定值误报。
//   - recipes.station（11 个唯一值/80 行）非恒定，不判；recipes.job 全 undefined（字段缺失，非值）。
// 本工具只**报告**（默认 exit 0，挂 stage 不挂 verify —— R-2 口径）；--strict 时任一命中则 exit 1（作门禁用）。
import { p, read, walk, rel } from '../lib/util.mjs';

const ANNOTATION_FIELDS = new Set(['note', 'notes', 'desc']);

const hits = [];
const cfgDir = p('server/generated/config');
for (const f of walk(cfgDir, (x) => x.endsWith('.json'))) {
  const table = rel(f).split(/[\\/]/).pop().replace('.json', '');
  let rows;
  try { rows = JSON.parse(read(f)); } catch { continue; }
  if (!Array.isArray(rows) || rows.length <= 3) continue; // rows>3 阈值（见设计取舍）
  const fields = Object.keys(rows[0]);
  for (const k of fields) {
    if (ANNOTATION_FIELDS.has(k)) continue;
    const vals = new Set(rows.map((r) => JSON.stringify(r[k])));
    if (vals.size === 1) hits.push({ table, field: k, value: [...vals][0], rows: rows.length });
  }
}

const strict = process.argv.includes('--strict');
if (hits.length === 0) {
  console.log('✅ 无占位值嫌疑（全表同值字段 = 0）');
} else {
  console.log(`⚠ 占位值嫌疑 ${hits.length} 项（rows>3 且全表同值；--strict 时作门禁）：`);
  for (const h of hits) console.log(`  ${h.table}.${h.field} = ${h.value}  (rows ${h.rows})`);
}
process.exit(strict && hits.length > 0 ? 1 : 0);
