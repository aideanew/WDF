#!/usr/bin/env node
// tools/sample/hook-hitrate.mjs（W7-2，2026-10-28）
// 4011 命中率采样聚合：读 audit_log(action='telemetry')，按 actor 分组算
//   首钩命中率 / 前 10 钩命中率 / 平均与中位 chargeMs。
// 用法：
//   node tools/sample/hook-hitrate.mjs --help
//   node tools/sample/hook-hitrate.mjs                     # 默认读 .local/pg
//   node tools/sample/hook-hitrate.mjs --db <dir>          # 指定 PGlite 目录
//   node tools/sample/hook-hitrate.mjs --from <jsonl>      # 从导出的 jsonl 读（每行 {actor,detail}）
// 输出：可直接粘进 metrics.md 的 Markdown 表 + 一行 采样口径。
// 纪律（W7-2）：绝不编造数字；样本 0 时输出"样本 0，无法计算"而非崩溃。
// 单写锁：postmaster.pid 为活 PID 时明确报错（提示先停 dev:server）；陈旧锁由
// PGlite 自身判锁兜底——打不开即报错，不许静默失败。
import { PGlite } from '@electric-sql/pglite';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_DB = join(ROOT, '.local', 'pg');

function fail(msg) { console.error(`❌ ${msg}`); process.exit(1); }

function usage() {
  console.log(`hook-hitrate · 4011 命中率采样聚合
用法：
  node tools/sample/hook-hitrate.mjs --help        本帮助
  node tools/sample/hook-hitrate.mjs               默认读 ${DEFAULT_DB}
  node tools/sample/hook-hitrate.mjs --db <dir>    指定 PGlite 目录
  node tools/sample/hook-hitrate.mjs --from <jsonl> 从 jsonl 读（每行 {actor,detail}）
输出：Markdown 表（首钩命中率 / 前 10 钩命中率 / 平均与中位 chargeMs）+ 采样口径。
备注：MEASURED-SINGLE（单机单人）≠ C1 口径（C1 需 ≥3 名真人）。`);
}

function parseArgs() {
  const a = { db: DEFAULT_DB, from: null };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--help') { usage(); process.exit(0); }
    else if (argv[i] === '--db') { a.db = resolve2(argv[++i]); }
    else if (argv[i] === '--from') { a.from = resolve2(argv[++i]); }
    else fail(`未知参数：${argv[i]}（--help 看用法）`);
  }
  return a;
}
function resolve2(p) { return join(ROOT, p); }

async function openDb(dbDir) {
  // 预检：postmaster.pid 首字段若为活 PID → 明确报错（陈旧哨兵如 -42 或死 PID 不拦）
  const pidFile = join(dbDir, 'postmaster.pid');
  if (existsSync(pidFile)) {
    const first = readFileSync(pidFile, 'utf8').trim().split(/\s+/)[0];
    const pid = parseInt(first, 10);
    if (Number.isFinite(pid) && pid > 0) {
      let alive = false;
      try { process.kill(pid, 0); alive = true; } catch { alive = false; }
      if (alive) fail(`数据目录 ${dbDir} 被进程 PID ${pid} 占用——PGlite 单写锁，请先停 dev:server（Ctrl+C）再跑聚合。`);
    }
  }
  // 权威判锁：PGlite 自身单写锁，打不开即占用
  try { return new PGlite(dbDir); }
  catch (e) { fail(`数据目录 ${dbDir} 打不开（可能被 dev:server 占用）——请先停 dev:server（Ctrl+C）。${e.message}`); }
}

async function loadRows(a) {
  if (a.from) {
    return readFileSync(a.from, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  }
  const db = await openDb(a.db);
  try {
    const r = await db.query(`SELECT actor, detail, at FROM audit_log WHERE action='telemetry' ORDER BY at`);
    return r.rows;
  } finally { await db.close(); }
}

function collect(rows) {
  const events = [];
  for (const row of rows) {
    let detail = row.detail;
    if (typeof detail === 'string') { try { detail = JSON.parse(detail); } catch { continue; } }
    if (!Array.isArray(detail)) continue;
    for (const ev of detail) {
      if (!ev || typeof ev.name !== 'string') continue;
      if (ev.name !== 'hook.hit' && ev.name !== 'hook.miss') continue;
      events.push({
        actor: String(row.actor),
        hit: ev.name === 'hook.hit',
        chargeMs: ev.props?.chargeMs,
        at: new Date(typeof ev.at === 'number' ? ev.at : row.at ?? 0).getTime(),
      });
    }
  }
  return events;
}

function aggregate(events) {
  if (events.length === 0) return null;
  const byActor = new Map();
  for (const e of events) {
    if (!byActor.has(e.actor)) byActor.set(e.actor, []);
    byActor.get(e.actor).push(e);
  }
  for (const arr of byActor.values()) arr.sort((a, b) => a.at - b.at);
  const actors = [...byActor.values()];
  // 首钩命中率：每人第 1 条是否 hit
  const firstHit = actors.filter((a) => a[0].hit).length;
  // 前 10 钩命中率：每人前 10 钩（不足 10 按实有）的命中占比
  let h10Hit = 0, h10N = 0;
  for (const a of actors) for (let i = 0; i < Math.min(10, a.length); i++) { h10N++; if (a[i].hit) h10Hit++; }
  // chargeMs 平均/中位
  const cs = events.map((e) => e.chargeMs).filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((x, y) => x - y);
  const mean = cs.length ? cs.reduce((s, x) => s + x, 0) / cs.length : null;
  const median = cs.length ? (cs.length % 2 ? cs[(cs.length - 1) / 2] : (cs[cs.length / 2 - 1] + cs[cs.length / 2]) / 2) : null;
  const ats = events.map((e) => e.at).filter((x) => Number.isFinite(x));
  return {
    actorCount: actors.length, hookCount: events.length,
    firstRate: firstHit / actors.length, firstHit,
    h10Rate: h10N ? h10Hit / h10N : 0, h10Hit, h10N,
    mean, median,
    t0: ats.length ? new Date(Math.min(...ats)) : null,
    t1: ats.length ? new Date(Math.max(...ats)) : null,
  };
}

function render(a) {
  if (!a) { console.log('样本 0，无法计算——audit_log 无 telemetry 埋点（先跑 npm run dev:server + Cocos 预览打 20 钩，再跑本脚本）。'); return; }
  const pct = (x) => `${(x * 100).toFixed(1)}%`;
  console.log('| 指标 | 值 |');
  console.log('|---|---|');
  console.log(`| 首钩命中率 | ${pct(a.firstRate)}（${a.firstHit}/${a.actorCount} 人） |`);
  console.log(`| 前 10 钩命中率 | ${pct(a.h10Rate)}（${a.h10Hit}/${a.h10N} 钩） |`);
  console.log(`| 平均蓄力时长 | ${a.mean == null ? '-' : `${Math.round(a.mean)} ms`} |`);
  console.log(`| 中位蓄力时长 | ${a.median == null ? '-' : `${Math.round(a.median)} ms`} |`);
  console.log(`采样口径：${a.actorCount} 人，${a.hookCount} 钩，时间窗 ${a.t0 ? a.t0.toISOString() : '-'} ~ ${a.t1 ? a.t1.toISOString() : '-'}（MEASURED-SINGLE，单机单人，非 C1 口径——C1 需 ≥3 名真人）。`);
}

const a = parseArgs();
render(aggregate(collect(await loadRows(a))));
