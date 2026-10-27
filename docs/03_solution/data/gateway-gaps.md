---
id: SOL-gateway-gaps
title: 网关未实现能力登记（限流 / cfg 回传 / sv 校验）
status: active
owner: hark
created: 2026-10-27
review: 2026-11-27
---

# 网关未实现能力登记

> **本文件存在的理由**：2026-10-27 实测发现，`server/src/gateway/` 下有两个文件**只有注释 + 一个无人引用的常量**，
> 看起来"有这个中间件"，实际零实现。在此之前，`plan-v008` 甚至把「版本闸」整体登记为"零实现"——**两头都错**：
> 版本闸是真的，限流是假的，而两个文件长得一模一样。
>
> **判据（写进规范）**：判定"某功能没实现"或"某功能已实现"，都必须 `grep` 关键符号全仓，不能只看它"应该在"的那个文件。

## 1. 已实现（不要重复实现）

| 能力 | 位置 | 证据 |
|---|---|---|
| 客户端版本闸（`cv` 低于 `minClientVersion` → `9001`） | `server/src/gateway/rpc.ts:36-41` | `tests/integration/auth.test.mjs:211` |
| 版本闸的鉴权前位置 | `rpc.ts:32-41` 位于 `verifyToken` 之前 | 注释明写「旧客户端连登录都不该放进来」 |
| `config.manifest` 从版本闸豁免 | `rpc.ts:19` `VERSION_GATE_EXEMPT` | 防死锁：客户端要靠它知道该升到哪个版本 |
| 幂等（`(player_id, rid)`，只缓存 `c===0`） | `gateway/idempotency.ts` + `rpc.ts:53-64` | `tests/integration` 幂等重放用例 |
| payload schema 校验 | `gateway/payload.ts` | `tests/contract` E-07 用例 |

## 2. 未实现（F-42a / F-42b / F-42c）

### F-42b · 限流 —— **零实现**（P1，安全）

- **现状**：`server/src/gateway/ratelimit.ts` 只有注释 + `export const MIDDLEWARE = 'ratelimit'`，**全仓零引用**。
- **风险**：`account.login` 与 `telemetry.track` 都是 `auth: false`（登录前 / 无令牌可上报），
  **没有令牌 → 没有 player 维度约束 → 任何人可无限调用**。`telemetry.track` 会写 `audit_log`，属资源耗尽型风险。
- **注意**：`leaderboard` 里的「同 player 间隔过短 → 4001」是**业务级频控**，不是网关级限流，不能替代。
- **需要先裁决**（见 `plan-v009/05-pending-decisions.md` 裁决 1）：
  1. 是否纳入 v1.0；
  2. `account.login` 与 `telemetry.track` 的阈值（按请求数还是事件数）。
- **设计源状态**：「赶海开场单独配额」这句话在 `ratelimit.ts` 注释里出现，但**设计源没有对应数值**。
  在拿到数值前不得自行编造配额。

### F-42a · `RpcResponse.cfg` 回传 —— **未实现**（P2）

- **契约声明**：`packages/contracts/src/common/envelope.ts:22` 成功分支有 `cfg?: string`。
- **`version.ts` 注释承诺**：「configVersion 不一致 → 响应附带最新 cfg」。
- **实测**：`grep -rn "cfg:" server/src` → **零命中**。该字段从未被赋值。
- **客户端确实在发**：`client/assets/scripts/services/net/RpcClient.ts:81` `cfg: CONFIG_VERSION`。
- **形态**：发得出去、声明得出、注释写得下，**唯独没人实现**。这是本项目第 2 次"检查存在但接收端不处理"。
- **需要先裁决**（`plan-v009/05` 裁决 2）：回 `string`（现字段类型）还是整个 manifest（契约变更）；
  以及「不一致」要不要影响业务结果。
- **倾向**：只做 hint（回 `string`），**不拒请求**。理由：旧配置算出的结果未必错，拒绝会让未及时更新的玩家无法游戏；
  真正的硬约束应由存档 schema 版本（F-42c）承担。

### F-42c · `m.sv`（存档 schema 版本）—— **从未读取**（P2）

- **契约声明**：`common/envelope.ts:11`「本地存档 schema 版本」。
- **实测**：`save/service.ts` 只从 `body.schemaVersion` 取，**不看 `m.sv`**。
- **后果**：客户端上报的 schema 版本与存档 body 里的可以不一致，服务端只信 body。
  这本身不算错（body 是权威），但**契约字段与实现不一致**会让接手者以为服务端做了双源校验。

## 3. 已清理的误导性代码

2026-10-27：`ratelimit.ts` 与 `version.ts` 的 `export const MIDDLEWARE` 已改为带显式未实现标记的注释块。
原写法的问题：`grep MIDDLEWARE` 会命中，让人误以为中间件已存在（另有一个 `ratelimit.ts` 的兄弟文件同样如此）。

**同类风险清单**（以后加中间件时避免）：

- 只写常量不写实现的"占位中间件"。
- 契约里有字段、服务端从不读的（`cfg` / `sv`）。
- 表里有列、运行时从不消费的（`chests.item_id` 曾是这类，已于 `1fd7364` 接入）。
