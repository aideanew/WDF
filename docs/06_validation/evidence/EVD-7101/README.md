---
id: EVD-7101
title: PD7-01 浮力口径落账（D-54 Q2=A：items.capacity 归 0 不参与浮力）
status: active
owner: hark
created: 2026-10-29
review: 2026-11-29
---

# EVD-7101 · PD7-01 浮力口径落账（2026-10-29）

## 目标与交付

**目标**：`raft_tiles` 与 `items.capacity` 的语义有一句话的定论（D-54 Q2=A），且该定论被一条测试锁定。

| 交付 | 位置 |
|---|---|
| D-54 Q2=A 口径句（原文照录） | `docs/03_solution/data/config-tables.md`「口径」节 |
| `items.capacity` 3 行 chest（20/40/60）置 0 | `game-data/source/items.csv`（**不删列**） |
| 口径出处 + 误填判定登记 | `game-data/UNKNOWN-TABLES.md` 第三节 items.capacity 行 |
| 两条断言（正算 + 反证） | `tests/determinism/raft-tiles.test.mjs`（raft-t 7/8） |
| placeholders baseline 同值条目 | `tools/guard/placeholders.baseline.json`（**单独提交** 99f57cb） |

## D-54 Q2=A 原文（抄自 `decision-index.json`，不改措辞）

> 浮力 = Σ raft_tiles.capacity − (Σ 船体地块自重 + 货重)；items.capacity 一律归 0，语义改为「保留列位、不参与浮力计算」。

## 验收（当场复跑）

| # | 验收 | 实测 | 判定 |
|---|---|---|---|
| A1 | `npm run gen && node --import ./tools/runtime/register.mjs --test tests/determinism/raft-tiles.test.mjs` | gen EXIT=0；测试 **8/8 PASS**（6 既有 + raft-t 7/8 新增） | ✅ |
| A2 | `node tools/guard/placeholders.mjs` | 「占位值嫌疑 6 项（**均在 baseline 内**）」，**0 baseline 外新增**；EXIT=0 | ✅ |
| A3 | `config-tables.md` 能搜到「浮力 = 」口径句 | 恰 **1** 处（唯一口径句） | ✅ |
| A4 | `git diff --stat game-data/source/raft_tiles.csv` 为空 | **空**（本卡未动 raft_tiles.csv） | ✅ |
| A5 | `grep -rn "\.capacity" client/assets/scripts packages/game-core/src` | 仅 `packages/game-core/src/raft/index.ts:10` `t.capacity`（`Load.capacity`，浮力循环内），**无 `items.capacity`** | ✅ |
| A6 | `awk -F, 'NR>1 && $6!="0"' game-data/source/items.csv` 无输出 | **无输出**（capacity 列全 0） | ✅ |

## 关键输出摘录

**raft-tiles 测试（8/8）**：
```
✔ raft-t 7 正算：1 块筏块（capacity50/weight10）→ 剩余浮力 = 50−10−货重（D-54 Q2=A 口径）
✔ raft-t 8 反证：remainingBuoyancy 不读 items.capacity（D-54 Q2=A，只认 Load[] 入参）
tests 8 / pass 8 / fail 0
```

**placeholders（baseline 更新前 → 后）**：
```
更新前：占位值嫌疑 6 项，其中 items.capacity = 0 (rows 106) ← baseline 外新增（1 项）
更新后：占位值嫌疑 6 项（均在 baseline 内），0 新增
```

**gen**：`configVersion = e68ce0ba2ba20957`（原 20a313a478737571）；46 张表 / 398 行。

## 口径说明（防误读）

- `items.capacity` **不参与浮力**（D-54 Q2=A）——浮力只由 `raft_tiles.capacity` 贡献。`chest` 的 20/40/60 判定为**误填**（箱子凭什么提供浮力，设计源 DS 3.19 无此条文），已置 0。
- **保留 `capacity` 列**：不删列以免破坏 schema 与 `npm run gen` 流程（列位保留、语义改「不参与浮力」）。
- **反证断言（raft-t 8）用内存构造的 `Load[]`，不读 `items.csv`**：验的是**公式不含 items.capacity**，不是验数据文件（数据文件由 items.csv 的置 0 负责）。若公式日后被改成查 items.capacity，则要么 import items（违反 game-core 纯度）、要么改签名——两者本断言都会暴露。

## 提交

- `99f57cb`（单独）：placeholders baseline 补 `items.capacity=0` 同值条目（坑一：不混进主提交）
- `1f3238e`（主）：D-54 Q2=A 落账（items.csv / config-tables / UNKNOWN-TABLES / raft-tiles.test + gen 产物）

> **未推送**：遵用户明令（token 泄露待轮换，`~/.git-pat` 就绪前不推送）。
