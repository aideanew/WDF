---
id: PLAN-V007-07
title: 步骤 2 · W1 开箱全栈（4009 重构执行）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V007-06, PLAN-V007-03]
---

# 07 · 步骤 2：W1 开箱全栈

> **一句话**：把"文档 → 规则单源 → 数据映射 → 契约 → 服务端 → 客户端"六段一次打通。
> **四重前置阻塞必须先解**（§2），否则按卡执行必然半途而废。

## 1. 前置与边界

| 项 | 内容 |
|---|---|
| 前置 | W0 完成（rid 生效 + `addButton` 可复用）；D-37/D-38/D-39 已裁决 |
| 允许修改 | `docs/03_solution/ui/screen-salvage.md`（**新建**）、`packages/game-core/src/chest/index.ts`、`game-data/source/chests.csv`、`packages/contracts/src/chest/index.ts`、`packages/contracts/src/common/actions.ts`、`server/src/modules/chest/{handlers,service,repo}.ts`、`server/src/gateway/{handlers,payload}.ts`、`client/.../features/salvage/{view,model}/**`、`client/.../features/inventory/view/InventoryPanel.ts`（加"打开"按钮）、`client/.../features/economy/model/EconomyModel.ts`（只增）、`tests/**`、`docs/03_solution/decisions/ADR-0013-chest-open.md`（新建）、`docs/03_solution/data/error-catalog.md` |
| 禁止修改 | `server/db/migrations/**`（复用 `ledger_entry`，不建新表）、`game-data/source/locks.csv`（D-08 裁决值不动）、任何美术资源 |
| 出口 | V-1.1 ~ V-1.10 全绿 |
| 规模 | **L**（约 1 天） |

## 2. 四重阻塞（先看清，再动手）

### 2.1 阻塞一：`salvage.claimInfo` 不是开箱动作（`F-14`，已设计层关闭）

`ClaimInfoReq { tier: 'normal'|'advanced'|'exclusive' }`、`desc: '领取沉船信息份数'` —— **沉船信息来源**，与开箱无关。
**处置**：走 `chest.open`；`salvage.claimInfo` 保持 `todo`，交 v1.1 沉船玩法。

### 2.2 阻塞二：`chest.open` 类型已写、动作未注册（`F-15`）

`contracts/chest/index.ts` 有 `ChestOpenReq/Res/LockTier`，但 `ACTIONS` 无 `chest.open`。
**处置**：本步注册（§3.4）。既有 `ChestOpenReq`（带 `pointer`）是**逐次尝试**的形状，语义不同，**不复用**，新类型另起。

### 2.3 阻塞三：开锁次数双源冲突（`F-16` / D-37）

| 来源 | iron | copper | silver | gold |
|---|---|---|---|---|
| `game-core/chest` `LOCK_HITS` | 1 | 2 | 3 | 4 |
| `locks.csv`（D-08 裁决） | 3 | 5 | 8 | 12 |

**处置**：`locks.csv` 为唯一权威；`attempt` 增 `required` 入参，`LOCK_HITS` 降级为 `LOCK_HITS_FALLBACK`（值改 3/5/8/12）。

### 2.4 阻塞四：路径全链不可达（`F-17` / D-39）

| 环节 | 实测 | 状态 |
|---|---|---|
| 打捞掉落 | `HookModel.ts:20` 硬编码 `item_0001 漂流木` | 不断 |
| `drops.csv` | 0 行 | 不断 |
| `chests.lock` | 三箱全 `none` | 不断 |
| `chests.id` vs `items.id` | 两套体系 | **本步修**（§3.3） |

**处置**：本步只修第 4 环（能修的那一个）；前 3 环需设计源，转 v1.1 `TASK-4022`；**真机断言记 UNKNOWN**。

## 3. 原子步骤

### 3.1 补 `screen-salvage.md`（先文档，D-38）

#### 3.1.1 为什么必须先写

开箱会引入两个**面板内部态**：`lock-playing`（连点中）、`lock-failed`（工具耗尽）。它们**不是错误码态**，不能塞进 `UX_BY_ERROR_NAME`。没有文档约束，实现者必然手写 `if` 分支。

#### 3.1.2 必含结构（按 `screen-inventory.md` 体例）

| 段 | 内容 |
|---|---|
| 布局 | 750×1400 坐标系；连点区 400×400 居中；按钮位；背包行内"打开"按钮位（x=260，与"回收"同格，互斥显示） |
| 状态 | `idle` / `confirming` / `lock-playing` / `lock-failed` / `settling` / `settled` / `error`（**7 态**） |
| 迁移 | 每条边标注触发条件 + 出口 |
| 与六态关系 | **`lock-playing`/`lock-failed` 是面板内部态，不进 `toUxState`**；服务端错误仍走 `toUxState` |
| 文案 | 中文集中列出（便于 i18n）：开箱中/连点提示/工具耗尽/获得了 X/额度或校验失败 |
| 边界 | 无锁箱（`lock='none'`）直接开，不进 `lock-playing` |

### 3.2 规则单源（D-37）

#### 3.2.1 改 `packages/game-core/src/chest/index.ts`

```ts
-export const LOCK_HITS: Readonly<Record<LockTier, number>> = { iron: 1, copper: 2, silver: 3, gold: 4 };
+/**
+ * 开锁所需连续命中次数的**回落值**——真实值一律由调用方从 `locks.hits_required` 传入。
+ * 2026-10-27（D-37）统一：v5.5 8.4 的 1/2/3/4 与 D-08 裁决的 3/5/8/12 冲突，
+ * 以配置表为唯一权威；本常量仅用于配置缺失时安全回落，值已对齐 locks.csv。
+ * @deprecated 传参优先，保留仅为兼容。
+ */
+export const LOCK_HITS_FALLBACK: Readonly<Record<LockTier, number>> = { iron: 3, copper: 5, silver: 8, gold: 12 };

+export interface LockSession { tier: LockTier; required: number; consecutiveHits: number; totalHits: number; toolsLeft: number; unlocked: boolean }
+export function createSession(tier: LockTier, tools: number, required: number): LockSession
+export function attempt(session: LockSession, hit: boolean): { session: LockSession; hit: boolean; terminated: boolean }
```

**关键**：
- `attempt` 从 `session.required` 取次数，**不再读常量**；
- `required <= 0`（`none` 锁）→ 首次 `attempt` 即 `unlocked: true` 且不消耗工具；
- `toolsLeft <= 0` 时 `terminated: true`，session 不变（不得为负）。

#### 3.2.2 单测（`tests/determinism/chest.test.mjs` 扩展）

| 用例 | 断言 |
|---|---|
| `iron` / `required=3` 连中 3 | `unlocked=true`，`toolsLeft` 减 3 |
| `iron` / `required=3` 中 2 → 失误 → 中 3 | 中途 `consecutiveHits` 归零，最终才算开 |
| `required=0` | 首次即 `unlocked`，`toolsLeft` 不变 |
| `toolsLeft=0` 再 attempt | `terminated=true`，session 不变 |
| **CSV ↔ 常量全等** | 读 `locks.csv` 逐行断言 `LOCK_HITS_FALLBACK[id] === hits_required`（**5 行**） |

> 最后一条是"防双源回潮"的守据：谁改回 1/2/3/4，测试立刻红。

### 3.3 数据映射（D-19）

```csv
id,material,lock,smashable,size,item_id
chest_wood,wood,none,true,1,item_0065
chest_copper,copper,none,true,1,item_0066
chest_iron,iron,none,true,1,item_0067
```

依据：`items.csv:66-68` 的 `name`（木箱/铜箱/铁箱）+ `category=chest`，与 `chests.material` 一一对应。

```bash
npm run gen:config && npm run sync && npm run guard
```

### 3.4 契约（D-31）

#### 3.4.1 `ACTIONS` 注册

```ts
'chest.open': { module: 'chest', auth: true, idempotent: true,
                desc: '开箱结算：服务端校验持有量与锁档后按保底口径发奖（ADR-0013）' },
```

#### 3.4.2 类型（`contracts/chest/index.ts`）

```ts
/** 开箱请求。tier 由服务端从 chests/locks 推导，客户端不上报（防伪造档位）。 */
export interface ChestOpenBoxReq { itemId: string; hitsUsed: number }
/** 开箱结果。granted 为服务端权威发奖内容；客户端只落地不自行计算。 */
export interface ChestOpenBoxRes { opened: true; granted: { itemId: string; count: number }[]; ledgerIds: string[] }
```

**为什么不上报 `tier`**：若客户端传 `tier='iron'`（需 3 次），服务端按 3 次校验；玩家实际开的是金锁（需 12 次）也能过。**档位必须服务端从 `chests.lock` 推导**。

#### 3.4.3 `payload.ts` schema

```ts
'chest.open': z.object({
  itemId: Id,
  hitsUsed: z.number().int().min(0).max(999),
}),
```

#### 3.4.4 新建 `ADR-0013-chest-open.md`

必含：缺口 4 的登记（`chest.open` 从未注册）、两个方案对比（复用 claimInfo vs 新增）、**风险披露**（`hitsUsed` 可伪造，收益上限受"持有箱子数"约束，v1.1 用 `chest.begin` 下发 seed + 服务端 `pointer` 复算治理）、以及"`salvage.claimInfo` 语义保留给 v1.1 沉船"。

### 3.5 服务端三件套（`server/src/modules/chest/`）

#### 3.5.1 分层

| 文件 | 职责 |
|---|---|
| `repo.ts` | `findChestRows()`（读 `chests` 配置）、`shadowCount(tx, playerId, itemId)`（影子账本净额）、`insertLedger(tx, row)` |
| `service.ts` | `openBox(playerId, req, t, rid)`：校验 → 扣箱 → 发奖 → 写账（**单事务**） |
| `handlers.ts` | 解参 → 调 service → 转 `RpcResponse` |

**必须复用**：`economy/repo.ts` 已有"写一条获得流水"的函数（注释标明"供 `salvage.claimInfo` 复用"），优先复用，不重写 SQL。
**必须遵守**：`withTx` 回调内只用入参 `tx`（PGlite 单连接，用全局 `q()` 会永久死锁）。

#### 3.5.2 校验顺序（任一不过即返回）

```text
1. itemId 必须是已知箱子（chests 表按 item_id 反查命中），否则 1001
2. 影子净额 shadowCount(playerId, itemId) >= 1，否则 1001（防无中生有）
3. 该箱的 lock → locks.hits_required = required
   required > 0 且 hitsUsed < required → 1001（防 hitsUsed=0 的低级伪造）
4. 通过 → 事务内：扣 1 个箱（写 ledger 负数行）+ 发保底物（写 ledger 正数行）
```

#### 3.5.3 保底口径（D-27，**必须写进注释**）

```ts
// 保底发放：在 base_price >= 1 且 recycle_bp 非空 的候选中取 base_price 最小者。
// 实测当前为 item_0020（base_price=4）。
// 为什么排除 item_0013：它是全表最低价（base_price=0），玩家开完箱得到 0 价值物品，
// 体验等价于失败。口径与值分离，prices 表变动后重新计算结果即可，判据不变。
```

#### 3.5.4 幂等

`chest.open` 标 `idempotent: true`，W0 的 4020 已让客户端自动带 `meta.rid`；服务端走既有幂等表（只缓存 `c===0`）。

### 3.6 客户端（最小可见）

#### 3.6.1 接缝

- **不是新面板**：箱子在背包里，入口就在 `InventoryPanel` 行内（与"回收"同格，**互斥显示**）；
- `features/salvage/view/SalvageView.ts`（现 11 行空壳）承载连点 UI，由 `InventoryPanel` 调用。

#### 3.6.2 互斥规则

| 物品 | 显示 |
|---|---|
| `category==='chest'` 且 `chests` 表能按 `item_id` 命中 | **"打开"**（不显示"回收"） |
| 其他已知物品 | **"回收"** |
| 未知 id（不进 `rows`） | 都不显示 |
| `count <= 0` | 都不显示 |

#### 3.6.3 流程

```text
点"打开" → 查 chests 行
  ├─ lock === 'none' → 直接 invoke('chest.open', {itemId, hitsUsed: 0})
  └─ lock !== 'none' → 进 lock-playing
        required = locks.hits_required[lock]
        session = createSession(tier, tools, required)
        每次点击 → attempt(session, true)；间隔 > 800ms 视为失误 → attempt(session, false)
        unlocked → invoke('chest.open', {itemId, hitsUsed: session.totalHits})
        toolsLeft 耗尽 → lock-failed（**不发请求**）
成功 → 用服务端返回的 granted 落地（LocalSave）+ refresh
失败 → toUxState(code) 统一展示
```

#### 3.6.4 硬约束

| # | 约束 |
|---|---|
| ① | 连点判定**只用** `game-core/chest.attempt`，view 不自己数 |
| ② | `required` **必须**从 `table('locks')` 读，禁 `LOCK_HITS` 常量 |
| ③ | 开锁失败**不发请求** |
| ④ | 奖励内容**只信服务端** `granted`，客户端不自算 |
| ⑤ | 连点期间 `busy=true`，禁重复触发 |
| ⑥ | 计数用数字累加，回调内不 `new` 对象 |

### 3.7 测试

`tests/integration/chest-open.test.mjs`：

| 用例 | 断言 |
|---|---|
| 持箱 → 开箱 | `c=0`，`granted` 非空，`ledger_entry` 新增 2 行（扣箱 + 发奖） |
| 无该箱 | `c=1001`，无 ledger |
| `hitsUsed < required` | `c=1001`，无 ledger |
| 同 rid 重放 | 返回首次结果，ledger 不增 |
| 发奖内容 | = `item_0020`，**不含 `item_0013`** |
| 重复开同一箱 | 第二次 `c=1001`（影子净额已为 0） |

## 4. 验收断言

| # | 断言 | 命令 | 期望 |
|---|---|---|---|
| V-1.1 | `screen-salvage.md` 含 `lock-playing`/`lock-failed` | `grep -c "lock-playing\|lock-failed" docs/03_solution/ui/screen-salvage.md` | ≥2 |
| V-1.2 | 开锁单源（含 CSV 全等断言） | `npm test -- --test-name-pattern="chest"` | 全绿 |
| V-1.3 | `chests.csv` 三行有 `item_id` | `grep -c "item_006" game-data/source/chests.csv` | 3 |
| V-1.4 | `chest.open` 三处登记 | `grep -ln "chest.open" packages/contracts/src/common/actions.ts server/src/gateway/handlers.ts server/src/gateway/payload.ts` | 3 文件 |
| V-1.5 | 三件套非空壳 | `wc -l server/src/modules/chest/*.ts` | 各 ≥30 |
| V-1.6 | 集成测 6 例 | `npm test -- --test-name-pattern="chest.open"` | 全绿 |
| V-1.7 | `salvage.claimInfo` 仍 `todo` | `grep -n "salvage.claimInfo" server/src/gateway/handlers.ts` | 含 `todo` |
| V-1.8 | `probe` 未劣化 | `npm run probe` | 全绿 |
| V-1.9 | `verify` 绿 | `npm run verify` | `EXIT=0` |
| V-1.10 | 真机 = UNKNOWN 且写明缺什么 | `ls docs/06_validation/evidence/EVD-4009/` | 含 `README.md`，判定含"缺真机"+`F-17` |

## 5. 提交边界（4 次）

| # | 提交 | 内容 | 可独立回退 |
|---|---|---|---|
| 1 | `docs(4009): 补 screen-salvage.md（7 态，含 lock-playing/lock-failed 内部态）` | 文档 | ✅ |
| 2 | `feat(4009): 开锁次数单源——locks.csv 权威，attempt 增 required，LOCK_HITS 降级` | `game-core/chest` + 单测 | ✅（不改契约） |
| 3 | `feat(4009): chests.csv 补 item_id + chest.open 契约（ADR-0013）+ 服务端三件套` | 数据 + 契约 + server + 集成测 | ✅ |
| 4 | `feat(4009): 背包"打开"入口与连点 UI（真机 UNKNOWN）` | 客户端 + EVD | ✅ |

> 提交 3 是**契约变更**，message 必须含 `ADR-0013`。提交 2 零契约风险，**可在授权未下时先做**。

## 6. 风险与回退

| 风险 | 概率 | 影响 | 预案 |
|---|---|---|---|
| 契约解冻未获授权 | 中 | 阻塞提交 3 | 先做 1/2（零契约风险），3 等授权 |
| `attempt` 签名变更波及既有测试 | 高 | 测试红 | 该测试**必须**同步改（签名变了），属预期 |
| `hitsUsed` 可伪造 | **已知** | 可刷保底物 | 收益上限受"持有箱子数"约束（箱子不可制造）；ADR-0013 显式登记；v1.1 `TASK-4030` 治本 |
| 影子净额查询与 `economy.sell` 口径不一致 | 中 | 校验误判 | **复用 `economy/repo.ts` 的净额函数**，不新写 |
| PGlite 事务死锁 | 中 | 请求挂死 | 只用 `tx` 入参，照抄 `account/repo.ts` 范式 |
| 箱子同时"可回收"与"可打开" | 中 | 价格混乱 | §3.6.2 互斥规则 + 单测 |

**回退**：4 次提交独立 revert；回退契约后必须 `npm run gen && npm run sync`，否则守卫红。
