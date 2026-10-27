---
id: PLAN-V007-06
title: 步骤 1 · W0 基础链路（4020 rid 注入 + 4008 三处收尾）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V007-05, PLAN-V007-03]
---

# 06 · 步骤 1：W0 基础链路

> **一句话**：修 3 个"已经上线但静默失效"的缺陷——幂等 rid 不生效、按钮 UI 未沉淀、回收不传商人。
> **为什么排第一**：4009 要复用按钮 UI、要通过 `economy.sell` 之外的写动作；不先把这三处修好，等于在漏水的管子上接新龙头。

## 1. 前置与边界

| 项 | 内容 |
|---|---|
| 前置 | D-34（规划收敛）、D-35（抽 `addButton`）、D-36（回收商人口径）已裁决 |
| 允许修改 | `services/net/RpcClient.ts`、`app/panel-ui.ts`、`features/inventory/view/InventoryPanel.ts`、`features/economy/model/EconomyModel.ts`（只增）、`tests/determinism/**`、`docs/05_execution/tasks/TASK-4020.md`（修卡） |
| 禁止修改 | `packages/contracts/**`、`server/**`、`game-data/**`、`features/salvage/**`（W1 才动） |
| 出口 | V-0.1 ~ V-0.7 全绿 |
| 规模 | S（约 1.5 小时） |

## 2. 原子步骤

### 2.1 【TASK-4020】客户端幂等 rid 注入（**写入 `meta`，不是 `payload`**）

#### 2.1.1 问题复述（含卡的错误）

| 事实 | 证据 |
|---|---|
| 契约 13 个动作标 `idempotent: true` | `packages/contracts/src/common/actions.ts`（`grep -c` → 13） |
| 服务端幂等表已实现（24h TTL，只缓存 `c===0`） | `server/src/gateway/idempotency.ts` |
| `invoke()` 第 3 参是 `rid`，不传则 `meta.rid` 不存在 | `RpcClient.ts:55-68` |
| 全仓 **0 处**传 rid | `grep -rn "invoke<" client/assets/scripts/features` |
| 收 2002 会**自动重发原请求** | `RpcClient.ts:96-98` |

**卡的错误（`F-19`）**：`TASK-4020` 步骤 2 写"自动生成 UUID 并**注入 payload**"。rid 属 `meta`（`req.m.rid`），服务端 `economy/handlers.ts:14` 读的是 `req.m?.rid`；而 `payload.ts` 的 zod schema **不接受** `rid` 字段，注入 payload 会直接 `1001 BAD_PAYLOAD`。

#### 2.1.2 实现（`RpcClient.ts`）

在文件顶部（import 之后）加：

```ts
import { ACTIONS } from '../../generated/contracts/common/actions';

let ridSeq = 0;
/**
 * 幂等写动作的请求号：时间戳 + 进程内自增。
 * 24h TTL 内唯一即可，无需 UUID（避免引入随机源与额外依赖）。
 */
function newRid(): string {
  ridSeq = (ridSeq + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${ridSeq.toString(36)}`;
}
```

在 `invoke()` 函数体最前（解构出 `action` 之后）：

```ts
// 契约声明 idempotent 的动作必须带 rid；调用方没传则自动补。
// rid 走 meta（req.m.rid），绝不能放进 params——payload schema 会拒绝多余字段。
const effectiveRid = rid ?? (ACTIONS[action]?.idempotent ? newRid() : undefined);
```

`meta` 构造改为用 `effectiveRid`：

```ts
const meta: RequestMeta = {
  cv: CLIENT_VERSION,
  cfg: CONFIG_VERSION,
  sv: SAVE_SCHEMA_VERSION,
  plat: platOf(platform),
  ...(effectiveRid !== undefined ? { rid: effectiveRid } : {}),
};
```

**递归重试必须复用同一 rid**（否则每次重试都是新 rid，等于没做）：

```ts
-if (nt) return invoke<P, D>(action, params, rid, true);
+if (nt) return invoke<P, D>(action, params, effectiveRid, true);
```

#### 2.1.3 边界声明（写进代码注释，防后人误解）

| rid 解决 | rid 不解决 |
|---|---|
| 传输层重试（2002 刷新后重发、超时重发）导致的服务端重复执行 | 用户**双击按钮**产生的两次独立意图 |
| — | 双击必须由 UI 层 `busy` 闸门拦（4007/4008 已有 `busy`） |

#### 2.1.4 测试（`tests/determinism/rid.test.mjs`，新增）

`RpcClient` 依赖 `'cc'`（`getPlatform`），**Node 测不到运行时**。按 G-07 用**源码级断言** + 契约级断言：

| # | 断言 | 为什么这么测 |
|---|---|---|
| ① | `ACTIONS` 中 `idempotent === true` 的动作数 **= 13** | 防契约被改后 rid 覆盖面缩小 |
| ② | `RpcClient.ts` 源码含 `ACTIONS[action]?.idempotent` | 防注入逻辑被删 |
| ③ | `RpcClient.ts` 源码含 `rid: effectiveRid`（或等价写法） | 防 rid 被写进 `params`（`F-19` 回归守据） |
| ④ | `RpcClient.ts` 源码**不含** `params.rid` / `p.rid =` | 反向断言，直击 F-19 |
| ⑤ | 递归调用行含 `effectiveRid` | 防重试换 rid |

**读源码做断言的范式**（避免 `fs` 相对路径坑）：

```js
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../../client/assets/scripts/services/net/RpcClient.ts', import.meta.url), 'utf8');
assert.match(src, /ACTIONS\[action\]\?\.idempotent/);
assert.ok(!/params\.rid\s*=/.test(src), 'rid 不得写入 params（服务端只在 meta 读）');
```

### 2.2 修 `TASK-4020` 卡（关闭 `F-19`）

在卡的 Execution Steps 第 2 步改为：

```markdown
2. [ ] 若是，且调用方未提供 `rid`，则生成请求号并写入 **`meta.rid`**（`req.m.rid`），
       **不得写入 `params`**——`payload.ts` 的 zod schema 会拒绝多余字段并返回 1001。
3. [ ] 2002 静默刷新的递归重试必须**复用同一个 rid**（传 `effectiveRid` 而非原 `rid`）。
4. [ ] 新增 `tests/determinism/rid.test.mjs`：契约幂等动作计数 + 源码级断言（含"rid 不进 params"的反向断言）。
```

并在"验收标准"补：

```markdown
- [ ] `RpcClient.ts` 源码中 rid 只出现在 `meta` 构造与递归调用处。
```

### 2.3 【F-20 / D-35】抽出 `panel-ui.addButton`

#### 2.3.1 现状

`InventoryPanel.ts:100-119` 手工 20 行建按钮；4009 要再用一次。

#### 2.3.2 目标签名（只增不改既有 4 个工厂）

```ts
export interface ButtonOpts {
  parent: Node;
  name: string;
  text: string;
  pos: Vec3;
  width?: number;   // 默认 96
  height?: number;  // 默认 34
  fontSize?: number; // 默认 18
  bgColor?: Color;   // 默认 (200,80,80,255)
  onClick: () => void;
}
export interface ButtonHandle {
  readonly node: Node;
  setEnabled(v: boolean): void;   // 置灰 + 解绑/重绑监听
  destroy(): void;                // 必须 off(TOUCH_END) 后再 destroy
}
export function addButton(o: ButtonOpts): ButtonHandle;
```

**实现要点**：

| # | 要点 | 理由 |
|---|---|---|
| ① | `new Node` + `UITransform` + `Graphics.roundRect` + `Label`，**不用 prefab** | 工程当前 0 个 prefab |
| ② | `destroy()` 先 `off(Node.EventType.TOUCH_END)` 再 `node.destroy()` | 防"点已销毁节点"崩溃 |
| ③ | `setEnabled(false)` 时移除监听并改 `bgColor` 为灰 | `busy` 期间禁点 |
| ④ | 返回句柄而非 `Node` | 调用方能 `destroy`，符合 `PanelHandle` 惯例 |

#### 2.3.3 `InventoryPanel` 改用

把 20 行手工块替换为：

```ts
addButton({
  parent: body,
  name: `Recycle_${i}`,
  text: '回收',
  pos: new Vec3(260, y, 0),
  onClick: () => {
    addConfirmDialog({
      parent: node,
      title: '确认回收',
      text: `确认以渔村基准价回收 1 个 ${r.name} 吗？\n（商人页可选更高价的商人）`,
      onConfirm: () => void sellOne(r),
    });
  },
});
```

> 文案改动是 D-36 的一部分（见 §2.4），不是随手美化。

### 2.4 【F-21 / D-36】回收显式带 `merchantId`

#### 2.4.1 口径（**取推荐方案 B′**）

| 方案 | 做法 | 结论 |
|---|---|---|
| A 记 `lastMerchant` 进存档 | 需改 `game-core/save/schema.ts` + 迁移 | **风险高于收益**：`lastMerchant` 是 UI 偏好不是游戏进度，塞进存档要付版本+迁移+回归的代价，v1.0 收口期不划算 |
| **B′（推荐）** | **固定 `merchant_village` + 文案明示"渔村价，商人页可选更高价"** | 零存档变更、不欺骗玩家、把"按所选商人定价"登记为 v1.1 优化 |
| C 背包弹窗选商人 | 交互变重，与"快速回收"的定位冲突 | ✗ |

#### 2.4.2 实现

```ts
const payload: SellReq = { itemId: r.id, count: 1, merchantId: 'merchant_village' };
```

**显式传**而非依赖服务端兜底：客户端意图明确，日志可查，且将来改默认值时不会静默变价。

#### 2.4.3 必须同步登记

在 `current-plan.md` 的"已知局限"加一条：**L8 背包回收固定渔村价（`regionBp=10000`），商人页黑市回收高 30%；v1.1 支持按所选商人定价**。

### 2.5 【F-22】`count <= 0` 守卫

```ts
rows.slice(0, MAX_ROWS).forEach((r, i) => {
  // ... 画文本
  if (r.count <= 0) return;   // 数量为 0 不建回收按钮：避免发出必然 1001 的请求
  addButton({ /* ... */ });
});
```

单测（`tests/determinism/inventory-recycle.test.mjs`）：

| 用例 | 断言 |
|---|---|
| `count: 0` 的行 | 不产生按钮（用纯函数 `shouldShowRecycle(row)` 判定，便于测试） |
| `count: 1` 的行 | 产生按钮 |
| 未知 id | 不进 `rows`（由 `InventoryModel.project` 保证），不产生按钮 |

> 为可测性，把判定抽成 `EconomyModel` 或 `InventoryModel` 的纯函数 `shouldShowRecycle(row: ItemRow): boolean`，View 只调用——**这是本项目 UI 可测性的唯一杠杆**（`04` §A-6 同理）。

### 2.6 闸门复跑

```bash
npm test > /tmp/w0_test.log 2>&1; echo "TEST=$?"
grep -E "^ℹ (tests|pass|fail)" /tmp/w0_test.log
npm run verify > /tmp/w0_verify.log 2>&1; echo "VERIFY=$?"
npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 | grep -v "^C:/" > /tmp/w0_tsc.log 2>&1
wc -l /tmp/w0_tsc.log    # 必须 0
```

## 3. 验收断言

| # | 断言 | 命令 | 期望 |
|---|---|---|---|
| V-0.1 | rid 注入按 `idempotent` 判定 | `grep -n "ACTIONS\[action\]?.idempotent" client/.../RpcClient.ts` | 命中 |
| V-0.2 | 重试复用 `effectiveRid` | `grep -n "params, effectiveRid, true" client/.../RpcClient.ts` | 命中 |
| V-0.3 | rid 不进 params（反向） | `grep -c "params.rid" client/.../RpcClient.ts` | **0** |
| V-0.4 | `addButton` 已抽并被使用 | `grep -c "addButton" client/.../app/panel-ui.ts client/.../inventory/view/InventoryPanel.ts` | 各 ≥1 |
| V-0.5 | 回收带 `merchantId` + 数量守卫 | `grep -n "merchantId: 'merchant_village'\|shouldShowRecycle" client/.../InventoryPanel.ts` | 命中 |
| V-0.6 | 测试数 **≥132** 且全绿 | `npm test` | `pass ≥132 / fail 0` |
| V-0.7 | 类型检查零错 + `verify` 绿 | §2.6 | 全 0 / `EXIT=0` |

## 4. 提交边界（两次）

| # | 提交 | 内容 |
|---|---|---|
| 1 | `fix(4020): 幂等 rid 注入——按 ACTIONS[].idempotent 写入 meta.rid，重试复用同一值` | `RpcClient.ts`、`tests/determinism/rid.test.mjs`、`TASK-4020.md`（修卡） |
| 2 | `fix(4008): 抽 panel-ui.addButton + 回收显式 merchantId + 数量守卫；补 EVD` | `panel-ui.ts`、`InventoryPanel.ts`、`EconomyModel.ts`（只增 `shouldShowRecycle`）、`tests/determinism/inventory-recycle.test.mjs`、`current-plan.md`（L8） |

> **为什么拆两次**：4020 是横切正确性修复，可独立回退；4008 是功能收尾。混在一起回退会连带丢掉 rid 修复。

## 5. 风险与回退

| 风险 | 概率 | 影响 | 预案 |
|---|---|---|---|
| `ACTIONS` 从 generated 导入路径错 | 中 | 编译失败 | 路径 `../../generated/contracts/common/actions`；先 `ls` 确认 |
| 自动补 rid 让"同一操作两次点击"被服务端合并 | 极低 | 少卖一次 | rid 每次 `invoke` 新生成，双击是两个不同 rid |
| `addButton` 抽出后 4008 视觉变化 | 中 | 回归 | 参数默认值与现实现完全一致（96×34、`(200,80,80)`、18 号字） |
| `shouldShowRecycle` 放错层（放 view 则测不到） | 中 | 无法单测 | **必须放 model**（`EconomyModel` 或 `InventoryModel`） |
| 改 `current-plan` 与 W2/W4 冲突 | 低 | 合并冲突 | 本步只加 L8 一行，W2/W4 改别处；同文件不同行 |

**回退**：两次提交独立 `git revert`；无存档/契约变更，回退无副作用。
