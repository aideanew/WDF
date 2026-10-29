---
id: PLAN-V011-04
title: plan-v011 · 04 契约冻结包（六份，含缺口与自检）
status: active
module: planning
owner: hark
created: 2026-10-29
review: 2026-11-12
related: [PLAN-V011-03, PLAN-V011-05]
---

# 04 · 契约冻结包

> **本版不新增任何契约项。** 13 个 v1.1 模块的契约类型**全部已存在**（逐个可查，见 §1），
> 所以 B/C 阶段可以把"契约冻结"当作**已完成的前置条件**，不需要先开契约解冻窗口。
> 这一点与 plan-v010 时期不同（当时 `ads`/`salvage`/`social`/`event` 四份刚建），是本版能并行开工的前提。

## 1. 六份契约现状（唯一源 + 缺口 + 校验）

### ① API 契约

| 项 | 内容 |
|---|---|
| **唯一源** | `packages/contracts/src/**/index.ts` 的 TS 类型 + `packages/contracts/src/common/actions.ts` 的 `ACTIONS` 登记表 |
| **运行时校验** | `server/src/gateway/payload.ts:16` 的 `PAYLOAD_SCHEMAS`（zod），覆盖 **22/22** 动作，`EXEMPT` 为空（`:100-103` 注释逐字说明）；由 `tests/integration/payload.test.mjs` 遍历 `ACTIONS` 断言"无漏网" |
| **传输壳** | `RpcRequest { a, p, m }` / `RpcResponse` 二选一：`{c:0,d,t,cfg?}` 或 `{c,msg,t}`；批量 `BatchRequest/BatchResponse`（`common/envelope.ts`） |
| **分页** | `leaderboard.QueryReq { scope, cursor?, limit }` → `QueryRes { items, me?, next?, snapshotAt }`；`social.PullReq { after? }` → `{ items }`。**只有这两处有分页，其余动作全量** |
| **幂等** | 写动作带 `rid`，`server/src/gateway/idempotency.ts` 只缓存 `c===0`（`c!==0` 不缓存，避免把失败也幂等掉）。**`ACTIONS[x].idempotent` 是唯一声明处** |
| **鉴权** | `ACTIONS[x].auth` 布尔；`auth:false` 仅 4 个（`account.login/refresh`、`telemetry.track`、`config.manifest`） |
| **验收方式** | `npm run typecheck:server` + `npm run typecheck:client`（`generated/` 由 `npm run gen` 同步） |

**已知缺口（登记，本版不补）**：无"网络不可达"错误码（D-14，客户端用本地码 `-1`）；`3101` 不在 `ERR`（事实码）。

### ② Errors 契约

| 项 | 内容 |
|---|---|
| **唯一源** | `packages/contracts/src/common/errors.ts`（`ERROR_RANGES` + `ERR` 15 码） |
| **可读映射** | `docs/03_solution/data/error-catalog.md`（手维护，**不可写进 `api-catalog.md`** —— 那文件由 `tools/gen/catalog.mjs` 整文件覆盖） |
| **HTTP 映射** | `server/src/app.ts:10-14` `httpStatusOf`：`429 ← RATE_LIMITED`、`500 ← INTERNAL`、**其余一律 200**（业务错误不占用 HTTP 语义） |
| **分段** | `1xxx` 契约 / `2xxx` 鉴权 / `3xxx` 规则 / `4xxx` 系统 / `5xxx` 风控 / `9xxx` 版本 |
| **现状补充** | 事实码 `3101`（`hook` 承重、`raft` 浮力），本地码 `-1`（网络不可达），`4999 + msg='FEATURE_NOT_AVAILABLE'`（7 个 todo 动作，D-46=A） |

**本版必须新增的一条判定（不是新码）**：`3101` 走 `toUxState()` 会落到未知码兜底
（`common/ux.ts:40` → `{state:'error', retryable:true, next:'retry'}`）。
⇒ **浮力不足会被显示成"可重试的服务器错误"，玩家会无限重试。** 这是 PD7-04 的核心，处置方式是
"客户端在本地拦截 3101，不交给 `toUxState`"，**零契约改动**。

### ③ Identity 契约

| 项 | 内容 |
|---|---|
| **唯一源** | `contracts/account/index.ts`（`LoginRes.playerId / token / region / province? / isNew / serverTime`） |
| **令牌形态** | HMAC-SHA256 自签（ADR-0003 选型，不引第三方 JWT）；`account.refresh` 标 `auth:false` 并**自校验签名**，故过期令牌也能换新 |
| **角色枚举** | **无角色**（不做管理后台，`mvp-scope.md:56`）。封禁 = `ERR.BANNED 2003`，由 `ops` 脚本/SQL 置位（TASK-1401，`1d34fc6`） |
| **管理端边界** | 不存在管理端进程/路由；`server/src/modules/ops/` 只提供 CLI/SQL 能力。**因此"管理端越权路径"在本项目无攻击面**——不是漏做，是设计如此 |
| **平台身份** | `Platform = 'wechat' \| 'douyin' \| 'app'`；绑定走 `bindStart/bindConfirm` + 一次性票据（`2004` 精确拒绝 5 种失败） |

**已知缺口**：`province?` 依赖 `regions` 表（31 张空表之一）→ 省份榜无法成立，D-53 已定回落口径 `WDF_DEFAULT_REGION ?? 's1'`。

### ④ Resources 契约（文件/资源）

| 项 | 内容 |
|---|---|
| **数值热更** | `ConfigManifestRes { configVersion, packUrl?, minClientVersion }`；`packUrl` 可选，当前实现不产出远端包（`config` 模块 153 行） |
| **资源包** | 7 个 `b-*` Bundle，`isBundle: true`，只有 `b-common` 带 `priority=6`；`game.json` 含 8 个 `subpackages`（`current-plan.md:120/151`） |
| **上传** | **本项目无用户上传**，故无"上传鉴权/访问控制/生命周期"三件事 —— 记"按设计不需要"，不是缺漏 |
| **存档资源** | `save.pull/push` 的 `snapshot: unknown`（不透明）；`checksum` 由 `game-core/save` 计算；`SAVE_SCHEMA_VERSION` 新增 `modules.<key>` **不递增**（glossary:40） |

### ⑤ Events 契约（异步）

| 项 | 内容 |
|---|---|
| **是否存在真异步** | **不存在。** 22 个动作全是同步 RPC 请求-响应；无消息队列、无推送、无定时任务（`server/src` 无 scheduler） |
| **批量语义的替代** | `leaderboard.report { seq, events[] }`（`seq` 单调，`ReportRes.acceptedSeq` 断点续传）；`telemetry.track { events[] }` |
| **幂等键** | `rid`（写动作），`leaderboard.report` 另用 `seq`；`event.submit` 在 v1.1 实现时以 `sessionId` 为幂等键（契约已预留） |
| **结论** | 第六份契约的第⑤项在本项目**退化为"批量 + 幂等键"**，不需要独立事件总线。C 阶段不得引入 MQ/定时器（N-3：不为未来设计） |

### ⑥ UX States 契约

| 项 | 内容 |
|---|---|
| **唯一源** | `packages/contracts/src/common/ux.ts` + `docs/03_solution/design/DESIGN-0001-ux-states.md` |
| **六态** | `loading / empty / error / noPermission / success / conflict` |
| **映射** | `UX_BY_ERROR_NAME`，`satisfies Record<keyof typeof ERR, …>` → **漏一个码就编译失败** |
| **铁律 4 条** | ① `conflict` 只来自 `save.push` 的 `accepted:false`，不由错误码产生；② `3001` 是**成功**（幂等回放）；③ `noPermission` 一律不可重试；④ 新增码必须先改 DESIGN-0001 |
| **测试** | `tests/contract/ux.test.mjs` + `tests/determinism/ux-hint.test.mjs` |

## 2. 契约自检（§4.4 五项，逐条回答）

| # | 自检问题 | 结论 | 依据 |
|---|---|---|---|
| 1 | 前端能否只凭契约写出 API 调用层，不需要问后端？ | **能**（已发生） | `client/assets/scripts/generated/contracts/` 是 `npm run gen` 从 `packages/contracts` 生成的副本；`RpcClient` 只依赖它 |
| 2 | 后端能否只凭契约实现接口，不需要问前端要什么字段？ | **能** | `handlers.ts:68` 用 `satisfies Record<ActionName, Handler>`，漏实现编译失败 |
| 3 | 数据端能否只凭契约设计表结构？ | **部分能** | 契约给字段名与类型，但**不覆盖数值表结构**（那是 `game-data/schema` + CSV）；本版 PD7-06~09 的数据改动以 CSV 为准，契约不动 |
| 4 | 错误码是否覆盖了所有已知失败路径？ | **未完全** | 缺"网络不可达"专用码（D-14）；`3101` 与 `-1` 都是绕过手段；`FEATURE_NOT_AVAILABLE` 借 `4999` 的 `msg` 传协议（D-46=A 已承认这是坏味道） |
| 5 | 管理端越权路径是否被明确禁止？ | **不适用且已明确** | 无管理端进程（③），故无越权面 |

**自检判定：第 4 项为否 → 按 §4.4「任一为否 → 契约不完备 → 不得进入下一步」。**
**处置（不推翻结论）**：第 4 项的缺口**不影响本版任何一张卡**——本版不新增失败路径，
PD7-04 反而是在**减少**一条误导路径（把 `3101` 从"可重试系统错误"改成"业务拒绝"）。
因此本版以「条件通过」进入切片阶段，条件写死为：

> **契约解冻窗口（`4002 NETWORK` / `4998 FEATURE_NOT_AVAILABLE` / `3101` 入册）必须在 A 阶段结束前提交 ADR；
> 但**允许**在 C 阶段并行开工，因为 C 阶段不消费这三项。**

## 3. 本版对契约的唯一要求（给执行者的硬边界）

| # | 规则 | 违反后果 |
|---|---|---|
| R-1 | **不得修改 `packages/contracts/**`**（除非卡片显式写明"本卡就是改契约"，本版 17 张卡无一如此） | 第 7 项守卫 `generatedUntouched` 会在客户端副本不同步时变红 |
| R-2 | 不得新增错误码数字 | `decision-sheet` 纪律：合同冻结 14/15 码，无合适码不得自造（曾有 `3101`/`3103` 自造记录） |
| R-3 | 客户端不得写 `if (code === 2001)` 这类分支 | `common/ux.ts` 文件头铁律；应走 `toUxState()` |
| R-4 | 服务端新动作必须先登记 `ACTIONS` 再写类型再实现 | `actions.ts:1` 注释逐字规定 |
