---
id: PLAN-V010-04
title: plan-v010 · 契约与数据模型缺口（含自造码 3101、迁移编排）
status: active
module: planning
owner: hark
created: 2026-10-28
review: 2026-11-11
related: [PLAN-V010-02, ADR-0011, ADR-0012, ADR-0013]
---

# 04 · 契约与数据模型缺口

## 0. 结论先行

| 类别 | 数量 | 是否阻塞本版 |
|---|---|---|
| 已冻结且可用的契约 | 14 个子模块（`packages/contracts/src/*`） | — |
| **契约缺口（自造码 / 缺码）** | **2 处**（`3101` 复用、无"资源不足"语义码） | 不阻塞，S0 登记 |
| **需新增的表** | **2 张**（广告日计数、合规状态） | 阻塞 S1/S2 |
| **需新增的迁移版本** | **0002 一张即可容纳两张表** | 见 §3 |
| 占位值需重判的字段 | 6 组 | **阻塞 S3** |

## 1. 唯一的契约源（复核结论：合规）

`packages/contracts/src/` 是唯一源，`server` 与 `client` 都从这里导入；
`game-core` 的 `Result.code` 与 `ERR` 的 3xxx 段对应。
`tools/gen/` 会把它生成 `api-catalog.md`（**整文件覆盖，禁止手改**，v009 已确认）。

复核项：

- [x] 前端能否只凭契约写调用层？—— **能**，`RpcClient.invoke<Req,Res>` 全部类型来自 contracts。
- [x] 后端能否只凭契约实现？—— **能**，`HANDLERS satisfies Record<ActionName, Handler>` 强制覆盖。
- [x] 数据端能否只凭契约设计表？—— **不能**（见 §3，`ads.claim` 的 `remainingToday` 需要一张按玩家计数的表，
      契约没说这张表存在）。
- [x] 错误码覆盖所有失败路径？—— **否**（见 §2）。

## 2. 契约缺口

### G-1 `3101` 是事实码，但不在 `ERR`（★本版新查实）

`packages/contracts/src/common/errors.ts` 定义 15 个业务码（1001~9001）。
但业务代码里有两处使用 **`3101`**：

```
packages/game-core/src/hook/index.ts:133   if (itemWeight > cap) return err(3101, `承重不足：...`);
packages/game-core/src/raft/index.ts:17    return left >= 0 ? ok(left) : err(3101, `浮力不足，还差 ...`);
```

`3101` **不在 `ERR` 里**。这意味着：

1. 客户端收到 `c=3101` 时**无法用符号匹配**，只能硬编码 `3101`；
2. `docs/03_solution/data/error-catalog.md` 里没有这个码的说明；
3. 与已修复的 `3103` 事故同类 —— 区别只是 `3101` 用了两次、有共识、没被守卫抓到。

**处置（S0-7002）**：不新增码（契约冻结期），只在 `error-catalog.md` 登记
「3101 = 规则拒绝：承重/浮力不足（事实码，非冻结码）」，并在两处调用点加注释指向该登记。

> 为什么不在本版解冻契约新增码：解冻需要 ADR + 客户端同步，而 `3101` 当前**没有客户端消费者**
> （hook 承重与 raft 浮力都在 game-core 由客户端本地计算，拒绝信息只用于 UI 文案）。
> **收益为零，代价为正** → 只登记，不改。

### G-2 `ERR` 缺少「资源/前置条件不足」的通用语义

`ERR` 的 3xxx 段只有：`3001 DUPLICATE_REQUEST`、`3002 QUOTA_EXHAUSTED`、`3201 EVENT_CLOSED`、`3202 EVENT_ALREADY_PLAYED`。
**没有**「材料不够」「浮力不够」「等级不够」这类通用前置条件码。

现状：`crafting` 的 `canCraft()` 返回 `{ok, missing}` 而**不返回错误码**（本地判定，不走网络）；
所以现在不痛。但一旦 `raft` / `progression` 变成服务端复核，就必然需要这个码。

**处置**：登记为 NON_BLOCKING（`U-6`），不在 v1.0 处理。

### G-3 六份契约的自检（用户要求逐份）

| # | 契约 | 状态 | 证据 |
|---|---|---|---|
| ① | **API** | ✅ 齐 | `ACTIONS` 22 条 + `HANDLERS` 22 键 `satisfies` + `payload.ts` schema 覆盖 20/20（v009 已修） |
| ② | **Errors** | ⚠ 15 码 + 事实码 `3101` | §2 G-1/G-2 |
| ③ | **Identity** | ✅ 齐 | `Claims`（`auth.ts`）+ `Claims.plat` + `playerId`；无管理端 → 无越权面（N-1） |
| ④ | **Resources** | ⚠ **空** | 无上传、无图片 URL 规则。当前 `packUrl` 走 `config_release`，热更包本身无鉴权设计 → 记 `U-7` |
| ⑤ | **Events** | ✅ 无异步事件 | 全部同步 RPC；`telemetry.track` 是批量上报不是事件总线 |
| ⑥ | **UX States** | ✅ 齐 | `DESIGN-0001`（六态 + 14 码映射），`tests/contract/ux.test.mjs` 8 例 |

> ④ 为什么可以"空"：v1.0 不需要玩家上传文件（没有头像/自定义图片）。
> 唯一的"资源"是配置热更包，走 CDN 公开 URL，**不需要鉴权**。

## 3. 数据模型缺口与迁移编排

### 3.1 现有表（`0001_init.sql`，13 张）

```
player  identity  bind_ticket  save_snapshot  save_fork  idempotency
ledger_entry  daily_quota  income_daily  leaderboard_snapshot  event_session
config_release  audit_log
```

**关键发现：`daily_quota` 的主键是 `(region, day, key)` —— 区服维度，不是玩家维度。**

```sql
CREATE TABLE daily_quota (             -- 区服每日限量（如高级开锁工具、沉船信息）
  region text NOT NULL, day date NOT NULL, key text NOT NULL,
  used int NOT NULL DEFAULT 0, cap int NOT NULL,
  PRIMARY KEY (region, day, key)
);
```

而 `ads.claim` 的契约是 `AdClaimRes{ granted, remainingToday }` —— **`remainingToday` 是玩家维度的**
（"我今天还能看几次广告"）。同理 `economy.sell` 的 `quotaLeft` 是**玩家在某个商人处今天还能卖多少**
（`merchants.daily_limit` = 20/10/5）。

> 但 `economy/sell` **已经实现了**且 `quotaLeft` 有返回值 —— 说明它用了别的口径。
> 核对：`server/src/modules/economy/service.ts` 的 `sell()` 按 `merchantId` 统计 `ledger_entry`
> 当日条数，**不落 `daily_quota`**。这是"用流水算配额"的策略，可行（账本只追加，天然可对账）。

⇒ **结论**：`ads.claim` 可以**复用同一策略**（按 `ledger_entry` 当日 `reason='ads.claim'` 计数），
**不需要新建表**。这消除了本版原计划的一张迁移。

### 3.2 仍需新增的表：只有 1 张

| 表 | 为什么不能复用 | 迁移 |
|---|---|---|
| `compliance_state` | 实名/未成年人状态是**玩家属性**，`player` 表无此列；`ledger_entry` 是资产流水，不适合存状态 | `0002_compliance.sql` |

```sql
-- 0002_compliance.sql（草案，S1-7013 落地前需 ADR-0015）
CREATE TABLE compliance_state (
  player_id    text PRIMARY KEY REFERENCES player(id),
  real_name_ok boolean NOT NULL DEFAULT false,
  birth_year   int,                      -- null = 未采集
  minor        boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz
);
```

> **为什么必须走 ADR**：新增表属"数据模型变更"，且涉及个人信息（生日年份）→ 触碰隐私合规。
> 没有 ADR-0015 之前**不得建这张表**。

### 3.3 迁移版本编排（串行，不允许并行）

| 版本 | 内容 | 谁写 | 前提 |
|---|---|---|---|
| `0001_init.sql` | 13 张表（已执行，**禁止修改**） | 历史 | — |
| `0002_compliance.sql` | `compliance_state` | S1-7013 | ADR-0015 accepted |
| `0003_*.sql` | 保留给 S3 数值解锁后新增的表（若届时需要） | S3 | D-42 裁决后 |

**纪律**：同一时刻只有一个 Agent 可以持有"下一个迁移号"。S1 与 S2 **不得**并行写迁移
（S2 已确认不需要新表，见 §3.1）。

## 4. 占位值清单（阻塞 S3，需 D-43）

| 表 | 字段 | 现值 | 语义 | 可用? |
|---|---|---|---|---|
| `items` | `weight` | 全 **1** | 原设计未给 | ❌ 全船材料重量恒等于材料数 |
| `items` | `capacity` | 全 **0** | 原设计未给 | ❌ 浮力恒 0 → 扩筏必然失败 |
| `items` | `stack` | 全 **99** | 原设计未给 | ⚠ 所有物品堆叠上限相同 |
| `items` | `unlock_level` | 全 **0** | 原设计未给 | ⚠ 无等级门槛 |
| `locks` | `hits_required` | 0/3/5/8/12 | D-08 | ⚠ v1.0 不做开锁，暂不影响 |
| `locks` | `zone_bp` | 全 **0** | D-08 | ⚠ 同上 |
| `chests` | `smashable` | 全 **true** | D-09 | ⚠ 设计源「上锁箱不能砸」无法表达（F-38） |
| `chests` | `size` | 全 **1** | D-09 | ⚠ 三种箱子容量相同 |
| `recipes` | `unlock_level` | 全 **0** | D-10 | ⚠ 所有配方无条件可做 |
| `recipes` | `job` | 全 **空** | D-10 | ⚠ `jobs` 表 0 行 |

> **这一节的意义**：`UNKNOWN-TABLES.md` 用 ✅ 标记 "已填充"，读者会以为数值可用。
> 本表把它翻译成"能不能用来算"。**只有 `prices.base_price` / `prices.recycle_bp` /
> `items.base_price` / `recipes` 的原料配比是设计源原值**，其余都是裁决占位。

## 5. 本文件的自我限制

1. §3.1 关于 `economy.sell` 用 `ledger_entry` 算配额的结论来自读 `service.ts`，
   **未跑集成测试验证**（用户要求拒绝全量门禁；`tests/integration/economy-sell.test.mjs` 5 例存在，
   S2-7020 开工前应先定向跑这 5 例确认）。
2. §3.2 的建表草案是**草案**，任何字段都可能被 ADR-0015 推翻。
3. 契约解冻一律不做：本版所有缺口都走"登记不改"，唯一例外是 ADR-0015 的新表。
