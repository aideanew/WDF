---
id: EVD-7012
title: ADR-0015：合规状态的数据模型（D-45=B → 推迟 v1.1）
status: accepted
owner: hark
created: 2026-10-28
review: 2026-11-28
---

# EVD-7012 —— ADR-0015：合规状态的数据模型（D-45=B → 推迟 v1.1）

- **对应任务**：plan-v010 TASK-7012（`05-slices-and-cards.md`）
- **执行者**：主控
- **独立验收者**：子智能体（防自证循环，结论 **PASS**，完成度 100%）
- **采集时间**：2026-10-28
- **前置裁决**：D-45 = **B**（v1.0 不提审 → 合规状态推迟 v1.1）

## 处置结论（按 D-45=B，**决策记录卡**）

本卡**不开工建表/写代码**，只产出 ADR-0015 记录"为什么不在 v1.0 做"与"v1.1 再做时怎么选"。
ADR-0015 状态 `accepted`（用户 2026-10-28 批量拍板）。

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | front matter 齐全（id/title/status/owner/created/review/related） | **PASS** | ADR-0015 第 1-9 行 |
| 2 | 三选项各带代价/风险（隐私面/防绕过/查询成本） | **PASS** | §2 表 A（只存 minor）/B（存 birth_year+minor）/C（每次向平台查） |
| 3 | 事实基线可核（F-1 恒真桩 / F-2 无表 / F-3 2101 零调用） | **PASS** | `service.ts:13`、`0001_init.sql`、`contracts/src/common/errors.ts` + `04 §2 G-2` |
| 4 | 到期/回访条件（触发 + 回访动作 + 禁止项） | **PASS** | §4：提审重排或监管变化 → 重开 ADR → 才写 0002 |
| 5 | 边界：零代码改动 | **PASS** | `server/src`、`client/assets/scripts`、`packages/contracts`、`tools/gen` 零改动；仅 docs |

## 反证（独立验收者）

- `compliance.check` 恒真桩不构成虚假陈述（`anti-addiction.md` 未宣称实现），已由 `01 §5` 记录。
- F-4 微信强制实名/防沉迷为 draft 文档引用，未宣称实现。
- 非阻断备注：ADR-0015 状态 `accepted` 与本仓 ADR 惯例一致（ADR-0012/0013 同），卡片输出规格虽写 `proposed`，遵循仓库惯例不视为缺陷。

## 变更清单（单卡）

- `docs/03_solution/decisions/ADR-0015-compliance-state.md`（新增）
- `docs/00_governance/document-index.md`（gen:docs，ADR-0015 行）

原始输出：`acceptance.txt`。
