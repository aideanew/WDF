// 扫 docs 下所有 md 的 front matter → document-index.md、task-index.md；标出过期 review
// FIX-17（W6-1，2026-10-28）：抽出 shouldIndex/formatRow 两个纯函数并 export，供
// tests/contract/docs-index-rule.test.mjs 做纯函数断言（测试不再写仓库——原第二条用例
// mkdir EVD-TMP + 重写索引的"闸门自己造脏树"模式已废弃）。顶层执行用 import.meta.url 守卫，
// 被测试 import 时只暴露纯函数、不跑生成（避免并写/假红）。
import { p, read, write, walk, rel, frontMatter } from '../lib/util.mjs';
import { pathToFileURL } from 'node:url';

// 是否纳入文档索引（= 现有 4 条 continue 条件的逆）。纯函数，不碰文件系统。
export function shouldIndex(relPath) {
  // FIX-15（W5-1）：evidence 目录**自己的落地页** evidence/README.md 不是证据，精确排除
  //（其余 EVD-*/README.md 仍纳入）。用独立判断（不能并进下方 AND 链——该链对"在 evidence/
  // 内的 README"本就不跳过，`!==` 项是死代码）。
  if (relPath === 'docs/06_validation/evidence/README.md') return false;
  // FIX-5/R-5（W2-1）：只跳过"非 evidence 且非 governance"的 README.md —— EVD README 始终纳入。
  if (relPath.endsWith('README.md')
    && !relPath.startsWith('docs/06_validation/evidence/')
    && !relPath.startsWith('docs/00_governance/README.md')) return false;
  if (['docs/01_product/design-source/', 'docs/08_knowledge/sources/', 'docs/09_archive/superseded/design-history/'].some((x) => relPath.startsWith(x))) return false;
  if (relPath.includes('/templates/') || relPath.endsWith('document-index.md') || relPath.endsWith('task-index.md')) return false;
  return true;
}

// 索引行格式化（= 原 const fmt）。today 可注入以便测试确定性；缺 id 显 ⚠缺（不静默丢弃）。
export function formatRow(d, today = new Date().toISOString().slice(0, 10)) {
  return `| ${d.id ?? '⚠缺'} | ${d.title ?? ''} | ${d.status ?? ''} | ${d.review ? (d.review < today && d.status === 'active' ? `⚠ ${d.review}` : d.review) : ''} | \`${d.path.replace('docs/', '')}\` |`;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const today = new Date().toISOString().slice(0, 10);
  const docs = [];
  for (const f of walk(p('docs'), (f) => f.endsWith('.md'))) {
    const r = rel(f);
    if (!shouldIndex(r)) continue;
    const fm = frontMatter(read(f));
    docs.push({ path: r, ...(fm ?? {}) });
  }
  docs.sort((a, b) => a.path.localeCompare(b.path));
  const md = `---\nid: GOV-0010\ntitle: 文档索引（生成）\nstatus: active\nowner: hark\ncreated: 2026-10-23\nreview: 2026-11-23\n---\n\n# 文档索引（由 tools/gen/docs-index.mjs 生成，勿手改）\n\n共 ${docs.length} 篇。⚠ 表示活跃文档已过 review 日期。\n\n| ID | 标题 | 状态 | 复审 | 路径 |\n|---|---|---|---|---|\n` + docs.map((d) => formatRow(d, today)).join('\n') + '\n';
  write(p('docs/00_governance/document-index.md'), md);
  const tasks = docs.filter((d) => d.path.startsWith('docs/05_execution/tasks/'));
  write(p('docs/05_execution/task-index.md'), `---\nid: TASK-INDEX\ntitle: 任务索引（生成）\nstatus: active\nowner: hark\ncreated: 2026-10-23\nreview: 2026-11-23\n---\n\n# 任务索引（生成，勿手改）\n\n` + (tasks.length ? '| ID | 标题 | 状态 | 路径 |\n|---|---|---|---|\n' + tasks.map((d) => `| ${d.id} | ${d.title} | ${d.status} | \`${d.path}\` |`).join('\n') + '\n' : '暂无任务。\n'));
  console.log(`✅ 文档索引 ${docs.length} 篇，任务 ${tasks.length} 个`);
}
