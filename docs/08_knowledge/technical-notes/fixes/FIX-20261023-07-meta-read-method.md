---
id: KB-FIX-20261023-07
title: Bundle 配置核对方法错误（require 读 .meta）导致误判"配置不存在"，并校正事实基线
status: active
date: 2026-10-23
kind: doc
severity: P2
module: cross
owner: hark
related: [KB-FIX-20261023-02, ARCH-0001, UI-0003]
---

# Bundle 配置核对方法错误，导致误判与事实基线错误

## 1. 现象

分两次出现：

**第一次（误判）**——用一行 `node -e` 去读 Bundle 的 `.meta`：

```text
$ node -e "require('./client/assets/bundles/b-common.meta')"
SyntaxError: Unexpected token ':'            # Node 把 .meta 当 JS 解析
```

当时把这个报错理解成"读不到 → Bundle 配置没写进去"，于是在 `current-plan.md` 里写下"7 个 Bundle 均未设置 `priority`"。

**第二次（基线错误暴露）**——本轮写 `npm run check:bundles` 用 `JSON.parse(fs.readFileSync(...))` 重新读：

```text
Bundle 配置核对（期望值来自 ARCH-0001 §4.4）

文件夹       isBundle  priority(期望)  压缩类型           判定
-----------  --------  --------------  -----------------  ----
b-common     ✅         6(6)            (未设置)              ❌
b-shallow    ✅         无(5)            (未设置)              ❌
b-deep       ✅         无(4)            (未设置)              ❌
...
```

`b-common` **的 `priority=6` 早就在文件里**——之前那句"7 个全未设置"是错的。

## 2. 影响

- **判断错误会传导**：`current-plan.md` 的 E-01 阻塞项、`structure-verification.md` 第 4 节的实测表都写成了"7 个全未配"。这类"事实基线"是后续所有决策的输入，错一次会让人重复做已经做过的事（比如让用户再配一遍 `b-common`）。
- **核对方法错比结论错更麻烦**：`require()` 的报错信息（`Unexpected token ':'`）完全没提"读法不对"，很容易被当成"数据有问题"。而这个错误曾经直接导致一次**误判 Bundle 配置不存在**。
- 严重度定 P2（不是 P0/P1）：不影响构建、不丢数据，只是让阻塞清单与验证记录失真；但它污染的是"权威事实"，必须修。

## 3. 根因

两件事：

1. **`.meta` 是纯 JSON**，Cocos 用它记录资源导入信息；Node 的 `require()` 只按扩展名 `.js/.cjs/.json` 识别，`.meta` 会被当 JS 源码走 CJS 解析 → 第一个 `:` 就炸。
2. **文档里的核对方式是手写命令行**（`docs/03_solution/ui/cocos-editor-glossary.md` §6 原文），既没写怎么读，也没断言期望值——等于让读者自己去"看输出猜结论"。凡是"看一眼判断对不对"的核对，都不算核对。

## 4. 修复

| 文件 | 改动 |
|---|---|
| `tools/dev/check-bundles.mjs`（新建） | 逐个 `JSON.parse(readFileSync('client/assets/bundles/b-*.meta'))`，与 ARCH-0001 §4.4 的目标值逐项比对，输出表格；有缺项退出码 1 并打印 5 步修法 |
| `package.json` | 新增脚本 `check:bundles` |
| `docs/03_solution/ui/cocos-editor-glossary.md` §6 | 删掉会报错的 `require('.meta')` 一行命令，改为 `npm run check:bundles`；并显式标注"不要用 require 读 .meta"这条坑 |
| `docs/04_planning/current-plan.md` | E-01 与事实基线改为"`b-common` 已有 `priority=6`，其余 6 个无 priority，7 个全无 compressionType" |
| `docs/06_validation/structure-verification.md` §5 | 新增 Bundle 配置实测行，并注明"第 4 节的说法被推翻" |

**压缩类型的判定方式**（Cocos 各版本键名不完全一致，不能硬编码 `compressionType`）：遍历 `userData` 的键，命中 `/compression/i` 后，看值（字符串或平台表对象）里是否出现 `subpackage`。这样 `{"compressionType":"subpackage"}` 与 `{"compressionType":{"wechatgame":"subpackage"}}` 两种形态都能识别。

**放弃的方案**：继续用一行 `node -e` 但写对（`JSON.parse(fs.readFileSync(...))`）。
否决理由：一行命令没法断言、没法给退出码、没法打印修法。**核对工具必须有退出码**，否则进不了自动化，下次还会靠人眼看。

## 5. 验证

```text
$ npm run check:bundles
Bundle 配置核对（期望值来自 ARCH-0001 §4.4）
...
还有 7 个 Bundle 未配好。修法见 docs/03_solution/ui/cocos-editor-glossary.md §1~§3：
  1. Assets 面板里单击 b-* 文件夹（不是双击）；
  2. 右侧 Inspector → 勾 Independent Config（独立配置），否则平台表整片灰掉；
  3. Mini Game 行 → Compression Type 选 Subpackage（小游戏分包）；
  4. 填 Bundle Priority；
  5. 点 Inspector 右上角绿色 ✓ 保存（不点不落盘）。
EXIT=1
```

判定：脚本**按预期正确报出"`b-common` 的 priority 是 6，其余缺"**（这正是本次要校正的事实），退出码 1 与"还有 7 个未配好"一致（`b-common` 因缺压缩类型仍计为未配好）。**PASS**（修的是核对能力，不是 Bundle 本身——Bundle 仍需用户在编辑器里配，那是 E-01）。

`npm run verify` 仍全绿：9 项守卫 + 17 测试，EXIT=0。

## 6. 回归与遗留

- **遗留（属 E-01，需用户在编辑器操作）**：7 个 Bundle 的 `compressionType` 全未设置；6 个缺 `priority`。脚本只负责"如实报告"，不会也不能代填 `.meta`——手改 `.meta` 会与 Cocos 的 uuid 体系冲突，**这类文件只能由编辑器写**。
- **规则**：所有"配置是否已生效"的核对，一律做成带**退出码**的脚本，禁止文档里留"你自己看一下输出对不对"的命令行。
- **教训**：`require()` 读非 `.json` 扩展名的 JSON 文件必炸，这是 Node 的扩展名解析规则，不是数据问题。凡是报错信息里出现 `Unexpected token ':'` 而文件本身是 JSON，第一反应应该是"读法错了"，不是"数据坏了"。
