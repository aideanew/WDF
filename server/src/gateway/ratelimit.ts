/**
 * ⛔ 未实现：网关限流 —— 见 docs/03_solution/data/gateway-gaps.md
 *
 * 本文件曾导出 `MIDDLEWARE = 'ratelimit'` 并写着「按玩家与 IP 的令牌桶；赶海开场单独配额」，
 * 但**全仓零引用、零实现**。移除了那个常量：它唯一的作用是让 `grep MIDDLEWARE` 命中，
 * 让人误以为限流已存在 —— 属于误导性代码（编号 F-42b，P1 安全）。
 *
 * 真实风险（2026-10-27 实测）：
 *  - `account.login` 与 `telemetry.track` 在 `ACTIONS` 里都是 `auth: false`，
 *    **没有令牌 → 没有 player 维度约束 → 任何人可无限调用**。
 *  - `telemetry.track` 会写 `audit_log`，属资源耗尽型风险。
 *  - `leaderboard` 的「同 player 间隔过短 → 4001」是**业务级频控**，不能替代网关级限流。
 *
 * 实现前须先裁决（`docs/04_planning/plan-v009/05-pending-decisions.md` 裁决 1）：
 *  1. 是否纳入 v1.0；
 *  2. 两个动作的阈值（按请求数还是事件数）。
 * 「赶海开场单独配额」在设计源里**没有数值** —— 拿到数值前不得自行编造。
 */

export {};
