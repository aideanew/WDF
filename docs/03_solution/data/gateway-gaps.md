---
id: SOL-gateway-gaps
title: 网关能力登记（限流 / cfg 回传 / sv 校验）
status: active
owner: hark
created: 2026-10-27
review: 2026-11-27
---

# 网关能力登记

> **本文件存在的理由**：2026-10-27 实测发现，`server/src/gateway/` 下曾有两个文件**只有注释 + 一个无人引用的常量**，
> 看起来"有这个中间件"，实际零实现。在此之前，`plan-v008` 甚至把「版本闸」整体登记为"零实现"——**两头都错**：
> 版本闸是真的（实现搬到了 `rpc.ts`），限流是假的，而两个文件长得一模一样。
>
> **判据（写进规范）**：判定"某功能没实现"或"某功能已实现"，都必须 `grep` 关键符号全仓，不能只看它"应该在"的那个文件。
> **文件内容为空 ≠ 功能为空，功能会搬家。**

---

## 1. 已实现

| 能力 | 位置 | 证据 |
|---|---|---|
| 客户端版本闸（`cv` 低于 `minClientVersion` → `9001`） | `gateway/rpc.ts:36-41` | `tests/integration/auth.test.mjs:211` |
| 版本闸的鉴权前位置 | `rpc.ts` 中位于 `verifyToken` 之前 | 注释明写「旧客户端连登录都不该放进来」 |
| `config.manifest` 从版本闸豁免 | `rpc.ts` `VERSION_GATE_EXEMPT` | 防死锁：客户端要靠它知道该升到哪个版本 |
| 幂等（`(player_id, rid)`，只缓存 `c===0`） | `gateway/idempotency.ts` + `rpc.ts` | `tests/integration` 幂等重放用例 |
| payload schema 校验 | `gateway/payload.ts` | `tests/contract` E-07 用例 |
| **网关限流（IP 维度固定窗口，`auth:false` 动作）** | **`gateway/ratelimit.ts`** | `tests/integration/ratelimit.test.mjs` **8 例**（2026-10-27，F-42b） |
| **`cfg` 版本提示回传** | **`gateway/version.ts` + `rpc.ts`** | `tests/integration/cfg-hint.test.mjs` **5 例**（2026-10-27，F-42a） |

### 1.1 限流口径（F-42b，2026-10-27 裁决 1 落地）

- **只覆盖 `auth: false` 的动作**：`account.login` / `account.refresh` / `telemetry.track` / `config.manifest`。
  有令牌的动作已有 player 维度约束，再叠 IP 维度只会误伤 NAT 后的正常玩家，收益为负。
- **固定窗口，不是令牌桶**。MVP 目标是把「无限」变成「有上限」，不追求精确配额。
- 阈值：默认 **600 次/分钟**（10 QPS）；`config.manifest` 是启动必经路径，内置默认 **1200**（20 QPS）。
  优先级：动作级 env `WDF_RL_<ACTION>_PER_MIN` > 全局 env `WDF_RL_DEFAULT_PER_MIN` > 内置动作默认 > 内置默认。
  **全局 env 故意压过内置动作默认**：运维写「全部收紧到 30」时，启动路径不能留后门。
- **`0` 才是显式关闭**；非法值（`abc` / 负数 / 空白）回落默认 —— 写错配置不等于关防护。
- **拿不到 IP 就不限流**（不误杀优先）。IP 没透传是部署层问题，应在网关层修。
- 已知限制：
  - **单进程内存**（与 `leaderboard/service.ts` 的内存限频器同一档）。多实例部署时实际阈值 = N × 单实例阈值。
    升级条件：出现第二个实例 → 换 Redis（与 leaderboard 同步升）。
  - **IP 维度在 CGNAT 下天然有误伤上限。** 真解是按 `plat + openid` 或设备 id 维度，
    但那需要契约在 `RequestMeta` 加字段（契约冻结期，不做）。
  - 不做 IPv6 `/64` 前缀聚合：一个攻击者可轮换地址。v1.1 再说。

### 1.2 `cfg` 回传口径（F-42a，2026-10-27 裁决 2 落地）

- **只做提示，不拒请求。** 客户端 configVersion 旧了，但旧配置算出的结果**未必错**
  （可能只是少了一件物品）。拒绝会让未及时更新的玩家直接无法游戏，代价远大于收益。
- 字段类型保持 `string`（契约 `RpcResponse.cfg?: string` 原样），不改整个 manifest —— 契约冻结期。
  客户端拿到不一致信号后自己去拉 `config.manifest`，那里才有 `packUrl` 能做热更。
- 只修饰 `c === 0` 的响应；一致时字段不出现；服务端拿不到版本时不瞎补。
- **实现上踩过的坑（写下来免得重踩）**：
  1. hint 必须**现算**，不能进幂等缓存 —— 否则一条 24h 前的缓存会把当时的版本当"最新"回给客户端；
  2. 幂等命中是 `return hit` **提前返回**，会绕过末尾统一加 hint 的那段 —— 两条返回路径都要经过 `withCfgHint()`。
  这两点各由 `cfg-hint.test.mjs` 的第 5 例钉住。

---

## 2. 仍未实现

### F-42c · `m.sv`（存档 schema 版本）—— **从未读取**（P2）

- **契约声明**：`common/envelope.ts`「本地存档 schema 版本」。
- **实测**：`save/service.ts` 只从 `body.schemaVersion` 取，**不看 `m.sv`**。
- **为什么没顺手做**：这不是"补个校验"那么简单。让 `sv` 生效意味着**存档兼容性策略**：
  客户端 sv 高/低于服务端支持范围时，是拒、是迁移、还是降级？三种都要动 `save` 的乐观锁语义，
  属行为变更，需要 ADR。**在拿到口径前不做**，否则等于自造一套兼容规则。
- **倾向**：由服务端持有一个 `SUPPORTED_SV` 范围，`sv` 超出范围 → `9001`（与客户端版本闸同码，
  语义都是"你需要更新"）。这条留给 v010，先登记。

---

## 3. 已清理的误导性代码

2026-10-27（commit `13fac21`）：`ratelimit.ts` 与 `version.ts` 的 `export const MIDDLEWARE` 已移除。
原写法的问题：`grep MIDDLEWARE` 会命中，让人误以为中间件已存在。

**同类风险清单**（以后加能力时避免）：

- 只写常量不写实现的"占位模块"。
- 契约里有字段、服务端从不读的（`cfg` 曾是这类，已于本次接入；`sv` 仍是）。
- 表里有列、运行时从不消费的（`chests.item_id` 曾是这类，已于 `1fd7364` 接入）。
- **新自查**：任何"看起来存在"的能力，都要有一条测试能把它打成红灯。没有红灯的检查不算存在。
