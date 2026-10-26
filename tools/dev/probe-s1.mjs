#!/usr/bin/env node
/**
 * S1 联网链路探针（本地开发用，不接真机）。
 *
 * 用法：先起服务端 `npm run dev -w @wodefa/server`，再 `node tools/dev/probe-s1.mjs`
 * 环境变量：API_BASE（默认 http://127.0.0.1:5050）、PLAT（默认 wechat）
 *
 * 覆盖：healthz → account.login（含"同 code 复用身份"）→ compliance.check（含未登录拒绝）
 *       → save.pull（空）→ save.push（首次 accepted）→ save.push（同 rid 幂等）
 *       → save.push（旧 baseRevision → conflict）→ save.pull（拿到云端 revision）
 *
 * 退出码：全绿 0，有红 1。断言失败只打印不改数据，便于反复跑。
 */
const BASE = process.env.API_BASE ?? 'http://127.0.0.1:5050';
const PLAT = process.env.PLAT ?? 'wechat';
const CV = 'v0.1.0-s1';
const CFG = '16921d30a67a934f';

let pass = 0;
let fail = 0;

function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log(`  ✅ ${name}`);
  } else {
    fail += 1;
    console.log(`  ❌ ${name}${extra === undefined ? '' : ` → ${JSON.stringify(extra)}`}`);
  }
}

let ridSeed = 0;
function meta(rid) {
  return { rid: rid ?? `probe-${Date.now()}-${(ridSeed += 1)}`, cv: CV, cfg: CFG, sv: 1, plat: PLAT };
}

async function rpc(action, payload, opts = {}) {
  const body = { a: action, p: payload, m: meta(opts.rid) };
  if (opts.token) body.token = opts.token;
  const res = await fetch(`${BASE}/v1/rpc`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { c: -1, msg: `not json: ${text.slice(0, 200)}`, t: 0 };
  }
  return { http: res.status, ...json };
}

function section(title) {
  console.log(`\n== ${title} ==`);
}

async function main() {
  console.log(`[probe] base=${BASE} plat=${PLAT}`);

  section('0. healthz');
  const h = await fetch(`${BASE}/healthz`).then((r) => r.json()).catch(() => null);
  ok('GET /healthz 返回 ok:true', h?.ok === true, h);
  if (!h?.ok) {
    console.log('\n服务端没起来，先跑：npm run dev -w @wodefa/server');
    process.exit(1);
  }

  section('1. config.manifest（启动链第 2 步）');
  const mani = await rpc('config.manifest', {});
  ok('c === 0', mani.c === 0, mani);
  ok('configVersion 形如 16 位 hex', /^[0-9a-f]{16}$/.test(String(mani.d?.configVersion)), mani.d);
  ok('minClientVersion 非空', typeof mani.d?.minClientVersion === 'string' && mani.d.minClientVersion.startsWith('v'), mani.d);

  section('2. account.login');
  // PROBE_CODE：固定一个 code 反复跑，用来验证"重启进程后身份还在"（PGlite 落盘持久化）
  const FIXED = process.env.PROBE_CODE;
  const code = FIXED || `probe-code-${Date.now()}`;
  const login1 = await rpc('account.login', { code, plat: PLAT });
  ok('c === 0', login1.c === 0, login1);
  ok('返回 token', typeof login1.d?.token === 'string' && login1.d.token.length > 20);
  ok('返回 playerId', typeof login1.d?.playerId === 'string' && login1.d.playerId.startsWith('p_'), login1.d);
  if (FIXED) {
    console.log(`  ℹ️  固定 code=${FIXED}，isNew=${login1.d?.isNew}（首次跑应为 true，重启后再跑应为 false）`);
  } else {
    ok('isNew === true（新 code）', login1.d?.isNew === true, login1.d);
  }
  const token = login1.d?.token;
  const playerId = login1.d?.playerId;

  const login2 = await rpc('account.login', { code, plat: PLAT });
  ok('同 code 二次登录 playerId 相同', login2.d?.playerId === playerId, { a: playerId, b: login2.d?.playerId });
  ok('同 code 二次登录 isNew === false', login2.d?.isNew === false, login2.d);

  const loginBad = await rpc('account.login', { code: '', plat: PLAT });
  ok('空 code → 1001 BAD_PAYLOAD', loginBad.c === 1001, loginBad);

  section('3. compliance.check');
  const noAuth = await rpc('compliance.check', {});
  ok('无 token → 2001 NOT_LOGGED_IN', noAuth.c === 2001, noAuth);

  const badToken = await rpc('compliance.check', {}, { token: 'garbage.token.value' });
  ok('坏 token → 2002 SESSION_EXPIRED', badToken.c === 2002, badToken);

  const cc = await rpc('compliance.check', {}, { token });
  ok('带 token → c === 0', cc.c === 0, cc);
  ok('verified === true', cc.d?.verified === true, cc.d);
  ok('offlineAllowanceMs === 0（ADR-0008 必须联网）', cc.d?.offlineAllowanceMs === 0, cc.d);

  section('4. save.pull（读当前云端基线）');
  const pull0 = await rpc('save.pull', {}, { token });
  ok('c === 0', pull0.c === 0, pull0);
  // 探针必须**可重复跑**：老玩家云端口袋里已有存档，不能假设 summary === null。
  // 所以后面所有 revision 断言都以这里的 base 为基准，而不是硬编码 1 / 2。
  const base = pull0.d?.summary?.revision ?? 0;
  console.log(`  ℹ️  当前云端 revision = ${base}${base === 0 ? '（空存档，首次上传）' : '（已有存档，按增量校验）'}`);

  section('5. save.push（以当前 revision 为 base 上传）');
  const snapshot = {
    schemaVersion: 1,
    configVersion: CFG,
    saveId: `s_${Date.now()}`,
    revision: base,
    savedAt: Date.now(),
    modules: { currency: { lingcao: 0, mazi: 0, xinghui: 0 } },
    checksum: 123456,
  };
  const pushRid = `probe-push-${Date.now()}`;
  const push1 = await rpc('save.push', { baseRevision: base, snapshot, checksum: 123456 }, { token, rid: pushRid });
  ok('c === 0', push1.c === 0, push1);
  ok('accepted === true', push1.d?.accepted === true, push1.d);
  ok(`revision === ${base + 1}`, push1.d?.revision === base + 1, push1.d);

  section('6. 幂等：同 rid 重放，必须拿到同一份响应');
  const pushDup = await rpc('save.push', { baseRevision: base, snapshot, checksum: 123456 }, { token, rid: pushRid });
  ok(`revision 仍为 ${base + 1}（未二次递增）`, pushDup.d?.revision === base + 1, pushDup.d);
  ok('accepted 仍为 true', pushDup.d?.accepted === true, pushDup.d);

  section('7. 冲突：旧 baseRevision + 新 rid');
  const pushStale = await rpc('save.push', { baseRevision: base, snapshot, checksum: 999 }, { token });
  ok('c === 0（冲突不是错误）', pushStale.c === 0, pushStale);
  ok('accepted === false', pushStale.d?.accepted === false, pushStale.d);
  ok(`conflict.revision === ${base + 1}`, pushStale.d?.conflict?.revision === base + 1, pushStale.d);

  section('8. 正确 baseRevision：再推一次，revision 继续 +1');
  // 注意：snapshot 是**不透明负载**，服务端原样存；要验证"存的是哪一份"，
  // 必须让两份 snapshot 自身可区分（内层 checksum 一起换），否则会误判成服务端没更新。
  const snapshot2 = { ...snapshot, revision: base + 1, savedAt: Date.now(), checksum: 777 };
  const push2 = await rpc('save.push', { baseRevision: base + 1, snapshot: snapshot2, checksum: 777 }, { token });
  ok('accepted === true', push2.d?.accepted === true, push2.d);
  ok(`revision === ${base + 2}`, push2.d?.revision === base + 2, push2.d);

  section('9. save.pull（拿到云端最新）');
  const pull1 = await rpc('save.pull', {}, { token });
  ok(`summary.revision === ${base + 2}`, pull1.d?.summary?.revision === base + 2, pull1.d?.summary);
  ok('快照内层 checksum 为 777（确认是第二次上传的那份）', pull1.d?.snapshot?.checksum === 777, pull1.d?.snapshot?.checksum);

  section('10. 未实现动作边界');
  const todo = await rpc('event.start', {}, { token });
  ok('event.start 仍为 todo → 4999', todo.c === 4999, todo);

  console.log(`\n[probe] 通过 ${pass}，失败 ${fail}`);
  // 不用 process.exit()：Windows 上会在 undici keep-alive 连接收尾时触发 libuv 断言
  // (`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`)，看起来像崩了。
  // 置 exitCode 让事件循环自然结束，退出码语义不变。
  process.exitCode = fail === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error('[probe] 崩了：', e);
  process.exit(1);
});
