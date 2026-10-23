---
id: PLAN-V001-08
title: 所有权与档位（Agent 分工 / 模型 / 预算 / 熔断）
status: draft
owner: hark
created: 2026-10-23
review: 2026-10-30
---

# 08 所有权与档位

## 8.1 所有权矩阵（按路径）

| Agent | 独占路径 | 只读路径 | 不碰 |
|---|---|---|---|
| **Agent-Contract** | `packages/contracts/**`、`docs/03_solution/data/api-catalog.md` | 全部 | 业务实现、生成物、迁移 |
| **Agent-Core（我本人）** | `packages/game-core/**`、`client/assets/scripts/features/hook/**`、`client/assets/scripts/ui-kit/**` | 全部 | 服务端业务、`packages/contracts` |
| **Agent-Client** | `client/assets/scripts/features/**`（hook 除外）、`client/assets/bundles/**`、`client/assets/scripts/services/**`、`client/assets/scenes/**` | `ui-kit/**`（只引用不改） | `game-core`、`contracts`、服务端 |
| **Agent-Server** | `server/src/modules/**`、`server/src/gateway/**` | `packages/contracts` | 迁移文件、`game-core` |
| **Agent-Data** | `game-data/source/**`、`server/db/migrations/**`（**串行**） | 全部 | `packages/game-core` 代码、服务端业务代码 |
| **Agent-Guard** | `tools/**`、`tests/**`、根 `package.json` 的 `scripts` | 全部 | 一切业务实现、生成物 |

### 重叠检查（必须消除）

| 潜在重叠 | 处置 |
|---|---|
| `ui-kit` 被 Client 与 Core 同时需要 | **归 Core**；Client 只**引用**，不得修改。若 Client 需要新增组件 → 提需求给 Core，不自己改 |
| `features/hook` 归 Core，但 `features/**` 整体归 Client | 明确 `features/hook/**` **从 Client 的路径中排除** |
| `docs/05_execution/tasks/**` | 由**规划者（我）**写，执行 Agent 只读 |
| `game-data/schemas/**` | **生成物**（禁手改）；如果要改表结构，改 `tools/` 里的生成器并向 Guard 提需求 |
| `server/db/migrations/**` | 只有 Data 能写，且**同一编号只能一个 AT 占用**（见 8.3） |

### 跨所有权 = blocked

任何 AT 需要修改自己独占路径之外的业务文件 → **标 `blocked`，提交 ADR**，不得"顺手改一下"。

## 8.2 迁移编号分配（串行，禁止共用）

| 编号 | 文件 | 所有者 AT | 状态 |
|---|---|---|---|
| 0001 | `0001_init.sql` | 已存在，**只读不改** | 已存在（注释过期问题由 AT-1702 记录，不在 SQL 里改） |
| 0002 | `0002_regions.sql` | AT-1401 | 待 U-06 裁决 |
| 0003 | `0003_admin.sql` | AT-1401（若选方案 B） | 待裁决 |
| 0004 | `0004_event_ops.sql` | AT-0801 | 待 D-03 裁决 |
| 0005 | `0005_titles.sql` | AT-1301 | 待 U-01 裁决 |
| 0006 | `0006_chat.sql` | AT-1301（若 U-07 选做） | 待裁决 |

规则：**一个编号同一时刻只有一个 AT 在写**；新需求只能追加到未占用的下一个编号；**已执行的迁移永不修改**。

## 8.3 档位体系与 Trae 模型映射

> 说明：档位是**能力语义**，不是具体型号。Trae 会话里可选的模型以实际列表为准；下表给"档位 → 能力要求 → 对应可选模型族"。

| 档位 | 能力语义 | 用于 | Trae 侧对应 | 每切片上限 |
|---|---|---|---|---|
| **fable** | 最强推理，允许推翻结论 | **只**用于需求终裁、推翻冻结契约 | 会话内最高推理档（如 Claude Opus 4.x 思考模式 / DeepSeek-V4.1 高推理） | **≤1 次/切片** |
| **opus** | 高推理 + 架构判断 | 架构、契约、集成仲裁、安全、**手感规则**、存档同步 | 高推理档（Opus 类 / DeepSeek-V4.1） | **≤3 次/切片** |
| **sonnect** | 标准编码 | 原子任务实现 | 标准编码档（Sonnet 类） | 不限（但受时间约束） |
| **haiku** | 快速低成本 | 格式化、填模板、索引、机械转录 | 快速档（Haiku 类） | 不限 |

**默认档 = opus**（用户指定）。只有明确标注时才降档。

### 逐切片成本预算

| 切片 | opus 次数 | fable 次数 | 主要用在哪 |
|---|---|---|---|
| S0 | 0 | 0 | 纯人工 + haiku 填模板 |
| S1 | 3（上限） | 0 | 鉴权、save 落库、Boot 集成 |
| S2 | 3（上限） | 0 | hook 规则、手感调参、表现层 |
| S3 | 1 | 0 | 背包结构 |
| S4 | 2 | 0 | 合成规则、解锁 |
| S5 | 2 | 0 | 冲突与降级 |
| S6 | 1 | 0 | 经济 |
| S7 | 2 | 0 | 开锁状态机 |
| S8 | 3（上限） | 0 | 种子/复算/结算 |
| S9 | 1 | 0 | 榜单 |
| S10 | 2 | 0 | 真机问题诊断 |
| S11 | 3（上限） | 0 | 塔防与回放 |
| S12 | 1 | 0 | 深海 |
| S13 | 1 | 0 | 社交称号 |
| S14 | 1 | 0 | 管理端 |
| 合计 | **26** | **0** | — |

**fable 预算说明**：全规划 fable 总预算 = 切片数 × 1，但**当前没有任何一项需要推翻冻结契约**，因此 fable 预留 0 次；一旦用户裁决 U-01~U-08 中任一项与 02/03 冲突，才动用。

## 8.4 升级条件（何时升档）

| 情形 | 动作 |
|---|---|
| sonnect 连续 2 次验收失败 | 升 opus，并重写任务卡 |
| opus 连续 2 次验收失败 | 标 `blocked` + 提交 ADR，交用户裁决 |
| 发现契约本身有歧义 | 升 fable 做终裁（消耗该切片唯一 1 次） |
| 跨所有权冲突 | 直接 `blocked` + ADR，不得自行升档绕过 |

## 8.5 熔断规则（硬）

1. **同一 AT 连续 2 次验收失败 → 停止改代码**。
2. 改为三选一：重写任务卡 / 升级档位 / 标 `blocked`。
3. **禁止第 3 次硬撞**。
4. 熔断后必须留证据：两次失败的验证命令输出都存 `EVD-<AT>/`。

## 8.6 防自证循环

| 角色 | 能做什么 | 不能做什么 |
|---|---|---|
| 执行者 | 提交 diff、跑验证命令、贴输出 | **不得**自己写"验收通过"结论 |
| 独立验证者（另一个 Agent 或我） | 只输出 `PASS` / `FAIL` / `UNKNOWN` | 不得顺手改代码 |
| 用户 | 对手感、真机、范围做最终确认 | — |

规则：验收标准在**规划阶段**（本文件与 09）定死，执行阶段不得修改验收阈值。

## 8.7 所有权结论

| 结论 | 状态 |
|---|---|
| 六个 Agent 路径互斥 | **已确认** |
| `features/hook` 的归属已在矩阵中显式排除 | **已确认** |
| 迁移编号串行表已建立 | **已确认** |
| 档位与预算已列（26 次 opus 上限） | **已确认** |
| fable 目前为 0 次（无推翻需求） | **已确认** |
