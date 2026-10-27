---
id: PLAN-V007-11
title: 基线漂移 2 号 · W0/W1 并行半成品审计（16:07 实测）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V007-00, PLAN-V007-01, PLAN-V007-06, PLAN-V007-07]
---

# 11 · 基线漂移 2 号：W0/W1 并行半成品审计

> **本文是"事实基线"的第二次校正，不是规划。**
> 若你只读一段：**当前工作树有 16 个文件被改，三项闸门全红（guard 8/9、`npm test` 9 个文件崩溃、server tsc 6 处硬错误）。这批改动是 W0（4020）+ W1（4009）的半成品，方向对、实现错、无法编译。必须先按 §6 收割再继续。**

## 1. 发生了什么

| 时刻 | 事件 |
|---|---|
| 15:58 | 我完成 `01-fact-baseline.md`，记录"工作树干净、guard 9/9、test 128/128" |
| 15:58 之后 | 另一路执行者（或另一位用户会话）按 plan-v007 的 W0+W1 直接开工，**未 commit**，改动全在工作区 |
| 16:07 | 我复测：guard 8/9、`npm test` 大面积崩、server tsc 报 6 处硬错误 |

**这批改动不是我的。** 我在此期间只写了 `docs/04_planning/plan-v007/*.md`，未触碰任何源码。

## 2. 改动清单（`git diff --stat`，16 文件 +162/−64）

```
 client/assets/resources/config/_manifest.json      |  2 +-
 client/assets/resources/config/chests.json         |  2 +-
 client/assets/scripts/generated/_sync-manifest.json|  6 +-
 client/assets/scripts/generated/contracts/chest/index.ts  | 38 +++---
 client/assets/scripts/generated/contracts/common/actions.ts| 1 +
 client/assets/scripts/generated/game-core/generated/config-types.ts | 3 +-
 client/assets/scripts/services/net/RpcClient.ts    | 21 +++-
 docs/07_release/compliance/probability-disclosure.md | 2 +-
 game-data/schemas/chests.schema.json               |  6 ++
 game-data/source/chests.csv                        |  8 +--
 packages/contracts/src/chest/index.ts              | 38 +++---
 packages/contracts/src/common/actions.ts           |  1 +
 packages/game-core/src/generated/config-types.ts   |  3 +-
 server/src/gateway/handlers.ts                     |  3 +
 server/src/modules/chest/handlers.ts               | 14 +++-
 server/src/modules/chest/service.ts                | 78 +++++++++++++-
```

## 3. 三闸门实测原文（16:07，可复现）

### 3.1 `npm run guard` → **8/9**

```
✅ 根目录白名单
✅ game-core/contracts 纯度
✅ 客户端依赖边界
❌ 服务端依赖边界（1）
   - server/src/modules/chest/service.ts：跨模块只能调用对方 service，发现 ../save/repo.ts
✅ 模块清单与目录一致
✅ Asset Bundle 规则
✅ 生成物未手改且已同步
✅ 文档 front matter
✅ 无空目录

守卫未通过：1 处
```

**判读**：这条红是我在 `04-architecture.md` A-3 写过的硬约束——服务端跨模块只能调对方 `service`，不能直接摸 `repo`。写的人绕过了它，且用了一个**根本不存在的 `repo` 函数**（见 §4）。

### 3.2 `npm test` → **9 个文件整体崩溃**

```
✖ tests\contract\handlers.test.mjs
✖ tests\e2e\skeleton.test.mjs
✖ tests\integration\auth.test.mjs
✖ tests\integration\bind.test.mjs
✖ tests\integration\economy-sell.test.mjs
✖ tests\integration\fork.test.mjs
✖ tests\integration\leaderboard.test.mjs
✖ E-07 每个动作都有 payload schema 或显式豁免
    AssertionError: 动作 chest.open 既无 schema 也未被豁免
✖ tests\integration\telemetry.test.mjs
```

**判读**：`tests/` 下无任何改动，这 8 个文件是**被源码拖垮的**。机理：`gateway/handlers.ts` 新增 `import { chestHandlers } from '../modules/chest/handlers.ts'` 且注册 `'chest.open': chestHandlers['chest.open']`；而 `chest/handlers.ts` 又 import `chest/service.ts`；`service.ts` import 了 5 个不存在的符号 → **模块加载期即抛错** → 所有 import gateway 的测试全部无法加载。这是"一个坏 import 拖垮全库"的教科书案例。

**这条红同时证明了一件事：15:58 之后没有跑过 `npm test`。** 跑过就不可能出现。

### 3.3 `tsc -p server/tsconfig.json` → `chest/*` 6 处硬错误

```
chest/handlers.ts(9,44): error TS2339: Property 'playerId' does not exist on type 'Claims'.
chest/service.ts(1,10):  error TS2305: Module '"../../core/db.ts"' has no exported member 'tx'.
chest/service.ts(2,10):  error TS2305: Module '"../../core/errors.ts"' has no exported member 'AppError'.
chest/service.ts(6,10):  error TS2305: Module '"../save/repo.ts"' has no exported member 'latestSnapshot'.
chest/service.ts(6,26):  error TS2305: Module '"../save/repo.ts"' has no exported member 'appendDelta'.
chest/service.ts(7,10):  error TS2305: Module '"../../gateway/idempotency.ts"' has no exported member 'checkIdempotency'.
chest/service.ts(34,30): error TS2339: Property 'SHADOW_STATE_MISMATCH' does not exist on type '{ ... }'.
chest/service.ts(39,30): error TS2339: Property 'SHADOW_STATE_MISMATCH' does not exist on type '{ ... }'.
```

> 注：`server/tsc` 另有 30 余条 `Cannot find name 'process'` / `node:fs` 等报错，那是**既有的环境性噪声**（server 侧未装 `@types/node` 到该 tsconfig），与本次改动无关。**只看 `chest/*` 这 8 条**，它们全是本次新引入的。

## 4. 逐条核账：写的人假设了什么 vs 实际是什么

| # | 代码里的写法 | 真实情况 | 证据 |
|---|---|---|---|
| ① | `import { tx } from '../../core/db.ts'` | 只有 `withTx<T>(fn: (tx: PGlite) => Promise<T>)` | `server/src/core/db.ts:70` |
| ② | `import { AppError } from '../../core/errors.ts'` | **全仓没有 `AppError` 类**。`errors.ts` 是 14 码常量表；唯一的错误类是 `account/service.ts:88` 的 `BindError` | `grep -rn "class AppError" server/src/` → 空 |
| ③ | `latestSnapshot(db, playerId)` / `appendDelta(db, ...)` | `save/repo.ts` 导出的是 `findSnapshot / insertSnapshot / updateSnapshot / countForks / deleteForks / logForkResolved`，**签名一律 `(playerId, ..., tx?)`——tx 是尾参不是首参** | `server/src/modules/save/repo.ts:27,46,55` |
| ④ | `checkIdempotency(db, playerId, rid)` | 实际是 `findIdempotent(playerId, rid)` / `rememberIdempotent(playerId, rid, response)` | `server/src/gateway/idempotency.ts:12,26` |
| ⑤ | `INSERT INTO idempotency (player_id, rid, action, response_body, expires_at)` | 表**只有 3 列**：`(player_id, rid, response)`。多写的 3 列不存在 | 同上，`rememberIdempotent` 的 INSERT 语句 |
| ⑥ | `ctx.claims.playerId` | `Claims` 只有 `sub / region / plat / iat / exp / jti / admin?`，**没有 `playerId`** | `server/src/gateway/auth.ts:17-25` |
| ⑦ | `ERR.SHADOW_STATE_MISMATCH` | 14 码里无此名。1001 是 `BAD_PAYLOAD`，含义是"负载不合法"，不是"影子账本不一致" | `packages/contracts/src/common/errors.ts` |
| ⑧ | `idemp` 命中时 `return idemp.response_body` | 真实字段是 `response`，且类型是完整 `RpcResponse`（含 `c/d/t`），不是裸 `d` | 同上 |
| ⑨ | `chests.csv` 的 `item_id = item_0065/66/67` | ✅ **对**。三个都是 `chest` 类型 | `game-data/source/items.csv:66-68` |
| ⑩ | 保底发 `item_0020` | ✅ **对**。木棍，`base_price=4`，符合 D-27（`base_price≥1 且 recycle_bp 非空`）的筛选口径 | `game-data/source/items.csv:21` |

**结论**：①②③④⑤⑥⑦⑧ 是**凭印象写的**，全部与实际 API 不符；⑨⑩ 是对的。这个比例（2/10）说明写的人没有读过被引用的模块，是按"一个正常的 Node 服务端应该长什么样"编的。

## 5. 唯一真正的"设计级"缺陷：违反 ADR-0012

比编译错误更值得记的是这一条——**它即使编译通过也是错的**：

`openChest` 只改了 `snap.body.modules.inventory`，**没有写 `ledger_entry`**：

```ts
newInv[rewardItemId] = (newInv[rewardItemId] || 0) + rewardCount;
const newBody = { ...snap.body, modules: newModules, ... };
await appendDelta(db, playerId, snap.revision, newBody, meta, 'chest.open');
// 到此为止。没有任何 ledger 记录。
```

而 ADR-0012 的定义是：**`ledger_entry` 是权威账本、只追加、容差 0；存档里的 `inventory` 是投影**。开箱凭空多出 1 个 `item_0020` 却没进账本，下一次玩家拿这个木棍去 `economy.sell`，影子账本校验必然算出"存档比账本多 1"，直接返回 1001。

**这是"功能做完、下游立刻炸"的典型。** 也印证了 `04-architecture.md` A-2 的判断：ADR-0012 是商人/回收的前置，任何改背包的动作都必须同时落账本，不存在"先做功能后补账本"。

附带问题：`hitsUsed` 参数**从头到尾没被使用**。也就是说这个 `chest.open` 是"客户端说开成功就发奖"——锁箱校验形同虚设。而 `07-step2-chest-open.md` 明确要求"服务端权威、客户端不上报 tier"。这不是遗漏，是**根本没有做开锁**。

## 6. 逐文件裁决（可直接执行）

| 文件 | 裁决 | 理由 |
|---|---|---|
| `packages/contracts/src/common/actions.ts` | **保留** | 加 `chest.open`（孤儿契约接线）完全正确，是 W1 第 4 段的必需项 |
| `packages/contracts/src/chest/index.ts` | **保留** | 去掉 `tier`、改为 `itemId + hitsUsed`，方向正确（服务端权威）；但 `ChestOpenRes` 的形状需与 `07` 的 `{opened, granted, ledgerIds}` 对齐——**保留后改形状** |
| `game-data/source/chests.csv` + `chests.schema.json` | **保留** | `item_id` 列与三个 id 都对；但 `lock` 列仍全 `none`，**锁箱路径依旧不可达**（F-17 未解） |
| `client/.../RpcClient.ts` | **保留** | rid 注入逻辑正确（含重试传 `finalRid`）。两处小瑕疵：`import` 落在文件中段（应用顶部）、`Math.random()` 生成 uuid（可接受，小游戏无 `crypto`） |
| `client/.../generated/**`、`config/*.json` | **保留** | 是 `npm run gen` 的产物，与源一致（guard 的"生成物已同步"是绿的） |
| `docs/07_release/compliance/probability-disclosure.md` | **保留** | 初判"待复核"，复核后**改判为生成物**：diff 只有一行 `configVersion 38fc1faf → c6a54f0f`，是 `npm run gen:config` 因 `chests.csv` 变更自动重算的。文件头自带"由 game-data 生成，勿手改"，非人工编辑 |
| `server/src/modules/chest/service.ts` | **回滚** | §4 的 8 处凭印象编码 + §5 的 ADR 违规。修不如重写 |
| `server/src/modules/chest/handlers.ts` | **回滚** | 基于 `claims.playerId`（不存在），且依赖上面那个 service |
| `server/src/gateway/handlers.ts` | **回滚** | 这 2 行是 9 个测试文件崩溃的**唯一入口**。先撤掉，等 service 真能跑再接 |

**一句话**：**收 7 个、退 3 个。** 这不是原 A/B/C 三个选项里的任何一个——A（全部另存 diff）会把垃圾一起留下，B（全部回滚）会丢掉 4 处正确改动，C（继续同树收尾）在我不知道对面是谁、对面可能还在写的前提下等于往火里添柴。

回滚命令（**只退 3 个文件，不碰其余**）：

```bash
cd /e/Demo/WDF
git checkout -- server/src/modules/chest/service.ts \
                server/src/modules/chest/handlers.ts \
                server/src/gateway/handlers.ts
npm run guard   # 期望回到 9/9
npm test        # 期望回到 128/128
```

## 7. 根因：为什么会写成这样

不是能力问题，是**流程问题**，三条都违反了我写进 `00-README.md` 的 R-1~R-10：

| 违反 | 具体表现 |
|---|---|
| **R-3「改前必读被改模块的真实签名」** | 10 处引用里 8 处凭空编。读一眼 `grep "^export" server/src/core/db.ts` 就能避免 |
| **R-5「每步落盘前必跑三闸门」** | 显然一次都没跑。`npm test` 一跑就 9 个文件红，不可能看不见 |
| **R-7「服务端改动必须同 transaction 写 ledger」** | `openChest` 无账本记录 |

**给下一路的硬建议**：这三条不是建议，是闸门。**跑不过不许写下一行。** 本项目的失败模式不是"想不到"，是"想到了但没验"。

## 8. 对规划的影响

| 卡 | 原状态 | 校正后 | 说明 |
|---|---|---|---|
| TASK-4020（rid 注入） | 未做 | **实际已完成 ~90%** | `RpcClient.ts` 的 `finalRid` 逻辑是对的，只差：①`import` 移到顶部 ②补一条反向断言"rid 不进 `params`" |
| TASK-4009（开箱全栈） | 未做 | **六段中完成 2 段** | 段 3（`chests.csv` + `item_id`）、段 4（`chest.open` 契约接线）已完成；段 1（`screen-salvage.md`）、段 2（game-core 单源）、段 5（服务端三件套）、段 6（客户端 UI）未做 |
| TASK-4008 | 已完成 | 不变 | — |
| 其余 | 不变 | 不变 | — |

**净效果**：W0 从"整卡"缩到"两处收尾"；W1 从"整卡"缩到"四段"。规划顺序不用改，`05-dag.md` 依然成立，只是**W1 的入口工作量涨了**——因为 `chest/service.ts` 要从零写，且必须同时落 `ledger_entry`。

## 9. 复测命令（任何人接手第一步就跑这四条）

```bash
cd /e/Demo/WDF
git log --oneline -1                      # 期望 7cb62c0
git status --porcelain                    # 期望空
npm run guard                             # 期望 9/9
npm test                                  # 期望 128/128
npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 | grep -v "^C:/"   # 期望空
```

> ⚠️ 最后一条的过滤式**不能**写成 `grep 项目路径`——那样会漏掉 `services/**`，造成"零错误"假绿（10-27 已实测吞掉 7 个真错误）。
