// 把 packages/game-core/src 与 packages/contracts/src 复制到 client/assets/scripts/generated/，并写哈希清单供 guard 校验“未手改”
import { p, read, write, walk, rel, sha, GEN_HEADER, exists } from '../lib/util.mjs';
import { rmSync } from 'node:fs';
import { relative, join } from 'node:path';

const targets = [['packages/game-core/src', 'game-core'], ['packages/contracts/src', 'contracts']];
const outRoot = p('client/assets/scripts/generated');
const manifest = {};
for (const [src, name] of targets) {
  const dest = join(outRoot, name);
  if (exists(dest)) rmSync(dest, { recursive: true, force: true });
  for (const f of walk(p(src), (f) => f.endsWith('.ts'))) {
    const body = GEN_HEADER + read(f);
    const out = join(dest, relative(p(src), f));
    write(out, body);
    manifest[rel(out)] = sha(body);
  }
}
write(join(outRoot, '_sync-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
write(join(outRoot, 'README.md'), '由 `npm run sync` 从 packages/game-core 与 packages/contracts 复制而来，**禁止手改**（guard 校验哈希）。\n');
console.log(`✅ 已同步 ${Object.keys(manifest).length} 个文件到 client/assets/scripts/generated/`);
