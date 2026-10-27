---
id: ADR-0012
title: 权威背包：服务端影子账本（容差=0）
status: accepted
module: save
owner: hark
created: 2026-10-27
review: 2026-11-27
related: [ADR-0011, PLAN-V003-DS, EXEC-BRIEF-0003]
---

# ADR-0012：权威背包 — 服务端影子账本（容差=0）

## 上下文

M1 存档架构是**客户端权威**：`save.push` 把客户端的完整快照写入云端，服务端只做乐观锁（revision 比对），
不校验物品数量的合理性。这在打捞→入包→合成闭环中是合理的（本地单机玩法，服务端只做同步）。

**问题**：商人回收（`economy.sell`）把物品换成金币。如果服务端不校验物品来源，客户端可以篡改存档
把 `item_0033`（金锭，base_price=24000）改成 999 个，然后全卖给商人刷钱——这在联网收益榜
（`leaderboard.report`）场景下构成作弊。

## 决策

**方案 X：服务端影子账本**（`ledger_entry` 表，已在 `0001_init.sql:44` 建好无写入方）。

服务端维护一份"物品获得流水"，不替代客户端存档，而是作为**卖出上限的校验基准**：

```
              ┌─────────────┐         save.push (snapshot diff)
              │  客户端存档  │ ───────────────────────────────────┐
              │ (modules.    │                                     │
              │  inventory)  │                                     ▼
              └──────┬───────┘                          ┌─────────────────┐
                     │ economy.sell                     │  ledger_entry   │
                     │ {itemId, count}                  │  (只追加流水)    │
                     │                                  │                 │
                     │     ┌────────────────────┐       │  asset  delta   │
                     └────►│  服务端校验逻辑     │◄──────│  reason  ref    │
                           │                    │       │  created_at     │
                           │  Σ(获得) − Σ(卖出) │       └─────────────────┘
                           │  ≥ sell.count ?    │               ▲
                           │                    │               │ salvage.claimInfo
                           │  容差 = 0          │               │ (结算时记获得)
                           └────────┬───────────┘
                                    │
                           ┌────────▼────────┐
                           │  accepted: true │  或  1001 BAD_PAYLOAD
                           │  herbDelta      │      (不一致 + telemetry)
                           └─────────────────┘
```

### 获得来源（两条写入路径）

1. **`salvage.claimInfo` 结算**（TASK-4009）：服务端算出打捞/潜水收益，
   对每个获得的 item 写一条 `delta > 0, reason='salvage'`。
2. **`save.push` 快照 diff**：客户端推送存档时，服务端比对前一份快照的 `modules.inventory`，
   对每个**数量增加**的 item 写一条 `delta > 0, reason='push_diff'`。
   数量减少不记（减少可能是合成消耗，不构成"获得"）。

### 卖出校验（economy.sell handler）

```
sum_gained  = SELECT COALESCE(SUM(delta), 0) FROM ledger_entry
              WHERE player_id = ? AND asset = ? AND delta > 0
sum_sold    = SELECT COALESCE(SUM(delta), 0) FROM ledger_entry
              WHERE player_id = ? AND asset = ? AND delta < 0
available   = sum_gained + sum_sold   -- sum_sold 为负数

if (sell.count > available) → 1001 BAD_PAYLOAD + telemetry.track('economy.shadow_mismatch')
else → 写 delta = -sell.count, reason='sell' → 返回 herbDelta
```

### 容差 = 0

不做容差。理由：
- 客户端权威存档允许篡改，但 **diff 容差窗口内的小额套利**仍会被 `leaderboard.report` 的风控
  （`exceedsHourlyCap`）兜住，收益入榜前有第二道校验。
- 引入容差意味着"允许少量作弊"，与排行榜公正性冲突。
- 容差=0 的代价是**误杀风险**：如果 diff 计算有 bug（如客户端 revision 回退导致 diff 重算），
  合法玩家可能被拒卖。缓解：`telemetry.track('economy.shadow_mismatch')` 上报所有拒卖事件，
  人工复核后可手动补 `ledger_entry` 修正。

### 失败码：1001 BAD_PAYLOAD

不用新码。`1001` 已在 `ERR` 中定义（CONTRACT 段），语义"参数校验失败"。
影子账本不一致本质是"客户端声称的卖出数量与服务端记录不符"，属于契约级校验失败。

### 限购日界

服务端时区 `Asia/Shanghai` 自然日（UTC+8，0 点重置）。
`daily_quota` 表的 `day` 列取 `CURRENT_DATE AT TIME ZONE 'Asia/Shanghai'`。

### 回滚方案

加一个 env 开关 `WDF_SHADOW_LEDGER=off`（默认 on）。关闭时 `economy.sell` 跳过影子校验，
只做限购检查。用于：
- 紧急上线后发现 diff 计算有 bug，需要临时关闭校验；
- 测试环境需要自由刷物品。

关闭时 `ledger_entry` 仍正常写入（sell 记录不丢），只是不校验——重开后历史数据有效。

## 考虑过的替代方案

### 方案 Y：服务端全量权威背包（弃）

把 `modules.inventory` 的权威从客户端移到服务端：每次物品变动都走服务端接口，
客户端只读不写。

**反对强度：足以弃**：
- M1 存档契约（`save.push/pull/resolveFork`）全部重写，save 模块从"快照同步"变成"增量操作日志"；
- 打捞/合成/开锁全部改成服务端 RPC（目前是本地纯函数），离线游玩不可行；
- M1 已交付的 `HookModel.applyToSave` / `CraftingModel.applyToSave` 全部废弃。

方案 X 不改存档权威模型，向后兼容，是实现成本最低的防作弊手段。

## 后果

- `ledger_entry` 表开始有写入方（TASK-4006 实现 sell + push diff，TASK-4009 实现 salvage）。
- `save.push` handler 需要比对前后快照写 diff（TASK-4006 S-406.4）。
- 客户端 `economy.sell` 失败时收到 `1001`，`toUxState(1001)` → `error, retryable:false`，
  界面显示"操作失败"（不重试，因为重试也不会通过校验）。
