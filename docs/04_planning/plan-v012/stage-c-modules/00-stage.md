---
id: PLAN-V012-C
title: plan-v012 · 阶段 C（v1.1 模块实现）· 9 张原子任务卡
status: active
module: planning
owner: hark
created: 2026-10-30
review: 2026-11-13
related: [PLAN-V012-02, PLAN-V012-06, PLAN-V012-07, PLAN-V012-10]
---

# 阶段 C · v1.1 模块实现（13 个模块 → 9 张卡）

## 1. 本阶段的存在理由与总纪律

`02 §8` 的六层矩阵给出结论：**13 个模块"数据齐、实现空"**（D-50 登记的那 13 个）。
本阶段把它们按"能共用同一套 core 抽象的"合并成 9 张卡，每张卡都遵守三条纪律：

| 纪律 | 含义 | 为什么写死 |
|---|---|---|
| **① 缺口不装绿灯** | 数值无源时，返回值里必须是 `unknown` / `demandKnown: false` 这类**显式缺口**，不许用 `0` / `10000` 冒充 | 本仓第 2 类病症（占位值伪装）：`facilities.effect_bp=10000×9`、`items.stack=99×106` 全是这么来的 |
| **② 表能算的必须用表算** | 能从表算出来的量（`shipwrecks` 五档 bp / `defenses.recipe` / `protection_cards.duration_hours` / `levels` 49 行）**一律读表**，不许写常量 | 本仓第 1 类病症（一刀深）：文件写了、输入是占位值 |
| **③ 复用已有纯函数** | `common/rng.ts` 的 `createRng`、`common/time.ts` 的 `elapsed`、`common/result` 的 `ok/err`、`defense` 的 `distanceField` **全部已实现且业务零调用** | `02 §10`：这是第 4 次"能力已实现、调用点没接" |

## 2. 前置裁决（开工前必读）

| 裁决 | 状态 | 影响哪张卡 | 不裁的后果 |
|---|---|---|---|
| **D-58（已修订为 A′）** | ⚠ `PROPOSED` | PD8-14 | 塔防只做"占岛+建防御+布局校验"，袭击胜负显式 BLOCKED |
| **D-60（本版新增）** | ⚠ `PROPOSED` | PD8-08 | 经验值取 `items.base_price`（1:1）还是不取 |
| D-59 | ⚠ `PROPOSED` | 全部 9 张卡的"归属版本" | 只影响何时能宣称 v1.0 完成 |

## 3. 阶段出口条件

- [ ] 9 张卡各自的定向测试全部 PASS（`tests/determinism/*.test.mjs`）
- [ ] 每个模块的 `core` 目录行数从 **3~4 行** 涨到**有真实函数体**，且每张卡至少 1 条纯函数用例
- [ ] 每个模块的**存档段**在 `save/schema.ts` 里登记，且 `migrations.ts` 有缺键补默认分支（**不递增** `SAVE_SCHEMA_VERSION`）
- [ ] 每张卡的 `README.md`（`features/<mod>/README.md`）与实现一致；删除全部"规则待按 v5.5 章节 X 抽取"注释
- [ ] `npm run verify` **一次**，EXIT=0（需先完成 PD8-18，否则 `items-w` 2 条恒红）
- [ ] 9 张卡合计至少 9 条人工截图入 `docs/06_validation/evidence/`（无编辑器则记 UNKNOWN，不记 PASS）

---

# PD8-08 等级与解锁（progression）

- 阶段 / 角色 / 规划版本：C / executor / PLAN-R5
- 来源（E1）：`design-source/我的筏-深度设计方案-v5.5.md:66-69`（§1.4「经验来自打捞 + 建设」）+ `levels.json` 49 行 + `unlocks.json` 82 行

## 归属
- 所属切片：SC-1
- 来源需求：M-9（等级与制作连通）
- 来源方案：`02 §5`（`recipes.unlock_level` 80/80 全空 → 闸门不能靠这一列）

## 目标
玩家打捞/建设获得经验 → 升级 → 未达等级的配方在合成面板**变灰且不可做**。
闸门数据源是 `unlocks`（82 行），**不是** `recipes.unlock_level`（全空）。

## 输入
- 文档：`02 §5`（`recipes.unlock_level` 全空）、`tests/determinism/levels-unlocks.test.mjs`（**已 9/9 PASS**，含 lv8 断言 buildable 目标必须在 items/facilities/buildings 之一）
- 契约：无
- 前置任务：PD8-06
- 前置状态：`levels` 49 行（`exp_to_next` 100→1060，累计 28,420）；`unlocks` 82 行（ability 25 / buildable 54 / milestone 3）；`recipes` 80 行

## 关键事实（本卡设计的全部依据，逐条实测）

| 事实 | 数值 | 影响 |
|---|---|---|
| `unlocks.kind=buildable` 的 `target_id` **不是单表外键** | 40 条 → `items.id`；8 条 → `facilities.id`；6 条 → `buildings.id`；ability/milestone 的 `target_id` = `name` | 闸门必须**四路解析**（`levels-unlocks` lv8 已把这条钉成测试） |
| 受闸门影响的配方数 | **40 / 80**（产出物在 buildable 集合里）；另 40 条配方产出物不在 unlock 表 → **默认可用** | 1 级可用配方 **47** 条（其中 7 条被 1 级 buildable 放行） |
| `recipes.unlock_level` | **80/80 全空** | 本卡**不写这一列**（写了就是自编数值） |
| `items.unlock_level` | 106/106 全 0 | 同上，不用 |
| 经验值来源 | 设计源 §1.4:69 **只定性**（"打捞 + 建设"），无数值 | 见 D-60 |

## 输出
- `packages/game-core/src/progression/index.ts`（从 3 行空壳改为：`levelFromExp` / `expToNext` / `addExp` / `unlockIndex` / `isUnlocked` / `canCraft`）
- `packages/game-core/src/save/schema.ts`（`modules.progression?: { exp: number; level: number }`）
- `packages/game-core/src/save/migrations.ts`（缺键补 `{ exp: 0, level: 1 }`）
- `client/assets/scripts/features/progression/model/ProgressionModel.ts`（真实用例层）
- `client/assets/scripts/features/progression/view/ProgressionPanel.ts`（新建：等级/经验条/下一级解锁预览）
- `client/assets/scripts/features/crafting/view/CraftingPanel.ts`（**仅**加"未达等级变灰 + 点击提示"两处）
- `tests/determinism/progression.test.mjs`（新建）

## Execution Steps
1. [ ] 读 `tests/determinism/levels-unlocks.test.mjs` 全文——**它是本卡的数据契约**，不要重复造断言
2. [ ] `progression/index.ts` 纯函数（全部无 IO、无 `Date.now`）：
       ```ts
       export interface LevelRow { id: number; exp_to_next: number }
       export interface UnlockRow { id: string; level: number; kind: 'ability'|'buildable'|'milestone'; target_id: string; name?: string }
       /** 累计经验 → 等级。levels 未覆盖的溢出等级停在最大级（49）。 */
       export function levelFromExp(levels: readonly LevelRow[], totalExp: number): { level: number; expInLevel: number }
       /** 升到下一级还差多少；满级返回 0。 */
       export function expToNext(levels: readonly LevelRow[], totalExp: number): number
       /** 建反查索引：target_id → 所需等级（buildable/ability/milestone 分三组）。 */
       export function buildUnlockIndex(rows: readonly UnlockRow[]): Map<string, number>
       /** 配方闸门：产出物在 buildable 索引里且等级不足 → 不可做；不在索引里 → 默认可做。 */
       export function canCraft(unlockLevelOf: (output: string) => number | undefined, level: number, output: string): { ok: boolean; needLevel?: number }
       ```
3. [ ] **经验获取按 D-60**：若裁 A → `export function expGainFor(basePrice: number): number { return Math.max(0, basePrice) }`
       （1:1，零新增数值）；若裁 B → 常量集中一处并标 `PLACEHOLDER`
4. [ ] `ProgressionModel`：`addExp(gain)` → 重新算 level → 与旧 level 比对，若涨级则**记录新解锁项**（供 UI 弹一次）
5. [ ] `CraftingPanel`：渲染配方列表时调 `canCraft`；不可做的**灰显 + 显示"需要 Lv.N"**，点击不发起请求
6. [ ] 写 `progression.test.mjs`（6 例）：
       - `levelFromExp(levels, 0)` → `{level:1, expInLevel:0}`
       - `levelFromExp(levels, 100)` → `{level:2, ...}`（边界正好升级）
       - `levelFromExp(levels, 99)` → `{level:1, expInLevel:99}`
       - 累计 28,420 → `level === 49`（全表走通）
       - **闸门**：`unlockIndex` 里 `item_0072`（筏块）→ 1 级；`item_0074`（研究台）→ 6 级 → `canCraft(...,1,'item_0074').ok === false`
       - **不误伤**：1 级时可用配方数 **≥ 3** 且实测 **= 47**（`R-4` 的护栏；数字来自 `recipes ∩ ¬buildable` 的实测）
7. [ ] 跑定向测试 + `npm run typecheck:client`

## 验收标准
- [ ] A1 `command`：`node --import ./tools/runtime/register.mjs --test tests/determinism/progression.test.mjs` → 全 PASS
- [ ] A2 `command`：`node --import ./tools/runtime/register.mjs --test tests/determinism/levels-unlocks.test.mjs` → 仍 9/9 PASS（未破坏数据契约）
- [ ] A3 `command`：`git diff --stat game-data/source/recipes.csv game-data/source/items.csv` → **输出为空**（未给 80 条配方 / 106 物品填门槛）
- [ ] A4 `measure`：1 级时 `canCraft` 为 true 的配方数 = **47**（用 `recipes.json` 实测，写进 EVD）
- [ ] A5 `manual`：合成面板里未达等级的配方灰显并显示"需要 Lv.N"（截图；无编辑器记 UNKNOWN）
- [ ] A6 `review`：`progression/index.ts` 无 `Math.random` / `Date.now` / `cc` / IO

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/progression.test.mjs
node --import ./tools/runtime/register.mjs --test tests/determinism/levels-unlocks.test.mjs
npm run typecheck:client
git diff --stat game-data/source/
```

## 证据路径
`docs/06_validation/evidence/EVD-8108/`

## 允许修改
- `packages/game-core/src/progression/**`、`packages/game-core/src/save/{schema,migrations}.ts`
- `client/assets/scripts/features/progression/**`
- `client/assets/scripts/features/crafting/view/CraftingPanel.ts`（**仅**闸门渲染两处）
- `tests/determinism/progression.test.mjs`
- `tools/guard/placeholders.baseline.json`（**仅当**发现新的同值命中时；本卡不改数值，通常不动 → O-6）

## 禁止修改
- `game-data/source/recipes.csv`、`items.csv`（**红线**：不许给 80 条配方填 `unlock_level`）
- `packages/game-core/src/crafting/**`（材料判定逻辑不动，闸门在 progression 侧）
- `packages/contracts/**`
- `tests/determinism/levels-unlocks.test.mjs`（数据契约，改它 = 改事实）

## 依赖与阻塞
- Depends on：PD8-06
- Blocks：PD8-14（建筑解锁等级）、PD8-15（称号/每日一海的达成条件）
- 阻塞条件：**D-60 未裁** → 步骤 3 写成 `expGainFor(basePrice) { return basePrice; }` 并加 `// TODO(D-60)`，其余照常

## 建议执行档位
`opus`　理由：决定 80 条配方 + 106 个物品的解锁门槛，影响全游戏节奏。

## 升级条件
若发现 `unlockIndex` 的四路解析需要改 `unlocks` 的数据（`target_id` 前缀不统一）
→ 升 `fable`（数据口径问题），**不许在代码里靠字符串前缀猜表**。

## 预估规模
中（1.5 天）

---

# PD8-09 员工与食物（crew）

- 阶段 / 角色 / 规划版本：C / executor / PLAN-R5
- 来源（E1）：`jobs.json` 7 行（`produces/rate/food_consumption/job_level`）+ `crew_traits.json` 4 行（`max_value=25/step=5`，有 note 指向 §5.3:460）+ `common/time.ts` 的 `elapsed`（**零业务调用**）

## 归属
- 所属切片：SC-2
- 来源需求：M-6（离线补算）
- 来源方案：`05 §5`（存档开放 map）+ `common/time.ts:7`（回拨按 0、单次上限 30 天）

## 目标
招 1 个员工 → 按 `jobs.rate` 每小时产出写入存档 → 重登按 `elapsed()` 补算，且**回拨不掉负、超 30 天封顶**。

## 输入
- 文档：`tests/determinism/crew-power.test.mjs`（**已存在**，锁"结构有源 + 无源字段留空"）
- 契约：无
- 前置任务：PD8-06
- 前置状态：`jobs` 7 行；`foods` 6 行（仅 id/name/note，**无热量值**）；`crew_traits` 4 行

## 输出
- `packages/game-core/src/crew/index.ts`（`offlineProduce` / `consumeFood` / `happinessDelta`）
- `client/assets/scripts/features/crew/model/CrewModel.ts` + `view/CrewPanel.ts`（新建）
- `packages/game-core/src/save/{schema,migrations}.ts`（`modules.crew?: { hired: string[]; lastSettledMs: number; pending: Record<string, number> }`）
- `tests/determinism/crew-offline.test.mjs`（新建）

## Execution Steps
1. [ ] 读 `crew-power.test.mjs` 确认哪些字段"有源"、哪些"留空"——**留空字段一律不进计算**
2. [ ] `crew/index.ts`：
       ```ts
       export interface JobRow { id: string; produces?: string; rate?: number; food_consumption?: number }
       /** 离线产出：floor(elapsedMs / 小时) × rate × 人数。rate 缺失的岗位跳过并计入 skipped。 */
       export function offlineProduce(jobs: readonly JobRow[], hired: readonly string[], elapsedMs: number): { produced: Record<string, number>; skipped: string[] }
       /** 幸福感：四项，每项 0..maxValue，每次升降 step；越界夹紧。 */
       export function happinessDelta(cur: readonly number[], traits: readonly {id:string;max_value:number;step:number}[], deltas: readonly number[]): number[]
       ```
       **必须复用 `common/time.ts` 的 `elapsed(fromMs, toMs)`**，不许自己算差值
3. [ ] `food_consumption` 若为 0/缺失 → 不扣食物，但把 `foodShortage: true` 显式返回（**不许用 0 假装"吃得饱"**）
4. [ ] `CrewPanel`：员工列表（岗位名 + 产出 + 幸福感四格）+ "结算中"提示
5. [ ] 存档：`lastSettledMs` 用**服务器时间**（`services/time` 的 `nowMs()`，PD8-05 已建）
6. [ ] 写 `crew-offline.test.mjs`（5 例）：
       - 1 小时整 → `produced` 恰好 = `rate`
       - 59 分 → 0（不足 1 小时不产出）
       - 回拨（`toMs < fromMs`）→ 0 且不抛
       - 超 30 天 → 封顶 30 天（`elapsed` 的内置 cap）
       - `rate` 缺失的岗位 → 出现在 `skipped` 里而非产出 0

## 验收标准
- [ ] A1 `command`：`node --test tests/determinism/crew-offline.test.mjs`（含 register 前缀）→ PASS
- [ ] A2 `command`：`node --test tests/determinism/crew-power.test.mjs` → 仍 PASS
- [ ] A3 `review`：`crew/index.ts` 里时间计算**全部**经由 `elapsed()`（`grep -c "elapsed(" ≥ 1` 且无 `toMs - fromMs` 裸减法）
- [ ] A4 `measure`：`jobs` 7 行里有 `rate` 的行数（实测值写进 EVD；为 0 则本卡只能交付"结构"并在卡内标 BLOCKED-DESIGN）
- [ ] A5 `manual`：招 1 个员工 → 面板显示产出；重登后数字按差值增长（截图；无编辑器记 UNKNOWN）

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/crew-offline.test.mjs
node --import ./tools/runtime/register.mjs --test tests/determinism/crew-power.test.mjs
npm run typecheck:client
node -e "const j=require('./client/assets/resources/config/jobs.json');console.log('有 rate 的岗位:',j.filter(x=>x.rate!=null).length,'/',j.length)"
```

## 证据路径
`docs/06_validation/evidence/EVD-8109/`

## 允许修改
- `packages/game-core/src/crew/**`、`packages/game-core/src/save/{schema,migrations}.ts`
- `client/assets/scripts/features/crew/**`
- `tests/determinism/crew-offline.test.mjs`

## 禁止修改
- `game-data/source/{jobs,foods,crew_traits}.csv`（无源字段不许补数）
- `packages/game-core/src/common/time.ts`（`elapsed` 的 cap 语义不改）
- `packages/contracts/**`

## 依赖与阻塞
- Depends on：PD8-06
- Blocks：PD8-15（称号/活动需要员工产出作为达成条件）
- 阻塞条件：若 `jobs.rate` 全空 → **停在"结构 + skipped 显式返回"**，卡内记 BLOCKED-DESIGN（设计源 §5.3 未给产出速率）

## 建议执行档位
`sonnect`　理由：纯函数 + 已有 `jobs`/`crew_traits` 数据可抄 + `elapsed` 现成。

## 升级条件
若发现 `foods` 需要热量值才能算"吃得饱" → 升 `opus` 并转设计补齐（**不许自编热量**）。

## 预估规模
中（1 天）

---

# PD8-10 电力（power）

- 阶段 / 角色 / 规划版本：C / executor / PLAN-R5
- 来源（E1）：`generators.json` 3 行（`output_ratio` 1/3/10，note 指向 §6:481）+ `consumers.json` 5 行（**`power_draw` 全部缺失**，note 逐行写"耗电值无源（§6:481 待定）"）

## 归属
- 所属切片：SC-3
- 来源需求：M-7（供电平衡可见）
- 来源方案：`02 §5` 的"占位值伪装"判据 → **缺口必须显式**

## 目标
电源侧按 `output_ratio` 算总出力（**有真值**）；负载侧算总耗电，但 `power_draw` 无源时
输出 `demandKnown: false` 而**不是** `demand: 0` —— 让 UI 显示"耗电值待定"，而不是显示"电力充足"。

## 输入
- 文档：`tests/determinism/crew-power.test.mjs`（已锁 `power_draw` 无源留空）
- 契约：无
- 前置任务：PD8-06
- 前置状态：`generators` 3 行（1/3/10 全有）；`consumers` 5 行（`power_draw` **0/5 有值**）

## 输出
- `packages/game-core/src/power/index.ts`（`supplyOf` / `demandOf` / `balance`）
- `client/assets/scripts/features/power/model/PowerModel.ts` + `view/PowerPanel.ts`（新建）
- `tests/determinism/power.test.mjs`（新建）

## Execution Steps
1. [ ] `power/index.ts`：
       ```ts
       export interface GenRow { id: string; output_ratio?: number }
       export interface ConsRow { id: string; power_draw?: number }
       export function supplyOf(gens: readonly GenRow[], counts: Record<string, number>, unitOutput: number): number
       /** demandKnown=false 表示清单里存在无耗电值的设备——不许把它当 0。 */
       export function demandOf(cons: readonly ConsRow[], counts: Record<string, number>): { demand: number; demandKnown: boolean; unknownIds: string[] }
       export function balance(supply: number, load: { demand: number; demandKnown: boolean }): { ratioBp: number; state: 'ok'|'short'|'unknown' }
       ```
       `state === 'unknown'` 当且仅当 `demandKnown === false`
2. [ ] `unitOutput` 由调用方传入（不写死）；`output_ratio` 只用于**相对比例**
3. [ ] `PowerPanel`：三行——总出力 / 总耗电（无值时显示"待定"）/ 状态；`state==='short'` 时列出需停机的设备
4. [ ] 写 `power.test.mjs`（4 例）：
       - `supplyOf` 按 1:3:10 比例（太阳能 1 台 + 电鳗 1 台 + 石油 1 台，`unitOutput=10` → 140）
       - `demandOf` 对现有 5 行 → `demandKnown === false`、`unknownIds.length === 5`（**把缺口钉进测试**）
       - 夹具：给 2 台设备填上 `power_draw` → `demandKnown === true` 且 `demand` = 和
       - `balance(supply=0, demandKnown=false)` → `state === 'unknown'`（**不是** `'ok'`）

## 验收标准
- [ ] A1 `command`：`node --test tests/determinism/power.test.mjs` → PASS
- [ ] A2 `command`：`git diff --stat game-data/source/consumers.csv` → 空（未自编耗电值）
- [ ] A3 `measure`：`consumers.json` 里 `power_draw != null` 的行数 → 记录实测值（当前 **0/5**）
- [ ] A4 `review`：`power/index.ts` 里不存在 `?? 0` 把 `power_draw` 兜成 0 的写法（`grep -c "power_draw ?? 0"` = 0）
- [ ] A5 `manual`：面板在无耗电值时显示"待定"而非"充足"（截图；无编辑器记 UNKNOWN）

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/power.test.mjs
npm run typecheck:client
grep -rn "power_draw ?? 0" packages/game-core/src/power/ || echo "OK: 无 0 兜底"
```

## 证据路径
`docs/06_validation/evidence/EVD-8110/`

## 允许修改
- `packages/game-core/src/power/**`、`client/assets/scripts/features/power/**`
- `tests/determinism/power.test.mjs`

## 禁止修改
- `game-data/source/{generators,consumers}.csv`
- `packages/contracts/**`

## 依赖与阻塞
- Depends on：PD8-06
- Blocks：无
- 阻塞条件：无（本卡即使 `power_draw` 全空也**能交付**，因为交付物正是"显式缺口"）

## 建议执行档位
`sonnect`　理由：5 行表 + 简单加减，核心价值在"不装绿灯"这一条纪律上。

## 升级条件
若发现 `output_ratio` 需要换算成绝对电量（如 kW）才可用于 UI → 停，转 D-62（出力绝对值缺源）。

## 预估规模
小（半天）

---

# PD8-11 房间与设施（raft 上层）

- 阶段 / 角色 / 规划版本：C / executor / PLAN-R5
- 来源（E1）：`rooms.json` 10 行（**仅 id/name/note**）+ `facilities.json` 9 行（`effect_bp` 全 10000）+ `buildings.json` 6 行（`storage_bp` 20/50）+ `unlocks` 里 14 条非 item 目标

## 归属
- 所属切片：SC-4
- 来源需求：M-5（建造前置）
- 来源方案：`rooms.schema.json` 的 `status: draft` + `todo: 字段待从 v5.5（模块 raft）抽取`

## 目标
「科研部」建成 → 研究台才可用；熔炉/灶台在位才可制作对应配方。
**前置判定只用已有数据**：`unlocks`（等级）+ `facilities.station`（工位名）+ `recipes.station`（配方要求的工位）。

## 输入
- 文档：`rooms.schema.json`（draft，**无 cost 列**）、`facilities.json`（`station` 列 6/9 有值）、`recipes.csv`（`station` 列）
- 契约：无
- 前置任务：PD8-06、PD8-02（`applyBuild`）、PD8-03（筏面板）
- 前置状态：`rooms` 10 行无成本；`facilities.effect_bp` 全 10000（`U-2`：按占位处理，**不读**）

## 关键事实

| 事实 | 数值 | 影响 |
|---|---|---|
| `rooms` 列 | 只有 `id/name/note` | **无法表达"建一间房间要多少材料"** → 本卡不做房间造价 |
| `facilities` 有 `station` 列 | 6/9 有值（熔炉/灶台/木炭窑/炼油炉/高炉/机械工坊） | 工位判定**可做** |
| `recipes.station` | 有值（合成表里已有 station 列） | 与 `facilities.station` 对接**可做** |
| `unlocks` 非 item 目标 | `facilities` 8 条 + `buildings` 6 条 | 房间/设施解锁等级**可读** |

## 输出
- `packages/game-core/src/raft/rooms.ts`（新建：`stationReady` / `roomsUnlockedAt`）
- `client/assets/scripts/features/raft/view/RaftPanel.ts`（加"房间/设施"分区，**与 PD8-03 串行**）
- `packages/game-core/src/save/{schema,migrations}.ts`（`modules.raft` 增 `rooms: string[]`、`facilities: string[]`）
- `tests/determinism/raft-rooms.test.mjs`（新建）

## Execution Steps
1. [ ] `raft/rooms.ts`：
       ```ts
       export interface RecipeStation { id: string; station?: string }
       /** 配方可做 = 无 station 要求，或要求的工位已建成。返回 missing 工位名。 */
       export function stationReady(built: readonly string[], recipe: RecipeStation): { ok: boolean; missingStation?: string }
       /** 按 unlocks 建"设施/房间 → 解锁等级"表（target_id 是 facilities.id 或 buildings.id）。 */
       export function unlockedAt(rows: readonly UnlockRow[]): Map<string, number>
       ```
2. [ ] **不读 `facilities.effect_bp`**（`U-2`：占位）。若需要"设施是否生效"→ 一律按"在位即生效"
3. [ ] 房间建造：`rooms` 无 cost → **本卡不支持建房间**，只支持"设施在位"；房间入口在 UI 上标"造价待定"（显式缺口，不装绿灯）
4. [ ] `RaftPanel` 房间分区（串行于 PD8-03，不并行改同一文件）
5. [ ] 写 `raft-rooms.test.mjs`（4 例）：
       - `stationReady(['熔炉'], {station:'熔炉'})` → ok
       - `stationReady([], {station:'熔炉'})` → `missingStation === '熔炉'`
       - `stationReady([], {})`（无 station 要求）→ ok
       - `unlockedAt` 对 `rooms`/`facilities` 的 14 条目标 → 全部能解析、等级与 `unlocks.level` 一致

## 验收标准
- [ ] A1 `command`：`node --test tests/determinism/raft-rooms.test.mjs` → PASS
- [ ] A2 `command`：`node --test tests/determinism/raft.test.mjs`（PD8-02 产出）→ 仍 PASS
- [ ] A3 `command`：`grep -rn "effect_bp" packages/game-core/src/` → **0 命中**（未把占位值当逻辑）
- [ ] A4 `measure`：`recipes` 里有 `station` 的行数（实测写进 EVD；决定"工位判定"覆盖多少配方）
- [ ] A5 `manual`：合成分区里"需要熔炉"的配方在无熔炉时灰显（截图；无编辑器记 UNKNOWN）

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/raft-rooms.test.mjs
node --import ./tools/runtime/register.mjs --test tests/determinism/raft.test.mjs
grep -rn "effect_bp" packages/game-core/src/ || echo "OK: 未读占位列"
```

## 证据路径
`docs/06_validation/evidence/EVD-8111/`

## 允许修改
- `packages/game-core/src/raft/**`（`rooms.ts` 新建；`index.ts` 只加导出）
- `client/assets/scripts/features/raft/**`
- `packages/game-core/src/save/{schema,migrations}.ts`
- `tests/determinism/raft-rooms.test.mjs`

## 禁止修改
- `game-data/source/{rooms,facilities,buildings,recipes}.csv`（红线：不许给 rooms 加 cost）
- `client/assets/scripts/app/MainView.ts`（PD8-03 独占 → O-2）
- `packages/contracts/**`

## 依赖与阻塞
- Depends on：PD8-06、PD8-02、PD8-03
- Blocks：PD8-14（防御建筑需要设施解锁）
- 阻塞条件：**若产品要求"房间有造价"** → 必须改 `rooms.schema.json`（加 `cost` 列）→ **停**，转 D-63 与设计侧确认

## 建议执行档位
`opus`　理由：涉及"研究台解锁加层"的多级依赖，且要改 `features/raft`（与 PD8-03 的历史包袱）。

## 升级条件
若 `rooms` 必须支持造价 → 升 `fable`（schema 改动 + 数值来源问题）。

## 预估规模
中（1 天）

---

# PD8-12 钓鱼（fishing）

- 阶段 / 角色 / 规划版本：C / executor / PLAN-R5
- 来源（E1）：`fish.json` 3 行（`item` 指向 item_0010/0011/0012）+ `bait.json` 1 行 + `02 §4.3` 的仲裁（"`fish` 被 core 读"是**假命中**，实为 `MODULE_ID='fishing'` 命中）

## 归属
- 所属切片：SC-5
- 来源需求：M-3（按表产出）
- 来源方案：`design-source §3.2:138-139`（基础鱼/电鳗/灯笼鱼三种用途）

## 目标
用鱼竿 + 鱼饵钓鱼，按 `fish` 表产出对应鱼；产出**由表决定**，不由常量决定。

## 输入
- 文档：`02 §4.2` 的更正（`fishing` core 是 3 行空壳，**没有任何真实读取**）
- 契约：无
- 前置任务：PD8-06
- 前置状态：`fish` 3 行；`bait` 1 行；`fishing` core = 3 行空壳

## 输出
- `packages/game-core/src/fishing/index.ts`（`pickFish` / `catchFish`）
- `client/assets/scripts/features/fishing/model/FishingModel.ts` + `view/FishingPanel.ts`（新建）
- `tests/determinism/fishing.test.mjs`（新建）

## Execution Steps
1. [ ] `fishing/index.ts`：复用 PD8-07 的 `common/drop.ts` 的 `pickWeighted`（**不要重写权重抽取**）
       ```ts
       export interface FishRow { id: string; item: string; purpose?: string }
       /** 按 bait 决定可钓鱼池；无 weight 数据时按"表内均匀"并在返回里标 deterministic: 'uniform-order'。 */
       export function fishPool(fish: readonly FishRow[], bait: string | null): readonly FishRow[]
       export function catchFish(fish: readonly FishRow[], bait: string | null, rollBp: number): FishRow | null
       ```
2. [ ] **诚实标注**：`fish` 表**没有权重列** → 只能均匀抽取。这是"表能算的算、不能算的显式说明"，不许假装有权重
3. [ ] `FishingPanel`：抛竿 → 结果 → 入包（复用 `inventory` 的 `applyToSave` 范式）
4. [ ] 写 `fishing.test.mjs`（4 例）：
       - `fishPool(fish, null)` → 3 条
       - `catchFish(..., rollBp=0)` → 第 1 条；`rollBp=9999` → 第 3 条（均匀三段）
       - 同 `rollBp` 两次 → 同结果（确定性）
       - 每条产出的 `item` 都在 `items` 表里存在（外键自检）

## 验收标准
- [ ] A1 `command`：`node --test tests/determinism/fishing.test.mjs` → PASS
- [ ] A2 `command`：`grep -c "MODULE_ID" packages/game-core/src/fishing/index.ts` → 0（空壳标记被真实实现替换）
- [ ] A3 `review`：权重抽取走 `common/drop.ts`（`grep -c "pickWeighted" ≥ 1`），不重复实现
- [ ] A4 `manual`：钓一次得到 3 种鱼之一（截图；无编辑器记 UNKNOWN）

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/fishing.test.mjs
npm run typecheck:client
```

## 证据路径
`docs/06_validation/evidence/EVD-8112/`

## 允许修改
- `packages/game-core/src/fishing/**`、`client/assets/scripts/features/fishing/**`
- `tests/determinism/fishing.test.mjs`

## 禁止修改
- `game-data/source/{fish,bait}.csv`
- `packages/game-core/src/common/drop.ts`（PD8-07 的地盘）
- `packages/contracts/**`

## 依赖与阻塞
- Depends on：PD8-06、（软）PD8-07 的 `common/drop.ts`
- Blocks：无
- 阻塞条件：若 `common/drop.ts` 尚未存在（PD8-07 未做）→ 本卡**自带一份最小实现**并在 `11-selfcheck` 记一次重复，待 PD8-07 合并

## 建议执行档位
`sonnect`　理由：3 行表 + 复用已写好的权重抽取。

## 升级条件
若 `fish` 需要按海域/深度分池（要 `zones`/`spawns` 联动）→ 升 `opus`，本卡不扩。

## 预估规模
小（半天到 1 天）

---

# PD8-13 深海沉船与石油（salvage）

- 阶段 / 角色 / 规划版本：C / executor / PLAN-R5
- 来源（E1）：`shipwrecks.json` 3 行（`quota/valid_days/item_min/max` + 五档 bp，**每档合计 10000**）+ `oil.json` 1 行（`zone: zone_deep`）+ `explore.json` **0 行**；服务端 `salvage` 6 行空壳 + 动作 `salvage.claimInfo` 是 `todo`

## 归属
- 所属切片：SC-6
- 来源需求：M-14（跨端一次闭环）
- 来源方案：`shipwrecks` 的五档 bp = 现成的概率模型（**不需要新数值**）

## 目标
触发一次沉船 → 抽到档位 → 得到"沉船信息 N 份 + 五档矿产配额"；在深海区可采石油。
`explore` 0 行 → **探索玩法不做**，并在卡内如实标缺口。

## 输入
- 文档：`03 §2` 的 N-5（`explore` 无设计源）
- 契约：`packages/contracts` 的 salvage 动作（3 个）
- 前置任务：PD8-06
- 前置状态：`shipwrecks` 3 行 bp 各合计 10000；`oil` 1 行；`explore` 0 行；服务端 `salvage/service.ts` 6 行

## 输出
- `packages/game-core/src/salvage/index.ts`（`rollWreck` / `wreckReward`）
- `server/src/modules/salvage/{service,repo}.ts`（实现 `salvage.claimInfo`，`handlers.ts` 从 `todo` 改为真实处理）
- `client/assets/scripts/features/salvage/{model,view}`（新建）
- `tests/determinism/salvage.test.mjs`（新建）

## Execution Steps
1. [ ] `salvage/index.ts`：
       ```ts
       export interface WreckRow { id: string; tier: 'normal'|'advanced'|'exclusive'; quota?: number; valid_days?: number; item_min?: number; item_max?: number; unlocked_bp?: number; iron_bp?: number; copper_bp?: number; silver_bp?: number; gold_bp?: number }
       export function rollWreck(wrecks: readonly WreckRow[], rollBp: number): WreckRow
       /** 五档矿产按 bp 折算份数；bp=0 的档位不产出。 */
       export function wreckReward(wreck: WreckRow, rollBps: readonly number[]): Record<string, number>
       ```
       用 `createRng(seed)` 产 rollBp（**第一次真正使用 `createRng`**，见 `02 §10`）
2. [ ] 服务端 `salvage/service.ts`：`claimInfo(playerId)` → 按区服配额校验 → 返回沉船记录；`handlers.ts` 去掉 `todo`
3. [ ] **不实现 `explore`**：`salvage` 的探索分支返回 `err(3102?, '探索玩法未开放')` 用**已有错误码**（查 `errors.ts` 的 14 个码，无合适码则用 `FEATURE_NOT_AVAILABLE`，不许自造数字）
4. [ ] 写 `salvage.test.mjs`（5 例）：
       - `rollWreck` 输入 rollBp 0/9999 → 分别落 normal/exclusive
       - `wreckReward` 对 `wreck_normal`：五档 bp 合计 10000、`gold_bp=0` 不产出金
       - `valid_days` 抽出后过期判定（用注入时间，不读系统钟）
       - 同 seed 同结果
       - 空表 → 抛/返回错误的**明确行为**（不是静默 null）

## 验收标准
- [ ] A1 `command`：`node --test tests/determinism/salvage.test.mjs` → PASS
- [ ] A2 `command`：`grep -c "todo" server/src/gateway/handlers.ts` → 从 7 降到 **6**（`salvage.claimInfo` 落地）
- [ ] A3 `command`：`git diff --stat packages/contracts/` → 空（零契约改动）
- [ ] A4 `measure`：`explore` 表行数 = 0（如实记录；卡内说明"探索玩法本版不做"）
- [ ] A5 `manual`：客户端拿到沉船信息并显示档位与份数（截图；无编辑器记 UNKNOWN）

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/salvage.test.mjs
npm run typecheck:server
grep -n "todo" server/src/gateway/handlers.ts
git diff --stat packages/contracts/
```

## 证据路径
`docs/06_validation/evidence/EVD-8113/`

## 允许修改
- `packages/game-core/src/salvage/**`、`server/src/modules/salvage/**`
- `client/assets/scripts/features/salvage/**`
- `server/src/gateway/handlers.ts`（**仅** `salvage.claimInfo` 一行）
- `tests/determinism/salvage.test.mjs`

## 禁止修改
- `game-data/source/{shipwrecks,oil,explore}.csv`
- `packages/contracts/**`（红线）
- `server/db/migrations/**`（本版零迁移）
- 其他 `todo` 动作

## 依赖与阻塞
- Depends on：PD8-06
- Blocks：无
- 阻塞条件：若 `salvage.claimInfo` 的契约字段与 `shipwrecks` 列对不上 → 停，登记缺陷，**不许改契约**

## 建议执行档位
`opus`　理由：跨 core + server + client 三层，且 `explore` 空表要降级。

## 升级条件
若配额校验需要新的 PG 表 → 停（本版零迁移），转 v1.2。

## 预估规模
中（1 天）

---

# PD8-14 占岛与防御（island + defense）

- 阶段 / 角色 / 规划版本：C / executor / PLAN-R5
- 来源（E1）：`islands.json` 4 行（`landing_zones` 2/3 + `has_reef_cliff`）+ `defenses.json` 3 行（`recipe` 文本 **3/3 可解析成 item id**）+ `protection_cards.json` 3 行（`duration_hours` 720/168/24）+ `units.json` 3 行（**hp/speed/attack 全缺**）+ `waves.json` **0 行** + `defense/index.ts` 30 行（`distanceField` 反向 BFS 已实现）

## 归属
- 所属切片：SC-7
- 来源需求：M-1（占岛）、M-9
- 来源方案：`mvp-scope.md §5`「野人岛 + 迷宫塔防 + 回放（**第 3 周末不稳就临时改成文字结算**）」

## 目标（本卡交付什么，不交付什么——**这一段是本卡最重要的部分**）

**能交付（全部有真值支撑）**：

| 功能 | 数据依据 |
|---|---|
| 占岛：4 种岛屿模板随机抽取 | `islands` 4 行（`template`/`landing_zones`/`has_reef_cliff`） |
| 建防御：按 `defenses.recipe` 解析材料并扣背包 | `木板×10+木棍×10` → `item_0019×10 + item_0020×10`（**3/3 全部命中**，实测） |
| 布局校验：入口是否全部可达 | `defense/index.ts` 的 `distanceField` + `allEntrancesReachable`（**已实现，30 行**） |
| 保护卡：占岛后保护期 | `protection_cards.duration_hours` 720/168/24（真值） |

**不能交付（数值无源，必须显式 BLOCKED）**：

| 功能 | 为什么不能 |
|---|---|
| 袭击胜负结算 | `units` 的 `hp/speed/attack/range/unlock_level` **全部缺失**；`defenses.damage/range/hp` 也全缺；`waves` 表 0 行且 schema 只有 `id/name/note` → **没有任何一个数可以用于算胜负** |
| 波次模拟 | `waves` 表结构本身无法表达"第几波几个"（`01 §6` / `D-58` 修订说明） |

→ **D-58 的选项 A（文字结算）实测也不成立**：文字结算仍需胜负判据。
本卡因此交付「占岛 + 建防御（真材料）+ 布局校验 + 保护期」，
并把「袭击结果」做成**返回显式 `unknown` 的结构**，等设计源补 `units`/`defenses` 数值。

## 输入
- 文档：`defense/index.ts` 全文、`islands.json`、`defenses.json`、`protection_cards.json`
- 契约：无
- 前置任务：PD8-06、PD8-08（建筑解锁等级）
- 前置状态：上述四张表均有数据；`island` core 4 行空壳

## 输出
- `packages/game-core/src/island/index.ts`（`rollIsland` / `claimIsland` / `protectionUntil`）
- `packages/game-core/src/defense/index.ts`（**只加** `parseRecipe` / `canBuildDefense`；**不改** `distanceField`）
- `client/assets/scripts/features/island/**`、`client/assets/scripts/features/defense/**`
- `tests/determinism/island.test.mjs`、`tests/determinism/defense-build.test.mjs`（新建）

## Execution Steps
1. [ ] `island/index.ts`：`rollIsland(islands, rollBp)`、`claimIsland(state, island, nowMs)`、`protectionUntil(nowMs, card)`
2. [ ] `defense/index.ts` 加：
       ```ts
       /** 解析 "木板×10+木棍×10" 形式；名→id 由调用方给映射（core 不读表）。 */
       export function parseRecipe(text: string, nameToId: (n: string) => string | undefined): { id: string; count: number }[] | null
       export function canBuildDefense(cost: readonly {id:string;count:number}[], inv: Record<string, number>): { ok: boolean; missing: string[] }
       ```
3. [ ] **袭击结算显式缺口**：
       ```ts
       export type RaidOutcome = { verdict: 'unknown'; reason: 'units-stats-missing'; losses: readonly string[] };
       ```
       `reason` 用枚举值，不许用空字符串
4. [ ] `distanceField` / `allEntrancesReachable` **一行不改**（`git diff` 可验）
5. [ ] 写测试：
       - `island.test.mjs`：4 模板抽取覆盖；`protectionUntil` 对 3 张卡分别 +24h/+168h/+720h
       - `defense-build.test.mjs`：3 条 `defenses.recipe` 全部可解析且 id 存在；材料不足 → `missing` 正确
       - **负向**：`parseRecipe('木炭+布×2')` 里"木炭"缺 ×N → 返回 `null`（**不许默认按 1 处理**，见 `throwables` 的实测）

## 验收标准
- [ ] A1 `command`：`node --test tests/determinism/island.test.mjs tests/determinism/defense-build.test.mjs` → PASS
- [ ] A2 `command`：`git diff packages/game-core/src/defense/index.ts` 里 **`distanceField` / `allEntrancesReachable` 无改动**
- [ ] A3 `measure`：`defenses` 3 条 recipe 的解析成功率 = **3/3**（实测写进 EVD）
- [ ] A4 `review`：`RaidOutcome.verdict` 只可能是 `'unknown'`（本卡不允许出现 `'win'|'lose'`）
- [ ] A5 `manual`：占领一座岛、建一座箭塔、看到材料被扣（截图；无编辑器记 UNKNOWN）

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/island.test.mjs
node --import ./tools/runtime/register.mjs --test tests/determinism/defense-build.test.mjs
npm run typecheck:client
git diff --stat packages/game-core/src/defense/index.ts
```

## 证据路径
`docs/06_validation/evidence/EVD-8114/`

## 允许修改
- `packages/game-core/src/{island,defense}/**`（`defense` 只加函数）
- `client/assets/scripts/features/{island,defense}/**`
- `tests/determinism/{island,defense-build}.test.mjs`

## 禁止修改
- `game-data/source/{islands,defenses,units,waves,protection_cards}.csv`（红线：不许给 units 编 hp/attack）
- `packages/game-core/src/defense/index.ts` 的**既有两个函数**
- `packages/contracts/**`

## 依赖与阻塞
- Depends on：PD8-06、PD8-08
- Blocks：无
- 阻塞条件：**袭击胜负永远在本卡范围外**。若产品要求"这版必须能打"，→ 停，转 D-58 重新裁决（要么补 `units` 数值，要么接受只有 `unknown`）

## 建议执行档位
`opus`　理由：本版最重的一张，且要克制"把 unknown 写成 win"的冲动。

## 升级条件
第一刀超过 3 天 → **立即砍掉"岛屿模板抽取"之外的装饰性内容**，只保留"占岛 + 建塔 + 布局校验"。

## 预估规模
大（2 天）

---

# PD8-15 每日一海与称号（event + leaderboard）

- 阶段 / 角色 / 规划版本：C / executor / PLAN-R5
- 来源（E1）：`events.json` 3 行（`event_daily_sea`: 20:00-21:00、每人 1 次、3 分钟、21:05 结算）+ `titles.json` 10 行（`bonus_bp` 2500→…）+ `event_drops.json` 9 行；服务端 `event` 6 行空壳 + 3 个 `todo` 动作

## 归属
- 所属切片：SC-8
- 来源需求：M-13、M-6
- 来源方案：`leaderboard` core 空壳（4 行）但 server 283 行 / client 307 行**已真实现** → 称号的"载体"在 client，缺的是 core 的加成计算

## 目标
每天 20:00-21:00 每人参与 1 次 → 21:05 结算 → 产出箱子；排名达成 → 档案出现称号 + 加成生效。

## 输入
- 文档：`events.json`（时间窗真值）、`titles.json`（`bonus_bp` 真值）
- 契约：3 个 event 动作（`event.start` / `event.submit` / `event.result`）
- 前置任务：PD8-06、PD8-08、PD8-09
- 前置状态：`events` 3 行；`titles` 10 行；`event_drops` 9 行；服务端 event 6 行

## 输出
- `packages/game-core/src/event/index.ts`（`windowState` / `canEnter`）
- `packages/game-core/src/leaderboard/index.ts`（`titleForRank` / `applyTitleBonus`）
- `server/src/modules/event/{service,repo}.ts`（3 个动作落地，`handlers.ts` 去掉 3 个 `todo`）
- `client/assets/scripts/features/{event,leaderboard}/**`
- `tests/determinism/event.test.mjs`（新建）

## Execution Steps
1. [ ] `event/index.ts`：
       ```ts
       /** 时间窗判定：startHour..endHour，settleMinute 用于结算时刻。nowMs 由调用方给。 */
       export function windowState(ev: EventRow, nowMs: number): 'before'|'open'|'closed'|'settling'
       export function canEnter(entriesUsed: number, ev: EventRow): boolean
       ```
       **不读系统钟**（`common/time.ts` 的纪律）
2. [ ] `leaderboard/index.ts`：`titleForRank(titles, rank)`、`applyTitleBonus(basePrice, bonus_bp)`
3. [ ] 服务端 event 三动作：`start`（校验时间窗 + 次数）→ `submit`（记成绩）→ `result`（按 `event_drops` 抽箱子）
4. [ ] `handlers.ts`：`grep -c todo` 从 6 降到 **3**
5. [ ] 写 `event.test.mjs`（5 例）：
       - 19:59 → `before`；20:30 → `open`；21:30 → `closed`
       - `canEnter(1, daily_sea)` → false（`entry_limit: 1`）
       - `titleForRank(titles, 1)` → `title_rank_1`，`bonus_bp = 2500`
       - `applyTitleBonus(100, 2500)` → 125
       - 无 rank 命中（rank 20）→ 返回 null（不抛）

## 验收标准
- [ ] A1 `command`：`node --test tests/determinism/event.test.mjs` → PASS
- [ ] A2 `command`：`grep -c "todo" server/src/gateway/handlers.ts` → **3**（若 PD8-13 已做则从 6→3）
- [ ] A3 `command`：`npm run typecheck:server` → 0 错
- [ ] A4 `review`：`event/index.ts` 无 `Date.now()`（时间全由入参）
- [ ] A5 `manual`：档案页出现称号与加成数字（截图；无编辑器记 UNKNOWN）

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/event.test.mjs
npm run typecheck:server
grep -c "todo" server/src/gateway/handlers.ts
```

## 证据路径
`docs/06_validation/evidence/EVD-8115/`

## 允许修改
- `packages/game-core/src/{event,leaderboard}/**`、`server/src/modules/event/**`
- `client/assets/scripts/features/{event,leaderboard}/**`
- `server/src/gateway/handlers.ts`（**仅** 3 个 event 行）
- `tests/determinism/event.test.mjs`

## 禁止修改
- `game-data/source/{events,event_drops,titles,seasons}.csv`
- `server/src/modules/leaderboard/**`（已 283 行真实现，不改）
- `packages/contracts/**`

## 依赖与阻塞
- Depends on：PD8-06、PD8-08、PD8-09
- Blocks：无
- 阻塞条件：`seasons` 仅 1 行且 "时长待定留空" → 赛季榜**不做**，只做日榜 + 称号

## 建议执行档位
`opus`　理由：跨 event + leaderboard + titles，且要动 3 个 `todo` 动作。

## 升级条件
若 `event.result` 需要新 PG 表存成绩 → 停（本版零迁移），转 v1.2。

## 预估规模
中（1.5 天）

---

# PD8-16 聊天 + 合规 UI + 广告 UI（social / compliance / ads）

- 阶段 / 角色 / 规划版本：C / executor / PLAN-R5
- 来源（E1）：`phrases.json` **0 行** + `social` server 6 行空壳 + `compliance` client 21 行空壳 / server 33 行 + `ads` client 21 行空壳 / server 138 行

## 归属
- 所属切片：SC-9
- 来源需求：M-12（诊断可见）
- 来源方案：`RpcClient.ts:177-190`（`MOCK_HANDLERS` 的 `compliance.check` 返回 `{verified:true}`，**R-6**）

## 目标
区服频道能发快捷短语并被别人拉到；合规状态与广告剩余次数在界面上**可见**（不改判定逻辑）。

## 输入
- 文档：`R-6`（合规恒真）、`03 §2 NB-5`（`phrases` 无文案）
- 契约：`social.send` / `social.pull` 两个动作
- 前置任务：PD8-06
- 前置状态：`phrases` 0 行；server social 6 行；client 3 个 feature 各 18 行

## 输出
- `server/src/modules/social/{service,repo}.ts`（内存态消息环，**不建表**）
- `client/assets/scripts/features/social/**`（新建面板）
- `client/assets/scripts/features/{compliance,ads}/**`（只做展示，**不改判定**）
- `tests/determinism/social.test.mjs`（新建）

## Execution Steps
1. [ ] 服务端 `social`：进程内 `Map<channelId, Message[]>`（上限 50 条环形），`send` / `pull` 两动作落地，`handlers.ts` `todo` 3 → **1**（`economy.buyQuota` 留待 v1.2）
2. [ ] `phrases` 0 行 → 短语列表**从服务端下发一个空数组**，客户端显示"短语待配置"；**不自己编短语**
3. [ ] `compliance`：只显示 `compliance.check` 返回的状态；**不碰** `MOCK_HANDLERS`，但在面板上注明"当前为本地模拟（R-6 已知缺陷）"
4. [ ] `ads`：显示剩余次数（读 `ad_placements`，已有 3 行真值）
5. [ ] 写 `social.test.mjs`（4 例）：
       - send → pull 闭环（内存态）
       - 超过 50 条 → 最旧的被挤出
       - 空消息/超长文本 → 拒绝（用已有错误码）
       - `phrases` 空 → `pull` 返回的短语数组为 `[]` 且不抛

## 验收标准
- [ ] A1 `command`：`node --test tests/determinism/social.test.mjs` → PASS
- [ ] A2 `command`：`git diff --stat client/assets/scripts/services/net/RpcClient.ts` → **空**（R-6 不在本卡修）
- [ ] A3 `command`：`grep -c "todo" server/src/gateway/handlers.ts` → **1**
- [ ] A4 `review`：`compliance` / `ads` 两个 feature 里没有判定逻辑，只有渲染
- [ ] A5 `manual`：聊天面板能发出并看到一条（截图；无编辑器记 UNKNOWN）

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/social.test.mjs
npm run typecheck:server && npm run typecheck:client
grep -c "todo" server/src/gateway/handlers.ts
```

## 证据路径
`docs/06_validation/evidence/EVD-8116/`

## 允许修改
- `server/src/modules/social/**`、`client/assets/scripts/features/{social,compliance,ads}/**`
- `server/src/gateway/handlers.ts`（**仅** social 两行）
- `tests/determinism/social.test.mjs`

## 禁止修改
- `client/assets/scripts/services/net/RpcClient.ts`（**红线**：R-6 的修法需单独裁决）
- `packages/contracts/**`
- `game-data/source/phrases.csv`
- `packages/game-core/**`（social 无 core）

## 依赖与阻塞
- Depends on：PD8-06
- Blocks：无
- 阻塞条件：若聊天需要持久化（跨进程）→ 停（本版零迁移），转 v1.2

## 建议执行档位
`sonnect`　理由：3 个薄模块，服务端 74/33/138 行可参考。

## 升级条件
若被要求"顺手修掉 MOCK 合规恒真" → 停，转独立卡（属 R-6，涉及安全口径）。

## 预估规模
中（1 天）
