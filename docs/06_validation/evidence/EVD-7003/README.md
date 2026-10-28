---
id: EVD-7003
title: 未实现动作改返回"明确未开放"
status: accepted
owner: hark
created: 2026-10-28
review: 2026-11-28
---

# EVD-7003 —— 未实现动作改返回"明确未开放"

- **对应任务**：plan-v010 TASK-7003（`05-slices-and-cards.md`）
- **执行者**：主控
- **独立验收者**：子智能体（防自证循环，结论 **PASS**，完成度 100%）
- **采集时间**：2026-10-28
- **基线**：`05d59ac`（7005 后）
- **前置裁决**：D-46 = **A**（复用 4999 + 固定 msg `FEATURE_NOT_AVAILABLE`，零契约变更；B 新增 4998 登记为解冻窗口候选）

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | 8 个 todo 动作调用返回 4999（D-46 裁决值） | **PASS** | handlers.ts `todo` 返回 `{c:ERR.INTERNAL(4999), msg:FEATURE_NOT_AVAILABLE, t}`；8 动作全映射 todo；handlers.test.mjs 8 个子测试实调断言 |
| 2 | `RpcClient` 对该码重试次数为 0 | **PASS** | 唯一重试路径是 2002（SESSION_EXPIRED）silentRefresh；4999≠2002 结构性保证；makeError 只打 `featureUnavailable` 标记不触发重试 |
| 3 | `tests/integration/payload.test.mjs` 定向跑通过 | **PASS** | 2 pass / 0 fail |

## 实现要点

- **服务端** `handlers.ts`：`export const FEATURE_NOT_AVAILABLE='FEATURE_NOT_AVAILABLE'`；`todo` 返回 `4999 + 该 msg`（原 `'not implemented'`）。
- **客户端** `RpcClient.ts`：导出同名常量；`RpcError` 加可选 `featureUnavailable?: boolean`；`makeError` 仅当 `code===4999 && msg===FEATURE_NOT_AVAILABLE` 置 true → 调用方走"未开放"态（不重试、不弹通用错误）。
- **测试** `handlers.test.mjs`：8 个 todo 断言 `c===4999 && msg==='FEATURE_NOT_AVAILABLE'`；新增 `4999≠2002` 断言。
- **登记** `error-catalog.md`：4999 下方新增"未开放信号（D-46=A）"注。

## 反证（独立验收者）

- `packages/contracts/**` 零改动（未解冻契约）。
- 全仓 `grep "not implemented"` 无残留。
- `makeError` 标记条件严格（其他 4999 如 'network unreachable' 不标记）。
- 客户端"未开放"UI 态为 Cocos 运行时表现，node 单测只断言 `featureUnavailable` 标志位（已断言），弹窗/页面态需真机/人工。

## 变更清单（单卡）

- `server/src/gateway/handlers.ts`、`client/assets/scripts/services/net/RpcClient.ts`、`tests/contract/handlers.test.mjs`、`docs/03_solution/data/error-catalog.md`

原始输出：`acceptance.txt`。
