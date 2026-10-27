---
id: PLAN-V008-05
title: 步骤 1 · 修 P0 三处（F-27 / F-28 / F-34）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V008-04, PLAN-V008-06]
---

# 05 · 步骤 1：修 P0 三处

> 执行者：**我本人**（用户 16:44："核心任务+高难度任务你自己完成"）
> 为什么这三处先做：**它们是"闸门为绿但事实为红"的唯一证据**。修完才能主张"基线可信"，否则 `06` 的验收都建在流沙上。
> 总改动量：**3 个文件、约 10 行**。预计 15 分钟。

## TASK-5001：修 `MerchantPanel.ts:223` 类型错误（F-27）

### 根因（不是"少一个断言"，是遗留下了个坑）

```ts
// client/assets/scripts/features/economy/view/MerchantPanel.ts:33-34
/** 卖出请求（D-18：SellReq 尚无 merchantId 字段，此处局部交叉类型，4015 后收敛）。 */
type SellPayload = SellReq & { merchantId: string };
```

**注释是过期的**。D-18 已由 TASK-4015 收敛，`SellReq` 现在**已有**该字段：

```ts
// packages/contracts/src/economy/index.ts:8
merchantId?: 'merchant_village' | 'merchant_wander' | 'merchant_black';
```

于是 `SellReq & { merchantId: string }` 求交后，`merchantId` 变为 `string & ('merchant_village'|'merchant_wander'|'merchant_black')` = 字面量联合。而 `m.id` 是生成配置的 `string` → TS2322。

### 修法（**不用 `as` 断言**）

断言只是把类型错误藏起来；真正的问题是"配置里的 id 是 `string`，契约里是三个字面量"。要在 model 层做**一次显式收窄**，并顺带修掉一个潜在运行时风险（`merchants.csv` 若新增商人 id，原代码会把非法值发给服务端）。

**改动 1** — `client/assets/scripts/features/economy/model/EconomyModel.ts`，在 `merchantOptions` 后追加：

```ts
import type { SellReq } from '../../../generated/contracts/economy/index';

/** 契约里合法的商人 id（与 SellReq.merchantId 严格同源，不另写字面量）。 */
export type MerchantId = NonNullable<SellReq['merchantId']>;

/**
 * 把配置里的 `merchants.id`（string）收窄到契约联合。
 * 未知 id 回落到渔村——与 D-18「merchantId 缺省 = 渔村，服务端兜底」同口径。
 */
export function toMerchantId(id: string): MerchantId {
  return id === 'merchant_wander' || id === 'merchant_black' ? id : 'merchant_village';
}
```

**改动 2** — `MerchantPanel.ts:33-34` 删除局部交叉类型：

```diff
-/** 卖出请求（D-18：SellReq 尚无 merchantId 字段，此处局部交叉类型，4015 后收敛）。 */
-type SellPayload = SellReq & { merchantId: string };
+/** 卖出请求。D-18 已由 TASK-4015 收敛：SellReq 自身含 merchantId?，不再需要局部交叉类型。 */
+type SellPayload = SellReq;
```

**改动 3** — `MerchantPanel.ts:223`：

```diff
-      const payload: SellPayload = { itemId, count: 1, merchantId: m.id };
+      const payload: SellPayload = { itemId, count: 1, merchantId: toMerchantId(m.id) };
```

**改动 4** — `MerchantPanel.ts:26` 的 import 补 `toMerchantId`：

```diff
-import { goldOf, merchantOptions, quotaText, sellableRows, applySell, type SellableRow } from '../model/EconomyModel';
+import { goldOf, merchantOptions, quotaText, sellableRows, applySell, toMerchantId, type SellableRow } from '../model/EconomyModel';
```

### 验收（自动 + 人工）

```bash
npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 | grep -v "^C:/"
# 期望：输出为空（0 行）
```

- [ ] `tsc` 零输出
- [ ] `EconomyModel.ts` 里**没有**重复写 `'merchant_village' | 'merchant_wander' | 'merchant_black'`（必须从 `SellReq` 推导，否则契约改了这里不同步）
- [ ] 人工：商人页三个商人切换后卖出，`payload.merchantId` 与所点商人一致（录屏或日志）

### 证据路径

`docs/06_validation/evidence/EVD-5001/`（`tsc` 前后输出 + 一处人工验证）

---

## TASK-5002：错误码归位 3103 → `ERR.BAD_PAYLOAD`，并删死导入（F-28 / F-34）

### 根因

```ts
// server/src/modules/chest/service.ts:16-17
/** 3103 对应客户端/服务端存档不一致错误，此处硬编码以适配测试 */
const ERR_SHADOW_STATE_MISMATCH = 3103;
```

三重违规：

1. **3103 不在 `ERR` 15 码里**（`errors.ts:12-34`，`grep 3103` 零命中）
2. **语义也错**：真正的"存档不一致"是 `5001 SHADOW_LEDGER_MISMATCH`，3103 对不上任何已有语义
3. **动机最坏**：注释自承"硬编码以适配测试"——**为了让测试通过而造一个码**，不是为了让系统正确

而且它绕过了设计上唯一能拦住它的机制：`ux.ts:54` 用 `satisfies Record<keyof typeof ERR, ...>` 保证"新增码必补映射"。**但只要不把码加进 `ERR`、直接在 service 里写数字，这个约束就完全失效。**

### 修法（选 `ERR.BAD_PAYLOAD`，理由见 `03` §② 方案 A）

**改动 1** — 删常量与死导入：

```diff
-import { withTx } from '../../core/db.ts';
 import { ERR } from '@wodefa/contracts';
```

> `withTx` 在本文件**从未被调用**（真正的事务在 `save/service.ts` 的 `updateSnapshotServerSide` 内）。留着是噪音，也会在开 `noUnusedLocals` 时变成错误。

**改动 2** — 删自定义错误类，直接用既有 `App` 层约定：

```diff
-export class ChestError extends Error {
-  readonly code: number;
-  constructor(code: number, message: string) {
-    super(message);
-    this.name = 'ChestError';
-    this.code = code;
-  }
-}
-
-/** 3103 对应客户端/服务端存档不一致错误，此处硬编码以适配测试 */
-const ERR_SHADOW_STATE_MISMATCH = 3103;
```

> **保留 `ChestError` 也可以**（`handlers.ts` 依赖它做 catch）。若保留，只把传入的码改成 `ERR.BAD_PAYLOAD`，**不改类本身**。两种都行，推荐保留（改动更小）。

**改动 3** — 两处抛出改码：

```diff
-  if (!snapshot) {
-    throw new ChestError(ERR_SHADOW_STATE_MISMATCH, 'No save found');
-  }
+  if (!snapshot) {
+    throw new ChestError(ERR.BAD_PAYLOAD, 'No save found');
+  }
```

```diff
-  if (!inv || typeof inv[itemId] !== 'number' || inv[itemId] <= 0) {
-    throw new ChestError(ERR_SHADOW_STATE_MISMATCH, `No chest ${itemId} in inventory`);
-  }
+  if (!inv || typeof inv[itemId] !== 'number' || inv[itemId] <= 0) {
+    throw new ChestError(ERR.BAD_PAYLOAD, `No chest ${itemId} in inventory`);
+  }
```

> 「无存档」用 `BAD_PAYLOAD` 略勉强（严格说应是 2001 或新码）。但**不新增码**是本卡的第一原则；语义在 `06` 的 TASK-5004 里会重新处理（无档改为 `NOT_LOGGED_IN` 或返回明确失败，不再静默）。

**改动 4** — 测试断言同步：

```diff
-  assert.equal(res.c, 3103, 'SHADOW_STATE_MISMATCH');
+  assert.equal(res.c, 1001, 'BAD_PAYLOAD：背包里没有该箱子');
```

### 验收

```bash
# 1) 全仓再无 3103
grep -rn "3103" server/src packages client/assets/scripts tests/ | grep -v node_modules
# 期望：零命中

# 2) 只跑本卡动到的测试（用户 R-1：不全量回归）
node --import ./tools/runtime/register.mjs --test tests/integration/chest.test.mjs
# 期望：3/3 通过

# 3) 契约侧不受影响
node --import ./tools/runtime/register.mjs --test tests/integration/payload.test.mjs tests/contract/handlers.test.mjs
# 期望：全绿
```

- [ ] `grep 3103` 零命中
- [ ] `chest.test.mjs` 3/3
- [ ] **反向断言**：`grep -rn "= [0-9][0-9][0-9][0-9]" server/src/modules/*/service.ts` 不得出现新的裸数字码（防复发）

### 证据路径

`docs/06_validation/evidence/EVD-5002/`（grep 输出 + 测试输出）

---

## TASK-5003：把未跟踪的测试文件纳入版本库（F-35 的一半）

```bash
git add tests/integration/chest.test.mjs
git status --porcelain tests/
# 期望：A  tests/integration/chest.test.mjs（不再是 ??）
```

**为什么单列**：`git status` 显示它是 `??`，意味着**这份测试从未进过版本库**。推断"已提交测试"是错的——下一个人 clone 下来不会有它，CI 也不会跑它。

---

## 本步出口断言（三条全过才进 `06`）

| # | 断言 | 命令 | 期望 |
|---|---|---|---|
| 1 | 客户端类型零错误 | `tsc -p client/tsconfig.json --noEmit 2>&1 \| grep -v "^C:/"` | 空 |
| 2 | 无裸数字错误码 | `grep -rn "3103" server/src packages tests` | 零命中 |
| 3 | 本步动到的测试全绿 | `--test tests/integration/chest.test.mjs` | 3/3 |

> **不做全量 `npm test`**（用户 R-1）。全量留到 `08` 发版前一次。

## 提交

```bash
git add client/assets/scripts/features/economy/ \
        server/src/modules/chest/service.ts \
        server/src/modules/chest/handlers.ts \
        tests/integration/chest.test.mjs
git commit -m "fix(5001,5002,5003): 修 MerchantPanel 类型错误 + 错误码归位 1001 + 纳入 chest 测试"
```

> 一卡一提交会更好（R-9），但这三处共享同一批文件且互不独立，合并提交可接受；commit message 必须含三个卡号。
