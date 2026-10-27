---
id: PLAN-V007-04
title: 架构分层与实测所有权矩阵
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V007-01]
---

# 04 · 架构与所有权

> 本文件**修正 plan-v006/05 §8.2 的失真矩阵**（v006 只有 4 个 Agent 粗粒度路径，缺 `game-core`、`app/panel-ui.ts`、`features/inventory`、`tests`、`docs`，按它执行必然越界）。
> 所有路径来自 `find`/`ls` 实测。

## 1. 五层模型（不变，只列本规划触及点）

```text
L1 数据源  game-data/source/*.csv ──gen──► 生成类型 + client 副本
L2 纯规则  packages/game-core/**   （无 IO/随机/时间）
L3 契约    packages/contracts/**   （动作名 + 类型 + 错误码 + UX）
L4 服务端  server/src/modules/**   （权威）
L5 客户端  client/assets/scripts/**（表现 + 本地存档 + invoke）
```

### 1.1 本规划在每层的改动

| 层 | 文件 | 波次 |
|---|---|---|
| L1 | `game-data/source/chests.csv`（+`item_id` 列） | W1 |
| L2 | `packages/game-core/src/chest/index.ts`（`attempt` 增 `required`） | W1 |
| L3 | `packages/contracts/src/common/actions.ts`（+`chest.open`）、`src/chest/index.ts`（+类型） | W1 |
| L4 | `server/src/modules/chest/{handlers,service,repo}.ts`（空壳→实现）、`gateway/{handlers,payload}.ts` | W1 |
| L5 | `services/net/RpcClient.ts`（rid 注入）、`app/panel-ui.ts`（+`addButton`）、`features/inventory/view/InventoryPanel.ts`、`features/salvage/{view,model}/**` | W0 / W1 |
| 文档 | `docs/03_solution/{design,data,decisions,ui}/**`、`docs/06_validation/evidence/**` | W2 |

## 2. 硬约束（不可协商）

| # | 约束 | 违反后果 |
|---|---|---|
| A-1 | `game-core` 无 `Math.random` / `Date.now` / `enum` / `namespace` / IO / `import 'cc'` | 守卫 `gameCorePurity` 红 |
| A-2 | `features/**` 与 `ui-kit/**` 禁写 `wx.` / `tt.` | 守卫 `客户端依赖边界` 红 |
| A-3 | 禁手改 `client/assets/scripts/generated/**`，改源后 `npm run sync` | 守卫第 7 项红 |
| A-4 | `withTx` 回调内禁调全局 `q()`（PGlite 单连接死锁），必须用入参 `tx` | **永久死锁** |
| A-5 | 服务端不信客户端上报（`hitsUsed` 需服务端按 `locks.csv` 复核） | MUST-11 违约 |
| A-6 | UI 态只准 `toUxState`；面板内部态（`lock-playing`）不进 `UX_BY_ERROR_NAME` | 契约污染 |
| A-7 | 新面板/新表/新动作必须三处登记（`PanelKey` / `TableName` / `ACTIONS`） | 编译或守卫失败 |

## 3. 实测路径所有权矩阵

| 实测路径 | W0 rid+4008收尾 | W1 4009 开箱 | W2 文档+EVD | W3 真机+合规 | W4 收口 |
|---|---|---|---|---|---|
| `packages/game-core/src/chest/index.ts` | — | **写** | — | — | — |
| `packages/contracts/src/chest/index.ts` | — | **写** | — | — | — |
| `packages/contracts/src/common/actions.ts` | — | **写**（仅 `chest.open`） | — | — | — |
| `game-data/source/chests.csv` | — | **写**（仅 `item_id` 列） | — | — | — |
| `server/src/modules/chest/{handlers,service,repo}.ts` | — | **写** | — | — | — |
| `server/src/gateway/{handlers,payload}.ts` | — | **写**（注册 + schema） | — | — | — |
| `client/assets/scripts/services/net/RpcClient.ts` | **写** | — | — | — | — |
| `client/assets/scripts/app/panel-ui.ts` | **写**（+`addButton`） | **写**（只增） | — | — | — |
| `client/assets/scripts/features/inventory/view/InventoryPanel.ts` | **写** | **写**（+打开按钮） | — | — | — |
| `client/assets/scripts/features/inventory/model/**` | 只读 | 只读 | — | — | — |
| `client/assets/scripts/features/economy/model/EconomyModel.ts` | **写**（只增） | — | — | — | — |
| `client/assets/scripts/features/economy/view/MerchantPanel.ts` | **写**（记 lastMerchant） | — | — | — | — |
| `client/assets/scripts/features/salvage/{view,model}/**` | — | **写** | — | — | — |
| `packages/game-core/src/save/schema.ts` + `migrations.ts` | **写**（仅当 D-36 选 A） | — | — | — | — |
| `client/assets/scripts/generated/**` | 只 gen+sync | 只 gen+sync | — | — | — |
| `tests/determinism/**` | **写** | **写** | — | — | — |
| `tests/integration/**` | **写** | **写** | — | — | — |
| `tests/contract/**` | — | **写** | — | — | — |
| `docs/03_solution/ui/screen-salvage.md` | — | **新建** | — | — | — |
| `docs/03_solution/design/DESIGN-0001-ux-states.md` | — | — | **写** | — | — |
| `docs/03_solution/data/error-catalog.md` | — | **写**（`chest.open` 路径） | **写**（删旧"建议"） | — | — |
| `docs/03_solution/decisions/ADR-0011-*.md` | — | — | **写**（修正位置） | — | — |
| `docs/03_solution/decisions/ADR-0013-chest-open.md` | — | **新建** | — | — | — |
| `docs/06_validation/evidence/EVD-*/**` | — | **写** | **写** | **写** | **写** |
| `docs/06_validation/templates/**` | — | — | **写** | — | — |
| `docs/07_release/compliance/**` | — | — | — | **写** | — |
| `docs/04_planning/{current-plan,roadmap}.md` | — | — | **写** | — | **写** |
| `docs/00_governance/glossary.md` | — | — | — | — | **写** |
| `tools/{sample-hook-hitrate,dev/check-client-types}.mjs` | — | — | — | **写** | — |
| `docs/05_execution/tasks/TASK-{4008,4009,4020}.md` | **写**（按 D-35/37/38 修卡） | — | — | — | — |
| `package.json` / `AGENTS.md` | — | — | **写**（`check:types`） | — | — |

**冲突判定**：两波在同一次提交触及同一路径 = 冲突。
**唯一天然隔离的共享路径**：`docs/06_validation/evidence/EVD-xxxx/`（各写各子目录）。

### 3.1 与 plan-v006 矩阵的差异（务必对照）

| v006 写的 | 实际缺 | 后果 |
|---|---|---|
| `Agent-Contract: packages/contracts/**` | 缺 `game-core/chest` | `LOCK_HITS` 单源化**做不了**（F-16 永久留着） |
| `Agent-API: server/src/modules/chest/**, gateway/**` | 缺 `tests/integration/**` | 服务端改动无守据，只能靠人肉验 |
| `Agent-App: features/salvage/**, services/net/**` | 缺 `app/panel-ui.ts`、`features/inventory/**`、`features/economy/**` | 开箱按钮无处挂（箱子在背包里，不在 salvage 面板） |
| 无 docs 列 | 缺全部文档路径 | `screen-salvage.md`、`ADR-0013`、EVD 均无归属，只能"顺手做" |

## 4. 复用红线（本规划的 3 处）

| 要复用的 | 必须来自 | 禁止 |
|---|---|---|
| 回收单价 | `EconomyModel.unitPrice()` | 在 inventory 侧重写公式 |
| 按钮 UI | `panel-ui.addButton()`（W0 抽出） | 4009 再手工 `new Node` + `Graphics` |
| 开锁判定 | `game-core/chest.attempt()` | 在 `SalvageView` 内自己数连点 |

## 5. 性能与资源基线（只定基线，本规划不做优化）

| 面 | 基线 | 新增约束 |
|---|---|---|
| 主包 | ≤4MB；当前 **2.913MB**（EVD-4012，余量 26.6%） | W0/W1 **不新增美术资源**（纯代码 UI） |
| 背包渲染 | `MAX_ROWS=20` 截断 + "还有 N 项" | 加"打开"按钮后**保持截断**，禁一次性建 106 行 |
| 连点 | 数字累加，回调内不 `new` 对象 | 10 年前手机 GC 基线 |
| 读表 | `table()` 缓存 + `inflight` 去重；未预加载返回 `[]` + warn | 新表访问前必须 `preload` |
| 服务端 | 单次 `quotaUsed` + 事务内 `quotaIncrement` | 开箱结算同样**单事务**，禁多次往返 |
| 端到端 | `npm run probe` 断言全绿 | W1 后复跑，确认未劣化 |

## 6. 拓展点（加东西不用改本层）

1. **加错误码**：`errors.ts` → `ux.ts`（`satisfies` 强制）→ 测试 `EXPECTED` → `error-catalog` → `DESIGN-0001`。**五处**。
2. **加动作**：`actions.ts` → `payload.ts` → `handlers.ts`（`satisfies` 强制）→ 模块三件套。
3. **加配置表**：CSV → gen schema → `TableName` 联合（`TableRowMap` 自动生成）。
4. **加面板**：`PanelKey` → `MainView.TABS`/`FACTORIES` → `createXxxPanel`。
