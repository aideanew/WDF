---
id: DATA-0005
title: 错误码对照表（手维护）
status: active
owner: hark
created: 2026-10-26
review: 2026-11-26
---

# 错误码对照表

> 单一可读来源：本表与 `packages/contracts/src/common/errors.ts` 的 14 个错误码**一一对应**。
>
> **落点说明（辩证修正 AT-2001）**：原 AT 计划把错误表写入 `docs/03_solution/data/api-catalog.md`，
> 但 `api-catalog.md` 由 `tools/gen/catalog.mjs` 第 18 行**整文件覆盖生成**（仅输出动作表），
> 手补内容会在下次 `npm run gen` 被抹掉。同目录已有 `config-tables.md / db-schema.md / save-schema.md`
> 等手维护范式，故错误码可读映射单独落在此文件，避免被生成脚本覆盖，同时仍满足
> "14 个错误码每个至少对照 1 条失败路径与前端文案" 的契约补缺目标。

| 错误码 | 名称 | 分段 | 触发条件（失败路径） | 前端文案 | 相关动作 |
|---:|---|---|---|---|---|
| 1001 | BAD_PAYLOAD | CONTRACT | 请求体不符合 zod schema | 请求格式有误，请重试 | 全部动作 |
| 1002 | UNKNOWN_ACTION | CONTRACT | 动作名不在 `ACTIONS` 登记 | 未知的操作请求 | 全部动作 |
| 2001 | NOT_LOGGED_IN | AUTH | 需要登录但未带有效会话 | 请先登录 | 全部需登录动作 |
| 2002 | SESSION_EXPIRED | AUTH | 令牌过期且 refresh 失败 | 登录已过期，请重新登录 | 全部需登录动作 |
| 2003 | BANNED | AUTH | 账号被封禁 | 账号已被封禁，请联系客服 | 全部动作 |
| 2101 | MINOR_TIME_LIMIT | AUTH | 未成年人防沉迷时段/时长限制 | 未成年人当前时段不可游玩 | compliance.check 等 |
| 3001 | DUPLICATE_REQUEST | RULE | 相同 `rid` 的写操作重复提交 | 操作已处理，请勿重复 | 幂等写动作 |
| 3002 | QUOTA_EXHAUSTED | RULE | 区服每日限量已售罄 | 今日已售罄 | economy.buyQuota |
| 3201 | EVENT_CLOSED | RULE | 赶海场次未开放（非 20:00-21:00） | 本场赶海已结束 | event.start |
| 3202 | EVENT_ALREADY_PLAYED | RULE | 当日已参与过赶海 | 今日已参与过赶海 | event.start |
| 4001 | RATE_LIMITED | SYSTEM | 触发频率限制（如榜单上报超频） | 操作过于频繁，请稍后再试 | leaderboard.report / telemetry.track |
| 4999 | INTERNAL | SYSTEM | 服务端未实现或内部错误（未实现动作也返回此码，见 AT-2401） | 服务暂时不可用 | 全部动作 |
| 5001 | REVIEW_PENDING | RISK | 内容在审核中 / 复核不一致 | 内容审核中 | event.submit / social.send |
| 9001 | CLIENT_TOO_OLD | UPGRADE | 客户端版本过低需更新 | 请更新到最新版本 | config.manifest / 全部动作 |
