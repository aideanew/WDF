---
id: PLAN-V005-01
title: 事实基线（2026-10-27 15:00 实测，逐条带证据）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V005-00]
---

# 01 · 事实基线

> **基线时间戳**：初版 2026-10-27 15:00–15:20（GMT+8）；**15:13 复测发现外部并行改动**，差异见 §10。
> 采集方式：本地工作树逐命令实测，**未采信任何上游文档的进度描述**。
> 证据编号规则：`E-xx`（Environment/Evidence），全文引用一致。
>
> **动态声明**：本仓库当前存在**并行执行者**（另一会话按 EXEC-BRIEF-0003 在写卡）。因此"红/绿"是**时点快照**，不是恒定状态。
> 读本文件时，先看 §10 的漂移记录，再用各节给过的命令自行复测——**命令比结论可靠**。

## 1. 仓库与提交基线

### 1.1 提交链

```text
470436e  feat(4007): 商人页 UI——3 商人切换/sellValue 复算单价/顶部额度/卖出落 modules.wallet (D-15~D-18)   ← HEAD
4fa909e  fix(guard): frontMatter 兼容 CRLF + 8 张 plan-v004 卡补 front matter + export.zip 归档
d51db60  docs(dispatch): D-15~D-18 裁决
565d108  docs(plan): add plan-v004 and associated task cards
3c1add1  docs(dispatch): 卡链更新——4012 PASS、4014 主控裁定关闭
8908704  feat(4012): 包体基线 PASS——主包 2.913MB/预算 4MB 余量 26.6%
```

证据 `E-01`：`git log --oneline -12`。

### 1.2 工作区脏状态（**关键**）

| 文件 | 改动 | 归属卡 |
|---|---|---|
| `packages/contracts/src/common/errors.ts` | +`BIND_TICKET_INVALID: 2004` | TASK-4015 步骤 1 |
| `packages/contracts/src/common/ux.ts` | +2004 的 UX 映射，注释 14→15 | TASK-4015 步骤 3 |
| `packages/contracts/src/economy/index.ts` | `SellReq` 增 `merchantId?` | 4006 遗留 + D-18 |

证据 `E-02`：`git status --porcelain` + `git diff --stat` → 3 files changed, 11 insertions(+), 3 deletions(-)。

**结论 `F-01`**：TASK-4015 只做了 **6 步中的 2 步**（errors + ux），且**未提交、未 sync、未改测试**，直接把仓库推到红灯。

## 2. 质量闸门实测（v1.0 的硬门）

### 2.1 `npm run guard` → **FAIL（3 处）**

```text
✅ 根目录白名单 / ✅ game-core+contracts 纯度 / ✅ 客户端依赖边界
✅ 服务端依赖边界 / ✅ 模块清单与目录一致 / ✅ Asset Bundle 规则
❌ 生成物未手改且已同步（3）
   - 客户端副本过期：packages/contracts/src/common/errors.ts（npm run sync）
   - 客户端副本过期：packages/contracts/src/common/ux.ts（npm run sync）
   - 客户端副本过期：packages/contracts/src/economy/index.ts（npm run sync）
✅ 文档 front matter / ✅ 无空目录
守卫未通过：3 处
```

证据 `E-03`：`npm run guard` 全量输出（`/tmp/wdf_guard.log`）。
**归因**：`F-01` 的直接后果，`npm run sync` 未执行。

### 2.2 `npm test` → 初版 **FAIL（126/127）**，15:13 复测已转 **PASS（127/127）**

初版（15:0x）实测：

```text
✖ tests\contract\ux.test.mjs:34
  14 个错误码全覆盖，且逐行与 DESIGN-0001 §2 一致
  AssertionError: ERR 码数量应为 14（合同冻结）  15 !== 14
ℹ tests 127 / pass 126 / fail 1 / duration 5948ms
```

15:13 复测：

```text
ℹ tests 127 / pass 127 / fail 0     EXIT=0
```

**归因**：外部并行执行者已补 `tests/contract/ux.test.mjs`（`EXPECTED` 增 `BIND_TICKET_INVALID`，断言 14→15）与 `tests/integration/bind.test.mjs`（五处断言改 2004），故转绿。详见 §10。
**仍成立的部分**：`DESIGN-0001-ux-states.md` **至今没有 2004 行**（`grep -c "BIND_TICKET_INVALID"` → 0）——**测试绿了，但设计文档没同步**。这正是步骤 1 §2.2.3 要补的（`F-02` 的**残留形态**：从"测试红"变成"文档漂移"）。

### 2.3 客户端类型检查

未在本轮复跑（依赖 3 个 dirty 文件先归位）。列为步骤 1 的出口断言 `V-1.3`。

## 3. 数据基线：46 张表，11 有数 / 35 空

| 有数表（11） | 行数 | 空表（35，节选） |
|---|---|---|
| `items` | 106 | bait / blueprints / consumers / crew_traits / defenses |
| `prices` | 106 | drops / event_drops / events / explore / fish |
| `recipes` | 80 | foods / generators / islands / **jobs** / levels |
| `facilities` | 9 | limits / lines / lockpick_tools / oil / phrases |
| `buildings` | 6 | protection_cards / quality / raft_tiles / regions |
| `locks` | 5 | rooms / seasons / shipwrecks / spawns / throwables |
| `guide_steps` | 5 | tides / titles / units / unlocks / waves / zones |
| `chests` | 3 / `merchants` 3 / `ad_placements` 3 / `hooks` 1 | |

证据 `E-05`：Python 逐表统计 `game-data/source/*.csv`（表头计 0 行即空）。

### 3.1 `locks` 与 `chests` 真实内容（**决定 4009 可行性**）

```csv
# locks.csv —— 锁数值齐备
none,0,0,      iron,3,0,      copper,5,0,      silver,8,0,      gold,12,0,

# chests.csv —— 三箱 lock 全为 none
chest_wood,wood,none,true,1
chest_copper,copper,none,true,1
chest_iron,iron,none,true,1
```

证据 `E-06`：`cat game-data/source/locks.csv` / `chests.csv`。

**结论 `F-03`（重大）**：当前数值下**没有任何一个箱子是上锁的**（`lock=none` → `hits_required=0`）。TASK-4009 的"打捞出带锁箱子弹连点开锁"在真机上**永远不会被触发**，功能可写但**不可被观测验证**。必须在 `03` 的 D-20 裁决。

### 3.2 箱子 id 与物品 id **两套体系**（**决定 4009 可落地性**）

| 来源 | id 形态 | 样例 |
|---|---|---|
| `items.csv`（背包里的 itemId） | `item_XXXX` | `item_0065 木箱 / item_0066 铜箱 / item_0067 铁箱` |
| `chests.csv`（箱子配置） | `chest_<material>` | `chest_wood / chest_copper / chest_iron` |

证据 `E-07`：`grep chest game-data/source/items.csv` 与 `cat game-data/source/chests.csv` 对照。

**结论 `F-04`（重大）**：客户端背包持有的 `itemId` 是 `item_0065`，**无法直接索引** `chests` 表（键为 `chest_wood`）。任何"用 itemId 查 hits_required"的实现都会取空 → 静默降级为不可开锁。缺一张映射（或给 `chests` 加 `item_id` 列）。必须在 `03` 的 D-19 裁决。

### 3.3 保底物品口径风险

`prices.csv` 中 `base_price` 最低者是 `item_0013`，其 `base_price=0` 且 `recycle_bp` 为空；次低 `item_0020 base_price=4`。

证据 `E-08`：Python 对 `prices.csv` 按 `base_price` 升序取前 3。

**结论 `F-05`**：TASK-4009 卡写"空表降级固定掉 base_price 最低物品"——按字面执行会掉一个**价值 0** 的物品，玩家侧等价于"什么都没拿到"。必须在 `03` 的 D-27 换口径。

## 4. 服务端基线：20 个动作，12 已实现 / 8 仍 `todo`

```ts
// server/src/gateway/handlers.ts —— todo 的 8 个
'salvage.claimInfo': todo,   'economy.buyQuota': todo,
'event.start': todo,         'event.submit': todo,      'event.result': todo,
'social.send': todo,         'social.pull': todo,       'ads.claim': todo,
```

证据 `E-09`：`cat server/src/gateway/handlers.ts`（`satisfies Record<ActionName, Handler>` 保证不漏项）。

### 4.1 `salvage` 模块是空壳

```text
server/src/modules/salvage/handlers.ts  → export const MODULE = 'salvage';   （1 行有效代码）
server/src/modules/salvage/service.ts   → 2 行
server/src/modules/salvage/repo.ts      → 2 行
```

证据 `E-10`：`wc -l server/src/modules/salvage/*.ts` + `cat handlers.ts`。

**结论 `F-06`**：TASK-4009 要求"`salvage.claimInfo` 从 todo 变实现"，但该卡的**允许修改清单只有 `server/src/gateway/handlers.ts`**，不含 `server/src/modules/salvage/**`。按卡执行必然越界或做不成。必须在 `03` 的 D-22 修正清单。

### 4.2 `economy.sell` 已真实闭环（4006 产出，质量可用）

```ts
// service.ts —— D-01 裁决值硬编码 + 限购 + 影子校验
MERCHANTS = { merchant_village:{regionBp:10000,dailyLimit:20},
              merchant_wander:{regionBp:8500,dailyLimit:10},
              merchant_black:{regionBp:13000,dailyLimit:5} }
used + count > dailyLimit → ERR.QUOTA_EXHAUSTED(3002)
unitPrice = sellValue(price.base_price, price.recycle_bp, merchant.regionBp)
```

证据 `E-11`：`server/src/modules/economy/service.ts:24-103`。

### 4.3 票据校验的真实位置（**与 4015 卡不符**）

| 项 | 卡里写的 | 代码实际 |
|---|---|---|
| 票据失败抛码的文件 | `server/src/modules/save/service.ts` | `server/src/modules/account/service.ts`（`bindConfirm`，4 处 `BindError(ERR.NOT_LOGGED_IN, ...)`） |
| 具体行 | 未给 | `service.ts:118-127` 区间：not found / already used / expired / self-bind / no identity |

证据 `E-12`：`sed -n '85,150p' server/src/modules/account/service.ts`。

**结论 `F-07`**：`TASK-4015` 步骤 2 的目标文件写错。改 `save/service.ts` 不会有任何效果（那里没有票据逻辑），改 `account/service.ts` 才是正解。必须在 `03` 的 D-21 修正。

## 5. 客户端基线

### 5.1 面板与导航

| 项 | 状态 | 证据 |
|---|---|---|
| `PanelKey` | `'hook'|'inventory'|'crafting'|'leaderboard'|'merchant'`（5 个，4007 已扩） | `app/panel-types.ts:20`（`E-13`） |
| `MainView` 挂载 | `merchant: createMerchantPanel`，Tab 标签"商人" | `app/MainView.ts:24,30,60`（`E-13`） |
| 商人面板 | `features/economy/view/MerchantPanel.ts`（306 行，**不在 `features/merchant/`**） | `E-14` |
| 商人模型 | `features/economy/model/EconomyModel.ts`：`merchantOptions/unitPrice/sellableRows/applySell/quotaText` | `E-15` |
| 背包面板 | `features/inventory/view/InventoryPanel.ts`（189 行） | `E-16` |
| 背包行渲染 | **纯 `addLabel` 文本行，无行节点容器、无按钮** | `InventoryPanel.ts:79-102`（`E-16`） |
| `ui-kit` | 只有 `README.md`（空目录，无组件） | `E-17` |
| `app/panel-ui.ts` | 仅 `addLabel / addTitle / addEmptyHint` 三个工厂 | `E-17` |
| 开锁 UI | **零代码**（`lockpick/hitsRequired` 仅出现在 generated 产物） | `E-18` |
| 背包回收按钮 | **零代码**（`addConfirmDialog` 全仓 0 命中） | `E-18` |

**结论 `F-08`**：plan-v004/06 的所有权矩阵写 `features/{merchant,inventory,hook,salvage}/view`，**实际商人落在 `features/economy/view`**，矩阵路径失真；`4008` 卡允许清单不含 `features/economy/model/EconomyModel.ts`，而回收必然要复用其 `sellValue/applySell`。

### 5.2 4008 的真实工作量被低估

卡里写"在背包列表行添加回收按钮"（估算"小"）。实际 `renderRows()` 每行只 `addLabel` 一个 Label 节点，**没有行容器**。要做"行内按钮"，必须先重构为「行节点（Node + 背景 + Label + Button）」结构，再谈按钮与弹窗。
**结论 `F-09`**：4008 实为**中**规模（含一行容器重构 + 弹窗组件 + 状态回落），不是"小"。

## 6. 文档与证据基线

| 项 | 实测 | 证据 |
|---|---|---|
| `task-index.md` | **完全没有登记 4007~4016**（最末一条是 `TASK-3401`） | `E-19`：`tail -60 docs/05_execution/task-index.md` |
| 生成器 | `tools/gen/docs-index.mjs` 扫 `docs/05_execution/tasks/*.md` 生成 | `E-20` |
| 归因 | **生成物过期**（4fa909e 补完 front matter 后未跑 `gen:docs`），非卡缺失 | `E-19`+`E-20` |
| `current-plan.md` | 仍写"plan-v003 / 107 测试 / merchants 0 行" | `E-21` |
| `roadmap.md` | v1.0 行仍指向 `plan-v003` | `E-22` |
| `error-catalog.md` | 2004 **只在第 40 行以"建议新增"出现**，无正式登记行 | `E-23` |
| `ADR-0011` | `status: proposed`（4015 步骤 6 要求翻 `accepted`，未做） | `E-24` |
| `ADR-0012` | `status: accepted`（4005 已翻） | `E-24` |
| `EVD-4007` | **不存在**（evidence 下 4000 系列只有 `EVD-4002` / `EVD-4012`） | `E-25` |
| `docs/07_release/compliance/review-checklist.md` | 12 行，正文"待编写。" | `E-26` |
| `docs/07_release/compliance/copyright-materials.md` | 53 行（有内容，需核对时效） | `E-26` |
| `docs/03_solution/ui/screen-salvage.md` | **不存在**（该目录只有 `screen-inventory.md` / `style-guide.md` / `cocos-editor-glossary.md`） | `E-27` |

**结论 `F-10`**：TASK-4009 的**输入文档缺失**，卡不可执行。
**结论 `F-11`**：TASK-4007 已提交代码但**未留证据**，按 R-1 四参照系判定为"代码完成、证据缺失"，不得记 done。

## 7. 四参照系完成度矩阵（R-1 的落地形态）

> "完成"不是一个布尔值，而是四个参照系同时成立。任一为 ✗ 即整体 ✗。

| 卡 | ①代码存在 | ②verify 绿 | ③证据目录 | ④可复现命令 | 判定 |
|---|---|---|---|---|---|
| 4002 数值转录 | ✅ 11 表 | ✅（但受 F-01 牵连当前红） | ✅ `EVD-4002` | ✅ `npm run gen:config` | **done** |
| 4006 `economy.sell` | ✅ | ✅ | ✅（`tests/integration/economy-sell.test.mjs` 5 例） | ✅ | **done** |
| 4007 商人页 | ✅ 306 行 | ⚠ 受 F-01 牵连 | ❌ 无 `EVD-4007` | ⚠ 仅逻辑层测 | **未收口** |
| 4012 包体基线 | ✅ | ✅ | ✅ `EVD-4012` | ✅ | **done** |
| 4015 契约解冻 | ⚠ 2/6 步 | ❌ guard 红 + test 红 | ❌ | ❌ | **半成品** |
| 4008 背包回收 | ❌ | — | ❌ | ❌ | **未开工** |
| 4009 开锁 | ❌（服务端空壳） | — | ❌ | ❌ | **未开工 + 3 处阻塞** |
| 4010 真机录屏 | ❌ | — | ❌ | ❌（无真机） | **未开工 + 环境受限** |
| 4011 命中率采样 | ❌（`tools/sample-hook-hitrate.mjs` 不存在） | — | ❌ | ❌ | **未开工** |
| 4013 合规清单 | ⚠ 1/2（`review-checklist.md` 空壳） | ✅ | ✅ `docs/07_release` | ✅ | **半成品** |
| 4016 文档对齐 | ❌（4 份全滞后） | — | ❌ | ❌ | **未开工** |

## 8. 一句话总结（进入 `02` 的输入）

- **真实剩余 = 6 张卡 + 1 张半成品收尾 + 3 处结构性阻塞 + 1 处环境受限。**
- **可立即开工（无阻塞）**：止血（步骤 1）、4015 收尾（步骤 2）、4008（步骤 3，需补清单）、4011（步骤 6，脚本可离线写）、4013（步骤 7）。
- **必须裁决后才能开工**：4009（D-19/20/22/27）、4010（真机是否提供）、4016（等 4015）。

## 9. 编队后追加事实（F-12 ~ F-17，本文件初稿之后新查实）

> 以下六条是在编排 W2/W3 时深挖发现的，**改变了 4008/4009 的可行性判断**，必须与本文件同读。

### 9.1 `F-13` · 客户端 13 个幂等写动作从未传 rid

| 项 | 实测 |
|---|---|
| 契约标记 `idempotent: true` 的动作 | **13 个**（`actions.ts`） |
| 服务端幂等表 | 已实现，24h TTL，`(player_id, rid)` 唯一，只缓存 `c===0`（`idempotency.ts`） |
| `invoke()` 的 rid | **第 3 个可选参数**，不传则 `meta.rid` 不存在（`RpcClient.ts:55-68`） |
| 实际传 rid 的调用点 | **0 处**（`economy.sell` / `save.push` / `save.resolveFork` / `leaderboard.report` 全未传） |
| 自动重发路径 | 收 2002 → 静默刷新 → `return invoke(action, params, rid, true)`（`RpcClient.ts:96-98`） |

**后果**：`economy.sell` 遇 2002 会**执行两次** → 双扣额度 + 双写 `ledger_entry`，下一次卖出触发 1001 影子不一致。
**处置**：新增 `TASK-4020`（`08` §2.1），在 `RpcClient` 内部按 `ACTIONS[action].idempotent` 自动补 rid，**一处改全局生效**。

证据 `E-28`：`cat server/src/gateway/idempotency.ts` + `grep -rn "invoke<" client/assets/scripts/features`。

### 9.2 `F-14` · `salvage.claimInfo` 不是开箱动作

`ClaimInfoReq { tier: 'normal'|'advanced'|'exclusive' }`、`desc: '领取沉船信息份数'` —— 是**沉船信息来源**，与"开箱发奖"无关。4009 卡把它当结算出口，语义错配。
证据 `E-29`：`cat packages/contracts/src/salvage/index.ts` + `actions.ts:19`。

### 9.3 `F-15` · `chest.open` 是"类型已写、动作未注册"的孤儿契约

`packages/contracts/src/chest/index.ts` 完整定义了 `ChestOpenReq/Res/LockTier`，但 `ACTIONS` 里**没有 `chest.open`**，全仓 `grep "chest.open"` **0 命中** —— 该缺口**从未被登记**（ADR-0011 只登记了 3 个）。
证据 `E-30`：`cat packages/contracts/src/chest/index.ts` + `cat actions.ts` + `grep -rn "chest.open"`.

### 9.4 `F-16` · 开锁次数双源冲突

| 来源 | iron | copper | silver | gold |
|---|---|---|---|---|
| `game-core/chest/index.ts` `LOCK_HITS` | 1 | 2 | 3 | 4 |
| `game-data/source/locks.csv`（D-08 裁决） | 3 | 5 | 8 | 12 |

同一规则两份互斥真值。客户端按前者、服务端按后者 → **玩家永远开不了铁锁**。
证据 `E-31`：两文件并排对照。

### 9.5 `F-17` · 开箱路径在现有数值下**全链不可达**（决定性）

| 环节 | 实测 | 后果 |
|---|---|---|
| 打捞掉落 | `HookModel.ts:20` 硬编码 `item_0001 漂流木`，注释"演示期固定掉落物…数值表就位后接 drops 配置" | 玩家只会捞到漂流木 |
| `drops.csv` | 0 行 | 无掉落规则可接 |
| `chests.lock` | 三箱全 `none` | 无锁可开 |
| `chests.id` vs `items.id` | `chest_wood` vs `item_0065` | 无法索引 |

证据 `E-32`：`grep -n "drop" client/assets/scripts/features/hook/model/HookModel.ts` + `01` §3.1/§3.2。

**结论**：`TASK-4009` 的验收句「遇到上锁箱弹出连点开锁界面」在真机**永不可成立**。规划据此拆为「机制做（4009a/b）+ 可达性延后（4009c → `TASK-4022`）」，见 `09` §2.3。

### 9.6 `F-18` · 两个 `todo` handler 的数值依赖其实已解除

| 动作 | 依赖表 | 现状 |
|---|---|---|
| `economy.buyQuota` | `merchants`(3) + `prices`(106) | **已就绪** |
| `ads.claim` | `ad_placements`(3，含 `daily_cap=3`) | **已就绪** |

plan-v003/v004 把全部 8 个 `todo` 一并归为"依赖 E-06 空表"，**该结论部分过期**。二者属"可提前"，已登记为 `13` §2 / D-28。
证据 `E-33`：`cat game-data/source/ad_placements.csv` + `cat packages/contracts/src/ads/index.ts`。

## 10. 基线漂移记录（15:13 复测）

> 本文件初版（15:0x）到复测（15:13）之间，**仓库被另一个执行者并行修改**。此处如实记录，不改写历史结论，只追加差异。

### 10.1 新增的改动（初版采集时不存在的）

| 文件 | 改动 | 初版状态 |
|---|---|---|
| `packages/contracts/src/common/errors.ts` | +`BIND_TICKET_INVALID: 2004` | 已有（未提交） |
| `packages/contracts/src/common/ux.ts` | +2004 UX 映射 | 已有（未提交） |
| `packages/contracts/src/economy/index.ts` | `SellReq` 增 `merchantId?` | 已有（未提交） |
| `server/src/modules/account/service.ts` | **五处 `BindError` 由 `NOT_LOGGED_IN` 改 `BIND_TICKET_INVALID`** + 头注释改写 | **初版无（新增）** |
| `server/src/modules/account/handlers.ts` | `bindConfirm` 注释改 2004 | **初版无（新增）** |
| `tests/contract/ux.test.mjs` | `EXPECTED` 增 2004；断言 14→15 | **初版红（已修）** |
| `tests/integration/bind.test.mjs` | 五处断言 2001→2004 | **初版红（已修）** |

证据 `E-34`：`git diff --stat` 显示 9 文件变更；`git diff server/src/modules/account/service.ts` 确认五处已改。

### 10.2 并行执行者**没有**做的部分（本规划仍然有效的原因）

| 未做项 | 检测命令 | 实测 |
|---|---|---|
| `npm run sync` | `npm run guard` | ❌ 仍红 3 处（三个 contracts 副本过期） |
| `DESIGN-0001 §2` 增 2004 行 | `grep -c "BIND_TICKET_INVALID" docs/03_solution/design/DESIGN-0001-ux-states.md` | **0** |
| `error-catalog.md` 正式登记 | `grep -n "2004" docs/03_solution/data/error-catalog.md` | 仍只有第 40 行"建议新增" |
| `ADR-0011` 翻 accepted | `grep "^status:" .../ADR-0011-contract-gaps.md` | 仍 `proposed`，§决策仍写"未裁决" |
| `ADR-0011` 修正票据位置笔误 | `grep "save/service.ts" .../ADR-0011` | 仍写 `save/service.ts:119`（错，实为 `account/service.ts`） |

### 10.3 对规划的净影响

| 步骤 | 影响 | 处置 |
|---|---|---|
| 步骤 1（W0） | §2.1 `sync` **仍然必要**（guard 仍红）；§2.2.1/2.2.2 已完成，**只需做 §2.2.3（DESIGN-0001）**；§2.3/§2.4 不变 | **保留，工作量减少约 1/3** |
| 步骤 2（W1） | §2.1（服务端五处）与 §2.2（测试）**已完成**；**只剩 §2.3（error-catalog）、§2.4（ADR-0011）、§2.5（gen+verify）** | **保留，工作量减少约 2/3**，但**不可跳过**——文档不齐则 4016 无法收口 |
| 步骤 3~8 | 无影响 | 不变 |

### 10.4 这次漂移的元教训

1. **并行执行时，"完成"必须按文件粒度核对**，不能按卡粒度。同一张 4015，有的文件做了、有的没做——卡状态只能标"部分"。
2. **测试绿 ≠ 契约一致**。`ux.test.mjs` 绿了，但 `DESIGN-0001` 没改——**测试与文档是同一条链的两端，只改一端就是把漂移从代码侧挪到文档侧**。
3. 本文件的§2.2 已从"FAIL"改为"初版 FAIL / 复测 PASS，但残留文档漂移"。**这就是"事实基线"该有的样子：带时间戳、可追溯、不粉饰。**

### 10.5 后续读者须知

若你读到时 `npm run guard` 已绿、四份文档已齐，说明步骤 1/2 已被（并行或串行）执行完毕——**请复核 §10.2 的五条命令全部转绿**，再把 `14-self-check.md` 的 1/2 两格填 ☑。**不要**因为"看起来做了"就勾。
