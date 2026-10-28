// 扫 docs 下所有 md 的 front matter → document-index.md、task-index.md；标出过期 review
import { p, read, write, walk, rel, frontMatter } from '../lib/util.mjs';

const today = new Date().toISOString().slice(0, 10);
const docs = [];
for (const f of walk(p('docs'), (f) => f.endsWith('.md'))) {
  const r = rel(f);
  const fm = frontMatter(read(f));
  // FIX-5/R-5（2026-10-28）：原先跳过一切 README.md（仅放行 governance），导致 EVD 证据 README
  // 进不了索引。收窄为：只跳过"非 evidence 且非 governance"的 README.md —— EVD README 始终纳入，
  // 若缺 id 则显示 ⚠缺（不静默丢弃，可被突变测试检出）。
  if (r.endsWith('README.md') && !r.startsWith('docs/06_validation/evidence/') && !r.startsWith('docs/00_governance/README.md')) continue;
  if (['docs/01_product/design-source/', 'docs/08_knowledge/sources/', 'docs/09_archive/superseded/design-history/'].some((x) => r.startsWith(x))) continue;
  if (r.includes('/templates/') || r.endsWith('document-index.md') || r.endsWith('task-index.md')) continue;
  docs.push({ path: r, ...(fm ?? {}) });
}
docs.sort((a, b) => a.path.localeCompare(b.path));
const fmt = (d) => `| ${d.id ?? '⚠缺'} | ${d.title ?? ''} | ${d.status ?? ''} | ${d.review ? (d.review < today && d.status === 'active' ? `⚠ ${d.review}` : d.review) : ''} | \`${d.path.replace('docs/', '')}\` |`;
let md = `---\nid: GOV-0010\ntitle: 文档索引（生成）\nstatus: active\nowner: hark\ncreated: 2026-10-23\nreview: 2026-11-23\n---\n\n# 文档索引（由 tools/gen/docs-index.mjs 生成，勿手改）\n\n共 ${docs.length} 篇。⚠ 表示活跃文档已过 review 日期。\n\n| ID | 标题 | 状态 | 复审 | 路径 |\n|---|---|---|---|---|\n` + docs.map(fmt).join('\n') + '\n';
write(p('docs/00_governance/document-index.md'), md);
const tasks = docs.filter((d) => d.path.startsWith('docs/05_execution/tasks/'));
write(p('docs/05_execution/task-index.md'), `---\nid: TASK-INDEX\ntitle: 任务索引（生成）\nstatus: active\nowner: hark\ncreated: 2026-10-23\nreview: 2026-11-23\n---\n\n# 任务索引（生成，勿手改）\n\n` + (tasks.length ? '| ID | 标题 | 状态 | 路径 |\n|---|---|---|---|\n' + tasks.map((d) => `| ${d.id} | ${d.title} | ${d.status} | \`${d.path}\` |`).join('\n') + '\n' : '暂无任务。\n'));
console.log(`✅ 文档索引 ${docs.length} 篇，任务 ${tasks.length} 个`);
