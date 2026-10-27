---
id: PLAN-V003-07
title: W3 开锁 + 真机验证（TASK-4009~4012）
status: active
module: planning
owner: hark
created: 2026-10-27
related: [PLAN-V003-03, PLAN-V003-01]
---

# 07 · W3 · S13 开锁 + S14 真机验证

> S14 三卡**不依赖任何裁决**，可与 W1/W2 全程并行（04 §4.3 机械判定）。这也是对"瓶颈在人不在码"的对冲：等裁决期间产出验证数据。

## TASK-4009 开锁交互 + salvage.claimInfo（助手 A，sonnect）

**目标**：上锁箱打捞后可开锁（连点 hits_required 次），开出物入包；`salvage.claimInfo` 从 todo 变实现（服务端结算开箱结果）。
**步骤**：1) 契约核对：`salvage.claimInfo` 请求/响应字段（contracts/salvage）；2) handler：按 `chests.lock → locks` 找 `zone_bp/hits_required`（D-08 裁决值）， loot 从 `drops` 表（**若 drops 仍空 → 该分支降级为"固定掉 1 个 base_price 最低物品"并 telemetry 记录**，不得自编掉落表）；3) 写 `ledger_entry`(type=salvage)（服务端累计获得，供 4006 影子校验）；4) 客户端：HookView 命中上锁箱 → 开锁小交互层（纯代码 UI，参照 HookView 力度条范式）。
**验收**：a) 无锁箱直开、有锁箱需连点；b) 断线重连后开锁进度不复制（服务端权威）；c) todo→实现，HANDLERS 表注释同步；d) 全量 verify 绿。
**验证命令**：`npm run verify`；`grep -n "salvage.claimInfo" server/src/gateway/handlers.ts`（不再是 todo）。
**允许**：contracts/salvage（仅注释/语义澄清，不动码）、server/salvage/**、client features/{salvage,hook,chest}/**；**禁止**：errors.ts。
**规模**：大（1d）。**升级**：若 drops 表仍空且产品要求真掉落 → 升 opus 报用户补 D 清单。

## TASK-4010 四面板真机录屏 + 6 态走查（助手 C，sonnect）

**目标**：补齐 M1 出口欠账（01-D4）：背包/合成/榜单/设置(云存档) 四面板录屏 + DESIGN-0001 六态逐面板走查。
**步骤**：1) 用户提供真机/开发者工具环境（缺 → BLOCKED 上报，**不得用模拟截图充数**）；2) 按 `EVD-3101/README.md` 的 9 步脚本操作并录屏；3) 每面板记录 6 态触发方式与截图；4) 产物入 `EVD-4010/`（4 个 .mp4 + 1 个 6 态矩阵 md）。
**验收**：a) 4 个 .mp4 存在且含完整操作；b) 6 态矩阵每格有 实测截图/触发码；c) 发现的 UI 缺陷列 issue 清单（不修，上报）。
**验证命令**：`ls docs/06_validation/evidence/EVD-4010/*.mp4 | wc -l` → ≥4。
**允许**：EVD-4010/**；**禁止**：一切代码。
**规模**：中（0.5d + 等真机）。

## TASK-4011 首钩命中率采样（助手 C，sonnect）

**目标**：把 roadmap 出口条件"首钩命中率 ≥45%、前 10 钩 40%–60%"变成**有基线数字**（F-16 目前空白）。
**步骤**：1) 用 `hook.hit/hook.miss` 埋点（telemetry 已有，HookView.ts:209）；2) 采样脚本：本地跑 ≥3 人 × 20 钩（用户+可控测试者），或离线读 telemetry 日志聚合；3) 产出 `EVD-4011/metrics.md`：首钩命中率 / 前10钩命中率 / 平均蓄力时长。
**验收**：a) 数字来自真实埋点（附原始日志样本 ≥20 条）；b) 未达标只记录**不调数值**（调手感=改 hooks 表，走裁决，禁止顺手改）。
**验证命令**：`ls docs/06_validation/evidence/EVD-4011/metrics.md`。
**允许**：EVD-4011/**、tools/telemetry 聚合脚本；**禁止**：改 hook 手感参数。
**规模**：小（0.3d + 采样时间）。

## TASK-4012 主包体积基线（助手 B，sonnect）

**目标**：给"主包 ≤4MB"（F-17）一个**首次测量值**；没有基线数字，后续一切"优化"任务都不许立（standing 规划 §9.1）。
**步骤**：1) Cocos 构建脚本产出 build/web-mobile；2) `tools/measure-bundle.mjs`：统计主包（不含 b-* 动态 bundle）体积 + top10 大文件；3) 数字落 `EVD-4012/baseline.md`（含构建参数快照）。
**验收**：a) 脚本可重复跑且数字稳定（±1%）；b) 若 >4MB：产出瘦身候选清单（按 top10 大文件给"可动态化/可删"标注），**不直接动包**；c) ≤4MB：4014 直接关闭。
**验证命令**：`node tools/measure-bundle.mjs && cat docs/06_validation/evidence/EVD-4012/baseline.md`。
**允许**：tools/**、EVD-4012/**；**禁止**：改构建配置、删资源。
**规模**：小（0.3d）。

## W3 批末

全量 verify；EVD-4010/4011/4012 三目录齐 → **M1 出口条件正式闭环**（roadmap.md:28）。
