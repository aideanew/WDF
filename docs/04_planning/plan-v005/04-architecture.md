---
id: PLAN-V005-04
title: 分层架构与所有权（五层 · 实测路径 · 性能/拓展/复用基线）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V005-01, PLAN-V005-03]
---

# 04 · 分层架构与所有权

> 目的：把"代码该放哪、谁能改、怎么改才不破坏架构"变成**可对照的实测路径表**。
> 本文件的路径全部来自 `find` / `ls` 实测（`01` `E-13`~`E-18`），不是设计设想。

## 1. 五层模型（数据自下而上单向流动）

```text
L1 数据源   game-data/source/*.csv  ──npm run gen──►  生成类型 + client 副本
                                                        │
L2 纯规则   packages/game-core       （无 IO/无随机/无时间）│
                                                        ▼
L3 契约     packages/contracts       （动作名 + 类型 + 错误码 + UX 映射）
                                                        │
                    ┌───────────────────────────────────┴──────────────────┐
                    ▼                                                      ▼
L4 服务端   server/src/modules/*  （权威）              L5 客户端   client/assets/scripts/*
                                                        （表现 + 本地存档 + invoke）
```

### 1.1 L1 · 数据源层（`game-data/source/`）

| 项 | 约束 | 实测状态 |
|---|---|---|
| 唯一数值来源 | 46 张 CSV；改数值只改这里，再 `npm run gen` | 11 有数 / 35 空（`01` §3） |
| 禁手改产物 | `packages/game-core/src/generated/**`、`client/assets/scripts/generated/**` 由 gen 覆盖 | 守卫第 7 项已强制 |
| 新增列 | 允许（如 D-19 的 `chests.item_id`）；需同步 gen 的 schema 定义 | `tools/gen/config.mjs` |
| 禁自编数值 | 无设计源的行不得填值 → 登记 `game-data/UNKNOWN-TABLES.md` | 已有该登记册 |

### 1.2 L2 · 纯规则层（`packages/game-core/src/`）

- **能做**：纯函数、确定性计算（浮力/判定/掉落/离线结算/存档迁移）。
- **禁做**（守卫 `gameCorePurity` 强制）：`Math.random`、`Date.now`、`enum`、`namespace`、绝对导入、任何 IO、`import 'cc'`。
- **实测**：41 个 `.ts`，含 `save/schema.ts` + `save/migrations.ts`（存档版本机制已存在）。
- **本计划触及点**：`economy/index.ts`（复用 `sellValue` 语义，不扩展）、`salvage/index.ts`（若把"连点判定"下沉为纯函数，见 `09` §4）。

### 1.3 L3 · 契约层（`packages/contracts/src/`）

| 文件 | 职责 | 冻结状态 |
|---|---|---|
| `common/actions.ts` | 20 个动作名 + `auth/idempotent` 元信息 | 冻结（4006 已授权增 `economy.sell`） |
| `common/errors.ts` | `ERR` 码表 | **本次解冻 2004**（步骤 2） |
| `common/ux.ts` | `UX_BY_ERROR_NAME`（`satisfies Record<keyof typeof ERR>`）+ `toUxState` | **本次解冻 2004 映射** |
| `economy/index.ts` | `SellReq/SellRes` | **本次补 `merchantId?`**（D-24） |
| `salvage/index.ts` | `claimInfo` 类型 | 已存在，4009 消费 |

**铁约束**：`ux.ts` 用 `satisfies`，**加码不加映射 = 编译失败**——这是防止"加了码忘了 UX"的机制性保障，务必保留。

### 1.4 L4 · 服务端层（`server/src/modules/<module>/`）

标准三件套：`handlers.ts`（薄，只解参/转错误）→ `service.ts`（业务 + 事务）→ `repo.ts`（SQL + `qx` 分发器）。

| 模块 | 实测状态 | 本计划动作 |
|---|---|---|
| `account` | ✅ 登录/刷新/绑定/合并 | 步骤 2 改 5 处错误码 |
| `economy` | ✅ `sell` 完整（限购/影子/幂等） | 不改（只消费） |
| `salvage` | ❌ **空壳（1-2 行）** | 步骤 4 建三件套 |
| `save` / `leaderboard` / `telemetry` / `config` / `compliance` | ✅ | 不改 |
| `event` / `social` / `ads` | ❌ 空壳 + `todo` | v1.1（`13`） |

**PGlite 死锁铁律**（历史实测）：`withTx` 回调内**禁止**调全局 `q()`/`getDb().query`，必须用回调入参 `tx`；repo 层范式 = 函数带可选 `tx` 尾参 + `qx` 分发器（见 `account/repo.ts`）。步骤 4 必须照抄该范式。

### 1.5 L5 · 客户端层（`client/assets/scripts/`）

```text
app/            MainView / panel-types(PanelKey) / panel-ui(UI 工厂) / nav / BootController
services/       config(读表) / net(RpcClient) / save(LocalSave) / platform
features/<m>/   model/(纯逻辑，可 Node 测) + view/(Cocos 组件，Node 测不到)
generated/      contracts + game-core 副本（禁手改）
```

| feature | model | view | 本计划动作 |
|---|---|---|---|
| `hook` | ✅ | ✅ | 不改（打捞出钩已闭环） |
| `inventory` | ✅ | ✅ 189 行 | **步骤 3 重构行容器 + 回收按钮** |
| `economy` | ✅ 121 行增量 | ✅ `MerchantPanel` 306 行 | **步骤 3 允许只增导出**（D-23） |
| `salvage` | ✅ `SalvageModel` | ⚠ `SalvageView` 空壳 | **步骤 4 建开锁 UI** |
| 其余 14 个 | 部分 | 大量空壳 | 不动 |

**`'cc'` 依赖铁律**：`features/*/view/**` 依赖 `cc`，**Node 测不到**。凡是需要自动化验证的逻辑，必须下沉到 `model/`（纯函数），view 只做"调 model + 摆节点"。这是本项目 UI 可测性的唯一杠杆。

## 2. 全维度设计映射（用户要求的 15 个面 → 落在哪一层）

| 维度 | 落点 | 本计划的具体约束 |
|---|---|---|
| **需求** | `01`/`02`/`03` | 需求唯一源 = `docs/01_product/design-source/`；本计划只做缺口补齐，不改已冻结设计 |
| **前端** | L5 | 面板工厂 `createXxxPanel(parent): PanelHandle` 签名锁死；MainView 挂载改动 ≤5 行 |
| **后端** | L4 | handlers 薄、service 事务、repo 带 `tx`；不信客户端上报 |
| **数据** | L1 | 只改 CSV；新列须过 gen schema；空表不进代码路径 |
| **交互** | L5 view | 所有态走 `toUxState`；**禁**手写 `if (code===xxxx)`；开锁新态见 `09` §3.3 |
| **逻辑** | L2 | 纯函数 + 入参时间/随机源；连点判定若需确定性，下沉 `game-core/salvage` |
| **组件** | L5 `app/panel-ui.ts` | 本计划新增 3 个工厂（见 §4.1），全部纯代码、无 prefab 依赖 |
| **复用** | 跨层 | 价格公式**唯一实现**在 `EconomyModel.unitPrice`（禁复制，D-23） |
| **拓展** | L3/L5 | 加码必须加映射（satisfies）；加面板必须注册 PanelKey；加表必须扩 `TableName` |
| **性能** | L5/L4 | 见 §5 基线；不做无基线优化 |
| **配置** | L1 + `services/config` | 所有展示数值来自 `table()`，未预加载返回 `[]` + warn（不抛错、不崩） |
| **知识库** | `docs/` | 每步产出 EVD；文档 front matter 必填；`task-index`/`document-index` 由 gen 生成，**禁手改** |
| **响应** | L3 `ux.ts` | 六态 + 出口 `next`；`conflict` 只能来自 `save.push accepted:false` |
| **存储** | L2 + L4 | 客户端 `modules.inventory` 是**扁平** `{[itemId]:number}`（无 `.items` 子键）；服务端权威在 `ledger_entry` |
| **资源** | `client/assets/bundles` | 包体预算 4MB（当前 2.913MB，余量 26.6%，EVD-4012）；步骤 3/4 **禁止新增美术资源**，纯代码 UI |

## 3. 所有权矩阵（实测路径版，替代 plan-v004 §6.3）

> 读法：一次执行只允许写自己"写"格内的路径；空白格 = 禁写。

| 实测路径 | 步骤1 止血 | 步骤2 契约 | 步骤3 回收 | 步骤4 开箱 | 步骤5 测试 | 步骤6 真机 | 步骤7 文档 |
|---|---|---|---|---|---|---|---|
| `packages/contracts/src/common/errors.ts` | — | **写** | — | — | — | — | — |
| `packages/contracts/src/common/ux.ts` | — | **写** | — | — | — | — | — |
| `packages/contracts/src/economy/index.ts` | — | **写** | — | — | — | — | — |
| `packages/contracts/src/common/actions.ts` | — | — | — | **写**（仅加 `chest.open`） | — | — | — |
| `packages/contracts/src/chest/index.ts` | — | — | — | **写**（仅加开箱请求/响应） | — | — | — |
| `packages/game-core/src/chest/index.ts` | — | — | — | **写**（`attempt` 增 `required`，`LOCK_HITS` 降级） | — | — | — |
| `client/assets/scripts/generated/**` | — | 只 gen | — | 只 gen | — | — | — |
| `server/src/modules/account/service.ts` | — | **写** | — | — | — | — | — |
| `server/src/modules/chest/{handlers,service,repo}.ts` | — | — | — | **写** | — | — | — |
| `server/src/gateway/{handlers,payload}.ts` | — | — | — | **写**（注册 + schema） | — | — | — |
| `client/.../services/net/RpcClient.ts` | — | — | **写**（仅 4020） | — | — | — | — |
| `client/.../features/inventory/view/**` | — | — | **写** | **写（加"打开"按钮）** | — | — | — |
| `client/.../features/inventory/model/**` | — | — | **写** | — | — | — | — |
| `client/.../features/economy/model/EconomyModel.ts` | — | — | **写（只增）** | — | — | — | — |
| `client/.../features/salvage/view/**` / `model/**` | — | — | — | **写** | — | — | — |
| `client/.../app/panel-ui.ts` | — | — | **写** | **写（只增）** | — | — | — |
| `game-data/source/chests.csv` | — | — | — | **写（仅加 `item_id` 列）** | — | — | — |
| `tests/**` | **写** | **写** | **写** | **写** | **写** | — | — |
| `tools/sample-hook-hitrate.mjs` / `tools/dev/check-client-types.mjs` | — | — | — | — | **写** | **写** | — |
| `docs/06_validation/evidence/**` | **写** | **写** | **写** | **写** | **写** | **写** | **写** |
| `docs/06_validation/templates/**` | — | — | — | — | **写** | **写** | — |
| `docs/03_solution/design/DESIGN-0001-ux-states.md` | — | **写** | — | — | — | — | — |
| `docs/03_solution/decisions/ADR-0011-*.md` | — | **写** | — | — | — | — | — |
| `docs/03_solution/decisions/ADR-0013-chest-open.md` | — | — | — | **新建** | — | — | — |
| `docs/03_solution/data/error-catalog.md` | — | **写** | — | **写**（`chest.open` 错误路径） | — | — | **写** |
| `docs/03_solution/ui/screen-salvage.md` / `screen-inventory.md` | — | — | — | **新建 / 更新** | — | — | — |
| `docs/07_release/compliance/**` | — | — | — | — | — | — | **写** |
| `docs/04_planning/{current-plan,roadmap}.md` | — | — | — | — | — | — | **写** |
| `docs/00_governance/glossary.md` | — | — | — | — | — | — | **写** |
| `game-data/UNKNOWN-TABLES.md` | — | — | — | — | — | — | **写** |
| `package.json` / `AGENTS.md` | — | — | — | — | **写**（加 check:types） | — | — |

**冲突判据**：两步骤在同一次提交中触及同一路径 = 冲突。**唯一允许的共享路径**是 `docs/06_validation/evidence/**`（各写各子目录，天然隔离）。

## 4. 组件与复用基线

### 4.1 `app/panel-ui.ts` 的目标形态（步骤 3/4 共建）

| 工厂 | 现状 | 目标 | 归属 |
|---|---|---|---|
| `addLabel(opts)` | ✅ 有 | 不改 | — |
| `addTitle(parent, text)` | ✅ 有 | 不改 | — |
| `addEmptyHint(parent, text)` | ✅ 有 | 不改 | — |
| `addButton({parent,name,text,onClick,pos,w,h})` | ❌ 无 | 新增（节点 + Label + TOUCH_END 监听 + 销毁清理） | 步骤 3 |
| `addRow({parent,name,y,cols})` | ❌ 无 | 新增（行容器 Node + 多列 Label，供背包行挂按钮） | 步骤 3 |
| `addConfirmDialog({parent,title,body,onConfirm,onCancel})` | ❌ 无 | 新增（遮罩 + 卡片 + 双按钮；返回 `destroy()`） | 步骤 3 |

**约束**：
- 全部**纯代码节点**（`new Node` + `UITransform` + `Label`/`Sprite`），**不引入 prefab**（当前工程 0 个 prefab，见 `01` §5.1）。
- 每个工厂必须返回可 `destroy()` 的句柄，且 `onHide` 时必须注销监听（`PanelHandle.onHide` 的既有契约）。
- 新增工厂必须**只增不改**既有三个函数（避免波及其他已完成的 4 个面板）。

### 4.2 复用红线

| 想复用/复制的东西 | 必须复用自 | 禁止 |
|---|---|---|
| 回收单价公式 | `EconomyModel.unitPrice(basePrice, recycleBp, regionBp)` | 在 inventory 侧复制一份 |
| 存档写入 | `EconomyModel.applySell(save, itemId, count, herbDelta)` | 直接改 `LocalSave` 的经济段 |
| 错误 → UX 态 | `generated/contracts/common/ux` 的 `toUxState` | 手写 `if (code === 3002)` 分支 |
| 读表 | `services/config` 的 `table(name)` | `resources.load` 裸调（Cocos 3.8 无 loadAsync，见 EXEC-BRIEF G-08） |
| 导航 | `app/nav.ts` 的 `navigate()` | 面板内直接改 MainView |

## 5. 性能基线（只定基线，本计划不做优化）

| 面 | 基线 | 依据 | 本计划的新增约束 |
|---|---|---|---|
| 主包体 | ≤ 4MB；当前 **2.913MB**（余量 26.6%） | EVD-4012 | 步骤 3/4 **不新增美术资源**（纯代码 UI），包体不回退 |
| 背包渲染 | `MAX_ROWS` 截断 + "还有 N 项" | `InventoryPanel.ts:81-102` | 加按钮后**保持 `MAX_ROWS` 截断**，不得一次性建 106 行节点 |
| 读表 | 缓存 + `inflight` 去重 + 未预加载返回 `[]` | `services/config/tables.ts:56-112` | 新表访问前必须 `preload`；不重复 load |
| 服务端限购 | 单次 `quotaUsed` 查询 + 事务内 `quotaIncrement` | `economy/service.ts:82-100` | 4009 的 salvage 结算**同样走单事务**，不得多次往返 |
| 连点判定 | 目标 60fps 下无 GC 抖动 | 10 年前手机基线 | 连点计数用**数字累加**，不在回调里 new 对象/闭包数组 |
| 端到端延迟 | 本地 probe 30 断言全绿 | `npm run probe` | 步骤 4 后复跑 probe，确认未劣化 |

## 6. 拓展点清单（未来加东西不用改这层）

1. **加错误码**：`errors.ts` 加一行 → `ux.ts` 加映射（编译器强制）→ 测试 `EXPECTED` 加一行 → `error-catalog.md` 加一行。**四处齐改即完成**，无隐藏耦合。
2. **加面板**：`PanelKey` 加一个键 → `MainView` 的 `TABS` 与 `FACTORIES` 各加一行 → 新建 `createXxxPanel`。**三步**。
3. **加配置表**：CSV 落地 → gen schema 加定义 → `TableName` 联合加名字 → `TableRowMap` 自动生成。**不手写行类型**。
4. **加服务端动作**：`actions.ts` 加名 → `payload.ts` 加 zod → `handlers.ts` 加实现（`satisfies` 强制）→ 模块三件套。**漏一处编译失败**。
5. **加 ledger 类型**：`ledger_entry.type` 已含 `'sell'|'salvage'`，加 `'craft'` 等只需扩 union + 一条写入函数。
