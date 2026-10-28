/**
 * 文档索引规则纯函数测试（FIX-17，2026-10-28 W6-1）。
 *
 * 背景：W5-5 曾把"缺 id 显 ⚠缺"写成动态用例（临时 mkdir EVD-TMP + 重跑 gen:docs），
 * 属"闸门自己写仓库"——进程被打断会残留 EVD-TMP 致守卫随机变红，且与并行 gen 争写。
 * FIX-17 把规则抽成纯函数 shouldIndex/formatRow，本测试只断言纯函数，不碰文件系统。
 *
 * 覆盖：shouldIndex 的 4 条 continue 规则（含 FIX-15 落地页排除、W2-1 README 收窄、
 * design-source/sources/design-history、templates/生成索引自排除）+ formatRow 的 ⚠缺 与 id 两分支。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldIndex, formatRow } from '../../tools/gen/docs-index.mjs';

test('shouldIndex：EVD 证据 README 纳入（W2-1 收窄）', () => {
  assert.equal(shouldIndex('docs/06_validation/evidence/EVD-4016/README.md'), true);
});

test('shouldIndex：evidence 落地页排除（FIX-15/W5-1）', () => {
  assert.equal(shouldIndex('docs/06_validation/evidence/README.md'), false);
});

test('shouldIndex：governance README 纳入', () => {
  assert.equal(shouldIndex('docs/00_governance/README.md'), true);
});

test('shouldIndex：普通目录 README 跳过', () => {
  assert.equal(shouldIndex('docs/04_planning/README.md'), false);
});

test('shouldIndex：design-source / sources / design-history 跳过', () => {
  assert.equal(shouldIndex('docs/01_product/design-source/x.md'), false);
  assert.equal(shouldIndex('docs/08_knowledge/sources/y.md'), false);
  assert.equal(shouldIndex('docs/09_archive/superseded/design-history/z.md'), false);
});

test('shouldIndex：生成索引自身排除（document-index/task-index）', () => {
  assert.equal(shouldIndex('docs/00_governance/document-index.md'), false);
  assert.equal(shouldIndex('docs/05_execution/task-index.md'), false);
});

test('shouldIndex：任务卡与普通 md 纳入', () => {
  assert.equal(shouldIndex('docs/05_execution/tasks/TASK-0101.md'), true);
});

test('formatRow：缺 id 显示 ⚠缺（不静默丢弃）', () => {
  const row = formatRow({ path: 'docs/06_validation/evidence/EVD-TMP/README.md' });
  assert.ok(row.includes('⚠缺'), `应含 ⚠缺，实际：${row}`);
  assert.ok(row.includes('evidence/EVD-TMP/README.md'), `应含路径，实际：${row}`);
});

test('formatRow：有 id 显示该 id', () => {
  const row = formatRow({ id: 'EVD-4016', title: 'T', status: 'active', review: null, path: 'docs/06_validation/evidence/EVD-4016/README.md' });
  assert.ok(row.includes('| EVD-4016 '), `应以 | EVD-4016 开头，实际：${row}`);
  assert.ok(row.includes('evidence/EVD-4016/README.md'), `应含路径，实际：${row}`);
});
