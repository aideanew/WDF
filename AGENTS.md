# AGENTS.md（AI 执行规范入口）

## 0. 先读
- `docs/00_governance/project-structure-spec.md`（目录与依赖）
- `docs/00_governance/change-playbook.md`（变更作业单）
- `docs/00_governance/module-catalog.json`（模块唯一登记处）
- `docs/00_governance/glossary.md`（术语）
- 玩法规则唯一权威：`docs/01_product/design-source/我的筏-深度设计方案-v5.5.md` + `docs/01_product/design-source/设计要点记录.md`（冲突以最新时间为准）。**未经用户确认，不得改动已定设计。**

## 1. 归属速查（新建文件前必须先定位，定位不到就停下来问）
| 要做的事 | 放哪里 |
|---|---|
| 改数值（价格/概率/重量/经验…） | `game-data/source/*.csv` → `npm run gen` |
| 纯规则（浮力、判定、掉落、塔防模拟、离线结算） | `packages/game-core/src/<module>/` |
| 前后端接口字段 | `packages/contracts/src/<module>/` |
| 客户端玩法流程/状态 | `client/assets/scripts/features/<module>/model/` |
| 客户端表现（Cocos 组件） | `client/assets/scripts/features/<module>/view/` |
| 平台 API（wx./tt.） | `client/assets/scripts/platform/<wechat|douyin|app>/` |
| 场景/预制体/图片/音频 | `client/assets/bundles/<b-*>/` 或 `client/assets/app/` |
| 服务端业务 | `server/src/modules/<module>/` |
| 数据库结构变更 | `server/db/migrations/NNNN_*.sql` |
| 本地存档结构变更 | `packages/game-core/src/save/` 的 schema 版本 + 迁移函数 |

## 2. 硬禁止
- ❌ 在 `features/`、`ui-kit/`、`game-core/` 里写 `wx.` / `tt.`
- ❌ `packages/game-core` 里 import `cc`、`Math.random`、`Date.now`、任何 IO
- ❌ 手改 `client/assets/scripts/generated/`（由 `npm run gen` 覆盖）
- ❌ 数值写死在 .ts（必须进 game-data）
- ❌ 在文件管理器里移动/重命名 `client/assets` 下的资源（必须在 Cocos 编辑器内操作，或连同 `.meta` 一起移动，否则 uuid 引用断裂）
- ❌ 自定义 Bundle 命名为 `main` / `resources` / `internal` / `start-scene`
- ❌ 不同 Bundle 之间的脚本互相 import（脚本统一放主包）
- ❌ 改存档结构不写迁移函数；改已执行过的数据库迁移
- ❌ 服务端信任客户端上报的分数/资源数量
- ❌ 新增 `*_old` `*_v2` `*_backup` `*副本*` 文件（历史交给 Git / 09_archive）

## 3. 完成前自检
- [ ] `npm run verify` 通过
- [ ] 触及模块的 README 与 `module-catalog.json` 已同步
- [ ] 改了契约/存档/数据库 → 版本号递增 + 迁移 + 测试
- [ ] 文档按 `change-playbook.md` 的“联动表”更新
