// CSV → 校验 → 客户端/服务端 JSON + TS 类型 + configVersion + 概率公示
// 用法：node tools/gen/config.mjs [--src <dir>] [--check]   （--src 用于测试夹具；--check 只校验不输出）
import { p, read, readJson, write, walk, exists, sha, parseCsv, catalog, GEN_HEADER } from '../lib/util.mjs';
import { basename, join } from 'node:path';

const args = process.argv.slice(2);
const srcDir = args.includes('--src') ? args[args.indexOf('--src') + 1] : p('game-data');
const checkOnly = args.includes('--check');
const errors = [];
const E = (t, row, msg) => errors.push(`${t}${row ? ` 第${row}行` : ''}：${msg}`);

// 裁决占位值清单（plan-v010 TASK-7004 / 04 §4，与 UNKNOWN-TABLES.md §3 同步）。
// 字段为 true ⇒ 该字段当前是"裁决占位值"（D-07~D-10），不是设计源原值。
// 可用性分级见 UNKNOWN-TABLES.md §3：❌ 影响计算（D-43 裁决前不得进可运行逻辑）/ ⚠ 仅影响平衡 / ✅ 设计源原值。
// 旁挂文件 _placeholder.json 不进 configVersion（configVersion 只哈希 clean 表数据）。
const PLACEHOLDER_FIELDS = {
  items: { weight: true, capacity: true, stack: true, unlock_level: true },
  locks: { hits_required: true, zone_bp: true },
  chests: { smashable: true, size: true },
  recipes: { unlock_level: true, job: true },
};

const schemas = {};
for (const f of walk(join(srcDir, 'schemas'), (f) => f.endsWith('.schema.json'))) {
  const s = readJson(f); schemas[s.table] = s;
}
// 1) catalog 登记的表必须都有 schema（仅对正式 game-data 检查）
if (srcDir === p('game-data')) {
  for (const m of catalog().modules) if (m.phase === 'v1') for (const t of m.tables) if (!schemas[t]) E(t, 0, `module-catalog 登记了表但缺少 schema（模块 ${m.id}）`);
}
// 2) 读数据
const data = {};
for (const [t, s] of Object.entries(schemas)) {
  const f = join(srcDir, 'source', `${t}.csv`);
  if (!exists(f)) { E(t, 0, '缺少 CSV'); continue; }
  const rows = parseCsv(read(f).replace(/^\uFEFF/, ''));
  const header = rows.shift() ?? [];
  for (const k of Object.keys(s.fields)) if (!header.includes(k)) E(t, 1, `缺少字段 ${k}`);
  for (const h of header) if (!s.fields[h]) E(t, 1, `未在 schema 声明的字段 ${h}`);
  data[t] = rows.map((r, i) => {
    const o = {};
    header.forEach((h, j) => {
      const def = s.fields[h]; if (!def) return;
      const raw = (r[j] ?? '').trim(); const line = i + 2;
      if (raw === '') { if (def.required) E(t, line, `${h} 必填`); return; }
      let v = raw;
      if (def.type === 'int') { if (!/^-?\d+$/.test(raw)) E(t, line, `${h} 应为整数，实际 "${raw}"`); v = Number(raw); if (def.min != null && v < def.min) E(t, line, `${h}=${v} 小于 ${def.min}`); if (def.max != null && v > def.max) E(t, line, `${h}=${v} 大于 ${def.max}`); }
      else if (def.type === 'bool') { if (!['true', 'false', '1', '0'].includes(raw)) E(t, line, `${h} 应为 true/false`); v = raw === 'true' || raw === '1'; }
      else if (def.type === 'enum') { if (!def.values.includes(raw)) E(t, line, `${h}="${raw}" 不在 [${def.values.join('/')}]`); }
      else if (def.pattern && !new RegExp(def.pattern).test(raw)) E(t, line, `${h}="${raw}" 不符合 ${def.pattern}`);
      o[h] = v;
    });
    o.__line = i + 2; return o;
  });
}
// 3) 主键唯一、外键、分组合计
for (const [t, rows] of Object.entries(data)) {
  const s = schemas[t]; const pk = s.primaryKey; const seen = new Set();
  for (const r of rows) { const k = r[pk]; if (k == null) continue; if (seen.has(k)) E(t, r.__line, `主键重复 ${k}`); seen.add(k); }
  for (const [h, def] of Object.entries(s.fields)) {
    if (def.ref) {
      const [rt, rf] = def.ref.split('.');
      const pool = new Set((data[rt] ?? []).map((x) => x[rf]));
      if (!schemas[rt]) E(t, 0, `${h} 引用了不存在的表 ${rt}`);
      for (const r of rows) if (r[h] != null && !pool.has(r[h])) E(t, r.__line, `${h}="${r[h]}" 在 ${def.ref} 中不存在`);
    }
    if (def.sumTo) {
      const sums = {}; for (const r of rows) { const g = r[def.sumTo.by]; sums[g] = (sums[g] ?? 0) + (r[h] ?? 0); }
      for (const [g, v] of Object.entries(sums)) if (v !== def.sumTo.total) E(t, 0, `分组 ${def.sumTo.by}=${g} 的 ${h} 合计 ${v} ≠ ${def.sumTo.total}`);
    }
  }
}
// 4) 解锁无环（unlocks.requires 用 ; 分隔，若存在该字段）
if (data.unlocks && schemas.unlocks?.fields?.requires) {
  const g = new Map(data.unlocks.map((r) => [r.id, String(r.requires ?? '').split(';').filter(Boolean)]));
  const state = new Map();
  const dfs = (n, path) => { if (state.get(n) === 1) { E('unlocks', 0, `解锁依赖成环：${[...path, n].join(' → ')}`); return; } if (state.get(n) === 2) return; state.set(n, 1); for (const m of g.get(n) ?? []) dfs(m, [...path, n]); state.set(n, 2); };
  for (const n of g.keys()) dfs(n, []);
}

if (errors.length) { console.error(`❌ 数值校验失败 ${errors.length} 处：\n  ` + errors.join('\n  ')); process.exit(1); }

const clean = Object.fromEntries(Object.entries(data).map(([t, rows]) => [t, rows.map(({ __line, ...r }) => r)]));
const configVersion = sha(JSON.stringify(clean));
const rowsTotal = Object.values(clean).reduce((a, r) => a + r.length, 0);
if (checkOnly) { console.log(`✅ 数值校验通过：${Object.keys(clean).length} 张表，${rowsTotal} 行，configVersion=${configVersion}`); process.exit(0); }

const manifest = { configVersion, generatedFrom: 'game-data/source', tables: Object.keys(clean).sort() };
for (const [t, rows] of Object.entries(clean)) {
  const json = JSON.stringify(rows);
  write(p('client/assets/resources/config', `${t}.json`), json + '\n');
  write(p('server/generated/config', `${t}.json`), json + '\n');
}
write(p('client/assets/resources/config/_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
write(p('server/generated/config/_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
write(p('game-data/out/_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
// 占位标记旁挂：只写给客户端（服务端暂无不消费这些字段的校验）；不进 configVersion
write(p('client/assets/resources/config/_placeholder.json'), JSON.stringify(PLACEHOLDER_FIELDS, null, 2) + '\n');

// 类型
const ts = { string: 'string', int: 'number', bool: 'boolean' };
let types = GEN_HEADER + `export const CONFIG_VERSION = '${configVersion}';\n\n`;
for (const [t, s] of Object.entries(schemas).sort()) {
  const name = t.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join('') + 'Row';
  types += `/** ${t}（模块 ${s.module}${s.status === 'draft' ? '，字段待定' : ''}） */\nexport interface ${name} {\n`;
  for (const [h, d] of Object.entries(s.fields)) types += `  ${h}${d.required ? '' : '?'}: ${d.type === 'enum' ? d.values.map((v) => `'${v}'`).join(' | ') : ts[d.type] ?? 'string'};\n`;
  types += '}\n\n';
}
write(p('packages/game-core/src/generated/config-types.ts'), types);

// 概率公示（drops）
let disclosure = `---\nid: CMP-prob\ntitle: 概率公示（生成）\nstatus: active\nowner: hark\ncreated: 2026-10-23\nreview: 2026-11-23\n---\n\n# 概率公示（由 game-data 生成，勿手改）\n\nconfigVersion：\`${configVersion}\`\n\n`;
const drops = clean.drops ?? [];
if (!drops.length) disclosure += '（drops 表尚无数据）\n';
else { const groups = {}; for (const r of drops) (groups[r.group] ??= []).push(r); for (const [g, rs] of Object.entries(groups)) { disclosure += `## ${g}\n\n| 物品 | 数量 | 概率 |\n|---|---|---|\n`; for (const r of rs) disclosure += `| ${r.item} | ${r.min}–${r.max} | ${(r.weight_bp / 100).toFixed(2)}% |\n`; disclosure += '\n'; } }
write(p('docs/07_release/compliance/probability-disclosure.md'), disclosure);

console.log(`✅ 数值生成完成：${Object.keys(clean).length} 张表，${rowsTotal} 行，configVersion=${configVersion}`);
