---
id: PLAN-V008-03
title: 契约冻结包（六份）与唯一源声明
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V008-02, PLAN-V008-04]
---

# 03 · 契约冻结

> **唯一源声明**：`packages/contracts/src/**`（TypeScript 类型 + `ACTIONS`/`ERR` 常量表）。客户端副本由 `npm run sync` 生成到 `client/assets/scripts/generated/contracts/**`，**禁止手改**。
> 第二源：`game-data/schemas/*.schema.json`（数值表结构），由 `tools/gen/config.mjs` 校验。
> **其余一切（文档描述、注释、任务卡）不是契约**，与代码冲突时以代码为准。

## ① API 契约

传输：`POST /v1/rpc`，封套 `{ a, p, m }` → `{ c, d?, msg?, t }`。`m` = `{ cv, cfg, sv, plat, rid? }`。

| # | 动作 | 鉴权 | 幂等 | 状态 | 备注 |
|---|---|---|---|---|---|
| 1 | `account.login` | 否 | 否 | ✅ | |
| 2 | `account.refresh` | 否（自校验签名） | 否 | ✅ | 过期令牌也可 |
| 3 | `account.bindStart` | 是 | 是 | ✅ | |
| 4 | `account.bindConfirm` | 是 | 是 | ✅ | 失败抛 2004 |
| 5 | `compliance.check` | 是 | 否 | ⚠️ **桩** | `verified=playerExists`, `minor=false`（M-10 未达成） |
| 6 | `save.pull` | 是 | 否 | ✅ | |
| 7 | `save.push` | 是 | 是 | ✅ | 带 `baseRevision`，冲突回 `accepted:false` |
| 8 | `save.resolveFork` | 是 | 是 | ✅ | |
| 9 | `salvage.claimInfo` | 是 | 是 | ❌ todo | 依赖 `salvage` 数值 |
| 10 | **`chest.open`** | 是 | 是 | ⚠️ 实现有缺陷 | 见下 §1.2 |
| 11 | `economy.buyQuota` | 是 | 是 | ❌ todo | 数值已就绪，缺实现 |
| 12 | `economy.sell` | 是 | 是 | ✅ | 影子账本容差 0 |
| 13 | `leaderboard.report` | 是 | 是 | ✅ | |
| 14 | `leaderboard.query` | 是 | 否 | ✅ | |
| 15~17 | `event.start/submit/result` | 是 | 是 | ❌ todo | 空表 |
| 18~19 | `social.send/pull` | 是 | 是 | ❌ todo | 空表 |
| 20 | `ads.claim` | 是 | 是 | ❌ todo | 数值已就绪 |
| 21 | `telemetry.track` | 否 | 是 | ✅ | |
| 22 | `config.manifest` | 是 | 否 | ✅ | |

**统计**：22 动作 / 已实现 13 / todo 8 / 桩 1。
> ⚠️ `server/src/gateway/handlers.ts:32` 注释仍写"全部 **20** 个动作，仅剩 8 个 todo" —— 动作数已变 22，注释过期，列入 `08` 文档修正项。

### 1.2 `chest.open` 契约（本规划要收敛的唯一未定契约）

**请求**（现状已冻结，改动成本最低）：

```ts
export interface ChestOpenReq {
  itemId: string;    // 背包中的箱子物品 id，如 'item_0065'；由服务端查 chests 表校验
  hitsUsed: number;  // 客户端自报的点击次数，仅供审计，不参与判定
}
```

**响应**（**待裁决 B-3**，本规划推荐 A）：

```ts
// 方案 A（现状，推荐）：改动小，客户端未消费
export interface ChestReward { itemId: string; count: number }
export interface ChestOpenRes { success: true; rewards: ChestReward[] }

// 方案 B（v007 版）：多回传 ledgerIds，便于对账与问题排查
export interface ChestOpenRes { opened: true; granted: ChestReward[]; ledgerIds: string[] }
```

**语义（冻结）**：

| 项 | 规定 |
|---|---|
| 幂等键 | `meta.rid`（**不在 `payload`**）。同 `rid` 24h 内返回首次结果，只缓存 `c===0` |
| 事务 | 扣箱 + 发奖 + 写 `ledger_entry` **必须同一事务** |
| 权威 | 由服务端判定；`hitsUsed` 不得作为发奖依据 |
| 失败码 | 只能在 `ERR` 15 码内选（见 ②） |

## ② Errors 契约

`packages/contracts/src/common/errors.ts` 现有 **15 码**：

| 段 | 码 | 名称 | 含义 |
|---|---|---|---|
| 1xxx 契约 | 1001 | `BAD_PAYLOAD` | 参数/契约不合法 |
| | 1002 | `UNKNOWN_ACTION` | 未知动作 |
| 2xxx 登录 | 2001 | `NOT_LOGGED_IN` | 未登录 |
| | 2002 | `SESSION_EXPIRED` | 会话过期（客户端静默刷新） |
| | 2003 | `BANNED` | 封禁 |
| | 2004 | `BIND_TICKET_INVALID` | 绑定票据无效（D-12 解冻新增） |
| | 2101 | `MINOR_TIME_LIMIT` | 未成年人时长限制 |
| 3xxx 规则 | 3001 | `DUPLICATE_REQUEST` | 重复请求（**幂等回放，属成功**） |
| | 3002 | `QUOTA_EXHAUSTED` | 配额耗尽 |
| | 3201 | `EVENT_CLOSED` | 活动关闭 |
| | 3202 | `EVENT_ALREADY_PLAYED` | 活动已参与 |
| 4xxx 系统 | 4001 | `RATE_LIMITED` | 频率限制 |
| | 4002 | `INTERNAL` | 内部错误 |
| 5xxx 风控 | 5001 | `SHADOW_LEDGER_MISMATCH` | 影子账本不一致（容差 0） |
| 9xxx 升级 | 9001 | `CLIENT_TOO_OLD` | 客户端过旧 |

**硬规则（写进契约，不得违反）**：

1. **禁止自造数字码**。`ux.ts:54` 的 `satisfies Record<keyof typeof ERR, CodeDrivenRule>` 保证"漏一个映射就编译失败"——但这个约束**只能拦住"改 ERR"的路径，拦不住"在 service 里直接写数字"**。F-28 的 3103 就是这么绕过去的。
2. 新增码必须走三步：改 `DESIGN-0001 §2` → 加 `ERR` → `ux.ts` 自动要求补映射。
3. 服务端任何返回给客户端的 `c` 必须 ∈ `ERR` 值集合，**唯一例外是 `0`**。
4. **没有专门的"网络错误"码**（历史缺口）：网络失败统一 `4002 INTERNAL`，客户端按"未收到响应"区分。

**F-28 的修法（列 3 种，推荐 A）**：

| 方案 | 做法 | 评价 |
|---|---|---|
| **A（推荐）** | "背包里没有该箱子" → `ERR.BAD_PAYLOAD(1001)` | 零新增码，语义可接受（请求参数指向不存在/不足的物品） |
| B | 新增 `3003 ITEM_NOT_ENOUGH` | 语义最准，但要改 `DESIGN-0001` + `ux.ts`，且 3003 需确认与 game-core `Result.code` 不撞 |
| C | 复用 `5001 SHADOW_LEDGER_MISMATCH` | **错误**：5001 语义是"账本与存档不一致"，与"玩家没这个箱子"是两件事 |

## ③ Identity 契约

```ts
export interface Claims {
  sub: string;      // playerId，唯一身份
  region: string;   // 区服
  plat: string;     // 平台
  iat: number;
  exp: number;
  jti: string;
  admin?: boolean;
}
```

| 规则 | 内容 |
|---|---|
| 唯一身份 | `claims.sub`。**没有 `playerId` 字段**（16:07 那版写的 `claims.playerId` 是错的） |
| 令牌 | HMAC-SHA256 自签，`WDF_TOKEN_SECRET` 注入 |
| 鉴权模式 | `WDF_AUTH_MODE=dev`（本地，能登录即实名）/ `platform`（真机，未实现） |
| 管理端 | **无管理后台界面**（12:27 裁决）。`admin` 仅用于脚本/SQL 侧判定，不暴露 RPC 动作 |
| 越权禁止 | 任何动作只允许操作 `claims.sub` 自己的数据；`playerId` **只从 token 取，不从 payload 取** |

> ✅ 现状符合：`chest/handlers.ts` 用 `ctx.claims?.sub`，`rpc.ts:54` 用 `v.claims.sub` 做幂等键。

## ④ Resources 契约

本项目**无用户上传文件**。资源仅两类：

| 类 | 路径 | 版本 | 校验 |
|---|---|---|---|
| 数值配置 | `client/assets/resources/config/*.json` | `configVersion` = 内容哈希 | `_manifest.json`，与 `game-data/source` 一致（guard "生成物已同步"） |
| 生成契约副本 | `client/assets/scripts/generated/**` | 随 `npm run sync` | 字节级比对（guard 会报"客户端副本过期"） |

**禁止**：手改 `generated/**` 与 `config/*.json`（改了下次 `npm run gen` 会被覆盖，且 guard 报红）。
**当前 `configVersion`** = `c6a54f0fb00341c5`（`_manifest.json:2`）。

## ⑤ Events 契约

| 通道 | 动作 | 载荷要点 |
|---|---|---|
| 埋点 | `telemetry.track` | 批量 ≤ N 条；写 `audit_log`，`actor=IP`；超批量回 `4001`；**`auth:false` 可上报** |
| 审计 | 服务端内部 | `audit_log` 表；`resolve_fork` 有留痕（`AT-2202`） |

无异步事件总线、无消息队列。跨请求的异步性只体现在幂等表。

## ⑥ UX States 契约

六态（`packages/contracts/src/common/ux.ts`）：

| 态 | 触发 | 客户端表现要求 |
|---|---|---|
| `success` | `c === 0` | 正常渲染 |
| `empty` | 列表为空 | 空态文案（`addEmptyHint`） |
| `loading` | 请求中 | 禁用重复点击 |
| `error` | 其他非 0 码 | 显示 `uxFor(c)` 的文案 |
| `noPermission` | 2001/2003 | 引导登录/提示封禁 |
| `conflict` | **只来自** `save.push` 的 `accepted:false` | 弹出选择保留哪份 |

**F-28 的直接后果**：3103 不在 15 码内 → `uxFor(3103)` 无映射 → 客户端落到 `error` 的兜底文案，**玩家看不懂"背包里没有这个箱子"**。这是"能跑但用户看不懂"的典型，比崩溃更隐蔽。

## 契约自检（§4.4）

| # | 问题 | 答案 | 证据 |
|---|---|---|---|
| 1 | 前端能只凭契约写调用层？ | ✅ | `RpcClient.invoke<P,D>` 泛型 + `ACTIONS` 表 |
| 2 | 后端能只凭契约实现接口？ | ✅ | `payload.ts` zod 校验 + `Handler` 签名 |
| 3 | 数据端能只凭契约设计表？ | ⚠️ 部分 | `game-data/schemas/*.json` 覆盖 46 表，但 `ledger_entry` 结构不在其中 |
| 4 | 错误码覆盖所有失败路径？ | ❌ | 3103 越界（F-28）；无网络错误码 |
| 5 | 管理端越权被禁止？ | ✅ | 无管理 RPC 动作 |

> **第 4 项为否 → 契约不完备 → `05` 必须修完才允许进入 `06`。**
