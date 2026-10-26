---
id: UI-0003
title: Cocos 编辑器英文界面中英对照（本项目专用）
status: active
module: client
owner: hark
created: 2026-10-23
review: 2026-11-23
related: [ADR-0006, ARCH-0003]
---

# Cocos 编辑器英文界面中英对照（本项目专用）

> 背景：本机装的是**英文界面**的 Cocos Creator 3.8.8，而微信公众平台/开发者工具是中文。文档里凡是写"点某个中文菜单"的地方，照本表换算成屏幕上的英文即可。
> 本文只收录**本项目实际要动的**面板；没动过的不收，避免越长越没人看。

## 1. Asset Bundle 配置（⚠ v3.8 起分两个地方，别再只盯 Inspector）

> **官方原文（3.8/4.0 手册）**："从 v3.8 开始，Bundle 的配置方案被转移到 **项目设置 → Bundle 配置** 分页内。您可以点击属性检查器上的**编辑按钮**或者通过**项目菜单**打开项目设置对 Bundle 进行配置。"
> 所以压缩类型/远程包**不在文件夹 Inspector 里改**——Inspector 上那个 `Edit` 按钮就是跳转到项目设置的。本项目已实测：勾选 `Independent Config` 落盘在 `client/settings/v2/packages/builder.json` 的 `bundleConfig.custom.default.configs.miniGame.configMode = "overwrite"`。

### 1A. 项目设置 → Bundle Config（压缩类型、远程包 —— 一处配好，7 个 Bundle 全生效）

打开方式：菜单栏 **Project → Project Settings**（或文件夹 Inspector 里点 `Edit`）→ 左侧列表选 **Bundle Config**。

| 界面英文 | 中文含义 | 本项目怎么填 |
|---|---|---|
| 方案名 `Default Config` | 默认配置方案（所有 Bundle 默认都用它） | 保持 `Default Config`，**不要新建方案** |
| `Native` / `Web` / `Mini Game` | 三个平台页签 | **必须点 `Mini Game`** |
| `Independent Config` | 独立配置：按平台分别设置（勾上后平台表才可编辑） | **勾上**（本项目已勾，已落盘） |
| `Platform`（平台清单列） | 平台列表，按字母排序 | **向下滚动**找到 **`WeChat Mini Game`**（在 Taobao 之后、Xiaomi 之前，一屏放不下） |
| `Compression Type` | 压缩类型 | **WeChat Mini Game 这一行选 `Subpackage`**；其余行不用动 |
| `Is Remote` | 配置为远程包 | **全部不勾**（官方：小游戏分包与远程包互斥，只能放本地） |
| `Uniform Config`（`All Mini Games` 行） | 统一配置：所有小游戏平台共用一套 | 备选方案——如果不想逐平台设，直接在这里选 `Subpackage` 效果等价（我们只构建微信） |
| `Reset to Uniform Config` / `Reset` | 重置为统一配置 / 重置 | **不要点**（会把你刚配的覆盖掉） |
| 保存 | 项目设置**自动保存**（没有绿色 ✓） | 改完点一下面板空白处失焦即可；用 `npm run check:bundles` 验证落盘 |

### 1B. 文件夹 Inspector（Is Bundle、名称、优先级 —— 每个文件夹单独配）

Assets 面板**单击** `assets/bundles/b-*` 文件夹 → 右侧 Inspector：

| 界面英文 | 中文含义 | 本项目怎么填 |
|---|---|---|
| `Is Bundle` | 配置为 Bundle（勾选框） | **勾上**（7 个都勾，已完成） |
| `Bundle Name` | Bundle 名称 | 与文件夹同名，如 `b-common`（**不要**用 main/resources/internal/start-scene） |
| `Bundle Priority` | Bundle 优先级（越大越先构建，共享资源归高优先级） | 见第 3 节表；改完**必须点右上角绿色 ✓** |
| `Edit`（Platform Settings 行） | 编辑按钮 → 跳转到项目设置的 Bundle Config | 配压缩类型用这里跳转（即 §1A） |
| `Bundle Filter Config` / `Include` / `Exclude` | 资源过滤 | **留空**（留空=整个目录都进） |
| `Preview` | 预览最终进包的资源清单 | 配完可点一次核对 |
| 面板右上角**绿色 ✓** | 保存 | **每次改完必须点，否则不落盘** |
| 面板右上角**回转箭头** | 重置 | 不要点 |

## 2. `Compression Type` 的 5 个选项

| 界面英文 | 中文 | 用途 | 本项目 |
|---|---|---|---|
| `Merge Dependencies`（截断显示 `Merge Depend`） | 合并依赖（**默认**） | 合并资源 JSON，减少请求数 | ❌ 不是分包，主包里全塞进去 |
| `No Compression` | 无压缩 | 不处理 | ❌ |
| `Merge All JSON` | 合并所有 JSON | 极致减请求 | ❌ |
| **`Subpackage`** | **小游戏分包** | 构建为该平台的分包，进 `game.json.subpackages` | ✅ **本项目 7 个全选它** |
| `Zip` | Zip 压缩 | 需配合"配置为远程包" | ❌ |

## 3. 本项目 7 个 Bundle 的目标配置

| 文件夹 | Bundle Name | Bundle Priority | Mini Game → Compression Type | Is Remote |
|---|---|---|---|---|
| `b-common` | `b-common` | **6** | `Subpackage` | 不勾 |
| `b-shallow` | `b-shallow` | **5** | `Subpackage` | 不勾 |
| `b-deep` | `b-deep` | **4** | `Subpackage` | 不勾 |
| `b-island` | `b-island` | **4** | `Subpackage` | 不勾 |
| `b-defense` | `b-defense` | **4** | `Subpackage` | 不勾 |
| `b-event` | `b-event` | **3** | `Subpackage` | 不勾 |
| `b-social` | `b-social` | **3** | `Subpackage` | 不勾 |

> 优先级依据 `ARCH-0001` 第 4.4 节；内置 Bundle 的优先级是 main=7、resources=8、internal=21，自定义不要超过 7。

## 4. 项目设置（`Project` → `Project Settings`）

| 界面英文 | 中文 | 本项目 |
|---|---|---|
| `Feature Cropping` | 功能裁剪 | 见下表，2D 项目关掉用不到的模块 |
| `Project Data` | 项目数据（设计分辨率/适配） | 720×1280，`Fit Height` |
| `Bundle Config` | Bundle 配置方案（**v3.8 起压缩类型/远程包就在这里配**，见 §1A） | `Default Config` → `Mini Game` → 勾 `Independent Config` → `WeChat Mini Game` 行选 `Subpackage` |

`Feature Cropping` 里可以关掉（本项目 2D、无物理）：
`3D`（MeshRenderer / SkinnedMeshRenderer / Animation / ParticleSystem / Physics / Terrain）、`Spine`、`DragonBones`、`TiledMap`、`Video`、`WebView`。
必须留：`Sprite`、`Label`、`Graphics`、`UI`（Widget/Button/Layout）、`Audio`、`Tween`、`Animation`（UI 动效可能用到）。

## 5. 构建发布（`Project` → `Build`）

| 界面英文 | 中文 | 本项目 |
|---|---|---|
| `Platform` | 发布平台 | `WeChat Mini Game` |
| `Build Path` | 构建路径 | 默认 `build` |
| `Orientation` | 设备方向 | `Portrait`（竖屏） |
| `AppID` | 微信小游戏 AppID | `wxecb8cb5662e35e0f` |
| `Start Scene` | 起始场景 | `Boot` |
| `Native Code Splitting`（引擎设置内） | 引擎原生代码分包 | **勾**（把 wasm/asm 放子包，减主包） |
| `Separate Engine` | 分离引擎（微信引擎插件） | 可勾，但**不减主包**（官方明确仍算首包体积），只让老玩家少下载 |
| `High Performance Mode` | 高性能模式 | 先不勾，真机测过再说 |
| `Remote Server Address` | 资源服务器地址 | 留空（还没有备案域名） |
| `Build` 按钮 | 构建 | — |
| 构建任务左下角**文件夹图标** | 打开构建产物目录 | 产物在 `build/wechatgame/` |
| 构建任务右下角**运行** | 调用微信开发者工具 | 需先在偏好设置里配好工具路径 |

## 6. 怎么确认"分包真的配上了"（不用截图）

改完并保存后，在仓库根跑：

```bash
npm run check:bundles
```

它会逐个读 `client/assets/bundles/b-*.meta` 的 `userData`，与本文件第 3 节的目标值对比，输出：

```text
Bundle 配置核对（期望值来自 ARCH-0001 §4.4）

文件夹       isBundle  priority(期望)  压缩类型           判定
-----------  --------  --------------  -----------------  ----
b-common     ✅         6(6)            (未设置)              ❌
b-shallow    ✅         无(5)            (未设置)              ❌
...
```

全对时退出码 0，有缺项退出码 1（并打印逐步修法）。
再构建后看 `client/build/wechatgame/game.json` 是否出现 `"subpackages": [...]`。

> ⚠ **不要用 `require()` 读 `.meta`**：Node 会把 `.meta` 当 JS 解析，报 `SyntaxError: Unexpected token ':'`。
> 这条坑曾导致误判"Bundle 配置不存在"。正确读法是 `JSON.parse(fs.readFileSync(path,'utf8'))`，脚本里已经这么写。
