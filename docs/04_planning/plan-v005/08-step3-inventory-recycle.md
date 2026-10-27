---
id: PLAN-V005-08
title: 步骤 3 · W2 背包回收入口 + 弹窗组件 + 幂等 rid 注入
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V005-07, PLAN-V005-04]
---

# 08 · 步骤 3：W2 背包回收（TASK-4008 + 前置 TASK-4020）

> **一句话**：把背包从"只读文本列表"升级为"可回收的交易界面"，并顺手补上 4007 暴露的幂等缺口。
> **本步新增前置卡 `TASK-4020`**：客户端 13 个 `idempotent:true` 的写动作**从未传过 `rid`**，服务端幂等表形同虚设（`F-13`）。4008 会大量调 `economy.sell`，不先补 rid 就是在一个已经漏水的管子上接新龙头。

## 1. 前置与边界

| 项 | 内容 |
|---|---|
| 前置 | W1 完成（`verify` 绿）；D-23 已裁决（允许改 `EconomyModel`，只增不改） |
| 允许修改 | `client/assets/scripts/services/net/RpcClient.ts`（**仅 4020**）、`client/assets/scripts/app/panel-ui.ts`、`client/assets/scripts/features/inventory/view/InventoryPanel.ts`、`client/assets/scripts/features/inventory/model/InventoryModel.ts`、`client/assets/scripts/features/economy/model/EconomyModel.ts`（**只增导出**）、`tests/determinism/**` |
| 禁止修改 | `packages/contracts/**`、`server/**`、`features/economy/view/MerchantPanel.ts`（4007 已定稿，仅允许附带修 rid——见 §2.1.4）、任何 `*.prefab` / 美术资源 |
| 出口 | V-2.1 ~ V-2.7 全绿 |
| 规模 | **M**（原卡标"小"是低估：背包行当前无节点容器，须先重构，见 `01` `F-09`） |

## 2. 原子步骤

### 2.1 【TASK-4020】客户端幂等 rid 注入（横切，一处改全局生效）

#### 2.1.1 问题坐实

| 事实 | 证据 |
|---|---|
| 契约里 13 个动作标 `idempotent: true` | `packages/contracts/src/common/actions.ts`（`grep -c "idempotent: true"` → 13） |
| 服务端幂等表已实现（24h TTL，只缓存 c===0） | `server/src/gateway/idempotency.ts` |
| `invoke()` 的 rid 是**第 3 个可选参数**，不传则 `meta.rid` 不存在 | `RpcClient.ts:55-68` |
| **全仓零处传 rid**（`economy.sell` / `save.push` / `save.resolveFork` / `leaderboard.report` 全部） | `grep -rn "invoke<" client/assets/scripts/features` |
| `RpcClient` 在收 2002 时会**自动重发一次原请求** | `RpcClient.ts:96-98`：`return invoke(action, params, rid, true)` |

**后果链**：`economy.sell` 收 2002 → 静默刷新 token → 自动重发 → 服务端未命中幂等 → **第二次扣额度、第二次写 `ledger_entry`**。玩家钱与影子账本同时漂移，且 `1001` 会在下一次卖出时才暴露。

#### 2.1.2 方案选型（为什么选"RpcClient 内部自动补"）

| 方案 | 改动面 | 风险 | 结论 |
|---|---|---|---|
| A. 13 个调用点各自生成 rid | 8 个文件 | 漏一个就仍漏；每个调用点都要管重试复用 | ✗ |
| B. **RpcClient 内部：`idempotent` 动作未传 rid 时自动生成** | **1 个文件** | 需保证递归重试复用同一 rid | ✅ |
| C. 不做，登记为 v1.1 | 0 | 留 P1 正确性缺陷 | ✗（v1.0 就要真实交易） |

#### 2.1.3 实现要点

在 `RpcClient.ts` 内（文件级，不导出到别处）：

```ts
import { ACTIONS } from '../../generated/contracts/common/actions';

let ridSeq = 0;
/** 幂等写动作的请求号：时间戳 + 进程内自增，足以在 24h TTL 内唯一。 */
function newRid(): string {
  ridSeq = (ridSeq + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${ridSeq.toString(36)}`;
}
```

在 `invoke()` 开头：

```ts
// 幂等动作（契约 idempotent:true）必须带 rid；调用方没传则自动补。
// 重试路径（2002 静默刷新）递归时传入同一个 effectiveRid，保证服务端命中幂等表。
const effectiveRid = rid ?? (ACTIONS[action]?.idempotent ? newRid() : undefined);
```

- `meta` 用 `effectiveRid`；
- **递归重试改用 `effectiveRid`**（否则每次重试都是新 rid，等于没做）：

```ts
-if (nt) return invoke<P, D>(action, params, rid, true);
+if (nt) return invoke<P, D>(action, params, effectiveRid, true);
```

#### 2.1.4 边界声明（必须写进代码注释）

| rid 解决 | rid 不解决 |
|---|---|
| 传输层重试（2002 刷新后重发、网络抖动）导致的服务端重复执行 | 用户**双击按钮**产生的两次独立意图（两次点击 = 两个合理请求） |
| — | 双击必须由 UI 层 `busy` 闸门拦（4007 的 `sellOne` 已有 `if (busy) return`；4008 必须同样实现） |

#### 2.1.5 验证（4020 单独提交）

```bash
# ① 契约侧：幂等动作确实都带上了 rid（静态断言，新增测试）
npm test -- --test-name-pattern="rid"
# ② 既有行为未破坏
npm test
```

新增测试 `tests/determinism/rid.test.mjs`：
- 断言 `ACTIONS` 中 `idempotent:true` 的动作数 = 13；
- 断言 `RpcClient` 源码含 `ACTIONS[action]?.idempotent` 分支（源码级防回归）；
- 断言 `newRid()` 连续两次调用不相等（若可导出；不可导出则跳过此条，仅保留前两条）。

> **为什么用源码级断言**：`RpcClient` 依赖 `'cc'`（`getPlatform`），Node 测不到运行时行为。这是 G-07 允许的替代证据形态。

**提交边界（第 1 次提交）**：

```text
fix(4020): 客户端幂等 rid 注入——13 个 idempotent 动作未传 rid，服务端幂等表形同虚设

- services/net/RpcClient.ts：idempotent 动作未传 rid 时自动生成；2002 重试复用同一 rid
- tests/determinism/rid.test.mjs：契约幂等动作计数 + 源码分支断言
```

### 2.2 `app/panel-ui.ts` 新增三个工厂（纯代码节点，不用 prefab）

> 现状：只有 `addLabel / addTitle / addEmptyHint`（`01` `E-17`）。本步建"按钮 / 行 / 弹窗"三件，供本步与 W3 共用。

#### 2.2.1 `addButton`

```ts
export interface ButtonOpts {
  parent: Node; name: string; text: string;
  pos: Vec3; width?: number; height?: number;
  onClick: () => void;
  fontSize?: number;
}
export interface ButtonHandle { readonly node: Node; setEnabled(v: boolean): void; destroy(): void }
export function addButton(o: ButtonOpts): ButtonHandle;
```

约束：
- 用 `Graphics` 画圆角矩形背景（与既有面板一致，`InventoryPanel.ts:12` 已 import `Graphics`）；
- 监听 `Node.EventType.TOUCH_END`；
- `destroy()` **必须** `off(Node.EventType.TOUCH_END)` 后再 `node.destroy()`（防泄漏与"点已销毁节点"崩溃）；
- `setEnabled(false)` 用于 `busy` 期间置灰（不依赖 Cocos Button 组件，避免 prefab 依赖）。

#### 2.2.2 `addRow`

```ts
export interface RowOpts { parent: Node; name: string; y: number; height?: number }
export interface RowHandle { readonly node: Node; addText(...): Label; addButton(...): ButtonHandle }
export function addRow(o: RowOpts): RowHandle;
```

约束：
- 行容器是 `Node` + `UITransform(750, height)`，子节点用**相对定位**（`pos.y = 0`，靠 `x` 分列），不再用绝对 `FIRST_ROW_Y - i*ROW_H`；
- **不改 `MAX_ROWS` 截断策略**（106 行全建节点会掉帧，见 `04` §5）。

#### 2.2.3 `addConfirmDialog`

```ts
export interface ConfirmOpts {
  parent: Node; title: string; body: string;
  confirmText?: string; cancelText?: string;
  onConfirm: () => void; onCancel?: () => void;
}
export interface DialogHandle { destroy(): void }
export function addConfirmDialog(o: ConfirmOpts): DialogHandle;
```

约束：
- 全屏半透明遮罩（拦穿透点击）+ 居中卡片；
- **`onConfirm` 执行后自动 `destroy()`**，调用方无需手动关；
- `onCancel` 或点遮罩 → `destroy()` + `onCancel?.()`；
- 同一时刻只允许一个弹窗（模块级 `let opening: DialogHandle | null`，新开先关旧）。

### 2.3 背包行重构（`InventoryPanel.renderRows`）

#### 2.3.1 现状

```ts
rows.slice(0, MAX_ROWS).forEach((r, i) => {
  addLabel({ parent: body, name: `Row_${i}`, text: `${r.name} ×${r.count} | ...`, pos: new Vec3(0, FIRST_ROW_Y - i*ROW_H, 0), fontSize: 20 });
});
```

每行**只有一封信标**，没有行容器 → 无处挂按钮（`01` `F-09`）。

#### 2.3.2 目标结构

```text
body
└── Row_i (Node, 750×40)
    ├── Text (Label, x=-160, 左对齐, 文本格式保持不变)
    └── SellBtn (Button, x=+250, "回收")     ← 仅 known 行创建
```

#### 2.3.3 关键约束

| # | 约束 | 理由 |
|---|---|---|
| ① | 文本格式**逐字保持**（`名称 ×数量 \| 类别 \| 基准价`） | 避免破坏 3102 的既有视觉与既有断言 |
| ② | **不显示 weight/capacity/unlock_level** | D-07 主控裁定，items 全表填 0，显示 = 伪造数据 |
| ③ | `unknownIds` 的物品**不显示按钮** | 配置表里没有 → 无价格 → 无法回收（G-09） |
| ④ | `count <= 0` 的行不显示按钮 | 防"卖 0 个"的空请求 |
| ⑤ | 回收按钮的单价文案从配置读，不写死 | R-2 |

#### 2.3.4 `known` 判定的落点

`InventoryModel.rows` 本身就是 known（`project()` 内 `this._rows = r.known`，`InventoryModel.ts:44`）——**不需要新增 known 判定**，直接用 `rows` 建按钮、`unknownIds` 单独提示即可。
**这是本步最容易做错的地方**：不要自己再遍历 items 表算 known，避免双份真相。

### 2.4 确认弹窗接线

#### 2.4.1 交互流程（状态机）

```text
[idle] --点回收--> [confirming] --确认--> [busy] --成功--> [idle] + refresh + toast"+N 金币"
                        │                    │
                        └--取消--> [idle]     └--失败--> [idle] + 按 toUxState 展示
```

#### 2.4.2 单价与落账（复用 4007 的纯函数）

```ts
// 单价：与服务端同源（regionBp 取 merchants 表首行 = merchant_village，服务端默认值）
const regionBp = table('merchants')[0]?.region_bp ?? 0;
const price = priceIndex[itemId];                    // 来自 table('prices')
const unit = unitPrice(price.base_price, price.recycle_bp, regionBp);
```

**严禁**在 `InventoryPanel` 里重写 `floor(base * recycle_bp * region_bp / 1e8)`，一律调 `EconomyModel.unitPrice`（`04` §4.2 复用红线）。

落账同样复用 `EconomyModel.applySell(save, itemId, count, herbDelta)`。

#### 2.4.3 成功/失败分支

| 情形 | 处理 | 依据 |
|---|---|---|
| `c === 0` | `applySell` 落本地 → `refresh()` → 顶部提示 `+{herbDelta} 金币` | 4007 已确立的范式 |
| `3002` 额度耗尽 | 弹窗关闭 + 提示"今日额度已用完，明天再来" + 禁用所有回收按钮至下次 `onShow` | `QUOTA_EXHAUSTED` 的 `next:'tomorrow'` |
| `1001` 影子不一致 | `toUxState(1001)` → error 态，**提示"数据校验失败，请重启游戏同步"** + 上报 `telemetry` | ADR-0012 容差 0 |
| `2004` / `2001` / `2002` | `toUxState` → `noPermission` → 走全局登录态处理 | 步骤 2 的成果 |
| 其他 | `toUxState(code)` 通用展示 | **禁**手写 `if (code === xxxx)` 分支 |

#### 2.4.4 `EconomyModel` 只增导出（D-23 约束）

允许新增：

```ts
/** 背包回收用的默认商人区服倍率（merchant_village，与服务端缺省一致）。 */
export function defaultRegionBp(rows: readonly MerchantsRow[]): number;
```

**禁止**：改 `unitPrice` / `sellableRows` / `applySell` / `quotaText` 的签名或行为（4007 的 8 条单测是守据）。

### 2.5 UI 层 `busy` 闸门

- 点击回收 → 弹窗确认 → 确认后 `busy = true`，**禁用整行按钮**（`ButtonHandle.setEnabled(false)`）；
- 成功后 `busy = false` + refresh；
- 失败后 `busy = false`；
- **`onHide` 时必须销毁未关闭的弹窗**，否则切面板后遮罩残留。

## 3. 验收断言

| # | 断言 | 命令 | 期望 |
|---|---|---|---|
| V-2.1 | 三工厂存在 | `grep -n "^export function add\(Button\|Row\|ConfirmDialog\)" client/assets/scripts/app/panel-ui.ts` | 3 命中 |
| V-2.2 | rid 注入生效 | `npm test -- --test-name-pattern="rid"` | 全绿 |
| V-2.3 | 4007 既有断言未破 | `npm test -- --test-name-pattern="merchant"` | 全绿（≥8 例） |
| V-2.4 | 背包不显示伪造字段 | `grep -n "weight\|capacity\|unlockLevel" client/assets/scripts/features/inventory/view/InventoryPanel.ts` | 0 命中 |
| V-2.5 | 无手写错误码分支 | `grep -nE "code === (1001\|2001\|2004\|3002)" client/assets/scripts/features/inventory/view/InventoryPanel.ts` | 仅允许 3002 一处（额度态需特判 UI），其余 0 |
| V-2.6 | 类型检查 0 错 | `npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 \| grep -v "^C:/"` | 输出空 |
| V-2.7 | `verify` 全绿 + EVD 齐 | `npm run verify` && `ls docs/06_validation/evidence/EVD-4008/` | EXIT=0 且含五要素 |

## 4. 提交边界（两次提交）

**提交 1（TASK-4020，独立可回退）**：见 §2.1.5。

**提交 2（TASK-4008）**：

```text
feat(4008): 背包回收——行容器重构 + 回收按钮 + 确认弹窗 + 额度/影子异常态

- app/panel-ui.ts：新增 addButton / addRow / addConfirmDialog 三个纯代码工厂
- features/inventory/view/InventoryPanel.ts：renderRows 改为行容器（Label + 回收按钮），
  MAX_ROWS 截断不变；成功/3002/1001 分支全部走 toUxState
- features/inventory/model/InventoryModel.ts：（如需）暴露 rows 供按钮渲染，禁复制 known 判定
- features/economy/model/EconomyModel.ts：只增 defaultRegionBp（不改既有函数）
- tests/determinism/inventory-recycle.test.mjs：单价复算 + 落账 + 未知物品无按钮
- docs/06_validation/evidence/EVD-4008/：五要素证据
```

> **为什么拆两次**：4020 是横切修复，回退代价低、影响面广；4008 是功能。混在一次提交里，若 4008 出问题被迫回退，会连带丢掉正确性修复。

## 5. 风险与回退

| 风险 | 概率 | 影响 | 预案 |
|---|---|---|---|
| 行容器重构破坏 3102 的视觉/断言 | 中 | 回归 | 文本格式逐字保持；`npm test -- --test-name-pattern="inventory"` 必须先绿 |
| `merchants` 表未就绪时 `regionBp=0` → 单价 0 | 中 | 显示错误价格 | `regionBp===0` 时**禁用回收**并提示"商人数据未就绪"，不回落到硬编码 10000 |
| 弹窗遮罩拦截其它面板点击 | 中 | 卡死 | 遮罩只挂在当前面板 `node` 下，`onHide` 强制 destroy |
| `applySell` 与本地存档字段不匹配 | 低 | 白屏 | 复用 4007 已验证路径；若失败报 1001 而非静默 |
| rid 自动生成导致同一操作两次点击被合并 | 极低 | 少卖一次 | rid 每次 `invoke` 新生成，双击是两个不同 rid（见 §2.1.4） |

**回退**：`git revert <4020 提交>` 与 `git revert <4008 提交>` 分别可独立执行。
