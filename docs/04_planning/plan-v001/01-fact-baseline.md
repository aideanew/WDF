---
id: PLAN-V001-01
title: 事实基线（已确认 / 仅文档 / 不一致 / 读取失败）
status: draft
owner: hark
created: 2026-10-23
review: 2026-10-30
---

# 01 事实基线

> 四类输出：A 已确认的事实（代码里能看到）、B 只在文档里（代码为零）、C 文档与代码不一致（逐条）、D 读取失败/无法核实。
> 每条尽量给"文件路径 + 行号"或"命令 + 输出"。行号为本次核对时的快照行号。

## A. 已确认的事实（有代码证据）

### A1 工程与构建

| # | 事实 | 证据 |
|---|---|---|
| A1-1 | 根 `package.json` 用 npm workspaces：`packages/*`、`server`、`tools` | `package.json` `workspaces` 字段 |
| A1-2 | `verify = gen && guard && test`；`gen = gen:config + sync + gen:catalog + gen:docs` | `package.json` `scripts` |
| A1-3 | `test` 用 `node --test "tests/**/*.test.mjs"`，非 TS 测试框架 | 同上 |
| A1-4 | 有 `npm run impact <关键词>` 影响面分析 | 同上 |

### A2 契约层（`packages/contracts/src/`）

| # | 事实 | 证据 |
|---|---|---|
| A2-1 | 动作表共 **20 个**，每个带 `auth` / `idempotent` 标志 | `common/actions.ts` |
| A2-2 | 动作清单：`account.login`(auth=false,idempotent=true)、`account.bindStart`、`account.bindConfirm`、`account.refresh`(auth=true,idempotent=false)、`save.pull`、`save.push`(idempotent=true)、`save.resolveFork`、`compliance.check`、`config.manifest`(false,false)、`telemetry.track`(false,false)、`ads.claim`、`economy.buyQuota`、`event.start`、`event.submit`、`event.result`、`leaderboard.report`、`leaderboard.query`、`salvage.claimInfo`、`social.send`、`social.pull` | `common/actions.ts` |
| A2-3 | 错误码分段：OK 0 / CONTRACT 1000 / AUTH 2000 / RULE 3000 / SYSTEM 4000 / RISK 5000 / UPGRADE 9000；有 `errorRange(code)` | `common/errors.ts` |
| A2-4 | 已定义错误码：`BAD_PAYLOAD 1001`、`UNKNOWN_ACTION 1002`、`NOT_LOGGED_IN 2001`、`SESSION_EXPIRED 2002`、`BANNED 2003`、`MINOR_TIME_LIMIT 2101`、`DUPLICATE_REQUEST 3001`、`QUOTA_EXHAUSTED 3002`、`EVENT_CLOSED 3201`、`EVENT_ALREADY_PLAYED 3202`、`RATE_LIMITED 4001`、`INTERNAL 4999`、`REVIEW_PENDING 5001`、`CLIENT_TOO_OLD 9001` | 同上 |
| A2-5 | 封套：`RequestMeta{rid?, cv, cfg, sv, plat}`；`RpcRequest{a,p,m}`；`RpcResponse` 成功 `{c:0,d,t,cfg?}` / 失败 `{c,msg,t}`；另有 `BatchRequest/BatchResponse` | `common/envelope.ts` |
| A2-6 | 各模块 payload 类型已定义：account（LoginReq/Res、BindStartRes、BindConfirmReq/Res）、ads（AdClaimReq/Res）、compliance（ComplianceRes）、config（ConfigManifestRes）、economy（BuyQuotaReq/Res）、event（EventStartReq/Res、EventOp、EventSubmitReq/Res、EventResultRes）、leaderboard（IncomeEvent/ReportReq/Res、QueryReq/RankRow/QueryRes）、salvage（ClaimInfoReq/Res）、save（SaveSummary/SavePullRes/SavePushReq/SavePushRes/ResolveForkReq）、social（SendReq/ChatMsg/PullReq/PullRes）、telemetry（TrackEvent/TrackReq） | 各模块 `index.ts`（或同名文件） |
| A2-7 | `chest` 模块**只有** `MODULE_ID`，**无任何 payload 类型** | `chest/` |

### A3 服务端（`server/src/`）

| # | 事实 | 证据 |
|---|---|---|
| A3-1 | 单入口：只处理 `POST /v1/rpc` 与 `GET /healthz`，其余 404 | `app.ts` |
| A3-2 | **20/20 动作全部指向 `todo` handler**，返回 `{ c: 4999, msg: 'not implemented' }` | `gateway/handlers.ts` |
| A3-3 | 用 `satisfies Record<ActionName, Handler>` 保证动作不漏（漏一个编译不过） | 同上 |
| A3-4 | 路由只做了：动作存在性校验 → idempotent 缺 `rid` 返回 `BAD_PAYLOAD` → 分发 | `gateway/rpc.ts` |
| A3-5 | **鉴权 / 限流 / 版本 / 批量 `/v1/batch` 全部未接入** | `gateway/rpc.ts`、`app.ts` |
| A3-6 | 未连接数据库，无任何 SQL 执行代码 | 全仓库 `server/src` 无 pg 客户端调用 |

### A4 `packages/game-core`（纯规则）

| 模块 | 实现程度 | 证据 |
|---|---|---|
| `sea` | 有真实逻辑：`TIDE_PERIOD_MS=6h`、`TIDE_DURATION_MS=10min`、`tideState(nowMs, anchorMs)`、`MAX_FLOATING_ON_SCREEN=20`；**无漂浮物刷新/生成** | `sea/index.ts` |
| `raft` | 有：`remainingBuoyancy(hull, cargoWeight)`、`checkChange(...)` → 不足返回 `err(3101, '浮力不足，还差 X')` | `raft/index.ts` |
| `defense` | 有：`distanceField(grid, gateX, gateY)` 反向 BFS、`allEntrancesReachable(...)` | `defense/index.ts` |
| `chest` | 有：`LOCK_HITS{iron:1,copper:2,silver:3,gold:4}`、`expectedAttempts(p,n)`、`isHit(pointer,zoneStart,zoneWidth)` | `chest/index.ts` |
| `economy` | 有：`recyclePrice(basePrice, regionBp=0)`（×50%，±3000bp 截断）、`sellPrice` | `economy/index.ts` |
| `leaderboard` | 有：`exceedsHourlyCap(reportedValue, theoreticalMaxPerHour, toleranceBp=2000)` | `leaderboard/index.ts` |
| `save` | 有：`SAVE_SCHEMA_VERSION=1`、`SaveFile{schemaVersion,configVersion,saveId,revision,savedAt,modules,checksum}`、`computeChecksum/sealSave/verifySave` | `save/schema.ts` |
| `save/migrations` | **空迁移表** `MIGRATIONS = []`；`migrate()` 返回 ok / too-new / broken | `save/migrations.ts` |
| `hook` / `fishing` / `crafting` / `crew` / `inventory` / `island` / `power` / `progression` / `salvage` / `event` | **占位**：只有注释 + `export const MODULE_ID = '...'`（单文件 134–247 字节） | 各 `index.ts` |

**判定**：game-core 已有 7 个可用规则模块，但**核心的 hook（出钩手感）、progression（等级）、crafting（合成）、inventory（背包）、salvage（沉船）全为空**。

### A5 客户端（`client/assets/scripts/`）

| # | 事实 | 证据 |
|---|---|---|
| A5-1 | `GameApp.start()` 只调 `getPlatform()` 并注册 `onHide`；注释写了 7 步启动顺序但**未实现** | `app/GameApp.ts` |
| A5-2 | `HookModel` 只有 `stateVersion` 与 `touch()`，**无出钩逻辑** | `features/hook/model/HookModel.ts` |
| A5-3 | `HookView` 是 `@ccclass('HookView')`，`lateUpdate` 内的刷新逻辑**被注释掉** | `features/hook/view/HookView.ts` |
| A5-4 | `services/{audio,bus,config,log,net,pool,save,time}` **全部占位**（一行注释 + `export const SERVICE='xxx'`） | `scripts/services/*` |
| A5-5 | `platform/wechat/WechatPlatform.ts` 有真实实现：login / showRewardedAd（**无填充时返回 `'no-fill'`**，TODO 复用实例）/ share / storage / request / onNetworkChange / safeArea / vibrateShort / lifecycle；`recorder=null` | 同文件 |
| A5-6 | `platform/contracts/IPlatform.ts` 接口完整（含 `recorder`、`onNetworkChange`） | 同文件 |
| A5-7 | **只有微信一套实现**：`platform/douyin/`、`platform/app/` 无实现或为空壳 | 目录核对 |

### A6 测试

| # | 事实 | 证据 |
|---|---|---|
| A6-1 | `tests/contract` 只做两件事：动作表名 ↔ handlers 键名一一对应；坏/好数据的校验器报错文案 | `tests/contract/contract.test.mjs` |
| A6-2 | `tests/determinism` 覆盖：rng 同种子、存档校验/too-new、浮力、开锁期望值（p=0.6,n=4≈16.79）、潮汐、塔防 BFS、回收价 ±30% 截断 | `tests/determinism/game-core.test.mjs` |
| A6-3 | **无任何服务端行为测试**（没有一条测试跑过真实 handler） | `tests/` 目录核对 |
| A6-4 | **无任何客户端测试**（Cocos 侧 0 覆盖） | 同上 |

### A7 数据库

| # | 事实 | 证据 |
|---|---|---|
| A7-1 | `0001_init.sql` 共 **13 张表**：`player`、`identity`、`bind_ticket`、`save_snapshot`、`save_fork`、`idempotency`、`ledger_entry`、`daily_quota`、`income_daily`、`leaderboard_snapshot`、`event_session`、`config_release`、`audit_log` | `server/db/migrations/0001_init.sql` |
| A7-2 | **缺表**：`regions`（区服）、`chat_message`、`report`、`ban`、`title_award`、`income_event`（按日分区） | 与 architecture-overview 5.3、module-catalog 对照 |
| A7-3 | 文件头注释仍写"**建议稿，ADR-0004 确认后执行**"，而 ADR-0004 已 accepted | 同文件头 |

## B. 只在文档里、代码里没有的

| # | 需求 | 文档出处 | 代码现状 |
|---|---|---|---|
| B1 | 出钩长按蓄力、力度条约 1.2 秒往返、松手发射 | v5.5 / architecture-overview 4.3 / glossary | `HookModel` 空；`HookView` 刷新被注释 |
| B2 | 漂浮物按潮汐刷新、同屏 ≤20 | sea 规则已有常量，但**生成与刷新函数不存在** | `sea/index.ts` |
| B3 | 开锁玩法（4 档锁、命中区、工具消耗、拉力表） | 箱子与沉船概率-草案、材料与工具总表十五 | `chest` 只有原子规则，无"一局开锁"状态机 |
| B4 | 等级解锁（12 段、20 级深海、49 首版上限） | 等级解锁表-草案 | `progression` 占位 |
| B5 | 合成/自动合成/原型制/设施前置 | 材料与工具总表二/三/十二 | `crafting` 占位；CSV 0 行 |
| B6 | 背包/货舱扩容/浮力实时校验 | raft 有校验，inventory 占位 | `inventory` 占位 |
| B7 | 沉船（v2 方案，20–100 件、潜水员搜索次数、带回件数） | 箱子与沉船概率-草案 | `salvage` 占位 |
| B8 | 岛屿占领、塔防、回放 | v5.5 第九章 | `island` 空；`defense` 只有寻路 BFS；无回放 |
| B9 | 赶海（每日一海）：20:00–21:00、全服同种子、3 分钟、锁档 50/25/15/9.8/0.2、计分、前 10 奖励 | 材料与工具总表十五 | `event` 占位；`event_session` 表在但无读写代码 |
| B10 | 称号系统 | v5.5 11.1【已定】首版就做 | 无模块、无表（`title_award` 缺）、无动作 |
| B11 | 区服（新区开放、管理员控制） | 项目记忆 + module-catalog `account.tables=["regions"]` | 无 `regions` 表、无开服动作、无后台 |
| B12 | 管理员能力（开新区、封号、改配置） | 同上 | **无任何管理端动作/界面**；20 动作里没有 admin 段 |
| B13 | 防沉迷/未成年人时长限制 | `MINOR_TIME_LIMIT 2101` 错误码 | 无判定代码、无实名链路 |
| B14 | 离线同步队列 | `offline-sync.md` + ADR-0008（必须联网） | 无队列实现；ADR-0008 已把"离线写"降级为"只读缓存 + 必须联网" |
| B15 | 排行榜（总收益榜 + 赶海分组榜） | v5.5 第十二章 | `leaderboard` 只有风控函数；无榜单计算与查询实现 |
| B16 | 聊天（区服/世界） | v5.5 11.1【已定】 | `social` 只有类型；无表、无内容审计 |
| B17 | 商人/价格浮动 ±30%/回收 | 材料与工具总表十三；economy 有回收公式 | 无商人界面、无交易动作（`economy.buyQuota` 是配额不是买卖） |
| B18 | 钓鱼 / 捕鱼笼 / 养鱼箱 | 材料与工具总表五/八 | `fishing` 占位 |
| B19 | 保护卡 / 加速卡 | 材料与工具总表四 | 无实现 |
| B20 | 概率公示 | `docs/07_release/compliance/probability-disclosure.md` + 生成物 | 数值为 0，公示内容目前为空 |

## C. 文档与代码不一致（逐条）

| # | 不一致 | 文档侧 | 代码侧 | 影响 |
|---|---|---|---|---|
| C1 | `module-catalog.json` 声明 `account.tables = ["regions"]` | `module-catalog.json` | `0001_init.sql` **无 `regions` 表** | 开新区无落点；任务卡需先补迁移 |
| C2 | architecture-overview 5.3 列出 `income_event`、`chat_message`、`report`、`ban`、`title_award` | `architecture-overview.md` 5.3 | 13 张表里**全缺** | 排行榜/聊天/封号/称号均无存储 |
| C3 | `0001_init.sql` 头注释"建议稿，ADR-0004 确认后执行" | 文件头 | ADR-0004 已 `accepted` | 注释过期，易误导执行者重复决策 |
| C4 | `mvp-scope.md` 第 5 节 v1.0 清单**无称号**；同文件周次表第 5 周**有称号系统** | 同文件内 | — | 首版范围自相矛盾 |
| C5 | v5.5 11.4 排期表第 4 周含"称号、每日一海"；同节后文又说第 5 周做称号与每日一海 | v5.5 11.4 | — | 同文档内不一致 |
| C6 | v5.5 11.1【已定】"每日一海、称号系统首版就做" vs 10-23 10:45 v1.0 清单无称号 | v5.5 11.1 / 设计要点记录 | — | 以时间最新（10-23 10:45）为准 → 称号不在 v1.0，但 v1.1 也未列 → **称号掉版** |
| C7 | v1.0 清单含"每日一海"，v1.1 又含"赶海多捞哦活动 + 赶海排名"（术语表定义为同一活动） | mvp-scope 第 5 节 / glossary | — | 同一功能被跨期重复列出 |
| C8 | v5.5 11.1【已定】首版有商人/价格表/回收、钓鱼、区服聊天+世界频道、保护卡；10-23 10:45 v1.0 清单均未提 | 两处 | — | 需裁决是"默认包含"还是"移出首版" |
| C9 | 赶海计分：10-22 已定 10-6"箱子本身原价计入" vs 10-23 10:45"按每件捆到的物品价格相加"（未提箱子） | 设计要点记录 | — | `functional-analysis` 已标"仍待澄清"；影响分值公式实现 |
| C10 | `chain：契约测试全绿` 与"20 动作全占位" | tests/contract | handlers.ts `todo` | 造成"已实现"的错觉，必须写入 09 的防自证条款 |
| C11 | `client/settings/` 只有 README，但文档多处假设已有工程与 Bundle 配置 | bundle-plan / architecture 4.4 | 无 settings、无 .meta、无场景 | 第一刀必须先人工初始化工程 |
| C12 | 46 张数值表被文档引用为"已定数值"，实际 CSV 0 数据行 | 材料与工具总表（有大量真实数字） | `game-data/source/*.csv` 全空 | 数值需从 design-source **转录**进 CSV，是一项独立工作量 |

## D. 读取失败 / 无法核实

| # | 项 | 原因 | 处置 |
|---|---|---|---|
| D1 | `我的筏-深度设计方案-v5.5.md` 全文单次读取 | 文件 111KB，超过单次读取上限 | 已按章节分段读取（第十一/十二/十三章重点），行号已记录；**不宣称读过全文** |
| D2 | 微信/抖音真实接口行为 | 未构建过小游戏包，无真机 | 列入 10-risks 的平台风险；需真机任务验证 |
| D3 | 目标机型（2 核 4G 安卓）实测帧率 | 无设备、无包 | 指标标"**尚无基线**" |
| D4 | 服务器部署与数据库连通 | 未部署 | 列为 BLOCKING-adjacent（不阻塞规划，阻塞切片 S7 之后） |
| D5 | 软著/备案/流量主的实际办理状态 | 文档只写计划，无回执 | 见 10-risks + 待用户确认项 |

## E. 结论状态汇总（用于 11-self-check 追溯）

| 结论 | 状态 |
|---|---|
| 契约层（20 动作 + 错误码 + 封套）可冻结 | **已确认** |
| 服务端零业务实现 | **已确认** |
| game-core 7 模块可用、11 模块占位 | **已确认** |
| Cocos 工程未初始化 | **已确认**（.meta/.scene/.prefab = 0） |
| 数值内容为零 | **已确认**（46 CSV 全 1 行） |
| 首版范围存在 4 处冲突（C4–C8） | **存在缺陷**，需用户裁决 |
| 区服/管理端完全缺位 | **存在缺陷**，需新增迁移与动作 |
| 性能与手感指标可达成 | **证据不足**（尚无基线） |
