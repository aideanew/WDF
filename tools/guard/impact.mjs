// npm run impact <关键词>：列出关键词（表名/字段/模块/动作）在 catalog、代码、数值、文档中的出现位置
import { p, read, walk, rel, catalog } from '../lib/util.mjs';
const kw = process.argv[2];
if (!kw) { console.log('用法：npm run impact <关键词>'); process.exit(0); }
const mods = catalog().modules.filter((m) => m.id === kw || m.tables.includes(kw) || m.save.includes(kw) || m.name.includes(kw));
console.log(`\n# 影响面：${kw}\n`);
if (mods.length) { console.log('## 模块清单命中'); for (const m of mods) console.log(`- ${m.id}（${m.name}）表:${m.tables.join(',') || '—'} 存档:${m.save.join(',') || '—'} 包:${m.bundle} 权威:${m.authority}`); }
const groups = { '数值': 'game-data', '规则 game-core': 'packages/game-core/src', '契约': 'packages/contracts/src', '客户端': 'client/assets/scripts/features', '服务端': 'server/src', '数据库': 'server/db', '文档': 'docs' };
for (const [label, dir] of Object.entries(groups)) {
  const hits = walk(p(dir), (f) => /\.(ts|md|csv|json|sql)$/.test(f)).filter((f) => read(f).includes(kw)).map(rel);
  if (hits.length) console.log(`\n## ${label}（${hits.length}）\n` + hits.map((h) => `- ${h}`).join('\n'));
}
console.log('\n按 docs/00_governance/change-playbook.md 的“变更联动表”逐项检查。');
