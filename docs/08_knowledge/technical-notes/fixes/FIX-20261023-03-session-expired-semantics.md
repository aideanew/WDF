---
id: KB-FIX-20261023-03
title: 坏 token 返回 2001 而非 2002，与冻结契约的鉴权错误码语义不一致
status: active
date: 2026-10-23
kind: bug
severity: P1
module: account
owner: hark
related: [TASK-0104, PLAN-V001-03, MUST-08]
---

# 坏 token 返回 2001 而非 2002

## 1. 现象

`tools/dev/probe-s1.mjs` 第 3 节第二条断言红了：

```text
== 3. compliance.check ==
  ✅ 无 token → 2001 NOT_LOGGED_IN
  ❌ 坏 token → 2002 SESSION_EXPIRED → {"http":200,"c":2001,"msg":"bad signature","t":1792747496858}
```

即：拿着一个**被篡改/伪造**的令牌来请求，服务端回 `2001`（未登录），而不是 `2002`（会话失效）。

## 2. 影响

- 客户端的分支被写错：`2001` 的约定动作是"跳登录页"，`2002` 的约定动作是"**先静默刷新一次**，失败再跳登录"。
- 后果是**每次令牌被篡改或密钥轮换后，玩家被直接踢到登录页**，而不是无感续期——体验退化，且会把"密钥轮换"这种正常运维操作放大成"全体玩家掉线重登"。
- 不丢数据（存档在云端按 playerId 存，与 token 无关），但会明显抬高登录态抖动。

## 3. 根因

`server/src/gateway/auth.ts` 的 `verifyToken()` 里，四条失败路径全部硬写了 `ERR.NOT_LOGGED_IN`：

```ts
if (!token) return { ok: false, code: ERR.NOT_LOGGED_IN, msg: 'not logged in' };
if (dot <= 0) return { ok: false, code: ERR.NOT_LOGGED_IN, msg: 'malformed token' };
if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, code: ERR.NOT_LOGGED_IN, msg: 'bad signature' };
} catch { return { ok: false, code: ERR.NOT_LOGGED_IN, msg: 'bad payload' }; }
```

而冻结契约 `docs/04_planning/plan-v001/03-contracts-freeze.md:94` 写的是：

| 码 | 名称 | 含义 | 客户端动作 |
|---|---|---|---|
| 2001 | `NOT_LOGGED_IN` | 未登录 | 跳登录 |
| 2002 | `SESSION_EXPIRED` | **token 过期/无效** | 静默刷新一次，失败则跳登录 |

只有 `expired` 那条走了 `2002`，其余三条都漏了。属于**实现与冻结契约不一致**，不是设计分歧。

## 4. 修复

`server/src/gateway/auth.ts`：按"有没有令牌"与"令牌可不可信"两个维度重划边界，并在代码里写清理由（防止后人再改回去）。

| 情况 | 返回值 | 依据 |
|---|---|---|
| 压根没带 token | `2001 NOT_LOGGED_IN` | 客户端该去登录 |
| 段数不对 / 签名不匹配 / claims 解不开 | `2002 SESSION_EXPIRED` | 令牌不可信 = 会话无效，可先刷新 |
| `exp` 已过 | `2002 SESSION_EXPIRED` | 同上 |

```ts
// 语义严格按 03-contracts-freeze.md：
//   2001 NOT_LOGGED_IN = 压根没带令牌（客户端该去登录）
//   2002 SESSION_EXPIRED = 令牌过期/无效（客户端可先静默刷新一次，失败再跳登录）
```

**放弃的方案**：把 `expired` 也改成 `2001`，让"统一回 2001"自洽。
否决理由：冻结契约是**已评审的对外约定**，客户端按 2002 做静默刷新；改契约要动客户端与文档两处，且丢掉"可刷新"这个能力。实现向契约看齐，不是契约向实现看齐。

## 5. 验证

集成测试（`tests/integration/auth.test.mjs`，PGlite 内存库，不打 HTTP）：

```text
$ node --import ./tools/runtime/register.mjs --test tests/integration/auth.test.mjs
✔ AT-0104 令牌签发与鉴权口径
✔ AT-0104 account.login 身份复用与参数校验
✔ AT-0105 compliance.check
✔ AT-0107 save.push 乐观锁与幂等
ℹ tests 7  pass 7  fail 0
```

其中三条断言直接对应本 bug（缺令牌 / 坏签名 / 过期），坏签名与过期用 `forge()` 手工按线上格式造令牌，不依赖 `WDF_TOKEN_TTL_MS`。

真实 HTTP 探针（服务端跑在 5050）：

```text
== 3. compliance.check ==
  ✅ 无 token → 2001 NOT_LOGGED_IN
  ✅ 坏 token → 2002 SESSION_EXPIRED
  ✅ 带 token → c === 0
[probe] 通过 30，失败 0
```

判定 **PASS**。

## 6. 回归与遗留

- **遗留（重要）**：契约承诺的"静默刷新一次"依赖 `account.refresh`，而该动作**当前仍是 todo（返回 4999）**。所以现阶段客户端收到 `2002` 时并没有真正可用的刷新通道，实际效果仍是回登录页。要兑现契约语义，必须尽早实现 `account.refresh`（AT 未开卡，需在计划里补）。
- 密钥轮换（改 `WDF_TOKEN_SECRET`）会让**存量令牌全部变成 `2002`**。这是预期行为，但轮换前应确认登录链路可用。
- **教训**：错误码是**对外契约的一部分**，写 `if` 的时候要对着错误码表逐条核，不能凭"都算没登录"的直觉合并。凡是 `2001/2002/2003` 这类同段错误，必须逐条映射到契约原文。
