---
id: PLAN-V012-07
title: plan-v012 · 依赖 DAG 与所有权矩阵（含 6 处重叠的消除）
status: active
module: planning
owner: hark
created: 2026-10-30
review: 2026-11-13
related: [PLAN-V012-06, PLAN-V012-08]
---

# 07 · 依赖 DAG 与所有权

## 1. 依赖 DAG（构造性无环证明）

**无环证明方法**：所有边都满足 `i → j 且 i < j`（卡号单调递增）。卡号是全序，因此不可能成环。
下表列出**全部**边，可逐条核对 `i < j`。

| 卡 | depends_on | 边 |
|---|---|---|
| PD8-01 | — | 无 |
| PD8-02 | — | 无 |
| PD8-03 | PD8-02 | 02→03 ✅ |
| PD8-04 | PD8-03 | 03→04 ✅ |
| PD8-05 | — | 无（只依赖已存在的 `tideState`） |
| PD8-06 | — | 无 |
| PD8-07 | PD8-06 | 06→07 ✅ |
| PD8-08 | PD8-06 | 06→08 ✅ |
| PD8-09 | PD8-06 | 06→09 ✅ |
| PD8-10 | PD8-06 | 06→10 ✅ |
| PD8-11 | PD8-02, PD8-03, PD8-06 | 02→11、03→11、06→11 ✅ |
| PD8-12 | PD8-06 | 06→12 ✅ |
| PD8-13 | PD8-06 | 06→13 ✅ |
| PD8-14 | PD8-06, PD8-08 | 06→14、08→14 ✅ |
| PD8-15 | PD8-06, PD8-08, PD8-09 | 06→15、08→15、09→15 ✅ |
| PD8-16 | PD8-06 | 06→16 ✅ |
| PD8-18 | — | 无（只改测试断言，不依赖任何实现） |
| PD8-17 | — | 无（外部阻塞） |

**最大入度 = 3**（PD8-11、PD8-15）。**无环。**

**关键路径**：

```
链 A：PD8-02 → PD8-03 → PD8-04            （3 层）
链 B：PD8-02 → PD8-03 → PD8-11            （3 层）
链 C：PD8-06 → PD8-08 → PD8-14            （3 层）
链 D：PD8-06 → PD8-09 → PD8-15            （3 层）
```

四条链长度相同（各 3 卡），**没有单一瓶颈**。

## 2. 并行判定（逐组给机械依据，不写"应该可以"）

**机械规则四条**（全部满足才可并行）：
① 无共享可变状态 ② 契约已冻结且机器可校验 ③ 文件所有权不相交 ④ 不共用同一迁移版本号

**全局事实**：本版 18 张卡**没有任何一张改 `packages/contracts/**`**（`04 §3`：13 个模块无契约）、
**没有任何一张建表或改迁移**（`05 §1/§2`）。所以 ② 与 ④ **全局自动满足**。
逐组只需验 ① 与 ③。

### G1（3 个写入者并行 + 1 个串行收尾）

| 卡 | 触碰的写路径 |
|---|---|
| PD8-01 | `.product-development/task-index.json`、`~/.git-pat`（`chmod 600`）、`docs/06_validation/execution-ledger.md`、`docs/00_governance/document-index.md`（`npm run gen:docs` 重生成） |
| PD8-02 | `packages/game-core/src/raft/**`、`packages/game-core/src/save/**`、`tests/determinism/raft.test.mjs` |
| PD8-06 | `client/assets/scripts/services/config/tables.ts`、`tests/determinism/config-tables.test.mjs` |
| **PD8-18（串行，前 3 张完成后）** | `tests/determinism/items-weights.test.mjs` |

- ① 四路径集合两两交集为空 ✅　③ ✅
- **并行度**：前 3 张并行（=3，未破"同时最多 3 个写入 Agent"），PD8-18 作为 G1 的收尾串行
- **可并行：是（3 并行 + 1 串行）**

### G2（3 个写入者）

| 卡 | 触碰的写路径 |
|---|---|
| PD8-03 | `client/assets/scripts/features/raft/**`、`app/MainView.ts`、`app/panel-types.ts` |
| PD8-05 | `client/.../services/time/**`、`client/.../features/sea/**`、`client/.../features/hook/view/HookPanel.ts`、`app/BootController.ts`、`tests/determinism/sea-tide.test.mjs` |
| PD8-07 | `client/.../features/hook/model/HookModel.ts`、`client/.../features/hook/view/HookView.ts`、`tests/determinism/hook-drop.test.mjs` |

- ① PD8-05 碰 `hook/view/HookPanel.ts`，PD8-07 碰 `hook/view/HookView.ts` + `hook/model/HookModel.ts` → **不同文件** ✅
- ③ `app/MainView.ts` 由 PD8-03 独占；`app/BootController.ts` 由 PD8-05 独占 → 不重叠 ✅
- **可并行：是**

### G3（3 个写入者）

| 卡 | 触碰的写路径 |
|---|---|
| PD8-04 | `app/ux-hint.ts`、`client/.../features/raft/view/RaftPanel.ts`、`tests/determinism/ux-hint.test.mjs` |
| PD8-08 | `packages/game-core/src/progression/**`、`client/.../features/progression/**`、`game-data/source/{recipes,items}.csv`（**仅 `unlock_level` 列**）、`tools/guard/placeholders.baseline.json`、`tests/determinism/progression.test.mjs` |
| PD8-09 | `packages/game-core/src/crew/**`、`client/.../features/crew/**`、`tests/determinism/crew.test.mjs` |

- ① ✅（`app/ux-hint` + `raft/view` / `progression` / `crew` 三簇不相交）
- ③ ✅
- `placeholders.baseline.json` **只有 PD8-08 碰**（§3 O-6）→ 不构成共享状态
- **可并行：是**

### G4（3 个写入者）

| 卡 | 触碰的写路径 |
|---|---|
| PD8-10 | `packages/game-core/src/power/**`、`client/.../features/power/**`、`tests/determinism/power.test.mjs` |
| PD8-11 | `packages/game-core/src/raft/**`、`client/.../features/raft/**`、`tests/determinism/raft-rooms.test.mjs` |
| PD8-12 | `packages/game-core/src/fishing/**`、`client/.../features/fishing/**`、`tests/determinism/fishing.test.mjs` |

- ① ✅（power / raft / fishing 三簇不相交）
- ③ PD8-11 碰 `raft` 与 `features/raft`——但 PD8-02/03 已在 G1/G2 完成 → 同批无冲突 ✅
- **可并行：是**

### G5（3 个写入者）

| 卡 | 触碰的写路径 |
|---|---|
| PD8-13 | `packages/game-core/src/salvage/**`、`server/src/modules/salvage/**`、`client/.../features/salvage/**`、`tests/determinism/salvage.test.mjs` |
| PD8-14 | `packages/game-core/src/island/**`、`packages/game-core/src/defense/**`、`client/.../features/island/**`、`client/.../features/defense/**`、`tests/determinism/defense.test.mjs` |
| PD8-15 | `packages/game-core/src/event/**`、`packages/game-core/src/leaderboard/**`、`server/src/modules/event/**`、`client/.../features/event/**`、`client/.../features/leaderboard/**`、`tests/determinism/event.test.mjs` |

- ① ✅（salvage / island+defense / event+leaderboard 三簇不相交）
- ③ ✅
- **可并行：是**

### G6（1 个写入者）

| 卡 | 触碰的写路径 |
|---|---|
| PD8-16 | `server/src/modules/social/**`、`client/.../features/social/**`、`client/.../features/compliance/**`、`client/.../features/ads/**`、`tests/determinism/social.test.mjs` |
| PD8-17 | **BLOCKED-HUMAN，本版不执行** |

- **可并行：无并行对象**（单卡）

### 串行链（明确标出，不假装并行）

| 链 | 为什么串行 |
|---|---|
| PD8-02 → PD8-03 | 03 调用 02 产出的 `canBuild` / `applyBuild` |
| PD8-03 → PD8-04 | 两者都改 `features/raft/view/RaftPanel.ts` |
| PD8-06 → 9 张 C 段卡 | 都要读表，`TableName` 不扩就不可达 |
| PD8-02/03 → PD8-11 | 都改 `raft` 命名空间 |
| PD8-08 → PD8-14 | 塔防需要"建筑解锁等级"，来自 progression |
| PD8-08/09 → PD8-15 | 每日一海与称号需要等级、员工产出作为达成条件 |

## 3. 所有权矩阵（Agent × 路径）

| Agent | 独占写路径 | 与其他 Agent 重叠 |
|---|---|---|
| **Agent-Governance** | `.product-development/**`、`docs/06_validation/execution-ledger.md` | 无 |
| **Agent-Core** | `packages/game-core/src/{raft,crew,power,progression,fishing,salvage,island,defense,event,leaderboard,save}/**` | 无（按模块分目录） |
| **Agent-Client-Raft（主控独占）** | `client/.../features/raft/**`、`app/MainView.ts`、`app/panel-types.ts`、`app/ux-hint.ts` | 无 |
| **Agent-Client-Module** | `client/.../features/{progression,crew,power,fishing,salvage,island,defense,event,leaderboard,social,compliance,ads}/**` | 无 |
| **Agent-Client-Shell** | `client/.../features/{hook,sea}/**`、`client/.../services/{time,config}/**`、`app/BootController.ts` | 无 |
| **Agent-Server** | `server/src/modules/{salvage,event,social}/**` | 无 |
| **Agent-Data** | `game-data/source/*.csv`（按列）、`tools/guard/placeholders.baseline.json` | 见 O-6 |
| **Agent-Test** | `tests/determinism/items-weights.test.mjs`（**只有 PD8-18 用**） | 无 |

### 七处重叠及消除

| # | 重叠 | 消除方式 |
|---|---|---|
| **O-1** | `features/raft/**` 原被 PD8-02/03/04/11 四方触碰 | 02 只改 core（不碰 client）；03 独占 client；04 依赖 03 串行；11 依赖 02+03 串行 |
| **O-2** | `app/MainView.ts` 是多路冲突历史热点 | **PD8-03 整卡独占**，其他卡一律不得触碰 |
| **O-3** | `app/BootController.ts` 原计划被 PD8-04（订正注释 I-02）与 PD8-05（加 `syncFromServer`）触碰 | PD8-04 **移除**对该文件的改动；注释订正顺带进 PD8-05 |
| **O-4** | `features/hook/view/` 被 PD8-05（HookPanel）与 PD8-07（HookView）触碰 | 分文件：HookPanel vs HookView+HookModel，卡面写明"只改本文件" |
| **O-5** | `features/compliance/**` 被 PD8-16（UI 壳）与 PD8-17（去桩）触碰 | PD8-17 是 BLOCKED-HUMAN 本版不执行；PD8-16 卡面**禁止改合规判定逻辑**，只做展示 |
| **O-6** | `tools/guard/placeholders.baseline.json` 是共享单文件 | **只有 PD8-08 会改它**（唯一改已有列语义的卡：`unlock_level` 从空变有值 → 同值命中集合变化）。其余 17 卡（PD8-18 只改测试）不填数值 → 不产生新同值命中 → 不改 baseline |
| **O-7** | `items-weights.test.mjs` 的断言口径（D-54 前后语义冲突） | 由 **PD8-18 独占**；其余卡不得改这一文件（它不是任何卡的数据契约） |

**矩阵结论**：七处重叠全部消除，**没有一处"两个人同时改同一文件"**。

## 4. 并行纪律（写进每张卡）

```
✅ 允许并行：不同所有权、同一冻结契约、不改同一迁移版本号
❌ 禁止并行：
   - 同时改 packages/contracts/**（本版零契约改动，任何卡想改 → 停）
   - 同时改 app/MainView.ts（PD8-03 独占）
   - 同时改 tools/guard/placeholders.baseline.json（PD8-08 独占）
   - 任何卡想建 0003_*.sql → 停（本版无卡建表）
   - 一边改错误码、一边让前端猜字段（本版零错误码改动）
```

## 5. 关键路径与工期

| 组 | 卡 | 估算（按 `08 §2` 档位） |
|---|---|---|
| G1 | PD8-01 + PD8-02 + PD8-06（并行）+ PD8-18（串行） | 0.5 + 0.5 = 1.0（并行取最大 0.5，+ 0.25 串行收尾 = **0.75 天**） |
| G2 | PD8-03 + PD8-05 + PD8-07 | 1.5 + 0.5 + 0.5 → **1.5 天** |
| G3 | PD8-04 + PD8-08 + PD8-09 | 0.5 + 1.5 + 1 → **1.5 天** |
| G4 | PD8-10 + PD8-11 + PD8-12 | 0.5 + 1 + 1 → **1 天** |
| G5 | PD8-13 + PD8-14 + PD8-15 | 1 + 2 + 1.5 → **2 天** |
| G6 | PD8-16 | **1 天** |

**合计 ≈ 7.75 个工作日**（六个批次串行 + 批内并行）。
若只做"v1.0 窄口径"（G1 全部 + G2 + G3 的非 C 部分）→ **≈ 3.75 天**。
工期是**档位换算不是实测**（本仓无"卡→人天"统计样本），只能读作相对排序。
