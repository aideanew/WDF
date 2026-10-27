#!/usr/bin/env node
/**
 * 主包体积测量（TASK-4012 基线 / TASK-4014 瘦身前后的成对读数）。
 *
 * 口径：
 *  - 主包 = 构建产物目录下除分包根目录以外的全部文件（微信小游戏 = `subpackages/`）。
 *  - 分包根目录从 `game.json` 的 `subpackages[].root` 动态取，不写死路径。
 *  - 体积按文件原始字节求和（压缩后体积见 baseline.md 的 gzip 列，仅供参照）。
 *
 * 用法：node tools/measure-bundle.mjs [--platform wechatgame] [--json]
 *   默认平台 wechatgame；--json 只输出机器可读结果（供 EVD-401主体并入库）。
 * 退出码：产物缺失 2；测量成功 0（超预算不算失败，判定交给卡片）。
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { p, rel } from './lib/util.mjs';

/** 微信小游戏单主包硬上限（REQ-C-0001-platform.md:10） */
const MAIN_BUDGET = 4 * 1024 * 1024;

const argv = process.argv.slice(2);
const platformIdx = argv.indexOf('--platform');
const platform = (platformIdx >= 0 && argv[platformIdx + 1] ? argv[platformIdx + 1] : 'wechatgame').trim();
const asJson = argv.includes('--json');

const buildDir = p('client', 'build', platform);
if (!existsSync(buildDir)) {
  console.error(`❌ 构建产物不存在：${rel(buildDir)}（先用 Cocos 编辑器构建该平台）`);
  process.exit(2);
}

/** 递归收集 [绝对路径, 字节数]，跳过软链/特殊文件 */
function collect(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const f = join(dir, name);
    const st = statSync(f);
    if (st.isDirectory()) collect(f, out);
    else if (st.isFile()) out.push([f, st.size]);
  }
  return out;
}

/** 读 game.json 的分包根目录；没有分包字段 = 全量都算主包 */
function subpackageRoots() {
  const gameJson = join(buildDir, 'game.json');
  if (!existsSync(gameJson)) return [];
  const j = JSON.parse(readFileSync(gameJson, 'utf8'));
  return (j.subpackages ?? []).map((s) => String(s.root ?? '').replace(/\/+$/, '')).filter(Boolean);
}

const roots = subpackageRoots();
const all = collect(buildDir);
const inRoot = (file, root) => rel(file).startsWith(rel(join(buildDir, root)) + '/');

const main = all.filter(([f]) => !roots.some((r) => inRoot(f, r)));
const subs = all.filter(([f]) => roots.some((r) => inRoot(f, r)));
const sum = (rows) => rows.reduce((s, [, n]) => s + n, 0);

/** 按顶层目录/文件聚合，便于看大头 */
function byTopLevel(rows) {
  const map = new Map();
  for (const [f, n] of rows) {
    const key = rel(f).slice(rel(buildDir).length + 1).split('/')[0];
    map.set(key, (map.get(key) ?? 0) + n);
  }
  return [...map].map(([k, n]) => ({ name: k === '' ? '(root)' : k, bytes: n })).sort((a, b) => b.bytes - a.bytes);
}

// gzip 只算主包的最大单文件，全量 gzip 太慢；这里按文件逐个 gzip 汇总（30 个文件可接受）
const gzipTotal = (rows) => rows.reduce((s, [f]) => s + gzipSync(readFileSync(f), { level: 9 }).length, 0);

const mainBytes = sum(main);
const subBytes = sum(subs);
const result = {
  platform,
  buildDir: rel(buildDir),
  mainBytes,
  mainMB: +(mainBytes / 1048576).toFixed(3),
  mainFileCount: main.length,
  mainGzipBytes: gzipTotal(main),
  subpackageCount: roots.length,
  subpackageBytes: subBytes,
  totalBytes: mainBytes + subBytes,
  budgetBytes: MAIN_BUDGET,
  withinBudget: mainBytes <= MAIN_BUDGET,
  headroomMB: +((MAIN_BUDGET - mainBytes) / 1048576).toFixed(3),
  topLevel: byTopLevel(main).map((r) => ({ ...r, kb: +(r.bytes / 1024).toFixed(1) })),
  topFiles: main
    .map(([f, n]) => ({ file: rel(f), kb: +(n / 1024).toFixed(1), bytes: n }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10),
  subpackages: roots.map((r) => ({ root: r, bytes: sum(subs.filter(([f]) => inRoot(f, r))) })),
};

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`平台：${platform}  构建目录：${result.buildDir}`);
  console.log(`主包：${result.mainMB} MB（${mainBytes} B，${main.length} 文件，gzip ${(result.mainGzipBytes / 1024).toFixed(0)} KB）`);
  console.log(`预算：4 MB → ${result.withinBudget ? '✅ 在预算内' : '❌ 超出'}，余量 ${result.headroomMB} MB`);
  console.log(`分包：${roots.length} 个，合计 ${(subBytes / 1024).toFixed(1)} KB`);
  console.log('--- 主包分层 ---');
  for (const r of result.topLevel) console.log(`  ${String(r.kb).padStart(9)} KB  ${r.name}`);
  console.log('--- 主包 top10 文件 ---');
  for (const r of result.topFiles) console.log(`  ${String(r.kb).padStart(9)} KB  ${r.file}`);
}