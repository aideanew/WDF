---
id: PLAN-V011-B
title: plan-v011 · 阶段 B（v1.1 数据解锁）· 4 张原子任务卡
status: active
module: planning
owner: hark
created: 2026-10-29
review: 2026-11-12
related: [PLAN-V011-06, PLAN-V011-05]
---

# 阶段 B · v1.1 数据解锁（先数据，后代码）

## 1. 本阶段的存在理由（一条证据）

**31 张表 0 行**（`02 §1.7`，逐表可数）。13 个 v1.1 模块里 **11 个的第一阻塞点是同一个**：
表里没有参数，任何实现都只能编（`plan-v010/02 §2.1` 原文：未实现 13 个里有 11 个的第一阻塞点是同一个：数值表 0 行）。

## 2. 本阶段的铁律（比任何一张卡都重要）

| # | 铁律 | 违反的后果 |
|---|---|---|
| **B-L1** | **第一步永远是"提交来源清单"，不是"填数字"** | 交不出来 → 该表 `BLOCKED`，卡停下。**不许为了"让表非空"而填占位值** |
| **B-L2** | 「补列」与「填数」是两个动作，**必须先补列再填数** | `unlocks/rooms` 只有 `id,name,note` 三列（`05 §5`），列不齐时填数=自己发明列名 |
| **B-L3** | 每张卡结束必须跑 `placeholders.mjs`，并把命中数**报出来** | 31 张空表降为 0 是本阶段的唯一硬指标 |
| **B-L4** | `placeholders.baseline.json` **只在全部 B 卡完成后由 PD7-09 统一更新一次**（O-6） | 分开改会互相覆盖 |
| **B-L5** | 任何"设计文档里没有、但实现需要"的数字 → 登记 `UNKNOWN-TABLES.md`，**不填** | 本项目已因自编数值栽过一次（`items.weight` 全 1 → 浮力恒负） |

## 3. 阶段出口条件

- [ ] `game-data/source/*.csv` 中 **0 行**的表数 = **0**（31 → 0）
- [ ] `node tools/guard/placeholders.mjs` 命中项**只减不增**，且 baseline 已统一更新并单独提交
- [ ] `npm run gen && npm run test` 全绿（本阶段出口跑一次，不算全量回归）
- [ ] `game-data/UNKNOWN-TABLES.md` 里每条"待补"都写明**卡在哪份文档的哪一节**

> **本阶段不接受"表非空但值可疑"的交付。** 同值字段（如某列全是 `1`）会被第 10 项守卫抓出来，
> 且守卫只报"baseline 外新增"，所以**填假值比留空更糟**——留空会被守卫如实报告，填假值会污染整条链。

---

# PD7-06 成长簇数据（levels / unlocks / quality + 两个 unlock_level 列）

- 阶段 / 角色 / 规划版本：B / executor / PLAN-R4
- 来源（E1）：D-50（31 张空表清单，含 `quality`）+ `mvp-scope.md:26`（等级与驶出浅海）

## 归属
- 所属切片：SB-1
- 来源需求：mvp-scope §2 表第 3 行（`raft/crew/power/progression`：等级与驶出浅海）→ 设计源 v5.5 §5
- 来源方案：`05-data-model-baseline.md §5`

## 目标
`progression`（PD7-10）能回答"升到 N 级解锁什么"，且答案来自表而不是代码里的 if。

## 输入
- 文档：设计源 v5.5 §5（等级）、v5.5 §13（配方解锁）
- 契约：无（CSV 不进契约）
- 前置任务：无
- 前置状态：`levels 49 行`（仅 `id,exp_to_next`）、`unlocks 11 行`（仅 `id,name,note`）、`quality` 0 行、`recipes.unlock_level` 80 行全 `0`、`items.unlock_level` 106 行全 `0`

## 输出
- `game-data/source/quality.csv`（补列 + 转录）
- `game-data/source/unlocks.csv`（**补列**：解锁条件/目标类型/目标 id）
- `game-data/source/levels.csv`（**补列**：该级的解锁引用，或改为"unlocks 侧引用 level"二选一，见步骤 2）
- `game-data/source/recipes.csv`（`unlock_level` 列 + `job` 列）
- `game-data/source/items.csv`（**仅 `unlock_level` 与 `stack` 两列**，注意与 PD7-01 的列级拆分）
- `game-data/UNKNOWN-TABLES.md`（更新）
- `tests/determinism/levels-unlocks.test.mjs`（**已存在**，补断言）

## Execution Steps
1. [ ] **提交来源清单**：为每个字段写"取自哪份文档哪一节/哪一行"。交不出的字段 → 留空 + 登记
2. [ ] **定向决策**：`levels` 与 `unlocks` 的关联方向 —— 方案 A：`levels.unlocks` 列存 id 列表；方案 B：`unlocks.level` 列存等级。**选 B**（单向引用，避免一个单元格塞多个 id），并写进卡面理由
3. [ ] 补列（不改数字）：`unlocks` 加 `level/kind/target_id`；`quality` 按设计源补列
4. [ ] 转录 `recipes.unlock_level`（80 行）与 `items.unlock_level`（106 行）——**只抄，不设计**
5. [ ] `items.stack` 的 99 全同值：**若设计源确实写"堆叠上限 99"→ 保留并在 `UNKNOWN-TABLES.md` 注明"非占位"**；若写不出 → 留空并登记
6. [ ] `npm run gen` + 补 `levels-unlocks.test.mjs` 断言（"49 级每级都有可解锁项，或明确为空集"）
7. [ ] `node tools/guard/placeholders.mjs` 对比前后

## 验收标准
- [ ] A1 `command`：`npm run gen && node --import ./tools/runtime/register.mjs --test tests/determinism/levels-unlocks.test.mjs` → PASS
- [ ] A2 `command`：`node tools/guard/placeholders.mjs` → `recipes.unlock_level` 与 `items.unlock_level` **不再出现在命中列表**
- [ ] A3 `file`：`UNKNOWN-TABLES.md` 里新增/保留了"来源未明"字段清单，每条含文档锚点
- [ ] A4 `review`：`levels` 与 `unlocks` 的关联只有一个方向（不双向存）

## 验证命令
```bash
npm run gen
node --import ./tools/runtime/register.mjs --test tests/determinism/levels-unlocks.test.mjs
node tools/guard/placeholders.mjs
```

## 证据路径
`docs/06_validation/evidence/EVD-7106/`（来源清单 + gen 输出 + placeholders 前后）

## 允许修改
- `game-data/source/{levels,unlocks,quality,recipes}.csv`
- `game-data/source/items.csv`（**仅 `unlock_level`、`stack` 列**）
- `game-data/UNKNOWN-TABLES.md`、`tests/determinism/levels-unlocks.test.mjs`

## 禁止修改
- `items.csv` 的 `capacity` 列（PD7-01）、`weight` 列
- `tools/guard/placeholders.baseline.json`（B-L4：只有 PD7-09 能改）
- 任何 `.ts`

## 依赖与阻塞
- Depends on：无（但与 PD7-01 共享 `items.csv` → **PD7-01 先提交**）
- Blocks：PD7-10、PD7-13、PD7-15
- 阻塞条件：设计源查不到解锁等级 → 该字段留空 + 登记，卡继续做其他字段（不整体停下）

## 建议执行档位
`sonnect`　理由：补列 + 转录，无架构判断。

## 升级条件
设计源对"解锁"语义有两种互斥表述 → 升 `opus` 做仲裁。

## 预估规模
中（1 天）

---

# PD7-07 生产簇数据（jobs / foods / crew_traits / generators / consumers + facilities）

- 阶段 / 角色 / 规划版本：B / executor / PLAN-R4
- 来源（E1）：D-50 + `mvp-scope.md:26`（员工与食物、职业）

## 归属
- 所属切片：SB-2
- 来源需求：mvp-scope §2 表第 3 行（`crew/power`）→ 设计源 v5.5 §6（员工）、§7（电力）
- 来源方案：`05 §5`

## 目标
`crew` 能回答"这个岗位生产什么、每小时多少"，`power` 能回答"这台发电机供多少、这台设备吃多少"。

## 输入
- 文档：设计源 v5.5 §6、§7
- 前置任务：无
- 前置状态：`jobs/foods/crew_traits/generators/consumers` 全 0 行；`facilities.effect_bp` 9 行全 `10000`

## 输出
- `game-data/source/{jobs,foods,crew_traits,generators,consumers}.csv`
- `game-data/source/facilities.csv`（`effect_bp` 列）
- `game-data/UNKNOWN-TABLES.md`
- `tests/determinism/crew-power.test.mjs`（新增）

## Execution Steps
1. [ ] **提交来源清单**（同 PD7-06 步骤 1）
2. [ ] 补列：`jobs` 至少含"产出物/产出速率/食物消耗/岗位等级"；`generators` 含"容量/燃料消耗"；`consumers` 含"耗电"
3. [ ] 转录数值（**只抄**）
4. [ ] `facilities.effect_bp` 全 `10000`：核实设计源是否真为"全部 100%"，否则留空登记
5. [ ] `npm run gen`
6. [ ] 写 `crew-power.test.mjs`：断言"每个 job 的产出物在 `items` 里存在"、"每个 generator 容量 > 0"
7. [ ] `placeholders.mjs` 前后对比

## 验收标准
- [ ] A1 `command`：`npm run gen && node --import ./tools/runtime/register.mjs --test tests/determinism/crew-power.test.mjs` → PASS
- [ ] A2 `assert`：5 张空表从 `placeholders` 的空表清单里消失
- [ ] A3 `assert`：`jobs` 的每个产出物 id 都能在 `items.csv` 找到（外键一致性，写成测试）
- [ ] A4 `file`：`UNKNOWN-TABLES.md` 已更新

## 验证命令
```bash
npm run gen
node --import ./tools/runtime/register.mjs --test tests/determinism/crew-power.test.mjs
node tools/guard/placeholders.mjs
```

## 证据路径
`docs/06_validation/evidence/EVD-7107/`

## 允许修改
- `game-data/source/{jobs,foods,crew_traits,generators,consumers,facilities}.csv`
- `game-data/UNKNOWN-TABLES.md`、`tests/determinism/crew-power.test.mjs`

## 禁止修改
- `items.csv`（PD7-01/06 的地盘）、`game-core/src/crew/**`（规则在 PD7-11）

## 依赖与阻塞
- Depends on：无
- Blocks：PD7-11
- 阻塞条件：设计源无"产出速率"→ 该字段留空，卡继续；若**多数字段都无源** → 整卡 `BLOCKED` 并上报

## 建议执行档位
`sonnect`　理由：同 PD7-06。

## 升级条件
若"员工产出"需要与离线结算的**时间粒度**对齐（分钟/小时）→ 升 `opus`（那时才涉及 ADR-0012 同族问题）。

## 预估规模
中（1 天）

---

# PD7-08 战斗簇数据（islands / units / waves / defenses / throwables / protection_cards / buildings）

- 阶段 / 角色 / 规划版本：B / executor / PLAN-R4
- 来源（E1）：D-50 + `mvp-scope.md:29`（占岛、塔防、3 兵种、保护卡）

## 归属
- 所属切片：SB-3
- 来源需求：mvp-scope §2 表第 6 行（`island/defense`）→ 设计源 v5.5 §8
- 来源方案：`05 §5`

## 目标
`defense` 的 30 行模拟骨架能跑完 1 波（有兵种、有波次、有防御设施），结果确定（同 seed 同输出）。

## 输入
- 文档：设计源 v5.5 §8；`mvp-scope.md:53`（**v1.0 只做 3 兵种，v1.1 补齐 6 个**）
- 前置任务：无
- 前置状态：7 张表里 6 张 0 行；`buildings 6 行`（`storage_bp` = 50/20/0×4，4 行为 0）

## 输出
- `game-data/source/{islands,units,waves,defenses,throwables,protection_cards}.csv`
- `game-data/source/buildings.csv`（`storage_bp` 列补全）
- `game-data/UNKNOWN-TABLES.md`
- `tests/determinism/defense.test.mjs`（新增）

## Execution Steps
1. [ ] **提交来源清单**
2. [ ] `units`：**只做设计源里解锁最早的 3 个**（近战/远程/坦克各 1，`mvp-scope.md:53` 已定），其余 6 个登记为 v1.2 → **不填**
3. [ ] `waves`：至少 1 波可跑（波次序号/敌兵种/数量/间隔）
4. [ ] `defenses`/`throwables`：与 3 个兵种配套的最小集
5. [ ] `islands` / `protection_cards`：占岛与保护卡（7 天/24 小时，`mvp-scope.md:29`）
6. [ ] `buildings.storage_bp` 4 行为 0：核实是否"该建筑不提供仓储"，否则登记
7. [ ] `npm run gen`
8. [ ] 写 `defense.test.mjs`：给固定 seed 跑 1 波，断言结果与预期一致（**这是本卡最重要的验收**）
9. [ ] `placeholders.mjs` 前后对比

## 验收标准
- [ ] A1 `command`：`npm run gen && node --import ./tools/runtime/register.mjs --test tests/determinism/defense.test.mjs` → PASS
- [ ] A2 `assert`：`units.csv` 恰有 **3 行**（不是 9 行），且这 3 行分别覆盖近战/远程/坦克
- [ ] A3 `assert`：同 seed 跑两次结果完全相同（确定性）
- [ ] A4 `file`：`UNKNOWN-TABLES.md` 记录了"另外 6 个兵种登记为 v1.2"

## 验证命令
```bash
npm run gen
node --import ./tools/runtime/register.mjs --test tests/determinism/defense.test.mjs
node tools/guard/placeholders.mjs
```

## 证据路径
`docs/06_validation/evidence/EVD-7108/`

## 允许修改
- `game-data/source/{islands,units,waves,defenses,throwables,protection_cards,buildings}.csv`
- `game-data/UNKNOWN-TABLES.md`、`tests/determinism/defense.test.mjs`

## 禁止修改
- `packages/game-core/src/defense/**`（30 行骨架的修改属 PD7-15）
- 其余 CSV

## 依赖与阻塞
- Depends on：无
- Blocks：PD7-15
- 阻塞条件：设计源没有"波次"数值 → `waves` 留空 + `BLOCKED` 上报（**没有波次就没有塔防**，不许自己编）

## 建议执行档位
`sonnect`　理由：表多但同构；确定性断言已有范式（`tests/determinism/` 16 个文件）。

## 升级条件
若 3 兵种的选取需要重新裁决（设计源没写"哪 3 个"）→ 升 `opus` + 请用户定。

## 预估规模
中（1–2 天）

---

# PD7-09 玩法簇数据（19 张表 + locks/chests 补全 + baseline 收口）

- 阶段 / 角色 / 规划版本：B / executor / PLAN-R4
- 来源（E1）：D-50 的 31 张清单剩余部分 + `mvp-scope.md:28,30,31,65`

## 归属
- 所属切片：SB-4（**B 段收口刀**）
- 来源需求：mvp-scope §2 表第 5/7/8 行 + §5 v1.1（钓鱼/聊天/保护卡/赶海）→ 设计源 v5.5 §3,§8,§10,§12
- 来源方案：`05 §5`、`07 §3.2`（CSV 逐文件分配表）

## 目标
最后 19 张空表清零，且**所有 B 卡完成后统一更新 `placeholders.baseline.json`**（O-6）。

## 输入
- 文档：设计源 v5.5 对应章节（逐表在来源清单里写明）
- 前置任务：**PD7-06、07、08 全部完成**（本卡收口 baseline）
- 前置状态：`zones tides spawns events event_drops fish bait phrases shipwrecks oil explore seasons titles regions limits drops lines lockpick_tools blueprints` 19 张 0 行；`locks.zone_bp`/`drop_group` 全 0/空；`chests` 三箱同构（`lock` 全 `none`、`smashable` 全 `true`、`size` 全 `1`）

## 输出
- 上述 19 张 CSV
- `game-data/source/{locks,chests}.csv`（补全）
- `tools/guard/placeholders.baseline.json`（**统一更新，单独提交**）
- `game-data/UNKNOWN-TABLES.md`
- `tests/determinism/`（按簇各加一条断言，最多 4 个文件）

## Execution Steps
1. [ ] **提交来源清单**（19 张表逐表，交不出的留空）
2. [ ] 按簇转录：海域（`zones/tides/spawns`）、活动（`events/event_drops`）、钓鱼（`fish/bait`）、社交（`phrases`）、沉船（`shipwrecks/oil/explore`）、榜单（`seasons/titles/regions`）、经济（`limits`）、开箱（`drops/lines/lockpick_tools/blueprints`）
3. [ ] `locks`：`zone_bp`（开锁区宽）与 `drop_group` 补全
4. [ ] `chests`：三箱差异化（`lock` 不再是全 `none`、`size` 不再全 `1`）——**若设计源不区分，则保留同值并在 `UNKNOWN-TABLES.md` 注明"设计上三箱同构"**
5. [ ] `npm run gen`
6. [ ] 加断言：`regions` 非空时 `account.currentRegion()` 不再走回落（D-53 的回落分支被覆盖）
7. [ ] `node tools/guard/placeholders.mjs --all` 出前后对比
8. [ ] **统一更新 `placeholders.baseline.json`**（只减不增），单独提交，commit message 附实测输出

## 验收标准
- [ ] A1 `command`：`npm run gen && node tools/guard/placeholders.mjs` → **空表清单为空**（31 → 0）
- [ ] A2 `command`：`npm run test` → 全 PASS
- [ ] A3 `file`：`placeholders.baseline.json` 的 `empty_tables` 为 `[]`，`same_value_hits` 每项都有"非占位"或"待补"标注
- [ ] A4 `review`：19 张表中每张非空表的每个字段都能在来源清单里找到锚点

## 验证命令
```bash
npm run gen
node tools/guard/placeholders.mjs --all
npm run test
```

## 证据路径
`docs/06_validation/evidence/EVD-7109/`

## 允许修改
- `game-data/source/{zones,tides,spawns,events,event_drops,fish,bait,phrases,shipwrecks,oil,explore,seasons,titles,regions,limits,drops,lines,lockpick_tools,blueprints,locks,chests}.csv`
- `game-data/UNKNOWN-TABLES.md`、`tools/guard/placeholders.baseline.json`
- `tests/determinism/`（仅新增本卡 4 个测试文件）

## 禁止修改
- PD7-06/07/08 已改的表（`levels/unlocks/quality/recipes/jobs/...`）
- 任何 `.ts`

## 依赖与阻塞
- Depends on：PD7-06、PD7-07、PD7-08
- Blocks：PD7-12、PD7-13、PD7-14、PD7-16
- 阻塞条件：`events`/`waves` 类玩法参数无源 → 该表留空，**但 baseline 不更新**（空表仍在 baseline 内），卡标 `BLOCKED` 并上报

## 建议执行档位
`sonnect`　理由：量大但机械；唯一有判断的是 `chests` 三箱同构的处置，已在步骤 4 给死。

## 升级条件
若需改 `placeholders.mjs` 的判定逻辑（例如新增"字段全空"检测）→ 升 `opus`。

## 预估规模
大（1–2 天）　**接近 2 天上限，若超 2 天按簇拆成 2 张卡**
