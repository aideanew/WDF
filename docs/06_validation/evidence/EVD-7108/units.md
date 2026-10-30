---
id: EVD-7108-A2
title: PD7-08 · A2 证据 · units 3 兵种
status: active
owner: hark
created: 2026-10-30
review: 2026-11-30
---

# EVD-7108 · A2 证据 · units 3 兵种

## 结论

`game-data/source/units.csv` 恰 **3 行**（非 9），category 覆盖 **melee / ranged / tank 各 1**。

| id | name | category | 依据 |
|---|---|---|---|
| unit_infantry | 轻步兵 | melee | U-02：近战取解锁等级最低（代定推断，见下） |
| unit_archer | 弓箭兵 | ranged | U-02：远程取解锁等级最低（代定推断，见下） |
| unit_cavalry | 重骑兵 | tank | U-02：坦克取解锁等级最低（代定推断，见下） |

## 判定依据

- **已定**（U-02，设计要点记录.md:747）：v1.0 三个兵种 = 近战/远程/坦克各 1，每类取**解锁等级最低**。
- **无源**：设计源**未给兵种解锁等级**（DS §7.2:517 数值待定），也未明确 9 兵种的近战/远程/坦克分类。
- **代定推断**：因无源，采用每类最基础代表的合理推断（轻步兵=近战基础兵、弓箭兵=远程基础兵、重骑兵=坦克/骑乘兵）。
- **待用户确认可改**：用户 2026-10-30 对「3 兵种具体是谁」未指名（答"上述全都要"），故本选取为代定，若用户后续明确 3 个名字，可改 units.csv 的 id/name/category。

## 兵种数值（待定，留空）

- 兵种 hp/speed/attack/range ← DS §7.2:517「具体数值和升级消耗待定」→ 全部留空（B-L5，不编）。
- unlock_level ← 设计源未给（U-02 只给原则）→ 留空。

## 相关

- 其余 6 兵种 + 弩车：登记 v1.2（A4，见 UNKNOWN-TABLES 三之四 §3）。
- 来源清单：`source-list.md`。
