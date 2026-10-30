---
id: PLAN-V012-04
title: plan-v012 · 契约冻结包（六份，含完整性自检）
status: active
module: planning
owner: hark
created: 2026-10-30
review: 2026-11-13
related: [PLAN-V012-03, PLAN-V012-05]
---

# 04 · 契约冻结

> **唯一源**：`packages/contracts/src/**`（TypeScript 类型 + `as const` 目录）。
> 客户端副本由 `npm run gen` 生成为 `client/assets/scripts/generated/contracts/**`，**禁止手改**（守卫 `generatedUntouched`）。
> **本版对契约的改动 = 0**。下文是"现状冻结"，不是"提案"。

## 1. 六份契约的现状（逐份写唯一源 + 缺口）

### ① API — `packages/contracts/src/common/actions.ts` + 各模块 `index.ts`

| 项 | 现状 | 证据 |
|---|---|---|
| 动作数 | **22** | `ACTIONS` 对象 22 个键 |
| 每个动作的字段 | `module` / `auth` / `idempotent` / `desc` | 同上 |
| 请求/响应 Schema | zod，服务端 `server/src/gateway/payload.ts` 逐动作校验 | 20/20 覆盖（E-07 已关闭） |
| 分页格式 | **无分页契约**（`leaderboard.query` / `social.pull` 用 `limit` 参数） | `leaderboard/index.ts` |
| 幂等语义 | `idempotent: true` 的 15 个动作由服务端幂等表保证，只缓存 `c===0` | `server/src/gateway/handlers.ts` |
| 鉴权 | `auth: true` 17 个 / `auth: false` 5 个（login/refresh/telemetry/manifest） | `actions.ts` |

**缺口 G-1**：7 个动作仍是 `todo`（`salvage.claimInfo` / `economy.buyQuota` / `event.start|submit|result` / `social.send|pull`）。
契约**已冻结**（字段定义完整），实现未做 → 客户端拿到 `ERR.INTERNAL + FEATURE_NOT_AVAILABLE`，走"未开放"态。

### ② Errors — `packages/contracts/src/common/errors.ts`

| 项 | 现状 |
|---|---|
| 错误码 | **14 码**（`OK / CONTRACT / AUTH / RULE / SYSTEM / RISK / UPGRADE / BAD_PAYLOAD / UNKNOWN_ACTION / NOT_LOGGED_IN / SESSION_EXPIRED / BANNED / BIND_TICKET_INVALID / MINOR_TIME_LIMIT / DUPLICATE_REQUEST / QUOTA_EXHAUSTED / EVENT_CLOSED / EVENT_ALREADY_PLAYED / RATE_LIMITED / INTERNAL` —— 命名键 20 个，数值码 14 个为合同冻结集） |
| HTTP 映射 | 业务错误默认 **200**；仅 `RATE_LIMITED→429`、`INTERNAL→500`（`server/src/app.ts:10-14`） |
| 前端展示 | `common/ux.ts` 的 `UX_BY_ERROR_NAME`，用 `satisfies Record<keyof typeof ERR, …>` 强制穷举 |

**缺口 G-2（★ 本版必须记住的一条）**：事实码 **`3101`（浮力不足）不在 `ERR` 里**。
`ux.ts:64` 的兜底是 `{ state: 'error', retryable: true, next: 'retry' }` → `toUxState(3101)` 会得到
**"可重试的服务器错误"**，而它实际是**不可重试的业务拒绝**。
**处置（不改契约）**：客户端本地拦截（`ux-hint.ts` 加 `3101` 分支，不经过 `toUxState`）→ PD8-04。

### ③ Identity — `packages/contracts/src/account/index.ts` + `save/index.ts`

| 项 | 现状 | 证据 |
|---|---|---|
| 用户 ID 形态 | 服务端生成的内部 `playerId`（字符串），平台 openid 不直接暴露 | `account/index.ts` |
| 角色枚举 | **只有一种角色：玩家**。没有管理员角色 | `ACTIONS` 里无 admin 动作 |
| session/JWT 声明 | HMAC-SHA256 自签令牌（`server/src/` auth 中间件），`account.refresh` 可自校验签名后重签发 | ADR-0003 |
| **管理端与用户端边界** | **不存在管理端**（D-01：区服管理与封号只有脚本 + SQL） | `server/src/modules/ops/`（74 行，无界面） |

**越权路径**：因为不存在管理端，所以"管理端越权"这一类风险**结构性不存在**。
客户端唯一的越权面是"上报分数/资源"——`AGENTS.md:33`「服务端不信任客户端上报」，
`leaderboard.report` / `economy.sell` 都走服务端复算（ADR-0012 影子账本）。

### ④ Resources — 静态资源与配置下发

| 项 | 现状 | 证据 |
|---|---|---|
| 数值表下发 | **编译期打包**：`npm run gen` 把 CSV → `client/assets/resources/config/*.json`（48 个） | `tools/gen/config.mjs` |
| 热更 | `config.manifest` 返回 `configVersion` + 热更包地址（契约有，**客户端未消费热更包**） | `server/src/modules/config/service.ts` |
| 上传 | **无用户上传功能**（无头像上传、无 UGC） | `ACTIONS` 里无 upload |
| 访问控制 | 资源都在客户端包内，无鉴权需求 | — |

**缺口 G-3**：`config.manifest` 的"热更包地址"字段是**为未来预留**，当前客户端只用 `configVersion` 做一致性校验。
→ 不阻塞，但 `09 §3` 记为"尚无基线"。

### ⑤ Events（异步）

| 项 | 现状 |
|---|---|
| 异步事件 | **无**。全部 22 个动作都是同步请求-响应 |
| 事件总线 / 队列 | **无**。员工离线结算、野人袭击按 `mvp-scope` 应由**服务端结算**，但当前是"重登时算差值"（同步） |
| 幂等键 | `idempotent: true` 的动作用 `rid`（请求 ID） |

**缺口 G-4**：如果 PD8-09（crew 离线结算）与 PD8-14（塔防结算）要做"服务端定时结算"，
需要新增动作或后台任务 → **那会动契约**。本版**不做**，改为"客户端按 `savedAt` 差值算 + 服务端校验"（NB-5 同理）。

### ⑥ UX States — `packages/contracts/src/common/ux.ts`

| 项 | 现状 |
|---|---|
| 状态枚举 | `loading / empty / error / offline / forbidden / success`（六态，DESIGN-0001） |
| 码 → 状态映射 | `UX_BY_ERROR_NAME`（`satisfies Record<keyof typeof ERR, …>`，漏一码编译失败） |
| 已知缺口 | `3101` 走兜底（见 G-2） |

## 2. 契约自检（五项，逐项给结论）

| # | 自检 | 结论 | 依据 |
|---|---|---|---|
| 1 | 前端能否只凭契约写出完整 API 调用层，不需要问后端？ | **能** | 22 动作的入参/出参类型全在 `contracts/src/*/index.ts`；客户端 `generated/contracts/**` 是生成副本 |
| 2 | 后端能否只凭契约实现接口，不需要问前端要什么字段？ | **能** | 同上；`payload.ts` 用 zod 从契约派生 |
| 3 | 数据端能否只凭契约设计表结构？ | **部分能** | 契约里有动作的 payload，但**没有 PG 表结构契约**；表结构在 `server/db/migrations/*.sql`（14 张表，见 `05`） |
| 4 | 错误码是否覆盖了所有已知失败路径？ | **否** | `3101` 是事实码但不入 `ERR`（G-2）；`RATE_LIMITED` 有码但**无任何调用方**（见下） |
| 5 | 管理端越权路径是否已被明确禁止？ | **是（结构性）** | 不存在管理端（D-01） |

**第 4 项为否 → 按纪律"任一为否不得并行"。本版怎么绕过：**

- 不改 `contracts/**`（硬约束 N-7 + 契约冻结纪律）。
- 改用**客户端本地拦截**：`3101` 在 `ux-hint.ts` 层被显式处理，**不经过 `toUxState`**。
  这满足"玩家看不到可重试的服务器错误"，同时零契约改动。
- 该方案是**条件通过**，条件写在 PD8-04 的验收 A2：`git diff --stat packages/contracts/` 必须为空。
- **契约解冻窗口**留到 v1.1（届时应把 `3101` 提升为正式码，并给 `RATE_LIMITED` 接上调用方）。

## 3. 契约覆盖矩阵（哪些模块有契约、哪些按设计没有）

| 模块 | 有契约？ | 为什么 |
|---|---|---|
| account / save / compliance / config / leaderboard / telemetry / ads / chest / economy / salvage / event / social | **有**（12 个） | 需要服务端参与（权威在服务器） |
| hook / crafting / inventory / raft / crew / power / progression / sea / fishing / island / defense / guide / settings | **无**（13 个） | 纯客户端规则（`game-core` 纯函数），无 RPC |
| ops | 无 | 无接口，只有脚本 + SQL |

**这条很重要**：13 个"无契约"的模块**不需要在契约层做任何事**，
所以 `PD8-02/03/08/09/11/12/14/15/16` 全部是"零契约改动"的卡。这是它们能并行的前提之一（`07 §2`）。

## 4. 术语统一（`glossary.md` 里与本版相关、必须一字不差的四处）

| 术语 | 唯一定义 | 用错会怎样 |
|---|---|---|
| **五环** | 捞 → 包 → 做 → **扩** → 卖 | 漏"扩"就是 v010 的错误（只成立四环） |
| **浮力** | `Σ raft_tiles.capacity − (Σ 船体地块自重 + 货重)`（D-54 Q2=A） | 两套口径会让 `remainingBuoyancy` 的结果不可解释 |
| **扩筏 / 建一格** | 往船体加 1 个 `raft_block` 地块（`raft_tiles` 唯一行） | 说成"升级船"会与 `rooms`（房间）混淆 |
| **模块的六层** | 数值 / core / 契约 / 服务端 / 客户端 / 测试 | 少算一层就会把"有目录"当"已实现"（本项目已犯 4 次） |
