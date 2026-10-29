---
id: EVD-7108
title: PD7-08 战斗簇数据（units/waves/defenses/throwables/islands/protection_cards/buildings）
status: blocked
owner: hark
created: 2026-10-30
review: 2026-11-30
---

# EVD-7108 · PD7-08 战斗簇数据（2026-10-30）

## 状态：BLOCKED（waves 无源）

**本卡整体 BLOCKED**，原因：设计源 §7（野人袭击/塔防）**没有「第几波来几个敌人」波次数值**（§7.1:491 只给窝点每周刷新/1-2 个/规模随岛等级增长；§7.2:348 只给定性"一座箭塔+一颗烟雾必胜"）。卡阻塞条件明确：`设计源没有"波次"数值 → waves 留空 + BLOCKED 上报（没有波次就没有塔防，不许自己编）`。

**结构表已转录**（5 张非空），waves 留空待设计源补波次数值后回填。

## 目标与交付

**目标**：`defense` 能回答「兵种、防御设施、岛屿模板、保护卡」，来自表；波次部分因 waves 无源 BLOCKED。

| 交付 | 位置 |
|---|---|
| 来源清单（B-L1） | `docs/06_validation/evidence/EVD-7108/source-list.md` |
| `units` 3 兵种转录（U-02，代定推断） | `game-data/source/units.csv` + `units.schema.json`（放宽数值为可选 + category/unlock_level/note） |
| `defenses` 3 防御建筑转录 | `game-data/source/defenses.csv` + `defenses.schema.json`（增 category/recipe/level_max/damage/range/hp） |
| `throwables` 2 投掷物转录 | `game-data/source/throwables.csv` + `throwables.schema.json`（增 recipe/duration_sec） |
| `islands` 4 模板转录 | `game-data/source/islands.csv` + `islands.schema.json`（增 template/landing_zones/has_reef_cliff/area） |
| `protection_cards` 3 卡转录 | `game-data/source/protection_cards.csv` + `protection_cards.schema.json`（增 duration_hours/source/price） |
| `waves` BLOCKED（0 行） | 空表 + UNKNOWN-TABLES 三之四登记 |
| `buildings.storage_bp` 4 行 0 核实 | UNKNOWN-TABLES 三之四 §4（非占位，功能建筑不仓储） |
| 结构 + 无源留空 + 确定性断言 | `tests/determinism/defense.test.mjs`（df1-8 新增） |

## 来源锚点（B-L1，逐字段）

- `units` 3 兵种 ← U-02（设计要点记录.md:747，近战/远程/坦克各 1 每类取解锁最低）+ DS §7.2:746（v1.0 先做 3 个）
- `units` 兵种数值 ← 待定（DS §7.2:517）；解锁等级 ← 设计源未给
- `defenses` 箭塔/投石机/弓弩车配方 ← DS §7.2:520；弓弩车 1/2/3 级 ← §7.2:522；数值待定 ← §7.2:522
- `throwables` 烟雾罐（木炭+布×2）/火罐（燃油+布）← DS §7.3:538；烟雾 3 秒散（数值可调）← §7.3:540
- `islands` 4 模板 + 登陆口 2-3 + 固定礁石/悬崖 ← DS §7.2:530；面积待定
- `protection_cards` 30 天/7 天/24 小时 ← DS §4.4:355；来源（新手/月活动/付费/商人 3%）← §4.4:358-362；价格待定 ← §4.4:367
- `waves` ← **无源**（§7 无波次数值）→ BLOCKED

## 设计决策（用户 2026-10-30）

| # | 决策 | 结论 |
|---|---|---|
| D1 | units 3 兵种具体是谁 | U-02 只给原则（每类取解锁最低），设计源未给解锁等级、未明确分类 → **用户未指名**，执行采用**代定推断**（近战=轻步兵/远程=弓箭兵/坦克=重骑兵，每类最基础），登记待用户确认可改 |
| D2 | waves | 卡预判 BLOCKED（设计源无波次数值）→ **留空 + BLOCKED 上报**，不编 |
| D3 | buildings.storage_bp 4 行 0 | 核实为**功能建筑不提供仓储**（§5.3:533），非占位，不改 |
| D4 | isl.highland 等 has_reef_cliff | 设计同值（§7.2:530 每岛固定礁石/悬崖），非占位 |

## 无源字段（B-L5，留空 + 登记，见 UNKNOWN-TABLES 三之四）

units.hp/speed/attack/range/unlock_level、defenses.damage/range/hp、throwables.duration_sec、islands.area、protection_cards.price、waves（整表 BLOCKED）。

## 验收（当场复跑）

| # | 验收 | 实测 | 判定 |
|---|---|---|---|
| A1 | `npm run gen && node --import ./tools/runtime/register.mjs --test tests/determinism/defense.test.mjs` | gen EXIT=0（46 表/512 行，configVersion=83c9ea8ca7a806aa）；测试 **8/8 PASS**（df1-8） | ✅ |
| A2 | units.csv 恰 3 行且覆盖近战/远程/坦克 | df1 断言：units 恰 3 行，category 覆盖 melee/ranged/tank | ✅ |
| A3 | 同 seed 跑两次结果相同（确定性） | df8 断言：distanceField 同输入两次 deepEqual；阻挡不可达 -1；入口可达性 | ✅ |
| A4 | UNKNOWN-TABLES 记录另外 6 兵种登记为 v1.2 | UNKNOWN-TABLES 三之四 §3：6 兵种 + 弩车登记 v1.2 | ✅ |

## 关键输出摘录

**defense 测试（8/8）**：
```
✔ df 1 A2 units 恰 3 行，覆盖近战/远程/坦克
✔ df 2 units 兵种数值待定 → 全部留空，不得编造
✔ df 3 waves 空表（BLOCKED：设计源无波次数值）
✔ df 4 defenses 3 防御建筑，配方有源，数值待定留空
✔ df 5 throwables 烟雾罐/火罐配方有源，时长可调留空
✔ df 6 islands 4 模板，登陆口 2-3，面积待定留空
✔ df 7 protection_cards 三种卡，时长定值有源，价格待定留空
✔ df 8 A3 骨架 distanceField 正确性 + 确定性
tests 8 / pass 8 / fail 0
```

**placeholders**：EXIT=0（不阻断）；空表 25 → 20（units/defenses/throwables/islands/protection_cards 已填，waves 仍空属 BLOCKED）；占位值嫌疑 6 项（其中 crew_traits.max_value/step、islands.has_reef_cliff 为设计同值误报待 PD7-09）。

**gen**：configVersion = `83c9ea8ca7a806aa`；46 张表 / 512 行（原 497，+3 units +3 defenses +2 throwables +4 islands +3 protection_cards）。

## 边界自检

- ✅ 未动 `packages/game-core/src/defense/**`（骨架属 PD7-15，本卡禁止）
- ✅ `placeholders.baseline.json` 未动（forbidden_paths + B-L4）
- ✅ `items.csv`/`recipes.csv`/`jobs.csv` 等其余 CSV 未动
- ✅ 未动 `packages/contracts/**`、`server/db/migrations/**`
- ⚠ 生成物 2 个 `config-types.ts` 由 gen 重生成（非手写）

## 提交

> 提交在审查通过后补充。
