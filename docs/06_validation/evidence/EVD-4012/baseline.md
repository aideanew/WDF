---
id: EVD-4012
title: TASK-4012 主包体积基线（wechatgame）
status: accepted
module: validation
owner: assistant
created: 2026-10-27
related: [TASK-4012, TASK-4014, PLAN-V003-07, REQ-C-0001, REQ-NF-0001]
---

# EVD-4012 · 主包体积基线

口径见 `tools/measure-bundle.mjs` 头注释：主包 = 构建目录下**除 `game.json` 声明的 8 个分包根**之外的全部文件，按原始字节求和。
预算 = 微信小游戏主包 4MB（`REQ-C-0001-platform.md:10` 官方硬上限；`REQ-NF-0001` 的目标线 3.5MB 更严，本卡以 4MB 判定）。

## 1. 结论

| 项 | 值 |
|---|---|
| **主包体积** | **2.913 MB**（3,054,159 B，30 个文件） |
| 预算 4MB | ✅ 在预算内，余量 **1.087 MB**（26.6%） |
| REQ-NF 目标 3.5MB | ✅ 在目标内，余量 0.586 MB |
| 主包 gzip | 797 KB（815,823 B） |
| 分包合计 | 17.4 KB（8 个，几乎为空壳） |
| 总包 | 2.929 MB（3,072,027 B） |

**判定：≤4MB → TASK-4014 条件不成立，直接关闭（结论见 plan-v003/08 §4014 阻塞条款）。**

## 2. 主包分层

| 层 | 体积 | 占比 | 说明 |
|---|---:|---:|---|
| `cocos-js/` | 2544.6 KB | 83.4% | 引擎代码，官方口径**计入主包** |
| `assets/` | 236.2 KB | 7.7% | 项目资源（Boot 场景 + internal） |
| `web-adapter.js` | 99.7 KB | 3.3% | 引擎适配层 |
| `src/` | 27.8 KB | 0.9% | polyfills/system/脚本 chunk(3.6KB)/effect.bin |
| `engine-adapter.js` | 23.3 KB | 0.8% | 引擎适配层 |
| `first-screen.js` | 18.4 KB | 0.6% | 启动首屏 |
| `logo.png` / `slogan.png` | 25.4 KB | 0.8% | 启动图 |
| 其余（application/game.js 等） | 6.1 KB | 0.2% | 引导壳 |

## 3. Top10 大文件（= 瘦身候选输入）

| # | 文件 | 体积 | 动态化/删减 |
|---|---|---:|---|
| 1 | `cocos-js/_virtual_cc-C7iGm02z.js` | 2314.6 KB | 引擎核心，官方「计主包」，**不可动态化** |
| 2 | `cocos-js/assets/spine-CC34fKUR.wasm` | 200.4 KB | 引擎 wasm；项目未用 Spine 动画 → 构建裁剪模块可去（需主控确认改构建配置） |
| 3 | `cocos-js/spine.wasm-Bg5oOXwa.js` | 21.6 KB | 同上，随 #2 一起消失 |
| 4 | `assets/internal/import/04/04f923b60.json` | 121.4 KB | 引擎内置资源（builtinAssets），**不可删**，删则材质/效果缺失崩溃 |
| 5 | `web-adapter.js` | 99.7 KB | 引擎适配层，**不可动态化** |
| 6 | `assets/main/index.js` | 65.9 KB | 项目脚本 chunk（已含全部 features），首屏必需 |
| 7 | `assets/internal/index.js` | 44.1 KB | 引擎内置资源索引，**不可删** |
| 8 | `engine-adapter.js` | 23.3 KB | 引擎适配层，**不可动态化** |
| 9 | `first-screen.js` | 18.4 KB | 启动首屏，首屏必需（可裁实现，收益小） |
| 10 | `logo.png` | 14.2 KB | 启动图，可换 4KB 以内压缩图（收益小，产品决定） |

> 结构性事实：**引擎单独占 2.5MB（85%），项目自身代码+资源只有约 0.41MB**。
> 主包天花板完全由引擎决定；REQ-NF 目标 3.5MB 当前已满足。v1.0 无需任何瘦身动作。

## 4. 构建参数快照

| 参数 | 值 | 来源 |
|---|---|---|
| Cocos Creator | 3.8.8（`client/package.json` 写死） | `src/settings.json.CocosEngine` |
| 平台 | `wechatgame` | 同上 `engine.platform` |
| 引擎 debug | `false`（release 构建） | 同上 `engine.debug` |
| 设计分辨率 | 1280×720，policy=4 | 同上 `screen` |
| Bundle 压缩 | 全部 `subpackage`（`overwriteSettings.wechatgame`） | `client/settings/v2/packages/builder.json` |
| Bundle priority | b-common 6 / b-shallow 5 / b-deep,b-defense,b-island 4 / b-event,b-social 3 | `client/assets/bundles/b-*.meta` |
| 启动场景 | `assets/scenes/Boot.scene` | `src/settings.json.launch` |
| 预加载 Bundle | `resources`、`main` | `src/settings.json.assets.preloadBundles` |
| AppID | `wxecb8cb5662e35e0f`（真） | `project.config.json` |
| 构建产物时间 | 2026-10-26 10:31 | 目录 mtime |

## 5. 复现

```bash
node tools/measure-bundle.mjs            # 人读
node tools/measure-bundle.mjs --json     # measure.json 同款，入库比对用
```

三次连跑 `mainBytes` 均为 3,054,159，逐字节一致（V-4012.a 用）。

## 6. 已知偏差（必须随数字一起读）

1. **构建产物滞后源码**：`client/build/wechatgame/` 产出于 10-26 10:31；此后 `client/assets/scripts` 有 **67 个 `.ts`** 修改时间更晚（含 4003/4004 的 HookView 接表、引导浮层）。代码增量的字节影响不在 2.913MB 内，下次构建后须重跑本脚本对比。
2. **构建不可命令行复现**：本仓库 Cocos 编辑器不在 CLI PATH，`tools/measure-bundle.mjs` 只做**测量**、不做构建；构建需在 Cocos Creator 编辑器内执行，未自动化。
3. **分包为空壳**：8 个分包共 17.4 KB，与 `structure-verification.md` 记录的"Bundle 无真实资源"一致——这意味着当前主包**没有**任何可卸载到分包的真实资源，瘦身只剩"裁引擎模块"一条路。

## 7. 瘦身候选（仅当未来 >4MB 时启用；4014 已条件关闭）

| 优先级 | 候选 | 预计收益 | 阻塞 |
|---|---|---:|---|
| P1 | 构建裁剪 Spine 模块（项目未用 spine 动画） | −222 KB | 需主控批准改构建配置（本卡禁止） |
| P2 | 启动图 logo/slogan 压缩（pngquant 等效） | −15 KB | 产品决定视觉 |
| P3 | 引擎原生代码分包（`cocos-js` 转 subpackage） | −2.5 MB | 官方明确**引擎仍计入首包**，无效（见 structure-verification §5.2） |
| P4 | 引擎引擎插件/分离 | — | 同上，无效 |

> P3/P4 已证伪，列出以防后人重试。

## 8. 回滚

```bash
git checkout -- tools/measure-bundle.mjs   # 新增文件，无既有文件被改
rm -rf docs/06_validation/evidence/EVD-4012
```
