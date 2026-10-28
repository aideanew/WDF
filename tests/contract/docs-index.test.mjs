/**
 * 文档索引规则测试（FIX-5/R-5，2026-10-28 W2-1）。
 *
 * 背景：tools/gen/docs-index.mjs 原先跳过一切 README.md（仅放行 governance），
 * 导致带 front matter id 的 EVD 证据 README 进不了索引（FIX-5：EVD-4003/4004/4006/4007/4016 存在但查不到）。
 * 收窄后规则：只跳过"非 evidence 且非 governance"的 README.md；EVD README 始终纳入，缺 id 显示 ⚠缺（不静默丢弃）。
 *
 * 本测试对生成的 document-index.md 做静态断言（gen:docs 输出即被测对象）：
 *  1. 带 id 的 EVD README → 正常行（显示其 id）；
 *  2. 缺 id 的 EVD README → 显示 ⚠缺（证明未被静默丢弃）；
 *  3. governance README 仍纳入；
 *  4. 全部 EVD README 目录都在索引中（无遗漏）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const idx = readFileSync(join(root, 'docs', '00_governance', 'document-index.md'), 'utf8');

const evdRoot = join(root, 'docs', '06_validation', 'evidence');
const evdDirs = readdirSync(evdRoot).filter((d) => /^EVD-\d+$/.test(d));

test('带 id 的 EVD README 正常进索引（FIX-5 五份不再缺失）', () => {
  for (const id of ['EVD-4002', 'EVD-4003', 'EVD-4004', 'EVD-4006', 'EVD-4007', 'EVD-4016']) {
    assert.match(idx, new RegExp(`^\\| ${id} `, 'm'), `索引应含 ${id}`);
    assert.ok(idx.includes(`evidence/${id}/README.md`), `索引应指向 ${id}/README.md`);
  }
});

test('缺 id 的 EVD README 显示 ⚠缺 而非被丢弃（W5-2 后无现成 id-less 样本，动态验证）', () => {
  // W5-2（b32041c）给全部 25 份 id-less EVD 补了 front matter id，仓库已无现成 id-less 样本。
  // 本测试临时造一个 id-less EVD README → 重跑 gen:docs → 断言其显示 ⚠缺 → 清理 → 重跑还原。
  // 规则本身（缺 id 显示 ⚠缺 而非静默丢弃）仍被守护；与 W5-1 突变验证同法。
  const tmp = join(evdRoot, 'EVD-TMP');
  mkdirSync(tmp);
  writeFileSync(join(tmp, 'README.md'), '# EVD-TMP\n临时 id-less 证据。\n');
  try {
    execFileSync('node', [join(root, 'tools', 'gen', 'docs-index.mjs')], { cwd: root });
    const idx2 = readFileSync(join(root, 'docs', '00_governance', 'document-index.md'), 'utf8');
    assert.match(idx2, /^\| ⚠缺 .*evidence\/EVD-TMP\/README\.md/m, '缺 id 的 EVD README 应显示 ⚠缺');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    execFileSync('node', [join(root, 'tools', 'gen', 'docs-index.mjs')], { cwd: root });
  }
});

test('governance README 仍纳入', () => {
  assert.match(idx, /^\| GOV-0001 .*README\.md/m, 'governance README 应保留');
});

test('全部带 README.md 的 EVD 目录都在索引中（无遗漏；EVD-4012 用 baseline.md 除外）', () => {
  const withReadme = evdDirs.filter((d) =>
    readdirSync(join(evdRoot, d)).includes('README.md'),
  );
  for (const d of withReadme) {
    assert.ok(idx.includes(`evidence/${d}/README.md`), `索引应含 ${d}/README.md`);
  }
  assert.ok(!evdDirs.includes('EVD-4012') || withReadme.length === evdDirs.length - 1,
    '仅 EVD-4012 无 README.md（baseline.md），应恰少一个');
});
