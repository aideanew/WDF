// 把 packages/game-core/src 与 packages/contracts/src 复制到 client/assets/scripts/generated/，并写哈希清单供 guard 校验“未手改”
//
// 设计约束（2026-10-23 修复）：
// 1. 绝不 rmSync 整个目录。generated/ 下由 Cocos 编辑器生成同名 .meta（纪录资源 uuid），
//    整目录删除会让 Cocos 重新分配 uuid，场景/预制体里对这些脚本的引用全部断裂。
// 2. 改为“覆盖写 + 只清理已消失源文件对应的 .ts 产物”，单文件 unlink，不碰任何 .meta。
// 3. 顺带避免触发沙箱/CI 对批量删除的保护（原实现的 recursive rm 一次删 60+ 文件会被拦截）。
import { p, read, write, walk, rel, sha, GEN_HEADER, exists } from '../lib/util.mjs';
import { unlinkSync } from 'node:fs';
import { relative, join } from 'node:path';

const targets = [['packages/game-core/src', 'game-core'], ['packages/contracts/src', 'contracts']];
const outRoot = p('client/assets/scripts/generated');
const manifestPath = join(outRoot, '_sync-manifest.json');

// 旧清单只用于识别“上次生成、这次不再生成”的产物
let prev = {};
if (exists(manifestPath)) {
  try {
    prev = JSON.parse(read(manifestPath)) ?? {};
  } catch {
    prev = {};
  }
}

const manifest = {};
let removed = 0;

for (const [src, name] of targets) {
  const dest = join(outRoot, name);
  const written = new Set();

  for (const f of walk(p(src), (f) => f.endsWith('.ts'))) {
    const body = GEN_HEADER + read(f);
    const out = join(dest, relative(p(src), f));
    write(out, body);
    const key = rel(out);
    written.add(key);
    manifest[key] = sha(body);
  }

  // 增量清理：只删本目标上次产出、这次不再产出的 .ts；.meta 与其它文件一律不动
  const prefix = `client/assets/scripts/generated/${name}/`;
  for (const oldKey of Object.keys(prev)) {
    if (!oldKey.startsWith(prefix) || written.has(oldKey) || !oldKey.endsWith('.ts')) continue;
    const abs = p(oldKey);
    if (!exists(abs)) continue;
    unlinkSync(abs);
    removed += 1;
  }
}

write(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
write(
  join(outRoot, 'README.md'),
  '由 `npm run sync` 从 packages/game-core 与 packages/contracts 复制而来，**禁止手改**（guard 校验哈希）。\n' +
    '同步采用「覆盖写 + 增量清理」，不会删除本目录下由 Cocos 生成的 `.meta`。\n',
);
console.log(
  `✅ 已同步 ${Object.keys(manifest).length} 个文件到 client/assets/scripts/generated/` +
    `（清理 ${removed} 个失效产物；.meta 未触碰）`,
);
