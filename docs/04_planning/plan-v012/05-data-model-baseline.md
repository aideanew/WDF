---
id: PLAN-V012-05
title: plan-v012 · 数据模型基线（14 张 PG 表 + 迁移编排）
status: active
module: planning
owner: hark
created: 2026-10-30
review: 2026-11-13
related: [PLAN-V012-04, PLAN-V012-06]
---

# 05 · 数据模型基线

> **三套数据模型必须分开看**，混起来是过去返工的主因：
> ① **数值表** `game-data/source/*.csv`（46 张，`npm run gen` 消费）
> ② **PG 表** `server/db/migrations/*.sql`（14 张，服务端权威）
> ③ **本地存档** `packages/game-core/src/save/`（`modules` 是开放 map，不递增版本）

## 1. PG 表（14 张，全部已建，无一张需在本版新增）

`server/db/migrations/0001_init.sql` 建 13 张，`0002_regions.sql` 建 1 张。

| # | 表 | 用途 | 关键约束 | 本版是否触碰 |
|---|---|---|---|---|
| 1 | `player` | 内部玩家 | `region` 有索引（`player_region_idx`） | 否 |
| 2 | `identity` | 平台身份（openid → playerId） | 平台 + openid 唯一 | 否 |
| 3 | `bind_ticket` | 账号绑定一次性票据 | 一次性消费 | 否 |
| 4 | `save_snapshot` | 云存档快照 + 修订号 | `revision` 递增，`c===0` 才算确认 | 否 |
| 5 | `save_fork` | 存档分叉裁决 | — | 否 |
| 6 | `idempotency` | 幂等表 | **只缓存 `c===0`**（纪律） | 否 |
| 7 | `ledger_entry` | **影子账本（ADR-0012）** | **只追加**；卖出校验"卖出 ≤ 累计获得 − 已卖出"，容差 0 | 否 |
| 8 | `daily_quota` | 每日配额（限购） | — | 否 |
| 9 | `income_daily` | 每日收益（榜单数据源） | — | 否 |
| 10 | `leaderboard_snapshot` | 榜单快照 | — | 否 |
| 11 | `event_session` | 赶海场次（种子/装备快照/结算） | — | 否 |
| 12 | `config_release` | 数值版本发布记录 | `configVersion` | 否 |
| 13 | `audit_log` | 审计日志 | — | 否 |
| 14 | `regions` | 区服（D-53） | **部分唯一索引** `regions_current_idx` 保证"至多一行 is_current" | 否 |

**结论**：**本版不改任何一张 PG 表**。所有 13 个模块的数据都在客户端侧（数值表 + 存档），不在 PG 里。
这是它们"零服务端改动"的结构性原因，也是它们能并行实现的前提。

## 2. 迁移编排（★ 并行开发的硬约束）

```
0001_init.sql        已执行 → 冻结，永不修改（AGENTS.md:32）
0002_regions.sql     已执行 → 冻结
0003_*.sql           ★ 未创建（本版唯一可用的下一个版本号）
0004+                不得提前创建（§13.13「不得为未来需要建表」）
```

**规则**：

| 规则 | 原因 |
|---|---|
| 迁移文件**串行**：同一时刻只允许一个卡持有"下一个版本号" | 两个卡同时写 `0003_*` 会撞名 |
| 本版**没有**任何卡持有 `0003` | 本版 18 张卡都不建表（见 §1 结论） |
| 若某卡执行中发现**必须**建表 → 该卡停下来，提交 ADR，不擅自占用 `0003` | `AGENTS.md:32` |
| 已执行的迁移**永不修改** | 同上 |

**这条是"零迁移争用"的证明**：18 张卡都不需要新表 → 并行判定里"不共用同一迁移版本号"这一条**自动满足**（`07 §2`）。

## 3. 数值表（46 张）的分层

| 层 | 张数 | 说明 | 本版动作 |
|---|---|---|---|
| **有数据 + 有真实业务消费方** | 10 | items / prices / recipes / hooks / chests / locks / merchants / ad_placements / guide_steps / fish | 不改 |
| **有数据 + 仅类型注册（无业务逻辑）** | 3 | buildings / facilities / 其余 | PD8-11（raft 房间与设施）会真正消费 `facilities` |
| **有数据 + 零消费方** | 27 | levels / unlocks / jobs / foods / crew_traits / generators / consumers / islands / units / defenses / throwables / protection_cards / titles / seasons / events / event_drops / fish 以外的深海表 / rooms / raft_tiles / zones / spawns / tides / shipwrecks / oil / blueprints / quality / lines / lockpick_tools | **本版主体工作量**：逐张接到代码里 |
| **空表（6）** | 6 | drops / explore / limits / phrases / regions / waves | 见 §4 |

复跑：`node /e/tmp/wdf_cons2.mjs`（审计脚本，逻辑见 `02 §4.3`）。

## 4. 6 张空表的逐张处置（**本版最有信息量的一节**）

| 表 | 行 | 消费方 | 设计源有没有条目 | 处置 | 谁负责 |
|---|---|---|---|---|---|
| `waves` | 0 | **0** | ❌ 无"第几波几个" | **D-58**：按 `mvp-scope §5` 预授权的"文字结算"降级，**不需要波次表** | PD8-14 |
| `drops` | 0 | 2（**均注释**） | ❌ D-27：设计源未定义掉落规则 | **真缺口**：`HookModel.ts:21` 写死 `item_0001`。处置二选一：① 若 D-27 维持"无规则"，则把硬编码改为**显式常量 + 注释说明来源**（消除"表就位后接配置"的假承诺）；② 若补规则，需用户给源 | **PD8-07** |
| `explore` | 0 | **0** | ❌ §3.5 只有定性描述 | 不阻塞。探索玩法降级为"无探索点"或推 v1.2 | — |
| `limits` | 0 | **0** | ⚠ 已由 `merchants.daily_limit` 表达（D-01） | 整表冗余，标注可删 | — |
| `phrases` | 0 | **0** | ❌ §9.4 无具体文案 | 不阻塞聊天**功能**；文案由运营下发或用默认串 | PD8-16 |
| `regions` | 0 | 2（真实 SQL 读+写） | ⚠ D-53：区名由运营给定，不种数据 | 已有回落（`account/repo.ts:57`），保持空 | — |

**结论**：6 张空表里**只有 `drops` 是真缺口**，且它只影响一处（`HookModel`）。
PD7-08/PD7-09 的 `BLOCKED` 在代码层面**没有依据**（4 张零消费方 + 1 张有回落）。

## 5. 本地存档结构

`packages/game-core/src/save/schema.ts:15`：

```ts
modules: Record<string, unknown>;
```

**这是开放 map** → 新增模块存档**不需要**递增 `SAVE_SCHEMA_VERSION`。

| 项 | 现状 | 本版动作 |
|---|---|---|
| `SAVE_SCHEMA_VERSION` | 已定义（`save/schema.ts`） | **不递增**（本版新增的 `modules.raft` 等都在开放 map 内） |
| 迁移函数 | `save/migrations.ts` 有"缺键补默认值"机制 | PD8-02 新增 `modules.raft = { tiles: 0 }` 的补齐分支 |
| 封印 | `sealSave()` 写哈希，`save-seal.test.mjs` 覆盖 | 不改 |
| 已知消费者 | `HookModel.ts` 写 `modules.inventory` | 不改 |

**硬约束**：任何卡若想递增 `SAVE_SCHEMA_VERSION` → 停，那是 v1.1 的事，且会让老存档全部失效。

## 6. 数据生命周期

| 数据 | 生命周期 | 软删除 |
|---|---|---|
| 云存档 | 每次 `save.push` 产生新 revision，旧 revision 保留 | 无软删，靠 `revision` 追溯 |
| 影子账本 `ledger_entry` | **只追加，永不删改** | 无 |
| `idempotency` | 只存 `c===0` 的结果 | 无 |
| `daily_quota` | 按自然日重置 | 无 |
| 审计 `audit_log` | 只追加 | 无 |

## 7. 本版对数据模型的**唯一**要求（一句话）

> **不改表结构、不加迁移、不递增存档版本。**
> 所有工作都是"把已有的 46 张数值表接到代码里"，不是"重新设计数据"。

这条非常重要——它让本版 18 张卡的并行判定变成"文件所有权是否相交"这一个维度，
把并发冲突的可能性压到最低（`07 §2` 逐条给机械依据）。
