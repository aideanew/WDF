---
id: PLAN-V008-06
title: 步骤 2 · 开箱权威化（F-29 / F-30 / F-31 / F-32 / F-33）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V008-05, PLAN-V008-07]
---

# 06 · 步骤 2：开箱权威化

> 执行者：**我本人**（高难度：事务边界 + 账本一致性 + 反作弊）。
> 这是本规划的主体工作量。当前实现"能跑、测试绿"，但**三处会让下游立刻炸**。

## 1. 现状与目标的差距（一句话版）

现状：`pull` 读档 → 校验有箱子 → `updateSnapshotServerSide` 改档 → 返回成功。
**全程不写账本、不做箱型校验、不判开锁、两次独立事务。**

目标：**一次事务内**完成「校验箱型 → 校验开锁 → 扣箱 → 发奖 → 双条账本 → 改档」，任一步失败全回滚。

## 2. 三个关键设计决策

### 决策 1：校验与写入必须同事务（解 F-29 + F-32 + F-33）

现状的问题链：

```
pull(playerId)                     ← findSnapshot 无事务，读快照 A
  ↓ （这中间另一请求可能扣掉了同一只箱子）
updateSnapshotServerSide(...)      ← 自己开 withTx，读快照 B，基于 B 改
  ↓
写回                               ← A 的校验结论被用在 B 上 → TOCTOU
```

而且 `updateSnapshotServerSide` 里 `if (!current) return;` —— **无档时静默返回**，`openChest` 照样 `return {success:true}`。玩家看到"开箱成功"但背包没变。

**修法**：让 updater 拿到 `tx`，把校验挪进事务内，并让函数返回"是否真的更新"。

```ts
// server/src/modules/save/service.ts
export async function updateSnapshotServerSide(
  playerId: string,
  updater: (body: any, tx: unknown) => { body: any; checksum?: number } | Promise<{ body: any; checksum?: number }>,
  serverNow: number,
): Promise<boolean> {                      // ← 返回 false = 无档，调用方必须处理
  return withTx(async (tx) => {
    const current = await findSnapshot(playerId, tx);
    if (!current) return false;            // ← 不再静默成功
    const { body, checksum } = await updater(current.body, tx);
    const schemaVersion = typeof body.schemaVersion === 'number' ? body.schemaVersion : current.schema_version;
    const configVersion = typeof body.configVersion === 'string' ? body.configVersion : current.config_version;
    await updateSnapshot(playerId, {
      revision: current.revision + 1,
      schemaVersion, configVersion,
      checksum: checksum ?? current.checksum,
      body, savedAt: serverNow,
    }, tx);
    return true;
  });
}
```

> ⚠️ **签名变更**：`updater` 从同步变可异步、加 `tx` 入参；返回类型 `void` → `boolean`。当前唯一调用方是 `chest/service.ts`，一并改。若外部 Agent 也在用，需同步——`grep -rn "updateSnapshotServerSide" server/` 确认只有 chest。

### 决策 2：账本由 `economy` 模块写，`chest` 只能调它的 service（守卫硬约束）

`recordGain` **早就写好了**：

```ts
// server/src/modules/economy/repo.ts:44
/** 写一条获得流水（delta 为正数，供 salvage.claimInfo 复用，TASK-4009）。 */
export async function recordGain(playerId, asset, count, reason, tx?: unknown): Promise<void>
```

注释直接点名"供 TASK-4009 复用"——**能力早就在，只是没人接**。这是 F-29 最有力的证据：不是缺能力，是漏接。

但守卫第 4 项（服务端依赖边界）禁止 `chest` 直接 import `../economy/repo.ts`。所以要在 `economy/service.ts` 加一层导出：

```ts
// server/src/modules/economy/service.ts
import { recordGain } from './repo.ts';

/**
 * 通用发放（跨模块入口）：chest / ads / event 等通过本函数写账本。
 * 必须传入调用方的事务句柄，否则会与调用方的事务争抢连接（PGlite 单连接死锁）。
 */
export async function grantItem(
  playerId: string, itemId: string, count: number, reason: string, tx?: unknown,
): Promise<void> {
  await recordGain(playerId, itemId, count, reason, tx);
}
```

于是链路：`chest/service.ts` → `economy/service.ts::grantItem` → `economy/repo.ts::recordGain`。**跨模块只调 service，守卫通过。**

### 决策 3：开锁做"弱校验"，并诚实标注局限

**能力已就绪**：`server/generated/config/locks.json` 已有 `iron=3 / copper=5 / silver=8 / gold=12`；`chests.json` 有 `lock` 列。服务端能读到。

**但真正的服务端权威需要"开锁会话"**（服务端逐次累加连击、断连归零），这需要新表 + 会话生命周期，超出本步范围。

本步做**弱校验**：`hitsUsed >= locks[chest.lock].hits_required`。

| 它能防 | 它不能防 |
|---|---|
| 报 1 次就开需要 12 次的箱子 | 客户端直接报 12（伪造） |
| 少报次数白拿 | 连点器（本就要靠前端限速） |
| 无审计（现在写 `audit_log`） | 精确的次数统计 |

> **必须在 EVD 里写明"这是弱校验，不是反作弊"**。任何"已防作弊"的表述都是过度宣称（F-37 的同类错误）。

## 3. TASK-5004：原子化 + 写账本 + 无档报错

### 改后骨架（`server/src/modules/chest/service.ts` 整体重写，约 90 行）

```ts
import { ERR } from '@wodefa/contracts';
import type { ChestOpenRes } from '@wodefa/contracts/src/chest/index.ts';
import type { RequestMeta } from '@wodefa/contracts/src/common/envelope.ts';
import { updateSnapshotServerSide } from '../save/service.ts';
import { grantItem } from '../economy/service.ts';
import { findChestByItemId } from './repo.ts';        // ← 新增（读服务端配置产物）

export class ChestError extends Error {
  readonly code: number;
  constructor(code: number, message: string) { super(message); this.name = 'ChestError'; this.code = code; }
}

export async function openChest(
  playerId: string, itemId: string, hitsUsed: number, _meta: RequestMeta,
): Promise<ChestOpenRes> {
  // ① 校验"这个 item 真的是箱子"（解 F-31），并拿到锁档
  const chest = findChestByItemId(itemId);
  if (!chest) throw new ChestError(ERR.BAD_PAYLOAD, `${itemId} is not a chest`);

  // ② 锁档要求的点击次数（解 F-30，弱校验）
  const required = hitsRequiredOf(chest.lock);          // none → 0
  if (hitsUsed < required) {
    throw new ChestError(ERR.BAD_PAYLOAD, `lock not satisfied: need ${required}, got ${hitsUsed}`);
  }

  const rewardItemId = 'item_0020';                     // D-27 保底（B-2 未裁决前固定）
  const rewardCount = 1;
  let granted = false;

  // ③④ 校验 + 扣箱 + 发奖 + 双条账本，全在同一事务（解 F-29 / F-32 / F-33）
  const updated = await updateSnapshotServerSide(playerId, async (body, tx) => {
    const inv = (body.modules?.inventory ?? {}) as Record<string, number>;
    const have = inv[itemId];
    if (typeof have !== 'number' || have <= 0) {
      throw new ChestError(ERR.BAD_PAYLOAD, `No chest ${itemId} in inventory`);
    }
    const nextInv = { ...inv };
    if (have > 1) nextInv[itemId] = have - 1; else delete nextInv[itemId];
    nextInv[rewardItemId] = (nextInv[rewardItemId] ?? 0) + rewardCount;

    // 账本：箱子 -1、奖励 +1（同一 tx，与存档写回同生共死）
    await grantItem(playerId, itemId, -1, 'chest.open', tx);
    await grantItem(playerId, rewardItemId, +rewardCount, 'chest.open', tx);

    granted = true;
    return { body: { ...body, modules: { ...(body.modules ?? {}), inventory: nextInv } } };
  }, Date.now());

  // ⑤ 无档不再静默成功（解 F-32）
  if (!updated) throw new ChestError(ERR.NOT_LOGGED_IN, 'no save');

  return { success: true, rewards: [{ itemId: rewardItemId, count: rewardCount }] };
}
```

**注意**：`grantItem` 传负数用于扣箱——`recordGain` 的参数名是 `count`，写负数语义上不干净。二选一：
- A：`recordGain` 内部对 `count` 取符号，调用方传正负
- B：新增 `recordLoss`（与 `recordSell` 同形）

**推荐 B**（语义清晰）：在 `economy/repo.ts` 加 `recordLoss(playerId, asset, count, reason, tx?)`，`economy/service.ts` 加 `consumeItem(...)`。这样 `grantItem` 只发不发扣，不会有人误传负数。

### 新增 `server/src/modules/chest/repo.ts`（读服务端配置产物）

```ts
/**
 * chest · 数据访问
 * 只读 `server/generated/config/{chests,locks}.json`（npm run gen 的产物），
 * 不碰数据库 —— 箱子种类与锁档是配置，不是玩家数据。
 */
import { readFileSync } from 'node:fs';

interface ChestsRow { id: string; material: string; lock: string; smashable: boolean; size: number; item_id: string }
interface LocksRow { id: string; hits_required: number; zone_bp: number }

let chestsCache: ChestsRow[] | null = null;
let locksCache: LocksRow[] | null = null;

export function findChestByItemId(itemId: string): ChestsRow | undefined {
  chestsCache ??= JSON.parse(readFileSync(CONFIG('chests'), 'utf8')) as ChestsRow[];
  return chestsCache.find((c) => c.item_id === itemId);
}

export function hitsRequiredOf(lock: string): number {
  if (lock === 'none' || !lock) return 0;
  locksCache ??= JSON.parse(readFileSync(CONFIG('locks'), 'utf8')) as LocksRow[];
  const row = locksCache.find((l) => l.id === lock);
  // 锁档不存在 → 保守取无穷大？（不行，会让箱子永远打不开）
  // 取 0 会让"配错锁"变成白送。折中：配错锁视为 none，并记日志。
  return row?.hits_required ?? 0;
}
```

> **注意** `CONFIG(name)` 路径解析参照 `config/service.ts:19` 的 `GENERATED_MANIFEST` 写法（`dirname(fileURLToPath(import.meta.url))` 相对定位）。
> **注意** `hitsRequiredOf` 的配错锁分支：取 0 = 白送，取 Infinity = 永远打不开。**必须选一个并写进 EVD**。推荐取 0 + `console.warn`，因为"配置错导致玩家道具打不开"比"白送一次保底"更严重。

## 4. TASK-5005：校验箱型（解 F-31）

已并入 5004 的步骤 ①。**单独列出只是因为它是独立可验证的断言**：

```bash
# 用非箱子物品开箱，必须被拒
curl -s -X POST localhost:5050/v1/rpc -H "Authorization: Bearer $T" \
  -d '{"a":"chest.open","p":{"itemId":"item_0001","hitsUsed":1},"m":{"rid":"t1","cv":"v0.1.0-s1","cfg":"c6a54f0fb00341c5","sv":1,"plat":"wechat"}}'
# 期望 c=1001，msg 含 "is not a chest"
```

**为什么这条重要**：现在 `itemId` 完全由客户端指定，服务端只查"背包里有没有这个 id"。**玩家可以把任意物品当箱子"开"，扣掉它同时白得 `item_0020`** —— 这不是"复制"，但是"把无用物品换成保底物"，属于经济漏洞。

## 5. TASK-5006：开锁弱校验（解 F-30）

已并入 5004 的步骤 ②。

### 当前数据下这条分支不可达（必须诚实记录）

`chests.csv` 三行 `lock` **全是 `none`** → `required` 恒为 0 → 开锁分支永不进入。

这延续了 v007 **F-17「开箱路径全链不可达」**。本步只把**逻辑**补齐，**可达性仍缺**，取决于 `02` §4.1 的 **B-1 裁决**（三箱是否配锁）。

| 若 B-1 选 | 后果 |
|---|---|
| A（不配锁） | 开箱可用，但玩家体验是"点一下就开"，锁机制实际未上线。**EVD 必须写明** |
| B（配 iron/copper/silver） | 开锁逻辑实际生效；但需要设计源确认"哪个箱子配哪档"，不得自编 |

## 6. 验收（自动化优先）

### 6.1 测试用例（`tests/integration/chest.test.mjs` 扩充到 6 条）

| # | 用例 | 断言 | 修的是 |
|---|---|---|---|
| 1 | 正常开箱 | `c=0`，箱子 −1，奖励 +1 | 基线 |
| 2 | 背包没有该箱 | `c=1001` | F-28 |
| 3 | 幂等重放 | 两次同 `rid` 结果相同，**只扣一次** | 基线 |
| 4 | **非箱子物品** | `c=1001`，msg 含 `is not a chest` | **F-31** |
| 5 | **账本一致性**：开箱后立刻 `economy.sell` 该奖励物 | `c=0`（影子账本校验通过） | **F-29** ★核心 |
| 6 | **无存档开箱** | `c=2001`（不是 `c=0`） | **F-32** |

> **用例 5 是本次最关键的一条**：它把"开箱不写账本"这个隐性缺陷变成显性红灯。没有它，F-29 可以一直绿着。

### 6.2 并发用例（用例 7，可选但强烈建议）

同一玩家、同一箱子（数量=1），并发发两个**不同 `rid`** 的 `chest.open`：
- 期望：一个成功、一个 `1001`；**不能两个都成功**
- 若两个都成功 → 说明事务隔离没生效，必须停下来查 PGlite 的默认隔离级别

### 6.3 命令

```bash
# 只跑本步动到的模块（用户 R-1）
node --import ./tools/runtime/register.mjs --test tests/integration/chest.test.mjs

# 账本用例依赖 economy.sell，需要它也在同一批
node --import ./tools/runtime/register.mjs --test \
  tests/integration/chest.test.mjs tests/integration/economy-sell.test.mjs
```

## 7. 本步出口断言

| # | 断言 | 命令 | 期望 |
|---|---|---|---|
| 1 | 6 条用例全绿 | `--test tests/integration/chest.test.mjs` | 6/6 |
| 2 | 账本用例绿（核心） | 同上，看用例 5 | pass |
| 3 | 守卫仍 9/9 | `npm run guard` | 全部通过（重点：服务端依赖边界） |
| 4 | 无静默成功 | 用例 6 | `c=2001` |
| 5 | 服务端 tsc 无新增真错 | 过滤噪声后看 `chest/*` | 0 |

## 8. 本步不做（明确划出）

| 不做 | 原因 |
|---|---|
| 开锁会话表（真权威） | 需要新表 + 迁移，超出范围；弱校验已在 EVD 标注局限 |
| 随机掉落 / 概率公示联调 | `drops` 表 0 行，无设计源（B-2 待裁决） |
| 给三箱配 `lock` | 需设计源（B-1 待裁决） |
| `chest.open` 响应的 `ledgerIds` | B-3 待裁决；本步按现状 A 方案不改形状 |
| UI | 属于 `07` |

## 9. 提交

```bash
git add server/src/modules/chest/ server/src/modules/economy/ server/src/modules/save/service.ts \
        tests/integration/chest.test.mjs
git commit -m "feat(5004,5005,5006): 开箱事务原子化 + 写账本 + 校验箱型 + 开锁弱校验"
```
