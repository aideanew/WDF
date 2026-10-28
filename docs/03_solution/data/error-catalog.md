---
id: DATA-0005
title: 错误码对照表（手维护）
status: active
owner: hark
created: 2026-10-26
review: 2026-11-26
---

# 错误码对照表

> 单一可读来源：本表与 `packages/contracts/src/common/errors.ts` 的 15 个错误码**一一对应**。
> 另有**事实码 `3101`**（不在 ERR，见下）——登记而非新增，因契约冻结期且无客户端消费者。
>
> **落点说明（辩证修正 AT-2001）**：原 AT 计划把错误表写入 `docs/03_solution/data/api-catalog.md`，
> 但 `api-catalog.md` 由 `tools/gen/catalog.mjs` 第 18 行**整文件覆盖生成**（仅输出动作表），
> 手补内容会在下次 `npm run gen` 被抹掉。同目录已有 `config-tables.md / db-schema.md / save-schema.md`
> 等手维护范式，故错误码可读映射单独落在此文件，避免被生成脚本覆盖，同时仍满足
> "15 个错误码每个至少对照 1 条失败路径与前端文案" 的契约补缺目标。

| 错误码 | 名称 | 分段 | 触发条件（失败路径） | 前端文案 | 相关动作 |
|---:|---|---|---|---|---|
| 1001 | BAD_PAYLOAD | CONTRACT | 请求体不符合 zod schema | 请求格式有误，请重试 | 全部动作 |
| 1002 | UNKNOWN_ACTION | CONTRACT | 动作名不在 `ACTIONS` 登记 | 未知的操作请求 | 全部动作 |
| 2001 | NOT_LOGGED_IN | AUTH | 需要登录但未带有效会话 | 请先登录 | 全部需登录动作 |
| 2002 | SESSION_EXPIRED | AUTH | 令牌过期且 refresh 失败 | 登录已过期，请重新登录 | 全部需登录动作 |
| 2003 | BANNED | AUTH | 账号被封禁 | 账号已被封禁，请联系客服 | 全部动作 |
| 2004 | BIND_TICKET_INVALID | AUTH | 绑定票据无效（不存在/过期/已用/自绑/无身份） | 绑定票据无效，请重新发起绑定 | account.bindConfirm |
| 2101 | MINOR_TIME_LIMIT | AUTH | 未成年人防沉迷时段/时长限制 | 未成年人当前时段不可游玩 | compliance.check 等 |
| 3001 | DUPLICATE_REQUEST | RULE | 相同 `rid` 的写操作重复提交 | 操作已处理，请勿重复 | 幂等写动作 |
| 3002 | QUOTA_EXHAUSTED | RULE | 区服每日限量已售罄 | 今日已售罄 | economy.buyQuota |
| 3201 | EVENT_CLOSED | RULE | 赶海场次未开放（非 20:00-21:00） | 本场赶海已结束 | event.start |
| 3202 | EVENT_ALREADY_PLAYED | RULE | 当日已参与过赶海 | 今日已参与过赶海 | event.start |
| 3101 | RULE_REFUSED | RULE | 规则拒绝：承重不足 / 浮力不足。**事实码，不在 ERR**（game-core 本地判定，拒绝信息只用于 UI 文案，无客户端符号消费） | 承重/浮力不足 | hook.pullBack / raft.checkChange |
| 4001 | RATE_LIMITED | SYSTEM | 触发频率限制：网关 IP 维度固定窗口（`auth:false` 动作，`gateway/ratelimit.ts`）或业务级频控（榜单上报间隔） | 操作过于频繁，请稍后再试 | 全部 `auth:false` 动作 / leaderboard.report / telemetry.track |
| 4999 | INTERNAL | SYSTEM | 服务端未实现或内部错误（未实现动作也返回此码，见 AT-2401） | 服务暂时不可用 | 全部动作 |
| 5001 | REVIEW_PENDING | RISK | 内容在审核中 / 复核不一致 | 内容审核中 | event.submit / social.send |
| 9001 | CLIENT_TOO_OLD | UPGRADE | 客户端版本过低需更新 | 请更新到最新版本 | config.manifest / 全部动作 |

> **已登记缺口（AT-2201，2026-10-26）**：合同冻结仅 14 码，无专用"绑定票据无效"码；`TASK-1401`
> 纪律禁止自造数字，故票据失败（不存在/过期/已用/自绑/无身份）统一复用 **2001**（AUTH 段，
> 客户端回登录重来即可恢复，不会像 2002 那样触发静默刷新死循环）。若未来合同解冻，
> 建议新增 `2004 BIND_TICKET_INVALID` 精确区分。
>
> **缺口解冻（TASK-4015，2026-10-27）**：已新增 `2004 BIND_TICKET_INVALID` 精确区分绑定票据无效的场景。
>
> **事实码 3101（plan-v010 TASK-7002 / G-1，2026-10-28）**：`3101` 在两处被使用但**不在 ERR**
> （`hook/index.ts` 承重、`raft/index.ts` 浮力）。契约冻结期不新增码：`3101` 无客户端消费者
> （两处都在 game-core 本地判定，拒绝信息只用于 UI 文案），**收益为零、代价为正** → 只登记不改。
> 若未来解冻契约，建议并入通用「前置条件不足」码（见 plan-v010 `04 §2 G-2`）。
