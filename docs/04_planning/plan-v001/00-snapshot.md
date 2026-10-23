---
id: PLAN-V001-00
title: 规划快照（plan-v001）
status: draft
owner: hark
created: 2026-10-23
review: 2026-10-30
---

# 00 规划快照

> 本文件是 plan-v001 的冻结时点记录。后续任何一份规划文件的结论，都以本快照的代码状态为前提。
> 如果 HEAD 前进但本文件未更新，视为规划过期，须递进到 plan-v002。

## 1. 时点与仓库

| 项 | 值 | 证据 |
|---|---|---|
| 绝对日期 | 2026-10-23（本地时区 Etc/GMT-8） | 系统环境 |
| 分支 | `master`（远端唯一分支，即主分支） | `git branch --show-current` → `master` |
| HEAD | `80efd44`「记录 Hark 代定 10-23 10:45」 | `git log -3 --oneline` |
| 前两条提交 | `ea50014` 改成必须联网（拍板4 选 B）；`fd75c4a` 记录拍板决定 10-23 | 同上 |
| 工作区 | 干净，无未跟踪文件 | `git status --short` 输出为空 |
| 远程 | `origin https://github.com/aideanew/WDF.git` | 项目记忆 + 上轮已推送 |
| 远程一致性 | 本快照写作时未重新 `git pull`（避免污染当日证据）；提交后再核对 | 见 12-first-cut 收尾步骤 |
| 规划版本 | `plan-v001`（首次创建；`docs/04_planning/plan-v001/` 此前不存在） | `Test-Path` → MISSING |

## 2. `npm run verify` 基线输出

命令：`npm run verify`（= `gen && guard && test`），本轮执行通过（全绿）。分段记录：

| 段 | 实际输出要点 | 判定 |
|---|---|---|
| `gen:config` | 数值生成 **46 张表**，**0 数据行**（全部 CSV 只有表头）；`configVersion=16921d30a67a934f` | 通过，但为**空表通过** |
| `sync` | 共享包同步到客户端 **42 个文件** | 通过 |
| `gen:catalog` | **28 个模块**（v1 23 + v2 仅登记 5）、**20 个动作** | 通过 |
| `gen:docs` | 文档索引 **61 篇** | 通过 |
| `guard` | **9 项守卫**全部通过 | 通过 |
| `test` | **10 个测试**全部通过 | 通过 |

**关键判定（防止误读）**：
- "verify 全绿"**不等于**任何业务功能已实现。契约测试只校验「动作表名 ↔ handlers 键名一一对应」，而服务端 20 个 handler 全部是 `todo` 占位，返回 `4999`。
- 空 CSV（0 数据行）能通过数值校验器，说明校验器对空表不做非空断言。**数值内容为零**是当前最大事实缺口。

## 3. 代码规模实测

| 区域 | `.ts` 文件数 | 总行数 | 状态 |
|---|---|---|---|
| `client/assets/scripts/` | 127 | 1262 | 骨架 + 占位；无真实玩法逻辑 |
| `packages/game-core/src/` | 25 | 540 | 6 个模块有真实实现，其余为占位 |
| `server/src/` | 55 | 164 | 单入口 + 动作表；20/20 handler 为占位 |
| `packages/contracts/src/` | 17 | 132 | 20 动作 + 错误码 + 封套，类型已定义 |
| `game-data/source/*.csv` | 46 | 每文件 1 行 | **全部只有表头，0 数据行** |
| `game-data/schemas/` | 46 | — | 与 source 一一对应 |

## 4. Cocos 工程状态（第一刀的最大前置）

| 检查项 | 结果 | 结论 |
|---|---|---|
| `client/` 下 `.meta` 文件 | **0 个** | 标识资源与脚本从未被 Cocos 编辑器导入过 |
| `client/` 下 `.scene` 文件 | **0 个** | 无任何场景 |
| `client/` 下 `.prefab` 文件 | **0 个** | 无任何预制体 |
| `client/settings/` | 只有 `README.md` | 工程配置未生成（无 `project.json`/构建配置） |

**判定**：Cocos 工程**尚未初始化**。任何"在现有场景上改"的任务都不成立；第一刀必须先由人在 Cocos Creator 3.8 里创建工程、生成 `.meta`、建 Boot 场景（【人工】步骤，见 12-first-cut）。

## 5. 需求文档清单（路径 + 修改时间）

| 路径 | 修改时间 | 作用 |
|---|---|---|
| `docs/01_product/design-source/我的筏-深度设计方案-v5.5.md` | 2026-10-23 11:08 | 玩法唯一权威（含第十一/十二章定稿） |
| `docs/01_product/design-source/设计要点记录.md` | 2026-10-23 11:08 | **冲突裁决权威**（时间最新者胜） |
| `docs/01_product/design-source/立项评审-Hark回答.md` | 2026-10-23 11:04 | 8 条拍板 + 代定 13 条 |
| `docs/01_product/design-source/材料与工具总表.md` | 2026-10-21 17:18（正文标注） | 物品/配方/价格唯一总账 |
| `docs/01_product/design-source/等级解锁表-草案.md` | 草案 | 12 段等级、20 级深海、49 首版上限 |
| `docs/01_product/design-source/箱子与沉船概率-草案.md` | 草案 | 出箱率、锁档、命中区 |
| `docs/01_product/project-charter.md` | 2026-10-23 11:08 | 立项章程 |
| `docs/01_product/mvp-scope.md` | 2026-10-23 11:04 | C1/C2/C3 + 周次 + v1.0/v1.1 拆分 |
| `docs/02_requirements/functional-analysis.md` | 2026-10-23 11:08 | 23 模块功能清单 + SR-01~12 |
| `docs/03_solution/architecture/architecture-overview.md` | 2026-10-23 11:08 | 17 维索引（第 9 节） |
| `docs/03_solution/architecture/performance-budget.md` | 2026-10-23 10:43 | 帧率/节点/DrawCall/存档体积 |
| `docs/03_solution/architecture/anti-cheat.md` | 2026-10-23 10:43 | 信任边界 |
| `docs/03_solution/architecture/offline-sync.md` | 2026-10-23 10:43 | 断网策略（受 ADR-0008 约束） |
| `docs/03_solution/data/api-catalog.md` | 2026-10-23 11:19 | **生成物，禁手改**（20 动作表） |
| `docs/03_solution/ui/screen-inventory.md` | 2026-10-23 10:36 | 12 个界面清单 |
| `docs/03_solution/ui/style-guide.md` | 2026-10-23 10:36 | 美术与交互规范 |
| `docs/03_solution/decisions/ADR-0001~0008` | 10:43 / 11:06 / 11:08 | 8 条已接受决策 |
| `docs/04_planning/lifecycle.md` | 2026-10-23 11:06 | 资质里程碑表 |
| `docs/04_planning/current-plan.md` | 2026-10-23 11:08 | 现行计划（本规划将接管） |
| `docs/04_planning/roadmap.md` | — | 路线图 |
| `docs/06_validation/validation-plan.md` | 2026-10-23 10:43 | 六层验证 |
| `docs/00_governance/{project-structure-spec,change-playbook,module-catalog.json,glossary,risks}.md` | 11:19 | 治理基线 |
| `docs/07_release/compliance/filings.md` | 2026-10-23 11:07 | 备案/软著状态 |
| `docs/07_release/compliance/probability-disclosure.md` | 2026-10-23 11:19 | 概率公示（生成物关联） |

原始对话存档：`docs/08_knowledge/sources/original-requirements/`（仅用于核对"是不是用户说的"，**不作为需求源**）。

## 6. 本快照的边界

- 本快照**不含**任何实测性能值：帧率、首钩命中率、冷启动耗时、存档写入耗时、主包体积均为"**尚无基线**"（见 09-metrics-and-acceptance）。
- 本快照**不含**微信开发者工具/真机上的任何运行证据：从未构建过小游戏包。
- 本快照**不含**服务器部署证据：`server` 仅在本地以 `node:http` 骨架运行，未连过 PostgreSQL，`0001_init.sql` 未执行。

## 7. 复用与重跑方式

一周后的人要复现本快照，只需：

```powershell
git log -1 --oneline
git status --short
npm run verify
(Get-ChildItem -Recurse client -Filter *.meta).Count
(Get-ChildItem -Recurse client -Filter *.scene).Count
(Get-ChildItem game-data/source -Filter *.csv | ForEach-Object { (Get-Content $_.FullName).Count })
```

预期：`80efd44`、空、全绿、`0`、`0`、每文件 `1`。
