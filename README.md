# 《我的筏不可能这么大》工程仓库

> 人类入口。AI 请先读 `AGENTS.md`。

一款卡通 2D 海洋风漂流生存小游戏：长按出钩、捞物扩筏、员工经营、占岛塔防、省份排名。
微信小游戏、抖音小游戏、未来 APP 只是入口，**共用一套前后端逻辑**。

## 仓库地图（8 个顶层，白名单制）

| 目录 | 是什么 | 唯一权威内容 |
|---|---|---|
| `docs/` | 文档体系（00–09） | 需求、方案、决策、计划、证据 |
| `game-data/` | 策划数值源 | 所有数值（物品、配方、价格、概率、等级…） |
| `packages/` | 跨端共享的纯 TS 代码 | `contracts`（接口契约）、`game-core`（确定性游戏规则） |
| `client/` | Cocos Creator 3.8 工程（= 小游戏客户端） | 场景、预制体、表现与本地流程 |
| `server/` | 后端（模块化单体，HTTP） | 账号、云存档、排行、赶海、广告发奖、聊天 |
| `tools/` | 生成器 + 架构守卫 + 同步脚本 | 体系能“高效变更”的引擎 |
| `tests/` | 跨端测试（契约、确定性、端到端） | — |
| `art-source/` | 美术源文件（psd/tps/aseprite，不进 assets） | 原始素材与授权凭证索引 |

`.local/`（临时物）完全不进 Git。

设计原文（v5.5、设计要点记录等）在 `docs/01_product/design-source/`；与 Hark 的完整对话逐字记录在 `docs/08_knowledge/sources/conversation-log/`。

## 常用命令

```bash
npm run setup        # 安装依赖、建立 .local
npm run gen          # 数值表→JSON+类型；契约/规则→同步到 client；模块目录→文档
npm run guard        # 架构守卫（提交前必须通过）
npm run verify       # gen + guard + test（相当于本地 CI）
```

## 从哪开始读

0. `docs/01_product/project-charter.md` —— 立项书；`docs/01_product/mvp-scope.md` —— 核心工作与 MVP；`docs/04_planning/lifecycle.md` —— 从立项到复盘的全流程
1. `docs/00_governance/README.md` —— 文档怎么用
2. `docs/03_solution/architecture/architecture-overview.md` —— 总体方案（前后端、数据交互、模块、性能、拓展）
3. `docs/00_governance/project-structure-spec.md` —— 目录规范与依赖规则
4. `docs/00_governance/change-playbook.md` —— 增删改查怎么做
5. `docs/02_requirements/functional-analysis.md` —— 功能与需求分析
