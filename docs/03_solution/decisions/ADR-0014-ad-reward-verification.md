---
id: ADR-0014
title: 广告奖励的防作弊与发奖口径（服务端不复核广告是否真看完）
status: accepted
owner: hark
created: 2026-10-28
review: 2026-11-11
related: [PLAN-V010-07, ADR-0012, D-48]
---

# ADR-0014：广告奖励的防作弊与发奖口径

> **状态 `accepted`（2026-10-28）：选 A（只信客户端完成 + 日限），明确这是可被刷的。**
> 本 ADR 不接任何服务端广告回调——因为**不存在**。

## 0. 决策摘要

- **服务端不复核广告是否真看完**（见 §1 事实：无服务端回调机制）。
- 发奖口径：**只信客户端上报"已看完" + 服务端按 `daily_cap=3` 计数**（按 `ledger_entry` 当日 `reason='ads.claim'`，复用 `economy.sell` 的流水策略，`04 §3.1`）。
- **诚实声明**：这是**可被刷的**——作弊者可直接调 `ads.claim` 伪造"看完"，服务端无法分辨。
- `adUnitId` 来源：**构建期常量**（D-48=B，`ad.config.ts` 且 gitignore，不入库）。

## 1. 事实基线（不得凭记忆，可核）

| # | 事实 | 证据 |
|---|---|---|
| F-1 | 微信激励视频广告（`wx.createRewardedVideoAd`）**无服务端验证回调**：客户端只能拿到 `onLoad` / `onClose(res.isEnded)` / `onError` / `onShow` 等**客户端事件**，SDK 不提供"服务端确认看完"的接口 | 微信小游戏广告 API 面；现有 `WechatPlatform.ts:11` 只 `return 'no-fill'`（桩），其 TODO 注明"createRewardedVideoAd 复用实例" |
| F-2 | 当前 `WechatPlatform.showRewardedAd` 恒返回 `'no-fill'`（桩，未接真广告） | `client/assets/scripts/platform/wechat/WechatPlatform.ts:11` |
| F-3 | `ad_placements.csv` 只有 `id/name/daily_cap`，**无 `adUnitId` 列** | `game-data/source/ad_placements.csv` |
| F-4 | 服务端 `ads.claim` 是 todo（返回 4999 + FEATURE_NOT_AVAILABLE） | `server/src/gateway/handlers.ts` todo 表 |

## 2. 选项分析

| 选项 | 内容 | 作弊成本 | 封号可查性 | 代价 |
|---|---|---|---|---|
| **A. 只信客户端 + 日限** | 客户端上报"看完"，服务端按日限 3 计数发奖 | **低**（改客户端直接调 claim） | 低（服务端无证据） | 零额外机制；`remainingToday` 用流水计数 |
| **B. 加时长校验** | 客户端上报 `startedAt`，服务端拒绝过短（如 <15s） | 中（伪造 `startedAt` 即可绕过） | 中 | 需改契约（`AdClaimReq` 加字段）+ 客户端传时间戳；仍可被伪造 |
| **C. 不接广告** | v1.0 不做激励视频 | — | — | 放弃 M-6；但 M-6 是 MUST |

## 3. 为什么选 A（非结论的说明）

- **B 的"时长校验"是假的**：作弊者只需在 `startedAt` 里填过去的时间，校验形同虚设；代价却要改冻结契约。
- **C 放弃 M-6**：`mvp-scope.md` 把激励视频列为 MUST，放弃它等于重定义 v1.0 范围。
- **A 的唯一真实防线是日限**（每天 3 次，超发不了）；日限本身能挡住"刷资源"型滥用，挡不住"刷自己进度"。
- 因此选 A 并**如实写明"可被刷"**，不美化；封号/风控留给未来（若微信未来提供服务端确认，再升 B'）。

## 4. 到期/回访条件

- **触发**：微信未来提供激励视频服务端回调接口，或出现大规模刷奖（需风控）时。
- **回访动作**：重开本 ADR，评估是否引入服务端校验（此时再考虑改契约）。
- **在此之前**：`ads.claim` 只信客户端 + 日限；`adUnitId` 走构建期常量（D-48=B）。
