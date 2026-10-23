---
id: GOV-0006
title: 项目地图（目录 ↔ 文档）
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 项目地图（目录 ↔ 文档）

| 我想找… | 代码/数据在 | 文档在 |
|---|---|---|
| 某模块的一切 | `module-catalog.json` → 对应路径 | `module-catalog.md`（生成） |
| 玩法规则 | `packages/game-core/src/<m>/` | v5.5 对应章节；`01_product/game-design/README.md` 有章节索引 |
| 数值 | `game-data/source/` | `03_solution/data/config-tables.md` |
| 接口 | `packages/contracts/src/` | `03_solution/data/api-catalog.md`（生成） |
| 存档结构 | `packages/game-core/src/save/` | `03_solution/data/save-schema.md` |
| 数据库 | `server/db/migrations/` | `03_solution/data/db-schema.md` |
| 平台差异 | `client/assets/scripts/platform/` | `03_solution/architecture/platform-adapter.md` |
| 包体 | `client/assets/bundles/` | `03_solution/architecture/bundle-plan.md` |
| 现在做什么 | — | `04_planning/current-plan.md` |
| 为什么这样定 | — | `03_solution/decisions/` |

**更新规则**：目录结构变化时同步本文件与 `project-structure-spec.md`；模块变化只改 `module-catalog.json`。
