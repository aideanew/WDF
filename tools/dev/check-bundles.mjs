#!/usr/bin/env node
/**
 * 核对 7 个 Asset Bundle 的分包配置是否真的会生效。
 *
 * 检查三层（任何一层配了都算数，bundle 级覆盖 > 项目方案）：
 *  1. 项目方案：client/settings/v2/packages/builder.json → bundleConfig.custom.default.configs.miniGame
 *     —— v3.8 起 Bundle 的压缩类型/远程包统一在「项目设置 → Bundle 配置」里配（官方文档原文），
 *        Default Config 是所有 Bundle 的默认方案；Independent Config 勾选后才有按平台的行。
 *  2. Bundle 级覆盖：client/assets/bundles/b-*.meta 的 userData（老版本或单独覆盖时写在这里）。
 *  3. 构建产物：client/build/wechatgame/game.json 是否出现 "subpackages"（终极事实，需重新构建后才有）。
 *
 * 为什么必须有这个脚本：
 *  - Inspector 里改完必须点右上角绿色 ✓ 才写进文件，界面上看着改了、文件里可能是空的；
 *  - `.meta` 是 JSON，不能用 require() 读（Node 会当 JS 解析，报 SyntaxError）；
 *  - 项目方案（builder.json）与 Bundle 覆盖（.meta）是两个地方，只查一处会误判。
 *
 * 用法：node tools/dev/check-bundles.mjs     退出码 0=全配好，1=还有缺项
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const BUNDLES_DIR = join(ROOT, 'client', 'assets', 'bundles');
const SETTINGS = join(ROOT, 'client', 'settings', 'v2', 'packages', 'builder.json');
const BUILD_GAME_JSON = join(ROOT, 'client', 'build', 'wechatgame', 'game.json');

/** 目标配置，来自 docs/03_solution/ui/cocos-editor-glossary.md §3（依据 ARCH-0001 §4.4） */
const EXPECTED = [
  { name: 'b-common', priority: 6 },
  { name: 'b-shallow', priority: 5 },
  { name: 'b-deep', priority: 4 },
  { name: 'b-island', priority: 4 },
  { name: 'b-defense', priority: 4 },
  { name: 'b-event', priority: 3 },
  { name: 'b-social', priority: 3 },
];

/** 深度遍历，收集所有 compressionType 键与其路径（不预设 Cocos 的序列化形态，以实际文件为准）。 */
function collectCompression(node, path = '', hits = []) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => collectCompression(v, `${path}[${i}]`, hits));
    return hits;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      const p = `${path}.${k}`;
      if (v && typeof v === 'object') collectCompression(v, p, hits);
      else if (/^compressionType$/i.test(k)) hits.push({ path: p, value: String(v) });
    }
  }
  return hits;
}

/** 从遍历结果里找"微信小游戏平台"的压缩类型（键路径里含 wechat）。 */
function wechatCompression(hits) {
  const hit = hits.find((h) => /wechat/i.test(h.path));
  return hit ? { where: '微信平台行', value: hit.value, path: hit.path } : null;
}

/** meta 的 userData 里有没有任何 compression 相关设置（老版本/单独覆盖的形态）。 */
function metaCompression(userData) {
  const hits = collectCompression(userData);
  return hits.length ? { where: hits[0].path, value: hits[0].value } : null;
}

// ── 1. 读项目方案（Default Config） ────────────────────────────────
let scheme = { uniform: null, wechat: null, configMode: null, found: false };
if (existsSync(SETTINGS)) {
  const j = JSON.parse(readFileSync(SETTINGS, 'utf8'));
  const mini = j?.bundleConfig?.custom?.default?.configs?.miniGame;
  if (mini) {
    scheme.found = true;
    scheme.configMode = mini.configMode ?? '(未设置)';
    const hits = collectCompression(mini);
    const uniformHit = hits.find((h) => /fallbackOptions$/.test(h.path));
    scheme.uniform = uniformHit ? uniformHit.value : null;
    scheme.wechat = wechatCompression(hits);
  }
}

console.log('Bundle 分包配置核对（期望值来自 ARCH-0001 §4.4）\n');
console.log(`项目方案 Default Config（client/settings/v2/packages/builder.json）：`);
if (!scheme.found) {
  console.log('  ❌ 未找到 miniGame 配置 —— 「项目设置 → Bundle Config」里还没存下任何方案');
} else {
  console.log(`  Independent Config（configMode）: ${scheme.configMode}`);
  console.log(`  统一值 Uniform Config（All Mini Games）: ${scheme.uniform ?? '(未设置)'}`);
  console.log(`  微信平台行 WeChat Mini Game: ${scheme.wechat ? `${scheme.wechat.value}（${scheme.wechat.path}）` : '(未单独设置)'}`);
}
console.log('');

let bad = 0;
console.log('文件夹       priority(期望)  Bundle覆盖       项目方案微信        判定');
console.log('-----------  --------------  ---------------  ------------------  ----');

for (const e of EXPECTED) {
  const metaPath = join(BUNDLES_DIR, `${e.name}.meta`);
  let prio = null;
  let override = null;
  if (existsSync(metaPath)) {
    const ud = JSON.parse(readFileSync(metaPath, 'utf8')).userData ?? {};
    prio = ud.priority ?? null;
    override = metaCompression(ud);
  } else {
    console.log(`${e.name.padEnd(11)}  ${'文件不存在'.padEnd(14)}  —                —                   ❌`);
    bad += 1;
    continue;
  }
  const effective = override?.value ?? scheme.wechat?.value ?? scheme.uniform ?? null;
  const ok = /subpackage/i.test(String(effective));
  if (!ok) bad += 1;
  console.log(
    [
      e.name.padEnd(11),
      `${prio ?? '无'}(${e.priority})`.padEnd(14),
      (override ? override.value : '(无)').padEnd(15),
      (scheme.wechat ? scheme.wechat.value : scheme.uniform ?? '(无)').padEnd(18),
      ok ? '✅' : '❌',
    ].join('  '),
  );
}

// ── 2. 构建产物（终极事实） ────────────────────────────────────────
console.log('');
if (existsSync(BUILD_GAME_JSON)) {
  const game = readFileSync(BUILD_GAME_JSON, 'utf8');
  if (/"subpackages"/.test(game)) {
    console.log('✅ 构建产物 client/build/wechatgame/game.json 已包含 "subpackages"（分包真的生成了）');
  } else {
    console.log('❌ 构建产物 game.json 还没有 "subpackages" —— 这是改配置**之前**构建的，改完必须重新构建再看');
    bad += 1;
  }
  const subDir = join(ROOT, 'client', 'build', 'wechatgame', 'subpackages');
  if (existsSync(subDir)) {
    console.log(`✅ 构建产物目录 subpackages/ 已存在（分包被输出到本地，而不是远程包）`);
  }
} else {
  console.log('ℹ️  尚无构建产物（client/build/wechatgame/ 不存在），改完配置构建后再来复核 game.json');
}

console.log('');
if (bad === 0) {
  console.log('全部达标。');
  process.exitCode = 0;
} else {
  console.log(`还有 ${bad} 处未达标。修法（对应你截图里的界面）：`);
  console.log('  A. 压缩类型（一处配好，7 个 Bundle 全生效）：');
  console.log('     菜单 Project → Project Settings → 左侧 Bundle Config → 方案选 Default Config');
  console.log('     → 点 Mini Game 页签 → 保持 Independent Config 勾选');
  console.log('     → 平台表格**向下滚动**找到 WeChat Mini Game 行（在 Taobao 之后）');
  console.log('     → 该行 Compression Type 下拉选 Subpackage；Is Remote 保持不勾');
  console.log('     → 点面板空白处失焦保存');
  console.log('  B. 备选：不勾 Independent Config，直接在 Uniform Config（All Mini Games）里选 Subpackage，效果等价（我们只构建微信）');
  console.log('  C. 优先级（每个文件夹单独配）：Assets 面板单击 b-* 文件夹 → 右侧 Inspector');
  console.log('     → Bundle Priority 填目标值 → 点右上角绿色 ✓（不点不落盘）');
  console.log('  D. 改完跑本脚本自查，然后 Project → Build 重新构建，再看 game.json 是否出现 subpackages');
  process.exitCode = 1;
}
