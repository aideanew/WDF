---
id: PLAN-V003-08
title: W4 合规包体 + 契约解冻（TASK-4013~4016）
status: active
module: planning
owner: hark
created: 2026-10-27
related: [ADR-0011, PLAN-V003-02]
---

# 08 · W4 · S15 合规包体 + S16 契约解冻

> S16 是**高成本动作**：解冻一次 = change-playbook 联动 contracts 测试 + error-catalog + 客户端生成副本 + UX 映射。故集中一次执行（03 §3.2 排序原则 2）。

## TASK-4013 合规材料清单（助手 C，haiku）

**目标**：v1.0 出口第 4 件"软著/备案就绪"变成可勾清单落盘。
**步骤**：1) 盘点 `docs/07_release/` 现状；2) 产出 `release-checklist.md`：软著申请材料 / 版号与备案 / 隐私政策与合规（compliance.check 已有 minor 时段逻辑，引用 DESIGN-0001）/ 广告概率公示（对接 D-06 广告位裁决）；3) 每项标注 责任方（用户/法务/工程）与当前状态。
**验收**：清单覆盖 roadmap.md:29 出口条件的全部文档项；无"工程可代办却标用户"的错标。
**验证命令**：`ls docs/07_release/release-checklist.md && grep -c "责任方" docs/07_release/release-checklist.md`。
**允许**：docs/07_release/**；**禁止**：代码、contracts。
**规模**：小（0.2d）。

## TASK-4014 包体瘦身（助手 A，sonnect，条件开工）

**目标**：仅当 4012 实测 >4MB 时开工；目标主包 ≤4MB。
**步骤**：1) 按 4012 的 top10 清单逐项处理：首屏不需要的 ts/资源移 `b-*` bundle（ADR-0006 规则：bundle 内不得放脚本，则改走 resources 异步）；2) 每移一项跑 4012 脚本记录差值；3) 达标即停（**不过度优化**）。
**验收**：a) measure-bundle ≤4MB；b) 每次变更前后数字成对记录；c) 全量 verify 绿（防动态化破坏启动链）。
**验证命令**：`node tools/measure-bundle.mjs && npm run verify`。
**允许**：client/assets/resources 迁移、构建配置（经主控确认）；**禁止**：删功能代码"减重"。
**规模**：中（0.5–1d）。**阻塞**：4012 ≤4MB → 直接关闭本卡。

## TASK-4015 契约解冻执行（核心，opus，需用户授权）

**目标**：执行用户对 D-11/D-12 的裁决结果；D-13/D-14 仅登记不解冻。
**步骤**（以 D-12=选A 为例）：1) `errors.ts` 增 `BIND_TICKET_INVALID=2004`（15 码）；2) `save/service.ts` 绑定票据失败改返回 2004；3) `ux.ts` UX_BY_ERROR_NAME 增映射（`noPermission/retryable:false/next:'login'`）——`satisfies` 会强制补齐；4) error-catalog.md 登记；5) `npm run sync`（生成副本）+ 契约测试 + save 集成测试同步。
**验收**：a) 契约测试含 2004 新用例；b) guard 9/9 + 全量 verify 绿；c) error-catalog 与 ERR 键一一对应（既有守卫）；d) ADR-0011 对应缺口状态改 `accepted` 并链接实现提交。
**验证命令**：`npm run gen && npm run sync && npm run verify`。
**允许**：contracts/**、server/save、docs/03_solution/data/error-catalog.md、ADR-0011 状态；**禁止**：未列入裁决的任何码/动作。
**规模**：中（0.5d）。**阻塞**：用户未明确授权 → 整卡 BLOCKED（ADR-0011 决议原文）。

## TASK-4016 四文档对齐收官（助手 C，haiku）

**目标**：规划体系回到"唯一现在做什么"单源状态。
**步骤**：1) `current-plan.md`：M1 段归档、新增"现在做什么 = plan-v003 v1.0 冲刺"；2) `roadmap.md`：M1 标完成、v1.0 行链接 plan-v003；3) `task-index.md` 登记 TASK-4xxx 16 卡；4) `glossary.md` 补新术语（权威背包/影子账本/裁决清单）。
**验收**：a) `grep -n "M1 可玩闭环" docs/04_planning/current-plan.md` 状态为完成；b) document-index.md 收录 plan-v003 全部文件；c) guard 文档检查绿。
**验证命令**：`npm run guard && grep -c "TASK-40" docs/05_execution/task-index.md`。
**允许**：docs/04_planning/**、docs/00_governance/glossary.md、docs/05_execution/task-index.md；**禁止**：tasks/TASK-4xxx 之外的历史卡内容改写。
**规模**：小（0.2d）。

## W4 批末 = v1.0 冲刺出口

`npm run verify` 全绿 + 4010/4011/4012 三证据齐 + 契约解冻（若授权）完成 → v1.0 进入"真机 6 态 + 包体 + 备案"最终确认（roadmap.md:29，由用户签收）。
