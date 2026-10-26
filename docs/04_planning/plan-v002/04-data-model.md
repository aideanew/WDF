---
id: PLAN-V002-04
title: 数据模型基线（现状 + 迁移编排 + 索引策略）
status: active
owner: hark
created: 2026-10-26
---

# 04 数据模型基线

> 权威 schema：`server/db/migrations/0001_init.sql`（唯一已执行迁移）。**已执行的迁移不得修改**；新增一律追加新版本号。

## 4.1 现状（0001_init.sql，13 表）

| # | 表 | 用途 | 行号 |
|---:|---|---|---:|
| 1 | `player` | 玩家主表 | :2 |
| 2 | `identity` | 平台身份（wx/tt）→ player 映射 | :9 |
| 3 | `bind_ticket` | 绑定合并票据 | :16 |
| 4 | `save_snapshot` | 云存档快照（revision/checksum） | :22 |
| 5 | `save_fork` | 存档分叉待选 | :31 |
| 6 | `idempotency` | 幂等键→首次结果 | :37 |
| 7 | `ledger_entry` | 经济流水 | :44 |
| 8 | `daily_quota` | 每日配额（D-02 语义待定） | :53 |
| 9 | `income_daily` | 每日收益（榜单源） | :61 |
| 10 | `leaderboard_snapshot` | 榜单快照 | :69 |
| 11 | `event_session` | 赶海场次（**缺 ops 字段 D-03**） | :76 |
| 12 | `config_release` | 配置发布/版本闸 | :87 |
| 13 | `audit_log` | 审计 | :93 |

**缺失**：无 `regions` 表（`account/repo.ts:46` TODO）；无任何索引；无 0002+。

## 4.2 迁移版本编排（★ 必须串行；并行开发不得共用版本号）

| 版本 | 内容 | 谁执行 | 阻塞/依据 |
|---|---|---|---|
| `0001_init.sql` | 13 表基线 | 已执行（禁止改） | — |
| `0002_regions.sql` | 新增 `regions` 表 + `player.region_id` 外键；供 `account.repo.currentRegion` 去掉环境变量兜底 | Agent-Data | `repo.ts:46` TODO；本规划允许**先写不跑**，待用户确认 |
| `0003_event_ops.sql` | `event_session` 增 `ops JSONB` + `seed`；解开 D-03 | Agent-Data | D-03（待裁决） |
| `0004_indexes.sql` | 依"基线指标测量后"再定索引（**当前无基线 → 不排**） | Agent-Data | plan-v001/09 纪律 |

> 纪律：`0002/0003` 的**文本可先落盘**（属规划/契约准备），但**是否执行/何时执行需用户裁决**（U-D2/U-D3）。`0004` 在拿到基线查询耗时前不生成。

## 4.3 字段与约束要点（现状）

- `save_snapshot`：`revision` 单调递增；`checksum` 校验；乐观锁（`save/service.ts:41-80`）。
- `idempotency`：`(action, rid)` 唯一，存首次响应，重放直接返回。
- `event_session`：缺 `ops`/`seed` → 赶海复算无载体（D-03）。

## 4.4 软删除与生命周期

- 当前**无软删除**需求明确；`audit_log` 只追加。
- 存档/榜单为"快照覆盖"，非软删。
- TTL：`social`/`telemetry` 若实现需 TTL（`functional-analysis` 提到"服务器 TTL"），但两表尚未建 → 属"未来需要"，**不提前建表**（AGENTS 禁止提前为未来设计）。

## 4.5 数值表 ↔ 存档的关系（客户端侧）

- 客户端存档结构由 `game-core/save/schema.ts`（`SAVE_SCHEMA_VERSION`）定义，与 DB 无关；改存档结构必须升版本+写迁移函数（AGENTS §2）。
- 数值（46 表/300 行）进 `config` 热更包，客户端只读消费，不落 DB。
