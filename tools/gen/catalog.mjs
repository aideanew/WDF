// module-catalog.json → module-catalog.md + api-catalog.md；--scaffold 为 v1 模块补齐缺失骨架（不覆盖已有文件）
import { p, read, write, exists, catalog } from '../lib/util.mjs';

const cat = catalog();
const scaffold = process.argv.includes('--scaffold');
const yes = (b) => (b ? '✔' : '—');
let md = `---\nid: GOV-0009\ntitle: 模块总览（生成）\nstatus: active\nowner: hark\ncreated: 2026-10-23\nreview: 2026-11-23\n---\n\n# 模块总览（由 module-catalog.json 生成，勿手改）\n\n`;
md += '| 模块 | 名称 | 阶段 | 客户端 | 规则包 | 服务端 | 契约 | 资源包 | 权威 | 联网 | 数值表 | 存档段 | v5.5 |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
for (const m of cat.modules) md += `| ${m.id} | ${m.name} | ${m.phase} | ${yes(m.client)} | ${yes(m.core)} | ${yes(m.server)} | ${yes(m.contracts)} | ${m.bundle} | ${m.authority} | ${m.online} | ${m.tables.join(', ') || '—'} | ${m.save.join(', ') || '—'} | ${m.chapter} |\n`;
md += '\n路径约定：客户端 `client/assets/scripts/features/<id>/`；规则 `packages/game-core/src/<id>/`；契约 `packages/contracts/src/<id>/`；服务端 `server/src/modules/<id>/`。\n';
write(p('docs/00_governance/module-catalog.md'), md);

// api-catalog
const actionsSrc = read(p('packages/contracts/src/common/actions.ts'));
const rows = [...actionsSrc.matchAll(/'([a-z]+\.[A-Za-z]+)': \{ module: '(\w+)', auth: (true|false), idempotent: (true|false), desc: '([^']*)' \}/g)];
let api = `---\nid: DATA-0004\ntitle: 接口目录（生成）\nstatus: active\nowner: hark\ncreated: 2026-10-23\nreview: 2026-11-23\n---\n\n# 接口目录（由 contracts/common/actions.ts 生成，勿手改）\n\n传输：\`POST /v1/rpc\`，封套见 \`packages/contracts/src/common/envelope.ts\`。\n\n| 动作 | 模块 | 需登录 | 写操作（需 rid） | 说明 |\n|---|---|---|---|---|\n`;
for (const [, a, mod, auth, idem, desc] of rows) api += `| \`${a}\` | ${mod} | ${auth === 'true' ? '✔' : '—'} | ${idem === 'true' ? '✔' : '—'} | ${desc} |\n`;
write(p('docs/03_solution/data/api-catalog.md'), api);

if (scaffold) {
  let n = 0;
  const P = (s) => s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('');
  const mk = (f, body) => { if (!exists(f)) { write(f, body); n++; } };
  for (const m of cat.modules.filter((x) => x.phase === 'v1')) {
    if (m.client) { const N = P(m.id); mk(p(`client/assets/scripts/features/${m.id}/index.ts`), `export { ${N}Model } from './model/${N}Model';\n`); mk(p(`client/assets/scripts/features/${m.id}/model/${N}Model.ts`), `export class ${N}Model {}\n`); mk(p(`client/assets/scripts/features/${m.id}/README.md`), `# ${m.id} · ${m.name}\n\n${m.desc}\n`); }
    if (m.core) mk(p(`packages/game-core/src/${m.id}/index.ts`), `export const MODULE_ID = '${m.id}';\n`);
    if (m.contracts) mk(p(`packages/contracts/src/${m.id}/index.ts`), `export const MODULE_ID = '${m.id}';\n`);
    if (m.server) for (const f of ['handlers', 'service', 'repo']) mk(p(`server/src/modules/${m.id}/${f}.ts`), `export const MODULE = '${m.id}';\n`);
  }
  console.log(`✅ 骨架补齐 ${n} 个文件（已有文件不覆盖）。记得把新模块加入 game-core/contracts 的 index.ts。`);
}
console.log(`✅ 模块总览 ${cat.modules.length} 个模块；接口目录 ${rows.length} 个动作`);
