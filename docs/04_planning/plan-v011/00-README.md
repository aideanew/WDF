---
id: PLAN-V011-00
title: plan-v011 · 多版本终局规划总导航（v1.0 合口 → v1.1 数据解锁 → v1.1 模块 → v1.2 运营）
status: active
module: planning
owner: hark
created: 2026-10-29
review: 2026-11-12
related: [PLAN-V010-00, PLAN-V011-01, PLAN-V011-02]
---

# 00 · plan-v011 总导航

> **本目录自 2026-10-29 起是本项目唯一现行执行规划。**
> `plan-v001`~`plan-v003` 历史只读；`plan-v004` 废止；`plan-v005`~`plan-v008` 冻结归档；
> `plan-v009` 已 superseded；`plan-v010` 的 20 张卡已全部落账（`9da93b7`）→ **本版继承其结论，接续未完成部分**。

## 本版要回答的问题（四代递进）

| 版次 | 命题 |
|---|---|
| plan-v008 | 「**你测的是几点**」—— 对活的树做静态裁决必然得到过期货 |
| plan-v009 | 「**这道闸门到底检了什么**」—— `verify` 里曾经没有类型检查 |
| plan-v010 | 「**哪些功能其实不存在**」—— 全绿的门禁下面，有多少是真代码 |
| **plan-v011** | 「**哪一个版本才算"完成"，以及它凭什么叫完成**」—— v1.0 已被宣告收官，但它自己定的五环里有一环从来没有界面 |

## 一句话结论（证据全部落在 `02-fact-baseline.md`）

**v1.0 的收官口径（R-6：捞→包→做→扩→卖）与代码事实不符：`扩`（raft）没有客户端界面、没有入口、
数据只有 1 行地块。** 其余四环（捞/包/做/卖）确实有真实行为与测试。
所以本版把工作切成**四个版本阶段**，每一阶段有独立的出口条件与目录，不许跨阶段宣称完成：

| 阶段 | 目录 | 一句话 | 卡片 | 可否现在开工 |
|---|---|---|---|---|
| **A · v1.0 合口** | [`stage-a-v10-close/`](stage-a-v10-close/00-stage.md) | 把「扩筏」从纯函数补成可演示行为，让 R-6 五环成立 | PD7-01~05（5 张） | ✅ 除 PD7-01 的一处裁决外均可 |
| **B · v1.1 数据解锁** | [`stage-b-v11-data/`](stage-b-v11-data/00-stage.md) | 31 张空表 + 5 项同值字段的处置，**先数据后代码** | PD7-06~09（4 张） | ✅ 可开工（数据来源需用户给源，不得自编） |
| **C · v1.1 模块** | [`stage-c-v11-modules/`](stage-c-v11-modules/00-stage.md) | 13 个 v1.1 模块按依赖分 7 批实现 | PD7-10~16（7 张） | ❌ 依赖 B 阶段对应表 |
| **D · v1.2 运营** | [`stage-d-v12-registry/`](stage-d-v12-registry/00-stage.md) | 提审门禁收口 + 二版只登记不建目录 | PD7-17（1 张） | ❌ 依赖外部资质（D-51 BLOCKED-HUMAN） |

## 目录

| 文件 | 内容（对应输出格式节号） | 什么时候读 |
|---|---|---|
| `00-README.md` | 本文件：命题、阶段表、目录、进度 | 每次接手先读 |
| [`01-snapshot.md`](01-snapshot.md) | §1 规划快照（YAML + 可复现字段） | 怀疑基线漂移时 |
| [`02-fact-baseline.md`](02-fact-baseline.md) | §2 事实基线（逐条命令原文 + 文档/代码不一致 I-01~I-12） | 任何结论被质疑时 |
| [`03-requirement-baseline.md`](03-requirement-baseline.md) | §3 需求复核（MUST/SHOULD/COULD/MUST NOT + 冲突 + 未知 + 隐含） | 排期前 |
| [`04-contract-freeze.md`](04-contract-freeze.md) | §4 六份契约冻结包 + 自检结论 | 动契约/接口前 |
| [`05-data-model-baseline.md`](05-data-model-baseline.md) | §5 数据模型基线 + 迁移版本号编排 | 动表/存档前 |
| [`06-slices.md`](06-slices.md) | §6 垂直切片清单（排序 + 理由） | 派工前 |
| [`07-dag-ownership.md`](07-dag-ownership.md) | §8 依赖 DAG + §9 所有权矩阵（含重叠处置） | 并行前 |
| [`08-budget.md`](08-budget.md) | §10 档位分配与成本预算 + 熔断规则 | 下发前 |
| [`09-baseline-metrics.md`](09-baseline-metrics.md) | §11 基线指标（含首次测量值 / 明确标注"尚无基线"） | 想排优化任务前 |
| [`10-risks-pending.md`](10-risks-pending.md) | §12 风险 / 未决 / 待裁决（D-54~D-56，需用户拍板） | 需要拍板时 |
| [`11-selfcheck.md`](11-selfcheck.md) | §13 落盘清单 + §14 自检结果 + §15 局限 + §16 第一刀 | 验收本规划时 |

## 实施进度（唯一进度权威）

> 任何人不得在本表之外宣称"某阶段已完成"。

| 阶段 | 卡片 | 状态 | 备注 |
|---|---|---|---|
| A v1.0 合口 | PD7-01~05 | **PD7-01 已解除阻塞（TODO，可开工）**，其余 TODO | D-54 已裁（Q1=B/Q2=A，2026-10-29），A 段**无前置裁决** |
| B v1.1 数据 | PD7-06~09 | 全部 TODO | 每张卡的第一动作是"要来源"，不是"填数字" |
| C v1.1 模块 | PD7-10~16 | 全部 TODO（**已解除 D-56 挂起**） | 依赖 B 阶段对应卡；硬条件=不动 `hook` 三参数 |
| D v1.2 运营 | PD7-17 | TODO（外部阻塞） | 解除条件沿用 D-51 |

> **三条裁决的落账（2026-10-29）**：D-54 / D-55 / D-56 均 `DECIDED`（`decided_by=user`），
> 后果清单见 [`10-risks-pending.md §1.4`](10-risks-pending.md)（12 条 C-xx，逐条挂到卡）。
> 唯一仍由用户侧完成的动作：token 吊销 + 凭据就位（`10 §D-55`）——**完成前不推送**。

## 与用户既有约定的一致性（逐条对照本版执行方式）

| 约定 | 本版怎么落 |
|---|---|
| 核心 + 高难度自己做（尤其 UI） | PD7-03（raft 建造面板）、PD7-04（拒绝态 UX）标记 `owner: 主控`，不派外部 Agent；其余派执行助手（见 `08-budget.md §1`） |
| 按阶段体检，拒绝全量回归 | 每卡只跑 `npm run impact <kw>` 圈定的测试；全量 `npm run verify` 只在阶段出口跑一次（`04 §5` / `08 §4`） |
| 不自编数值 | B 阶段每张卡的执行第一步是"提交来源清单"，无来源即 `BLOCKED`，不许填占位数（`stage-b §2`） |
| 禁止新建分支 | 全程在 `main`（upstream `origin/master`）上提交；卡片 `auto_push_task_branch: false` 已由 `config.json` 固定 |
| 只读业务代码、只写规划产物 | 本目录 16 份 md + `.product-development/tasks/PD7-*.md` + `task-index.json` 登记；**零业务代码改动**（`11-selfcheck.md §13`） |

## 本版相对 plan-v010 的三处订正

| # | plan-v010 的说法 | 实测事实 | 本版处置 |
|---|---|---|---|
| C-1 | 「v1.0 五环已闭环」 | `client/assets/scripts/features/raft/` 三文件共 18 行；`MainView.ts:27-34` 六 Tab 无筏体；`panel-types.ts:13` 注释仍写"4 个主 Tab" | 新增 A 阶段 5 张卡，把"扩"补成可演示行为 |
| C-2 | 「`items.capacity` 全 0 使扩筏必然失败」 | 今日实测 `capacity` 已非全 0：103 行为 `0`，3 行为 `20/40/60`（全部是 `chest` 类）；`raft_tiles` 已有 1 行 `capacity=50` | 事实已部分变化 → 该结论降级为"口径可疑"而非"必然失败" → **已由 D-54 裁决：浮力只看 `raft_tiles.capacity`，`items.capacity` 一律归 0** |
| C-3 | 「v1.0 半程、剩余从零建 15 个模块」 | 13 个模块已由 D-50 正式登记为 v1.1，`raft`/`sea` 不在 D-50 清单内（D-50.detail.modules_v11 逐字可查） | 本版明确：raft/sea 属 v1.0 欠账（A 阶段），13 模块属 v1.1（B+C 阶段） |
