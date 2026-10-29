---
id: EVD-7106
title: PD7-06 成长簇数据（levels/unlocks/quality + 两个 unlock_level 列）
status: active
owner: hark
created: 2026-10-29
review: 2026-11-29
---

# EVD-7106 · PD7-06 成长簇数据（2026-10-29）

## 目标与交付

**目标**：`progression`（PD7-10）能回答「升到 N 级解锁什么」，答案来自表而不是代码里的 if。

| 交付 | 位置 |
|---|---|
| 来源清单（B-L1） | `docs/06_validation/evidence/EVD-7106/source-list.md` |
| `unlocks` 方案 B 结构化（11 段 → 82 行每行一目标） | `game-data/source/unlocks.csv` + `unlocks.schema.json`（加 level/kind/target_id） |
| `quality` 3 档转录 | `game-data/source/quality.csv` |
| `items.unlock_level`/`stack`、`recipes.unlock_level` 留空登记 | `game-data/source/items.csv`、`recipes.csv`、`game-data/UNKNOWN-TABLES.md` |
| 结构 + 目标解析 + 等级覆盖断言 | `tests/determinism/levels-unlocks.test.mjs`（lv6-9 新增） |

## 设计决策（用户 2026-10-29 拍板 D1-D5）

| # | 决策 | 结论 |
|---|---|---|
| D1 | schema | 允许本卡更新 `unlocks.schema.json`（draft，随 c0c3c35 惯例） |
| D2 | unlocks 结构 | 方案 B 落地 = 展开每行一目标；`level`(int) + `kind`(ability/buildable/milestone) + `target_id`(string，**无外键**) |
| D3 | quality | 只登记 3 档 `id/name/note`；倍率 ×0.7/×1/×1.5 暂不进表（schema 无列），登记锚点 |
| D4 | items.stack | 106 行留空 + 登记（设计源无「堆叠上限」条文） |
| D5 | unlock_level | items/recipes 各留空 + 登记（DS §5.4:453「各物品要几级」待定） |

## 来源锚点（B-L1，逐字段）

- `unlocks.level/kind/target_id` ← `等级解锁表-草案.md`（UL:2-16；每段起点 + 新能力/新可建 + 20 级里程碑）
- `quality` 3 档 ← DS §5.5:459、材料与工具总表 §品质:185
- `unlock_level` 无源 ← DS §5.4:453「【待定】各物品要几级」
- `stack` 无源 ← 全文检索设计源无「堆叠上限」条文

## 无实体/陈旧目标（登记，不落表，B-L5）

房间框架(6-10)、勘测杆(16-19)、升高地形(20-24)、发动机机位(25-29)、投石机(30-34)：**无对应实体**。
电工房(35-39)：**§5.4:432 已取消**，UL:13 属陈旧冲突。

## 验收（当场复跑）

| # | 验收 | 实测 | 判定 |
|---|---|---|---|
| A1 | `npm run gen && node --import ./tools/runtime/register.mjs --test tests/determinism/levels-unlocks.test.mjs` | gen EXIT=0（46 表/472 行，configVersion=4f267a07b03ff932）；测试 **9/9 PASS**（lv1-9） | ✅ |
| A2 | `node tools/guard/placeholders.mjs` | 占位命中 **6 → 3**（`items.stack`/`items.unlock_level`/`recipes.unlock_level` 已消失）；剩余 3 项均非 unlock_level | ✅ |
| A3 | UNKNOWN-TABLES.md 每条来源未明字段含文档锚点 | items.stack/unlock_level、recipes.unlock_level、6 个无实体目标、quality 倍率——每条含 DS/UL 锚点 | ✅ |
| A4 | levels 与 unlocks 关联只单向 | `levels.csv` 未动；仅 `unlocks.level` 单向引用（方案 B） | ✅ |

## 关键输出摘录

**levels-unlocks 测试（9/9）**：
```
✔ lv 6 unlocks 为结构化目标表（每行一目标，方案 B）— 82 行
✔ lv 7 unlocks 等级段起点与设计源一致（含 20 级驶出浅海里程碑）
✔ lv 8 每个 buildable 目标都能在 items/facilities/buildings 解析到实体
✔ lv 9 等级段覆盖 1..49（每级都落在某段，progression 可查）
tests 9 / pass 9 / fail 0
```

**placeholders（前后）**：
```
改前：占位值嫌疑 6 项（items.stack=99、items.unlock_level=0、recipes.unlock_level=0 在内）；空表 31 张
改后：占位值嫌疑 3 项（items.capacity=0、facilities.effect_bp=10000、locks.zone_bp=0）；空表 30 张（quality 已填）
```

**gen**：configVersion = `4f267a07b03ff932`（原 e68ce0ba2ba20957）；46 张表 / 472 行（原 398，+82 unlock −11 旧段 +3 quality）。

## 边界自检

- ✅ `items.csv` 只 `stack`/`unlock_level` 两列变（capacity/weight 原样，PD7-01 口径未动）
- ✅ 无手写 `.ts` 改动（仅 2 个 generated `config-types.ts`，gen 重生成）
- ✅ `placeholders.baseline.json` 未动（B-L4：只有 PD7-09 能改）
- ✅ `packages/contracts/**`、`server/db/migrations/**`、`packages/game-core/src/**`（手写）未动

## 提交

> 提交在审查通过后补充。
