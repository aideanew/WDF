// 每个检查返回问题数组（字符串）。run-all 汇总；任一非空即失败。
import { p, read, readJson, walk, rel, listDirs, exists, sha, catalog, frontMatter } from '../lib/util.mjs';
import { SYNC_TARGETS } from '../lib/sync-targets.mjs';
import { readdirSync } from 'node:fs';

const S = 'client/assets/scripts';
const importsOf = (src) => [...src.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] ?? m[2]);
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
// 换行与尾随空白规范化。用它判「内容是否同步」，否则 core.autocrlf=true 把源文件还原成 CRLF
// 时会产生假红；纯换行差异单独上报（见 generatedUntouched 的最后一支）。
const norm = (s) => s.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '');

export function rootWhitelist() {
  const files = new Set(['AGENTS.md', 'README.md', 'CHANGELOG.md', 'package.json', 'package-lock.json', 'tsconfig.base.json', '.gitignore', '.gitattributes', '.editorconfig', '.env.example']);
  const dirs = new Set(['docs', 'game-data', 'packages', 'client', 'server', 'tools', 'tests', 'art-source', '.local', '.git', '.github', '.workbuddy', '.product-development', 'node_modules']);
  const bad = [];
  for (const n of readdirSync(p('.'), { withFileTypes: true })) {
    if (n.isDirectory() ? !dirs.has(n.name) : !files.has(n.name)) bad.push(`根目录不在白名单：${n.name}`);
  }
  for (const f of walk(p('.'), (f) => /(_old|_bak|_backup|_v\d+|副本|_final)\.[a-z]+$/i.test(f) && !rel(f).startsWith('client/library') && !rel(f).startsWith('docs/09_archive/'))) bad.push(`禁止的历史副本命名：${rel(f)}`);
  return bad;
}

export function gameCorePurity() {
  const bad = [];
  for (const f of walk(p('packages/game-core/src'), (f) => f.endsWith('.ts'))) {
    const src = stripComments(read(f)); const r = rel(f);
    for (const i of importsOf(src)) if (!i.startsWith('.')) bad.push(`${r}：game-core 只能相对导入，发现 "${i}"`);
    if (/\bMath\.random\s*\(/.test(src)) bad.push(`${r}：禁止 Math.random（用 common/rng）`);
    if (/\bDate\.now\s*\(|new Date\s*\(/.test(src)) bad.push(`${r}：禁止读系统时钟（时间由调用方传入）`);
    if (/\benum\s+\w+|\bnamespace\s+\w+/.test(src)) bad.push(`${r}：只用可擦除语法（禁止 enum/namespace）`);
    if (/\b(wx|tt)\.\w+/.test(src)) bad.push(`${r}：禁止平台 API`);
  }
  for (const f of walk(p('packages/contracts/src'), (f) => f.endsWith('.ts'))) {
    const src = stripComments(read(f));
    for (const i of importsOf(src)) if (!i.startsWith('.')) bad.push(`${rel(f)}：contracts 只能相对导入，发现 "${i}"`);
    if (/\benum\s+\w+|\bnamespace\s+\w+/.test(src)) bad.push(`${rel(f)}：只用可擦除语法`);
  }
  return bad;
}

export function clientBoundaries() {
  const bad = [];
  for (const f of walk(p(S), (f) => f.endsWith('.ts'))) {
    const r = rel(f); if (r.startsWith(`${S}/generated/`)) continue;
    const src = stripComments(read(f));
    const layer = r.slice(S.length + 1).split('/');
    const inPlatformImpl = layer[0] === 'platform' && layer[1] !== 'contracts' && layer[1] !== 'index.ts';
    if (!inPlatformImpl && /\b(wx|tt)\.[a-zA-Z]/.test(src)) bad.push(`${r}：只有 platform/<impl>/ 可以调用 wx./tt.`);
    for (const i of importsOf(src)) {
      if (!i.startsWith('.')) { if (!['cc', 'cc/env'].includes(i)) bad.push(`${r}：未登记的外部依赖 "${i}"`); continue; }
      const target = new URL(i, 'file:///' + r).pathname.slice(1);
      const t = target.slice(S.length + 1).split('/');
      if (!target.startsWith(S + '/')) { bad.push(`${r}：导入跳出 scripts/：${i}`); continue; }
      // features 互访只能经 index
      if (layer[0] === 'features' && t[0] === 'features' && t[1] !== layer[1] && t.length > 2 && t[2] !== 'index') bad.push(`${r}：跨模块只能 import features/${t[1]}/index.ts`);
      if (layer[0] === 'ui-kit' && t[0] === 'features') bad.push(`${r}：ui-kit 不得依赖 features`);
      if (layer[0] === 'features' && layer[2] === 'model' && t[0] === 'features' && t[1] === layer[1] && t[2] === 'view') bad.push(`${r}：model 不得依赖 view`);
      if (layer[0] === 'features' && layer[2] === 'model' && t[0] === 'platform' && t[1] !== 'contracts' && t[1] !== 'index') bad.push(`${r}：model 不得依赖平台实现`);
      if (layer[0] === 'services' && t[0] === 'features') bad.push(`${r}：services 不得依赖 features`);
      if (inPlatformImpl && t[0] !== 'platform') bad.push(`${r}：平台实现只能依赖 platform/contracts`);
    }
    if (layer[0] === 'features' && layer[2] === 'model' && /from\s+['"]cc['"]/.test(src)) bad.push(`${r}：model 层不依赖 cc（保持可单测）`);
  }
  return bad;
}

export function serverBoundaries() {
  const bad = [];
  for (const f of walk(p('server/src/modules'), (f) => f.endsWith('.ts'))) {
    const r = rel(f); const [, , , mod] = r.split('/');
    for (const i of importsOf(stripComments(read(f)))) {
      // 只查**同级模块**：`../<模块>/repo|handlers`。必须以 `../` 开头（恰好一层），
      // 这样 `../../gateway/handlers.ts`、`../../core/db.ts` 这类基础设施引用不算违规
      // —— gateway/core 不是业务模块，模块依赖它们（拿 Handler 类型、拿 db）是设计内的。
      const m = /^\.\.\/([a-z-]+)\/(repo|handlers)(\.ts)?$/.exec(i);
      if (m && m[1] !== mod) bad.push(`${r}：跨模块只能调用对方 service，发现 ${i}`);
    }
  }
  return bad;
}

export function catalogConsistency() {
  const bad = []; const cat = catalog(); const ids = new Set();
  const required = ['id', 'name', 'phase', 'client', 'core', 'server', 'contracts', 'bundle', 'authority', 'online', 'tables', 'save'];
  for (const m of cat.modules) {
    for (const k of required) if (!(k in m)) bad.push(`module-catalog：${m.id ?? '?'} 缺少字段 ${k}`);
    if (ids.has(m.id)) bad.push(`module-catalog：重复 id ${m.id}`); ids.add(m.id);
    const chk = (flag, dir) => { const has = exists(p(dir)); if (m.phase === 'v1' && flag && !has) bad.push(`${m.id}：catalog 标记存在但缺目录 ${dir}`); if ((m.phase !== 'v1' || !flag) && has) bad.push(`${m.id}：catalog 未登记却存在目录 ${dir}`); };
    chk(m.client, `${S}/features/${m.id}`); chk(m.core, `packages/game-core/src/${m.id}`); chk(m.contracts, `packages/contracts/src/${m.id}`); chk(m.server, `server/src/modules/${m.id}`);
    if (m.phase === 'v1' && m.bundle !== 'app' && !exists(p(`client/assets/bundles/${m.bundle}`))) bad.push(`${m.id}：资源包 ${m.bundle} 不存在`);
  }
  const allow = { core: ['common', 'save', 'generated'], contracts: ['common', 'config', 'save'], server: ['save', 'config', 'ops'] };
  for (const d of listDirs(p(`${S}/features`))) if (!ids.has(d)) bad.push(`孤儿目录（catalog 未登记）：features/${d}`);
  for (const d of listDirs(p('packages/game-core/src'))) if (!ids.has(d) && !allow.core.includes(d)) bad.push(`孤儿目录：game-core/src/${d}`);
  for (const d of listDirs(p('packages/contracts/src'))) if (!ids.has(d) && !allow.contracts.includes(d)) bad.push(`孤儿目录：contracts/src/${d}`);
  for (const d of listDirs(p('server/src/modules'))) if (!ids.has(d) && !allow.server.includes(d)) bad.push(`孤儿目录：server/src/modules/${d}`);
  // game-core / contracts index 必须导出所有模块目录
  const coreIdx = read(p('packages/game-core/src/index.ts')); const ctIdx = read(p('packages/contracts/src/index.ts'));
  for (const d of listDirs(p('packages/game-core/src'))) if (!['generated'].includes(d) && !coreIdx.includes(`'./${d}'`)) bad.push(`game-core/src/index.ts 未导出 ${d}`);
  for (const d of listDirs(p('packages/contracts/src'))) if (!ctIdx.includes(`'./${d}'`)) bad.push(`contracts/src/index.ts 未导出 ${d}`);
  return bad;
}

export function bundles() {
  const bad = []; const reserved = ['main', 'resources', 'internal', 'start-scene'];
  for (const d of listDirs(p('client/assets/bundles'))) {
    if (reserved.includes(d)) bad.push(`Bundle 与内置重名：${d}`);
    if (!/^b-[a-z0-9-]+$/.test(d)) bad.push(`Bundle 命名应为 b-*：${d}`);
    for (const f of walk(p(`client/assets/bundles/${d}`), (f) => /\.(ts|js)$/.test(f))) bad.push(`Bundle 内不得放脚本（ADR-0006）：${rel(f)}`);
    for (const n of listDirs(p(`client/assets/bundles/${d}`))) if (/^b-/.test(n)) bad.push(`Bundle 不支持嵌套：${d}/${n}`);
  }
  for (const f of walk(p('client/assets'), (f) => /\.(ts|js)$/.test(f))) if (!rel(f).startsWith(`${S}/`)) bad.push(`脚本必须放在 ${S}/：${rel(f)}`);
  return bad;
}

export function generatedUntouched() {
  const bad = []; const mf = p(`${S}/generated/_sync-manifest.json`);
  if (!exists(mf)) return [`缺少 ${S}/generated/_sync-manifest.json，请先 npm run sync`];
  const m = readJson(mf); const seen = new Set();
  for (const [f, h] of Object.entries(m)) { seen.add(f); if (!exists(p(f))) bad.push(`生成文件缺失：${f}`); else if (sha(read(p(f))) !== h) bad.push(`生成文件被手改：${f}（改 packages 源码后 npm run sync）`); }
  for (const f of walk(p(`${S}/generated`), (f) => f.endsWith('.ts'))) if (!seen.has(rel(f))) bad.push(`生成目录里出现未登记文件：${rel(f)}`);
  // 源与副本是否一致（防止改了 packages 忘记 sync）
  for (const [src, name] of SYNC_TARGETS)
    for (const f of walk(p(src), (f) => f.endsWith('.ts'))) {
      const out = `${S}/generated/${name}/${rel(f).slice(src.length + 1)}`;
      if (!m[out]) { bad.push(`未同步到客户端：${rel(f)}（npm run sync）`); continue; }
      if (!exists(p(out))) continue;
      const srcBody = read(f);
      const outBody = read(p(out)).slice(read(p(out)).indexOf('\n') + 1);
      if (norm(srcBody) !== norm(outBody)) bad.push(`客户端副本过期：${rel(f)}（npm run sync）`);
      else if (srcBody !== outBody) bad.push(`客户端副本换行不一致：${rel(f)}（core.autocrlf=true 把源文件还原成 CRLF；跑 npm run sync，或把源文件统一为 LF）`);
    }
  return bad;
}

// 原始资料目录：保持原文，免 front matter（由目录 README 说明）
export const RAW = ['docs/01_product/design-source/', 'docs/08_knowledge/sources/', 'docs/09_archive/superseded/design-history/'];

export function docsFrontMatter() {
  const bad = []; const ids = new Map(); const statuses = ['draft', 'active', 'done', 'proposed', 'accepted', 'superseded', 'cancelled', 'obsolete'];
  for (const f of walk(p('docs'), (f) => f.endsWith('.md'))) {
    const r = rel(f); if (RAW.some((x) => r.startsWith(x)) || r.includes('/templates/') || (r.endsWith('README.md') && r !== 'docs/00_governance/README.md')) continue;
    const fm = frontMatter(read(f));
    if (!fm) { bad.push(`${r}：缺少 front matter`); continue; }
    for (const k of ['id', 'title', 'status']) if (!fm[k]) bad.push(`${r}：front matter 缺 ${k}`);
    if (fm.status && !statuses.includes(fm.status)) bad.push(`${r}：status 非法 ${fm.status}`);
    if (fm.id) { if (ids.has(fm.id)) bad.push(`文档 ID 重复：${fm.id}（${ids.get(fm.id)} 与 ${r}）`); ids.set(fm.id, r); }
  }
  for (const r of RAW) if (!exists(p(r + 'README.md'))) bad.push(`原始资料目录缺 README：${r}`);
  for (const f of ['docs/01_product/project-charter.md', 'docs/01_product/mvp-scope.md', 'docs/04_planning/lifecycle.md']) if (!exists(p(f))) bad.push(`缺少关键文档：${f}`);
  for (const d of ['00_governance', '01_product', '02_requirements', '03_solution', '04_planning', '05_execution', '06_validation', '07_release', '08_knowledge', '09_archive']) if (!exists(p('docs', d))) bad.push(`缺少文档层 docs/${d}`);
  return bad;
}

export function everyDirExplained() {
  // 每个目录要么有文件，要么有 README（防止空目录腐烂）
  const bad = [];
  const scan = (dir) => { const ents = readdirSync(dir, { withFileTypes: true }); if (!ents.length) bad.push(`空目录：${rel(dir)}`); for (const e of ents) if (e.isDirectory() && !['node_modules', '.git', '.local', '.creator', 'library', 'temp', 'local', 'build', 'profiles', 'default-profiles'].includes(e.name)) scan(dir + '/' + e.name); };
  scan(p('.'));
  return bad;
}
