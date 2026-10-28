# EVD-7033 —— `raft_tiles`/`rooms` 落地（D-42=C 代定/注册）

- **对应任务**：plan-v010 TASK-7033（`05-slices-and-cards.md` §5 S3）
- **执行者**：主控
- **独立验收者**：子智能体（防自证循环，结论待填）
- **采集时间**：2026-10-28
- **前置裁决**：D-42 = **C**（只补核心循环必需 4 张表 levels/unlocks/raft_tiles/rooms，其余移 v1.1；授权 hark 代定）

## 处置结论

- **raft_tiles**（1 行）：船体材料 `raft_block`（筏块 = item_0072），`capacity`=50（浮力贡献，代定）、`weight`=10（与 items 品类一致）。
  设计源给「浮力 = 船体材料容量之和」但未给数值（DS 3.19/3.22「具体数值配表时定」）→ capacity 为授权代定，标记可调。
- **rooms**（10 行）：设计源室内房间类型注册表（铁匠/农场/兵营/厨房/大仓库/货舱/潜水工坊/机械工坊/锁匠铺/科研部），
  均取自设计源 §8.3/3.19/5.4；类型注册，非数值，非代定。

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | raft_tiles 恰 1 行（筏块为当前唯一船体材料） | **PASS** | raft-t 1 |
| 2 | raft_block.item 引用存在且为 facility 类（筏块） | **PASS** | raft-t 2 |
| 3 | 筏块净浮力为正（扩筏可行） | **PASS** | raft-t 3 |
| 4 | capacity/weight 非负整数 | **PASS** | raft-t 4 |
| 5 | 浮力自洽（复用 remainingBuoyancy） | **PASS** | raft-t 5 |
| 6 | rooms 设计源室内房间类型注册表（≥8、id 唯一、note 含 DS 引用） | **PASS** | raft-t 6 |
| 7 | gen:config 通过 + configVersion 更新 | **PASS** | gen exit 0；configVersion `d26435e1`→`b840f54f` |
| 8 | 代定/注册如实标记（UNKNOWN-TABLES，非伪装设计源原值） | **PASS** | `UNKNOWN-TABLES.md` §一/§三 |

## 反证（独立验收者）

- `npm run guard` 全过（含"生成物未手改且已同步"）。
- 未改 `levels`/`unlocks`（属 7032）、`items.csv`（属 7031，已提交）；未改 schema（config-types 仅 configVersion 注释变化，类型未变）。
- 未改 design-source 原值；rooms 为类型注册（无编造数值）；raft_tiles.capacity 为 D-42=C 授权代定并标记可调。
- 注意语义区分：`raft_tiles.capacity`（浮力贡献）≠ `items.capacity`（储物），已写入 UNKNOWN-TABLES 备注。

## 变更清单（单卡）

- `game-data/source/raft_tiles.csv`（新增 1 行，代定）
- `game-data/source/rooms.csv`（新增 10 行，注册表）
- `game-data/UNKNOWN-TABLES.md`（§一/§二/§三/§五 同步）
- 生成物：`server/generated/config/{raft_tiles,rooms}.json`、`client/assets/resources/config/{raft_tiles,rooms}.json`、`config-types.ts`（game-core + client generated，仅 configVersion）、`_manifest.json`、`_sync-manifest.json`、`probability-disclosure.md`
- `tests/determinism/raft-tiles.test.mjs`（新增 6 例）

原始输出：`raft-test.txt` / `guard.txt` / `gen-config.txt`。
