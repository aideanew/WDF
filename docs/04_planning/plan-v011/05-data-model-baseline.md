---
id: PLAN-V011-05
title: plan-v011 · 05 数据模型基线（表/存档/迁移编排）
status: active
module: planning
owner: hark
created: 2026-10-29
review: 2026-11-12
related: [PLAN-V011-04]
---

# 05 · 数据模型基线

> 本项目有**两套独立的数据模型**，它们的变更纪律完全不同，不许混为一谈：
> ① **服务端 PG 表**（`server/db/migrations/`）—— 只存"竞争性/跨设备"数据；
> ② **数值配置表**（`game-data/source/*.csv` → `npm run gen`）—— 只存策划数值，**不是数据库**；
> ③ **本地存档 JSON**（`packages/game-core/src/save/`）—— 存在客户端 storage，服务端只存快照副本。

## 1. 服务端 PG 表现状（14 张，全部实测）

```
server/db/migrations/0001_init.sql  (95 行, 13 表)
server/db/migrations/0002_regions.sql (19 行, 1 表)
```

| # | 表 | 用途 | 权威性 | 关键约束（实测） |
|---|---|---|---|---|
| 1 | `player` | 玩家主体（含 `region`、封禁位） | 权威 | `player_region_idx`（`0002` 追加） |
| 2 | `identity` | 平台身份（plat + openid → player） | 权威 | 与 `player` 分表，支持一人多平台 |
| 3 | `bind_ticket` | 绑定一次性票据 | 权威 | 一次性 + 时效（`2004` 的判定源） |
| 4 | `save_snapshot` | 云存档快照（含 `revision`、`checksum`） | 权威副本 | 冲突判定只认 `baseRevision` |
| 5 | `save_fork` | 存档分叉待裁决 | 权威 | 与 `save.resolveFork` 对应 |
| 6 | `idempotency` | 幂等表 | 权威 | **只缓存 `c===0`**（`c!==0` 不写，避免把失败也幂等掉） |
| 7 | `ledger_entry` | 金币流水，**只追加** | **唯一权威**（影子账本） | ADR-0012：卖出 ≤ 累计获得 − 已卖出，容差 0 |
| 8 | `daily_quota` | 区服每日限量（开锁工具/沉船信息） | 权威 | `economy.buyQuota` 的载体（当前 todo） |
| 9 | `income_daily` | 每日收益汇总 | 派生 | 榜单上报的落点 |
| 10 | `leaderboard_snapshot` | 榜单快照 | 派生 | `leaderboard.query` 读它，不扫全表 |
| 11 | `event_session` | 赶海场次（seed/装备快照） | 权威 | v1.1 `event.start/submit` 的载体（**表已建，动作仍 todo**） |
| 12 | `config_release` | configVersion 发布记录 | 权威 | `config.manifest` 读它 |
| 13 | `audit_log` | 审计 | 只追加 | ops 封号/开区留痕 |
| 14 | `regions` | 区服（D-53，TASK-1401） | 权威 | **部分唯一索引** `regions_current_idx`：全表至多一行 `is_current=true`（不靠代码自觉，靠 DB 约束） |

**软删除策略（全库统一，已成立）**：`regions.status = open|closed`（关区保留历史不删行）；
`player` 封禁用状态位而非删行；`ledger_entry` / `audit_log` **物理不可删**。
⇒ 本版 **不新增**任何软删除字段。

## 2. 本版对 PG 表的改动预期：**0 张（A 阶段）/ 至多 1 张（C 阶段）**

| 阶段 | 是否需要迁移 | 依据 |
|---|---|---|
| **A（扩筏）** | **不需要** | 扩筏状态属玩家进度，存在本地存档 `modules.raft` + 云存档快照里。服务端只做快照搬运，不理解内容（`save.push` 的 `snapshot: unknown`） |
| **B（数值）** | **不需要** | 31 张表是 CSV 配置表，不是 PG 表 |
| **C（模块）** | **最多 1 个** | 仅当 `event.submit` 需要在 `event_session` 上加"已结算"列时；`leaderboard` 的赛季/称号是 CSV（`seasons`/`titles`）不是 PG 表；`social` 的聊天记录 v1.1 若无持久化要求则不建表（`phrases` 是 CSV） |
| **D（运营）** | **不需要** | 提审不改表 |

> **纪律**：C 阶段若判断"需要建表"，**必须先提交 ADR 再建**（不是先建了再说）。
> 判断标准只有一条：**这份数据是否需要跨设备/跨玩家竞争**。不需要 → 进本地存档或 CSV，不进 PG。

## 3. 迁移版本号编排（★ 并行开发时迁移必须串行）

| 版本号 | 归属 | 内容 | 状态 | 谁能写 |
|---|---|---|---|---|
| `0001` | 历史 | 13 张基础表 | ✅ 已执行 | 冻结，**永不修改** |
| `0002` | TASK-1401（P6） | `regions` 表 + 2 个索引 | ✅ 已执行 | 冻结，**永不修改** |
| `0003` | **本版 C 阶段 · PD7-14（赶海）** | `event_session` 增列（**仅当** ADR 确认需要时） | ⬜ 预留 | 仅 PD7-14 一张卡 |
| `0004+` | 未分配 | — | — | 不许提前占号（N-3） |

**编排规则（写死，防冲突）**：

1. **同一时刻只有一个 Agent 能写迁移**；本版 17 张卡里只有 PD7-14 持有 `0003` 的写权。
2. 若 PD7-14 判定"不需要建列"，则 `0003` **作废不占号**，下一个需要迁移的卡从 `0003` 起编（不是 `0004`）。
3. 已执行过的迁移**永不修改**（AGENTS.md 硬禁止）；发现历史迁移有错 → 新迁移修，不改旧文件。
4. 迁移必须带 `-- 说明（卡号，日期，依据）` 头注释，`0002_regions.sql:1-4` 是范式。

## 4. 本地存档模型基线（A 阶段唯一会动的"数据模型"）

```
packages/game-core/src/save/schema.ts      （结构定义 + SAVE_SCHEMA_VERSION）
packages/game-core/src/save/migrations.ts  （版本迁移函数）
```

| 规则 | 内容 | 依据 |
|---|---|---|
| `SAVE_SCHEMA_VERSION` | **新增 `modules.<key>` 属开放 map 扩展，不递增** | `glossary.md:40`（§3.4 裁定） |
| 递增条件 | 只当"已有键的形状改变"或"需要一次性数据搬迁"时递增 | 同上 |
| A 阶段动作 | 新增 `modules.raft = { tiles: number }`（**开放 map 扩展 → 不递增版本**），并补一条 `migrations.ts` 的"缺失键补默认值"分支 | PD7-02 |
| 禁令 | 改存档结构不写迁移函数 = 硬禁止（AGENTS.md §2） | — |

**为什么扩筏只需要 `tiles: number`**：`raft_tiles` 表当前只有 **1 行**（`raft_block`），
所有地块同型 ⇒ "扩一格"= 数量 +1。**不建 `tiles: {x,y}` 二维结构**——那是为"未来可能的多层/异形"
提前设计，违反 §13.13。等 `raft_tiles` 有第二种地块时再改结构（那时才递增 schema 版本）。

## 5. 数值配置表的改动纪律（B 阶段的全部工作都在这）

| 规则 | 内容 | 违反后果 |
|---|---|---|
| 唯一源 | `game-data/source/*.csv`，改完必须 `npm run gen` | 手改 `generated/` 直接吃第 7 项守卫 |
| 不自编 | 无源字段留空并登记 `game-data/UNKNOWN-TABLES.md` | N-4；已有因自编被回滚的先例（`items.weight` 全 1） |
| 同值告警 | 某字段全表同值即视为疑似占位 | 第 10 项守卫（`tools/guard/placeholders.mjs`） |
| baseline 只减不增 | 修改 `placeholders.baseline.json` 必须**单独提交 + 附实测依据** | baseline 文件头逐字规定 |
| 列结构 vs 数值 | 可以先补列（列由设计文档推导），**数字不编** | TASK-1503 的既有纪律（BLOCKED，见 D-50） |

**B 阶段的一个反直觉结论（必须写出来）**：`unlocks 11 行`、`rooms 10 行` 只有 `id,name,note` 三列，
**这不是"有数据"，是"有骨架没参数"**。它们对 `progression`（PD7-10）的价值为零——
PD7-06 的第一步是**补列**，不是"填数"。同理 `levels 49 行` 只有 `exp_to_next` 一列，
缺"该级解锁什么"的关联列，`progression` 无法判定"升到 N 级解锁什么"。

## 6. 数据模型的失败模式（本版要防的三件事）

| # | 失败模式 | 历史上真实发生过 | 本版防线 |
|---|---|---|---|
| D-1 | 字段有了但全是同值 → 功能恒失败 | `items.weight` 全 1 → 浮力恒负 | 第 10 项守卫 + B 阶段每卡附 `placeholders` 前后截图 |
| D-2 | 表有了但列不齐 → 实现方自己编列名 | `unlocks/rooms` 只有 3 列 | PD7-06 拆成"补列"与"填数"两步，补列必须引设计源条文 |
| D-3 | 设计意向被写成"已建表" | FIX-34（`PD5-02` 已修） | 本文件 §1 每行附 `migrations` 行号，任何人可核对 |
