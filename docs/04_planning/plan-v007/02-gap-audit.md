---
id: PLAN-V007-02
title: 缺陷审计（F-01~F-26 生命周期 + 新增 F-19~F-26 详解）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V007-01, PLAN-V007-03]
---

# 02 · 缺陷审计

> 本文件继承 plan-v005 的 F-01~F-18 编号（**不重排**，便于与历史文档对照），新增 F-19~F-26。
> 每条给"状态"：**CLOSED**（已修复且有守据）/ **OPEN**（仍存在）/ **STALE**（前提已变，不再适用）。

## 1. 缺陷生命周期总表

| # | 缺陷 | v005 状态 | 现在 | 关闭凭证 |
|---|---|---|---|---|
| F-01 | 4015 改 contracts 未 sync，guard 红 | OPEN | **CLOSED** | `f3fa3e0` 已 sync，guard 第 7 项绿 |
| F-02 | 契约测试硬断言 14 码 | OPEN | **CLOSED** | `ux.test.mjs` 改 15 + 新增独立 2004 用例（128 例） |
| F-03 | 三箱 `lock=none`，开锁不可触发 | OPEN | **OPEN** | `chests.csv` 未变 |
| F-04 | `chests.id` 与 `items.id` 两套体系 | OPEN | **OPEN** | `chests.csv` 仍无 `item_id` 列 |
| F-05 | 保底取最低价 = `item_0013`（价 0） | OPEN | **OPEN** | `prices.csv` 未变 |
| F-06 | 4009 允许清单缺服务端模块 | OPEN | **CLOSED** | 新 TASK-4009 已列 `server/src/modules/chest/**` |
| F-07 | 4015 目标文件写错（save→account） | OPEN | **残留** | **代码已改对**，但 `ADR-0011:24` 仍写 `save/service.ts`（见 F-24） |
| F-08 | 所有权矩阵路径失真 | OPEN | **CLOSED** | v006 矩阵仍失真，本目录 `04` §4 已按实测重写 |
| F-09 | 4008 工作量低估（需行容器重构） | OPEN | **STALE** | 实现走的是"行内手工建按钮"，未做容器重构 |
| F-10 | `screen-salvage.md` 不存在 | OPEN | **OPEN** | 新 4009 卡已注明"需先补充"，但未列入 Exec Steps |
| F-11 | 4007 无 EVD | OPEN | **OPEN** | `evidence/` 下只有 `EVD-4002` |
| F-12 | buyQuota 数值依赖已解除 | OPEN | **OPEN** | 结论仍有效，处置仍为 v1.1 |
| F-13 | 客户端 13 个幂等动作零处传 rid | OPEN | **OPEN** | `RpcClient` 未改 |
| F-14 | `salvage.claimInfo` 语义错配 | OPEN | **CLOSED（设计层）** | 新 4009 卡改为 `chest.open`；代码层待 W1 |
| F-15 | `chest.open` 孤儿契约 | OPEN | **OPEN** | `ACTIONS` 仍无 `chest.open` |
| F-16 | 开锁次数双源冲突 | OPEN | **OPEN** | `LOCK_HITS` 与 `locks.csv` 未动 |
| F-17 | 开箱路径全链不可达 | OPEN | **OPEN** | 四环全断，且 **v006 未记录** |
| F-18 | buyQuota/ads.claim 数值就绪 | OPEN | **OPEN** | 未处理（v1.1） |

**统计**：CLOSED 6 / OPEN 14 / STALE 1 / 残留 1 / 设计层关闭 1。

## 2. 新增缺陷（F-19 ~ F-26，本次 15:58 审计发现）

### 2.1 `F-19` · TASK-4020 卡把 rid "注入 payload"——**位置错误，照做无效**

| 项 | 内容 |
|---|---|
| 卡原文 | 步骤 2：「若是，且调用方未提供 `rid`，则自动生成 UUID 并**注入 payload**」 |
| 正确位置 | **`meta`**，不是 `payload` |
| 证据 | `RpcClient.ts:62-67`：`const meta: RequestMeta = { cv, cfg, sv, plat, ...(rid ? { rid } : {}) }`；`const req = { a: action, p: params, m: meta }`。服务端 `economy/handlers.ts:14` 读 `req.m?.rid`、幂等用 `req.m.rid` |
| 照做的后果 | rid 进了 `p`（业务参数），`m.rid` 仍为空 → **服务端幂等表依旧不命中**，但卡会"看起来做完了"（客户端确实"传了" rid） |
| 处置 | W0 按 `06` §2.1 实现：`invoke()` 内计算 `effectiveRid`，写进 `meta`，且**递归重试复用同一值**；`payload.ts` 的 zod 会**拒绝**多余字段（`economy.sell` schema 无 rid），所以注入 payload 会在服务端直接 1001 |

> **这是本次审计里最危险的一条**：卡写得像对的，做出来是错的，而且测试还绿。

### 2.2 `F-20` · 4008 的按钮 UI 未沉淀，4009 将重复实现

| 项 | 内容 |
|---|---|
| 现状 | `InventoryPanel.ts:100-119` 手工 `new Node` + `Graphics.roundRect` + `Label` 约 30 行 |
| `panel-ui.ts` | 只有 `addLabel / addTitle / addEmptyHint / addConfirmDialog`，**无 `addButton` / `addRow`** |
| 后果 | 4009 的"打开"按钮要么再抄 30 行，要么临时加工厂——两份实现必然漂移（一处改圆角、一处不改） |
| 处置 | W0 §2.3 抽 `addButton` 并让 4008 改用它；`addRow` 视 4009 需要再定（见 `03` D-35） |

### 2.3 `F-21` · 4008 的 `sellOne` 未传 rid、未传 merchantId

```ts
// InventoryPanel.ts:139-140 现状
const payload: SellReq = { itemId: r.id, count: 1 };        // ← 无 merchantId
const res = await invoke<SellReq, SellRes>('economy.sell', payload);  // ← 无 rid（第 3 参）
```

| 后果 | 说明 |
|---|---|
| 幂等失效 | 收 2002 → 静默刷新 → 自动重发 → 服务端未命中幂等 → **二次扣额度 + 二次写 ledger** |
| 商人归属不一致 | 服务端兜底 `merchant_village`（`regionBp=10000`）；若玩家在商人页选了黑市（13000），**从背包回收只拿到渔村价**，比商人页低 23% |
| 处置 | rid 由 W0 §2.1 在 `RpcClient` 层统一解决（无需改此行）；`merchantId` 在 W0 §2.4 按"玩家上次所选商人"补齐 |

### 2.4 `F-22` · 4008 缺 `count <= 0` 拦截与 known 显式守据

| 项 | 内容 |
|---|---|
| 现状 | 只要 `rows` 里有该行就建按钮；`rows` 本身来自 `project()` 的 `known`，所以暂未泄露 |
| 风险 | 存档出现 `count: 0` 时仍可点"回收"→ 发 `count: 1` 请求 → 服务端影子校验 1001（玩家看到"校验失败"而非"没有该物品"） |
| 处置 | W0 §2.5 加一行守卫 + 单测（`count: 0` 的行不建按钮） |

### 2.5 `F-23` · `DESIGN-0001` 无 2004（设计文档未同步）

| 项 | 内容 |
|---|---|
| 实测 | `grep -c "2004" docs/03_solution/design/DESIGN-0001-ux-states.md` → **0** |
| 影响 | `tests/contract/ux.test.mjs` 的断言文本写着"逐行与 DESIGN-0001 §2 一致"，但文档里没有 2004 —— **测试在自我引用一份不存在的依据** |
| 处置 | W2 §2.1 补一行；补完才有资格说"测试与文档一致" |

### 2.6 `F-24` · `ADR-0011:24` 票据校验位置笔误未修

| 项 | 内容 |
|---|---|
| 实测 | 第 24 行仍写 `server/src/modules/save/service.ts:119` |
| 真相 | 票据逻辑在 `server/src/modules/account/service.ts:126-137`（`bindConfirm` 内 5 处 `BindError`） |
| 影响 | ADR 已 `accepted`，**错误事实被"批准"了**；后续任何人按 ADR 排查都会找错文件 |
| 处置 | W2 §2.2 修正 + 留更正注记 |

### 2.7 `F-25` · `error-catalog.md` 第 27 行与第 41 行自相矛盾

| 行 | 内容 |
|---|---|
| 27 | `| 2004 | BIND_TICKET_INVALID | AUTH | ...`（**正式登记行**） |
| 41 | `> 建议新增 2004 BIND_TICKET_INVALID 精确区分。`（**旧的"建议"**） |
| 43 | `> 缺口解冻（TASK-4015）：已新增 2004...`（新的注记） |
| 问题 | 27 行说"有了"、41 行说"建议加"、43 行说"已加"。**同一份文档三个口径** |
| 处置 | W2 §2.3 删第 41 行（被 43 行取代） |

### 2.8 `F-26` · `current-plan.md` 仍指向 plan-v004

| 项 | 内容 |
|---|---|
| 实测 | 第 25-27 行："下一阶段切换 = plan-v004…完整规划见 plan-v004/00-snapshot.md" |
| 现状 | 当前规划是 plan-v007（本目录）；`current-plan` 是"唯一『现在做什么』"的权威文件 |
| 影响 | 任何人读 current-plan 会被导到已废止的 v004 |
| 处置 | W2 §2.4 改写为指向 plan-v007；W4 §2 再次校准（避免二次过期） |

## 3. 缺陷的"元规律"（三次审计的共同模式）

| 模式 | 实例 | 教训 |
|---|---|---|
| **补新忘删旧** | F-25（error-catalog 27 vs 41）、F-07/F-24（ADR 位置笔误未改） | 改文档必须**同时搜旧表述**并删除，否则矛盾比缺失更误导 |
| **改代码忘改文档** | F-23（DESIGN-0001 无 2004）、F-26（current-plan 滞后） | 文档与代码是同一链的两端；只改一端＝把漂移从代码侧搬到文档侧 |
| **卡面像对、做出来错** | F-19（rid 进 payload） | 卡的"意图"与"实现位置"必须落到**具体字段路径**，不能用"注入"这种模糊动词 |
| **实现了但没沉淀** | F-20（按钮 UI 硬编码 30 行） | 第二个使用者出现前就该抽函数；否则必然两套 |
| **测试绿但依据不存在** | F-23（测试说"与 DESIGN-0001 §2 一致"，而 §2 没有该项） | 断言里引用外部依据时，必须同时断言该依据存在 |
