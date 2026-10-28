---
id: GOV-0010
title: 文档索引（生成）
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 文档索引（由 tools/gen/docs-index.mjs 生成，勿手改）

共 239 篇。⚠ 表示活跃文档已过 review 日期。

| ID | 标题 | 状态 | 复审 | 路径 |
|---|---|---|---|---|
| GOV-0003 | 增删改查变更作业单 | active | 2026-11-23 | `00_governance/change-playbook.md` |
| GOV-0004 | 文档编号与格式标准 | active | 2026-11-23 | `00_governance/document-standard.md` |
| GOV-0005 | 术语表 | active | 2026-11-23 | `00_governance/glossary.md` |
| GOV-0009 | 模块总览（生成） | active | 2026-11-23 | `00_governance/module-catalog.md` |
| GOV-0006 | 项目地图（目录 ↔ 文档） | active | 2026-11-23 | `00_governance/project-map.md` |
| GOV-0002 | 工程目录与依赖规范 | active | 2026-11-23 | `00_governance/project-structure-spec.md` |
| GOV-0001 | 文档系统使用说明 | active | 2026-11-23 | `00_governance/README.md` |
| GOV-0007 | 风险登记 | active | 2026-11-23 | `00_governance/risks.md` |
| PRD-0011 | 核心循环图 | active | 2026-11-23 | `01_product/game-design/core-loop.md` |
| PRD-0004 | 核心工作与 MVP 范围 | active | 2026-11-23 | `01_product/mvp-scope.md` |
| PRD-0002 | 首版范围 | active | 2026-11-23 | `01_product/product-scope.md` |
| PRD-0001 | 产品愿景 | active | 2026-11-23 | `01_product/product-vision.md` |
| PRD-0000 | 立项书（Project Charter） | active | 2026-11-23 | `01_product/project-charter.md` |
| PRD-0003 | 成功指标（内部目标值） | active | 2026-11-23 | `01_product/success-metrics.md` |
| REQ-0002 | 需求排队 | active | 2026-11-23 | `02_requirements/backlog.md` |
| REQ-C-0001 | 平台与引擎约束 | active | 2026-11-23 | `02_requirements/constraints/REQ-C-0001-platform.md` |
| REQ-ANALYSIS-0001 | 功能与需求分析（目录设计的输入） | active | 2026-11-23 | `02_requirements/functional-analysis.md` |
| REQ-NF-0001 | 性能与包体 | active | 2026-11-23 | `02_requirements/non-functional/REQ-NF-0001-performance.md` |
| REQ-NF-0002 | 可用性与安全 | active | 2026-11-23 | `02_requirements/non-functional/REQ-NF-0002-availability-security.md` |
| REQ-0003 | 未采纳的建议 | active | 2026-11-23 | `02_requirements/rejected.md` |
| ARCH-0005 | 信任边界与防作弊 | active | 2026-11-23 | `03_solution/architecture/anti-cheat.md` |
| ARCH-0001 | 总体架构方案（集大成版） | active | 2026-11-23 | `03_solution/architecture/architecture-overview.md` |
| ARCH-0003 | 分包与包体预算 | active | 2026-11-23 | `03_solution/architecture/bundle-plan.md` |
| ARCH-0004 | 联网与存档同步 | active | 2026-11-23 | `03_solution/architecture/offline-sync.md` |
| ARCH-0006 | 性能预算 | active | 2026-11-23 | `03_solution/architecture/performance-budget.md` |
| ARCH-0002 | 平台适配层 | active | 2026-11-23 | `03_solution/architecture/platform-adapter.md` |
| DATA-0004 | 接口目录（生成） | active | 2026-11-23 | `03_solution/data/api-catalog.md` |
| DATA-0001 | 数值表说明 | active | 2026-11-23 | `03_solution/data/config-tables.md` |
| DATA-0003 | 数据库结构 | active | 2026-11-23 | `03_solution/data/db-schema.md` |
| DATA-0005 | 错误码对照表（手维护） | active | 2026-11-26 | `03_solution/data/error-catalog.md` |
| SOL-gateway-gaps | 网关能力登记（限流 / cfg 回传 / sv 校验） | active | 2026-11-27 | `03_solution/data/gateway-gaps.md` |
| DATA-0002 | 本地存档结构 | active | 2026-11-23 | `03_solution/data/save-schema.md` |
| ADR-0001 | 引擎：Cocos Creator 3.8 LTS | proposed | 2026-11-23 | `03_solution/decisions/ADR-0001-engine-cocos-3-8.md` |
| ADR-0002 | 前后端共用确定性规则包 game-core | accepted | 2026-11-23 | `03_solution/decisions/ADR-0002-shared-game-core.md` |
| ADR-0003 | 后端：模块化单体 HTTP 服务（腾讯云轻量 + Docker Compose） | accepted | 2026-11-23 | `03_solution/decisions/ADR-0003-backend-modular-monolith.md` |
| ADR-0004 | 数据库：PostgreSQL（Redis 推迟） | accepted | 2026-11-23 | `03_solution/decisions/ADR-0004-database-postgres.md` |
| ADR-0005 | 数值管线：CSV → 校验 → JSON/类型/版本 | accepted | 2026-11-23 | `03_solution/decisions/ADR-0005-config-pipeline.md` |
| ADR-0006 | 脚本全部进主包，Asset Bundle 只装资源 | accepted | 2026-11-23 | `03_solution/decisions/ADR-0006-scripts-in-main-package.md` |
| ADR-0007 | 发行路线：个人主体 + 微信先发 | accepted | 2026-11-23 | `03_solution/decisions/ADR-0007-issue-route-personal-wechat-first.md` |
| ADR-0008 | 取消断网可玩，改为必须联网 | accepted | 2026-11-23 | `03_solution/decisions/ADR-0008-online-required.md` |
| ADR-0009 | 运行时校验采用 zod（前后端同构） | proposed | 2026-10-30 | `03_solution/decisions/ADR-0009-runtime-validation-zod.md` |
| ADR-0010 | 技术选型复核——对三份外部结构提案的辩证结论 | accepted | 2026-11-23 | `03_solution/decisions/ADR-0010-tech-stack-review-external-proposals.md` |
| ADR-0011 | 契约缺口与解冻申请（回收动作 / 绑定票据错误码 / 赶海 ops 载体） | accepted | 2026-11-09 | `03_solution/decisions/ADR-0011-contract-gaps.md` |
| ADR-0012 | 权威背包：服务端影子账本（容差=0） | accepted | 2026-11-27 | `03_solution/decisions/ADR-0012-authoritative-inventory.md` |
| ADR-0013 | 存档 schema 版本（m.sv）由谁负责——服务端校验范围与客户端迁移接线 | accepted | 2026-11-10 | `03_solution/decisions/ADR-0013-save-schema-version.md` |
| DESIGN-0001 | UX 态契约（六份契约之⑥：空/加载/错误/无权限/成功/冲突） | active | 2026-11-26 | `03_solution/design/DESIGN-0001-ux-states.md` |
| UI-0003 | Cocos 编辑器英文界面中英对照（本项目专用） | active | 2026-11-23 | `03_solution/ui/cocos-editor-glossary.md` |
| UI-0002 | 界面清单 | active | 2026-11-23 | `03_solution/ui/screen-inventory.md` |
| UI-0001 | UI 规范 | active | 2026-11-23 | `03_solution/ui/style-guide.md` |
| PLAN-0003 | 当前计划（唯一"现在做什么"） | active | 2026-11-23 | `04_planning/current-plan.md` |
| PLAN-0000 | 项目全生命周期（从立项到完成） | active | 2026-11-23 | `04_planning/lifecycle.md` |
| PLAN-0002 | 里程碑 | active | 2026-11-23 | `04_planning/milestones.md` |
| PLAN-V001-00 | 规划快照（plan-v001） | draft | 2026-10-30 | `04_planning/plan-v001/00-snapshot.md` |
| PLAN-V001-01 | 事实基线（已确认 / 仅文档 / 不一致 / 读取失败） | draft | 2026-10-30 | `04_planning/plan-v001/01-fact-baseline.md` |
| PLAN-V001-02 | 需求基线复核（分级 / 冲突 / 未知登记册） | draft | 2026-10-30 | `04_planning/plan-v001/02-requirements-baseline.md` |
| PLAN-V001-03 | 契约冻结（API / Errors / Identity / Resources / Events / UX States） | draft | 2026-10-30 | `04_planning/plan-v001/03-contracts-freeze.md` |
| PLAN-V001-04 | 数据模型基线（服务端 / 本地存档 / 数值表） | draft | 2026-10-30 | `04_planning/plan-v001/04-data-model.md` |
| PLAN-V001-05 | 垂直切片（端到端可演示） | draft | 2026-10-30 | `04_planning/plan-v001/05-vertical-slices.md` |
| PLAN-V001-07 | 依赖图与并行判定（DAG） | draft | 2026-10-30 | `04_planning/plan-v001/07-dag.md` |
| PLAN-V001-08 | 所有权与档位（Agent 分工 / 模型 / 预算 / 熔断） | draft | 2026-10-30 | `04_planning/plan-v001/08-ownership-and-tiers.md` |
| PLAN-V001-09 | 基线指标与验收（含防自证与守卫评估） | draft | 2026-10-30 | `04_planning/plan-v001/09-metrics-and-acceptance.md` |
| PLAN-V001-10 | 风险与待裁决决策 | draft | 2026-10-30 | `04_planning/plan-v001/10-risks-and-decisions.md` |
| PLAN-V001-11 | 规划自检（任一不过则修正后重检） | draft | 2026-10-30 | `04_planning/plan-v001/11-self-check.md` |
| PLAN-V001-12 | 第一刀启动顺序（S0 → S1 → S2） | draft | 2026-10-30 | `04_planning/plan-v001/12-first-cut.md` |
| PLAN-V002-00 | 规划快照（plan-v002 基线钉桩） | active | 2026-11-02 | `04_planning/plan-v002/00-snapshot.md` |
| PLAN-V002-01 | 事实基线（真实代码证据 + 未实现需求矩阵 + 文档/代码不一致） | active |  | `04_planning/plan-v002/01-fact-baseline.md` |
| PLAN-V002-02 | 需求基线复核（MUST/SHOULD/COULD/MUST NOT + 冲突 + 未知登记） | active |  | `04_planning/plan-v002/02-requirements-baseline.md` |
| PLAN-V002-03 | 契约冻结包（六份，含唯一源与缺口） | active |  | `04_planning/plan-v002/03-contracts-freeze.md` |
| PLAN-V002-04 | 数据模型基线（现状 + 迁移编排 + 索引策略） | active |  | `04_planning/plan-v002/04-data-model.md` |
| PLAN-V002-05 | 垂直切片（现状 + 本轮重排：聚焦核心与测试） | active |  | `04_planning/plan-v002/05-vertical-slices.md` |
| PLAN-V002-07 | 依赖 DAG（并行组 / 串行链 / 关键路径 / 环检测） | active |  | `04_planning/plan-v002/07-dag.md` |
| PLAN-V002-08 | 所有权矩阵与档位分配（含重叠缺陷处理） | active |  | `04_planning/plan-v002/08-ownership-and-tiers.md` |
| PLAN-V002-09 | 基线指标与验收体系（含首次测量值 / 尚无基线声明） | active |  | `04_planning/plan-v002/09-metrics-and-acceptance.md` |
| PLAN-V002-10 | 风险清单 / 未决问题 / 待裁决 | active |  | `04_planning/plan-v002/10-risks-and-decisions.md` |
| PLAN-V002-11 | 自检结果（逐条对照 long-text §12） | active |  | `04_planning/plan-v002/11-self-check.md` |
| PLAN-V002-12 | 第一刀与启动顺序（建议） | active |  | `04_planning/plan-v002/12-first-cut.md` |
| PLAN-V002-13 | 执行过程记录（2026-10-26 启动） | active |  | `04_planning/plan-v002/13-execution-log.md` |
| PLAN-V003-00 | 快照与索引（v1.0 冲刺规划） | active |  | `04_planning/plan-v003/00-snapshot.md` |
| PLAN-V003-01 | 事实基线（2026-10-27，commit 13e6b68） | active |  | `04_planning/plan-v003/01-fact-baseline.md` |
| PLAN-V003-02 | 范围复核与裁决清单（v1.0） | active |  | `04_planning/plan-v003/02-scope-and-decisions.md` |
| PLAN-V003-03 | 垂直切片 S11~S16（含排序理由） | active |  | `04_planning/plan-v003/03-slices.md` |
| PLAN-V003-04 | 任务索引 · 依赖 DAG · 所有权矩阵 · 档位预算 | active |  | `04_planning/plan-v003/04-task-index-and-dag.md` |
| PLAN-V003-05 | W1 数值清欠（TASK-4001~4004） | active |  | `04_planning/plan-v003/05-wave1-data-unblock.md` |
| PLAN-V003-06 | W2 权威背包+商人回收（TASK-4005~4008） | active |  | `04_planning/plan-v003/06-wave2-authority.md` |
| PLAN-V003-07 | W3 开锁 + 真机验证（TASK-4009~4012） | active |  | `04_planning/plan-v003/07-wave3-unlock-verify.md` |
| PLAN-V003-08 | W4 合规包体 + 契约解冻（TASK-4013~4016） | active |  | `04_planning/plan-v003/08-wave4-release.md` |
| PLAN-V003-09 | 基线指标（无基线的指标不算指标） | active |  | `04_planning/plan-v003/09-metrics.md` |
| PLAN-V003-10 | 风险 · 未决 · 待裁决 | active |  | `04_planning/plan-v003/10-risks.md` |
| PLAN-V003-11 | 自检结果（对照 standing 规划 §12） | active |  | `04_planning/plan-v003/11-self-check.md` |
| PLAN-V003-DS | 裁决表（D-01~D-14，已全部裁决） | accepted |  | `04_planning/plan-v003/decision-sheet.md` |
| PLAN-V004-00 | 快照与索引（v1.0 最终冲刺与闭环规划） | active |  | `04_planning/plan-v004/00-snapshot.md` |
| PLAN-V004-01 | 事实基线（2026-10-27，commit 3c1add1） | active |  | `04_planning/plan-v004/01-fact-baseline.md` |
| PLAN-V004-02 | 需求基线复核 | active |  | `04_planning/plan-v004/02-requirements-baseline.md` |
| PLAN-V004-03 | 契约冻结包与解冻计划 | active |  | `04_planning/plan-v004/03-contracts-freeze.md` |
| PLAN-V004-04 | 数据模型基线 | active |  | `04_planning/plan-v004/04-data-model.md` |
| PLAN-V004-05 | 垂直切片 S17~S19 | active |  | `04_planning/plan-v004/05-vertical-slices.md` |
| PLAN-V004-06 | 任务索引 · 依赖 DAG · 所有权矩阵 | active |  | `04_planning/plan-v004/06-tasks-and-dag.md` |
| PLAN-V004-07 | 档位分配、基线指标与风险清单 | active |  | `04_planning/plan-v004/07-metrics-and-risks.md` |
| PLAN-V004-11 | 自检结果 | active |  | `04_planning/plan-v004/11-self-check.md` |
| PLAN-V005-01 | 事实基线（2026-10-27 15:00 实测，逐条带证据） | active | 2026-11-10 | `04_planning/plan-v005/01-fact-baseline.md` |
| PLAN-V005-02 | 辩证复核（正题 / 反题 / 合题 + 四重相对性） | active | 2026-11-10 | `04_planning/plan-v005/02-dialectical-review.md` |
| PLAN-V005-03 | 阻塞项与裁决表（D-19 ~ D-28） | active | 2026-11-10 | `04_planning/plan-v005/03-blockers-decisions.md` |
| PLAN-V005-04 | 分层架构与所有权（五层 · 实测路径 · 性能/拓展/复用基线） | active | 2026-11-10 | `04_planning/plan-v005/04-architecture.md` |
| PLAN-V005-05 | 执行 DAG（8 波次 · 冲突矩阵 · 关键路径 · 出口判据） | active | 2026-11-10 | `04_planning/plan-v005/05-task-dag.md` |
| PLAN-V005-06 | 步骤 1 · W0 止血——让 verify 回绿 | active | 2026-11-10 | `04_planning/plan-v005/06-step1-stop-bleeding.md` |
| PLAN-V005-07 | 步骤 2 · W1 契约解冻收尾（2004 全链路） | active | 2026-11-10 | `04_planning/plan-v005/07-step2-contract-close.md` |
| PLAN-V005-08 | 步骤 3 · W2 背包回收入口 + 弹窗组件 + 幂等 rid 注入 | active | 2026-11-10 | `04_planning/plan-v005/08-step3-inventory-recycle.md` |
| PLAN-V005-09 | 步骤 4 · W3 开箱/开锁机制 + chest.open 契约 + 可达性裁决 | active | 2026-11-10 | `04_planning/plan-v005/09-step4-lockpick-salvage.md` |
| PLAN-V005-10 | 步骤 5 · W4 测试矩阵与防假绿体系 | active | 2026-11-10 | `04_planning/plan-v005/10-step5-test-matrix.md` |
| PLAN-V005-11 | 步骤 6 · W5 真机证据与命中率采样（合法降级路径） | active | 2026-11-10 | `04_planning/plan-v005/11-step6-device-lab.md` |
| PLAN-V005-12 | 步骤 7 · W6 合规材料与四文档对齐（v1.0 收官宣告） | active | 2026-11-10 | `04_planning/plan-v005/12-step7-release-docs.md` |
| PLAN-V005-13 | 步骤 8 · W7 v1.1 种子与数值清欠登记 | active | 2026-11-10 | `04_planning/plan-v005/13-step8-v11-seed.md` |
| PLAN-V005-14 | 自检清单与反作弊判据（含本规划的可证伪点） | active | 2026-11-10 | `04_planning/plan-v005/14-self-check.md` |
| PLAN-V006-00 | 规划快照 | superseded |  | `04_planning/plan-v006/00-snapshot.md` |
| PLAN-V006-01 | 事实基线（含文档与代码不一致清单） | active |  | `04_planning/plan-v006/01-fact-baseline.md` |
| PLAN-V006-02 | 需求基线复核 | active |  | `04_planning/plan-v006/02-requirements.md` |
| PLAN-V006-03 | 契约冻结包与数据模型 | active |  | `04_planning/plan-v006/03-contracts.md` |
| PLAN-V006-04 | 垂直切片与基线指标 | active |  | `04_planning/plan-v006/04-slices.md` |
| PLAN-V006-05 | 原子任务卡全集与 DAG | active |  | `04_planning/plan-v006/05-tasks-and-dag.md` |
| PLAN-V006-06 | 规划总结 | active |  | `04_planning/plan-v006/06-summary.md` |
| PLAN-V007-01 | 事实基线（2026-10-27 15:58 实测 + 逐卡四参照系审计） | active | 2026-11-10 | `04_planning/plan-v007/01-fact-baseline.md` |
| PLAN-V007-02 | 缺陷审计（F-01~F-26 生命周期 + 新增 F-19~F-26 详解） | active | 2026-11-10 | `04_planning/plan-v007/02-gap-audit.md` |
| PLAN-V007-03 | 裁决表（D-34 ~ D-41） | active | 2026-11-10 | `04_planning/plan-v007/03-decisions.md` |
| PLAN-V007-04 | 架构分层与实测所有权矩阵 | active | 2026-11-10 | `04_planning/plan-v007/04-architecture.md` |
| PLAN-V007-05 | 执行 DAG（5 波次 · 冲突矩阵 · 出口判据） | active | 2026-11-10 | `04_planning/plan-v007/05-dag.md` |
| PLAN-V007-06 | 步骤 1 · W0 基础链路（4020 rid 注入 + 4008 三处收尾） | active | 2026-11-10 | `04_planning/plan-v007/06-step1-rid-and-recycle-close.md` |
| PLAN-V007-07 | 步骤 2 · W1 开箱全栈（4009 重构执行） | active | 2026-11-10 | `04_planning/plan-v007/07-step2-chest-open.md` |
| PLAN-V007-08 | 步骤 3 · W2 文档收口（4 处残留 + EVD 三份补录） | active | 2026-11-10 | `04_planning/plan-v007/08-step3-docs-and-evidence.md` |
| PLAN-V007-09 | 步骤 4 · W3 真机降级（4010/4011）与合规清单（4013） | active | 2026-11-10 | `04_planning/plan-v007/09-step4-device-and-compliance.md` |
| PLAN-V007-10 | 步骤 5 · W4 v1.0 宣告（四文档对齐 + v1.1 种子 + 自检清单） | active | 2026-11-10 | `04_planning/plan-v007/10-step5-release-close.md` |
| PLAN-V007-11 | 基线漂移 2 号 · W0/W1 并行半成品审计（16:07 实测） | active | 2026-11-10 | `04_planning/plan-v007/11-drift-audit-w0w1.md` |
| PLAN-V008-01 | 事实基线（16:48 逐文件实测）与文档-代码不一致清单 | active | 2026-11-10 | `04_planning/plan-v008/01-fact-baseline.md` |
| PLAN-V008-02 | 需求基线复核（MUST/SHOULD/COULD/MUST NOT + 冲突 + 未知登记册） | active | 2026-11-10 | `04_planning/plan-v008/02-requirements.md` |
| PLAN-V008-03 | 契约冻结包（六份）与唯一源声明 | active | 2026-11-10 | `04_planning/plan-v008/03-contract-freeze.md` |
| PLAN-V008-04 | 所有权矩阵、依赖 DAG 与档位预算 | active | 2026-11-10 | `04_planning/plan-v008/04-ownership-dag.md` |
| PLAN-V008-05 | 步骤 1 · 修 P0 三处（F-27 / F-28 / F-34） | active | 2026-11-10 | `04_planning/plan-v008/05-step1-p0-defects.md` |
| PLAN-V008-06 | 步骤 2 · 开箱权威化（F-29 / F-30 / F-31 / F-32 / F-33） | active | 2026-11-10 | `04_planning/plan-v008/06-step2-chest-authority.md` |
| PLAN-V008-07 | 步骤 3 · UI 收口（开箱面板 + addButton 抽取 + 六态走查） | active | 2026-11-10 | `04_planning/plan-v008/07-step3-ui-close.md` |
| PLAN-V008-08 | 步骤 4 · 证据补录、合规重写、文档收口与推送（派工卡） | active | 2026-11-10 | `04_planning/plan-v008/08-step4-evidence-release.md` |
| PLAN-V008-09 | 自检、前提与局限、第一刀 | active | 2026-11-10 | `04_planning/plan-v008/09-self-check.md` |
| PLAN-V008-10 | 从最初设计文件找回的答案（箱子 / 锁 / 开箱） | active | 2026-11-10 | `04_planning/plan-v008/10-design-source-answers.md` |
| PLAN-V009-01 | plan-v009 · 实测基线（带时间戳与命令原文） | active | 2026-11-10 | `04_planning/plan-v009/01-baseline-measured.md` |
| PLAN-V009-02 | plan-v009 · 事实更正台账（我自己错在哪） | active | 2026-11-10 | `04_planning/plan-v009/02-fact-corrections.md` |
| PLAN-V009-03 | plan-v009 · 卡片明细（逐卡的改法与验收） | active | 2026-11-10 | `04_planning/plan-v009/03-cards.md` |
| PLAN-V009-04 | plan-v009 · 闸门加固设计与事实基线交付物 | active | 2026-11-10 | `04_planning/plan-v009/04-guard-hardening.md` |
| PLAN-V009-05 | plan-v009 · 待裁决事项 | active | 2026-11-10 | `04_planning/plan-v009/05-pending-decisions.md` |
| PLAN-V010-01 | plan-v010 · 实测基线（快照 + 命令原文 + 文档/代码不一致清单） | active | 2026-11-11 | `04_planning/plan-v010/01-fact-baseline.md` |
| PLAN-V010-02 | plan-v010 · 未被实现需求总账（模块 × 五层矩阵） | active | 2026-11-11 | `04_planning/plan-v010/02-requirement-inventory.md` |
| PLAN-V010-03 | plan-v010 · 自我否定清单（上一版我说错的与我改错的） | active | 2026-11-11 | `04_planning/plan-v010/03-self-negation.md` |
| PLAN-V010-04 | plan-v010 · 契约与数据模型缺口（含自造码 3101、迁移编排） | active | 2026-11-11 | `04_planning/plan-v010/04-data-contract-gaps.md` |
| PLAN-V010-05 | plan-v010 · 垂直切片与原子任务卡（TASK-7001~7051） | active | 2026-11-11 | `04_planning/plan-v010/05-slices-and-cards.md` |
| PLAN-V010-06 | plan-v010 · 依赖 DAG、所有权矩阵、档位与成本预算 | active | 2026-11-11 | `04_planning/plan-v010/06-dag-ownership-budget.md` |
| PLAN-V010-07 | plan-v010 · 待裁决清单（D-42~D-48） | active | 2026-11-11 | `04_planning/plan-v010/07-decisions-pending.md` |
| PLAN-V010-08 | plan-v010 · 阶段体检协议与完成定义 | active | 2026-11-11 | `04_planning/plan-v010/08-execution-protocol.md` |
| PLAN-V010-09 | plan-v010 · 执行过程记录（S0~S5，逐卡） | active | 2026-11-11 | `04_planning/plan-v010/09-execution-log.md` |
| PLAN-0001 | 路线图 | active | 2026-11-23 | `04_planning/roadmap.md` |
| EXEC-BRIEF-0002 | 助手派工指令 v3（六级大纲：基线 → 前置门禁 → 批次 → 任务 → 原子步骤 → 验证断言 → 证据） | active | 2026-11-26 | `05_execution/ASSISTANT-BRIEF.md` |
| EXEC-BRIEF-0003 | v1.0 冲刺派工指令（TASK-4001~4016，三助手独立执行） | active |  | `05_execution/EXEC-BRIEF-0003.md` |
| TASK-TPL | 任务模板 | active | 2026-11-23 | `05_execution/task-template.md` |
| TASK-0101 | Cocos 工程初始化与 Bundle 配置（【人工】） | done |  | `05_execution/tasks/TASK-0101.md` |
| TASK-0103 | 契约类型补缺（G-06 / G-07 / 命名核对） | active |  | `05_execution/tasks/TASK-0103.md` |
| TASK-0104 | 服务端鉴权与 account.login 真实实现 | done |  | `05_execution/tasks/TASK-0104.md` |
| TASK-0105 | compliance.check 与 config.manifest 真实实现 | done |  | `05_execution/tasks/TASK-0105.md` |
| TASK-0106 | 本地存档读写与校验（杀进程可恢复） | active |  | `05_execution/tasks/TASK-0106.md` |
| TASK-0107 | save.push / save.pull 真实落库（含幂等与版本冲突返回） | done |  | `05_execution/tasks/TASK-0107.md` |
| TASK-0108 | Boot 场景控制器 + 统一 RPC 客户端 + 错误展示 | active |  | `05_execution/tasks/TASK-0108.md` |
| TASK-0201 | game-core/hook 蓄力与轨迹规则（确定性） | done |  | `05_execution/tasks/TASK-0201.md` |
| TASK-0202 | HookView 表现层（力度条 / 飞行 / 回手 / 命中反馈） | active |  | `05_execution/tasks/TASK-0202.md` |
| TASK-0802 | 赶海 ops 复算计分（v1.1） | proposed |  | `05_execution/tasks/TASK-0802.md` |
| TASK-0803 | 赶海 21:05 结算与发奖（v1.1） | proposed |  | `05_execution/tasks/TASK-0803.md` |
| TASK-0902 | 赶海分组榜（v1.1） | proposed |  | `05_execution/tasks/TASK-0902.md` |
| TASK-0903 | 排行榜压测（决定是否引入 Redis） | proposed |  | `05_execution/tasks/TASK-0903.md` |
| TASK-1301 | 称号展示（榜单位 + 个人信息区） | active |  | `05_execution/tasks/TASK-1301.md` |
| TASK-1401 | 开新区 + 封号（脚本 / SQL 级，不做后台） | active |  | `05_execution/tasks/TASK-1401.md` |
| TASK-1502 | drops（箱子内容）填数——只转录，不设计 | active |  | `05_execution/tasks/TASK-1502.md` |
| TASK-1503 | 34 张占位表补列结构（列由设计文档推导，数字不编） | active |  | `05_execution/tasks/TASK-1503.md` |
| TASK-1601 | 契约测试自动生成 + 数值表非空断言（登记，暂不实施） | proposed |  | `05_execution/tasks/TASK-1601.md` |
| TASK-1602 | 密钥扫描守卫（第 10 项 guard，登记，暂不实施） | proposed |  | `05_execution/tasks/TASK-1602.md` |
| TASK-2001 | 契约补缺（chest 业务类型 + 错误路径对照表） | done |  | `05_execution/tasks/TASK-2001.md` |
| TASK-2101 | game-core/hook 蓄力+轨迹+命中（确定性） | done |  | `05_execution/tasks/TASK-2101.md` |
| TASK-2102 | HookView 程序化表现（力度条/飞行/回手） | done |  | `05_execution/tasks/TASK-2102.md` |
| TASK-2103 | 出钩接线（命中→入包→存档） | done |  | `05_execution/tasks/TASK-2103.md` |
| TASK-2201 | account.bindStart / bindConfirm（账号合并） | done |  | `05_execution/tasks/TASK-2201.md` |
| TASK-2202 | save.resolveFork（存档分叉裁决） | done |  | `05_execution/tasks/TASK-2202.md` |
| TASK-2203 | leaderboard.report / query（总收益榜） | done |  | `05_execution/tasks/TASK-2203.md` |
| TASK-2204 | telemetry.track（批量埋点） | done |  | `05_execution/tasks/TASK-2204.md` |
| TASK-2401 | handler 契约测试补强 | done |  | `05_execution/tasks/TASK-2401.md` |
| TASK-2402 | e2e 骨架 1 条 | done |  | `05_execution/tasks/TASK-2402.md` |
| TASK-2501 | 文档一致性返工 | done |  | `05_execution/tasks/TASK-2501.md` |
| TASK-3001 | UX 态契约落地（common/ux.ts + 契约测试） | done |  | `05_execution/tasks/TASK-3001.md` |
| TASK-3002 | configVersion 单一来源（消除客户端两处硬编码） | done |  | `05_execution/tasks/TASK-3002.md` |
| TASK-3100 | 客户端配置表读取服务（services/config 实现 + 面板接口对齐） | done |  | `05_execution/tasks/TASK-3100.md` |
| TASK-3101 | 主界面 Tab 导航 + 四个面板桩（纯代码 UI） | done |  | `05_execution/tasks/TASK-3101.md` |
| TASK-3102 | 背包列表页（读 106 行真实物品） | done |  | `05_execution/tasks/TASK-3102.md` |
| TASK-3103 | 合成面板（80 条真实配方 + 材料判定） | done |  | `05_execution/tasks/TASK-3103.md` |
| TASK-3104 | 排行榜页（接已实现的 leaderboard.query） | done |  | `05_execution/tasks/TASK-3104.md` |
| TASK-3105 | 云存档同步与分叉裁决 UI（conflict 态唯一出口） | done |  | `05_execution/tasks/TASK-3105.md` |
| TASK-3201 | game-core/crafting 可制作判定（canCraft / consume） | done |  | `05_execution/tasks/TASK-3201.md` |
| TASK-3202 | game-core/inventory 存档段投影（listRows） | done |  | `05_execution/tasks/TASK-3202.md` |
| TASK-3301 | 守卫第 10 项：源 ↔ generated 双向同步校验 | done |  | `05_execution/tasks/TASK-3301.md` |
| TASK-3302 | game-core/save 封印回归测试（覆盖旧 checksum 混入缺陷） | done |  | `05_execution/tasks/TASK-3302.md` |
| TASK-3401 | 计划 / 路线图 / 任务索引对齐（本轮收口） | done |  | `05_execution/tasks/TASK-3401.md` |
| TASK-4007 | 商人页 UI + 限购（buyQuota 接真数值） | draft |  | `05_execution/tasks/TASK-4007.md` |
| TASK-4008 | 背包页回收入口 + 确认弹窗组件 | draft |  | `05_execution/tasks/TASK-4008.md` |
| TASK-4009 | 开锁交互（chest+locks 接表）+ chest.open 动作 | draft |  | `05_execution/tasks/TASK-4009.md` |
| TASK-4010 | 四面板真机录屏 + 6 态走查 | draft |  | `05_execution/tasks/TASK-4010.md` |
| TASK-4011 | 首钩命中率采样脚本 + 采样记录 | draft |  | `05_execution/tasks/TASK-4011.md` |
| TASK-4013 | 合规材料清单落 docs/07_release | draft |  | `05_execution/tasks/TASK-4013.md` |
| TASK-4015 | 契约解冻执行（2004 码等） | draft |  | `05_execution/tasks/TASK-4015.md` |
| TASK-4016 | error-catalog / glossary / current-plan / roadmap 四文档对齐 | draft |  | `05_execution/tasks/TASK-4016.md` |
| TASK-4020 | RpcClient 自动补齐 rid | draft |  | `05_execution/tasks/TASK-4020.md` |
| VAL-0002 | 测试机型 | active | 2026-11-23 | `06_validation/device-matrix.md` |
| EVD-4012 | TASK-4012 主包体积基线（wechatgame） | accepted |  | `06_validation/evidence/EVD-4012/baseline.md` |
| EVD-LEDGER | 执行台账（提交 ↔ 任务卡 ↔ 证据 全链对照） | active | 2026-11-27 | `06_validation/execution-ledger.md` |
| VAL-0003 | 目录体系多维度验证记录 | active | 2026-11-23 | `06_validation/structure-verification.md` |
| VAL-0001 | 验证计划 | active | 2026-11-23 | `06_validation/validation-plan.md` |
| CMP-anti-addiction | 防沉迷方案 | draft | 2026-11-23 | `07_release/compliance/anti-addiction.md` |
| CMP-copyright-materials | 软著提交材料清单 | active | 2026-10-30 | `07_release/compliance/copyright-materials.md` |
| CMP-filings | 资质与备案进度 | draft | 2026-11-23 | `07_release/compliance/filings.md` |
| CMP-privacy-policy | 隐私政策（草稿） | draft | 2026-11-23 | `07_release/compliance/privacy-policy.md` |
| CMP-prob | 概率公示（生成） | active | 2026-11-23 | `07_release/compliance/probability-disclosure.md` |
| COMP-002 | 提审核对清单 | active | 2026-11-23 | `07_release/compliance/review-checklist.md` |
| CMP-user-agreement | 用户协议（草稿） | draft | 2026-11-23 | `07_release/compliance/user-agreement.md` |
| OPS-0003 | 客服常见问题 | active | 2026-11-23 | `07_release/operations/customer-support.md` |
| OPS-0004 | 故障处理卡 | active | 2026-11-23 | `07_release/operations/incident-runbook.md` |
| OPS-0001 | 核心指标 | active | 2026-11-23 | `07_release/operations/kpi.md` |
| OPS-0002 | 运营节奏 | active | 2026-11-23 | `07_release/operations/live-ops-calendar.md` |
| REL-CHK | 发布检查清单 | active | 2026-11-23 | `07_release/release-checklist.md` |
| KB-0001 | 常见问题 | active | 2026-11-23 | `08_knowledge/faq.md` |
| KB-0002 | 经验教训 | active | 2026-11-23 | `08_knowledge/lessons-learned.md` |
| KB-0003 | 修复记录索引（所有问题修复的唯一入口） | active | 2026-11-23 | `08_knowledge/technical-notes/fix-log.md` |
| KB-FIX-20261023-01 | 同步脚本整目录删除导致 Cocos .meta 丢失与 verify 中断 | active |  | `08_knowledge/technical-notes/fixes/FIX-20261023-01-generated-sync.md` |
| KB-FIX-20261023-02 | 根目录白名单缺 .workbuddy 导致 verify 报错 | active |  | `08_knowledge/technical-notes/fixes/FIX-20261023-02-root-whitelist.md` |
| KB-FIX-20261023-03 | 坏 token 返回 2001 而非 2002，与冻结契约的鉴权错误码语义不一致 | active |  | `08_knowledge/technical-notes/fixes/FIX-20261023-03-session-expired-semantics.md` |
| KB-FIX-20261023-04 | PGlite 数据目录落在 server/ 下，14 个空子目录打挂「无空目录」守卫 | active |  | `08_knowledge/technical-notes/fixes/FIX-20261023-04-pglite-data-dir.md` |
| KB-FIX-20261023-05 | 服务端依赖边界正则过宽，把 gateway/core 基础设施引用误判为跨模块违规 | active |  | `08_knowledge/technical-notes/fixes/FIX-20261023-05-server-boundary-regex.md` |
| KB-FIX-20261023-06 | 客户端版本闸把 config.manifest 自己也拦了，导致旧客户端永久无法更新 | active |  | `08_knowledge/technical-notes/fixes/FIX-20261023-06-version-gate-deadlock.md` |
| KB-FIX-20261023-07 | Bundle 配置核对方法错误（require 读 .meta）导致误判"配置不存在"，并校正事实基线 | active |  | `08_knowledge/technical-notes/fixes/FIX-20261023-07-meta-read-method.md` |
| KB-FIX-20261023-08 | Bundle 压缩类型的配置位置写错（指向文件夹 Inspector），用户在真实界面上找不到选项 | active |  | `08_knowledge/technical-notes/fixes/FIX-20261023-08-bundle-config-location.md` |
