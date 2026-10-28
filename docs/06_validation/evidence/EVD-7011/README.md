---
id: EVD-7011
title: 服务端 platform 模式接 code2session（D-44=2 → 记录 UNKNOWN）
status: accepted
owner: hark
created: 2026-10-28
review: 2026-11-28
---

# EVD-7011 —— 服务端 platform 模式接 code2session（D-44=2 → 记录 UNKNOWN）

- **对应任务**：plan-v010 TASK-7011（`05-slices-and-cards.md`）
- **执行者**：主控
- **独立验收者**：子智能体（防自证循环，结论 **PASS**，完成度 100%）
- **采集时间**：2026-10-28
- **基线**：`e4337b1`（7010 后）
- **前置裁决**：D-44 = **2**（无 appid/secret → TASK-7011 标记 UNKNOWN，v1.0 的 M-9 降级，WDF_AUTH_MODE 保持 dev，登录显式记录为未实现）

## 处置结论（按 D-44=2，**非"实现"**）

本卡**不开工写 code2session**，只做诚实记录。原因：无 appid/secret（D-44=2），
服务端 `platform` 模式本就**明确抛错不伪装**（`service.ts:41-43`），客户端已接平台真实 code（7010）。

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | M-9 记录 UNKNOWN（02 + 01） | **PASS** | 02 §4.1 M-9 行、01 §5 微信真机登录行 均改 `UNKNOWN（D-44=2）` |
| 2 | 服务端 platform 模式抛错不伪装、不静默回落 dev | **PASS** | `service.ts:41-43` `throw new Error('platform auth mode 尚未接入...')` |
| 3 | 无"装作可用"假声明 | **PASS** | 全仓 grep 排除"未实现/尚未接入"后，无一宣称平台登录"已实现/成功" |
| 4 | 边界：零代码改动 | **PASS** | `server/src/modules/account`、`server/src/main.ts` 零改动；仅 docs 两行 |

## 反证（独立验收者）

- `resolveOpenId` 的 `dev_${h}` 分支仅在 `WDF_AUTH_MODE !== 'platform'` 到达，`dev_` 前缀明示非平台真实身份。
- `integrations/wechat|douyin` 仅注释/目录占位，无实现。
- 非阻断备注：`service.ts:42` 的 `TODO(G-04 真机阶段)` 保留，符合"真机阶段再接"规划。

## 变更清单（单卡）

- `docs/04_planning/plan-v010/02-requirement-inventory.md`（M-9 行）
- `docs/04_planning/plan-v010/01-fact-baseline.md`（微信真机登录行）

原始输出：`acceptance.txt`。
