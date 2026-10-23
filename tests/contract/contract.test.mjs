import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');

test('契约动作表 ↔ 服务端 handlers 一一对应', () => {
  const acts = [...read('packages/contracts/src/common/actions.ts').matchAll(/'([a-z]+\.[A-Za-z]+)':/g)].map((m) => m[1]).sort();
  const hs = [...read('server/src/gateway/handlers.ts').matchAll(/'([a-z]+\.[A-Za-z]+)':/g)].map((m) => m[1]).sort();
  assert.deepEqual(hs, acts);
});

test('数值校验器：坏数据必须报错（主键重复/外键缺失/概率合计≠10000/类型错误）', () => {
  let out = '';
  try { execFileSync('node', ['tools/gen/config.mjs', '--src', 'tests/fixtures/game-data-bad', '--check'], { encoding: 'utf8', stdio: 'pipe' }); }
  catch (e) { out = String(e.stderr); }
  assert.match(out, /主键重复/);
  assert.match(out, /不存在/);
  assert.match(out, /合计/);
  assert.match(out, /应为整数/);
});

test('数值校验器：好数据通过', () => {
  const out = execFileSync('node', ['tools/gen/config.mjs', '--src', 'tests/fixtures/game-data-good', '--check'], { encoding: 'utf8' });
  assert.match(out, /校验通过/);
});
