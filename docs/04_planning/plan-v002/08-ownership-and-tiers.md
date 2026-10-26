---
id: PLAN-V002-08
title: 所有权矩阵与档位分配（含重叠缺陷处理）
status: active
owner: hark
created: 2026-10-26
---

# 08 所有权与档位

## 8.1 所有权矩阵（Agent × 路径）

| Agent | 可写路径 | 本轮 AT | 备注 |
|---|---|---|---|
| **Agent-Contract** | `packages/contracts/src/**`、`docs/03_solution/data/api-catalog.md` | AT-2001 | 唯一改契约者 |
| **Agent-Core** | `packages/game-core/src/{hook,chest}/**`、`tests/determinism/**` | AT-2101、AT-2301 | 不得 import `cc`/IO |
| **Agent-Client** | `client/assets/scripts/features/hook/**`、`tests/integration/hook-save.test.mjs` | AT-2102、AT-2103 | 不得改 generated |
| **Agent-Server** | `server/src/modules/**`、`server/src/gateway/handlers.ts`、`tests/integration/{bind,fork,leaderboard,telemetry}.test.mjs` | AT-2201/2202/2203/2204 | **单所有者，4 个 AT 必须串行** |
| **Agent-Data** | `server/db/migrations/0002/0003`（仅文本）、`game-data/**` | （待裁决后） | 本轮只落 0002/0003 文本 |
| **Agent-Guard** | `tests/**`（非业务）、`tools/**` | AT-2401、AT-2402 | 不改业务 |
| **Agent-Docs** | `docs/04_planning/current-plan.md`、`docs/06_validation/structure-verification.md` | AT-2501 | 只改文档 |

## 8.2 重叠标注（重叠 = 规划缺陷，必须消除）

| 重叠点 | 涉及 AT | 处置 |
|---|---|---|
| `server/src/gateway/handlers.ts` | AT-2201/2202/2203/2204 | **单所有者 Agent-Server + 串行执行**；每次只改自己那一行注册，PR 按 2201→2202→2203→2204 顺序合并 |
| `packages/contracts/src/**` | AT-2001 | 唯一所有者；实现期**冻结**，后续任何 AT 不得改 |
| `tests/integration/**` | AT-2201~2204（新增各自文件） + AT-2401（扩充） | 各 AT 只**新建自己文件**；AT-2401 在最后统一扩充，避免同文件并发 |

**结论**：重叠已通过"单所有者 + 串行 + 各自独立文件"消除，无未处理重叠。

## 8.3 档位分配（按不可逆性 × 影响面，不按步骤号）

| AT | 档位 | 理由 |
|---|---|---|
| AT-2001 | `opus` | 契约语义不可逆 |
| AT-2101 | `opus` | 核心玩法规则，影响全局手感 |
| AT-2102 | `opus` | 表现层决定 C1 闸门成败 |
| AT-2103 | `sonnect` | 接线为主 |
| AT-2201 | `opus` | 身份合并涉数据一致性 |
| AT-2202 | `opus` | 存档冲突，错则丢档 |
| AT-2203 | `sonnect` | CRUD + 风控 |
| AT-2204 | `sonnect` | 埋点为主 |
| AT-2301 | `sonnect` | 状态机 |
| AT-2401 | `opus` | 测试是防自证的闸门 |
| AT-2402 | `sonnect` | e2e 脚手架 |
| AT-2501 | `sonnect` | 文档 |

**券制度**：`opus` 每切片 ≤3 次；`fable` 每切片 ≤1 次（仅"改需求/推翻已冻结契约/全局冲突"）；超需人批。
**熔断**：同一 AT 连续 2 次验收失败 → 停改代码，改重写任务书 / 升档 / 标 blocked。**禁止换提示词硬撞第 3 次。**

## 8.4 成本预算

| 切片 | AT 数 | haiku | sonnect | opus | fable |
|---|---|---|---|---|---|
| S-CONTRACT | 1 | 0 | 0 | 1 | 0 |
| S2a+S2b | 3 | 0 | 1 | 2 | 0 |
| S5'+S9' | 4 | 0 | 2 | 2 | 0 |
| S7' | 1 | 0 | 1 | 0 | 0 |
| S-TEST | 2 | 0 | 1 | 1 | 0 |
| 文档 | 1 | 0 | 1 | 0 | 0 |
| **合计** | **12** | 0 | 6 | 6 | 0 |
