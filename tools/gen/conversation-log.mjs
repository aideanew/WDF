// 把对话日志（每行一条 JSON：role/time/text/kind）逐字导出为 docs/08_knowledge/sources/conversation-log/<日期>.md
// 用法：node tools/gen/conversation-log.mjs <日志目录>
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { p, read, write } from '../lib/util.mjs';
const dir = process.argv[2];
if (!dir) { console.log('用法：node tools/gen/conversation-log.mjs <日志目录(*.jsonl)>'); process.exit(0); }
let total = 0;
for (const f of readdirSync(dir).filter((n) => n.endsWith('.jsonl')).sort()) {
  const rows = read(join(dir, f)).split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const who = (r) => ({ user: '👤 用户', assistant: '🤖 Hark' })[r.role] ?? r.role;
  const body = rows.map((r) => `### ${who(r)}${r.kind ? `（${r.kind}）` : ''} · ${r.time ?? ''}\n\n${String(r.text ?? '').trim()}\n`).join('\n---\n\n');
  const day = f.replace('.jsonl', '');
  write(p('docs/08_knowledge/sources/conversation-log', `${day}.md`), `# 对话记录 ${day}（UTC 日期分文件，时间为北京时间）\n\n共 ${rows.length} 条，原文逐字导出，未删改。\n\n${body}`);
  total += rows.length;
}
console.log(`✅ 已导出 ${total} 条对话`);
