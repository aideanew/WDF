---
id: PLAN-V010-00
title: plan-v010 · 空壳显性化与 v1.0 核心闭环补齐（导航与结论）
status: active
module: planning
owner: hark
created: 2026-10-28
review: 2026-11-11
related: [PLAN-V009-00, PLAN-V008-00, PLAN-V003-09]
---

# 00 · plan-v010 总导航

> **本目录自 2026-10-28 08:56 起是本项目唯一现行执行规划。**
> `plan-v001`~`plan-v003` 历史只读；`plan-v004` 废止；`plan-v005`~`plan-v008` 冻结归档；
> **`plan-v009` 置 `superseded`**（其 8 张卡已全部 done 并推送，其结论被本版继承）。

## 本版要回答的问题（三代递进）

| 版次 | 命题 |
|---|---|
| plan-v008 | 「**你测的是几点**」—— 对活的树做静态裁决必然得到过期货 |
| plan-v009 | 「**这道闸门到底检了什么**」—— `verify` 里曾经没有类型检查 |
| **plan-v010** | 「**哪些功能其实不存在**」—— 全绿的门禁下面，有多少是真代码 |

## 一句话结论（证据在 01/02）

**本仓库的代码只有「一刀深」。** 已经真实实现并测试覆盖的，恰好是 M1 那条可演示闭环
（打捞 → 背包 → 合成 → 商人 → 箱子 → 榜单 → 云存档）；闭环之外的模块**目录、类、装饰器俱全，
里面只有一行 `export const MODULE_ID = 'xxx'`**。

据此，v1.0 的剩余工作量**不是"补功能"，而是"从零建 15 个模块"**。
任何声称"v1.0 已完成 X%"的口径，都必须先说明 X 是按目录数算还是按行为算。

## 硬事实摘要（全部可复现，见 `01-fact-baseline.md`）

| # | 事实 | 数字 | 复现命令 |
|---|---|---|---|
| F1 | 客户端 feature **有真实实现 / 纯占位** | **8 / 15**（占位恰好每个 18 行） | `02-requirement-inventory.md §2` |
| F2 | 客户端基础服务空壳 | **5 个**（audio/pool/time/bus/log，各 2 行、**零引用**） | `grep -rn "services/" client/assets/scripts` |
| F3 | 服务端空模块 | **5 个**（ads/event/salvage/social/ops，各 6 行 = 3 文件 × 2 行） | `wc -l server/src/modules/*/*.ts` |
| F4 | game-core 空模块 | **8 个**（crew/defense/event/fishing/island/power/progression/salvage，各 3 行） | `wc -l packages/game-core/src/*/index.ts` |
| F5 | 服务端动作 | **22 个登记 / 14 实现 / 8 todo** | `server/src/gateway/handlers.ts` |
| F6 | 数值表 | **46 表 / 11 有数 / 35 全空** | `wc -l game-data/source/*.csv` |
| F7 | 已填字段其实是占位值 | `items.weight` **全表唯一值 `1`**、`items.capacity` **全表唯一值 `0`** | `07-decisions-pending.md §D-43` |
| F8 | `GameApp.start()` 调用点 | **0**（唯一提及是自身与一句注释） | `grep -rn "GameApp" client/assets/scripts` |
| F9 | `compliance.check` | `verified = playerExists()`，`minor` 恒 `false` | `server/src/modules/compliance/service.ts:13` |
| F10 | 客户端登录 | `code:'mock-code'` + `plat:'wechat'` 双硬编码 | `BootController.ts:52` |

## 目录

| 文件 | 内容 | 什么时候读 |
|---|---|---|
| `00-README.md` | 本文件：命题、结论、目录、进度 | 每次接手先读 |
| `01-fact-baseline.md` | 实测基线（快照 YAML + 逐条命令原文 + 文档/代码不一致清单） | 怀疑任何结论时 |
| `02-requirement-inventory.md` | **未被实现需求总账**（模块 × 五层矩阵 + 阻塞分级） | 排期前必读 |
| `03-self-negation.md` | 自我否定清单（含我上一轮"改措辞不改事实"的半修） | 想下结论前 |
| `04-data-contract-gaps.md` | 契约/数据模型缺口（含 `3101` 自造码、迁移编排） | 动契约/表前 |
| `05-slices-and-cards.md` | 垂直切片 S0~S5 + 原子任务卡 TASK-7001~7031 | 派工时 |
| `06-dag-ownership-budget.md` | 依赖 DAG、所有权矩阵、档位与成本预算 | 并行前 |
| `07-decisions-pending.md` | 待裁决 D-42~D-47（BLOCKING / NON_BLOCKING） | 需用户拍板时 |
| `08-execution-protocol.md` | 阶段体检协议 + 完成定义 + 禁止事项 | 每张卡开工前 |

## 实施进度

| 切片 | 卡片 | 状态 |
|---|---|---|
| S0 让代码说实话 | 7001~7005 | 未开始 |
| S1 登录与合规真接线 | 7010~7013 | 未开始（7011 阻塞） |
| S2 广告闭环 | 7020~7021 | 未开始（需 ADR-0014） |
| S3 数值解锁 | 7030~7031 | 未开始（**BLOCKING，需 D-42/D-43**） |
| S4 UI 骨架 | 7040~7042 | 未开始 |
| S5 体检协议 | 7050 | 未开始 |

> 本表是唯一进度权威。任何人不得在表外宣称"已完成"。

## 与用户既有约定的一致性

- **核心 + 高难度（尤其 UI）由主控自己做**：S4 全部、S1-7013、S0-7001 由主控执行；
  S0-7002/7005、S2、S3 派外部 Agent（见 `06-dag-ownership-budget.md §3`）。
- **按阶段体检，不全量回归**：每张卡只跑 `npm run impact <kw>` 圈出的测试文件；
  全量 `npm run verify` 只在 S5 与发版前各跑一次（见 `08-execution-protocol.md`）。
- **不自编数值**：S3 的每一项都必须先有 D-4x 裁决或设计源条文，否则不做（见 `07-decisions-pending.md`）。
