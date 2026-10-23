---
id: PLAN-V001-04
title: 数据模型基线（服务端 / 本地存档 / 数值表）
status: draft
owner: hark
created: 2026-10-23
review: 2026-10-30
---

# 04 数据模型基线

> 证据：`server/db/migrations/0001_init.sql`（逐行读）、`packages/game-core/src/save/schema.ts`、`game-data/source/*.csv`（46 张，逐文件读表头）。

## 4.1 服务端：`0001_init.sql` 的 13 张表（逐字段）

> 共同缺陷：**除主键外几乎没有任何二级索引**（仅 `event_session` 的 `UNIQUE(player_id, day)`、`daily_quota` 的复合主键）。下表在"索引"列标出**建议新增**项，标明【建议】。

### T1 `player`

| 字段 | 类型 | 可空 | 默认 | 备注 |
|---|---|---|---|---|
| `id` | `text` | 否 | — | PK；玩家 ID |
| `region` | `text` | 否 | — | 所属区服（不可变） |
| `province` | `text` | 是 | — | 省榜用 |
| `created_at` | `timestamptz` | 否 | `now()` | 注册时间 |
| `banned_until` | `timestamptz` | 是 | — | 封禁到期；NULL = 未封 |

索引【建议】：`idx_player_region(region)`。

### T2 `identity`

| 字段 | 类型 | 可空 | 默认 | 备注 |
|---|---|---|---|---|
| `platform` | `text` | 否 | — | `wechat`/`douyin`/`app` |
| `open_id` | `text` | 否 | — | 平台内唯一 |
| `union_id` | `text` | 是 | — | 跨应用唯一（可选） |
| `player_id` | `text` | 否 | — | FK → `player(id)` |

PK：`(platform, open_id)`。索引【建议】：`idx_identity_player(player_id)`（绑定查询用）。

### T3 `bind_ticket`

| 字段 | 类型 | 可空 | 默认 |
|---|---|---|---|
| `ticket` | `text` | 否 | — | PK，一次性 |
| `player_id` | `text` | 否 | — | FK |
| `expires_at` | `timestamptz` | 否 | — |
| `used_at` | `timestamptz` | 是 | — |

索引【建议】：`idx_bind_expires(expires_at)`（清理过期票据）。

### T4 `save_snapshot`

| 字段 | 类型 | 可空 | 默认 |
|---|---|---|---|
| `player_id` | `text` | 否 | PK，FK |
| `revision` | `bigint` | 否 | — |
| `schema_version` | `int` | 否 | — |
| `config_version` | `text` | 否 | — |
| `checksum` | `bigint` | 否 | — |
| `body` | `jsonb` | 否 | — |
| `saved_at` | `timestamptz` | 否 | — |

> **只有一行/人**（PK 是 player_id）→ **无历史版本**。与 `save.resolveFork` 的"保留哪份"语义有张力：冲突时云端旧档会被覆盖。**登记为 D-01**（是否保留最近 N 版）。

### T5 `save_fork`

| 字段 | 类型 | 可空 | 默认 |
|---|---|---|---|
| `player_id` | `text` | 否 | FK（**非 PK**，可多行） |
| `source` | `text` | 否 | — | `local`/`cloud`/`bind` |
| `body` | `jsonb` | 否 | — |
| `created_at` | `timestamptz` | 否 | `now()` |

索引【建议】：`idx_fork_player(player_id, created_at DESC)`。

### T6 `idempotency`

| 字段 | 类型 | 可空 | 默认 |
|---|---|---|---|
| `player_id` | `text` | 否 | — |
| `rid` | `text` | 否 | — |
| `response` | `jsonb` | 否 | — |
| `created_at` | `timestamptz` | 否 | `now()` |

PK：`(player_id, rid)`。索引【建议】：`idx_idem_created(created_at)`（24h 清理）。

### T7 `ledger_entry`（只追加）

| 字段 | 类型 | 可空 | 默认 |
|---|---|---|---|
| `id` | `bigserial` | 否 | 自增 PK |
| `player_id` | `text` | 否 | FK |
| `asset` | `text` | 否 | 资产名（gold/wood/…） |
| `delta` | `bigint` | 否 | 增减 |
| `reason` | `text` | 否 | 原因码 |
| `ref` | `text` | 是 | 关联单号 |
| `created_at` | `timestamptz` | 否 | `now()` |

索引【建议】：`idx_ledger_player(player_id, created_at DESC)`。

### T8 `daily_quota`

| 字段 | 类型 | 可空 | 默认 |
|---|---|---|---|
| `region` | `text` | 否 | — |
| `day` | `date` | 否 | — |
| `key` | `text` | 否 | 配额键（如 `lockpick.advanced`） |
| `used` | `int` | 否 | `0` |
| `cap` | `int` | 否 | — |

PK：`(region, day, key)`。
> **语义冲突 D-02**：表是"区服级"配额（`region+day+key`），但已定规则"高级工具**每人每天 1 把**"是**玩家级**。当前结构无法表达"每人 1"。需裁决：加 `player_id` 改主键，或另建 `player_quota`。

### T9 `income_daily`

| 字段 | 类型 | 可空 | 默认 |
|---|---|---|---|
| `player_id` | `text` | 否 | FK |
| `season` | `text` | 否 | — |
| `day` | `date` | 否 | — |
| `value` | `bigint` | 否 | `0` |
| `flagged` | `boolean` | 否 | `false` |

PK：`(player_id, season, day)`。

### T10 `leaderboard_snapshot`

| 字段 | 类型 | 可空 | 默认 |
|---|---|---|---|
| `season` | `text` | 否 | — |
| `scope` | `text` | 否 | — | `global`/`region:<id>`/`province:<code>` |
| `taken_at` | `timestamptz` | 否 | — |
| `rows` | `jsonb` | 否 | — |

PK：`(season, scope, taken_at)`。索引【建议】：`idx_lb_latest(season, scope, taken_at DESC)`。

### T11 `event_session`

| 字段 | 类型 | 可空 | 默认 |
|---|---|---|---|
| `id` | `text` | 否 | PK |
| `player_id` | `text` | 否 | FK |
| `day` | `date` | 否 | — |
| `seed` | `bigint` | 否 | — |
| `config_version` | `text` | 否 | — |
| `loadout` | `jsonb` | 否 | — |
| `total_value` | `bigint` | 是 | — | 结算后写入 |
| `settled_at` | `timestamptz` | 是 | — |

UNIQUE：`(player_id, day)`（每人每天一次，已定）。
> **缺口 D-03**：无 `ops`（操作流）字段。`event.submit` 要把 `EventOp[]` 存下来以便复算与申诉；当前无处可存 → 建议加 `ops jsonb` 或独立 `event_op` 表。
> **缺口 D-04**：无排名/奖励字段；赶海结算产物无处落 → 建议加 `rank int`、`award jsonb`，或独立 `title_award`。

### T12 `config_release`

| 字段 | 类型 | 可空 | 默认 |
|---|---|---|---|
| `version` | `text` | 否 | PK |
| `min_client` | `text` | 否 | — |
| `pack_url` | `text` | 是 | — |
| `released_at` | `timestamptz` | 否 | `now()` |

> **缺口 D-05**：无 `active`/`retired` 状态字段 → 无法"回滚到旧版本"（3.4.4 的版本规则要求可回滚）。

### T13 `audit_log`

| 字段 | 类型 | 可空 | 默认 |
|---|---|---|---|
| `id` | `bigserial` | 否 | PK |
| `actor` | `text` | 否 | 操作者 |
| `action` | `text` | 否 | 动作名 |
| `detail` | `jsonb` | 是 | — |
| `at` | `timestamptz` | 否 | `now()` |

索引【建议】：`idx_audit_actor(actor, at DESC)`。

### 4.1.1 缺失的表（必须放进 `0002_*.sql`，编号串行）

| 编号 | 表 | 用途 | 依据 | 来源 |
|---|---|---|---|---|
| M-01 | `region`（或 `regions`） | 区服登记：id、name、opened_at、status、is_current | `module-catalog.json` `account.tables=["regions"]`；U-06 | **BLOCKING**（表名有 `regions`/`region` 两种写法，需统一） |
| M-02 | `chat_message` | 区服/世界频道消息（`phraseId`，无自由文本） | `social.send/pull`；architecture 5.3 | 可延后（U-07） |
| M-03 | `report` | 举报 | architecture 5.3 | 可延后 |
| M-04 | `ban`（或直接用 `player.banned_until` + `audit_log`） | 封禁记录 | MUST-20 | **需裁决**：单字段够不够 |
| M-05 | `title_award` | 称号发放 | U-01 | 取决于称号归属 |
| M-06 | `income_event` | 逐笔收益（按日分区） | architecture 5.3；`leaderboard.report` 的原始事件 | 首版可只用 `income_daily` 汇总 |
| M-07 | `admin_user` / `admin_session` | 管理端鉴权域 | G-01 | 取决于 U-06 选 A 还是 B |
| M-08 | `player_quota` | 玩家级每日配额 | D-02 | **需裁决** |

**编号编排【建议】**：`0002_regions.sql` → `0003_admin.sql` → `0004_event_ops.sql` → `0005_titles.sql` → `0006_chat.sql`。**同一编号只能有一个所有者**（见 08）。

## 4.2 本地存档（`packages/game-core/src/save/`）

### 字段

| 字段 | 类型 | 说明 | 现状 |
|---|---|---|---|
| `schemaVersion` | `number` | 当前 `1` | 已实现（`SAVE_SCHEMA_VERSION=1`） |
| `configVersion` | `string` | 数值表哈希 | 已实现 |
| `saveId` | `string` | 本地存档标识；首次登录前用于 `anonymousSaveId` | 已实现 |
| `revision` | `number` | 单调递增；`save.push` 的 `baseRevision` 依据 | 已实现 |
| `savedAt` | `number` | 毫秒时间戳 | 已实现 |
| `modules` | 未知结构 | **各业务模块的快照容器** | **未定义字段级结构**（缺口 D-06） |
| `checksum` | `number` | `computeChecksum` 产出 | 已实现 |

### 迁移链

| 项 | 现状 |
|---|---|
| `MIGRATIONS` | **空数组** |
| `migrate()` | 返回 `ok` / `too-new` / `broken` |
| 升级策略 | 缺：`v1 → v2` 的迁移函数一个都没有（因为只有 v1） |

**规则（冻结）**：新增 `schemaVersion` 必须同时提交 `MIGRATIONS[n]`；`too-new`（本地档比客户端新）必须**拒绝加载并提示更新客户端**，不得猜测字段。

### 校验和

| 项 | 规则 |
|---|---|
| 算法 | 由 `computeChecksum` 定义（源文件为准），必须是**确定性、纯函数** |
| 校验时机 | 读档后、`save.push` 前 |
| 不符处理 | 视为损坏 → 尝试云端档 → 都失败则新档 + 保留损坏档副本供上报（**本地不得静默丢弃**） |

### 存档体积

- 上限 300KB（`performance-budget.md`）；本地 storage 上限 10MB（微信）。
- **尚无实测**：无 `modules` 结构，无法估算真实体积（09 里标"尚无基线"）。

## 4.3 数值表：46 张 CSV 的真实状态

> **重大发现**：46 张里 **34 张是 `id,name,note` 三列的占位表**，**只有 12 张有真实业务列**。这不只是"缺数据"，而是**缺表结构**。

### A. 有真实业务列（12 张）

| 表 | 列 | 数据可从 design-source 直接搬？ | 缺口 |
|---|---|---|---|
| `items` | `id,name,category,base_price,weight,capacity,stack,craftable,unlock_level` | **部分**：`材料与工具总表` 十三章有 100+ 物品的原价/回收价/品阶；`weight`、`capacity`、`stack` **无任何文档给出** | **BLOCKING-N1**：重量/容量/堆叠上限全缺 |
| `prices` | `id,base_price,recycle_bp` | **是**：回收价 = 原价×50%（`recycle_bp=5000`）可由规则算出 | 无（可推导） |
| `recipes` | `id,output,output_count,inputs,station,job,unlock_level` | **是**：`材料与工具总表` 二/三/五/六/七/八/九/十章有完整配方与设施 | `inputs` 的编码格式未定（建议 `itemId*count|itemId*count`） |
| `locks` | `id,hits_required,zone_bp,drop_group` | **是**：`箱子与沉船概率-草案` 四档连中 1/2/3/4、命中区 20/15/10/5% | — |
| `chests` | `id,material,lock,smashable,size` | **部分**：箱子材质×锁档组合已知；`size`（小/中/大/巨）只在赶海拉力表出现，日常箱子**无 size 定义** | **BLOCKING-N2**：日常箱子尺寸规则缺失 |
| `lockpick_tools` | `id,item,max_lock,price,daily_region_quota` | **部分**：价格 30/150/600 已定、「高级工具每人每天 1」已定 | `max_lock` 与 `daily_region_quota` 语义与 T8 冲突（D-02） |
| `raft_tiles` | `id,item,capacity,weight` | **部分**：筏块配方已知；**浮力容量数值全缺** | **BLOCKING-N3**：浮力/重量数值缺失（`raft` 规则无输入） |
| `levels` | `id,exp_to_next` | **否**：`等级解锁表-草案` 只有"1–5/6–10…"分段与解锁项，**无经验数值** | **BLOCKING-N4**：升级经验全缺 |
| `tides` | `id,anchor_epoch_ms,period_min,duration_min` | **是**：6h / 10min 已定 | `anchor_epoch_ms` 需定一个锚点时刻 |
| `units` | `id,name,hp,speed,attack,range` | **否**：9 个兵种只有数量与职能，**无任何数值** | **BLOCKING-N5** + U-02 |
| `drops` | `id,group,item,min,max,weight_bp` | **是**：箱子内容（不上锁 1–3 件白70/绿30 等）可搬 | 内容物清单需从物品表挑，属设计细化 |
| `jobs` | `id,name` | **部分**：员工岗位名可列 | 岗位效果无数值 |

### B. 占位表（34 张，`id,name,note`）

`ad_placements`、`bait`、`blueprints`、`buildings`、`consumers`、`crew_traits`、`defenses`、`events`、`event_drops`、`explore`、`facilities`、`fish`、`foods`、`generators`、`guide_steps`、`hooks`、`islands`、`limits`、`lines`、`merchants`、`oil`、`phrases`、`protection_cards`、`quality`、`regions`、`rooms`、`seasons`、`shipwrecks`、`spawns`、`throwables`、`titles`、`unlocks`、`waves`、`zones`。

| 判定 | 说明 |
|---|---|
| 这些表的**列设计本身缺失** | 不是"填数据"能解决的，必须先设计列 |
| 可从 design-source 推出列的例子 | `facilities`（配方+层级）、`buildings`（配方+层级）、`hooks`（三档绳承重）、`quality`（×0.7/×1/×1.5）、`throwables`（烟雾罐/火罐） |
| 列设计需裁决的例子 | `units`（9 兵种属性集）、`waves`（塔防波次）、`zones`（海域分区）、`islands`（岛屿生成参数） |

### 4.3.1 数值缺口汇总（全部 BLOCKING，不得编数字）

| 编号 | 缺口 | 影响的切片 | 是否有文档可推导 |
|---|---|---|---|
| N-1 | 物品 `weight` / `capacity` / `stack` | 背包、浮力、货舱 | 否 |
| N-2 | 日常箱子 `size` 与尺寸和重量的关系 | 出钩、拉扯、脱钩 | 部分（赶海拉力表） |
| N-3 | 筏块/设施的浮力容量与重量 | 扩建、浮力校验 | 否 |
| N-4 | 等级经验曲线 `exp_to_next` | 升级 | 否 |
| N-5 | 9 兵种属性 | 塔防 | 否 |
| N-6 | 34 张占位表的列设计 | 大部分玩法 | 部分 |
| N-7 | 岛屿生成参数（尺寸/资源密度） | 岛屿 | 否 |
| N-8 | 敌人波次数值（数量/间隔/属性） | 塔防 | 否 |
| N-9 | 员工岗位效果（产出/效率） | 员工 | 否 |
| N-10 | 商人 ±30% 浮动的具体规则（何时变、按区域还是按商人） | 商人 | 部分（只写"±30%"） |

> **对规划的直接影响**：**"可搬运的数据"只够支撑切片 S1（步行骨架）**——因为 S1 只需 1–2 种漂浮物 + 1 个箱子 + 1 件物品的数值。所有依赖背包重量、浮力、升级、塔防的切片都卡在 N-1/N-3/N-4/N-5。

## 4.4 结论状态

| 结论 | 状态 |
|---|---|
| 13 张表的字段级结构已核准 | **已确认** |
| 13 张表缺索引 | **存在缺陷**（建议项已列） |
| 缺 8 张表（M-01~M-08） | **存在缺陷** |
| `daily_quota` 与"每人每天 1"语义冲突 | **存在缺陷**（D-02） |
| `save_snapshot` 无历史版本 | **部分确认**（可能是有意设计，需裁决 D-01） |
| `event_session` 缺 ops/rank/award | **存在缺陷**（D-03/D-04） |
| 34/46 数值表只有三列占位 | **存在缺陷**（N-6） |
| 只够支撑第一刀 | **已确认** |
