---
id: PLAN-V011-A
title: plan-v011 · 阶段 A（v1.0 合口）· 5 张原子任务卡
status: active
module: planning
owner: hark
created: 2026-10-29
review: 2026-11-12
related: [PLAN-V011-06, PLAN-V011-07]
---

# 阶段 A · v1.0 合口（把"扩"补成可演示行为）

## 1. 本阶段存在的原因（一句话 + 一条证据）

`glossary.md:41` 把 v1.0 定义为「捞→包→做→**扩**→卖」五环，而 `client/assets/scripts/features/raft/`
是 18 行空壳、`MainView.ts:27-34` 的 6 个 Tab 里没有筏体 —— **口径与实现差一环**。
本阶段不是"新增功能"，是**把已经写进口径的东西做出来**。

## 2. 阶段出口条件（缺一条不算出口）

- [ ] 主界面出现第 7 个入口，点进去看到船体状态并可执行"建一格"
- [ ] 建一格后：地块数 +1、金币减少、退出重进不丢
- [ ] 浮力不足时显示"还差 N"，**不显示"服务器故障"**，不自动重试
- [ ] `npm run verify` EXIT=0（本阶段唯一一次全量）
- [ ] 3 张人工截图入 `docs/06_validation/evidence/EVD-7103/`（筏 Tab / 建成 / 拒绝态）
- [ ] 本阶段改动的注释已同步（`BootController.ts:12`、`panel-types.ts:13`）

## 3. 前置裁决（**2026-10-29 已全部裁完，本阶段无阻塞**）

| 裁决 | 结果 | 对本阶段的影响 |
|---|---|---|
| **D-54** | `Q1=B`（v1.0 含扩筏 UI）+ `Q2=A`（浮力只看 `raft_tiles.capacity`） | PD7-01 **可以开工**；PD7-03 必须加第 7 个 Tab |
| **D-56** | `B`（13 模块不改 `hook` 参数，C 阶段解绑 C1 闸门） | 对本阶段无影响（A 阶段本来就不受闸门约束） |
| **D-55** | `origin` 已重指 `aideanew/WDF`；token 轮换由用户执行 | 用户告知"就绪"前**不推送**；不影响本地开工 |

原设计里"PD7-02 可以不等待 D-54"这条解耦点**已失去意义**（D-54 已裁），PD7-01 与 PD7-02 均可直接开工。

---

# PD7-01 浮力口径落账与船体数据补全

- 阶段 / 角色 / 规划版本：A / planner+executor / PLAN-R4
- 来源（E1）：`mvp-scope.md:16`（C2 核心工作）+ `glossary.md:41`（五环含扩）+ **D-54（已于 2026-10-29 裁决：Q1=B / Q2=A）**

## 归属
- 所属切片：SA-1（第一刀的前半步）
- 来源需求：mvp-scope §1 C2（:16）→ 设计源 v5.5 §4.1 → D-54
- 来源方案：`05-data-model-baseline.md §4`（存档扩展不递增版本）

## 目标
`raft_tiles` 与 `items.capacity` 的语义有一句话的定论，且该定论被一条测试锁定。

**裁决给出的定论（原样执行，不许改写）**：

> 浮力 = Σ `raft_tiles.capacity` − (Σ 船体地块自重 + 货重)；`items.capacity` 一律归 0。

## 输入
- 文档：`10-risks-pending.md §D-54`（原选项与推理）+ `decision-index.json` 的 `D-54.detail.q1/q2`（**裁决原文，以此为准**）
- 契约：无（纯数值 + 纯规则，不触 `packages/contracts/**`）
- 前置任务：无（D-54 已裁）
- 前置状态：`npm run gen` 可跑通

## 输出
- `game-data/source/raft_tiles.csv`（补到**至少 2 种地块**，见步骤 4）
- `game-data/source/items.csv`（**仅 `capacity` 列** → 全部置 `0`）
- `game-data/UNKNOWN-TABLES.md`（登记 capacity 语义的裁决出处 = D-54）
- `docs/03_solution/data/config-tables.md`（一行口径说明）
- `tests/determinism/raft-tiles.test.mjs`（**已存在**，补断言）
- `tools/guard/placeholders.baseline.json`（**单独一个提交**，见步骤 7）

## Execution Steps
1. [ ] 读 `decision-index.json` 的 `D-54.detail.q2` 原文，抄进 `config-tables.md` 的口径段落（**不写自己的解释、不改措辞**）
2. [ ] `items.capacity` 全列置 `0`（**不删列**，保 schema 稳定），并在 `UNKNOWN-TABLES.md` 写一句：「该列不参与浮力（D-54 Q2=A），保留列位以免破坏 schema 与 gen 流程」
3. [ ] `grep -rn "capacity" client/assets/scripts server/src packages/game-core/src` → 逐条确认**没有**任何代码把 `items.capacity` 当浮力用；有命中就先记进卡片 `review`，**改代码留给 PD7-02/03**
4. [ ] 补 `raft_tiles.csv`：至少 2 种地块，第 2 种的 `capacity` 与建造成本**必须能在 D-54 或设计源里找到出处**；找不到 → **停**，写进 `UNKNOWN-TABLES.md` 并回上裁决（不许自编数值）
5. [ ] `npm run gen`
6. [ ] 在 `raft-tiles.test.mjs` 加断言：「给定 1 个 `raft_block`（capacity 50 / weight 10），`remainingBuoyancy()` 返回 `50 - 10 - cargoWeight`」；并加一条**反证断言**：把某个 `items` 的 `capacity` 设成 100，`remainingBuoyancy()` 结果**不变**
7. [ ] `node tools/guard/placeholders.mjs` → 预期**新增同值命中**（`capacity` 从"部分非零"变"全 0"）→ 更新 baseline，**单独 `git add` + 单独 commit**
8. [ ] 跑定向测试

## 验收标准
- [ ] A1 `command`：`npm run gen && node --import ./tools/runtime/register.mjs --test tests/determinism/raft-tiles.test.mjs` → 全 PASS
- [ ] A2 `command`：`node tools/guard/placeholders.mjs` → **无 baseline 外新增命中**（步骤 7 已更新 baseline 且单独提交）
- [ ] A3 `file`：`docs/03_solution/data/config-tables.md` 里能搜到"浮力 = "开头的唯一口径句
- [ ] A4 `review`：`raft_tiles.csv` 每一行都能在 D-54 或设计源里找到出处
- [ ] A5 `command`：`grep -rn "\.capacity" client/assets/scripts packages/game-core/src` → 命中全部与 `raft_tiles` 有关，**无** `items.capacity`（对应 `10 §R-1'`）

## 验证命令
```bash
npm run gen
node --import ./tools/runtime/register.mjs --test tests/determinism/raft-tiles.test.mjs
node tools/guard/placeholders.mjs
grep -rn "\.capacity" client/assets/scripts packages/game-core/src
```

## 证据路径
`docs/06_validation/evidence/EVD-7101/`（D-54 原文摘录 + gen 输出 + 测试输出 + placeholders 前后对比 + A5 的 grep 输出）

## 允许修改
- `game-data/source/raft_tiles.csv`、`game-data/source/items.csv`（**仅 capacity 列**）
- `game-data/UNKNOWN-TABLES.md`、`tools/guard/placeholders.baseline.json`（需单独提交）
- `docs/03_solution/data/config-tables.md`、`tests/determinism/raft-tiles.test.mjs`

## 禁止修改
- `packages/contracts/**`、`packages/game-core/**`（规则代码在 PD7-02）
- `items.csv` 的 `weight` / `stack` / `unlock_level` 列（属 PD7-06）
- 任何 `.ts` 业务代码

## 依赖与阻塞
- Depends on：无（**D-54 已裁**）
- Blocks：PD7-02、PD7-03、PD7-04
- 残余阻塞：仅步骤 4 若"第 2 种地块的数值找不到出处"→ 局部 `BLOCKED`，其余步骤照常完成

## 建议执行档位
`opus`　理由：改的是语义口径不是代码，错一次全链返工。

## 升级条件
~~D-54 选 Q2=B~~ **已排除**（Q2=A）。若步骤 4 发现设计源对"第 2 种地块"完全无描述 → 升 `fable` 由用户给值。

## 预估规模
小（半天）

---

# PD7-02 raft 规则接线与存档投影

- 阶段 / 角色 / 规划版本：A / executor / PLAN-R4
- 来源（E1）：`mvp-scope.md:16`（C2）+ `packages/game-core/src/raft/index.ts`（已有纯函数、零调用方）

## 归属
- 所属切片：SA-1
- 来源需求：mvp-scope §1 C2（:16）→ 设计源 v5.5 §4.1 → D-07（浮力公式）+ D-54
- 来源方案：`05-data-model-baseline.md §4`（`modules.raft = { tiles: number }`，开放 map 不递增版本）

## 目标
`game-core/raft` 从"两个孤立纯函数"变成"有调用方的用例层"：能算"建一格后剩余浮力"、能写进存档、能在重启后读回。

## 输入
- 文档：`05-data-model-baseline.md §4`、`packages/game-core/src/save/schema.ts`
- 契约：无
- 前置任务：PD7-01
- 前置状态：`raft_tiles` 口径已定；`npm run gen` 通过

## 输出
- `packages/game-core/src/raft/index.ts`（新增 `tileCount` 校验 / `canBuild` / `applyBuild` 三个纯函数）
- `packages/game-core/src/save/schema.ts`（`modules.raft?: { tiles: number }`）
- `packages/game-core/src/save/migrations.ts`（缺失键补默认 `{ tiles: 0 }`）
- `tests/determinism/raft.test.mjs`（新增）

## Execution Steps
1. [ ] 读 `save/schema.ts` 现状，确认 `modules` 是开放 map（`glossary.md:40`）
2. [ ] 在 `raft/index.ts` 加 `canBuild(tiles, gold, price, capacity, weight)` → `Result<{ goldAfter, tilesAfter }>`，**复用 `common/result` 的 `ok/err`**
3. [ ] 加 `applyBuild(save)`：校验 → 扣金币 → `tiles+1`（**纯函数，不改外部状态，返回新对象**）
4. [ ] `schema.ts` 加可选字段；`migrations.ts` 加默认值补齐分支
5. [ ] 写 `raft.test.mjs`：三种情形（金币够/金币不够/浮力不够）各一条
6. [ ] 跑定向测试 + `npm run typecheck:client`

## 验收标准
- [ ] A1 `command`：`node --import ./tools/runtime/register.mjs --test tests/determinism/raft.test.mjs` → 全 PASS
- [ ] A2 `command`：`npm run typecheck:client` → 0 错
- [ ] A3 `assert`：`applyBuild` 不修改入参（冻结对象后调用不抛）
- [ ] A4 `assert`：`RAFT_TILES` 缺失时 `migrations.ts` 补出 `{ tiles: 0 }` 且 **不递增** `SAVE_SCHEMA_VERSION`
- [ ] A5 `review`：`raft/index.ts` 仍满足 game-core 纯度（无 `cc`/`Math.random`/`Date.now`/IO）

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/raft.test.mjs
npm run typecheck:client
node tools/guard/run-all.mjs        # 只关心 game-core 纯度与 generated 两项
```

## 证据路径
`docs/06_validation/evidence/EVD-7102/`

## 允许修改
- `packages/game-core/src/raft/**`、`packages/game-core/src/save/**`
- `tests/determinism/raft.test.mjs`（新建）

## 禁止修改
- `packages/contracts/**`、`client/assets/scripts/app/**`（UI 在 PD7-03）
- `packages/game-core/src/hook/**`（承重逻辑不在本卡）

## 依赖与阻塞
- Depends on：PD7-01
- Blocks：PD7-03、PD7-04
- 阻塞条件：无。D-54 已裁（Q2=A → 浮力只看 `raft_tiles.capacity`），`canBuild` 的签名直接用
  `(tiles, gold, price, capacity, weight)`；建一格的价格取 `prices` 表 `item_0072` 的 `base_price`
  （NB-1 假设，尚未被裁决覆盖 → **在卡面与 `UNKNOWN-TABLES.md` 同时注明这是假设**，见 `10 §U-1`）

## 建议执行档位
`sonnect`　理由：纯函数 + 存档扩展，`raft/index.ts` 与 `crafting` 都有范式可抄。

## 升级条件
若 `remainingBuoyancy` 需要改签名（会波及 `hook` 承重的调用）→ 升 `opus`。

## 预估规模
小（半天）

---

# PD7-03 raft 建造面板（**主控独占**，高难度 UI）

- 阶段 / 角色 / 规划版本：A / planner（主控本人）/ PLAN-R4
- 来源（E1）：`mvp-scope.md:16`（C2）+ `MainView.ts:27-34`（6 Tab 无筏体）
- **D-54 已裁 Q1=B**：v1.0 出货**含**扩筏 UI → 本卡不是可选项，是 A 段出口的必要条件

## 归属
- 所属切片：SA-1（收口刀）
- 来源需求：mvp-scope §1 C2（:16）→ 设计源 v5.5 §4.1
- 来源方案：`DESIGN-0001`（六态）+ `panel-types.ts`（PanelHandle 契约）

## 目标
玩家能在主界面点到一个"筏"Tab，看到船体地块数与剩余浮力，点"建一格"后**三个数字同时变化**（地块 +1、金币 −N、剩余浮力 ±）。

## 输入
- 文档：`client/assets/scripts/features/inventory/view/InventoryPanel.ts`（同构范式）、`app/panel-types.ts`
- 契约：`PanelHandle`（`key/node/onShow/onHide/refresh/destroy`）
- 前置任务：PD7-02
- 前置状态：`applyBuild` 可用，存档有 `modules.raft`

## 输出
- `client/assets/scripts/features/raft/view/RaftPanel.ts`（新建，导出 `createRaftPanel`）
- `client/assets/scripts/features/raft/model/RaftModel.ts`（从 5 行空壳改为真实用例层）
- `client/assets/scripts/app/panel-types.ts`（`PanelKey` 加 `'raft'`，**并订正 :13 的"4 个主 Tab"注释**）
- `client/assets/scripts/app/MainView.ts`（`TABS` 加第 7 项 + `factories` 加一行）
- `docs/06_validation/evidence/EVD-7103/01-raft-tab.png` 等 3 张

## Execution Steps
1. [ ] 读 `InventoryPanel.ts` 全文，抄它的节点构建方式（`Graphics` + `Label`，无 prefab）
2. [ ] `panel-types.ts`：`PanelKey` 加 `'raft'`；改注释为"6 个主 Tab（打捞/背包/箱子/合成/商人/榜单）+ 筏体"
3. [ ] `RaftPanel.ts`：三段式布局 —— 顶部"当前 N 格 / 剩余浮力 M"、中部"建一格（消耗 X 金币）"按钮、底部"浮力不足"位（复用 PD7-04 的拒绝组件）
4. [ ] `MainView.ts`：`TABS` 插在 `crafting` 之后（顺序：打捞/背包/箱子/合成/**筏**/商人/榜单），`factories` 加 `raft: createRaftPanel`
5. [ ] 接线：点按钮 → `RaftModel.build()` → 成功则 `refresh()` + 写本地存档 + `save.push`（走既有 `RpcClient`）
6. [ ] 截图 3 张（筏 Tab / 建成后 / 拒绝态）
7. [ ] `npm run typecheck:client`

## 验收标准
- [ ] A1 `visual`：主界面底栏有 7 个可点项，第 5 个是"筏"（截图）
- [ ] A2 `visual`：点"建一格"后，地块数从 N 变 N+1、金币按 `base_price` 减少（截图，含数字）
- [ ] A3 `visual`：杀进程重进，地块数仍是 N+1（截图）
- [ ] A4 `command`：`npm run typecheck:client` → 0 错
- [ ] A5 `review`：`RaftPanel` 不直接 `import` `MainView`（导航只走 `app/nav.ts`，`panel-types.ts:9` 明文规定）

## 验证命令
```bash
npm run typecheck:client
node tools/guard/run-all.mjs     # 客户端依赖边界 + generated 两项
```

## 证据路径
`docs/06_validation/evidence/EVD-7103/`

## 允许修改
- `client/assets/scripts/features/raft/**`
- `client/assets/scripts/app/panel-types.ts`、`client/assets/scripts/app/MainView.ts`（**仅主控**）

## 禁止修改
- `packages/game-core/**`（PD7-02 的地盘）、`packages/contracts/**`
- `app/BootController.ts`、`app/nav.ts`（本卡不需要动它们）

## 依赖与阻塞
- Depends on：PD7-02
- Blocks：无（A 段收口）
- 阻塞条件：需要 Cocos 编辑器打开工程补 `.meta`（脚本新增文件时编辑器会自动生成；**必须由编辑器生成，不许手写 `.meta`**）

## 建议执行档位
`opus`　理由：UI + 改核心文件 + 无自动化测试可依赖。

## 升级条件
不升级（已是最高执行档）。

## 预估规模
中（1.5 天）　**不小于 2 小时，独立成刀是对的**

---

# PD7-04 浮力/承重拒绝的六态落地

- 阶段 / 角色 / 规划版本：A / planner+executor / PLAN-R4
- 来源（E1）：`common/ux.ts:40`（未知码兜底 = error+retryable）+ `raft/index.ts:18`（`err(3101, …)`）

## 归属
- 所属切片：SA-2
- 来源需求：DESIGN-0001 §2（六态）→ `03 §2.1 M-3`
- 来源方案：`04-contract-freeze.md §②`（**零契约改动**，客户端本地拦截 `3101`）

## 目标
浮力不足时玩家看到的是"还差 N（业务拒绝）"，**不是**"服务暂时不可用，请重试"。

## 输入
- 文档：`packages/contracts/src/common/ux.ts:40`、`docs/03_solution/design/DESIGN-0001-ux-states.md`
- 契约：`UxView`（不改）
- 前置任务：PD7-02
- 前置状态：`checkChange` / `canBuild` 会返回 `err(3101)`

## 输出
- `client/assets/scripts/app/ux-hint.ts`（加 `3101` 的文案与"不可重试"处理）
- `client/assets/scripts/features/raft/view/RaftPanel.ts`（调用处的拒绝渲染）
- `tests/determinism/ux-hint.test.mjs`（补一条断言）
- `client/assets/scripts/app/BootController.ts`（**仅订正 :12 的"（mock）"字样**，I-01）

## Execution Steps
1. [ ] **先验证现状**：写一行临时断言 `toUxState(3101)`，确认它目前返回 `{state:'error', retryable:true}`
2. [ ] 在 `ux-hint.ts` 加 `3101` 分支：`{ state: 'error', retryable: false, text: (差额) => \`浮力不足，还差 ${差额}\` }`
3. [ ] **不改 `common/ux.ts`**（那是契约源）；用"本地拦截"：`RaftModel` 拿到 `err(3101)` 时直接构造拒绝 UI，不经过 `toUxState`
4. [ ] `RaftPanel` 渲染差额数字（`err.message` 里已含 `还差 N`，`raft/index.ts:18`）
5. [ ] 订正 `BootController.ts:12` 的"（mock）"（I-01）
6. [ ] 补 `ux-hint.test.mjs` 断言：`3101` 在 hint 层是 not retryable
7. [ ] 截图"拒绝态"（A 段出口要求的第 3 张）

## 验收标准
- [ ] A1 `command`：`node --import ./tools/runtime/register.mjs --test tests/determinism/ux-hint.test.mjs` → PASS
- [ ] A2 `assert`：`common/ux.ts` 的 diff 为空（零契约改动）
- [ ] A3 `visual`：拒绝态截图里**不出现**"服务暂时不可用"字样，出现"还差"与数字
- [ ] A4 `manual`：拒绝后不自动重试（点一次只发一次请求，看日志）

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/ux-hint.test.mjs
git diff --stat packages/contracts/    # 必须为空
```

## 证据路径
`docs/06_validation/evidence/EVD-7104/`

## 允许修改
- `client/assets/scripts/app/ux-hint.ts`、`client/assets/scripts/features/raft/view/RaftPanel.ts`
- `client/assets/scripts/app/BootController.ts`（**仅第 12 行注释**）
- `tests/determinism/ux-hint.test.mjs`

## 禁止修改
- `packages/contracts/**`（**本卡的红线**）
- `packages/game-core/src/raft/index.ts`（`3101` 的产生方不改）

## 依赖与阻塞
- Depends on：PD7-02
- Blocks：A 段出口
- 阻塞条件：若发现必须改 `common/ux.ts` 才能修 → 停，改走 ADR（契约解冻窗口）

## 建议执行档位
`opus`　理由：触及六态契约的语义边界，改错会把"业务拒绝"变成"系统错误"。

## 升级条件
不升级。

## 预估规模
小（半天）

---

# PD7-05 海域潮汐窗口可见

- 阶段 / 角色 / 规划版本：A / executor / PLAN-R4
- 来源（E1）：`REQ-NF` 无关；来源是 `glossary.md:20`（潮汐定义）+ `mvp-scope.md:24`（sea 在 v1.0 表内）
- 前置事实：`services/time` 是 2 行空壳（`02 §2 S-1`），`tides` 表 0 行

## 归属
- 所属切片：SA-3
- 来源需求：mvp-scope §2 表第 1 行（`hook / sea / fishing`：浅海打捞、潮汐）→ 设计源 v5.5 §2
- 来源方案：`packages/game-core/src/sea/index.ts`（`tideState()` 已实现，零调用方）

## 目标
打捞面板上出现一行"潮汐：未开始 / 进行中（剩 X 分）"，数值随服务器时间推进，且**不需要 `tides` 表**。

## 输入
- 文档：`packages/game-core/src/sea/index.ts:4-16`
- 契约：`LoginRes.serverTime`（已有，用于算偏移）
- 前置任务：无
- 前置状态：`sea/index.ts` 已有 `TIDE_PERIOD_MS = 6h`、`TIDE_DURATION_MS = 10min`

## 输出
- `client/assets/scripts/services/time/index.ts`（从空壳改为：记录 `serverTime - localTime` 偏移，`now()` 返回校正后时间）
- `client/assets/scripts/features/sea/model/SeaModel.ts`（调 `tideState(now(), anchor)`）
- `client/assets/scripts/features/hook/view/HookPanel.ts`（顶部加一行 Label）
- `tests/determinism/sea-tide.test.mjs`（新增）

## Execution Steps
1. [ ] `services/time`：`syncFromServer(serverTime)` + `nowMs()`（**不引入定时器**，纯偏移）
2. [ ] 在 `BootController` 登录成功后调 `syncFromServer(l.serverTime)`
3. [ ] `SeaModel`：`anchor` 取 **固定常量 0**（`tideState` 的 `anchorMs` 语义是"基准时刻"，现在的实现允许传 0 —— 周期计算对 anchor 无依赖，`sea/index.ts:8` 的取模保证）
4. [ ] `HookPanel` 顶部加 Label，`onShow` 时刷新一次（**不订阅每帧**，避免掉帧）
5. [ ] 写 `sea-tide.test.mjs`：给 3 个时刻断言 `active` 与 `endsMs`
6. [ ] `npm run typecheck:client`

## 验收标准
- [ ] A1 `command`：`node --import ./tools/runtime/register.mjs --test tests/determinism/sea-tide.test.mjs` → PASS
- [ ] A2 `assert`：`services/time` 不再返回 mock（`grep -c "MODULE_ID" services/time/index.ts` → 0）
- [ ] A3 `visual`：打捞面板顶部出现潮汐行（截图）
- [ ] A4 `review`：没有新增 setInterval / 定时器（`grep -rn "setInterval" client/assets/scripts` 无新增）

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/sea-tide.test.mjs
npm run typecheck:client
```

## 证据路径
`docs/06_validation/evidence/EVD-7105/`

## 允许修改
- `client/assets/scripts/services/time/**`、`client/assets/scripts/features/sea/**`
- `client/assets/scripts/features/hook/view/HookPanel.ts`（**仅顶部一行**）
- `client/assets/scripts/app/BootController.ts`（**仅加一行** `syncFromServer`）
- `tests/determinism/sea-tide.test.mjs`（新建）

## 禁止修改
- `packages/game-core/src/sea/index.ts`（`tideState` 已定，不改）
- `game-data/source/tides.csv`（v1.1 的 31 张空表之一，本卡**不填**）

## 依赖与阻塞
- Depends on：无
- Blocks：无（SA-3 是 A 段的独立旁支）
- 阻塞条件：若发现 `tideState` 的 `nextStartMs` 在 `active=true` 时也算错（`sea/index.ts:13` 两个分支返回同一个值，疑似冗余）→ **登记缺陷，不改**，交 PD7-05 的 review 段说明

## 建议执行档位
`sonnect`　理由：消费已冻结的纯函数 + 一个 2 行空壳的最小实现。

## 升级条件
若 `services/time` 的实现牵涉全局时间偏移口径（SR-06）→ 升 `opus`。

## 预估规模
小（半天到 1 天）
