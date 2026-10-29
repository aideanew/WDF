#!/usr/bin/env node
// tools/sample/hook-window.mjs（D-52，2026-10-29）
//
// 4011 的「机制侧」分析器——回答两个可自动回答的问题，不冒充真人手感：
//   ① 默认配置下，蓄力多久能命中 target_dist？（解析扫描，毫秒级）
//   ② 在明示的输入模型下，N 钩的命中率是多少？（SIMULATED，非 MEASURED-HUMAN）
//
// 纪律：
//   - 判定复用 packages/game-core/src/hook（powerAt / chargeAndCast），**不重写公式**，
//     否则分析结果与线上行为分家（本项目反复栽的「两套口径」）。
//   - 输入模型必须打印在输出里；不用 Math.random，用固定种子 LCG，保证可复跑。
//   - 输出标注 SIMULATED，**不得**被引用为 C1 / MEASURED-HUMAN 口径（那需要 ≥3 名真人真机）。
//
// 用法：
//   node --import ./tools/runtime/register.mjs tools/sample/hook-window.mjs
//   node --import ./tools/runtime/register.mjs tools/sample/hook-window.mjs --hooks 20 --seed 20261029
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { powerAt, chargeAndCast, DEFAULT_HOOK_CONFIG } from '../../packages/game-core/src/hook/index.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CFG = DEFAULT_HOOK_CONFIG;

function parseArgs() {
  const a = { hooks: 20, seed: 20261029 };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--help') { usage(); process.exit(0); }
    else if (argv[i] === '--hooks') a.hooks = Number(argv[++i]);
    else if (argv[i] === '--seed') a.seed = Number(argv[++i]);
    else { console.error(`未知参数：${argv[i]}`); process.exit(1); }
  }
  if (!Number.isInteger(a.hooks) || a.hooks <= 0) { console.error('--hooks 必须是正整数'); process.exit(1); }
  return a;
}

function usage() {
  console.log(`hook-window · 4011 机制侧分析（SIMULATED，不是真人数据）
用法：
  node --import ./tools/runtime/register.mjs tools/sample/hook-window.mjs [--hooks 20] [--seed 20261029]
输出：① 命中蓄力窗口（逐毫秒扫描）② N 钩模拟命中率 ③ 输入模型与口径声明`);
}

/** 数值表 → 目标距离与角度。表缺失即报错，不猜。 */
function loadTarget() {
  const rows = JSON.parse(readFileSync(join(ROOT, 'server/generated/config/hooks.json'), 'utf8'));
  const r = Array.isArray(rows) ? rows[0] : null;
  if (!r || typeof r.target_dist !== 'number' || typeof r.angle_deg !== 'number') {
    console.error('❌ hooks.json 缺少 target_dist / angle_deg，拒绝用默认值猜');
    process.exit(1);
  }
  return { targetDist: r.target_dist, angleDeg: r.angle_deg, id: r.id, note: r.note };
}

const hitAt = (holdMs, t) => chargeAndCast(powerAt(holdMs, CFG), t.angleDeg, t.targetDist, CFG).hit;

/** 逐毫秒扫描，返回所有命中区间。 */
function scanWindow(t) {
  const spans = [];
  let cur = null;
  for (let ms = 0; ms < CFG.cycleMs; ms++) {
    if (hitAt(ms, t)) { if (!cur) cur = { from: ms, to: ms }; else cur.to = ms; }
    else if (cur) { spans.push(cur); cur = null; }
  }
  if (cur) spans.push(cur);
  return spans;
}

/** 固定种子 LCG（数值取自 Numerical Recipes）；只为可复跑，不作随机性质量声明。 */
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

const pct = (x) => `${(x * 100).toFixed(1)}%`;

const a = parseArgs();
const t = loadTarget();
const spans = scanWindow(t);
const winMs = spans.reduce((s, x) => s + (x.to - x.from + 1), 0);
const powerEdge = spans.length ? powerAt(spans[0].from, CFG) : null;

console.log('## ① 命中蓄力窗口（逐毫秒扫描，复用 game-core/hook 判定）\n');
console.log('| 项 | 值 |');
console.log('|---|---|');
console.log(`| 目标距离 target_dist | ${t.targetDist}（hooks.json \`${t.id}\`，${t.note}） |`);
console.log(`| 角度 angle_deg | ${t.angleDeg}° |`);
console.log(`| 蓄力周期 cycleMs | ${CFG.cycleMs} ms（三角波，峰值在 ${CFG.cycleMs / 2} ms） |`);
console.log(`| 命中窗口 | ${spans.length ? spans.map((s) => `${s.from}–${s.to} ms`).join('、') : '无（任何力度都打不中）'} |`);
console.log(`| 窗口宽度 | ${winMs} ms / ${CFG.cycleMs} ms = **${pct(winMs / CFG.cycleMs)}** |`);
console.log(`| 窗口下沿力度 | ${powerEdge == null ? '-' : `${Math.round(powerEdge)} bp（${pct(powerEdge / CFG.maxPowerBp)} 满力）`} |`);
console.log('');

const rnd = lcg(a.seed);
const rows = [];
for (let i = 1; i <= a.hooks; i++) {
  const hold = Math.floor(rnd() * CFG.cycleMs);
  const r = chargeAndCast(powerAt(hold, CFG), t.angleDeg, t.targetDist, CFG);
  rows.push({ i, hold, powerBp: powerAt(hold, CFG), reach: r.reach, hit: r.hit });
}
const hitN = rows.filter((r) => r.hit).length;

console.log(`## ② ${a.hooks} 钩模拟（SIMULATED，种子 ${a.seed}）\n`);
console.log('| # | 蓄力 ms | 力度 bp | 水平触及 | 命中 |');
console.log('|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.i} | ${r.hold} | ${Math.round(r.powerBp)} | ${r.reach.toFixed(1)} | ${r.hit ? '✅' : '❌'} |`);
}
console.log('');
console.log(`| 指标 | 值 |`);
console.log(`|---|---|`);
console.log(`| 命中率 | **${pct(hitN / a.hooks)}**（${hitN}/${a.hooks}） |`);
console.log(`| 首钩 | ${rows[0].hit ? '✅ 命中' : '❌ 未中'}（蓄力 ${rows[0].hold} ms） |`);
console.log('');
console.log('## ③ 输入模型与口径声明\n');
console.log(`- 输入模型：**蓄力时长在 [0, ${CFG.cycleMs}) 内均匀分布**（"不看力度条随手一按"的零假设），角度固定为表值 ${t.angleDeg}°。`);
console.log(`- 该模型**不是**真人的蓄力分布；真人会盯着力度条，命中率取决于观察精度，只能实测。`);
console.log(`- 口径 = **SIMULATED**，可复跑（种子固定），**不得**引用为 MEASURED-HUMAN / C1（C1 需 ≥3 名真人真机，见 EVD-4011）。`);
console.log(`- 本工具不读 audit_log、不写数据库，与 \`hook-hitrate.mjs\`（读真实埋点）互补：一个算机制上限，一个量真人表现。`);
