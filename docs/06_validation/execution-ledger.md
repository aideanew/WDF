---
id: EVD-LEDGER
title: 执行台账（提交 ↔ 任务卡 ↔ 证据 全链对照）
status: active
module: validation
owner: hark
created: 2026-10-27
review: 2026-11-27
related: [EVD-4002, EVD-4012, PLAN-V003-00, PLAN-V010-00, EXEC-BRIEF-0003]
---

# EVD-LEDGER · 执行台账

> **为什么有这份文件**：卡完成时证据分散在 6 个地方（git 提交、EVD 目录、测试文件、日志、裁决文档、对话上报）。本文件是**唯一索引**，用来回答"这一步做了什么、凭什么算完成、证据在哪"。
> **更新纪律**：每完成一批卡追加一节；数字必须可复跑，不写"大概/应该"。

## 1. 证据来源分类（找证据先看这里）

| 类型 | 位置 | 内容 | 可信度 |
|---|---|---|---|
| 代码变更 | `git log`（10-26 起 64 个提交） | 每个提交带卡号/缺陷号 | 最高（不可篡改） |
| 自动化验收 | `tests/**/*.test.mjs`（127 例） | 契约/确定性/集成/e2e | 高（可复跑） |
| 门禁 | `npm run guard` / `npm run verify` | 9 项守卫 + gen/test/typecheck | 高（可复跑） |
| 卡级证据 | `docs/06_validation/evidence/EVD-*/` | 实测记录、截图、measure.json | 中（人工产出） |
| 工作日志 | `.workbuddy/memory/YYYY-MM-DD.md`（832 行） | 逐时段决策与实测发现 | 中（含自我纠错） |
| 裁决 | `plan-v003/decision-sheet.md`（D-01~D-18） | 数值/口径唯一来源 | 高（用户授权） |
| 架构决策 | `docs/03_solution/decisions/ADR-0011/0012/0013` | 契约缺口、影子账本、schema 版本 | 高 |

## 2. v1.0 冲刺卡状态（plan-v003 的 16 卡）

| 卡 | 内容 | 状态 | 提交 | 证据 |
|---|---|---|---|---|
| 4002 | 数值转录（六表清欠 46 行） | ✅ PASS | `c0c3c35` | `EVD-4002/`、`tools/gen/transcribe.mjs`、configVersion `38fc1faf` |
| 4003 | HookView 接 hooks 表（缺行回落） | ✅ PASS | `d84851c` | 代码走查（回落分支 + warn） |
| 4004 | 新手引导 5 步浮层 | ✅ PASS | `10126af` | `features/guide/**`、`modules.guide.done` |
| 4005 | ADR-0012 影子账本成文 | ✅ PASS | `8dc787f` | `ADR-0012-authoritative-inventory.md` |
| 4006 | economy.sell（影子校验/限购/幂等） | ✅ PASS | `23ee575`+`9d22859` | `tests/integration/economy-sell.test.mjs` 5 例、`tests/determinism/economy.test.mjs` 8 例 |
| 4007 | 商人页 UI | ✅ PASS | `470436e` | `features/economy/{model,view}`、`tests/determinism/merchant-flow.test.mjs` 8 例 |
| 4008 | 背包回收入口 + 确认弹窗 | ✅ PASS | `f3fa3e0` | `InventoryPanel.ts:96-134`、`panel-ui.addConfirmDialog` |
| 4009 | 开锁交互 + salvage.claimInfo | ❌ 未完成 | — | `handlers.ts:48` 仍为 `todo` |
| 4010 | 四面板真机录屏 | ⏸ BLOCKED | — | 缺真机环境 |
| 4011 | 首钩命中率采样 | ⏸ BLOCKED | — | 缺真机用户 |
| 4012 | 包体基线 2.913MB/4MB | ✅ PASS | `8908704` | `EVD-4012/baseline.md`、`measure.json` |
| 4013 | 合规材料清单 | ⚠ 部分 | `8a13b0f` | `docs/07_release/compliance/` 5 份（虚假陈述已删、未接入已登记） |
| 4014 | 瘦身 | ⊘ 关闭 | — | 4012 实测 ≤4MB，条件不成立（`3c1add1` 裁定） |
| 4015 | 契约解冻（2004） | ✅ PASS | `f3fa3e0` | `errors.ts:19 BIND_TICKET_INVALID: 2004`、`error-catalog.md` |
| 4016 | 四文档对齐 | ❌ 未完成 | — | `current-plan.md` 仍指向 plan-v001/v002 口径 |

**统计：9 PASS / 1 部分 / 2 BLOCKED / 2 未完成 / 1 关闭。**

## 3. 关键时间线（按日，完整链见 `git log --since="2026-10-26"`）

| 时间 | 事件 | 提交 |
|---|---|---|
| 10-26 12:42–17:55 | 契约补缺、确定性出钩、账号合并、榜单、埋点、BootController 修复、ASSISTANT-BRIEF v2、TASK-3101 主界面 | `1448b88`…`ee9f5a8` |
| 10-27 07:47 | M1 收官 C-01~C-10（含 P0 读表崩溃修复） | `13e6b68` |
| 10-27 10:06–10:30 | plan-v003 规划 11 文件 + 派工包 + 外部审计 14 处修复 | `a37176e` `4179dcb` `f3fdbf2` |
| 10-27 11:07–11:51 | 推送职责移交、单助手模式、4002~4006 落地（含主控接手补完 4006） | `0b8f9b4`…`9d22859` |
| 10-27 13:44 | 4012 包体基线 PASS、4014 关闭 | `8908704` `3c1add1` |
| 10-27 14:09–14:37 | plan-v004 并入、D-15~D-18 裁决、CRLF 守卫修复、4007 商人页（主控亲自实现） | `565d108`…`470436e` |
| 10-27 15:46–16:11 | 另一路完成 4008/4015 + plan-v005/v006/v007 | `f3fa3e0` `7cb62c0` `8f986b2` |
| 10-27 17:34–21:15 | plan-v008/v009：开箱服务端权威化、设计源校正、类型检查入 verify、限流与 cfg 提示、ADR-0013 | `c6fcd33`…`ea6ad20` |
| 10-28 09:07–10:10 | plan-v010：空壳显性化、`npm run shells`、D-42/D-43 裁决、7002/7004/7005 卡 | `19120fb`…`05d59ac` |

## 4. 门禁快照（每个数字都可复跑）

| 时点 | guard | tests | tsc 项目错误 | 备注 |
|---|---|---|---|---|
| 10-27 07:47（M1 收官） | 9/9 | 107/107 | 0 | 修 7 个类型错误后 |
| 10-27 11:51（4006 完成后） | 9/9 | 119/119 | 0 | 新增 economy 8+5 例 |
| 10-27 14:37（4007 完成后） | 9/9 | 127/127 | 0 | 新增 merchant 8 例 |
| 复跑命令 | `npm run guard` | `npm test` | `npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 \| grep -v "^C:/"` | — |

## 5. 已知记录缺口（诚实登记，不粉饰）

1. ~~4003/4004/4006/4007 没有独立 EVD 文件~~ → **已补齐（2026-10-28，commit 见 git log）**：新增 `EVD-4003/4004/4006/4007/README.md`，各含目标、交付、VERIFY 复跑数字与 G-07 局限登记。剩余真实缺口：**TASK-4004 缺独立单测**（`GuideModel` 可自动化三例未写，已登记在 EVD-4004 §5）。
2. **助手每卡的上报报文只存在于对话中**（STATUS/DIFF/VERIFY 模板），未落盘。可追溯靠 git 提交 + 测试复跑，但"谁在什么时间报了什么"没有独立档案。
3. **口径冲突已纠正一次**：主控 10-28 曾误判"4008 未做"，实际 `f3fa3e0`（10-27 15:46）已完成；本台账第 2 节为核实后的准确状态。
4. **plan 谱系多版本并存**（v003~v010），只有 `plan-v010` 是现行（`docs/04_planning/current-plan.md` 尚未对齐，属 4016 未完成项）。
