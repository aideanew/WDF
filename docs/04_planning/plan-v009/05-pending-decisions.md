---
id: PLAN-V009-05
title: plan-v009 · 待裁决事项
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
---

# 05 · 待裁决事项

> ## ✅ 两项均已裁决并落地（2026-10-27 20:56，「按照你的建议，开始执行」）
>
> | 裁决 | 结论 | 落地 |
> |---|---|---|
> | **裁决 1 · 限流** | 选 **B**：只做「最小可用」，覆盖**全部 `auth:false` 动作**（不止原计划的 2 个——`account.refresh` 与 `config.manifest` 同样是 `auth:false`，漏掉等于没堵）。IP 维度固定窗口，默认 10 QPS，`config.manifest` 内置 20 QPS。阈值走 env，可**不改代码**收紧/关闭。 | TASK-6007 · `server/src/gateway/ratelimit.ts` + `tests/integration/ratelimit.test.mjs`（8 例） |
> | **裁决 2 · `cfg` 回传** | 选 **A**：只回 `string`（零契约变更），**只做提示不拒请求**。每次现算，不进幂等缓存。 | TASK-6008 · `server/src/gateway/version.ts` + `tests/integration/cfg-hint.test.mjs`（5 例） |
>
> **两处与原建议的偏差**（都在执行中发现，记录在此）：
> 1. **限流覆盖面从"2 个动作"扩到"全部 `auth:false` 的 4 个"**。原建议只点 `account.login` / `telemetry.track`，
>    实测 `account.refresh`（要做 HMAC 验签/签发）与 `config.manifest`（查 `config_release`）也是 `auth:false` ——
>    只堵两个等于留两个。
> 2. **阈值从"60/min"改为"600/min"**。原因：国内运营商 CGNAT 下一个公网 IP 可能承载成百上千玩家，
>    60/min 会直接让 NAT 后的正常玩家进不去游戏。**误杀正常玩家的代价远大于多放几个脚本请求。**
>    运维可随时用 `WDF_RL_DEFAULT_PER_MIN` 收紧，不需要改代码。
>
> 下面保留**裁决前的原文**，作为决策依据存档。

---

## 裁决 1：限流（F-42b）是否纳入 v1.0？（已裁决：B）

**现状事实**：
- `server/src/gateway/ratelimit.ts` 全文只有两行（注释 + `export const MIDDLEWARE = 'ratelimit'`），**全仓零引用** → 限流完全没实现。
- `telemetry.track` 在 `ACTIONS` 里是 `auth: false`，测试 `tests/integration/telemetry` 明确覆盖「无令牌可上报」。
- `account.login` 同理（登录前，无令牌）。
- 现有的唯一限流相关逻辑在 `leaderboard`：`tests` 里「AT-2203 超频 → 4001（同 player 间隔过短）」，属于**业务级**频控，不是网关级。

**问题的实质**：
无限流 → 任何人可无限调用 `telemetry.track`（写 `audit_log`）与 `account.login`（写身份映射）。这是**资源耗尽型**风险，成本极低。

**三个选项**：

| 选项 | 内容 | 代价 | 适用 |
|---|---|---|---|
| **A** | v1.0 不做，登记为已知风险，上线前靠微信侧网关兜底 | 零成本，但风险明确存在 | 若 10-30 前只剩软著提交，且内测灰度 |
| **B** | 只做「最小可用」：对 `auth:false` 的两个动作（`account.login` / `telemetry.track`）做 IP 维度固定窗口限流 | 半天；需定窗口与阈值 | **推荐** |
| **C** | 完整令牌桶（按 player + IP + 赶海单独配额） | 数天；且「赶海开场单独配额」在设计源**没有数值** | v1.1 |

**若选 B，需要裁决的两个数值**（我不自编）：
1. `account.login`：每 IP 每分钟允许多少次？
2. `telemetry.track`：每 IP 每分钟允许多少条？（注意：客户端批量上报，单次可带多事件，阈值按「请求数」还是「事件数」？）

**我的建议**：B，且两个阈值都取「宁可松」的值（例如 60/min），先堵住"无限"，再谈精细。理由是 v1.0 的目标是**不被一脚本打挂**，不是精确配额。

---

## 裁决 2：`RpcResponse.cfg` 回传（F-42a）要不要实现？（已裁决：A）

**现状事实**：
- 契约 `common/envelope.ts:22` 声明 `RpcResponse` 成功分支有 `cfg?: string`。
- `gateway/version.ts` 注释承诺：「configVersion 不一致 → 响应附带最新 cfg」。
- 实测 `grep -rn "cfg:" server/src` → **零命中**。该字段从未被赋值。
- 客户端 `RpcClient.ts:81` **确实在发** `cfg: CONFIG_VERSION`。

**问题**：客户端发、服务端收、契约声明、注释承诺，**唯独没人实现**。这是第 2 次"校验存在但接收端不处理"（见 `04` §1）。

**但实现它需要先定语义**，三种可能：

| 选项 | 语义 | 客户端怎么用 | 代价 |
|---|---|---|---|
| **A** | 只回 `string`：最新 `configVersion` | 比对自身，不一致就重新拉 `config.manifest` | 最小，且与现有字段类型 `string` 一致 |
| **B** | 回整个 `ConfigManifestRes` | 直接热更 | 要改字段类型（`cfg?: string` → `cfg?: ConfigManifestRes`），**契约变更** |
| **C** | 不回传，改为不一致时返回错误码 | 客户端被迫走 `config.manifest` | 要新增错误码，**契约冻结期不可行**（14 码已冻结） |

**我的建议**：**A**。理由：
- 字段类型已是 `string`，零契约变更（冻结期重要）。
- 客户端已有 `config.manifest` 这条完整链路（含 `packUrl`），只需要一个"该重新拉了"的信号。
- 实现点单一：在 `rpc.ts` 返回前，若 `req.m.cfg !== 当前 configVersion`，给成功响应补 `cfg`。

**但有一个必须先回答的问题**：
> **configVersion 不一致到底该不该影响业务结果？**
> 现状：不影响（服务端完全不看）。若接上之后只做"提示"，那它就是个 hint；
> 若要做成"不一致就拒"，那是行为变更，需要 ADR。

**我倾向：只做 hint，不拒请求。** 理由：`configVersion` 不一致意味着客户端配置旧了，但**旧配置下算出来的结果未必错**（比如只是多了一件物品）。拒绝请求会让所有未及时更新的玩家无法游戏，代价远大于收益。真正的硬约束应该由**存档 schema 版本（`sv`，F-42c）**承担，而不是配置版本。

---

## 附：本版不做但已登记的事项（承接 v008）

| 项 | 编号 | 状态 | 说明 |
|---|---|---|---|
| `chests` 表把 `lock`/`smashable` **实例属性**当**箱型属性** | F-38 | 未修 | 现在全 `none`/全 `true` 看不出问题；一旦支持装锁，同一个 `chest_wood` 会有"能砸/不能砸"两态，配置表无法表达。**开锁前置** |
| `prices.recycle_bp` 列名不符实（实为绝对回收价） | F-41 | 未修 | 与 F-38 一起做（都是表结构变更，需要一次迁移） |
| `economy/service.ts` 的 `MERCHANTS` 硬编码 | — | 未修 | 注释自承"后续改读 merchants 表"。schema 收紧 + `sellValue` 钳制后不会越界，但**配置与代码双源**仍在 |
| 剩余手写按钮 | — | 未做 | `MerchantPanel` / `LeaderboardPanel` / `SettingsPanel` / `GuideOverlay` 仍手写（`addButton` 已抽好，只差替换） |
| `next:'login'` 的落地出口 | — | 未做 | 需独立登录面板；面板层现在只能"提示 + 重试" |
| 6 段人工录屏 | — | 未做 | **需 Cocos 运行时，沙箱跑不了**，只能真机/编辑器手录 |
| 事实卡（`FACT-CARD.md` 由 `gen` 生成） | 新 | 提议 | 见 `04` §4，治 F-45 的根。建议 v010 |
