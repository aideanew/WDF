---
id: PLAN-0000
title: 项目全生命周期（从立项到完成）
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 项目全生命周期（从立项到完成）

| 阶段 | 要回答的问题 | 主要产出（位置） | 退出条件 | 状态 |
|---|---|---|---|---|
| 0 立项 | 做不做、做什么、给谁 | `01_product/project-charter.md`、design-source、立项评审 | charter 退出条件全勾 | 进行中（待拍板 8 问） |
| 1 需求 | 要满足什么 | `02_requirements/`（功能分析、REQ-F、NFR、约束、backlog） | MVP 冻结；REQ-F 带验收标准 | 骨架完成 |
| 2 设计 | 怎么做 | `03_solution/`（架构、数据、UI、ADR、SOL）、`game-data/schemas` | 关键 ADR accepted；数值表字段定稿 | 架构完成，ADR-0003/0004 待确认 |
| 3 计划 | 什么时候做 | `04_planning/`（roadmap、milestones、current-plan） | 5 周排期与里程碑确认 | 已有初稿 |
| 4 开发 | 谁在做什么 | `05_execution/tasks/`、client/server/packages/game-data | 各里程碑功能完成，verify 全绿 | 未开始（M0 骨架已完成） |
| 5 测试验证 | 做对了吗 | `06_validation/`（验收、真机、试玩、证据） | MVP 完成定义满足 | 验证计划已建 |
| 6 发布上线 | 能不能发 | `07_release/`（检查清单、合规、发布记录） | 双平台审核通过；回滚演练 | 清单已建 |
| 7 运营 | 上线后怎么活 | `07_release/operations/`（指标、活动日历、客服、故障处理） | 指标稳定；节奏固定 | 手册已建 |
| 8 复盘与迭代 | 学到什么、下一版做什么 | `08_knowledge/`（复盘、经验）、`02_requirements/backlog.md`（第二版） | 复盘完成；第二版立项 | — |
| 归档 | 历史留痕 | `09_archive/` | — | 设计历史版本已归档 |

阶段门禁：每个阶段的退出条件写在本表；未满足时 `current-plan.md` 必须标阻塞项。
