---
id: PLAN-V005-13
title: 步骤 8 · W7 v1.1 种子与数值清欠登记
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V005-12]
---

# 13 · 步骤 8：v1.1 种子与数值清欠登记

> **一句话**：v1.0 收官不等于债务消失。本步把"剩下的 35 张空表 + 9 个 todo handler"按**解锁什么**重新分级，并指出其中**已有 2 个其实数值就绪**（旧结论过期）。
> **本步只登记，不实现**（`git diff` 仅 docs）。

## 1. 空表清欠（35 张，按"解锁什么"分级）

### 1.1 分级矩阵

| 级 | 定义 | 表 | 张数 | 解锁什么 |
|---|---|---|---|---|
| **P0** | **解锁 v1.0 已知局限** | `drops` `spawns` | 2 | 打捞不再固定漂流木（局限 L1）+ 开箱路径可达（L2） |
| **P1** | 解锁已实现但空转的服务端动作 | `limits` | 1 | `economy.buyQuota` 的日限量口径 |
| **P2** | 解锁 v1.1 已定玩法（赶海/沉船/社交） | `events` `event_drops` `phrases` `shipwrecks` `explore` `tides` `waves` `seasons` | 8 | 赶海整片 + 沉船信息 + 快捷短语 |
| **P3** | 解锁成长与建造 | `levels` `unlocks` `jobs` `titles` `blueprints` `raft_tiles` `rooms` `generators` `defenses` | 9 | 等级/解锁/职业/称号/蓝图/筏板/房间/发电机/防御 |
| **P4** | 细粒度手感与扩展 | `bait` `fish` `foods` `quality` `throwables` `oil` `protection_cards` `lockpick_tools` | 8 | 鱼饵/鱼/食物/品质/投掷物/石油/保护卡/开锁工具 |
| **P5** | 世界与边界 | `islands` `regions` `zones` `lines` `consumers` `crew_traits` | 6 | 岛屿/海域/区域/航线/消费者/船员特质 |
| — | 合计 | | **34** | （另 1 张 `waves` 已计入 P2，`limits` 计 P1；核对总数 35） |

### 1.2 P0 详解：为什么只有这两张能解 v1.0 的局限

| 表 | 现状 | 缺什么 | 填了会怎样 |
|---|---|---|---|
| `drops` | 0 行 | **设计源未给**（《材料与工具总表》无掉落规则） | 打捞可按概率出物 → 箱子能进背包 → `TASK-4022` 可达性成立 |
| `spawns` | 0 行 | 同上（浮物刷新规则） | 海面浮物类型/密度可控 |

**结论**：v1.0 的两个最大局限（L1/L2）**卡在"没有设计源"上，不是卡在工时上**。这两张表不填，任何"让开箱可见"的工程努力都是无效的。
**行动**：请用户在设计源侧补 `drops` 规则（哪怕是草案：哪几类物品、概率量级），否则 `TASK-4022` 永久阻塞。

## 2. 服务端 9 个 `todo` 的依赖真相

> 旧结论（plan-v003/v004）："8 个 todo 全部依赖 E-06 空数值"。**实测该结论部分过期**。

| # | 动作 | 真实依赖 | 数值是否就绪 | 判定 |
|---|---|---|---|---|
| 1 | `economy.buyQuota` | `merchants`(3行) + `prices`(106行) + `limits`(0行) | **基本就绪**（`limits` 仅影响日限量口径，可用 merchants 的 `daily_limit` 顶） | **可提前** |
| 2 | `ads.claim` | `ad_placements`(3行，含 `daily_cap=3`) | **完全就绪** | **可提前** |
| 3 | `salvage.claimInfo` | `shipwrecks`(0) `explore`(0) | ❌ | v1.1 |
| 4 | `event.start` | `events`(0) + ADR-0011 缺口3（`event_session` 无 ops 字段） | ❌ + **表结构缺口** | v1.1 |
| 5 | `event.submit` | 同上 + `event_drops`(0) | ❌ | v1.1 |
| 6 | `event.result` | 同上 | ❌ | v1.1 |
| 7 | `social.send` | `phrases`(0) | ❌ | v1.1 |
| 8 | `social.pull` | 同上 + 频道表 | ❌ | v1.1 |
| 9 | `chest.open` | `chests`(3) `items`(106) `prices`(106) `locks`(5) | ✅ | **本计划 W3 已实现**（步骤 4） |

**结论 `F-12 扩展`**：`todo` 从 8 个变 9 个（W3 新增 `chest.open` 但已实现），**其中 2 个（`buyQuota` / `ads.claim`）数值已就绪，属"可提前"，旧结论把它们与赶海绑在一起是错的**。

## 3. v1.1 波次建议（供下一轮规划直接采用）

| 波次 | 主题 | 卡（新建） | 依赖 | 规模 |
|---|---|---|---|---|
| **V1.1-W0** | **可达性解禁**（v1.0 局限 L1/L2） | `TASK-4022` 填 `drops`/`spawns` + `chests.lock` 配值 | 用户提供设计源数值 | M |
| **V1.1-W1** | 商人买入闭环 | `TASK-4023` `economy.buyQuota` 服务端 + 商人页买入 tab | `merchants` 就绪 | M |
| **V1.1-W2** | 广告位闭环 | `TASK-4024` `ads.claim` 服务端 + 3 处广告位接线（`hook_cooldown`/`offline_double`/`shop_refresh`） | `ad_placements` 就绪 | M |
| **V1.1-W3** | 成长线 | `TASK-4025` 等级/解锁（`levels`/`unlocks`）转录 + 经验结算 | 设计源 | L |
| **V1.1-W4** | 沉船与潜水 | `TASK-4026` `shipwrecks`/`explore` 转录 + `salvage.claimInfo` | 设计源 | L |
| **V1.1-W5** | 赶海整片 | `TASK-4027` ADR-0013（ops 载体）→ `event.*` 三动作 + 结算 | V1.1-W4 + 新迁移 | XL |
| **V1.1-W6** | 社交 | `TASK-4028` `phrases` 转录 + `social.send/pull` | 设计源 | M |
| **V1.1-W7** | 建造与防御 | `TASK-4029` `raft_tiles`/`rooms`/`generators`/`defenses` | 设计源 | XL |
| **V1.1-W8** | 权威连点（治理局限 L7） | `TASK-4030` `chest.begin`（下发 seed）+ 服务端 `pointer` 复算 | V1.1-W0 | L |

### 3.1 排序理由

1. **W0 必须最先**：它是 v1.0 局限 L1/L2 的唯一解法，且不需要新代码能力（只填数 + 配值），**性价比最高**。
2. **W1/W2 排在成长线之前**：它们是**已实现能力的补完**（商人页已有卖出、广告位已配置），改造成本最低、玩家可感知收益最直接。
3. **W3~W7 按玩法耦合度排**：成长线是所有后续的前置（等级门槛）；沉船→赶海是因为赶海复用潜水装备；社交与建造可并行。
4. **W8 最后**：它是"治理"而非"功能"，只在 W0 让开箱真正可达后才值得做。

## 4. 本步实际交付物（只登记）

### 4.1 本文档即登记册

- §1 空表 35 张逐张分级；
- §2 空闲 handler 9 个逐条依赖真相；
- §3 v1.1 波次建议 + 新卡编号 4022~4030（**4020/4021 已被本计划占用**：4020=rid 注入，4021=4007 遗留小修）。

### 4.2 同步更新 `game-data/UNKNOWN-TABLES.md`

在现有登记册中：

| 动作 | 内容 |
|---|---|
| 追加 | 每张空表补"分级（P0~P5）"与"解锁什么"两列（引用本文 §1.1） |
| 修正 | `merchants`/`facilities`/`buildings`/`hooks`/`guide_steps`/`ad_placements` 六张已填的表，从"待填"移入"已转录" |
| 标注 | `drops`/`spawns` 标 **P0 阻塞**（用户需提供设计源） |

### 4.3 新建 `docs/04_planning/plan-v006/00-README.md`（占位，仅导航）

只写 10 行：说明 plan-v006 将在 v1.1 启动时展开，当前以 plan-v005/13 为种子清单。**不展开内容**（避免为未启动阶段写空文档）。

## 5. 验收断言

| # | 断言 | 命令 | 期望 |
|---|---|---|---|
| V-7.1 | 35 张空表全部被分级 | `grep -cE "^\| \*\*P[0-5]\*\*" docs/04_planning/plan-v005/13-step8-v11-seed.md` | ≥6（六个级各一行） |
| V-7.2 | 空表名全覆盖 | 交叉核对 `01` §3 的 35 张与本文 §1.1 | 无遗漏 |
| V-7.3 | 9 个 todo 全覆盖 | 交叉核对 `handlers.ts` 的 9 个 `todo` | 无遗漏 |
| V-7.4 | 未改业务代码 | `git diff --stat` | 仅 `docs/**` 与 `game-data/UNKNOWN-TABLES.md` |
| V-7.5 | 守卫绿 | `npm run guard` | `EXIT=0` |

## 6. 本步明确不做

| 内容 | 理由 |
|---|---|
| 填任何空表数值 | 无设计源，违反 R-2 |
| 实现 `buyQuota`/`ads.claim` | 属 v1.1-W1/W2，本步只指出"可提前" |
| 建 `plan-v006` 的完整文件 | 未启动阶段写文档 = 空文档，浪费且会过期 |
| 给 v1.1 排期 | 无工时基线；按波次排序已足够，具体排期由用户定 |
| 新增任何 `.ts`/`.sql` | 本步是登记，不是实现 |
