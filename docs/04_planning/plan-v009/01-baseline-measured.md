---
id: PLAN-V009-01
title: plan-v009 · 实测基线（带时间戳与命令原文）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
---

# 01 · 实测基线

> **纪律**：本文件的每一条都是**本次亲自跑出来的**，不是从记忆或上一版规划里抄的。
> 上一版（v008）最重要的教训是「对活的树做静态裁决必然得到过期货」；本版新增一条教训：
> **「凭印象记录缺陷编号也会得到过期货」**——F-42 就是这样错的。

实测时刻：**2026-10-27 20:46:08 GMT+8**　`git HEAD = 1bc9bbf`

## 1. 工作树

```
$ git -c core.quotePath=false status --porcelain
 M docs/00_governance/glossary.md
 M docs/04_planning/current-plan.md
 M docs/04_planning/roadmap.md
 M docs/07_release/compliance/copyright-materials.md
 M docs/07_release/compliance/probability-disclosure.md
 M docs/07_release/compliance/review-checklist.md
```

6 条，**全部是文档**，**全部来自并行助手线**。我方代码线在 `1bc9bbf` 之后无改动。

双端：`0 / 0`（fetch 已核，origin/master 与本地一致）。

## 2. 运行时行为闸门

```
$ npm test
ℹ tests 156
ℹ pass  156
ℹ fail  0
ℹ duration_ms 5247.0059
```

**156/156，零失败。** 这一条与"存在 12 个类型错"完全不矛盾——见 §6。

## 3. 结构守卫

```
$ npm run guard
✅ 根目录白名单
✅ game-core/contracts 纯度
✅ 客户端依赖边界
✅ 服务端依赖边界
✅ 模块清单与目录一致
✅ Asset Bundle 规则
✅ 生成物未手改且已同步
✅ 文档 front matter
✅ 无空目录

全部守卫通过
```

**9/9。** 注意：9 项里**没有一项检查类型**。

## 4. client tsc（唯一正确过滤式）

```
$ npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 | grep -v "^C:/"
client/assets/scripts/features/economy/view/MerchantPanel.ts(223,56): error TS2322:
  Type 'string' is not assignable to type
  '"merchant_village" | "merchant_wander" | "merchant_black"'.
```

**1 错。** 过滤式必须是 `grep -v "^C:/"`（引擎错误以 `C:/` 开头绝对路径）；**禁止**用 `grep 项目路径`，会漏掉 `services/**` 造成假绿（`plan-v008` §13 实测吞掉 7 个真错）。

## 5. server tsc（噪声分离后）

```
$ npx -p typescript@5.8 tsc -p server/tsconfig.json --noEmit 2>&1 \
    | grep -E "^(server|packages)/" \
    | grep -v "Cannot find module 'node:" \
    | grep -v "Cannot find name 'process'" \
    | grep -v "Cannot find name 'Buffer'"
```

输出 **12 行**：

| # | 位置 | 错误 | 真伪 |
|---|---|---|---|
| 1 | `core/db.ts(51,14)` | TS7006 `Parameter 'f' implicitly has an 'any' type` | **假**——`readdirSync` 因 `node:fs` 未解析而退化为 `any`，`f` 是级联噪声 |
| 2 | `gateway/idempotency.ts(18,37)` | TS2532 `Object is possibly 'undefined'` | **真**（`rows[0]`） |
| 3 | `gateway/idempotency.ts(20,10)` | TS2532 | **真**（同上） |
| 4 | `modules/config/service.ts(78,31)` | TS2532 | **真**（`a[i]`） |
| 5 | `modules/config/service.ts(78,38)` | TS2532 | **真**（`b[i]`） |
| 6 | `modules/economy/repo.ts(81,17)` | TS7053 `expression of type '0' can't be used to index type '{rows:{used:string}[]} \| {used:string}[]'` | **真**（`tx` 分支返回 `{rows}`，非 tx 分支返回数组，`exec` 成联合类型） |
| 7 | `modules/leaderboard/repo.ts(42,3)` | TS2322 `IncomeRow \| undefined` not assignable to `IncomeRow` | **真**（`return rows[0]`） |
| 8~12 | `modules/save/service.ts(9,15/28/41/54/67)` | TS2305 ×5，`SavePullRes`/`SavePushReq`/`SavePushRes`/`SaveSummary`/`ResolveForkReq` 未导出 | **真，但性质是导入路径写错**（见下） |

**真错 = 11 条。** 噪声（被上面三条 `grep -v` 滤掉的）约 30 条，全部源于 `@types/node` 未安装。

### 5.1 第 8~12 条的真相：契约没丢，路径写错

`packages/contracts/src/save/index.ts` 里这 5 个类型**都在**：

```ts
export interface SaveSummary { ... }
export interface SavePullRes { ... }
export interface SavePushReq { ... }
export type SavePushRes = ...
export interface ResolveForkReq { ... }
```

但 `packages/contracts/src/index.ts` 是**命名空间导出**：

```ts
export * from './common';          // ← 只有 common 是扁平
export * as save from './save';    // ← 其余全部命名空间
```

所以 `import type { SavePullRes } from '@wodefa/contracts'` **必然失败**，正确写法是命名空间或深路径。

**全仓 7 个 service 里，只有 `save/service.ts:9` 用了扁平 barrel**：

| 文件 | 导入式 |
|---|---|
| `account/service.ts:10` | `Platform`（属 `common`，扁平**正确**） |
| `chest/service.ts:23` | `@wodefa/contracts/src/chest/index.ts` |
| `compliance/service.ts:9` | `@wodefa/contracts/src/compliance/index.ts` |
| `config/service.ts:17` | `@wodefa/contracts/src/config/index.ts` |
| `economy/service.ts:2` | `@wodefa/contracts/src/economy/index.ts` |
| `leaderboard/service.ts:2` | `@wodefa/contracts/src/leaderboard/index.ts` |
| **`save/service.ts:9`** | **`@wodefa/contracts`（扁平，错）** |

→ **F-46**：这不是契约缺口，是**范式不一致**。修法只改一行 import。

## 6. 为什么「156/156 全绿」和「12 个类型错」能同时为真

三层原因，都必须写下来：

1. **`npm test` 用 Node 类型剥离跑 `.ts`**（`--import ./tools/runtime/register.mjs`）。类型在运行时**被整段抹掉**，所以类型错**不可能**让任何测试失败。
2. **`npm run guard` 的 9 项里没有类型检查**。它校验目录、纯度、边界、生成物、文档 front matter、空目录。
3. **`npm run verify` = `gen + guard + test`，没有 tsc。**

所以「全绿」的准确含义是：**配置同步了、结构合规了、156 个运行时用例过了。类型不在其中。**

## 7. verify 脚本原文（F-43 的直接证据）

```json
"scripts": {
  "gen": "node tools/gen/config.mjs && node tools/sync/to-client.mjs && node tools/gen/catalog.mjs && node tools/gen/docs-index.mjs",
  "guard": "node tools/guard/run-all.mjs",
  "test": "node --import ./tools/runtime/register.mjs --test \"tests/**/*.test.mjs\"",
  "verify": "npm run gen && npm run guard && npm run test"
}
```

**`verify` 里没有 `tsc`。`devDependencies` 键根本不存在。**

## 8. F-42 的实测（推翻我自己的旧登记）

```
$ cat server/src/gateway/version.ts
/** 客户端版本低于 minClientVersion → 9001；configVersion 不一致 → 响应附带最新 cfg。 */
export const MIDDLEWARE = 'version';

$ cat server/src/gateway/ratelimit.ts
/** 按玩家与 IP 的令牌桶；赶海开场单独配额。 */
export const MIDDLEWARE = 'ratelimit';
```

两个文件都只有注释 + 常量。

**但版本闸是真的在工作**，实现在 `gateway/rpc.ts:36-41`：

```ts
if (!VERSION_GATE_EXEMPT.has(req.a)) {
  const minClient = await activeMinClient();
  if (minClient && isOlderThan(req.m?.cv, minClient)) {
    return { c: ERR.CLIENT_TOO_OLD, msg: `client too old: ...`, t };
  }
}
```

并且做对了两件容易做错的事：
- **放在鉴权之前**（旧客户端连登录都不该放进来）。
- **`config.manifest` 豁免**（否则客户端拿不到"该升到哪个版本"的信息 → 死锁）。

有测试：`tests/integration/auth.test.mjs:211`
`assert.equal(blocked.c, 9001, 'cv 低于 minClientVersion → CLIENT_TOO_OLD')`

**所以 F-42 原登记的「服务端根本不校验 cfg」是错的。** 逐项核对：

| 字段 | 契约声明（`common/envelope.ts`） | 服务端实际 |
|---|---|---|
| `cv` 客户端版本 | 低于 minClientVersion → 9001 | ✅ **已实现**（`rpc.ts:37-39`）+ 有测试 |
| `cfg` 客户端 configVersion | `RpcResponse.cfg?: string`「不一致 → 响应附带最新 cfg」 | ❌ **未实现**：`grep -rn "cfg:" server/src` **零命中**，`RpcResponse.cfg` 从未被赋值 |
| `sv` 存档 schema 版本 | 「本地存档 schema 版本」 | ❌ **从未读取**：`save/service.ts` 只从 `body.schemaVersion` 取，不看 `m.sv` |
| `plat` 平台 | `wechat\|douyin\|app` | ✅ 由 payload schema 校验 |

**限流**：`ratelimit.ts` 零引用 → **完全没实现**。相关事实：`telemetry.track` 在 `ACTIONS` 里是 `auth: false`（见 `tests/integration/telemetry` 用例「无令牌可上报」），**无限流 = 任何人可无限刷**。

## 9. 5050 服务

```
$ curl -s http://127.0.0.1:5050/healthz
{"ok":true,"t":1793104963370}
```

在跑。注意：**该进程加载的是 `1bc9bbf` 时的代码**，本版改动后需重启才生效。
