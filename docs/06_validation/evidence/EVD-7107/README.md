---
id: EVD-7107
title: PD7-07 生产簇数据（jobs/foods/crew_traits/generators/consumers）
status: active
owner: hark
created: 2026-10-29
review: 2026-11-29
---

# EVD-7107 · PD7-07 生产簇数据（2026-10-29）

## 目标与交付

**目标**：`crew`/`power`（PD7-12）能回答「岗位职责、幸福感维度、发电方式、耗电设备」，答案来自表而不是代码。

| 交付 | 位置 |
|---|---|
| 来源清单（B-L1） | `docs/06_validation/evidence/EVD-7107/source-list.md` |
| `jobs` 7 岗位转录（含 produces 有源外键） | `game-data/source/jobs.csv` + `jobs.schema.json`（加 produces/rate/food_consumption/job_level） |
| `foods` 6 食物项转录 | `game-data/source/foods.csv`（schema 未动） |
| `crew_traits` 幸福感 4 项转录 | `game-data/source/crew_traits.csv` + `crew_traits.schema.json`（加 max_value/step） |
| `generators` 3 种发电转录 | `game-data/source/generators.csv` + `generators.schema.json`（加 output_ratio/fuel） |
| `consumers` 耗电设备清单转录 | `game-data/source/consumers.csv` + `consumers.schema.json`（加 power_draw） |
| 结构 + 外键 + 无源留空断言 | `tests/determinism/crew-power.test.mjs`（cp1-7 新增） |

## 来源锚点（B-L1，逐字段）

- `jobs` 7 岗位 ← DS §5.3:421-430（士兵/厨师/铁匠/木匠/机械师/研究员/工人）
- `jobs.produces`（铁匠/机械师）← DS §5.3:437（铁匠产钢材/金锭；机械师产电线/钢缆）
- `jobs.rate/food_consumption/job_level` 无源 ← DS §5.3:442-449（产出速率/食物消耗/等级门槛【待定】），留空登记
- `foods` 6 食物项 ← DS §5.2:413（烤鱼/鱼汤/烤土豆/面包/炒菜/鱼饵）；营养/保质期无源（§5.2:418）
- `crew_traits` 4 项，每项最高 25 / 每次升降 5 ← DS §5.3:460-464
- `generators` 3 种，标称出力比例 1:3:10 ← DS §6:471-474 + §6:481；solar 免费/eel 喂鱼/oil 消耗
- `consumers` 5 耗电设备 ← DS §6:470,478,479；`power_draw` 无源（§6:481 待定），留空登记

## 无源字段（B-L5，留空 + 登记）

| 表.字段 | 依据 | 处理 |
|---|---|---|
| jobs.rate / food_consumption / job_level | §5.3:442-449【待定】 | 留空，登记 |
| foods.营养 / 保质期 | §5.2:418【待定】 | 无此列，登记 |
| consumers.power_draw | §6:481【待定】 | 留空，登记 |
| 岗位产出物（士兵/厨师/木匠/研究员/工人） | §5.3:422-430 职责描述不固定 | 留空（结构上只锁铁匠/机械师有源产出） |

## 验收（当场复跑）

| # | 验收 | 实测 | 判定 |
|---|---|---|---|
| A1 | `npm run gen && node --import ./tools/runtime/register.mjs --test tests/determinism/crew-power.test.mjs` | gen EXIT=0（46 表/497 行，configVersion=07d5051fe14cb68d）；测试 **7/7 PASS**（cp1-7） | ✅ |
| A2 | `node tools/guard/placeholders.mjs` | **EXIT=0**（只报告不阻断）；占位值嫌疑 5 项（其中 2 项 `crew_traits.max_value/step` 为设计同值误报，baseline 外但 exit 0）；空表 31 → 25（jobs/foods/crew_traits/generators/consumers 已填） | ✅ |
| A3 | 每个 job 的产出物 id 在 items 存在 | cp2 断言：smith/mechanic 产出物全部命中 items（A3 外键一致性） | ✅ |

## 关键输出摘录

**crew-power 测试（7/7）**：
```
✔ cp 1 jobs 恰 7 岗位且 id/name 齐
✔ cp 2 A3 外键：每个 job 的 produces 产出物 id 都在 items 存在
✔ cp 3 有源产出物仅铁匠/机械师，其余留空
✔ cp 4 crew_traits 幸福感 4 项，每项最高 25 / 每次升降 5
✔ cp 5 generators 3 种发电，标称出力比例 1:3:10
✔ cp 6 consumers 耗电设备清单非空，power_draw 无源留空
✔ cp 7 foods 食物项在 items 存在
tests 7 / pass 7 / fail 0
```

**placeholders（前后，baseline 未动）**：
```
改前：占位值嫌疑 3 项（均在 baseline）；空表 31 张
改后：占位值嫌疑 5 项（3 项在 baseline 内 + 2 项 crew_traits 设计同值误报，EXIT=0 不阻断）；空表 25 张（jobs/foods/crew_traits/generators/consumers 已填）
```

**gen**：configVersion = `07d5051fe14cb68d`；46 张表 / 497 行（原 472，+7 jobs +6 foods +4 crew_traits +3 generators +5 consumers）。

## 边界自检

- ✅ 5 张表只增列/填有源值，未动 `packages/contracts/**`、`server/db/migrations/**`、`packages/game-core/src/**`（手写）
- ✅ `items.csv`/`recipes.csv` 未动（PD7-06 口径保持）
- ✅ `placeholders.baseline.json` **未动**（遵守 B-L4 + 卡 forbidden_paths；见下「baseline 未动」）
- ⚠ 生成物 2 个 `generated/config-types.ts` 由 gen 重生成（非手写）

## baseline 未动（遵守 B-L4 + 卡 forbidden_paths）

`tools/guard/placeholders.baseline.json` **未改动**（该文件在 PD7-07 卡的 `forbidden_paths` 内，且 B-L4 规定 baseline 只由 PD7-09 更新）。

**已知误报**：placeholders 守卫将 `crew_traits.max_value=25`、`crew_traits.step=5` 标为「新增占位」（baseline 外，各 4 行全表同值）。
判定为**设计真实值**（DS §5.3:460 明确「幸福感每项最高 25 / 每次升降 5」，4 项一致是设计使然，非未填占位）。
守卫默认 exit 0 只报告，不阻断 → **A2 仍通过**。此误报登记待 PD7-09 更新 baseline 时一并处理（B-L4）。

> 注：PD7-06 填充 quality 后，baseline 的 `empty_tables` 仍列 quality（过时条目）。守卫只检查「当前空表且不在 baseline」，
> 过时条目不触发任何红，故无需改动。待 PD7-09 统一清理。

## 提交

> 提交在审查通过后补充。
