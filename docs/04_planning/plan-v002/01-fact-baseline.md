---
id: PLAN-V002-01
title: 事实基线（真实代码证据 + 未实现需求矩阵 + 文档/代码不一致）
status: active
owner: hark
created: 2026-10-26
---

# 01 事实基线

> 纪律：**文档不是实现**。以下全部来自真实代码（文件+行号级证据）。凡"文档说有、代码没有"逐条列出，以代码为准。

## 1. 服务端：20 动作实现矩阵（最硬证据）

来源：`server/src/gateway/handlers.ts:29-50`（`satisfies Record<ActionName, Handler>`）。

| # | 动作 | 状态 | 证据 |
|---:|---|---|---|
| 1 | `account.login` | ✅ 实现 | handlers.ts:30 |
| 2 | `account.refresh` | ✅ 实现 | handlers.ts:31 |
| 3 | `account.bindStart` | ❌ todo | handlers.ts:32 |
| 4 | `account.bindConfirm` | ❌ todo | handlers.ts:33 |
| 5 | `compliance.check` | ✅ 实现 | handlers.ts:34 |
| 6 | `save.pull` | ✅ 实现 | handlers.ts:35 |
| 7 | `save.push` | ✅ 实现 | handlers.ts:36 |
| 8 | `save.resolveFork` | ❌ todo | handlers.ts:37 |
| 9 | `salvage.claimInfo` | ❌ todo | handlers.ts:38 |
| 10 | `economy.buyQuota` | ❌ todo | handlers.ts:39 |
| 11 | `leaderboard.report` | ❌ todo | handlers.ts:40 |
| 12 | `leaderboard.query` | ❌ todo | handlers.ts:41 |
| 13 | `event.start` | ❌ todo | handlers.ts:42 |
| 14 | `event.submit` | ❌ todo | handlers.ts:43 |
| 15 | `event.result` | ❌ todo | handlers.ts:44 |
| 16 | `social.send` | ❌ todo | handlers.ts:45 |
| 17 | `social.pull` | ❌ todo | handlers.ts:46 |
| 18 | `ads.claim` | ❌ todo | handlers.ts:47 |
| 19 | `telemetry.track` | ❌ todo | handlers.ts:48 |
| 20 | `config.manifest` | ✅ 实现 | handlers.ts:49 |

**统计：6 实现 / 14 todo。** 13 个模块目录中仅 4 个被网关导入（account/compliance/config/save）；9 个未接（ads/chest/economy/event/leaderboard/ops/salvage/social/telemetry），其中 chest/ops 连动作都未登记。

## 2. game-core：19 模块（8 逻辑 / 1 生成 / 10 占位）

来源：`packages/game-core/src/*/index.ts` 全文行数 + `grep "规则待按"`。

| 有实质逻辑（8） | 生成类型（1） | 仅 `MODULE_ID` 占位（10） |
|---|---|---|
| `chest`（LOCK_HITS/isHit/expectedAttempts）<br>`common`（rng/result/time）<br>`defense`（distanceField BFS）<br>`economy`（recyclePrice/sellPrice）<br>`leaderboard`（exceedsHourlyCap）<br>`raft`（remainingBuoyancy/checkChange）<br>`save`（schema/checksum/migrate）<br>`sea`（tideState/常量） | `generated`（config-types.ts，仅类型） | `crafting` `crew` `event` `fishing` `hook` `inventory` `island` `power` `progression` `salvage` |

> **关键**：`hook`（C1 核心玩法）是空占位（`hook/index.ts` 仅 3 行 `MODULE_ID`）。

## 3. 客户端：features 23/23 空壳，platform 部分实现

来源：`client/assets/scripts/features/*/model|view/*.ts`、`client/assets/scripts/platform/**`。

- **features**：23 模块，model 统一 6 行、view 统一 11 行（`lateUpdate` 逻辑被注释），**0 个有业务代码**。
- **platform**：`wechat`/`douyin` 有 login/storage/request/share/lifecycle 真实调用，但**激励广告未实现**（`:11` 固定 `'no-fill'` + TODO）；`app` 纯类型占位；`web` 为调试实现。
- **services**：仅 `net/RpcClient.ts`(145) 与 `save/LocalSave.ts`(62) 有实质；其余 6 个 2 行占位。

## 4. 数值表：13 张仍 0 行（→ 对应切片仍 BLOCKING）

来源：`game-data/source/*.csv` 实测行数。

| 空表（0 行） | 阻塞的 N-* | 影响切片 |
|---|---|---|
| `raft_tiles` | N-3 浮力/重量 | S3 |
| `levels` | N-4 经验曲线 | S4 |
| `units` `defenses` `waves` | N-5/N-8 塔防数值 | S11 |
| `islands` `zones` `spawns` | N-7 岛屿/海域 | S12 |
| `merchants` `limits` | N-10 商人浮动/配额 | S6 |
| `blueprints` `quality` | 品质/图纸门槛 | S4 |
| `hooks` `lines` | 绳承重/钩参数 | S2(数值) |
| `drops` | 箱子内容 | S7 |
| `jobs` | 员工岗位（records.job 依赖） | S4/S6 |

> `items.weight/capacity/stack/unlock_level` 仍 0/106 填充（见 `game-data/UNKNOWN-TABLES.md`）。

## 5. 测试与守卫

- **测试 20 个**：`determinism/game-core.test.mjs`(7) + `contract/contract.test.mjs`(3) + `integration/auth.test.mjs`(8) + `integration/payload.test.mjs`(2)。**e2e 目录 0 用例**。
- **守卫 9 项**：根白名单/game-core纯度/客户端依赖/服务端依赖/模块清单/Bundle规则/生成物同步/front matter/无空目录。
- 集成测试直调 `handleRpc` + PGlite `:memory:`，不走 HTTP。

## 6. 数据库

- 仅 `0001_init.sql`（95 行），**13 张表**：player/identity/bind_ticket/save_snapshot/save_fork/idempotency/ledger_entry/daily_quota/income_daily/leaderboard_snapshot/event_session/config_release/audit_log。
- **无 CREATE INDEX / 无 regions 表 / 无 0002_*.sql**（`account/repo.ts:46` 有 TODO 等 `0002_regions.sql`）。

## 7. 契约层

- `packages/contracts/src`：20 动作、14 错误码、12 业务域 + common。
- `chest` 仅有 `MODULE_ID`（无业务类型）；**无 `ops` 契约目录**。

## 8. 文档 ↔ 代码不一致（逐条，以代码为准）

| 文档位置 | 文档说法 | 代码实际 | 判定 |
|---|---|---|---|
| `current-plan.md:26` | 5 实现 / 15 todo | **6 / 14** | 文档滞后 |
| `06_validation/structure-verification.md:87` | 5 真实 / 15 todo | 同上 | 文档滞后 |
| `current-plan.md:85` | `FORCE_OFFLINE=true` | **false** | 文档滞后 |
| `current-plan.md:28` | 46 表 0 行 | **300 行** | 文档滞后 |
| `current-plan.md:80` | 17 个测试 | **20** | 文档滞后 |
| `TASK-0104/0107/1601` 正文 | `save.resolveFork/account.refresh` 仍 todo | `account.refresh` 已实现 | 任务卡滞后 |
| `docs/05_execution/tasks/` | 声称 20 张卡 | 实际 **19 个** `TASK-*.md` | 计数不符 |

## 9. 无法确认项（不臆断）

- v5.5 各规则函数与 `game-core` 8 个逻辑模块的**逐条覆盖率**：未核对，标"部分确认"。
- 缺失的第 20 张任务卡编号：无法确认。
- 微信真机包体/帧率：无真机证据，标"未验证"。
