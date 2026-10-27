---
id: PLAN-V004-06
title: 任务索引 · 依赖 DAG · 所有权矩阵
status: active
module: planning
owner: hark
created: 2026-10-27
related: [PLAN-V004-05]
---

# 06 · 任务索引与依赖

## 6.1 任务索引（继承自 plan-v003 遗留项）

| 卡 | 名称 | 切片 | Owner | 档位 | 依赖 | 阻塞条件 |
|---|---|---|---|---|---|---|
| 4007 | 商人页 UI + 限购（buyQuota 接真数值） | S17 | Agent-Client | sonnect | 前置 4006 已完成 | 无 |
| 4008 | 背包页回收入口 + 确认弹窗组件 | S17 | Agent-Client | sonnect | 前置 4006 已完成 | 无 |
| 4009 | 开锁交互（chest+locks 接表）+ salvage.claimInfo | S17 | Agent-Client | sonnect | 4007/4008 | 串行规避文件冲突 |
| 4015 | 契约解冻执行（2004 码等） | S18 | Agent-Contract | opus | 无 | 需授权，现已在此计划中授予 |
| 4016 | error-catalog / glossary / current-plan / roadmap 四文档对齐 | S18 | Agent-Docs | haiku | 4015 | 无 |
| 4010 | 四面板真机录屏 + 6 态走查 | S19 | Agent-Test | sonnect | 4009 | 真机环境由人提供，缺则跳过 |
| 4011 | 首钩命中率采样脚本 + 采样记录 | S19 | Agent-Test | sonnect | 无 | 真机环境由人提供，缺则跳过 |
| 4013 | 合规材料清单落 docs/07_release | S19 | Agent-Docs | haiku | 无 | 无 |

## 6.2 依赖 DAG

```text
(起始) ──┬─► 4007 ──┐
        └─► 4008 ──┴─► 4009 ──► (S17 完成)

(起始) ──► 4015 ──► 4016 ──► (S18 完成)

(起始) ──► 4011
(S17完成) ──► 4010
(起始) ──► 4013
```
- **关键路径**：4007/4008 -> 4009 -> 4010。
- **并行判定**：4007 和 4008 动不同的视图组件（merchant/view vs inventory/view），无共享可变状态，可并行。4009 动开锁交互，为稳妥起见排在后。4015 动 contracts，与 UI 不冲突，可并行。

## 6.3 所有权矩阵

| 路径 | Agent-Client | Agent-Contract | Agent-Docs | Agent-Test |
|---|---|---|---|---|
| `client/assets/scripts/features/{merchant,inventory,hook,salvage}/view` | 写 (4007/08/09) | 禁 | 禁 | 读 |
| `packages/contracts/**` | 禁 | 写 (4015) | 禁 | 禁 |
| `server/src/modules/save/service.ts` | 禁 | 写 (4015) | 禁 | 禁 |
| `docs/{04_planning, 00_governance}/**` | 读 | 写 (4015部分) | 写 (4016) | 读 |
| `docs/07_release/**` | 禁 | 禁 | 写 (4013) | 禁 |
| `docs/06_validation/evidence/**` | 禁 | 禁 | 禁 | 写 (4010/11) |
