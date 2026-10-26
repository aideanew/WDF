---
id: KB-FIX-20261023-08
title: Bundle 压缩类型的配置位置写错（指向文件夹 Inspector），用户在真实界面上找不到选项
status: active
date: 2026-10-23
kind: doc
severity: P1
module: client
owner: hark
related: [UI-0003, ARCH-0001, KB-FIX-20261023-07]
---

# Bundle 压缩类型的配置位置写错，导致用户"真没找到选项"

## 1. 现象

用户拿着截图反馈："真没找到选项"。截图显示的是 **Project Settings → Bundle Config → Default Config → Mini Game 页签**，已勾 `Independent Config`，平台表里（Alipay / Douyin / Facebook / Honor / Huawei / Migu / OPPO / Taobao…）每行 `Compression Type` 都是灰的 `Merge Depend` 下拉。

而本项目文档 `cocos-editor-glossary.md` §1 此前写的操作入口是：**"选中 `assets/bundles/b-*` 文件夹 → 右侧 Inspector → Independent Config → WeChat Mini Game 行选 Subpackage"**。用户照着找，两个地方对不上：

- 文件夹 Inspector 里：v3.8 的 Bundle 区块与文档描述的字段排布不一致，且平台列表一屏放不下；
- 按直觉摸到的 Project Settings → Bundle Config：文档里只写了一句"不用改"——**这条是错的**。

## 2. 影响

- **P1**：E-01（分包配置）是当前唯一挡在"主包 3.1MB → 超 4MB 被微信拒收"前面的闸门；配置位置写错 = 用户操作不了 = 构建产物永远没有 `subpackages`。
- 连带损失：用户已经自行摸索到了**正确的地方**并勾了 `Independent Config`（已落盘 `configMode: "overwrite"`），但文档没能确认"你站在对的地方"，反而暗示这里是"不用改的方案页"——差一步就放弃。

## 3. 根因

两件事叠加：

1. **文档写于对 v3.7 及更早版本界面的认知**。官方手册（3.8/4.0《Asset Bundle》）明确："**从 v3.8 开始，Bundle 的配置方案被转移到 项目设置 → Bundle 配置 分页内。您可以点击属性检查器上的编辑按钮或者通过项目菜单打开项目设置对 Bundle 进行配置。**" 也就是说 v3.8 起**压缩类型/远程包**的权威配置位置从"文件夹 Inspector"挪到了"项目设置"，Inspector 只保留 `Is Bundle` / `Bundle Name` / `Bundle Priority` 并提供 `Edit` 按钮跳转。文档没跟着版本走。
2. **平台列表一屏放不下 + 排序按字母**。`WeChat Mini Game` 排在 `Taobao Mini Game` 之后（…Taobao → vivo → **WeChat** → Xiaomi），用户截图的可见区域刚好停在 Taobao，往下的微信行根本没进视野——"找到了界面但没找到那一行"。

## 4. 修复

| 文件 | 改动 |
|---|---|
| `docs/03_solution/ui/cocos-editor-glossary.md` §1 | 拆成 **§1A 项目设置 → Bundle Config**（压缩类型/远程包，引用官方 v3.8 变更原文）与 **§1B 文件夹 Inspector**（Is Bundle/名称/优先级/绿色 ✓）；标注 `WeChat Mini Game` 行需要**向下滚动**；补 `Uniform Config（All Mini Games）` 作为等价备选；标注 `Reset to Uniform Config / Reset` 不能点；项目设置自动保存、无绿色 ✓ |
| `docs/03_solution/ui/cocos-editor-glossary.md` §4 | `Bundle Config | 不用改` → **改为正确指引**（这一条就是"不用改"的错误源头） |
| `tools/dev/check-bundles.mjs` | 升级为**三层核对**：① 项目方案 `client/settings/v2/packages/builder.json` 的 `bundleConfig.custom.default.configs.miniGame`（统一值 + 微信平台行，深度遍历不预设序列化形态）；② Bundle 级覆盖（`.meta` 的 userData）；③ 构建产物 `game.json` 是否已含 `"subpackages"`。任何一层配了都算数，并打印"配置存在哪里" |
| 本记录 | 固化结论：**v3.8+ 权威位置 = 项目设置 → Bundle Config → Default Config → Mini Game → WeChat Mini Game 行 → Subpackage** |

**判定的关键事实（读文件实测，非界面目测）**：
`builder.json` 中 `bundleConfig.custom.default.configs.miniGame.configMode = "overwrite"`，`fallbackOptions.compressionType = "merge_dep"`，无微信平台单独值——即**用户勾选 Independent Config 已成功保存**，只差把微信行改成 `Subpackage`。"差一格"的事实只有读文件才能确认，界面截图看不出来。

## 5. 验证

升级后的脚本输出（改动前基线，8 处未达标 = 7 个 Bundle 缺压缩 + 构建产物无 subpackages）：

```text
$ npm run check:bundles
项目方案 Default Config（client/settings/v2/packages/builder.json）：
  Independent Config（configMode）: overwrite
  统一值 Uniform Config（All Mini Games）: (未设置)
  微信平台行 WeChat Mini Game: (未单独设置)

b-common     6(6)    (无)   (无)   ❌
b-shallow    无(5)   (无)   (无)   ❌
...
❌ 构建产物 game.json 还没有 "subpackages"
EXIT=1
```

用户按 §1A 操作后复跑脚本：微信行读出 `subpackage`、7 个 Bundle 判定 ✅；重新构建后 `game.json` 出现 `"subpackages"` 且 `build/wechatgame/subpackages/` 出现 `b-*` 目录 → 全部转绿、退出码 0。（此为**验收路径**，当前基线如上，待用户操作后闭环。）

## 6. 回归与遗留

- **规则**：凡是"编辑器/工具界面怎么点"的操作文档，必须写明**依据的版本号**，升级编辑器后第一件事就是复核本文档（front matter 的 `review` 日期就是干这个的）。Cocos 大版本（3.7→3.8→4.x）多次挪过配置位置，不能拿旧印象写文档。
- **遗留 1**：`check-bundles.mjs` 对项目方案的读取做了"深度遍历找 wechat + subpackage"的宽容匹配（不预设 Cocos 的序列化字段名）。用户改完后应把**实际的 builder.json 形态**回填进本记录与脚本注释——这是唯一一次需要"先跑再信"的地方。
- **遗留 2**：构建面板的 `Bundles → Include Bundles` 若为空需勾选，否则 Bundle 不进构建。脚本已把 `game.json` 的 `subpackages` 作为终极事实，构建后一验便知。
- **教训**：**"文档告诉用户去 A 处找，用户却在 B 处找到了疑似目标"时，第一反应应是查文档是不是过时了**，而不是让用户回 A 处。本次用户站在正确的地方，文档却让他离开。
