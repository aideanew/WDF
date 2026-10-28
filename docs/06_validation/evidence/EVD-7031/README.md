---
id: EVD-7031
title: `items.weight`/`capacity` 真实值（D-43=B 授权代定）
status: accepted
owner: hark
created: 2026-10-28
review: 2026-11-28
---

# EVD-7031 —— `items.weight`/`capacity` 真实值（D-43=B 授权代定）

- **对应任务**：plan-v010 TASK-7031（`05-slices-and-cards.md`）
- **执行者**：主控
- **独立验收者**：子智能体（防自证循环，结论 **PASS**，完成度 100%）
- **采集时间**：2026-10-28
- **前置裁决**：D-43 = **B**（授权 hark 代定一版，标记为可调值，进 UNKNOWN-TABLES.md 而非伪装设计源原值）

## 处置结论（代定，标记可调）

`items.csv` 106 行 `weight`/`capacity` 由 D-07 占位（全 1 / 全 0）改为 D-43=B 代定一版：
- **weight**：按品类 原料1/工具3/设备10 —— raw/material/food/misc=1、tool/lock/chest=3、equipment/facility=10。
- **capacity**：仅 3 容器（chest 类）>0 —— 木箱20/铜箱40/铁箱60；其余 0。
- 均标记**可调值**（UNKNOWN-TABLES.md §三「代定可调（D-43=B）」，非设计源原值）。

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | 全表 weight ∈ {1,3,10} | **PASS** | items-w 1（106 行） |
| 2 | 品类→weight 映射符合 D-43=B | **PASS** | items-w 2（逐行 category→weight） |
| 3 | 容器 capacity>0 且递增 | **PASS** | items-w 3（木<铜<铁，20/40/60） |
| 4 | 非容器 capacity=0 | **PASS** | items-w 4 |
| 5 | weight/capacity 非负整数 | **PASS** | items-w 5 |
| 6 | 浮力自洽（容器装载后可留正浮力） | **PASS** | items-w 6 |
| 7 | gen:config 通过 + configVersion 更新 | **PASS** | gen exit 0；configVersion `c6a54f0f`→`d26435e1` |
| 8 | 标记可调（UNKNOWN-TABLES 代定可调，非设计源原值） | **PASS** | `UNKNOWN-TABLES.md` §三 items.weight/capacity 两行「代定可调（D-43=B）」 |

## 反证（独立验收者）

- `gen:config` 后 `npm run guard` 全过（含"生成物未手改且已同步"）；config-types.ts 经 sync 同步。
- 品类级代定的已知局限：`misc`（含 发电机/发动机，本应 10）与 `facility`（含 筏块）品类内异质，已写入 UNKNOWN-TABLES 备注为可调局限。
- 未改 design-source 原值；未改 `raft_tiles`/`rooms`（属 7033）、`levels`/`unlocks`（属 7032）。

## 变更清单（单卡）

- `game-data/source/items.csv`（weight/capacity 代定）
- `game-data/UNKNOWN-TABLES.md`（§三 标记代定可调）
- 生成物：`server/generated/config/items.json`、`client/assets/resources/config/items.json`、`config-types.ts`（game-core + client generated）、`_manifest.json`、`_sync-manifest.json`、`probability-disclosure.md`（configVersion）
- `tests/determinism/items-weights.test.mjs`（新增 6 例）

原始输出：`items-test.txt` / `guard.txt` / `gen-config.txt`。
