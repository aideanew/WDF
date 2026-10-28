---
id: EVD-7032
title: `levels`/`unlocks` 落地（D-42=C 代定/转录）
status: accepted
owner: hark
created: 2026-10-28
review: 2026-11-28
---

# EVD-7032 —— `levels`/`unlocks` 落地（D-42=C 代定/转录）

- **对应任务**：plan-v010 TASK-7032（`05-slices-and-cards.md` §5 S3）
- **执行者**：主控
- **独立验收者**：子智能体（防自证循环，结论待填）
- **采集时间**：2026-10-28
- **前置裁决**：D-42 = **C**（只补核心循环必需 4 张表 levels/unlocks/raft_tiles/rooms，其余移 v1.1；授权 hark 代定）

## 处置结论

- **levels**（49 行）：等级 1–49（首版上限，设计源已定）；`exp_to_next` = **代定线性曲线** `100+20×(lv−1)`
  （L1→2=100、L49→50=1060，累计到 49 级 ≈27k）。设计源只给"经验来自打捞+建设"未给曲线（DS 1.4）→ 曲线数值为授权代定，标记可调。
- **unlocks**（11 行）：等级解锁表-草案的等级段注册表（1-5/6-10/11-15/16-19/20/20-24/25-29/30-34/35-39/40-44/45-49）。
  等级段结构与 20 级驶出浅海里程碑为设计源【已定】；各段具体内容（新能力/新可建）为 **Hark 设计【建议】待用户审**，仅作信息登记。
  无独立数值字段，不参与平衡计算。**未改 schema**（unlocks 保持 id/name/note，内容为 Hark 建议故不新增字段设计）。

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | levels 恰 49 行，id 为 1..49 连续无缺号重号 | **PASS** | lv 1 |
| 2 | exp_to_next 非负整数且随等级单调不减 | **PASS** | lv 2 |
| 3 | 经验曲线代定公式 exp_to_next = 100+20×(lv−1) | **PASS** | lv 3 |
| 4 | 里程碑：等级 20 存在（驶出浅海） | **PASS** | lv 4 |
| 5 | 总经验量级自检（到 49 级 ≈27k） | **PASS** | lv 5 |
| 6 | unlocks 恰 11 行等级段注册表（id 唯一、name/note 非空） | **PASS** | lv 6 |
| 7 | unlocks 等级段起点与设计源一致（1/6/11/16/20/20/25/30/35/40/45，含 20 级驶出浅海） | **PASS** | lv 7 |
| 8 | gen:config 通过 + configVersion 更新 | **PASS** | gen exit 0；configVersion `b840f54f`→`20a313a4` |
| 9 | 代定/转录如实标记（UNKNOWN-TABLES，非伪装设计源原值） | **PASS** | `UNKNOWN-TABLES.md` §一/§三 |

## 反证（独立验收者）

- `npm run guard` 全过（含"生成物未手改且已同步"）。
- 未改 `raft_tiles`/`rooms`（属 7033，已提交）；未改 `items.csv`（属 7031，已提交）；未改 schema（.schema.json，config-types 仅 configVersion 注释变化）；未改 packages/contracts、未改 server/src、未改 design-source。
- unlocks 内容为 Hark 建议（等级解锁表-草案标注"其余为 Hark 设计【建议】待用户审"），已如实标记，未伪装成已定值。
- 注意：unlocks 无独立数值字段（id/name/note），不参与平衡计算，仅作等级段解锁信息登记。

## 变更清单（单卡）

- `game-data/source/levels.csv`（新增 49 行，exp 曲线代定）
- `game-data/source/unlocks.csv`（新增 11 行，等级段注册表）
- `game-data/UNKNOWN-TABLES.md`（§一/§二/§三/§五 同步）
- 生成物：`server/generated/config/{levels,unlocks}.json`、`client/assets/resources/config/{levels,unlocks}.json`、`config-types.ts`（game-core + client generated，仅 configVersion）、`_manifest.json`、`_sync-manifest.json`、`probability-disclosure.md`
- `tests/determinism/levels-unlocks.test.mjs`（新增 7 例）

原始输出：`levels-test.txt` / `guard.txt` / `gen-config.txt`。
