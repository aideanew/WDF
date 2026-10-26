---
id: PLAN-V002-README
title: plan-v002 索引（统一规划体系 · 2026-10-26 重基线）
status: active
owner: hark
created: 2026-10-26
supersedes: plan-v001
---

# plan-v002 · 统一规划体系（索引）

> 本目录是 **2026-10-26 重基线**后的唯一权威执行规划，取代 `plan-v001`（10-23 冻结快照）。
> 覆盖：E-01/E-04/E-05(部分)/E-06/E-07 后的真实状态；聚焦"核心功能 + 测试"；标注全部阻塞与待裁决。

## 阅读顺序（按序读）

| # | 文件 | 内容 | 关键结论 |
|---:|---|---|---|
| 00 | [00-snapshot.md](00-snapshot.md) | 规划快照 + 与 v001 的递进 | 钉在 commit `4e3578d`；6/14 动作、300 行数值 |
| 01 | [01-fact-baseline.md](01-fact-baseline.md) | 事实基线 + 未实现矩阵 + 文档/代码不一致 | 20 动作 6 实现/14 todo；10 张 game-core 占位；23 空壳 |
| 02 | [02-requirements-baseline.md](02-requirements-baseline.md) | MUST/SHOULD/COULD/MUSTNOT + 冲突 + 未知 | 5 个 BLOCKING 待裁决 |
| 03 | [03-contracts-freeze.md](03-contracts-freeze.md) | 六份契约 + 缺口 | 契约**未完全冻结**（chest/错误表/UX） |
| 04 | [04-data-model.md](04-data-model.md) | 13 表 + 迁移编排（0002/0003/0004） | 无索引/无 regions；迁移须串行 |
| 05 | [05-vertical-slices.md](05-vertical-slices.md) | 切片现状 + 本轮重排 | 新增 S2a/S2b/S5'/S9'/S7'/S-CONTRACT/S-TEST |
| 06 | [06-task-index.md](06-task-index.md) | 12 个原子任务（16 字段全） | 本轮 12 AT 可开工 |
| 07 | [07-dag.md](07-dag.md) | 依赖/并行/关键路径/无环 | 关键路径 ≈3 人日 |
| 08 | [08-ownership-and-tiers.md](08-ownership-and-tiers.md) | 所有权 + 档位 + 预算 | 重叠已用串行消除 |
| 09 | [09-metrics-and-acceptance.md](09-metrics-and-acceptance.md) | 基线指标 + 验收 + 防自证 | 20 测试→目标 ≥28 |
| 10 | [10-risks-and-decisions.md](10-risks-and-decisions.md) | 风险 + 未决 + 待裁决 | Q-1~Q-5 需人裁决 |
| 11 | [11-self-check.md](11-self-check.md) | 逐条自检 | 2 项需闭环（契约/第一刀说明） |
| 12 | [12-first-cut.md](12-first-cut.md) | 第一刀 + 启动顺序 | 先补契约→并行核心 |

## 与 plan-v001 的关系
- **不删除** v001（历史冻结快照保留）。
- **以本目录为准**：v001 中"5 实现/15 todo、0 行数值、FORCE_OFFLINE=true、17 测试"已被 01 §8 证伪。

## 本轮"核心 + 测试"目标（一句话）
补契约 → 实现 `game-core/hook`（C1 核心）+ 4 组不依赖数值的 handler + 开锁状态机 → 测试数 20→≥28、e2e 0→1。

## 不做什么（明确排除）
- 数值型 UI（背包重量条/等级进度）：N-1/N-3/N-4 缺数。
- S6/S8/S11/S12/S13：数值/裁决/真机阻塞或 v1.1。
- 任何"优化"任务：无基线（09 §9.3）。
