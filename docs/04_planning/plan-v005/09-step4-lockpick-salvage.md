---
id: PLAN-V005-09
title: 步骤 4 · W3 开箱/开锁机制 + chest.open 契约 + 可达性裁决
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V005-08, PLAN-V005-03]
---

# 09 · 步骤 4：W3 开箱/开锁机制（TASK-4009 重构版）

> **一句话**：`TASK-4009` 按原样**不可执行**——四重阻塞（结算动作语义错配、规则数值双源冲突、箱子 id 对不上、整条路径在现有数值下不可达）。本步给出可执行的拆解。
> **本步是本规划里"辩证"最关键的一处**：花力气做一个**玩家永远碰不到**的功能，还是把它拆成"机制（做）+ 可达性（延后）"。结论见 §1.3。

## 1. 四重阻塞的坐实

### 1.1 阻塞一：`salvage.claimInfo` 不是开箱动作（语义错配）

| 项 | 实测 |
|---|---|
| 动作描述 | `'salvage.claimInfo': { desc: '领取沉船信息份数' }`（`actions.ts:19`） |
| 请求 | `ClaimInfoReq { tier: 'normal'\|'advanced'\|'exclusive' }` |
| 响应 | `ClaimInfoRes { granted, infoId?, seed?, remainingToday }` |
| 用途 | **沉船信息**（探索/潜水玩法的每日份数配额），与"开箱发奖"无关 |

证据 `E-09-1`：`cat packages/contracts/src/salvage/index.ts`。

**结论 `F-14`**：`TASK-4009` 卡要求"开锁成功后调用 `salvage.claimInfo` 进行发奖结算"——把"领沉船信息"当成了"开箱发奖"。按卡执行只能把箱子塞进 `tier: 'normal'` 里，语义彻底错位，且 `remainingToday` 会把箱子与沉船信息共用一份日配额。

### 1.2 阻塞二：`chest.open` 动作不存在，但有孤儿类型

| 事实 | 证据 |
|---|---|
| `packages/contracts/src/chest/index.ts` 已定义 `ChestOpenReq / ChestOpenRes / LockTier` | 完整，含 `tier/pointer/toolId`、`hit/consecutiveHits/toolsLeft/unlocked` |
| `ACTIONS` 里**没有** `chest.open`（21 个动作逐条核对） | `actions.ts` |
| 全仓 `grep "chest.open"` → **0 命中**，该缺口**从未被登记** | `E-09-2` |

**结论 `F-15`**：存在"类型已写、动作未注册"的孤儿契约。ADR-0011 登记的 3 个缺口里**没有它**，属第 4 个缺口。

### 1.3 阻塞三：开锁次数双源冲突（`LOCK_HITS` vs `locks.csv`）

| 来源 | iron | copper | silver | gold | 性质 |
|---|---|---|---|---|---|
| `packages/game-core/src/chest/index.ts` `LOCK_HITS` | **1** | **2** | **3** | **4** | 硬编码常量，注释称"v5.5 8.4 已定" |
| `game-data/source/locks.csv` `hits_required` | **3** | **5** | **8** | **12** | D-08 用户裁决值，配置驱动 |

证据 `E-09-3`：两文件并排对照。

**结论 `F-16`（重大）**：同一规则有**两份互相矛盾的真值**。若客户端用 `LOCK_HITS` 判定、服务端用 `locks.csv` 校验，则：
- 客户端认为点 1 次就开（iron），服务端要求 3 次 → **服务端判不过，玩家永远开不了铁锁**；
- 或反之，服务端判过、客户端提前结束 → 表现与结算不一致。

这是**必须裁决**的双源冲突，且冲突双方"都自称有依据"。

### 1.4 阻塞四：整条路径在现有数值下**不可达**

| 环节 | 实测 | 后果 |
|---|---|---|
| 打捞掉落 | `HookModel.ts:20` 硬编码 `item_0001 漂流木`，注释明写"演示期固定掉落物，数值表就位后接 drops 配置" | **玩家只会捞到漂流木** |
| `drops.csv` | **空表（0 行）** | 无掉落规则可接 |
| `chests.csv` | 三箱 `lock` 全 `none` | 即使捞到箱子也无锁可开 |
| `chests.id` vs `items.id` | `chest_wood` / `item_0065` 两套 | 无法用背包 `itemId` 索引箱子配置 |

证据 `E-09-4`：`HookModel.ts:20` + `01` §3.1/§3.2。

**结论 `F-17`（决定性）**：v1.0 现有数值下，**"打捞到带锁箱子并开锁"这条路径无任何一环可达**。`TASK-4009` 的验收句「遇到上锁箱弹出连点开锁界面」在真机上**永远无法成立**——不是实现问题，是数据链路未通。

## 2. 辩证：做还是不做

### 2.1 正题（做全套）

- 机制是**底层资产**：v1.1 一填 `drops.csv` 就能立刻用，不用回头重做。
- `chest.open` 契约缺口**迟早要补**（ADR-0011 已漏登记），晚补成本更高（届时已上线，改契约需灰度）。
- 服务端 `salvage` 模块是空壳（`E-10`），补它是模块完整性的必要一步。
- 单测 + 集成测可覆盖 100% 分支，**质量可证明**，不依赖真机。

### 2.2 反题（不做）

- v1.0 的出口条件是"可演示闭环"。一个**玩家碰不到**的功能，对出口条件**贡献为零**。
- UI 层（`SalvageView` 11 行空壳）要新建一整块面板，而无真机验收 → 又是 UNKNOWN，**返工风险全部留给未来**。
- 在收口期引入 `chest.open` 契约解冻 + 服务端新模块 + 双源数值统一，**风险集中爆发**，可能拖垮 W4/W5 的排期。
- 更尖锐的反问：**如果这个功能 v1.0 看不到，那它现在写，和 v1.1 写，有什么区别？** 区别只在"v1.1 时你更了解需求"。

### 2.3 合题（推荐方案）

**拆成两半，机制做、可达性不做、UI 最小化。**

| 拆项 | 内容 | v1.0 交付 | 理由 |
|---|---|---|---|
| **4009a · 规则与服务端（做）** | ①统一 `LOCK_HITS` 与 `locks.csv`（D-31）②新增 `chest.open` 动作（D-30）③`salvage` 模块三件套改为 `chest` 模块三件套 ④`chests.csv` 加 `item_id`（D-19）⑤单测 + 集成测 | ✅ 完成 | 纯逻辑 + 契约，Node 全可测，**质量可证明**；契约缺口必须补 |
| **4009b · UI 表现（最小化）** | 在既有 `SalvageView` 内加"开箱"按钮：点击 → 若箱子有锁走连点小游戏（复用 `addButton`），无锁直接结算 | ✅ 完成（类型检查 + 走查清单），真机 **UNKNOWN** | 复用 W2 的组件工厂，成本可控；不做独立面板 |
| **4009c · 可达性（不做）** | 让玩家真能捞到箱子（`drops.csv` 填数）、让箱子带锁（`chests.lock` 填值） | ❌ **转 v1.1（TASK-4022）** | 无设计源数值，**必须用户提供**；不做则 v1.0 已知局限 |

**这套合题的判据**：
- 4009a 是"契约与规则层的债"，**必须现在还**（否则 v1.1 要重开契约窗口）；
- 4009b 是"表现层的最小可见性"，成本低就做；
- 4009c 是"数值债"，**没有设计源就不能动**（R-2），强行做等于自编。

### 2.4 若要 v1.0 真机可见（备选，需用户授权数值）

若用户希望 4009 **在 v1.0 就能真机演示**，最小改动是三处数值（均需授权，因无设计源）：

| # | 改动 | 最小值 |
|---|---|---|
| ① | `drops.csv` 填 3 行，让打捞有概率出箱子 | 至少 `item_0066`（铜箱）掉落权重 > 0 |
| ② | `chests.csv` 的 `chest_copper` 的 `lock` 由 `none` 改 `copper` | 1 格 |
| ③ | 无（`locks.csv` 的 `copper=5` 已就绪） | — |

代价：① 会改变既有打捞手感（全部玩家都会开始出箱子），属于**玩法变更**，不是纯技术改动。
**结论**：推荐走 §2.3 的合题；本备选仅登记，不作为默认路径。

## 3. 原子步骤

### 3.1 前置文档：补 `screen-salvage.md`（D-29）

#### 3.1.1 为什么必须先补文档

`TASK-4009` 的输入文档 `docs/03_solution/ui/screen-salvage.md` **不存在**（`01` `F-10`）。开箱会引入**两个新 UX 态**（`lock-playing`、`lock-failed`），它们不在 `toUxState` 的六态里——没有文档约束，实现者必然手写 `if` 分支（违反 G-11）。

#### 3.1.2 最小内容要求

按 `screen-inventory.md` 体例，必须覆盖：

| 段落 | 必含 |
|---|---|
| 布局 | 750×1400 坐标系、按钮位置、连点区尺寸 |
| 状态 | `idle` / `confirming` / `lock-playing` / `lock-failed` / `settling` / `settled` / `error` |
| 状态迁移 | 每条边标注触发条件与出口 |
| 与六态的关系 | `lock-playing` 与 `lock-failed` 属**面板内部态**，不污染 `toUxState` 的六态；服务端错误仍走 `toUxState` |
| 文案 | 全部中文文案集中列出（便于后续 i18n） |

**关键裁定**：`lock-playing/lock-failed` **不得**新增到 `UX_BY_ERROR_NAME`（那是错误码映射，不是 UI 状态机）。面板内部态由 `SalvageView` 自己管理。这条必须写进文档，否则后续会有人往 `ux.ts` 里塞非错误码。

### 3.2 统一开锁次数：`locks.csv` 为唯一权威（D-31）

#### 3.2.1 改 `game-core/chest`

```ts
-/** 已定（v5.5 8.4）：连续命中 n 次才开锁，失误归零，每次蓄力消耗一根工具。 */
-export const LOCK_HITS: Readonly<Record<LockTier, number>> = { iron: 1, copper: 2, silver: 3, gold: 4 };
+/**
+ * 开锁所需连续命中次数的**默认回落值**——真实值一律由调用方从 `locks.hits_required` 传入。
+ * 2026-10-27 统一：原 v5.5 8.4 的 1/2/3/4 与 D-08 裁决的 3/5/8/12 冲突，
+ * 以配置表（D-08）为唯一权威，本常量仅用于配置缺失时的安全回落并打 warn。
+ * @deprecated 传参优先；保留仅为兼容未升级的调用方。
+ */
+export const LOCK_HITS_FALLBACK: Readonly<Record<LockTier, number>> = { iron: 3, copper: 5, silver: 8, gold: 12 };
```

> **注意**：回落值本身也**改成与 locks.csv 一致**（3/5/8/12），确保"即使误用回落值也不会错"。原 1/2/3/4 直接废弃。

#### 3.2.2 `attempt` 增加 `required` 入参

```ts
-export function attempt(session: LockSession, hit: boolean): {...}
+export function attempt(session: LockSession, hit: boolean, required: number): {...}
```

- `required` 来自调用方 `table('locks').find(r => r.id === tier).hits_required`；
- 若 `required <= 0`（如 `none`）→ 直接 `unlocked: true`，不消耗工具；
- **调用方必须传**，不提供默认值（强制显式，防再次漂移）。

`createSession` 同步增 `required` 字段存入 session，避免每次 attempt 都传：

```ts
export interface LockSession { tier, required, consecutiveHits, totalHits, toolsLeft, unlocked }
export function createSession(tier: LockTier, tools: number, required: number): LockSession
```

#### 3.2.3 单测（`tests/determinism/chest.test.mjs` 扩展）

| 用例 | 断言 |
|---|---|
| iron/required=3，连中 3 次 | `unlocked=true`，`toolsLeft` 减 3 |
| iron/required=3，中 2 后失误再中 3 | 中途 `consecutiveHits` 归零，最终需连续 3 次才开 |
| required=0（none 锁） | 首次 `attempt` 即 `unlocked=true`，`toolsLeft` 不变 |
| toolsLeft=0 后再 attempt | `terminated=true`，session 不变（不得变负） |
| `LOCK_HITS_FALLBACK` 与 `locks.csv` 全 5 行一致 | 硬断言（防再次漂移） |

**最后一条是本步的"防双源"守卫**：测试直接读 CSV 断言常量相等。若有人再改回 1/2/3/4，测试立刻红。

### 3.3 `chests.csv` 加 `item_id`（D-19）

#### 3.3.1 数据改动

```csv
id,material,lock,smashable,size,item_id
chest_wood,wood,none,true,1,item_0065
chest_copper,copper,none,true,1,item_0066
chest_iron,iron,none,true,1,item_0067
```

依据：`items.csv:66-68` 的 `name`（木箱/铜箱/铁箱）+ `category=chest`，与 `chests.material`（wood/copper/iron）一一对应。

#### 3.3.2 生成链

```bash
npm run gen:config     # 重生成 config-types.ts（含新列）
npm run sync           # 同步 client 副本
npm run guard          # 确认 generatedUntouched 绿
```

#### 3.3.3 反向索引（客户端）

在 `SalvageModel` 增纯函数：

```ts
/** 背包 itemId → 箱子配置行（无则 null，非箱子物品返回 null 而不抛错）。 */
export function chestOf(itemId: string, rows: readonly ChestsRow[]): ChestsRow | null;
```

**严禁**在 view 里手写字符串比较（`itemId === 'item_0065'`）。

### 3.4 服务端：新增 `chest.open` 动作（D-30）

#### 3.4.1 契约（**需用户授权，第 4 缺口解冻**）

```ts
// packages/contracts/src/common/actions.ts 新增
'chest.open': { module: 'chest', auth: true, idempotent: true,
                desc: '开箱结算：服务端校验持有与锁档后按保底口径发奖（ADR-0013）' },
```

```ts
// packages/contracts/src/chest/index.ts 追加（不复用既有 ChestOpenReq——那个是"单次尝试"的形状，
//  属未注册动作的孤儿类型，本步保留不动并在 ADR 里标注为 v1.1 的连点权威方案预留）
export interface ChestOpenReq2 { itemId: string; tier: LockTier | 'none'; hitsUsed: number }
export interface ChestOpenRes2 { granted: { itemId: string; count: number }[]; opened: true; ledgerId: string }
```

> **命名说明**：`ChestOpenReq2` 是临时名，落地时按 change-playbook 定为 `ChestOpenBoxReq` 并同步 `payload.ts`。此处留存原因：既有 `ChestOpenReq` 描述的是**逐次尝试**（带 pointer），语义不同，不能合并。

#### 3.4.2 `payload.ts` 新增 schema

```ts
'chest.open': z.object({
  itemId: Id,
  tier: z.enum(['none', 'iron', 'copper', 'silver', 'gold']),
  hitsUsed: z.number().int().min(0).max(999),
}),
```

#### 3.4.3 服务端三件套（`server/src/modules/chest/`）

> 选定 `chest` 模块而非 `salvage`：动作名是 `chest.open`，且 `server/src/modules/chest/` 已存在（空壳），语义正确。**`salvage.claimInfo` 保持 `todo`，交 v1.1 的沉船玩法**（本步明确纠正 4009 卡的错配）。

| 文件 | 职责 | 关键点 |
|---|---|---|
| `repo.ts` | `insertLedger(tx, row)`；`findBoxInSave(playerId)` | 照抄 `account/repo.ts` 的 `qx(tx)` 范式；**禁在 `withTx` 内调全局 `q()`**（PGlite 死锁） |
| `service.ts` | `openBox(playerId, req, t, rid)` | ①校验玩家存档含 `itemId` 且 `count ≥ 1` ②从 `locks` 配置读 `hits_required` 校验 `hitsUsed` ③按 D-27 保底口径发奖 ④扣箱 + 写 `ledger_entry(type='chest')` |
| `handlers.ts` | 薄封装 | 解参 → 调 service → 转 `RpcResponse` |

**降级口径（D-27 落地）**：

```ts
// 保底发放：base_price ≥ 1 且 recycle_bp 非空 的候选中取 base_price 最小者。
// 实测当前为 item_0020（base_price=4）；item_0013（base_price=0）必须被排除，
// 否则玩家点完开锁得到 0 价值物品，体验等价于失败。
```

**幂等**：`chest.open` 标 `idempotent: true`，W2 的 4020 已让客户端自动带 rid。

#### 3.4.4 `handlers.ts` 注册

```ts
-'chest.open': 不存在
+'chest.open': chestHandlers['chest.open'],
```

`handlers.ts` 用 `satisfies Record<ActionName, Handler>`，**漏注册编译即失败**，这是本步的天然守卫。

### 3.5 客户端：开箱 UI（最小化）

#### 3.5.1 接缝位置

`client/assets/scripts/features/salvage/view/SalvageView.ts`（当前 11 行空壳）。**不新建面板、不注册 PanelKey**——开箱是「背包行内动作」，与 4008 的回收按钮同构。

#### 3.5.2 交互流程

```text
[背包行：箱子且有 item_id 映射] --点"打开"-->
   ├─ lock === 'none'  → 直接 invoke('chest.open') → 结算
   └─ lock !== 'none'  → [lock-playing] 连点 UI
                          · required = locks.hits_required[lock]
                          · 每次点击 → attempt(session, true, required)
                          · consecutive >= required → unlocked → invoke('chest.open')
                          · 点击间隔 > 800ms（配置缺省）视为失误 → attempt(session, false, required)
                          · toolsLeft 耗尽 → [lock-failed]（不调用服务端）
```

#### 3.5.3 硬约束

| # | 约束 | 理由 |
|---|---|---|
| ① | 连点判定**只用** `game-core/chest.attempt`，不在 view 里重写计数 | 单一规则源 |
| ② | `required` **必须**从 `table('locks')` 读 | 禁 `LOCK_HITS` 常量 |
| ③ | 开锁失败**不发请求** | 服务端只认"成功"这一事实，避免无意义 RPC |
| ④ | 结算成功才 `applySell`/入包；服务端响应为准 | 不信客户端自算奖励 |
| ⑤ | 连点期间 **`busy=true`**，禁重复触发 | 双击防护 |
| ⑥ | 连点计数用**数字累加**，回调内不 new 对象 | 10 年前手机 GC 基线（`04` §5） |

#### 3.5.4 背包行同时挂"回收"与"打开"两按钮

- 箱子类（`category === 'chest'` 且有 `item_id` 映射）→ 显示"打开"，**不显示"回收"**（避免同物两价混淆）；
- 其他已知物品 → 显示"回收"；
- 未知物品 → 都不显示。

这条**必须写进 `screen-inventory.md` 的更新**（W2 之后再补，属本步 §3.1 联动）。

### 3.6 集成测试（`tests/integration/chest-open.test.mjs`）

| 用例 | 断言 |
|---|---|
| AT-4009.1 背包有铜箱 → 开箱成功 | `c=0`，`granted` 非空，`ledger_entry` 新增 `type='chest'` 一行 |
| AT-4009.2 背包无该箱 → 开箱 | `c=1001 BAD_PAYLOAD`（超卖同类） |
| AT-4009.3 `hitsUsed < hits_required` → 开箱 | `c=1001`，不写 ledger（防伪造） |
| AT-4009.4 同 rid 重放 | 返回首次结果，ledger 不增（幂等） |
| AT-4009.5 发奖内容 | 等于 D-27 保底候选（`item_0020`），且**不含 `item_0013`** |
| AT-4009.6 扣箱正确 | 开箱后存档该 `itemId` 数量 -1 |

### 3.7 闸门复跑

```bash
npm run gen && npm run verify > /tmp/wdf_verify_w3.log 2>&1; echo "EXIT=$?"
npm run probe > /tmp/wdf_probe_w3.log 2>&1; echo "PROBE=$?"   # 需先 npm run dev:server（后台）
```

## 4. 验收断言

| # | 断言 | 命令 | 期望 |
|---|---|---|---|
| V-3.1 | `chest.open` 已注册 | `grep -n "chest.open" packages/contracts/src/common/actions.ts server/src/gateway/handlers.ts server/src/gateway/payload.ts` | 3 文件各命中 |
| V-3.2 | `hits` 单源 | `grep -n "iron" game-data/source/locks.csv packages/game-core/src/chest/index.ts` | 两处值一致（3/5/8/12） |
| V-3.3 | 箱子 id 可映射 | `grep -c "item_006" game-data/source/chests.csv` | 3 |
| V-3.4 | 规则单测覆盖 5 例 | `npm test -- --test-name-pattern="chest"` | 全绿 |
| V-3.5 | 集成测 6 例 | `npm test -- --test-name-pattern="chest.open"` | 全绿 |
| V-3.6 | `salvage.claimInfo` 仍为 todo（未被错用） | `grep -n "salvage.claimInfo" server/src/gateway/handlers.ts` | 仍 `todo` |
| V-3.7 | `screen-salvage.md` 存在且含 7 态 | `grep -c "lock-playing\|lock-failed" docs/03_solution/ui/screen-salvage.md` | ≥2 |
| V-3.8 | 类型检查 0 错 + verify 绿 | 同 V-2.6 / `npm run verify` | 通过 |
| V-3.9 | 真机断言 | — | **UNKNOWN**（记录于 `EVD-4009`，理由：路径不可达，见 `F-17`） |

## 5. 提交边界（三次提交）

| # | 提交 | 内容 | 可独立回退 |
|---|---|---|---|
| 1 | `feat(4009a-1): 开锁次数单源化——locks.csv 为权威，LOCK_HITS 降级为回落并同步 3/5/8/12` | `game-core/chest`、单测 | ✅ |
| 2 | `feat(4009a-2): chests.csv 补 item_id + chest.open 契约与服务端三件套` | `chests.csv`、`actions.ts`、`payload.ts`、`server/src/modules/chest/**`、`handlers.ts`、集成测 | ✅ |
| 3 | `feat(4009b): 背包开箱入口与连点 UI（真机 UNKNOWN）` | `SalvageView`、`InventoryPanel`（加"打开"按钮）、`screen-salvage.md`、EVD | ✅ |

> **提交 2 是契约变更**，必须在 commit message 里写明 `ADR-0013（新建）· 缺口 4：chest.open 解冻`，并同步新建 `docs/03_solution/decisions/ADR-0013-chest-open.md`。

## 6. 风险与回退

| 风险 | 概率 | 影响 | 预案 |
|---|---|---|---|
| 契约解冻未获授权 | 中 | 阻塞提交 2 | 先做提交 1（纯 game-core，零契约风险）；提交 2 等授权 |
| `LOCK_HITS` 改动波及既有 `chest.test.mjs` | 中 | 测试红 | 该测试必须随改动同步（`attempt` 签名变了），改动即预期 |
| `hitsUsed` 可被客户端伪造 | **已知** | 可刷保底物 | v1.0 收益上限受"持有箱子数"约束（箱子不可制造）；**显式登记**于 ADR-0013，v1.1 用 seed+pointer 复算治理 |
| 服务端读玩家存档校验持有量 | 中 | PGlite 事务死锁 | 严格用 `tx` 入参，照抄 `account/repo.ts` |
| 箱子同时被"回收"和"打开" | 中 | 价格混乱 | §3.5.4 互斥规则 |

**回退**：三次提交独立可 revert；契约回退需同步 `npm run gen && npm run sync`（否则生成物与源不一致，守卫红）。
