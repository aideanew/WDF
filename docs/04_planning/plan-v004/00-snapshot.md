---
id: PLAN-V004-00
title: 快照与索引（v1.0 最终冲刺与闭环规划）
status: superseded
module: planning
owner: hark
created: 2026-10-27
related: [PLAN-0001, PLAN-V003-00, MVP-Freeze]
---

# plan-v004 · v1.0 最终冲刺与闭环规划（M2-Phase2）

> **一句话**：v1.0 前半程（数值清欠、权威背包、基础UI）已落地，当前断点在**UI交互实现（商人、回收、开锁）及契约解冻**。
> 本规划重点在于指引**UI设计与实现**（核心Agent亲自执行），并完成剩余的合规、文档同步与真机验证，彻底收官 v1.0。

## 0.1 规划快照

```yaml
snapshot:
  规划日期: 2026-10-27
  git_branch: master
  git_commit: 3c1add1
  工作区: 干净，双端一致（origin/master == master）
  门禁基线: guard 9/9 · tests 119/119
  客户端类型检查: 0 错误
  契约: 6 份冻结（ADR-0011 待 4015 任务解冻）
  数据: configVersion=38fc1faf915f8bbf
```

## 0.2 与前序规划的关系

| 前序 | 状态 | 本规划继承什么 |
|---|---|---|
| plan-v003 | superseded | 已完成 4001~4006 及 4012/4014，剩余 4007~4011 及 4013/4015/4016 移入本轮 |
| decision-sheet | accepted | 数值源依然锁定，无需再次裁决 |

## 0.3 文件索引（每步一个 md）

| 文件 | 内容 | 谁读 |
|---|---|---|
| [01-fact-baseline.md](01-fact-baseline.md) | 事实基线 + 文档/代码差异清单 | 全员 |
| [02-requirements-baseline.md](02-requirements-baseline.md) | v1.0 最终需求复核 + 冲突清单 | 全员 |
| [03-contracts-freeze.md](03-contracts-freeze.md) | 契约冻结包与解冻计划 | 执行者 |
| [04-data-model.md](04-data-model.md) | 数据模型现状与迁移策略 | 执行者 |
| [05-vertical-slices.md](05-vertical-slices.md) | 垂直切片 S17~S19 | 全员 |
| [06-tasks-and-dag.md](06-tasks-and-dag.md) | 任务卡全集、依赖 DAG、所有权矩阵 | 派工 |
| [07-metrics-and-risks.md](07-metrics-and-risks.md) | 档位分配、基线指标与风险清单 | 主控 |
| [11-self-check.md](11-self-check.md) | 本规划自检结果 | 全员 |
