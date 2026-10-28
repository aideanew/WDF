---
id: EVD-7020
title: `ads.claim` 服务端实现（ADR-0014 只信客户端 + 日限）
status: accepted
owner: hark
created: 2026-10-28
review: 2026-11-28
---

# EVD-7020 —— `ads.claim` 服务端实现（ADR-0014 只信客户端 + 日限）

- **对应任务**：plan-v010 TASK-7020（`05-slices-and-cards.md`）
- **执行者**：主控
- **独立验收者**：子智能体（防自证循环，结论 **PASS**，完成度 100%）
- **采集时间**：2026-10-28
- **前置裁决**：ADR-0014（accepted，A：只信客户端 + 日限，明确可被刷）、TASK-7003（D-46=A 未开放语义）

## 处置结论（实现，非占位）

`server/src/modules/ads/{service,repo,handlers}.ts` 从 6 行空壳替换为真实实现；
`gateway/handlers.ts` 将 `'ads.claim': todo` 替换为真实 handler；新增 `tests/integration/ads.test.mjs`。

## 关键设计判定（阻塞条件裁决）

**阻塞条件**："`AdClaimRes` 没说'给什么'，若需要发放具体物品而没有 `ad_placements` 的奖励字段 → 停下来，这是数值缺口，不得自编。"

**判定：条件不触发，未自编。** 三个位面（`hook_cooldown`/`offline_double`/`shop_refresh`）发的是**效果**——出钩冷却、离线双倍、商店刷新——**非具体物品**（`ad_placements.csv` 仅 `id,name,daily_cap,note`，无奖励字段；`AdClaimReq{placement}`/`AdClaimRes{granted,remainingToday}` 无"给什么"字段）。
故"需要发放具体物品"为 **假** → 不触发"数值缺口，不得自编"。
`asset` 取值遵循卡内 `asset=<按 placement 决定>` → **`asset = placement`**（位面 id 作计数维度，`delta=1`，`ref=placement`）。发奖即"当日计数 +1"，由 `remainingToday` 反映。

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | 第 cap+1 次同 placement 返回 `3002` | **PASS** | `ads-2`：CAP 次成功后第 CAP+1 次 `res.c===3002` |
| 2 | 跨日后 `remainingToday` 恢复 | **PASS** | `ads-4`：今天耗尽 cap → 3002；未来 serverNow 直调 `granted=true, remainingToday=cap-1`（昨日 cap 不结转） |
| 3 | `remainingToday` 与账本条数互补（`cap - used`） | **PASS** | `ads-1`：claim 后 `remainingToday=cap-1` 且 `countClaimsToday=1` |
| 4 | 未知 placement → `1001` 零副作用 | **PASS** | `ads-3`：`res.c===1001`，count 前后不变 |
| 5 | 同 rid 重放只发一次 | **PASS** | `ads-5`：同 rid 二次返回相同结果，count 仍 1 |

## 反证（独立验收者）

- 幂等由内存 map（同 economy/sell）实现；`rid` 幂等，非"只看一次广告"。
- 契约/迁移/`economy/**` 零改动（`AdClaimReq/Res` 未动，未建表，未摸 economy repo）。
- `tests/contract/handlers.test.mjs` 8→7 todo 同步（该测试自带"实现进展后请同步更新本断言"注释）；`contract.test.mjs` 22 动作表不变；`tests/integration/payload.test.mjs` 载荷校验通过。
- 服务端**不复核**广告是否真看完（ADR-0014 F-1 无服务端回调）——诚实边界，非缺陷。

## 变更清单（单卡）

- `server/src/modules/ads/{service,repo,handlers}.ts`（6 行空壳 → 实现）
- `server/src/gateway/handlers.ts`（`'ads.claim': todo` → 真实 handler + 注释 14→15 已落地）
- `tests/integration/ads.test.mjs`（新增，5 例）
- `tests/contract/handlers.test.mjs`（todo 8→7 同步，必要测试修正）

原始输出：`ads-test.txt` / `contract-test.txt`（handlers+contract+payload，pass 16）/ `typecheck-server.txt`。
