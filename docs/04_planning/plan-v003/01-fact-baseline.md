---
id: PLAN-V003-01
title: 事实基线（2026-10-27，commit 13e6b68）
status: active
module: planning
owner: hark
created: 2026-10-27
related: [PLAN-V003-00]
---

# 01 · 事实基线

> 每条事实都附可复跑证据。文档与代码不一致处逐条列出，**以真实代码为准**。

## 1.1 已确认事实（有证据，可复跑）

| # | 事实 | 证据（命令/文件:行） |
|---|---|---|
| F-01 | M1 收官：13/13 卡完成（TASK-3001~3401） | `docs/04_planning/current-plan.md:18`；EVD-3001~3401 共 13 个证据目录存在 |
| F-02 | 门禁全绿：guard 9/9；tests 107/107 | `npm run guard`；`npm test`（2026-10-27 实跑） |
| F-03 | 双端一致：origin/master == master == `13e6b68` | `git rev-list --left-right --count origin/master...master` → `0 0` |
| F-04 | 服务端 20 动作：12 实现 + 8 todo | `server/src/gateway/handlers.ts:35-49`（todo: salvage.claimInfo / economy.buyQuota / event.start/submit/result / social.send/pull / ads.claim），注释原文"均依赖 E-06 数值" |
| F-05 | 数据 46 表 300 行；真表 5 张 | `game-data/UNKNOWN-TABLES.md` §五；`client/assets/resources/config/` 实测 items 106 / prices 106 / recipes 80 / locks 5 / chests 3 |
| F-06 | 空表 41 张 | 遍历 `client/assets/resources/config/*.json` 实测 0 行清单（ad_placements/bait/blueprints/buildings/consumers/crew_traits/defenses/drops/event_drops/events/explore/facilities/fish/foods/generators/guide_steps/hooks/islands/jobs/levels…） |
| F-07 | 字段级欠账 10 项 | `game-data/UNKNOWN-TABLES.md` §三（items weight/capacity/stack/unlock_level；locks hits_required/zone_bp；chests smashable/size；recipes job/unlock_level） |
| F-08 | 21 条设施/建筑配方被合规跳过 | `UNKNOWN-TABLES.md` §四（输出须为 items.id，设施类应落 facilities/buildings 表） |
| F-09 | 客户端 19 个 feature model 仍为 6 行桩 | `wc -l client/assets/scripts/features/*/model/*.ts`（已实现仅 hook 125 / crafting 156 / leaderboard 107 / inventory 65 / SaveSyncModel 237） |
| F-10 | 契约冻结：ADR-0011 三缺口 proposed | `docs/03_solution/decisions/ADR-0011-contract-gaps.md`（sell 回收 / 2004 票据码 / event ops 载体） |
| F-11 | 第 4 缺口：14 码无"网络错误"专用码 | `RpcClient.ts` 网络失败回落 `ERR.INTERNAL(4999)`（10-27 主控 hot-fix，注释已记缺口） |
| F-12 | recipes.inputs 是字符串 `id*count;…`（80 行：单31/双44/三2/四3） | `client/assets/resources/config/recipes.json` 实测；EXEC-BRIEF-0002 §3.2 |
| F-13 | v1.0 期次已拍板：商人/回收进 v1.0；S8 赶海整片移 v1.1 | `current-plan.md:58`（12:27 期次变更） |
| F-14 | 48 AT 台账：v1.0 可开工 28，阻塞 20（数值 10/环境 5/v1.1 移出 5） | `docs/04_planning/plan-v001/06-task-index.md:45-51` |
| F-15 | 存档以客户端 push 为准，服务端无权威背包 | `ADR-0011` 缺口1 选项A 风险栏原文；`server/src/modules/save/service.ts` |
| F-16 | 真机指标空白：首钩命中率无采样；四面板录屏未录 | `roadmap.md:27`（"尚无真机采样，属未验证"）；EVD-3101/3102/3103/3104 无 .mp4 |
| F-17 | v1.0 出口四件：verify 全绿 + 真机 6 态 + 主包 ≤4MB + 软著/备案 | `roadmap.md:29` |

## 1.2 文档与代码不一致清单（已核实，以代码为准）

| # | 文档说 | 代码实况 | 处置 |
|---|---|---|---|
| D-01 | EXEC-BRIEF-0002 中 C-11（3401）标题无 ✅ | TASK-3401 实际已完成（F-01） | 本轮补标（见 11-self-check §3） |
| D-02 | plan-v001 的 AT-0301/0302/0303 等 10 卡标"被数值阻塞" | 阻塞源未变（F-06/F-07），但其中**开锁链**只差 2 个字段（locks.hits_required/zone_bp）——比"整表为空"轻一个量级 | 本规划把"字段级欠账"与"整表级欠账"分开排（03-slices 切片依据） |
| D-03 | ADR-0011 称"本轮所有任务卡禁止改 contracts" | M1 全程遵守（13e6b68 中 contracts 无 diff） | 本规划沿用，解冻仅在 W4 且需用户授权 |
| D-04 | `roadmap.md:28` M1 出口写"四个面板手工演示通过" | EVD 目录有 README 与步骤，**无录屏文件**（F-16） | M1 出口第 2 项**未闭环**，进 W3 真机验证刀 |

## 1.3 仅来自文档、未在代码验证的

- `MUST-*` 需求编号定义在 `docs/02_requirements/functional-analysis.md`（本规划引用其编号，语义以该文件为准）。
- 软著/备案材料清单在 `docs/07_release/`（W4 才需要，届时复核）。

## 1.4 读取失败或无法访问的

- 无。所有引用路径均实测存在。
