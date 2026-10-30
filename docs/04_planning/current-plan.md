---
id: PLAN-0003
title: 当前计划（唯一"现在做什么"）
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 当前计划（唯一"现在做什么"）

## ⚑ PLAN-R5 / plan-v012（2026-10-30）—— **现行规划**

| 项 | 值 |
|---|---|
| 规划目录 | [`plan-v012/`](plan-v012/00-README.md)（17 份 md） |
| 规划基线 | `8fbb57b`（`main`，工作区干净；本地领先远端 19 个提交） |
| 任务卡 | **PD8-01 ~ PD8-18（18 张）**：阶段 0（治理 2 张）/ A（v1.0 收口 4 张）/ B（消费端接线 2 张）/ C（模块实现 9 张）/ D（运营 1 张，BLOCKED-HUMAN） |
| 核心命题 | **瓶颈在消费端不在数据**：46 张表已就绪，`TableName` 只有 11 张 → 35 张不可达；13 个模块 core 合计 25 行 |
| 待裁决 | **D-57 / D-58 / D-59 / D-60**（全部 `PROPOSED`，均不阻塞 PD8-01、PD8-06、PD8-18） |
| 第一刀 | **PD8-06（`TableName` 11→46）∥ PD8-18（测试口径）∥ PD8-01 步骤 1~6** |
| 测试基线 | 实跑 **270 条 / 267 pass / 3 fail**（`items-w 3/6` × 2 + `docs-index` × 1）；**修绿在 PD8-18 与 PD8-01** |

**本版两个必须知道的事实**（推翻了 v011 的隐含前提）：

1. `npm run test` 在 `8fbb57b` **是红的**（3 条）→ 任何"阶段出口 `verify` EXIT=0"在 PD8-18 + PD8-01 完成前都是空话。
2. 塔防"文字结算"**也需要数值**：`units` 的 `hp/speed/attack` 与 `defenses` 的 `damage/hp` **全部缺失**，`waves` schema 只有 `id/name/note` 三列 → D-58 由 A 收敛为 **A′**（袭击胜负返 `verdict:'unknown'`）。

**与 v011 的关系**：v011 的 17 张卡不重开。PD7-01/06/07 已 DONE；PD7-08/09 的 BLOCKED 理由在本版被重新界定（4 张零消费方不阻塞、1 张有回落、只有 `drops` 是真缺口 → PD8-07）。

## ⚑ v1.0 收官状态（2026-10-28）

**plan-v010 的 20 卡已全部落账并推送（`9da93b7`）**，v1.0 范围为「两套规划并集」：

| 规划 | 交付 | 状态 |
|---|---|---|
| plan-v003（16 卡） | 数值清欠、影子账本 `economy.sell`、商人页、背包回收、契约解冻（2004）、包体基线 | 9 PASS / 1 部分 / **4009 经用户拍板推迟 v1.1** / 4010·4011 缺真机 / 4014 关闭 / 4016 本次收官 |
| plan-v010（20 卡） | 空壳显性化、登录真接线、广告闭环、数值解锁、UI 六态、`npm run stage` | 20/20 落账（4 张为零代码交付） |

**收口后仍不在 v1.0 的**（已裁定，不作虚假承诺）：开锁交互与 `salvage.claimInfo`（推迟 v1.1）、防沉迷真实化与合规拦截 UI（D-45=B）、账号面板（无需求来源）、真机录屏与命中率采样（缺环境）。

> **合规真实化依赖（FIX-10，W5-5 登记）**：`compliance` 恒真桩（`verified = playerExists()`、`minor` 恒 false）的解除依赖微信平台 **appid + appsecret + 主体资质**（`WDF_AUTH_MODE=platform` 需真机 code2session），属外部资质链，**非代码待写**。

**代码层 v1.0 口径（R-6，2026-10-28 用户拍板，W3-2）**：**v1.0 = 捞→包→做→扩→卖五环**（`hook`/`sea`/`chest` → `inventory` → `crafting` → `raft` → `economy`，另含 `account` 登录 / `guide` 引导 / `settings` 设置，共 10 模块）；**其余 13 个 v1 模块进 v1.1**（`compliance`、`salvage`、`fishing`、`crew`、`power`、`island`、`defense`、`leaderboard`、`event`、`social`、`ads`、`telemetry`、`progression`，模块目录 `module-catalog.json` 为权威）。
**激励视频三效果无载体（R-1/FIX-2）**：`hook_cooldown`/`offline_double`/`shop_refresh` 三 placement 的奖励载体（冷却字段/离线结算/商店）均未落地，v1.0 只发"日限内可领取"的登记、不伪造效果，冻结至 v1.1（D-49）。

## ⚑ PLAN-R2（2026-10-29，pds 治理接入后的第一轮全量规划收口）

| 项 | 状态 |
|---|---|
| 规划基线 | `bf0fe75`；`PLAN-R2`（R1 的 14 张卡首版未入索引，R2 补齐，见 FIX-24） |
| 权威索引 | `.product-development/task-index.json`（66 张：52 历史 + 14 PLAN-R2）；**`docs/05_execution/task-index.md` 是生成视图，不可作为权威**（R-8） |
| 决策登记册 | `docs/03_solution/decisions/decision-index.json`（36 条，`kind: architecture` = ADR-0001~0015、`kind: product` = D-01~D-51） |
| 测试台账 | `docs/06_validation/pd/test-ledger.json`（7 条） |
| 闸门 | `npm run verify` EXIT=0；守卫 **10/10**（第 10 项 = 占位值 baseline）；`tests 231/231`；tsc 0 错 |
| 体检 | `pd.mjs health` → **通过（52 提醒，0 错误）**；`replan-check` 余 15 项均为**已裁决挂账**（14 项 BLOCKED 见 D-50/D-51，1 项 P3 无被测对象的机械提示） |

> **PD2 三项结案口径（D-51）**：4011 真机 20 钩 / 4010 四面板录屏 / 4013+FIX-10 合规资质，记为 `BLOCKED-HUMAN`（**不是延期**——三项全是等外部输入，无一项是代码待写）。恢复触发条件见 `plan-v003/decision-sheet.md` §F。**PD4-01 的 PASS 只覆盖自动化范围**，3 项人工项在台账标 `UNKNOWN`，不得读作完整验收通过。

## ⚑ 现行规划指针（2026-10-28 09:30 更新）

> **唯一现行执行规划 = [`plan-v011/00-README.md`](plan-v011/00-README.md)**（16 份，卡片 PD7-01~PD7-17，`plan_version = PLAN-R4`）。
>
> | 规划 | 状态 |
> |---|---|
> | `plan-v001` ~ `plan-v003` | 历史，只读 |
> | `plan-v004` | **废止**（路径假设与所有权矩阵有 4 处失真） |
> | `plan-v005` | **冻结归档**（事实基线与 F-01~F-18 缺陷编号仍有效并被继承，步骤编号失效） |
> | `plan-v006` | **冻结归档**（v005 瘦身版，丢失 4 项关键判据） |
> | `plan-v007` | **冻结归档**（`11-drift-audit` 对 `chest/service.ts` 的 8 条指控已于 16:47 全部失效） |
> | `plan-v008` | **已被取代**（步骤 1/2/3 已完成并推送；F-27/F-36/F-42 由 v009 继承） |
> | `plan-v009` | **已被取代**（8 张卡全部 done 并推送至 `ea6ad20`；F-43/F-44/F-42a/F-42b 已落地，结论被 v010 继承） |
> | `plan-v010` | **已收官**（20 卡落账 `9da93b7`；其结论被 v011 继承，**但「v1.0 五环已闭环」的说法被 v011 §00-C-1 订正**） |
> | **`plan-v011`** | **唯一现行**（四阶段：A v1.0 合口 / B v1.1 数据 / C v1.1 模块 / D v1.2 运营） |
>
> **plan-v011 的三条关键订正（2026-10-29）**：
> ① R-6 五环的「扩」（`raft`）**没有客户端入口、没有调用方**（`features/raft` 18 行空壳、`MainView` 6 Tab 无筏体）
> → 补 5 张 A 阶段卡；② `items.capacity` 已非全 0（103 行 0 + 3 行 20/40/60 全为 `chest`），
> 原"扩筏必然失败"结论降级为"口径可疑"；③ 13 个模块按 D-50 归 v1.1，`raft`/`sea` **不在** D-50 清单内 → 属 v1.0 欠账。
>
> **三条裁决已落账（2026-10-29，全部 `DECIDED` / `decided_by=user`）**：
> - **D-54**：`Q1=B`（v1.0 出货**含**扩筏 UI）+ `Q2=A`（**浮力 = Σ `raft_tiles.capacity` − (船体地块自重 + 货重)**；`items.capacity` 一律归 0，保留列位）→ A 阶段 5 张卡全保留，PD7-01 解除阻塞。
> - **D-55**：`origin` 已重指 `https://github.com/aideanew/WDF.git`（匿名 `fetch` 自证 `0 0`）；**token 吊销 + 凭据就位由用户执行，完成前不推送**。
> - **D-56**：`B` —— 13 个模块**不改** `hook` 参数（`target_dist` / `angle_deg` / `max_power_bp` 含 D-04 等值迁移值一律冻结），C 阶段据此解绑 C1 手感闸门。
>
> 后果清单（12 条 `C-xx`，逐条挂到卡，开工前必读）：[`plan-v011/10-risks-pending.md §1.4`](plan-v011/10-risks-pending.md)。
>
> ⚠ **唯一仍挂着的用户侧动作**：吊销 3 个 token + 凭据就位。在此之前本地可全速开工，只是不推送。
>
> **接手第一步不是读本节以下内容，而是读 [`plan-v011/02-fact-baseline.md`](plan-v011/02-fact-baseline.md)**
> —— 那是全项目**最新的事实基线（钉在 `4e572fa`）**，含 12 条文档↔代码不一致清单；
> 需求完成度仍以 [`plan-v010/02-requirement-inventory.md`](plan-v010/02-requirement-inventory.md) 为权威
> （v011 复核未发现该矩阵失效，仅订正 `raft`/`sea` 归属）：
>
> | 实测口径（v011 复核，2026-10-29） | 数字 |
> |---|---|
> | `module-catalog.json` 登记 v1 模块 | **23 个**（+ `ops` 不建界面 = 24） |
> | **六层齐全（完成）** | **7 个** + `leaderboard` 部分 |
> | **部分完成（服务端齐、客户端缺）** | **3 个**（account / telemetry / leaderboard） |
> | **完全未实现** | **13 个**（D-50 归 v1.1） |
> | **v1.0 欠账（不在 D-50 移出清单）** | **2 个**（`raft` / `sea` 客户端） |
> | 按设计不做界面 | 1 个（ops） |
>
> ⚠ **禁止再使用"v1.0 仍在收口中"这个说法。** 那是 plan-v009 的措辞，实测为**半程**
> （见 `plan-v010/03-self-negation.md` N-4）。"收口"会让人按"收尾"的心态排期，必然崩。
>
> ⚠ **禁止宣称任何百分比完成度**，除非同时说明按目录数算还是按行为算
> （15 个客户端 feature 目录齐全但只有一行常量，按目录算是 100%，按行为算是 35%）。
>
> 本节以下内容为 **10-23 ~ 10-27 23:00 的历史记录**，按时间倒序堆叠，**保留但不作为执行依据**。

## 现在处于哪一步

> **2026-10-26 16:40 重基线（plan-v002 收官后）**：12 个 AT 完成 11（仅 AT-2302 等数值），
> **下一阶段 = M1 可玩闭环**，**13 张**任务卡已落盘（TASK-3001~3401），
> 派工与四级执行大纲见 `docs/05_execution/ASSISTANT-BRIEF.md`。plan-v001 的"未初始化"结论是 10-23 上午的冻结快照，**以本节为准**。
>
> **2026-10-26 23:40 M1 收官（EXEC-BRIEF-0002）**：13 张卡**全部完成**（TASK-3001~3401，含本卡 3401 收口），
> `verify` 全绿（9 项守卫 + 107 测试）。可演示闭环：打捞 → 背包 → 合成 → 榜单 → 云存档同步。
> 逐卡证据见 `docs/06_validation/evidence/EVD-3002|3100|3102|3103|3104|3105|3201|3202|3301|3302/`。
> 遗留缺口（不影响闭环）：①客户端存在 7 个既存类型错误（ASSISTANT-BRIEF BASE-34，含 `RpcClient` 的 `ERR.SYSTEM` 不存在）；
> ②4 个手写脚本无 `.meta`（BASE-33，编辑器自动补齐）；③`features/*` 其余模块仍为占位。
> （**2026-10-27 修订**：①的 7 个类型错误已由主控 hot-fix 清零——见提交 `13e6b68`；②随 Cocos 编辑器打开已补齐。）
>
> **2026-10-27 下一阶段切换 = v1.0 最终冲刺与闭环（plan-v004）**：M2 前半段（数值转录、权威背包后端等）已完成，
> 当前规划（plan-v004）聚焦于**UI交互实现（商人、回收、开锁）及契约解冻**，彻底打通 v1.0 剩余拼图。
> 完整规划见 **`docs/04_planning/plan-v004/00-snapshot.md`**（8 文件：事实基线/需求复核/契约冻结/数据模型/切片/DAG/指标/自检）。

### 现在做什么（M1 可玩闭环，2026-10-26 立）

**唯一目标**：用**已有 300 行真实数值**（items 106 / prices 106 / recipes 80 / locks 5 / chests 3）把
"打捞 → 看背包 → 合成 → 看榜单 → 云存档同步"串成一条**可演示闭环**，不碰任何缺数功能。

| 批次 | 任务 | 归属 | 说明 |
|---|---|---|---|
| R2（串行，唯一写入者） | TASK-3001 | Agent-Contract | 第⑥份契约：UX 六态 + 14 码映射（`DESIGN-0001` 已冻结） |
| R3（并行 3 写） | TASK-3002 / 3100 / 3201 / 3202 / 3301 / 3302 | Client / Core / Guard | configVersion 单一来源、客户端配置读取服务、合成判定与背包投影纯函数、守卫换行规范化（原设想"第 10 项"经核实重复覆盖，未落地）、存档封印回归测试 |
| R4（并行 2 写） | TASK-3101 / 3302 | Client-A / Guard | 主界面 Tab 导航（含 4 面板桩）、存档封印回归测试 |
| R5（并行 2 写） | TASK-3202 → 3102+3103 / 3104+3105 | Core / Client-A / Client-B | 背包投影 → 背包页、合成页；榜单页、云存档页 |
| R6（串行） | TASK-3401 | Agent-Docs | 计划/路线图/索引对齐，本轮收口 |

**本轮明确不做**（有据）：回收动作（契约里没有 `economy.sell`，见 `ADR-0010` 缺口 1）、
剩余 8 个 `todo` handler（全部依赖空数值表）、开锁 UI（`locks.hits_required` 0/5）、
任何"优化"任务（无基线）。

**已知局限（必须随交付一起说）**：客户端 UI 无自动化测试环境（Cocos 运行时 + `getPlatform()` 不可注入），
故 UI 任务的可自动化部分全部下沉到 game-core 纯函数，UI 本身为人工验收 + 录屏证据。

- 阶段：0 立项 ✅ → 规划 ✅ → S0 工程初始化 ✅ → **S1 步行骨架（客户端 4 件 + 服务端 5 件已就绪，进行中）**。
- 唯一权威计划：**[docs/04_planning/plan-v002/](plan-v002/)**（2026-10-26 重基线，13 份，从 `00-snapshot.md` 读到 `12-first-cut.md`）。`plan-v001/` 作为 10-23 历史冻结快照保留，其中"5 实现/15 todo、0 行数值、FORCE_OFFLINE=true、17 测试"均已被 plan-v002/01 §8 证伪。
- **开发路径已定（用户 10-23 当日拍板）**：**先本地开发，不用真机、不做认证备案**。据此所有"真机/备案/软著"类事项一律降级为并行待办，不再占用阻塞位。
- 技术选型已定并落地（用户授权"技术选型你来定"）：**Fastify 5 + zod + PGlite**（PostgreSQL 18.6 编译成 WASM，零安装、SQL 方言与生产一致）+ **HMAC-SHA256 自签令牌**（不引第三方 JWT）。
- 事实基线（18:00 实测）：
  - Cocos Creator **3.8.8**，`client/package.json` 已写死版本；
  - `client/assets/` 有 **350 个 `.meta`**、**1 个场景**（`scenes/Boot.scene`）、**134 个 `.ts`**、0 个 `.prefab`；
  - 7 个 `b-*` 目录的 `.meta` 均 `isBundle: true`；**其中只有 `b-common` 存下了 `priority=6`，其余 6 个没有 `priority`；7 个全都没有 `compressionType`**（用 `npm run check:bundles` 实测）。目录内只有 `README.md`（无真实资源）；
  - 已构建过微信包：`client/build/wechatgame/`，**主包 3.1MB**（引擎 `cocos-js` 占 2.5MB），`game.json` 里**没有 `subpackages`**（即当前没有任何分包）；
  - `project.config.json` 的 AppID 为真 AppID（非测试号）；
  - **服务端 12 个动作已真实实现**（`account.login/refresh/bindStart/bindConfirm`、`compliance.check`、`config.manifest`、`save.pull/push/resolveFork`、`leaderboard.report/query`、`telemetry.track`），其余 **8 个仍 `todo`**（返回 4999，全部依赖 E-06 数值：salvage/economy/event×3/social×2/ads）；
  - 本地数据库：`.local/pg/`（PGlite），**重启进程身份与存档不丢**（已实测 `isNew` true→false）；
  - `npm run verify` 全绿：**9 项守卫 + 107 个测试**（determinism 52 / 契约 21 / 集成 33 / e2e 1，2026-10-26 M1 收官后实测；旧值 65 为 M1 之前）；
  - 本地全链路探针 `npm run probe`：**30 条断言全绿**（healthz → manifest → login → compliance → pull → push → 幂等 → 冲突 → pull）。
- **期次变更（12:27）**：商人/回收进 v1.0；**S8 赶海整片（含多捞哦活动与赶海排名）移入 v1.1**；v1.0 只保留"每日一海"的入口；钓鱼/聊天/保护卡移入 v1.1。

## 必须先知道的三件事

1. **verify 全绿 ≠ 有功能**：服务端 **8/20 handler 仍是 `todo`**（返回 4999；已实现 12 个），46 张数值表已转录 **300 行**（items/prices/recipes/locks/chests），但 **13 张核心表仍 0 行**（raft_tiles/levels/units/waves/islands/merchants/hooks/lines…）。已实现的 12 个动作覆盖账号/存档/榜单/埋点全闭环；`features/hook` 出钩玩法已接线（AT-2102/2103），其余 `features/*` 仍多为占位空壳。
2. **S1 的服务端断点已经接上**：`compliance.check` / `account.login` / `save.push` 不再是 todo，本地 `npm run dev:server` + `npm run probe` 即可验证。**客户端 `FORCE_OFFLINE` 已改 `false`（E-04 已关闭，10-26）**，`RpcClient` 已接"收 2002→静默刷新→重试"闭环，端到端已打通。
3. **48 个原子任务：v1.0 可开工 28 个，20 个被阻塞或移入 v1.1**（数值欠账 10、环境 5、v1.1 移出 5，逐条见 plan-v001/06）。

## 阻塞清单（需用户拍板，按优先级）

> 12:27 后只剩环境类；18:00 复核后再关 1 条、新增 1 条。

| 优先级 | 编号 | 问题 |
|---|---|---|
| ~~—~~ | ~~U-01~~ | ~~称号放 v1.0 还是 v1.1~~ → **已关闭**（11:18：v1.0 做） |
| ~~—~~ | ~~U-02~~ | ~~v1.0 的 3 个兵种具体是哪 3 个~~ → **已关闭**（12:27：近战/远程/坦克各 1，各取最低解锁） |
| ~~—~~ | ~~U-03~~ | ~~赶海计分是否含箱子原价~~ → **已关闭**（11:18：含箱子本身） |
| ~~—~~ | ~~U-04~~ | ~~v1.0 赶海是否含排名与奖励~~ → **已关闭**（12:27：v1.0 只有每日一海，S8 移入 v1.1） |
| ~~—~~ | ~~U-05~~ | ~~日常出箱率与"每钩必中"的适用范围~~ → **已关闭**（12:27：日常 0.001%–2%；赶海每钩必中） |
| ~~—~~ | ~~U-06~~ | ~~管理员能力：脚本级还是最小后台~~ → **已关闭**（12:27：只做脚本 + SQL，无后台界面） |
| ~~—~~ | ~~U-07~~ | ~~商人/钓鱼/聊天/保护卡是否进 v1.0~~ → **已关闭**（12:27：商人进 v1.0，其余 v1.1） |
| ~~—~~ | ~~U-08~~ | ~~46 表数值是否以 `材料与工具总表` 为唯一转录源~~ → **已关闭**（12:27：只转录，不重新设计） |
| ~~—~~ | ~~U-10 / U-11~~ | ~~主体/备案/软著进度、合法域名与证书~~ → **降级为并行待办**（用户：先本地开发，不用真机和各种认证备案） |
| ~~—~~ | ~~E-02~~ | ~~服务端 20 个 handler 全 todo~~ → **部分关闭**：5 个已实现，**剩 15 个**（见下 E-05） |
| ~~—~~ | ~~E-03~~ | ~~三件未实现前"必须联网"无法验证~~ → **已关闭**：本地已实测 `offlineAllowanceMs=0` 且断网即失败 |
| ~~—~~ | ~~E-01~~ | ~~Bundle 分包配置 0/7 生效~~ → **已关闭**（10-26 10:48）：用户改方案微信行=`Subpackage`，Agent 补 6 个文件夹 priority；`npm run check:bundles` 三层全绿，`game.json` 含 8 个 `subpackages`（resources + 7 Bundle，全部本地）。验收见 `06_validation/evidence/EVD-0108` |
| 2 | ~~—~~ | ~~E-04~~ | ~~客户端 `FORCE_OFFLINE`~~ → **已关闭**（10-26 11:0x）：改 `false` 真联网；`RpcClient` 接好"收 2002→静默刷新一次→重试"闭环；`account.refresh` 标 `auth:false` 自校验签名重签发（过期令牌也可）；服务端起 + 探针 30/30、测试 20/20 全绿 |
| 3 | **E-05（收尾）** | **plan-v002 四组不依赖数值的 handler 已全部落地**（10-26）：`account.bindStart/bindConfirm`（账号合并）、`save.resolveFork`（分叉裁决）、`leaderboard.report/query`（收益榜）、`telemetry.track`（埋点）。**剩余 8 个 `todo`**：`salvage.claimInfo`、`economy.buyQuota`、`event.start/submit/result`、`social.send/pull`、`ads.claim`——全部依赖 E-06 数值表填充后分批实现 |
| 4 | **E-06（收尾中）** | **数值转录**：`npm run gen:config` 已通过（46 表 / **300 行**）。已转录 `items`(106)/`prices`(106)/`locks`(5)/`chests`(3)/**`recipes`(80)**，数值全部取自《材料与工具总表》、零自编；`items.weight`/`locks.hits_required,zone_bp`/`chests.smashable` 放松为可选（文档未给，留空待补）；`prices.recycle_bp` 上限放宽 10000→100000；`recipes` 21 条特殊/设施类配方合规跳过（见 UNKNOWN 第五节）。**全部留空待填项已统一登记进 `game-data/UNKNOWN-TABLES.md`**（第三/四/五节），含 items 4 空字段、recipes 的 job/unlock_level、chests 的 smashable/size、41 张无源空表清单、21 条配方跳过明细。**剩余（非阻塞，待补来源）**：① 41 张无源表补来源后转录；② recipes 的 `job`（依赖空表 jobs 先填充）与 `unlock_level` 待设计文档给值；③ items 的 `weight/capacity/stack/unlock_level` 待补。 |
| 5 | ~~—~~ | ~~E-07~~ | ~~payload 校验 4/20~~ → **已关闭**（10-26 11:0x）：补齐 16 个动作 schema，覆盖 20/20；加契约测试遍历 `ACTIONS` 断言"有 schema 或显式豁免"，防 zod/TS 漂移（`tests/integration/payload.test.mjs`） |

## 并行待办（不计入开发阻塞）

- **软著：≤ 10-30 提交**（【已定·Hark代定 10-23 11:18】硬期限），材料清单见 `07_release/compliance/copyright-materials.md`；ICP 备案立即办。—— **注意**：用户已明确"先本地开发"，本项不影响任何代码推进，只是法务期限在走。
- **ADR-0001（引擎版本锁定）**：工程实际已是 **Cocos Creator 3.8.8** 并成功构建微信包（16:49），但 ADR 要求"安卓真机打开"才改 `accepted` —— **目前缺真机证据，状态保持 `proposed`**。按"先本地开发"的口径，这一条**暂时不追**，等真机阶段一起补。
- **修复记录**：制度与索引见 [`08_knowledge/technical-notes/fix-log.md`](../08_knowledge/technical-notes/fix-log.md)；发现即记录，未记录视为未修复。当前 6 条，全部已修复并验证。
- **未登记数值**：箱子/“箱+锁”价格——总表里有就按表算，没有就登记进未知登记册，**不得自编数字**（10-23 11:18 / 12:27）。
- **34 张只有 `id,name,note` 的占位表**：按 v5.5 与《材料与工具总表》补列结构（12:27 已定，任务卡 TASK-1503）；设计文档里没有的数字进未知登记册。
- 概率公示内容：依赖数值转录（U-08 已关闭，按转录执行），数值为空则公示为空。

## 本地开发怎么跑（当前唯一可行路径）

```bash
# 1) 起服务端（首次会自动建库 + 跑迁移，数据落在 .local/pg/，无需装 PostgreSQL）
npm run dev:server          # → http://127.0.0.1:5050   GET /healthz  POST /v1/rpc

# 2) 另开一个终端，跑全链路探针（30 条断言）
npm run probe

# 3) 提交前闸门
npm run verify              # 9 项守卫 + 219 个测试（determinism 128 / 契约 27 / 集成 63 / e2e 1，2026-10-28 实测）
```

- 不需要：真机、备案域名、微信开发者工具（服务端侧）、PostgreSQL 安装。
- 环境变量：`API_PORT`（默认 5050）、`API_HOST`（默认 `127.0.0.1`）、`WDF_DB_DIR`（默认 `.local/pg`，测试用 `:memory:`）、`WDF_TOKEN_SECRET`（**生产必须注入**）、`WDF_AUTH_MODE`（`dev` 默认；`platform` 会抛错，等真机阶段接 code2session）。
- 客户端侧：`client/assets/scripts/services/net/RpcClient.ts` 的 `FORCE_OFFLINE = false`（E-04 已关闭），已真联网；`features/hook` 出钩玩法已接线本地存档闭环（AT-2102/2103，10-26）。**M1 闭环已补齐（10-26）**：背包页、合成面板、排行榜页、云存档分叉 UI 全部落地（TASK-3102/3103/3104/3105），端到端断点不再是"features 占位"，而是"数值表 0 行"。

## 本计划不含

- 不排任何优化任务（无基线，见 plan-v001/09）。
- 不为第二版（pvp/trade/recruit/burial/ocean）建目录或建表。
