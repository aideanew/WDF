---
id: PLAN-0003
title: 当前计划（唯一"现在做什么"）
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 当前计划（唯一"现在做什么"）

## 现在处于哪一步

> **2026-10-23 18:00 复核**：S0 已完成，**S1 步行骨架的服务端侧已打通**，可以本地端到端跑。本节以下事实已按代码/实测更新，plan-v001 里的"未初始化"结论是 10-23 上午的冻结快照，**以本节为准**。

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
  - **服务端 5 个动作已真实实现**（`account.login`、`compliance.check`、`config.manifest`、`save.pull`、`save.push`），其余 **15 个仍 `todo`**（返回 4999）；
  - 本地数据库：`.local/pg/`（PGlite），**重启进程身份与存档不丢**（已实测 `isNew` true→false）；
  - `npm run verify` 全绿：**9 项守卫 + 20 个测试**（单元7/契约3/集成10；e2e 0）；
  - 本地全链路探针 `npm run probe`：**30 条断言全绿**（healthz → manifest → login → compliance → pull → push → 幂等 → 冲突 → pull）。
- **期次变更（12:27）**：商人/回收进 v1.0；**S8 赶海整片（含多捞哦活动与赶海排名）移入 v1.1**；v1.0 只保留"每日一海"的入口；钓鱼/聊天/保护卡移入 v1.1。

## 必须先知道的三件事

1. **verify 全绿 ≠ 有功能**：服务端 **14/20 handler 仍是 `todo`**（返回 4999；已实现 6 个），46 张数值表已转录 **300 行**（items/prices/recipes/locks/chests），但 **13 张核心表仍 0 行**（raft_tiles/levels/units/waves/islands/merchants/hooks/lines…），客户端 `features/*` 23/23 仍是占位空壳。已实现的 6 个动作多是"能跑通"，玩法逻辑仍在 `game-core` 占位模块里（hook/crafting/…）。
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
| 3 | **E-05（续）** | **`account.refresh` 已落地**（契约 + 服务端 handler + 客户端自动刷新 + 集成测试）。**剩余 14 个 handler 仍 `todo`**：`account.bindStart/bindConfirm`、`save.resolveFork`、`salvage.claimInfo`、`economy.buyQuota`、`leaderboard.*`、`event.*`、`social.*`、`ads.claim`、`telemetry.track`——它们需要 E-06 的数值与业务规则，等 E-06 解锁后再分批实现 |
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
npm run verify              # 9 项守卫 + 17 个测试
```

- 不需要：真机、备案域名、微信开发者工具（服务端侧）、PostgreSQL 安装。
- 环境变量：`API_PORT`（默认 5050）、`API_HOST`（默认 `127.0.0.1`）、`WDF_DB_DIR`（默认 `.local/pg`，测试用 `:memory:`）、`WDF_TOKEN_SECRET`（**生产必须注入**）、`WDF_AUTH_MODE`（`dev` 默认；`platform` 会抛错，等真机阶段接 code2session）。
- 客户端侧：`client/assets/scripts/services/net/RpcClient.ts` 的 `FORCE_OFFLINE = false`（E-04 已关闭），已真联网；当前端到端断点是"出钩玩法仍走 mock/空壳"（`features/hook` 占位），不是网络。

## 本计划不含

- 不排任何优化任务（无基线，见 plan-v001/09）。
- 不为第二版（pvp/trade/recruit/burial/ocean）建目录或建表。
