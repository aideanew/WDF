---
id: PLAN-V012-A
title: plan-v012 · 阶段 A（v1.0 收口）· 4 张原子任务卡
status: active
module: planning
owner: hark
created: 2026-10-30
review: 2026-11-13
related: [PLAN-V012-06, PLAN-V012-07]
---

# 阶段 A · v1.0 收口（把"扩"补成可演示行为）

## 1. 本阶段存在的原因（一句话 + 三条证据）

`glossary.md` 把 v1.0 定义为「捞→包→做→**扩**→卖」五环，而：

| 证据 | 事实 |
|---|---|
| `MainView.ts:27-33` | 主界面 **6 个 Tab**，没有"筏" |
| `panel-types.ts:13` | `PanelKey` 6 个键，没有 `'raft'` |
| `features/raft/` | 3 文件 **18 行**空壳；`RaftModel` 方法体一件没有 |
| `game-core/raft/index.ts` | 只有 `remainingBuoyancy` + `checkChange`，**无 `canBuild`/`applyBuild`**，且**客户端零调用** |

D-54 已裁 `Q1=B`（v1.0 **含**扩筏 UI）→ 本阶段不是"新增功能"，是**把已写进口径的东西做出来**。

## 2. 前置裁决（开工前必读）

| 裁决 | 状态 | 对本阶段的影响 |
|---|---|---|
| **D-54** | ✅ `DECIDED`（Q1=B / Q2=A） | 本阶段全部 4 张卡的前提 |
| **D-57** | ⚠ `PROPOSED` | **只卡 PD8-02 步骤 2**（`canBuild` 签名）。其余三步可先做 |
| D-56 | ✅ `DECIDED`（B） | 无影响（A 段不受 C1 闸门约束） |

## 3. 阶段出口条件（缺一条不算出口）

- [ ] 主界面出现第 **7** 个入口，点进去看到船体状态并可执行"建一格"
- [ ] 建一格后：地块数 +1、剩余浮力 **+40**（cap+50 − weight+10）、退出重进不丢
- [ ] 浮力不足时显示"还差 N"，**不显示"服务器故障"**，不自动重试
- [ ] 打捞面板顶部显示潮汐行
- [ ] `npm run verify` EXIT=0（**本阶段唯一一次全量**）
- [ ] 4 张人工截图入 `docs/06_validation/evidence/EVD-8103/`（筏 Tab / 建成 / 拒绝态 / 潮汐行）
- [ ] 本阶段改动的过期注释已同步（`panel-types.ts:5` 的"4 个主 Tab"、`BootController.ts:12` 的"（mock）"、`raft/index.ts:4` 的"全部船体材料"）

---

# PD8-02 raft 规则层：canBuild / applyBuild + 存档投影

- 阶段 / 角色 / 规划版本：A / executor / PLAN-R5
- 来源（E1）：`mvp-scope.md:16`（C2）+ `packages/game-core/src/raft/index.ts`（已有两个纯函数、零调用方）+ D-54 Q1=B

## 归属
- 所属切片：SA-1
- 来源需求：M-2（捞—做—扩闭环）
- 来源方案：`05-data-model-baseline.md §5`（`modules.raft = { tiles: number }`，开放 map **不递增**版本）

## 目标
`game-core/raft` 从"两个孤立纯函数"变成"有调用方的用例层"：能算"建一格后是否可行"、能写进存档、能在重启后读回。

## 输入
- 文档：`05-data-model-baseline.md §5`、`packages/game-core/src/save/schema.ts:15`（`modules: Record<string, unknown>`）
- 契约：无（纯规则，不触 `packages/contracts/**`）
- 前置任务：无
- 前置状态：`raft_tiles.csv` 有 1 行（`raft_block / item_0072 / 50 / 10`）；`remainingBuoyancy` 已实现

## 输出
- `packages/game-core/src/raft/index.ts`（新增 `canBuild` / `applyBuild`；**不改** `remainingBuoyancy` 签名）
- `packages/game-core/src/raft/index.ts` 第 4 行注释订正（I-07：`全部船体材料` → `raft_tiles.capacity`，引 D-54）
- `packages/game-core/src/save/schema.ts`（`modules.raft?: { tiles: number }`）
- `packages/game-core/src/save/migrations.ts`（缺失键补 `{ tiles: 0 }`）
- `tests/determinism/raft.test.mjs`（新建）

## Execution Steps
1. [ ] 读 `save/schema.ts` + `migrations.ts` 现状，确认 `modules` 是开放 map，**不需要**递增 `SAVE_SCHEMA_VERSION`
2. [ ] **（等 D-57）** 在 `raft/index.ts` 加 `canBuild`：
       - 若 D-57 = A：`canBuild(hull: readonly Load[], cargoWeight: number, ownedTiles: number): Result<{ tilesAfter: number }>`
       - 若 D-57 = B：`canBuild(hull, cargoWeight, gold: number, price: number): Result<{ goldAfter: number; tilesAfter: number }>`
       **复用 `common/result` 的 `ok`/`err`**；浮力不足时 `err(3101, '浮力不足，还差 N')`（与 `checkChange` 文案一致）
3. [ ] 加 `applyBuild`：校验 → 消耗项（按 D-57）→ `tiles + 1`，**纯函数，不改入参，返回新对象**
4. [ ] `schema.ts` 加可选字段；`migrations.ts` 加"缺键补默认 `{ tiles: 0 }`"分支（**不递增** `SAVE_SCHEMA_VERSION`）
5. [ ] 写 `raft.test.mjs`：4 条用例
       - 可建：1 个 raft_block + 空货 → `canBuild` 返回 ok，`tilesAfter = 2`
       - 浮力不足：`cargoWeight` 撑满 → 返回 `err(3101)`，msg 含"还差"
       - 持有/金币不足（按 D-57）→ 返回对应 err
       - `applyBuild` 不改入参（`Object.freeze` 后调用不抛）
6. [ ] 跑定向测试 + `npm run typecheck:client`

## 验收标准
- [ ] A1 `command`：`node --import ./tools/runtime/register.mjs --test tests/determinism/raft.test.mjs` → 全 PASS
- [ ] A2 `command`：`npm run typecheck:client` → 0 错
- [ ] A3 `assert`：`applyBuild` 对 `Object.freeze` 的入参调用不抛（不改入参）
- [ ] A4 `assert`：`modules.raft` 缺失时 `migrations.ts` 补出 `{ tiles: 0 }`，且 `SAVE_SCHEMA_VERSION` **未变**
- [ ] A5 `review`：`raft/index.ts` 仍满足 game-core 纯度（无 `cc` / `Math.random` / `Date.now` / IO）
- [ ] A6 `review`：`remainingBuoyancy` 的**函数体未被修改**（`git diff` 里它只有注释变化）

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/raft.test.mjs
npm run typecheck:client
node tools/guard/run-all.mjs
```

## 证据路径
`docs/06_validation/evidence/EVD-8102/`

## 允许修改
- `packages/game-core/src/raft/**`、`packages/game-core/src/save/**`
- `tests/determinism/raft.test.mjs`（新建）

## 禁止修改
- `packages/contracts/**`
- `client/assets/scripts/**`（UI 在 PD8-03）
- `packages/game-core/src/hook/**`（承重逻辑不在本卡）
- `game-data/source/*.csv`（本卡不改数值）

## 依赖与阻塞
- Depends on：无
- Blocks：PD8-03、PD8-11
- 阻塞条件：**D-57 未裁 → 步骤 2 只写"拒绝分支"与 `tilesAfter` 的计算，扣减项留 `// TODO(D-57)`**；步骤 1/3/4/5 照常完成

## 建议执行档位
`opus`　理由：决定 `canBuild` 签名与存档投影，错一次 UI 全返工。

## 升级条件
若发现必须改 `remainingBuoyancy` 的签名（会波及 `hook` 的承重调用）→ 升 `fable` 并先提交 ADR。

## 预估规模
小（半天）
---

# PD8-03 raft 建造面板（**主控独占**，高难度 UI）

- 阶段 / 角色 / 规划版本：A / **planner（主控本人）** / PLAN-R5
- 来源（E1）：`mvp-scope.md:16`（C2）+ `MainView.ts:27-33`（6 Tab 无筏体）+ **D-54 Q1=B（已裁，含扩筏 UI）**

## 归属
- 所属切片：SA-2
- 来源需求：M-2
- 来源方案：`DESIGN-0001`（六态）+ `panel-types.ts`（`PanelHandle` 契约）

## 目标
玩家能在主界面点到一个"筏"Tab，看到地块数与剩余浮力，点"建一格"后**三个数字同时变化**（地块 +1、浮力 +40、按 D-57 的消耗项减少）。

## 输入
- 文档：`client/assets/scripts/features/inventory/view/InventoryPanel.ts`（同构范式，310 行）、`app/panel-types.ts`
- 契约：`PanelHandle`（`key` / `node` / `onShow` / `onHide` / `refresh` / `destroy`）
- 前置任务：PD8-02
- 前置状态：`canBuild` / `applyBuild` 可用；存档有 `modules.raft`

## 输出
- `client/assets/scripts/features/raft/model/RaftModel.ts`（从空壳改为真实用例层）
- `client/assets/scripts/features/raft/view/RaftPanel.ts`（新建，导出 `createRaftPanel`）
- `client/assets/scripts/app/panel-types.ts`（`PanelKey` 加 `'raft'`，**并订正 :5 的"4 个主 Tab"注释** → I-01）
- `client/assets/scripts/app/MainView.ts`（`TABS` 加第 7 项 + `factories` 加一行）
- `docs/06_validation/evidence/EVD-8103/*.png`（3 张）

## Execution Steps
1. [ ] 读 `InventoryPanel.ts` 全文，抄它的节点构建方式（`Graphics` + `Label`，**无 prefab**）
2. [ ] 读 `tables.ts:16-25`，确认 `raft_tiles` **不在** `TableName` 里 → 本卡**不读表**，浮力值由 `canBuild` 入参传入；
       若必须读 `raft_tiles`，**先做 PD8-06 或在卡内提出**，不许在 `tables.ts` 里私加表名（那是 PD8-06 的地盘）
3. [ ] `panel-types.ts`：`PanelKey` 加 `'raft'`；注释改为"7 个主 Tab（打捞/背包/箱子/合成/**筏**/商人/榜单）+ 设置浮层"
4. [ ] `RaftPanel.ts`：三段式布局 —— 顶部"当前 N 格 / 剩余浮力 M"、中部"建一格"按钮、底部拒绝态位
5. [ ] `MainView.ts`：`TABS` 插在 `crafting` 之后（顺序：打捞/背包/箱子/合成/**筏**/商人/榜单），`factories` 加 `raft: createRaftPanel`
6. [ ] `RaftModel.ts` 接线：点按钮 → `canBuild` → 成功 `applyBuild` → 写本地存档 → `save.push`（走既有 `RpcClient`）→ `refresh()`
7. [ ] 截图 3 张（筏 Tab / 建成后 / 重进后仍为 N+1）
8. [ ] `npm run typecheck:client`
9. [ ] 订正 `BootController.ts:12` 的"（mock）"（I-02）——**只改注释**，改前先确认 `:61` 调的是 `getPlatform().login()`

## 验收标准
- [ ] A1 `manual`：主界面底栏有 **7** 个可点项，第 5 个是"筏"（截图）
- [ ] A2 `manual`：点"建一格"后，地块数 N→N+1、剩余浮力 +40（截图含数字）
- [ ] A3 `manual`：杀进程重进，地块数仍是 N+1（截图）
- [ ] A4 `command`：`npm run typecheck:client` → 0 错
- [ ] A5 `review`：`RaftPanel` 不直接 `import` `MainView`（导航只走 `app/nav.ts`，`panel-types.ts:9` 明文规定）

## 验证命令
```bash
npm run typecheck:client
node tools/guard/run-all.mjs     # 客户端依赖边界 + generated 两项
```

## 证据路径
`docs/06_validation/evidence/EVD-8103/`

## 允许修改
- `client/assets/scripts/features/raft/**`
- `client/assets/scripts/app/panel-types.ts`、`client/assets/scripts/app/MainView.ts`（**仅本卡**）
- `client/assets/scripts/app/BootController.ts`（**仅第 12 行注释**）

## 禁止修改
- `packages/game-core/**`（PD8-02 的地盘）、`packages/contracts/**`
- `client/assets/scripts/services/config/tables.ts`（PD8-06 的地盘）
- `app/nav.ts`（本卡不需要动）

## 依赖与阻塞
- Depends on：PD8-02
- Blocks：PD8-04、PD8-11
- 阻塞条件：**需要 Cocos 编辑器生成新文件 `.meta`**（`AGENTS.md:29`）。本机无编辑器（F-1）→
  若执行环境缺编辑器，**本卡记 `BLOCKED-HUMAN`，不许手写 `.meta`**

## 建议执行档位
`opus`　理由：UI + 改核心文件 + 无自动化测试可依赖。

## 升级条件
若需要改 `Boot.scene` / 新增 prefab → 升 `fable`（且必须有编辑器）。

## 预估规模
中（1.5 天）　**大于 2 小时，独立成刀是对的**

---

# PD8-04 浮力/承重拒绝的六态落地

- 阶段 / 角色 / 规划版本：A / executor / PLAN-R5
- 来源（E1）：`common/ux.ts:64`（未知码兜底 = `error + retryable`）+ `raft/index.ts:18`（`err(3101, …)`）

## 归属
- 所属切片：SA-3
- 来源需求：M-4（拒绝态可辨）
- 来源方案：`04-contract-freeze.md` G-2（**零契约改动**，客户端本地拦截）

## 目标
浮力不足时玩家看到"还差 N（业务拒绝）"，**不是**"服务暂时不可用，请重试"。

## 输入
- 文档：`packages/contracts/src/common/ux.ts:64`、`client/assets/scripts/app/ux-hint.ts`（现有 66 行）
- 契约：`UxView`（**不改**）
- 前置任务：PD8-03
- 前置状态：`RaftPanel` 存在并可触发 `err(3101)`

## 输出
- `client/assets/scripts/app/ux-hint.ts`（新增 `rejectionPlan(code, msg)` 与 `BUSINESS_REJECTIONS` 表，含 `3101`）
- `client/assets/scripts/features/raft/view/RaftPanel.ts`（调用 `rejectionPlan` 渲染拒绝态）
- `tests/determinism/ux-hint.test.mjs`（补断言）

## Execution Steps
1. [ ] **先验证现状（不许跳过）**：写一行临时断言 `toUxState(3101)`，确认它返回
       `{ state: 'error', retryable: true }` —— 这是"必须本地拦截"的证据，抄进 EVD
2. [ ] `ux-hint.ts` 新增：
       ```ts
       export const BUSINESS_REJECTIONS: Record<number, (msg: string) => UxHintPlan> = {
         3101: (msg) => ({ text: msg, next: undefined, retryable: false }),  // 浮力不足：不可重试
       };
       export function rejectionPlan(code: number, msg: string): UxHintPlan | null
       ```
       **不改 `uxHintPlan` 的既有签名**（向后兼容）
3. [ ] **不改 `packages/contracts/src/common/ux.ts`**（契约源）。这是本卡的红线
4. [ ] `RaftPanel`：拿到 `err(3101)` 时调 `rejectionPlan(3101, err.msg)`，**不经 `toUxState`**
5. [ ] 补 `ux-hint.test.mjs`：
       - `rejectionPlan(3101, '浮力不足，还差 12')` → `{ text: '浮力不足，还差 12', retryable: false }`
       - `rejectionPlan(4999, 'x')` → `null`（未登记码不接管）
       - **负向断言**：`toUxState(3101).retryable === true`（证明"不拦截就会误报"，把契约缺口钉在测试里）
6. [ ] 跑定向测试

## 验收标准
- [ ] A1 `command`：`node --import ./tools/runtime/register.mjs --test tests/determinism/ux-hint.test.mjs` → PASS
- [ ] A2 `command`：`git diff --stat packages/contracts/` → **输出为空**（零契约改动）
- [ ] A3 `manual`：拒绝态截图里**不出现**"服务暂时不可用"字样，出现"还差"与数字
- [ ] A4 `manual`：拒绝后不自动重试（点一次只发一次请求，看日志）

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/ux-hint.test.mjs
git diff --stat packages/contracts/
```

## 证据路径
`docs/06_validation/evidence/EVD-8104/`（含步骤 1 的 `toUxState(3101)` 实测输出）

## 允许修改
- `client/assets/scripts/app/ux-hint.ts`
- `client/assets/scripts/features/raft/view/RaftPanel.ts`
- `tests/determinism/ux-hint.test.mjs`

## 禁止修改
- `packages/contracts/**`（**本卡红线**）
- `packages/game-core/src/raft/index.ts`（`3101` 的产生方不改）
- `app/BootController.ts`（原计划在此订正注释，已移交 PD8-03 → O-3）

## 依赖与阻塞
- Depends on：PD8-03
- Blocks：A 段出口
- 阻塞条件：若发现必须改 `common/ux.ts` 才能修 → **停**，改走 ADR（契约解冻窗口，属 v1.1）

## 建议执行档位
`opus`　理由：触及"业务拒绝 vs 系统错误"的语义边界，改错会把业务拒绝变成系统错误。

## 升级条件
不升级。

## 预估规模
小（半天）

---

# PD8-05 海域潮汐窗口可见

- 阶段 / 角色 / 规划版本：A / executor / PLAN-R5
- 来源（E1）：`glossary.md`（潮汐定义）+ `mvp-scope.md:24`（sea 属 v1.0）+ `game-core/src/sea/index.ts:4-16`（`tideState` 已实现、**零调用方**）

## 归属
- 所属切片：SA-4
- 来源需求：M-10（潮汐可见）
- 来源方案：`packages/game-core/src/sea/index.ts`（`TIDE_PERIOD_MS = 6h` / `TIDE_DURATION_MS = 10min`）

## 目标
打捞面板上出现一行"潮汐：未开始 / 进行中（剩 X 分）"，数值随服务器时间推进，**不读 `tides` 表**。

## 输入
- 文档：`packages/game-core/src/sea/index.ts`
- 契约：`LoginRes.serverTime`（已有，用于算偏移）
- 前置任务：无
- 前置状态：`tides.csv` 有 1 行，但 `tideState` 的周期是常量、**不需要表**

## 输出
- `client/assets/scripts/services/time/index.ts`（从 2 行空壳改为：记录 `serverTime − localTime` 偏移，`nowMs()` 返回校正值）
- `client/assets/scripts/features/sea/model/SeaModel.ts`（调 `tideState(nowMs(), 0)`）
- `client/assets/scripts/features/hook/view/HookPanel.ts`（顶部加一行 Label，**仅此文件**）
- `client/assets/scripts/app/BootController.ts`（登录成功后加一行 `syncFromServer(l.serverTime)`；**顺带订正 :12 的"（mock）"**）
- `tests/determinism/sea-tide.test.mjs`（新建）

## Execution Steps
1. [ ] `services/time`：`syncFromServer(serverTime: number)` + `nowMs()`（**不引入定时器**，纯偏移）
2. [ ] `BootController` 登录成功后调 `syncFromServer(l.serverTime)`
3. [ ] `SeaModel`：`anchor` 传 **0**（`tideState` 用取模，对 anchor 无依赖，读 `sea/index.ts` 自行确认后写进注释）
4. [ ] `HookPanel` 顶部加 Label，`onShow` 时刷新一次（**不订阅每帧**，避免掉帧）
5. [ ] 写 `sea-tide.test.mjs`：给 3 个时刻断言 `active` 与 `endsMs`
6. [ ] `npm run typecheck:client`

## 验收标准
- [ ] A1 `command`：`node --import ./tools/runtime/register.mjs --test tests/determinism/sea-tide.test.mjs` → PASS
- [ ] A2 `command`：`grep -c "MODULE_ID" client/assets/scripts/services/time/index.ts` → 0（不再返回 mock）
- [ ] A3 `manual`：打捞面板顶部出现潮汐行（截图）
- [ ] A4 `command`：`grep -rn "setInterval" client/assets/scripts` → **无新增**（本卡不许引入定时器）

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/sea-tide.test.mjs
npm run typecheck:client
grep -rn "setInterval" client/assets/scripts
```

## 证据路径
`docs/06_validation/evidence/EVD-8105/`

## 允许修改
- `client/assets/scripts/services/time/**`、`client/assets/scripts/features/sea/**`
- `client/assets/scripts/features/hook/view/HookPanel.ts`（**仅顶部一行**）
- `client/assets/scripts/app/BootController.ts`（仅加 1 行 + 第 12 行注释）
- `tests/determinism/sea-tide.test.mjs`（新建）

## 禁止修改
- `packages/game-core/src/sea/index.ts`（`tideState` 已定，不改）
- `game-data/source/tides.csv`（本卡不填表）
- `client/assets/scripts/features/hook/view/HookView.ts`、`model/HookModel.ts`（PD8-07 的地盘）

## 依赖与阻塞
- Depends on：无
- Blocks：无（SA-4 是 A 段独立旁支）
- 阻塞条件：若发现 `tideState` 的 `nextStartMs` 在 `active=true` 时也算错 → **登记缺陷，不改**，在 review 段说明

## 建议执行档位
`sonnect`　理由：消费已冻结的纯函数 + 一个 2 行空壳的最小实现。

## 升级条件
若 `services/time` 牵涉全局时间偏移口径（SR-06）→ 升 `opus`。

## 预估规模
小（半天到 1 天）
