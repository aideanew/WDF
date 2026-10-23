---
id: GOV-0001
title: 文档系统使用说明
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 文档系统使用说明

## 一句话
**一个问题只有一个显而易见的地方能找到答案。** 骨架按生命周期（00–09），主题放在层内。

| 层 | 回答什么 | 典型文件 |
|---|---|---|
| 00_governance | 规则、地图、术语、模块登记 | project-structure-spec、change-playbook、module-catalog.json、glossary |
| 01_product | 做什么、为谁、怎么算成功 | vision、scope、success-metrics、game-design/ |
| 02_requirements | 要满足什么 | functional-analysis、features/REQ-F-*、non-functional/、constraints/、inbox/ |
| 03_solution | 怎么做 | architecture/、data/、ui/、solutions/SOL-*、decisions/ADR-* |
| 04_planning | 什么时候做 | roadmap、milestones、current-plan（唯一“现在做什么”） |
| 05_execution | 谁在做什么 | tasks/TASK-*、task-index（生成） |
| 06_validation | 做对了吗 | validation-plan、device-matrix、acceptance/、test-results/、evidence/ |
| 07_release | 发了什么、合不合规 | release-checklist、release-records/、compliance/ |
| 08_knowledge | 学到了什么 | faq、lessons-learned、retrospectives/、technical-notes/ |
| 09_archive | 被取代/取消/过时的 | superseded/、cancelled/、obsolete/ |

## 追溯链
`REQ-INBOX → REQ-F → SOL（跨模块才写）→ ADR（有分叉才写）→ current-plan → TASK → VAL → EVD → REL → CHANGELOG`
判断“全面”的标准：随便抽一条需求，能顺着链走到发布记录。

## 三条防腐规则
1. 能生成的不手写：`document-index.md`、`task-index.md`、`module-catalog.md`、`api-catalog.md`、概率公示表。
2. 历史不删除：废弃文档移入 09_archive 并改 status。
3. 每个活跃文档有 `review` 日期；过期的在 document-index 里标出。

## 全生命周期
从立项到复盘的阶段、产出和退出条件见 `04_planning/lifecycle.md`；立项总入口 `01_product/project-charter.md`；核心工作与 MVP `01_product/mvp-scope.md`。

## 原始资料（免 front matter，只读）
- `01_product/design-source/`：设计原文（v5.5、设计要点记录、材料总表、立项评审等）
- `08_knowledge/sources/conversation-log/`：与 Hark 的完整对话逐字记录
- `08_knowledge/sources/original-requirements/`、`external-reviews/`：原始需求与外部评审原文
- `09_archive/superseded/design-history/`：历史版本

## 与项目原有设计文件的关系
`docs/01_product/design-source/` 目录中的 v5.5 与设计要点记录仍是**玩法规则唯一权威**；本体系不复制其内容，只按章节引用（见 `01_product/game-design/README.md`）。
