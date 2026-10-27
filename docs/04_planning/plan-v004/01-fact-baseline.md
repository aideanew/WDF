---
id: PLAN-V004-01
title: 事实基线（2026-10-27，commit 3c1add1）
status: active
module: planning
owner: hark
created: 2026-10-27
related: [PLAN-V004-00]
---

# 01 · 事实基线

> 每条事实都附可复跑证据。文档与代码不一致处逐条列出，**以真实代码为准**。

## 1.1 已确认事实（有证据，可复跑）

| # | 事实 | 证据（命令/文件:行） |
|---|---|---|
| F-01 | M2 前半段（4002~4006，4012）已完成 | `git log --oneline -n 20` 包含对应 feat/chore 提交 |
| F-02 | 门禁全绿：guard 9/9；tests 119/119 | `npm run guard`；`npm test`（2026-10-27 实跑） |
| F-03 | 双端一致：origin/master == master == `3c1add1` | `git log` |
| F-04 | 权威背包与回收动作已实现 | `server/src/gateway/handlers.ts` economy.sell 已实现，集成测试 `sell-1~5` 绿 |
| F-05 | 核心缺失 UI：商人面板、背包回收入口、开锁交互 | `client/assets/scripts/features/merchant/view` 等缺失，面板桩依旧存在 |
| F-06 | 契约解冻（2004错误码）未执行 | `packages/contracts/src/common/errors.ts` 无 2004 码 |
| F-07 | 引导浮层（4004）已合入 | `features/guide` 存在且引导测试通过 |
| F-08 | 瘦身任务 4014 已关闭 | 主包体积 2.913MB < 4MB 预算，满足条件 |

## 1.2 文档与代码不一致清单（已核实，以代码为准）

| # | 文档说 | 代码实况 | 处置 |
|---|---|---|---|
| D-01 | plan-v003 指示 S12/S13/S14/S16 已规划完毕并应在波次中完成 | 实际上卡链中断在 4007 之前，后续任务并未被自动 CLI 拾取执行 | 重新规划剩余任务，并在 plan-v004 中分配给具体 Agent 确保落地 |

## 1.3 仅来自文档、未在代码验证的

- 软著/备案材料清单（W4 阶段需求）
- 真机环境依赖（用户提供）

## 1.4 读取失败或无法访问的

- 无。
