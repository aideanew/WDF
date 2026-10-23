# client/ —— Cocos Creator 3.8 工程

用 Cocos Dashboard 打开本目录。**官方：只提交 assets、extensions、settings、package.json**（另外本项目提交 build-templates 与 tsconfig.json）。`library/ temp/ local/ build/ profiles/` 不进 Git。

## assets 布局
| 路径 | 是什么 | 进哪个包 |
|---|---|---|
| `assets/app/` | 启动/加载场景、最小 UI 图集、位图数字字体 | 主包（不是 Bundle） |
| `assets/resources/config/` | 随包默认数值 JSON（`npm run gen` 生成） | 内置 resources（主包） |
| `assets/bundles/b-*/` | 各玩法的场景、预制体、贴图、音频 | 各自 Asset Bundle（小游戏分包） |
| `assets/scripts/` | **全部脚本** | 主包（ADR-0006） |

## 必须在编辑器里做的一次性设置
1. 选中 `assets/bundles/` 下每个 `b-*` 文件夹 → 勾选“配置为 Bundle” → 名称保持文件夹名 → 小游戏平台压缩类型选“小游戏分包” → 优先级按 `docs/03_solution/architecture/bundle-plan.md`（b-common=6，其余 3–5）。
2. 构建发布：微信/抖音勾选“引擎原生代码分包”；微信评估“分离引擎（引擎插件）”。
3. 项目设置 → 功能裁剪：关闭不用的模块（3D、物理等）以缩小引擎体积。

## 资源操作纪律
- 移动、重命名、删除资源**只在 Cocos 编辑器里做**（或连同 `.meta` 一起移动），否则 uuid 引用断裂。
- 设计源文件放仓库根 `art-source/`，只把导出产物放进 assets。
