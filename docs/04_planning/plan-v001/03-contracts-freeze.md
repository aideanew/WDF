---
id: PLAN-V001-03
title: 契约冻结（API / Errors / Identity / Resources / Events / UX States）
status: draft
owner: hark
created: 2026-10-23
review: 2026-10-30
---

# 03 契约冻结

> **唯一源**：`packages/contracts/src/**` 的 TypeScript 类型 + `common/actions.ts` 动作目录 + `common/errors.ts` 错误码。
> 本文件是**对源文件的解读与补齐**，不得与之冲突；冲突时以源文件为准，并回写本文件。
> 冻结含义：阶段 B 中任何 Agent 不得修改本文件所列类型与动作语义；要改必须走 ADR 并由 `Agent-Contract` 单独执行。

## 0. 冻结清单与缺口总览

| 契约 | 源文件 | 冻结度 | 缺口 |
|---|---|---|---|
| API（20 动作） | `common/actions.ts` + 各模块 payload | **可冻结** | 无管理端动作（G-01）；无 `chest.*` 动作（G-03）；批量接口无类型细节（G-04） |
| Errors | `common/errors.ts` | **可冻结** | 无 HTTP 映射表（本文件补）；缺少 3401/3402 类规则细化（NON_BLOCKING） |
| Identity | `account/index.ts` + `LoginRes` | **部分冻结** | 令牌结构（claims）未定义（G-02）；`playerId` 形态未定义（本文件给建议） |
| Resources | `bundle-plan.md` + ADR-0006 | **可冻结** | 无 `config.manifest.packUrl` 的目录布局约定（本文件补） |
| Events | `event/index.ts` + `offline-sync.md` | **可冻结** | 定时任务清单未落到契约层（本文件补） |
| UX States | `ui/screen-inventory.md` | **未冻结** | 6 态全部未写（本文件补齐，回写 screen-inventory 由 Agent-Client 认领） |

## 3.4.1 ① API 契约：20 个动作逐条

约定：
- 传输：`POST /v1/rpc`，body = `{ a: ActionName, p: payload, m: RequestMeta }`；`m = { rid?, cv, cfg, sv, plat }`。
- 成功：`{ c: 0, d: <Res>, t: serverTime, cfg?: configVersion }`。
- 失败：`{ c: <错误码>, msg: string, t: serverTime }`。
- `rid` 规则：`idempotent=true` 的动作**必须**带 `rid`（缺则 `BAD_PAYLOAD 1001`）；同一 `(playerId, rid)` 在 **24h** 内重复提交返回首次结果，并在响应中不重复产生副作用（`idempotency` 表）。
- "离线排队"列：按 ADR-0008「必须联网」，**全部为"否"**；唯一例外是 `telemetry.track` 允许本地缓冲后重连补推（无业务副作用）。

| # | 动作 | auth | idempotent | 请求（字段） | 响应（字段） | 离线排队 | 备注 |
|---|---|---|---|---|---|---|---|
| 1 | `account.login` | 否 | 是 | `LoginReq{ code: string; plat: Platform; anonymousSaveId?: string }` | `LoginRes{ token; playerId; region; province?; isNew; serverTime }` | 否 | 平台 code 换会话；`anonymousSaveId` 用于首次把本地进度认领到账号 |
| 2 | `account.refresh` | 是 | 否 | 无 | 同 `LoginRes`（新 token） | 否 | 令牌续期 |
| 3 | `account.bindStart` | 是 | 是 | 无 | `BindStartRes{ ticket; expiresAt }` | 否 | 返回一次性绑定票据 |
| 4 | `account.bindConfirm` | 是 | 是 | `BindConfirmReq{ ticket }` | `BindConfirmRes{ playerId; forkPending }` | 否 | 另一平台确认绑定；`forkPending=true` 时进 `save.resolveFork` |
| 5 | `compliance.check` | 是 | 否 | 无 | `ComplianceRes{ verified; minor; playableUntil?; offlineAllowanceMs }` | 否 | **注意**：动作名是 `compliance.check`（不是 `status`） |
| 6 | `save.pull` | 是 | 否 | 无 | `SavePullRes{ summary: SaveSummary\|null; snapshot?: unknown }` | 否 | 只读，可重试 |
| 7 | `save.push` | 是 | 是 | `SavePushReq{ baseRevision; snapshot; checksum }` | `SavePushRes = {accepted:true, revision} \| {accepted:false, conflict: SaveSummary}` | 否 | 冲突时不报错，返回 `conflict` 由前端决策 |
| 8 | `save.resolveFork` | 是 | 是 | `ResolveForkReq{ keep:'local'\|'cloud'; localSnapshot? }` | `{ revision: number }`（建议补类型） | 否 | 分叉裁决 |
| 9 | `salvage.claimInfo` | 是 | 是 | `ClaimInfoReq{ tier:'normal'\|'advanced'\|'exclusive' }` | `ClaimInfoRes{ granted; infoId?; seed?; remainingToday }` | 否 | 沉船信息份数；配额表 `daily_quota` |
| 10 | `economy.buyQuota` | 是 | 是 | `BuyQuotaReq{ itemId; count }` | `BuyQuotaRes{ granted; remainingToday; goldAfter? }` | 否 | 区服每日限量（如高级开锁工具 1/人/天） |
| 11 | `leaderboard.report` | 是 | 是 | `ReportReq{ seq; events: IncomeEvent[] }` | `ReportRes{ acceptedSeq; flagged }` | 否 | `flagged=true` 进复核 |
| 12 | `leaderboard.query` | 是 | 否 | `QueryReq{ scope:'global'\|'region'\|'province'; cursor?; limit }` | `QueryRes{ items: RankRow[]; me?; next?; snapshotAt }` | 否 | 只读榜单快照，不实时计算 |
| 13 | `event.start` | 是 | 是 | `EventStartReq{ hookItemId; lockpickToolIds: string[] }` | `EventStartRes{ sessionId; seed; configVersion; endsAt }` | 否 | **服务器发种子 + 装备快照**，防止换装备 |
| 14 | `event.submit` | 是 | 是 | `EventSubmitReq{ sessionId; ops: EventOp[] }` | `EventSubmitRes{ totalValue; items[] }` | 否 | 服务器**复算**操作流，不信任客户端分值 |
| 15 | `event.result` | 是 | 否 | 无（或 `{ sessionId? }`） | `EventResultRes{ totalValue; rank?; settled }` | 否 | `settled=false` 表示未结算 |
| 16 | `social.send` | 是 | 是 | `SendReq{ channel:'region'\|'world'; phraseId }` | `{ ok: true }`（建议补类型） | 否 | **只允许预设短语**（`phraseId`），不收自由文本 → 天然免内容审核压力 |
| 17 | `social.pull` | 是 | 否 | `PullReq{ channel; after?: string }` | `PullRes{ items: ChatMsg[] }` | 否 | 游标拉取 |
| 18 | `ads.claim` | 是 | 是 | `AdClaimReq{ placement }` | `AdClaimRes{ granted; remainingToday }` | 否 | 服务端需校验广告完成凭据（当前缺口 G-05） |
| 19 | `telemetry.track` | 否 | 否 | `TrackReq{ events: TrackEvent[] }` | `{ ok: true }`（建议补类型） | **允许缓冲补推** | 无业务副作用，允许离线缓冲 |
| 20 | `config.manifest` | 否 | 否 | 无 | `ConfigManifestRes{ configVersion; packUrl?; minClientVersion }` | 否 | 启动第一个调用 |

### 动作缺口（需在阶段 B 之前或并行补齐）

| 编号 | 缺口 | 影响 | 处置 |
|---|---|---|---|
| G-01 | **无任何管理端动作**（开新区/封号/改配置） | MUST-20 无法实现 | 冻结后由 `Agent-Contract` 单独立项新增 `admin.*` 命名空间，独立鉴权域；须提交 ADR |
| G-02 | 令牌 claims 未定义 | 前端无法判断权限；后端无法校验 | 本文件 3.4.3 给【建议】结构；须 ADR 确认 |
| G-03 | `chest` 模块无 payload | 开锁过程无服务端动作（但开锁是本地表现 + 结果上报，可接受） | 明确：开锁为**客户端表现 + `save.push` 落结果**；赶海内开锁结果随 `event.submit` 上报 |
| G-04 | `/v1/batch` 无类型细节 | 批量调用未实现 | 冻结 `BatchRequest = { items: RpcRequest[] }`；单条失败不影响其它条（各自返回封套） |
| G-05 | `ads.claim` 缺服务端验证 | 可刷奖励 | 需接平台侧广告回调或服务端签名校验；列为 BLOCKING-adjacent |
| G-06 | `event.result` 无请求类型 | 无法精确定义 | 建议 `{ sessionId?: string }`，缺省取最近一场 |
| G-07 | `social.send/pull` 无出参类型 | 客户端无法类型化 | 建议 `{ ok: boolean }` |

## 3.4.2 ② Errors 契约

### 分段

| 段 | 范围 | 含义 | HTTP 状态（传输层） | 前端统一展示 |
|---|---|---|---|---|
| OK | 0 | 成功 | 200 | — |
| CONTRACT | 1000–1999 | 请求格式/动作非法 | 200（业务错误仍 200） | 通用错误 toast，不弹窗 |
| AUTH | 2000–2999 | 身份/会话/封禁/未成年 | 200 | 未登录 → 跳登录；封禁 → 全屏提示；未成年 → 全屏倒计时 |
| RULE | 3000–3999 | 规则不允许（幂等重复、配额、活动关闭） | 200 | 就地提示，不打断 |
| SYSTEM | 4000–4999 | 限流/内部错误 | **429**（4001）/ **500**（4999） | 重试提示；4999 静默上报 |
| RISK | 5000–5999 | 风控复核 | 200 | "成绩核对中" |
| UPGRADE | 9000–9999 | 客户端过旧 | 200 | 不可关闭的更新弹窗 |

> **HTTP 只表达传输层**：业务错误一律 `HTTP 200` + 封套 `c != 0`。唯一例外：`RATE_LIMITED 4001` 同时置 HTTP 429，`INTERNAL 4999` 置 HTTP 500，便于网关与监控识别。

### 逐码

| 码 | 名称 | 触发条件 | HTTP | 前端展示 | 可重试 |
|---|---|---|---|---|---|
| 1001 | `BAD_PAYLOAD` | 字段缺失/类型错/幂等动作缺 `rid` | 200 | toast「请求有误」，上报 | 否（需修请求） |
| 1002 | `UNKNOWN_ACTION` | 动作不在 `ACTIONS` | 200 | 静默 + 上报（版本不一致） | 否 |
| 2001 | `NOT_LOGGED_IN` | 未带 token 调 auth 动作 | 200 | 跳登录 | 是（登录后） |
| 2002 | `SESSION_EXPIRED` | token 过期/无效 | 200 | 静默刷新一次，失败则跳登录 | 是（1 次） |
| 2003 | `BANNED` | 账号被封 | 200 | 全屏「账号已被封禁」+ 客服入口 | 否 |
| 2101 | `MINOR_TIME_LIMIT` | 未成年超时 | 200 | 全屏倒计时，锁定输入 | 否（次日） |
| 3001 | `DUPLICATE_REQUEST` | 同 rid 重复（且首次结果已过期） | 200 | 静默，按首次结果处理 | 否 |
| 3002 | `QUOTA_EXHAUSTED` | 每日配额用尽 | 200 | 就地提示「今日已用完」 | 否（次日） |
| 3201 | `EVENT_CLOSED` | 赶海未开始/已结束 | 200 | 就地提示开放时段 | 否 |
| 3202 | `EVENT_ALREADY_PLAYED` | 本场已玩过 | 200 | 就地提示 + 跳结果页 | 否 |
| 4001 | `RATE_LIMITED` | 频率超限 | **429** | 静默退避重试（≤2 次） | 是（退避） |
| 4999 | `INTERNAL` | 未实现/异常 | **500** | 「服务开小差」+ 上报 | 是（1 次） |
| 5001 | `REVIEW_PENDING` | 成绩进人工复核 | 200 | 「成绩核对中，稍后查看」 | 是（轮询） |
| 9001 | `CLIENT_TOO_OLD` | `cv` < `minClientVersion` | 200 | 不可关闭更新弹窗 | 否 |

### 覆盖性检查（失败路径）

| 失败路径 | 有无错误码 | 判定 |
|---|---|---|
| 请求字段非法 | 1001 | 有 |
| 动作不存在 | 1002 | 有 |
| 未登录 / 过期 / 封禁 | 2001/2002/2003 | 有 |
| 未成年超时 | 2101 | 有 |
| 幂等重复 | 3001 | 有 |
| 每日配额 | 3002 | 有 |
| 活动未开/已玩 | 3201/3202 | 有 |
| 限流 | 4001 | 有 |
| 未实现/崩溃 | 4999 | 有 |
| 风控复核 | 5001 | 有 |
| 版本过旧 | 9001 | 有 |
| **浮力不足** | 3101（`game-core/raft` 已用） | 有（但未进 `ERR` 常量表 → **缺口 G-08**） |
| **存档冲突** | 不报错，走 `SavePushRes.conflict` | 设计如此 |
| **存档校验和不符** | 无码（本地 `verifySave()` 返回 false） | **缺口 G-09**：建议 `3401 SAVE_CHECKSUM_MISMATCH` |
| **区服不存在/满员** | 无码 | **缺口 G-10**：建议 `2201 REGION_UNAVAILABLE` |
| **无权限调用管理动作** | 无码 | **缺口 G-11**：建议 `2301 FORBIDDEN_ADMIN` |
| **事件种子失效/场次不存在** | 无码 | **缺口 G-12**：建议 `3203 SESSION_INVALID` |

> G-08~G-12 属**冻结后新增**，需 `Agent-Contract` 提交 ADR 后落地；本文件只登记，不擅自改源文件。

## 3.4.3 ③ Identity 契约

### 现状（源文件）

- `LoginRes{ token; playerId; region; province?; isNew; serverTime }`。
- `platform` 类型在 `common/envelope.ts` 的 `Platform`（微信/抖音/APP）。
- 未绑定时：`anonymousSaveId` 用于把本地进度挂到新账号。

### 需冻结的规则

| 项 | 规则 | 状态 |
|---|---|---|
| `playerId` 形态 | **【建议】**不可猜的字符串（如 ULID/雪花），**不得**用自增整数暴露注册量；对外展示用 `name`，`playerId` 只在内部与榜单使用 | 待 ADR |
| 各平台身份 | 微信 `openid`（同主体内唯一）；抖音 `openid`；APP 自建账号。**同一自然人在不同平台默认是不同账号**（未绑定前各自独立） | 已确认（LoginReq 有 `plat`） |
| 绑定流程 | `bindStart` → 得 `ticket`（一次性、`expiresAt`）→ 在另一平台登录后 `bindConfirm(ticket)` → 若两端都有存档则 `forkPending=true` → `save.resolveFork` | 已确认（类型已有） |
| 令牌 claims【建议】 | `{ sub: playerId, region, plat, admin?: boolean, iat, exp, jti }`；`admin` **绝不**由客户端传入，只由服务端在管理端登录时签发；**玩家令牌 `admin` 恒为 false 或缺失** | 待 ADR（G-02） |
| 令牌有效期【建议】 | access 2h，refresh 30d；`account.refresh` 换新 | 待 ADR |
| 权限边界（硬规则） | 玩家令牌**不得**调用 `admin.*`；服务端在路由层按 `claims.admin === true` 硬拦截，返回 `2301 FORBIDDEN_ADMIN`；管理动作**不得**出现在玩家端动作表 | **必须冻结** |
| 区服归属 | `playerId` 与 `region` 绑定后不可变（转服不在首版） | 已确认（LoginRes 有 region） |
| 省榜 | `province` 仅用于榜单 scope=`province`；来源于平台实名/授权，**不得**由客户端随意填写 | 已确认存在字段，来源待实现 |

## 3.4.4 ④ Resources 契约

### Bundle 划分（只装资源，脚本全在主包 —— ADR-0006）

| Bundle | 内容 | 预估体积 | 首屏必需 | 可远程加载 |
|---|---|---|---|---|
| `b-common` | 通用 UI 图集、字体、公共音效、公共预制体 | 6 | 是 | 否（随主包/首个分包） |
| `b-shallow` | 浅海场景、漂浮物、箱子(木/铁)、抓钩 | 5 | 是 | 否 |
| `b-deep` | 深海、沉船、潜水员、高级箱子 | 4 | 否 | **是**（进入深海前） |
| `b-island` | 岛屿地形、建筑、砍树挖矿 | 4 | 否 | **是** |
| `b-defense` | 塔防地图、兵种、投射物、回放数据 | 4 | 否 | **是** |
| `b-event` | 赶海场景、活动 UI | 3 | 否 | **是**（活动前预载） |
| `b-social` | 聊天、榜单、称号表现 | 3 | 否 | **是** |

单位：MB（与 `bundle-plan.md` 一致）。合计 29MB，受"双平台共同预算 20MB"约束 → **必须远程加载 4–7 号 Bundle 中的大部分**（真正打进包的只有 `b-common` + `b-shallow` + 必要的 `b-event` 首屏资源）。

### 远程加载规则（硬约束）

1. **只允许远程加载资源**（图片/音频/预制体/场景/JSON），**不允许**远程加载脚本（微信限制 + ADR-0006）。
2. 远程 Bundle 必须在 `config.manifest.packUrl` 声明的**同一域名**下，且该域名已加入小程序合法域名。
3. 远程包必须带**版本号目录**：`{packUrl}/{configVersion}/b-deep/...`，`configVersion` 变化即视为新包，避免混用。
4. 下载失败：显示**加载态 → 错误态 → 重试**；不得静默降级到"功能消失"。
5. 预载时机：进入对应玩法前 1 屏预载（如海图页预载 `b-island`）。

### `config.manifest` 版本规则

| 规则 | 说明 |
|---|---|
| `configVersion` = 数值表内容哈希 | 由 `npm run gen` 产出（当前 `16921d30a67a934f`） |
| 客户端启动第 2 步调用 | 顺序：Boot → `compliance.check`/`config.manifest` → 比对 |
| 不一致处理 | `configVersion` 不同 → 下载新数值 JSON（不是代码）→ 写本地 → 重载数值 |
| 回滚 | `config_release` 表保留历史版本，可把 `active` 指回旧版本 |
| 下限 | `minClientVersion` 与 `cv` 比对，过低返回 `9001` |

## 3.4.5 ⑤ Events 契约

### E1 离线同步队列（受 ADR-0008 约束）

| 队列 | 内容 | 是否允许离线 | 重连后行为 |
|---|---|---|---|
| 写操作队列 | `save.push`、`event.submit`、`economy.buyQuota`、`ads.claim` 等 | **禁止**（ADR-0008） | 不排队；断网时 UI 进只读态，操作按钮置灰并提示"需联网" |
| 埋点队列 | `telemetry.track` | 允许 | 本地缓冲（上限建议 200 条/500KB），重连后**批量补推**，失败丢弃最旧 |
| 榜单上报 | `leaderboard.report` | 允许**短暂**缓冲（≤5 分钟或断网瞬间） | 按 `seq` 续传；服务器用 `acceptedSeq` 对齐 |

### E2 赶海场次状态机

```
idle ──(20:00 且未玩)──> eligible ──event.start──> running(3min)
                                                   │
                                    event.submit ──┴──> submitted ──21:05 结算──> settled
running ──(超时/掉线)──> expired（成绩按已提交 ops 结算）
```

| 状态 | 允许动作 | 失败码 |
|---|---|---|
| `idle`（非开放时段） | 无 | `3201 EVENT_CLOSED` |
| `eligible` | `event.start` | — |
| `running` | `event.submit` | `3203 SESSION_INVALID`（缺口） |
| `submitted` | `event.result`（`settled=false`） | — |
| `settled` | `event.result` | — |
| 已玩过 | 无 | `3202 EVENT_ALREADY_PLAYED` |

### E3 定时任务

| 任务 | 频率 | 触发 | 产物 | 幂等键 |
|---|---|---|---|---|
| 潮汐切换 | 每 6h | 服务器时钟（`anchorMs`） | 漂浮物刷新批次 | `tide:{epochIndex}` |
| 每日重置 | 00:00 | 服务器时钟 | `daily_quota` 归零、机会次数重置 | `daily:{yyyy-mm-dd}` |
| 赶海开放/关闭 | 20:00 / 21:00 | 定时 | 场次可进/关闭 | `event:{yyyy-mm-dd}` |
| 赶海结算 | 21:05 | 定时 | 排名、发奖、写 `title_award`（若启用） | `event_settle:{yyyy-mm-dd}` |
| 总收益榜快照 | 每小时 | 定时 | `leaderboard_snapshot` | `lb:{yyyy-mm-dd-hh}` |
| 开新区 | 人工触发 | 管理动作 | `regions` 新增一行 | — |
| 存档巡检 | 每日 | 定时 | 统计损坏率、异常账号 | — |

### E4 埋点事件名与载荷（`telemetry.track`）

| 事件名 | 载荷 props | 用途 |
|---|---|---|
| `boot.start` | `{ms}` | 冷启动耗时 |
| `boot.ready` | `{ms, fromCache}` | 到可操作时间 |
| `hook.cast` | `{powerBp, targetKind}` | 出钩力度分布 |
| `hook.hit` | `{itemId, dist, powerBp}` | **首钩命中率** |
| `hook.miss` | `{reason, dist}` | 失败归因 |
| `catch.loot` | `{itemId, count, weight}` | 掉落分布 |
| `craft.done` | `{itemId, auto:boolean}` | 合成使用 |
| `chest.unlock` | `{lockTier, tries, success}` | 开锁难度实测 |
| `save.push` | `{revision, bytes, ms, conflict}` | 存档耗时与冲突率 |
| `net.error` | `{action, code, ms}` | 错误码分布 |
| `event.join` | `{sessionId}` | 赶海参与率 |
| `event.settle` | `{totalValue, rank}` | 赶海成绩 |
| `bundle.load` | `{bundle, ms, fail}` | 远程资源加载 |

## 3.4.6 ⑥ UX States 契约

以 `docs/03_solution/ui/screen-inventory.md` 的 12 个界面为准。每屏**必须**写全 6 态。

| # | 界面 | 空态 | 加载态 | 错误态 | 无权限态 | 成功态 | 断网态 |
|---|---|---|---|---|---|---|---|
| 1 | 启动/加载 | — | 进度条 + 当前步骤文案（4 步：合规/配置/存档/进入） | 「启动失败」+ 重试 + 复制诊断码 | — | 自动跳主界面 | 显示断网页 + 重试（不进入游戏） |
| 2 | 主界面（海上） | 无漂浮物时「潮水退了，等下一次潮汐」+ 倒计时 | 淡水波纹 loading | 场景加载失败 → 重试 | — | 可长按蓄力 | 顶部横幅「已断网（只读）」 |
| 3 | 背包/仓库 | 「还没有捞到东西」+ 引导出钩 | 列表骨架屏 | 「背包读取失败」+ 重试 | — | 正常网格 | 只读，拖拽/丢弃置灰 |
| 4 | 制作 | 「尚未解锁任何配方」 | 配方列表骨架 | 「配方数据缺失」+ 重新拉配置 | 等级不足 → 锁定 + 所需等级；缺设施 → 灰 + 原因 | 合成动画 + 入包 | 合成按钮置灰 + 「需联网」 |
| 5 | 建造 | 「木板不够，先去捞漂流木」 | 格子加载 | 放置非法 → 红框 + 原因 | 未解锁 → 灰 | 落成动画 | 禁止建造 |
| 6 | 员工 | 「还没有员工」+ 引导救落水者 | 头像加载 | 派遣失败 → 原因 | 未解锁岗位 → 灰 | 派遣成功 | 只读 |
| 7 | 开锁 | — | 锁具加载 | 工具耗尽 → 「去商人买」 | 无工具 → 灰 + 跳转 | 开锁成功动画 + 内物展示 | 不允许进入（需联网落结果） |
| 8 | 商人 | 「今日无货」 | 商品加载 | 购买失败 → 原因 | 金币不足 → 灰 + 差额 | 购买成功 + 余额变化 | 禁止购买 |
| 9 | 海图 | 「尚未解锁深海（需 20 级）」 | 地图贴图加载 | 加载失败 → 重试 | 等级不足 → 灰 | 可点选目标 | 只读地图 |
| 10 | 岛屿/塔防/回放 | 「这块岛还没占领」 | 战场加载 | 回放数据缺失 → 原因 | 未占领 → 灰 | 战斗/回放进行 | 只读（不能开战） |
| 11 | 赶海 | 「今天已参加过」+ 成绩入口 | 场次匹配 + 种子加载 | 「场次异常」+ 退出 | 未到时间 → 倒计时 | 结算页 + 排名 | **不允许进入**（必须联网） |
| 12 | 排行/称号/聊天/设置 | 「还没有人上榜」 | 榜单骨架 | 「榜单加载失败」+ 重试 | 封禁用户 → 不可发言 | 正常展示 | 展示缓存快照 + 「数据可能过期」 |

**统一规则**：
- 所有"错误态"必须有**三个要素**：发生了什么（人话）、能做什么（按钮）、诊断码（可复制，供上报）。
- 所有"断网态"必须**明确标注只读**，不得让用户以为操作成功。
- "无权限态"与"未解锁态"视觉必须区分（前者灰锁 + 说明，后者灰 + 所需等级）。

## 3.4.7 契约自检

| 自检项 | 结果 | 依据 |
|---|---|---|
| 前端能否只凭契约开工？ | **部分可以** | 20 动作请求/响应齐全；但 G-02（claims）、G-06/G-07（出参类型）未定，前端需留 TODO |
| 后端能否只凭契约开工？ | **可以（业务动作）** | 20 动作签名完整；`chest` 无动作属设计如此 |
| 数据侧能否只凭契约开工？ | **不可以** | 缺 `regions`/`chat_message`/`title_award`/`income_event` 表（见 04）与 46 表数值（见 04） |
| 错误码是否覆盖所有失败路径？ | **否** | G-08~G-12 五个码缺失；已登记 |
| 管理端越权路径是否已明确禁止？ | **是（规则层）** | 3.4.3 权限边界硬规则；但缺 `2301` 码与 `admin.*` 动作（G-01/G-11） |

**结论**：契约**可以冻结业务侧**，但**数据侧与身份侧存在 7 个缺口**；缺口不补齐时，`Agent-Data` 与 `Agent-Client` 的对应任务必须标 `blocked`，不得猜。
