---
id: PLAN-V012-B
title: plan-v012 · 阶段 B（v1.1 数据可达 + 打捞产出）· 2 张原子任务卡
status: active
module: planning
owner: hark
created: 2026-10-30
review: 2026-11-13
related: [PLAN-V012-02, PLAN-V012-06, PLAN-V012-07]
---

# 阶段 B · 消费端接线（给 35 张表装门，给"捞"装上配置）

## 1. 本阶段存在的原因（一句话 + 四条证据）

**数据已经全在客户端包里了，但 TypeScript 层只有 11 张表有门。**

| 证据 | 事实（可复跑） |
|---|---|
| `tables.ts:18-20` | `TableName` = **11** 个键 |
| `config-types.ts` | `export interface XxxRow` = **46** 个 |
| `ls client/assets/resources/config/*.json` | **48** 个（46 表 + `_manifest` + `_placeholder`） |
| `comm` 双向差集 | 46 个 json 名与 46 个 csv 名**完全一致**（双向差集为空，本轮实测） |

→ 35 张表（含 `levels` 49 行 / `unlocks` 82 行 / `rooms` 10 行 / `jobs` 7 行 / `titles` 10 行）
**在 TypeScript 层不可达**。9 张 C 段卡的每一张都要读自己的表 → **不扩枚举，C 段全部无法开工**。

第二张卡（PD8-07）解决另一个方向的同一问题：`drops` 表 `status: active`、schema 齐全、
`weight_bp` 甚至带 `sumTo: {by: group, total: 10000}` 的生成器强制校验——**唯独 0 行数据**，
而客户端 `HookModel.ts:21` 把产出写死成 `item_0001`。这是"捞"这一环的假实现。

## 2. 前置裁决（开工前必读）

| 裁决 | 状态 | 对本阶段的影响 |
|---|---|---|
| **D-58** | ⚠ `PROPOSED` | 只影响 PD8-07 的**降级口径**：`drops` 保持"1 组 100%"还是等 D-27 细分 |
| D-57 | ⚠ `PROPOSED` | 无影响（B 段不碰 `canBuild`） |
| D-59 | ⚠ `PROPOSED` | 无影响 |

**PD8-06 零外部输入，今天即可开工。**

## 3. 阶段出口条件（缺一条不算出口）

- [ ] `TableName` 与 `TableRowMap` 各 **46** 项，`TABLE_NAMES.length === 46`
- [ ] 一条测试在 Node 下注入真实 json loader，`preload` 全部 46 张表 → `loaded=46 / failed=0`
- [ ] 40 张非空表逐表断言 `.length > 0`；6 张设计空表逐表断言 `.length === 0`（**显式列名，不许用循环兜底**）
- [ ] 打捞产出不再写死：`grep -c "数值表就位后接 drops" client/.../hook/` = **0**
- [ ] `drops.csv` 有 1 行（`weight_bp = 10000`，`sumTo` 校验通过）
- [ ] `docs/07_release/compliance/probability-disclosure.md` 不再是"（drops 表尚无数据）"
- [ ] `git diff --stat packages/game-core/src/generated/` 只有 `npm run gen` 产出的差异（无手改）

---

# PD8-06 客户端配置表可达性：`TableName` 11 → 46

- 阶段 / 角色 / 规划版本：B / executor / PLAN-R5
- 来源（E1）：`02-fact-baseline.md §1.4`（11 vs 46 vs 48 三方对照）+ `tables.ts:18-20` 原文

## 归属
- 所属切片：SB-1
- 来源需求：M-8（数据可达）
- 来源方案：`tools/gen/config.mjs:100-108`（表名 → `XxxRow` 的命名规则是**机器可推**的）

## 目标
`TableName` / `TableRowMap` 从 11 张扩到 **46 张**，使 `levels` / `unlocks` / `rooms` / `jobs` 等
35 张表在 TypeScript 层可读，并有一条**逐表断言**的测试证明它们真的能加载出来。

## 输入
- 文档：`02-fact-baseline.md §1.4`、`§1.5`（现有 6 处 `preload` 调用点）
- 契约：无（`tables.ts` 不是 `packages/contracts/**`）
- 前置任务：无
- 前置状态：46 个 json 已在 `client/assets/resources/config/`；`loadOne` 按 `config/${name}` 拼路径

## 输出
- `client/assets/scripts/services/config/tables.ts`
  （`import type` 46 个 Row、`TableName` 46 个键、`TableRowMap` 46 项、**新增导出** `TABLE_NAMES`）
- `tests/determinism/config-tables.test.mjs`（新建）

## Execution Steps
1. [ ] **先验证现状并留证**：`node -e` 统计 `config-types.ts` 的 `interface \w+Row` 数量 = 46，
       与 `tables.ts` 的 `TableName` 键数 = 11，把两个数字贴进 EVD（本卡的存在理由）
2. [ ] **用脚本生成**（禁止手抄 46 行）：命名规则已由 `tools/gen/config.mjs:102` 定死
       `table.split('_').map(cap).join('') + 'Row'`，对 46 个表名跑一遍生成三块文本
       （`import type { … }`、`TableName` 联合、`TableRowMap` 成员），粘贴进 `tables.ts`
3. [ ] 加 `export const TABLE_NAMES = [...] as const satisfies readonly TableName[]`，
       长度必须 46（供验收命令直接量化，不靠数行）
4. [ ] **不改** `table()` / `preload()` / `loadOne()` / `clearCache()` 的任何一行逻辑
       —— 本卡纯扩枚举，任何逻辑变化都属于超范围
5. [ ] 更新文件头注释与 `TableName` 上方注释：从"注册与读取引擎"补一句
       "**46 张表全部可读；`_manifest` / `_placeholder` 不是表**"
6. [ ] 写 `config-tables.test.mjs`：
       - `setLoader` 注入真实 loader：读 `client/assets/resources/config/${name}.json`
         （`node:fs` + `JSON.parse`，路径从 `import.meta.url` 推，**不写死盘符**）
       - `preload(TABLE_NAMES)` → 断言 `loaded.length === 46` 且 `failed.length === 0`
       - **40 张非空表**：逐表 `assert.ok(table(n).length > 0)`，表名**写在数组里显式列出**
         （`ad_placements, bait, blueprints, buildings, chests, consumers, crew_traits, defenses,
         event_drops, events, facilities, fish, foods, generators, guide_steps, hooks, islands,
         items, jobs, levels, lines, lockpick_tools, locks, merchants, oil, prices,
         protection_cards, quality, raft_tiles, recipes, rooms, seasons, shipwrecks, spawns,
         throwables, tides, titles, units, unlocks, zones` —— 恰好 40 个）
       - **6 张设计空表**：逐表 `assert.equal(table(n).length, 0)`，同样显式列名
         （`drops, explore, limits, phrases, regions, waves` —— 恰好 6 个）
         —— **空表被写死进测试的意义**：将来谁把空表填了，这条会红，强迫他回来改断言
       - 40 + 6 = 46，且两个数组**互不重叠、并集 = `TABLE_NAMES`**（测试里断言这层集合关系，
         防止漏了某张表却"两边都没提"）
       - `configVersion()` 返回非空字符串（证明 `_manifest` 也一起读了）
7. [ ] 跑这一步会**暴露**上游 6 个 `preload` 调用点是否仍只写 11 张（它们不改也能过）
       —— 若发现某调用点传了不在 `TABLE_NAMES` 里的表名，立即 `typecheck` 会红，属预期

## 验收标准
- [ ] A1 `command`：`npm run typecheck:client` → **0 错**（46 个 `import type` 全靠这一步证明名字没抄错）
- [ ] A2 `command`：`node --import ./tools/runtime/register.mjs --test tests/determinism/config-tables.test.mjs` → 全 PASS
- [ ] A3 `measure`：`node -e` 打印 `TABLE_NAMES.length` → **46**
- [ ] A4 `command`：`node tools/guard/run-all.mjs` → EXIT=0（含 `generated` 未被手改一项）
- [ ] A5 `review`：`git diff client/assets/scripts/services/config/tables.ts` 里
       **没有** `table(` / `preload(` / `loadOne(` / `clearCache(` 的函数体改动
- [ ] A6 `review`：`tables.ts` 仍然不 `import` 任何 `'cc'`（文件头注释第 2 行的承诺）

## 验证命令
```bash
npm run typecheck:client
node --import ./tools/runtime/register.mjs --test tests/determinism/config-tables.test.mjs
node -e "const s=require('fs').readFileSync('client/assets/scripts/services/config/tables.ts','utf8');console.log('TableName 键数≈',(s.match(/\| '[a-z_]+'/g)||[]).length)"
node tools/guard/run-all.mjs
```

## 证据路径
`docs/06_validation/evidence/EVD-8106/`
（含步骤 1 的 11/46 对照输出、步骤 6 的 46 表逐表行数清单、`TABLE_NAMES.length`）

## 允许修改
- `client/assets/scripts/services/config/tables.ts`
- `tests/determinism/config-tables.test.mjs`（新建）

## 禁止修改
- 任何 `client/assets/resources/config/*.json`（生成物）
- 任何 `game-data/source/*.csv`（本卡不改数值）
- `packages/game-core/src/generated/**`（AUTO-GENERATED）
- `packages/contracts/**`
- `client/assets/scripts/features/**`（谁要读表，让他自己提交 `preload` 调用，不在本卡）

## 依赖与阻塞
- Depends on：无
- Blocks：**PD8-07、PD8-08、PD8-09、PD8-10、PD8-11、PD8-12、PD8-13、PD8-14、PD8-15、PD8-16**（10 张）
- 阻塞条件：若某表 `preload` 后 `length === 0` 且它**不在** 6 张设计空表清单里
  → **停在证据上，不要改 json**，登记为 I-15 交主控裁决

## 建议执行档位
`sonnect`　理由：纯类型枚举扩展，无逻辑；但 46 个名字必须机器生成，手抄必错。

## 升级条件
若发现某表 json 形状与 `Row` 类型不符（`preload` 抛或读出空）
→ 升 `opus`。**按 §R-1 订正，此概率已由"高"降为"低"**（见 `10 §2`）。

## 预估规模
小（半天）

---

# PD8-07 打捞产出可配置：`drops` 表驱动 + 概率公示闭环

- 阶段 / 角色 / 规划版本：B / executor / PLAN-R5
- 来源（E1）：`HookModel.ts:20-21`（写死 `item_0001` + 假承诺注释）+ `drops.schema.json`（`status: active`，`sumTo` 10000）

## 归属
- 所属切片：SB-2
- 来源需求：M-11（打捞产出非写死）
- 来源方案：`tools/gen/config.mjs:108-114`（`docs/07_release/compliance/probability-disclosure.md` 由 `drops` 自动生成）

## 目标
一次命中产出什么物品，由 `drops` 表决定（按 group 权重抽取），不再由 `HOOK_DEMO_ITEM_ID` 决定；
并且**表格内容等于当前行为的转录**（1 组 1 行、权重 10000），不是新的平衡数值。

## 输入
- 文档：`packages/game-core/src/common/rng.ts`（`createRng` / `seedFrom` 已实现）、`drops.schema.json`
- 契约：无
- 前置任务：PD8-06（`drops` 要在 `TableName` 里才可读）
- 前置状态：`drops.csv` 只有表头（0 行）；`probability-disclosure.md` 现在写的是"（drops 表尚无数据）"

## 输出
- `game-data/source/drops.csv`（**+1 行**：`drop_001,hook_demo,item_0001,1,1,10000`）
- `packages/game-core/src/common/drop.ts`（新建，纯函数 `pickWeighted`）
- `packages/game-core/src/hook/index.ts`（新增 `rollDrop`，**不改** `powerAt` / `chargeAndCast`）
- `client/assets/scripts/features/hook/model/HookModel.ts`（`applyToSave` 接受 `itemId`；常量注释改真话）
- `client/assets/scripts/features/hook/view/HookView.ts`（命中结算处传 `itemId`）
- `tests/determinism/hook-drop.test.mjs`（新建）
- `docs/07_release/compliance/probability-disclosure.md`（`npm run gen` 自动重写，**不手改**）

## Execution Steps
1. [ ] **先验证现状并留证**：读 `drops.csv` 确认 0 行；读 `probability-disclosure.md` 确认写着
       "（drops 表尚无数据）"；`grep -n "HOOK_DEMO_ITEM_ID" -r client/` 记下全部引用点
2. [ ] 写 `drops.csv` **1 行**：
       `drop_001,hook_demo,item_0001,1,1,10000`
       —— 语义是"`hook_demo` 组唯一产出是漂流木 1~1 个，概率 100%"，
       与当前写死行为**完全等价**。`note` 不可填（schema 无该列），
       等价性说明写进 `docs/03_solution/data/` 或卡内 EVD（**不改 schema 加列**）
3. [ ] `npm run gen` → 必须 EXIT=0（`sumTo` 校验会验证 `hook_demo` 组合计 = 10000）；
       同时确认 `probability-disclosure.md` 自动生成了 `## hook_demo` 表
4. [ ] `common/drop.ts` 新建：
       ```ts
       export interface DropRow { id: string; group: string; item: string; min: number; max: number; weight_bp: number }
       /** 按 group 过滤后按 weight_bp 累加命中；rollBp ∈ [0,10000)。空组返回 null（不抛）。 */
       export function pickWeighted(rows: readonly DropRow[], group: string, rollBp: number): DropRow | null
       ```
       **纯函数**：rollBp 由调用方给，内部**不调用** `Math.random`
5. [ ] `hook/index.ts` 加：
       ```ts
       export function rollDrop(rows, group, seed: number): { item: string; count: number } | null
       ```
       内部 `createRng(seed)` → `int(min,max)` 取数量、`next()*10000` 取权重（**复用现成 `createRng`**，
       这是它第一次被业务代码调用，见 `02 §10` 的"能力已有、调用点没接"）
6. [ ] `HookModel.applyToSave(file, outcome)` → `applyToSave(file, outcome, itemId, count)`；
       `HOOK_DEMO_ITEM_ID` 重命名为 `FALLBACK_ITEM_ID` 并把注释从
       "数值表就位后接 drops 配置"改成 "**`drops` 无该 group 时的回落；正常路径走 `rollDrop`**"（I-03）
7. [ ] `HookView` 命中结算处：`const d = rollDrop(...); applyToSave(file, outcome, d?.item ?? FALLBACK_ITEM_ID, d?.count ?? 1)`
8. [ ] 写 `hook-drop.test.mjs`：
       - 等价性：`rollDrop` 对 `hook_demo` 组**任意 seed** 都返回 `item_0001`、`count === 1`
       - 确定性：同 seed 两次调用结果相同；不同 seed 在全 100% 权重下结果仍相同（证明权重真的被读）
       - 边界：`pickWeighted(rows,'no_such_group',5000) === null`；`rollBp = 9999` 仍命中
       - 权重分界：造 2 行 5000/5000 的行内夹具 → `rollBp=4999` 取第 1 行、`rollBp=5000` 取第 2 行
       - **负向**：`Math.random` 在本卡新增文件里出现次数 = 0（文本断言）

## 验收标准
- [ ] A1 `command`：`node --import ./tools/runtime/register.mjs --test tests/determinism/hook-drop.test.mjs` → 全 PASS
- [ ] A2 `command`：`npm run gen` → EXIT=0，且 `git diff docs/07_release/compliance/probability-disclosure.md` 含 `## hook_demo`
- [ ] A3 `command`：`grep -rc "数值表就位后接 drops" client/` → **0**
- [ ] A4 `command`：`grep -rn "Math.random" packages/game-core/src/` → 0（game-core 纯度）
- [ ] A5 `measure`：`drops.csv` 行数 = 1，`weight_bp` 合计 = 10000
- [ ] A6 `manual`：打捞命中后背包出现"漂流木 +1"（截图；无编辑器则记 **UNKNOWN**，不记 PASS）

## 验证命令
```bash
npm run gen
node --import ./tools/runtime/register.mjs --test tests/determinism/hook-drop.test.mjs
npm run typecheck:client
grep -rn "数值表就位后接 drops" client/ || echo "OK: 0 命中"
head -12 docs/07_release/compliance/probability-disclosure.md
```

## 证据路径
`docs/06_validation/evidence/EVD-8107/`

## 允许修改
- `game-data/source/drops.csv`（**只加 1 行**，不改其他表）
- `packages/game-core/src/common/drop.ts`、`packages/game-core/src/hook/index.ts`
- `client/assets/scripts/features/hook/model/HookModel.ts`、`view/HookView.ts`
- `tests/determinism/hook-drop.test.mjs`

## 禁止修改
- `client/assets/scripts/features/hook/view/HookPanel.ts`（PD8-05 的地盘 → O-4）
- `packages/game-core/src/common/rng.ts`（`createRng` 已够用，不许改签名）
- 任何 `*.schema.json`（若必须加 `note` 列 → 停，登记 U-8）
- `packages/contracts/**`
- 其他 45 张 `game-data/source/*.csv`

## 依赖与阻塞
- Depends on：PD8-06
- Blocks：无（B 段的独立旁支）
- 阻塞条件：**D-58 若裁 B（严守空表）** → 本卡降级为"只删假承诺注释 + 保留 `FALLBACK_ITEM_ID`"，
  不写 `drops` 行、不建 `drop.ts`，卡面记 BLOCKED-HUMAN 等 D-27

## 建议执行档位
`opus`　理由：改 C2"捞"这一环的语义，且要处理空表降级口径。

## 升级条件
若发现 `drops` 需要按武器/海域分多个 group 才有意义（即需要同时补 `spawns`/`zones` 联动）
→ 升 `fable` 并转 D-27 设计补齐，**不在本卡扩范围**。

## 预估规模
小（半天）
