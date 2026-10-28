---
id: EVD-0104
title: 服务端鉴权与 account.login
status: accepted
owner: hark
created: 2026-10-26
review: 2026-11-28
---

# EVD-0104 —— 服务端鉴权与 account.login

- **对应任务**：[TASK-0104](../../../05_execution/tasks/TASK-0104.md)（AT-0104）
- **采集时间**：2026-10-23 17:4x
- **环境**：Windows 10 / Node v24.12.0 / PGlite 0.5.11（WASM PostgreSQL 18.6）
- **判定**：**PASS**

## 1. 集成测试（内存库，不打 HTTP）

```text
$ node --import ./tools/runtime/register.mjs --test tests/integration/auth.test.mjs
[db] 迁移已执行：0001_init.sql
✔ AT-0104 令牌签发与鉴权口径
✔ AT-0104 account.login 身份复用与参数校验
✔ AT-0105 compliance.check
✔ AT-0107 save.push 乐观锁与幂等
✔ 未实现动作返回 4999，不伪装成业务失败
✔ 未知动作返回 1002
✔ AT-0105 config.manifest 与版本闸
ℹ tests 7   pass 7   fail 0
```

覆盖的验收标准（TASK-0104 §验收标准）：

| 条 | 断言 | 结果 |
|---|---|---|
| 1 | 合法登录 `c=0` 且 `d.token` 非空、形如 `payload.signature` 两段 base64url | ✅ |
| — | `claims.sub === playerId`、`claims.admin === false`、`exp > iat` | ✅ |
| 2 | 无 token 调 `save.pull` → `c=2001` | ✅ |
| 3 | 过期 token → `c=2002`；**坏签名 token → `c=2002`**（见 KB-FIX-20261023-03） | ✅ |
| 4 | 同一 `rid` 调 `save.push` 两次，`revision` 只 +1 | ✅（EVD-0107） |

额外断言（本卡未要求但属同一风险面）：同 `plat+code` 二次登录 `playerId` 相同、`isNew=false`；不同平台同 `code` 不得共用 `player`；`idempotent` 动作缺 `rid` → `1001`。

## 2. 真实 HTTP 探针（服务端 127.0.0.1:5050）

```text
$ node tools/dev/probe-s1.mjs
[probe] base=http://127.0.0.1:5050 plat=wechat

== 0. healthz ==
  ✅ GET /healthz 返回 ok:true

== 2. account.login ==
  ✅ c === 0
  ✅ 返回 token
  ✅ 返回 playerId
  ✅ isNew === true（新 code）
  ✅ 同 code 二次登录 playerId 相同
  ✅ 同 code 二次登录 isNew === false
  ✅ 空 code → 1001 BAD_PAYLOAD

== 3. compliance.check ==
  ✅ 无 token → 2001 NOT_LOGGED_IN
  ✅ 坏 token → 2002 SESSION_EXPIRED
  ✅ 带 token → c === 0

[probe] 通过 30，失败 0
```

## 3. 重启后身份保持（落盘持久化）

```text
$ PROBE_CODE=persist-check node tools/dev/probe-s1.mjs
  ℹ️  固定 code=persist-check，isNew=true（首次跑应为 true）

$ # Ctrl-C 停掉服务端，重新 node --import ../tools/runtime/register.mjs src/main.ts

$ PROBE_CODE=persist-check node tools/dev/probe-s1.mjs
  ℹ️  固定 code=persist-check，isNew=false（重启后应保持旧号）
```

数据落在 `.local/pg/`（PGlite 目录），重启进程不换号。

## 4. 全量闸门

```text
$ npm run verify
全部守卫通过
ℹ tests 17   pass 17   fail 0
EXIT=0
```

## 5. 已知缺口（本卡未闭环）

- `account.refresh` 仍是 `todo`（返回 `4999`），所以契约承诺的"收到 `2002` 静默刷新一次"目前没有通道，实际仍会回登录页。见 KB-FIX-20261023-03 §6。
- `account.bindStart` / `account.bindConfirm` 未实现（不在本卡范围）。
