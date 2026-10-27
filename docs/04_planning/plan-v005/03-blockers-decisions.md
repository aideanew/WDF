---
id: PLAN-V005-03
title: 阻塞项与裁决表（D-19 ~ D-28）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V005-01, PLAN-V005-02]
---

# 03 · 阻塞项与裁决表

> 本文件是**唯一需要用户拍板**的地方。全部给推荐值；用户回复"全按推荐"即可整批解冻。
> 裁决一经确认，对应任务卡的"阻塞条件"改为"无"，方可进入 `05` 的可执行位。

## 1. 缺陷登记（F-01 ~ F-12，均已实测坐实）

| # | 缺陷 | 位置 | 证据 | 处置裁决 |
|---|---|---|---|---|
| F-01 | 4015 半成品：改了 contracts 未 sync/未提交，guard 红 3 处 | `packages/contracts` 3 文件 | `01` `E-02`/`E-03` | **D-24** |
| F-02 | 契约测试硬断言 14 码，实际 15 码 | `tests/contract/ux.test.mjs:34` | `01` `E-04` | **D-25** |
| F-03 | 三箱 `lock=none`，开锁永不触发 | `game-data/source/chests.csv` | `01` `E-06` | **D-20** |
| F-04 | `chests.id`（chest_wood）与背包 `itemId`（item_0065）两套体系 | `chests.csv` vs `items.csv` | `01` `E-07` | **D-19** |
| F-05 | 保底取 `base_price` 最低 = `item_0013`（价 0），等价空掉 | `prices.csv` | `01` `E-08` | **D-27** |
| F-06 | 4009 允许清单缺 `server/src/modules/salvage/**`，无法实现 claimInfo | `TASK-4009.md` | `01` `E-10` | **D-22** |
| F-07 | 4015 步骤 2 目标文件写错（save→account） | `TASK-4015.md` | `01` `E-12` | **D-21** |
| F-08 | 所有权矩阵路径失真（merchant 在 economy 下） | `plan-v004/06` §6.3 | `01` `F-08` | 已在 `04` §4.3 修正，无需裁决 |
| F-09 | 4008 工作量被低估（背包行无容器节点，需先重构） | `InventoryPanel.ts:79-102` | `01` `E-16` | 已在 `08` 重估为中 |
| F-10 | 4009 输入文档 `screen-salvage.md` 不存在 | `docs/03_solution/ui/` | `01` `E-27` | **D-29** |
| F-11 | 4007 无 EVD 证据目录 | `docs/06_validation/evidence/` | `01` `E-25` | **D-26** |
| F-12 | `economy.buyQuota` 数值前置已解除，旧"依赖空表"结论过期 | `merchants` 3 行 + `prices` 106 行 | `02` §5 | **D-28** |
| F-13 | **客户端 13 个幂等写动作从未传 `rid`**，服务端幂等表形同虚设 | `RpcClient.ts:55-68` + 全仓 0 调用点传 rid | `01` §9.1 | **D-30** |
| F-14 | `salvage.claimInfo` 是"领沉船信息份数"，不是开箱结算 | `contracts/salvage/index.ts` + `actions.ts:19` | `01` §9.2 | **D-31** |
| F-15 | `chest.open` 类型已写、动作未注册（第 4 缺口，从未登记） | `contracts/chest/index.ts` vs `ACTIONS` | `01` §9.3 | **D-31** |
| F-16 | 开锁次数双源冲突：`LOCK_HITS` 1/2/3/4 vs `locks.csv` 3/5/8/12 | `game-core/chest` vs `locks.csv` | `01` §9.4 | **D-32** |
| F-17 | 开箱路径全链不可达（掉落固定漂流木 + dirt 空 + 无锁箱 + id 不通） | `HookModel.ts:20` 等四处 | `01` §9.5 | **D-20 配套** |
| F-18 | `buyQuota` / `ads.claim` 数值依赖已解除（旧结论过期） | `merchants`/`prices`/`ad_placements` | `01` §9.6 | **D-28** |

## 2. 裁决项

### D-19 · `chests` 与 `items` 的 id 如何对齐

- **问题**：背包里箱子是 `item_0065/0066/0067`，配置表键是 `chest_wood/copper/iron`。客户端拿 `itemId` 查 `chests` 表必然取空。
- **证据**：`01` §3.2 `E-07`。
- **选项**：
  - A. 给 `chests.csv` **加一列 `item_id`**（`chest_wood → item_0065` 等三行），走 `npm run gen` 重生成类型。改动最小、单一事实源、不动 items。
  - B. 在客户端硬写映射表。**违反 R-2（禁魔法数字）**。
  - C. 改 `items.csv` 的 id 为 `chest_*`。破坏 106 行既有引用与存档键，**风险最高**。
- **推荐：A**。`chests.csv` 新增 `item_id` 列，三行填实测对应值（木箱 0065 / 铜箱 0066 / 铁箱 0067，依据 `items.name` 与 `chests.material` 一一对应：wood/copper/iron）。
- **影响面**：`game-data/source/chests.csv`、`tools/gen/config`（schema 允许新列）、生成类型 `config-types.ts`、`chests` 表读取方。
- **不裁决后果**：4009 的所有开锁判定走空分支，功能静默失效且**不报错**。

### D-20 · 当前无任何箱子带锁，开锁机制不可触发

- **问题**：`chests.csv` 三行 `lock` 全 `none` → `hits_required=0`。4009 的验收句"遇到上锁箱子弹连点界面"在现网数据下**永不成立**。
- **证据**：`01` §3.1 `E-06`。
- **选项**：
  - A. **补数值**：新增 `chest_silver`(lock=silver, hits=8) / `chest_gold`(lock=gold, hits=12) 两行。但**设计源无此定义**，属"自编数值"，需用户明确授权。
  - B. **改既有行**：把 `chest_iron` 的 `lock` 由 `none` 改 `iron`（hits=3）。同样是自编，且改变既有物品行为。
  - C. **机制照做、触发靠注入**：代码完整实现"带锁箱子"分支；真机验收标记 **UNKNOWN**；用单测构造 `lock='iron'` 的注入用例证明分支正确；把"补锁箱数值"登记为设计缺口，交 v1.1。
- **推荐：C（默认）**；若用户愿意授权补数值，则 **A**（推荐 `chest_silver` 锁 silver，因 silver/gold 锁数值已在 `locks.csv` 中就绪，不引入新数值口径）。
- **影响面**：4009 的验收标准、`11-step6` 的真机证据判定、`docs/03_solution/ui/screen-salvage.md` 的编写。
- **不裁决后果**：4009 只能按 C 执行；若强行按 B 执行会改既有箱子行为，属未授权设计变更。

### D-21 · TASK-4015 步骤 2 的目标文件修正

- **问题**：卡写 `server/src/modules/save/service.ts`，实测票据逻辑在 `server/src/modules/account/service.ts`（`bindConfirm` 内 4 处 `BindError(ERR.NOT_LOGGED_IN, …)`）。
- **证据**：`01` §4.3 `E-12`。
- **推荐**：把 4015 的步骤 2 与允许清单中的 `server/src/modules/save/service.ts` **替换为** `server/src/modules/account/service.ts`；`bindConfirm` 内**五处**失败分支（not found / already used / expired / self-bind / no identity）**全部**改为 `BIND_TICKET_INVALID`。
- **为什么五处全改而非只改前三处**：`BAD_PAYLOAD(1001)` 的 UX 无 `next` 出口，玩家收到后无任何恢复路径；而 2004 的出口是 `login`，恰好是这五种失败的唯一正解。且 `errors.ts` 中 2004 的注释本就写着"不存在/过期/已用/自绑/无身份"——五种情形同属一个语义。详见 `07` §2.1.2。
- **连带修正**：`ADR-0011` 的"事实来源"也写着 `save/service.ts:119`（错误源头在此，4015 卡照抄），一并改为 `account/service.ts:118-127` 并留更正注记。
- **影响面**：`server/src/modules/account/service.ts`、`tests/integration/bind.test.mjs`（期望码从 2001 改 2004）。
- **不裁决后果**：执行者改 `save/service.ts` 后测试全绿但**行为零变化**，形成"假完成"。

### D-22 · TASK-4009 允许修改清单扩容

- **问题**：卡要"`salvage.claimInfo` 从 todo 变实现"，但允许清单只有 `server/src/gateway/handlers.ts`；`salvage` 模块三个文件是空壳（各 1-2 行）。
- **证据**：`01` §4.1 `E-10`。
- **推荐**：允许清单增加
  - `server/src/modules/salvage/handlers.ts`
  - `server/src/modules/salvage/service.ts`
  - `server/src/modules/salvage/repo.ts`
  - `server/src/gateway/payload.ts`（`salvage.claimInfo` 的 schema 已存在，仅当需扩字段时改；默认**只读**）
  - `server/db/migrations/`（若需新表；默认**不改**，复用 `ledger_entry`）
- **不裁决后果**：执行者只能改 `handlers.ts`，把 `todo` 换成内联实现 → 逻辑塞进网关层，**破坏分层**（违反 `04` §4.1 L4 约束）。

### D-23 · TASK-4008 允许修改清单扩容

- **问题**：回收按钮需要 `EconomyModel.sellValue/applySell`（4007 已建在 `features/economy/model`），但 4008 允许清单只有 `features/inventory/view/**` 与 `app/panel-ui.ts`。
- **证据**：`01` §5.1 `F-08`。
- **选项**：
  - A. 允许清单增 `client/assets/scripts/features/economy/model/EconomyModel.ts`（**只准追加导出，不准改既有函数签名**）。
  - B. 在 `inventory/model/InventoryModel.ts` 复制一份 sellValue。**违反 DRY，且两份价格公式必然漂移**。
- **推荐：A**（带"只增不改"约束）。
- **影响面**：4007 的 8 个既有单测（`tests/determinism/merchant-flow.test.mjs`）必须保持全绿，作为"未破坏既有"的守据。
- **不裁决后果**：执行者只能选 B，价格公式双份，后续必漂移。

### D-24 · `SellReq.merchantId` 与 2004 是否同一次提交

- **问题**：工作区 `economy/index.ts` 的 `merchantId?` 与 2004 混在一起。而 4006 提交时 `SellReq` 无此字段，**但服务端已支持**（`handlers.ts:12` `p.mechantId ?? 'merchant_village'`、`payload.ts:52` 已有 enum）。
- **证据**：`01` §1.2 `E-02`、§4.2 `E-11`。
- **结论**：`merchantId` 的**服务端与 payload 早已就绪**，只有 contracts 的 TS 类型落后。属"类型补齐"，不是新功能。
- **推荐**：**合并为一次提交**，commit message 明确写 `feat(4015): 2004 码解冻 + SellReq 补 merchantId（类型对齐，服务端早已支持）`。理由：分开提交会造成"类型与实现不一致"的中间态，无法单独通过契约测试。
- **不裁决后果**：两次提交中至少一次 verify 红。

### D-25 · 契约测试从 14 码改 15 码，`DESIGN-0001 §2` 是否同步

- **问题**：`tests/contract/ux.test.mjs:34` 断言 14；`EXPECTED` 表缺 2004 期望值。`DESIGN-0001-ux-states.md §2` 是 14 码版。
- **证据**：`01` §2.2 `E-04`。
- **选项**：
  - A. 测试与设计文档**同步改 15 码**（`EXPECTED` 增 `BIND_TICKET_INVALID: {state:'noPermission', retryable:false, next:'login'}`；`DESIGN-0001 §2` 增一行；测试标题改"15 个错误码"）。
  - B. 只改测试不改文档。**文档与代码再次漂移**，违反 AGENTS.md §3 自检项。
- **推荐：A**（文档与测试同一次提交，符合"改契约 → 联动文档"的 change-playbook 要求）。
- **影响面**：`tests/contract/ux.test.mjs`、`docs/03_solution/design/DESIGN-0001-ux-states.md`。
- **不裁决后果**：`npm test` 永久红，`npm run verify` 不可用，后续所有卡失去闸门。

### D-26 · EVD-4007 是否补录

- **问题**：4007 已提交代码（306 行 MerchantPanel + 121 行 EconomyModel 增量 + 108 行测试），但 evidence 下无 `EVD-4007`。
- **证据**：`01` §6 `E-25`。
- **推荐**：**补录**（低成本、高价值）。内容 = 步骤 1 的收口产物：`merchant-flow.test.mjs` 全绿输出、客户端类型检查零错输出、`MainView.ts:24/30/60` 与 `MerchantPanel.ts:224-247` 行号走查清单、以及 `getUxState` 三态（成功 / 3002 / 1001）的代码路径说明。**不含真机录屏**（真机缺口统一走 4010）。
- **不裁决后果**：4007 永远停在"代码完成、证据缺失"，`14-self-check` 无法勾选，v1.0 出口条件不成立。

### D-27 · 开锁/降级掉落的口径

- **问题**：4009 卡写"固定掉 `base_price` 最低物品"。实测最低是 `item_0013`（`base_price=0`，`recycle_bp` 空）。
- **证据**：`01` §3.3 `E-08`。
- **选项**：
  - A. 严格按字面：掉 `item_0013`。程序正确、玩家感知为 0。
  - B. **筛选候选人**：`base_price ≥ 1 且 recycle_bp 非空`，取其中 `base_price` 最小者 → **`item_0020`（价 4）**。
  - C. 不掉落，直接返回"空箱"错误。**破坏"连点成功了却什么都没"的心流**。
- **推荐：B**。并把口径写进 `salvage/service.ts` 的注释与 `docs/03_solution/data/error-catalog.md` 相邻的降级说明，避免下一位执行者按字面重犯。
- **影响面**：`salvage` 服务端降级分支、4009 的验收断言。
- **不裁决后果**：功能正确但体验为零，且后续无人知道这是"设计如此"还是"bug"。

### D-28 · `economy.buyQuota` 是否提前到 v1.0

- **问题**：plan-v003/004 把 `economy.buyQuota` 列为"依赖 E-06 空表"。实测 `merchants`（3 行）、`prices`（106 行）**已就绪**，依赖已解除。
- **证据**：`02` §5 `F-12`。
- **选项**：
  - A. **留在 v1.1**（v1.0 的商人页当前只做卖出，买入不影响闭环）。
  - B. 提前到 v1.0（新增 `TASK-4020`，估中规模）。
- **推荐：A**。理由：v1.0 出口条件不含"买入"，且 v1.0 剩余项已够多；把它记入 `13-step8-v11-seed.md` 的第一批。
- **不裁决后果**：无（默认 A 不影响任何卡）。

### D-29 · `screen-salvage.md` 缺失如何补

- **问题**：4009 卡输入 `docs/03_solution/ui/screen-salvage.md` 不存在（该目录仅有 `screen-inventory.md` / `style-guide.md` / `cocos-editor-glossary.md`）。
- **证据**：`01` §6 `E-27`。
- **选项**：
  - A. **先补文档再开工**：按 `screen-inventory.md` 的体例，由步骤 4 的第 1 个原子步骤产出 `screen-salvage.md`（六态 + 开锁态 + 空箱态 + 布局坐标），再写代码。
  - B. 跳过文档直接写代码，事后补。**违反"方案先于实现"的项目纪律**，且六态极易漏（3002/1001/conflict 之外的 `lock-wait` 新态）。
- **推荐：A**。产出物并入步骤 4，属"允许新增"路径（不修改既有文档）。
- **不裁决后果**：开锁面板的新增 UX 态（`lock-wait`）无契约依据，`toUxState` 无法覆盖，最终又会出现手写 `if (code===xxx)`（违反 G-11）。

### D-30 · 客户端幂等 rid 缺口如何补（F-13）

- **问题**：13 个 `idempotent:true` 的动作，客户端**零处传 `rid`**；`RpcClient` 遇 2002 会自动重发，导致 `economy.sell` 双扣额度、`save.push` 双写。
- **证据**：`01` §9.1 `E-28`。
- **选项**：
  - A. 13 个调用点各自生成并管理 rid（8 个文件，漏一个就漏）。
  - B. **`RpcClient` 内部：`ACTIONS[action].idempotent` 为真且调用方未传 rid 时自动生成，重试复用同一个**（1 个文件，一处改全局生效）。
  - C. 不做，登记 v1.1。→ 留 P1 正确性缺陷，v1.0 就要真实交易，不可接受。
- **推荐：B**。新增 `TASK-4020`，随 W2 首批执行（4008 大量调 `economy.sell`，必须先有 rid）。
- **边界（必须写进注释）**：rid 只解决"传输层重试"，**不解决用户双击**——双击由 UI 层 `busy` 闸门拦（4007 已有，4008 必须有）。
- **不裁决后果**：任何一次 2002 刷新都会让交易执行两次，且错误延迟到下一次卖出才以 1001 暴露。

### D-31 · 开箱结算走哪个动作（F-14 / F-15）

- **问题**：4009 卡要"开锁后调 `salvage.claimInfo` 发奖"，但该动作是"领沉船信息份数"（`tier: normal/advanced/exclusive`，返回 `infoId/seed`）。真正的开箱动作 `chest.open` **有类型、无注册**。
- **证据**：`01` §9.2/§9.3。
- **选项**：
  - A. **新增 `chest.open` 动作**（第 4 缺口解冻），服务端校验持有 + 锁档 + 按 D-27 口径发奖；`salvage.claimInfo` 保持 `todo` 交 v1.1 沉船玩法。
  - B. 复用 `salvage.claimInfo`。语义错配，且箱子与沉船信息共用日配额。
  - C. 纯本地结算。违反 MUST-11"服务端权威"。
- **推荐：A**。需用户授权解冻契约（新建 `ADR-0013`）。
- **风险披露（必须写进 ADR-0013）**：`hitsUsed` 由客户端上报，理论上可伪造；v1.0 收益上限受"持有箱子数"约束（箱子不可制造），风险有界；v1.1 用 `chest.begin` 下发 seed + 服务端 `pointer` 复算治理（`TASK-4030`）。
- **不裁决后果**：4009 无法开工（无合法结算出口）。

### D-32 · 开锁次数以谁为准（F-16）

- **问题**：`game-core/chest` 的 `LOCK_HITS = {iron:1,copper:2,silver:3,gold:4}`（注释称 v5.5 8.4）与 `locks.csv` 的 `{3,5,8,12}`（D-08 用户裁决）冲突。
- **证据**：`01` §9.4 `E-31`。
- **选项**：
  - A. **以 `locks.csv` 为唯一权威**：`attempt()` 增 `required` 入参（调用方从表读传入），`LOCK_HITS` 降级为 `LOCK_HITS_FALLBACK` 且值改为 3/5/8/12，并加"CSV ↔ 常量"一致性单测。
  - B. 以 `LOCK_HITS` 为准，改 `locks.csv`。**修改用户已裁决值**，需重新裁决 D-08。
- **推荐：A**。理由：D-08 是用户明确裁决的配置值，配置驱动优于硬编码；且 game-core 不能读表，配置必须由调用方传入——这本来就是"纯函数 + 入参"的正确形状。
- **影响面**：`game-core/chest/index.ts`、`tests/determinism/chest.test.mjs`、`SalvageView`（`required` 来源）。
- **不裁决后果**：客户端与服务端判定不一致，开锁要么永不成功、要么表现与结算错位。

### D-33 · 是否需要 v1.0 就让开箱真机可见（F-17）

- **问题**：开箱路径四环全断（掉落固定漂流木、`drops` 空、无锁箱、id 不通），机制做完也**碰不到**。
- **证据**：`01` §9.5 `E-32`。
- **选项**：
  - A. **机制做、可达性延后**：4009a（规则 + 服务端 + 测试）+ 4009b（最小 UI），真机记 UNKNOWN；可达性转 v1.1 `TASK-4022`（需 `drops` 设计源）。
  - B. 补三处数值让 v1.0 可见（`drops` 3 行 + `chest_copper.lock=copper`）。**属玩法变更**，需授权且改变既有打捞手感。
  - C. 整个 4009 移到 v1.1。
- **推荐：A**。契约与规则债必须现在还（否则 v1.1 要重开契约窗口），表现层做最小可见，数值债不动（R-2）。
- **不裁决后果**：要么做无用功，要么自编数值。

## 3. 裁决汇总表（供一次性勾选）

| 裁决 | 主题 | 推荐值 | 影响卡 |
|---|---|---|---|
| D-19 | chests↔items id 对齐 | **A：`chests.csv` 加 `item_id` 列** | 4009 |
| D-20 | 无锁箱不可触发 | **C：机制照做 + 注入测试 + 真机 UNKNOWN**（可选 A 补两行） | 4009 / 4010 |
| D-21 | 4015 路径修正 | **改 `account/service.ts`，五处全改 2004** | 4015 |
| D-22 | 4009 清单扩容 | **+ salvage 三件套**（实际落地改为 `chest` 三件套，见 D-31） | 4009 |
| D-23 | 4008 清单扩容 | **+ EconomyModel（只增不改）** | 4008 |
| D-24 | 2004 与 merchantId 合并提交 | **合并** | 4015 |
| D-25 | 14→15 码同步 | **测试 + DESIGN-0001 同改** | 4015 |
| D-26 | EVD-4007 补录 | **补录** | 4007 |
| D-27 | 降级掉落口径 | **B：`base_price ≥ 1 且 recycle_bp 非空`取最小 → item_0020** | 4009 |
| D-28 | buyQuota / ads.claim 时机 | **A：留 v1.1（W1/W2 优先）** | — |
| D-29 | screen-salvage 缺失 | **A：先补文档再开工** | 4009 |
| **D-30** | **客户端 rid 缺口** | **B：RpcClient 内部按 idempotent 自动补（TASK-4020）** | 4008 / 4009 |
| **D-31** | **开箱结算动作** | **A：新增 `chest.open`（ADR-0013），`salvage.claimInfo` 留 v1.1** | 4009 |
| **D-32** | **开锁次数单源** | **A：`locks.csv` 为权威，`attempt` 增 `required` 入参** | 4009 |
| **D-33** | **开箱可达性** | **A：机制做 + 可达性转 v1.1（TASK-4022）** | 4009 / 4010 |
