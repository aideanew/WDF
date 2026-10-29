---
id: PLAN-V011-07
title: plan-v011 · 07 依赖 DAG 与所有权矩阵（含重叠处置）
status: active
module: planning
owner: hark
created: 2026-10-29
review: 2026-11-12
related: [PLAN-V011-06, PLAN-V011-08]
---

# 07 · 依赖 DAG 与所有权矩阵

## 1. 依赖 DAG（文本形式，边全部 `i → j` 且 `i < j`）

```
PD7-01 浮力口径落账
  ├─→ PD7-02 raft 规则与存档投影
  │     ├─→ PD7-03 raft 建造面板（主控）
  │     └─→ PD7-04 拒绝态 UX
  └─→ （口径定案同时解除 PD7-01 自身的数据改动）

PD7-05 海域潮汐可见            （无前置）

PD7-06 成长簇表 ──┬─→ PD7-10 progression ──┬─→ PD7-12 广告三效果
                  ├─→ PD7-13 赛季/称号      │
                  └─→ PD7-15 岛与塔防       │
PD7-07 生产簇表 ──┴─→ PD7-11 crew+power ────┤
PD7-08 战斗簇表 ──┬─→ PD7-15（兵种/波次）    │
PD7-09 玩法簇表 ──┴─→ PD7-12（limits 商店）  │
                  ├─→ PD7-13（regions/seasons/titles）
                  ├─→ PD7-14 赶海
                  └─→ PD7-16 轻玩法三件

PD7-17 合规去桩（无代码前置，外部资质前置 → BLOCKED）
```

### 1.1 可并行组（每条附机械规则的满足依据，见 §2）

| 组 | 成员 | 可开工时机 |
|---|---|---|
| **G1** | `PD7-01`、`PD7-05`、`PD7-06`、`PD7-07`、`PD7-08`、`PD7-09` | 立即（6 个，但同时**最多 3 个写入 Agent**，需分批） |
| **G2** | `PD7-02`、`PD7-10`（06 完成后）、`PD7-11`（07 完成后）、`PD7-14`（09 完成后）、`PD7-16`（09 完成后） | G1 对应前置完成 |
| **G3** | `PD7-03`（主控独占）、`PD7-04`、`PD7-13` | G2 完成后 |
| **G4** | `PD7-12`、`PD7-15` | 依赖全部完成后 |
| **G5** | `PD7-17` | 外部资质到位 |

### 1.2 必须串行的链

```
链 1（A 段主干）  PD7-01 → PD7-02 → PD7-03 → PD7-04
链 2（成长）      PD7-06 → PD7-10 → PD7-12
链 3（生产）      PD7-07 → PD7-11 → PD7-12
链 4（玩法）      PD7-09 → PD7-14 / PD7-16
链 5（战斗）      PD7-08 → PD7-15
链 6（榜单）      PD7-06 + PD7-09 → PD7-13
```

### 1.3 关键路径

```
PD7-01(0.5d) → PD7-02(0.5d) → PD7-03(1.5d) → …B 阶段… → PD7-08(2d) → PD7-15(3d)
≈ 7.5 个工作日（串行等价）
```

- **A 段**决定"v1.0 能不能被诚实地说完成"，**2.5 天**。
- **B→C 的最长链是战斗簇**（`08 → 15`，5 天）。它是全项目的工期瓶颈，也是最允许降级的一环（`mvp-scope.md:52` 授权"第 3 周末不稳就改文字结算"）。
- **D 阶段不在关键路径上**：它等外部资质，与代码并行。

### 1.4 环检测

**无环。** 判据是构造性的：所有依赖边都满足 `被依赖卡号 < 依赖卡号`（17 张卡按 `PD7-01..17` 编号，
依赖只向前不向后）。逐条核验：

| 卡 | depends_on | 是否全部 < 自身 |
|---|---|---|
| PD7-01 | — | ✅ |
| PD7-02 | 01 | ✅ |
| PD7-03 | 02 | ✅ |
| PD7-04 | 02 | ✅ |
| PD7-05 | — | ✅ |
| PD7-06~09 | — | ✅ |
| PD7-10 | 06 | ✅ |
| PD7-11 | 07 | ✅ |
| PD7-12 | 09,10,11 | ✅ |
| PD7-13 | 06,09 | ✅ |
| PD7-14 | 09 | ✅ |
| PD7-15 | 06,08 | ✅ |
| PD7-16 | 09 | ✅ |
| PD7-17 | — | ✅ |

## 2. 并行判定（机械规则，不靠"应该可以吧"）

| # | 规则 | 本版怎么满足 |
|---|---|---|
| **R-1 无共享可变状态** | 两张卡不同时改同一文件（见 §3 逐文件分配表） | G1 的 6 张卡 CSV 文件集**两两不相交**（§3.2） |
| **R-2 依赖的契约已冻结且机器可校验** | 13 个 v1.1 模块契约全部已存在（`04 §1`），本版 0 契约改动 | 无需等契约 |
| **R-3 文件所有权不相交** | 见 §3 矩阵 | 已消除 2 处重叠（§3.3） |
| **R-4 不共用同一迁移版本号** | 本版只有 PD7-14 持有 `0003`（`05 §3`） | 其余 16 张卡 `migrations: 无` |
| **R-5 最多 3 个写入 Agent 同时** | G1 有 6 张卡 → 分两批下发（批次 A1 = 01/06/07，批次 A2 = 05/08/09） | 见 `08 §2` |

**不满足任一条 → 一律标串行。** 本版没有"凭感觉认为可并行"的结论。

## 3. 所有权矩阵（Agent × 路径）

### 3.1 五个写入 Agent + 一个只读仲裁者

| Agent | 路径所有权 | 本版涉及卡片 |
|---|---|---|
| **Agent-Contract** | `packages/contracts/**` | **无**（R-1：本版不改契约） |
| **Agent-Core** | `packages/game-core/src/**`（含 `save/**`） | 02、11、15 |
| **Agent-Data** | `game-data/source/**`、`game-data/UNKNOWN-TABLES.md`、`tools/guard/placeholders.baseline.json` | 06、07、08、09 |
| **Agent-App** | `client/assets/scripts/features/**`、`services/**`、`platform/**` | 03（raft 部分）、04、05、10、11、13 的客户端段 |
| **Agent-Server** | `server/src/**`、`server/db/migrations/**` | 12、13、14、15、16、17 |
| **Agent-Guard** | `tools/guard/**`、`tests/**`（**按文件**，不按目录） | 全部（每卡只加自己的测试文件） |
| **主控（Kernel）** | `client/assets/scripts/app/**`（`MainView.ts` / `nav.ts` / `panel-types.ts` / `BootController.ts`） | **03 独占**（见 §3.3 O-1） |

### 3.2 CSV 逐文件分配（B 阶段的唯一重叠风险点，必须逐文件钉死）

| 表 | 卡片 | 表 | 卡片 |
|---|---|---|---|
| `quality` | 06 | `islands` `units` `waves` `defenses` `throwables` `protection_cards` `buildings` | 08 |
| `levels` `unlocks` `recipes`（`unlock_level`/`job` 列） `items`（`unlock_level`/`stack` 列） | 06 | `facilities`（`effect_bp` 列） | 07 |
| `jobs` `foods` `crew_traits` `generators` `consumers` | 07 | `zones` `tides` `spawns` `events` `event_drops` `fish` `bait` `phrases` `shipwrecks` `oil` `explore` `seasons` `titles` `regions` `limits` `drops` `lines` `lockpick_tools` `blueprints` `locks`（`zone_bp`/`drop_group`） `chests`（三箱同构） | 09 |
| `items`（**`capacity` 列**） `raft_tiles` | **01** | — | — |

> **`items.csv` 被 06 与 01 共同引用 → 这是唯一真实重叠点。**
> 处置：**列级拆分**。01 只改 `capacity` 列，06 只改 `unlock_level`/`stack` 列，且**01 必须先落**（A 阶段在 B 阶段之前，DAG 已保证）。
> 若 01 与 06 并行（G1 同时开工），**必须**约定 01 先提交、06 后 rebase；否则改 `items.csv` 即冲突。

### 3.3 重叠清单与处置（重叠即规划缺陷，必须消除，不许"注意一下"）

| # | 重叠 | 性质 | 处置 | 是否已消除 |
|---|---|---|---|---|
| **O-1** | `client/assets/scripts/app/MainView.ts` 需加第 7 个 Tab（PD7-03），而该文件注释写明「由核心维护，助手不得编辑」（`MainView.ts:2`） | **所有权硬冲突** | 把 PD7-03 **整卡指派给主控**（符合用户"UI 由你自己做"的要求），不派外部 Agent。App-Agent 只写 `features/raft/**` | ✅ |
| **O-2** | `server/src/gateway/handlers.ts` 是**单一文件**，PD7-12/13/14/15/16 **五张卡都要在里面加一行绑定** | **写入热点** | 指定 **Agent-Server 单写者**，五张卡按 C 阶段顺序**串行**落绑定（每卡只动自己那行 + 注释）；禁止并行改此文件 | ✅（代价：C 阶段尾部串行） |
| **O-3** | `packages/game-core/src/save/schema.ts` 被 PD7-02（A）与 PD7-11（C）都要动 | 同所有权、时间不重叠 | DAG 已保证 A 在 C 之前；额外在 `05 §3` 写明"同一文件不得并行" | ✅ |
| **O-4** | `tests/**` 每张卡都加测试 | 目录级重叠 | 规则改为**文件级独占**：每卡只新增 `tests/<layer>/<card>-<topic>.test.mjs`，**禁止修改他人测试文件**（改他人测试=覆盖别人的验收） | ✅ |
| **O-5** | `game-data/source/items.csv`（01 与 06） | 列级重叠 | 列级拆分 + 顺序保证（§3.2 注） | ✅ |
| **O-6** | `tools/guard/placeholders.baseline.json` 被 4 张 B 卡都要更新 | 单一文件 | **只有全部 B 卡完成后由 PD7-09 统一更新一次**（baseline 只减不增，分开改会互相覆盖） | ✅ |

**重叠消除后，矩阵无重叠。** 若执行期出现新重叠 → 该卡立即 `BLOCKED` 并提交 ADR，不"先写了再说"。
