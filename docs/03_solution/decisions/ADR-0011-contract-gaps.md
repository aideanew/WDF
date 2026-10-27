---
id: ADR-0011
title: 契约缺口与解冻申请（回收动作 / 绑定票据错误码 / 赶海 ops 载体）
status: accepted
owner: hark
created: 2026-10-26
review: 2026-11-09
related: [ADR-0003, MUST-11, MUST-02, MUST-10, ERR, DESIGN-0001]
---

# ADR-0011：契约缺口与解冻申请

## 背景

plan-v002 收官后对 `packages/contracts/**`、`server/src/**`、`docs/02_requirements/functional-analysis.md` 做了三方对照，
发现 **3 处契约缺口**。它们不是"待实现"，而是"契约里根本没有这个动作/字段/码"，若由执行者自行发明，
必然造成客户端与服务端口径分裂。本 ADR 只做**登记与选项并列**，状态 `proposed`，**待用户裁决后方可解冻契约**。

事实来源（逐条可核）：
- `packages/contracts/src/common/actions.ts`：20 个动作，**无任何 sell/回收动作**
- `docs/02_requirements/functional-analysis.md:41`：`economy` 明确要求"回收价=原价×50%、各地 ±30%、商人限购"，
  且"存档+服务器流水"→ 说明回收**涉及服务端权威**
- `server/db/migrations/0001_init.sql:44`：`ledger_entry` 表已存在（竞争资产流水，只追加），但**没有任何动作写入它**
- `server/src/modules/save/service.ts:119`：绑定票据失败复用 `NOT_LOGGED_IN(2001)`
- `server/db/migrations/0001_init.sql:76`：`event_session` **无 ops 字段**，`event.submit` 的 `ops[]` 无落库载体

## 缺口 1：回收（sell）动作缺失

**现状**：`game-core/economy` 已有纯函数 `recyclePrice(basePrice, regionBp)`（10 行，真实实现），
`prices.csv` 106 行含 `base_price/recycle_bp`，但**契约里没有 `economy.sell`**，客户端无处上报回收。

| 选项 | 内容 | 代价 | 风险 |
|---|---|---|---|
| A | 新增 `economy.sell{itemId,count}` 动作 + 写 `ledger_entry` + 校验本地库存与服务端一致 | 契约解冻 + 1 handler + 1 集成测试 | 服务端无权威背包（存档以客户端 push 为准），校验只能"事后复核"，无法事前阻止刷钱 |
| B | 回收纯本地（不进服务端），仅 `leaderboard.report` 上报有效价值 | 零契约改动 | 与 MUST-11"服务端权威"冲突；刷回收可刷榜 |
| C | 本轮不做回收，等 `merchants/limits` 数值与权威背包方案一起定 | 零改动，功能缺失 | 经济闭环缺一角，v1.0 演示不完整 |

**倾向（非结论）**：C 优于 A/B。理由：A 的"服务端权威"在无权威背包前是假的；B 直接违反 MUST-11。
本项**已裁决**：采用方案 A 的变体，已在 TASK-4006 期间新增了 `economy.sell`。

## 缺口 2：绑定票据错误码（2004 未冻结）

**现状**：`ERR` 只有 14 码，无"票据无效"专用码；AT-2201 复用 2001 并在 `error-catalog.md` 登记。
副作用：客户端收到 2001 会拉登录，而不是提示"重新发起绑定"，UX 语义错误（见 DESIGN-0001 §2）。

| 选项 | 内容 | 代价 |
|---|---|---|
| A | 解冻新增 `BIND_TICKET_INVALID = 2004`，`account.bindConfirm` 改返回 2004 | 改 1 码 + handler 1 行 + 测试 1 处 + 客户端映射 1 行 |
| B | 维持复用 2001，客户端按 `action` 分支特殊处理 | 零契约改动，但把语义歧义转嫁到 UI 层 |

**已裁决**：采用方案 A，已在 TASK-4015 中执行解冻并新增 2004。

## 缺口 3：赶海 ops 载体缺失

**现状**：`EventSubmitReq.ops: EventOp[]` 已冻结，`event_session` 表**无 ops/结算字段**（只有 `total_value`、`settled_at`）。
赶海属 v1.1（10-23 12:27 已定），本轮不实现，但契约与表结构不一致必须在**做 v1.1 前**解决。

| 选项 | 内容 |
|---|---|
| A | 新增 `0002_event_ops.sql`（`session_ops jsonb` 或独立表 `event_op`），迁移串行执行 |
| B | 不动表，`ops` 只做请求内校验后即弃（服务端复算不落库）——代价是无法申诉与复盘 |

## 决策

- **未裁决**。三项均标 `proposed`，不进入本轮任何任务卡的"允许修改"范围。
- 本轮所有任务卡显式禁止修改 `packages/contracts/src/common/actions.ts` 与 `errors.ts`（TASK-3001 仅新增 `ux.ts`）。

## 后果

- 不解冻：回收不进 v1.0 演示；绑定票据错误语义保持"复用 2001"；赶海延后。
- 解冻：需用户明确授权，并按 `change-playbook.md` 联动更新契约测试、`error-catalog.md`、客户端生成副本。
