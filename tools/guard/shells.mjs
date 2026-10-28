// npm run shells [--json]：列出「module-catalog 声明存在、但代码里没有行为」的空壳模块。
// 判定（plan-v010 TASK-7001，定义性卡）：纯空壳 = 该层没有可执行行为。逐层判据不同：
//   client:    有效行 < 15（全部 15 个占位 feature 恰为 14 有效行；真实 feature 均 >100 行）
//   core/server: 全部导出符号 ∈ {MODULE, MODULE_ID, SERVICE}（只有模块标识常量，无行为）
//   contracts: 恒有行为（类型/请求响应定义即契约本体），永不判空壳
// 注意：本工具只判「纯空壳」。第三类（写了代码但输入是占位值，如 raft/sea/defense）不是
// 纯空壳，由 02-requirement-inventory §3 与 TASK-7004（占位值可区分）处理，不在此列。
// 每行附 effectiveLines 与 exports 作为证据，供人工复核；本工具不评质量、不判工作量。
// 第一版只报告，不拦门禁（退出码恒 0）。
import { p, read, walk, rel, exists, catalog } from '../lib/util.mjs';

const SHELL_SYMBOLS = new Set(['MODULE', 'MODULE_ID', 'SERVICE']);
const CLIENT_LINE_SHELL = 15; // 占位 feature 恰好 14 有效行；真实 feature 均 >100 行

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const effectiveLines = (src) => stripComments(src).split(/\r?\n/).filter((l) => l.trim() !== '').length;
const exportedNames = (src) => {
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:declare\s+)?(?:const|function|class|interface|type|enum|let|var|abstract\s+class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) for (const n of m[1].split(',')) { const t = n.trim().split(/\s+as\s+/)[0].trim(); if (t) names.add(t); }
  return [...names];
};

const LAYERS = [
  ['client', (id) => `client/assets/scripts/features/${id}`],
  ['core', (id) => `packages/game-core/src/${id}`],
  ['server', (id) => `server/src/modules/${id}`],
  ['contracts', (id) => `packages/contracts/src/${id}`],
];

const results = [];
for (const m of catalog().modules) {
  if (m.phase !== 'v1') continue;
  for (const [layer, dirOf] of LAYERS) {
    if (!m[layer]) continue;
    const dir = dirOf(m.id);
    if (!exists(p(dir))) { results.push({ id: m.id, layer, files: [], effectiveLines: 0, verdict: 'missing', exports: [], evidence: [`目录缺失：${dir}`] }); continue; }
    const files = walk(p(dir), (f) => f.endsWith('.ts')).map((f) => rel(f).replace(/\\/g, '/'));
    if (!files.length) { results.push({ id: m.id, layer, files, effectiveLines: 0, verdict: 'shell', exports: [], evidence: [`${dir} 无 .ts 文件`] }); continue; }
    let eff = 0; const allExports = new Set();
    for (const f of files) { const src = read(p(f)); eff += effectiveLines(src); for (const n of exportedNames(src)) allExports.add(n); }
    const exports = [...allExports];
    const onlyConstants = exports.length > 0 && exports.every((n) => SHELL_SYMBOLS.has(n));
    const shell = layer === 'client' ? eff < CLIENT_LINE_SHELL : onlyConstants;
    const verdict = shell ? 'shell' : 'ok';
    const evidence = shell
      ? (layer === 'client' ? [`有效行 ${eff} < ${CLIENT_LINE_SHELL}`] : [`导出仅限常量：${exports.join(', ')}`])
      : [`有效行 ${eff}；导出：${exports.slice(0, 6).join(', ') || '（无）'}`];
    results.push({ id: m.id, layer, files, effectiveLines: eff, verdict, exports: exports.slice(0, 8), evidence });
  }
}

const json = process.argv.includes('--json');
if (json) { console.log(JSON.stringify(results, null, 2)); }
else {
  const byLayer = {};
  for (const r of results) (byLayer[r.layer] ??= []).push(r);
  for (const [layer, rows] of Object.entries(byLayer)) {
    const shells = rows.filter((r) => r.verdict === 'shell');
    const ok = rows.filter((r) => r.verdict === 'ok');
    console.log(`\n## ${layer}（${rows.length} 声明 / ${shells.length} 空壳）`);
    for (const r of shells) console.log(`  🅾 ${r.id}  有效行 ${r.effectiveLines}  ${r.evidence.join('；')}`);
    if (ok.length) console.log(`  ✅ 有行为：${ok.map((r) => r.id).join(', ')}`);
    for (const r of rows.filter((x) => x.verdict === 'missing')) console.log(`  ⚠ 目录缺失：${r.id}  ${r.evidence[0]}`);
  }
}
process.exit(0); // 第一版只报告，不拦门禁
