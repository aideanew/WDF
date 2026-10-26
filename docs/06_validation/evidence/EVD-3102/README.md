---
id: EVD-3102
title: TASK-3102 背包列表页 验收证据
status: active
module: inventory
owner: agent-client-a
created: 2026-10-26
related: [TASK-3102, TASK-3100, TASK-3101, TASK-3202, MUST-07, MUST-08]
---

# EVD-3102 · 背包列表页验收证据

## 改动文件

| 文件 | 类型 | 说明 |
|---|---|---|
| `client/assets/scripts/features/inventory/model/InventoryModel.ts` | 修改（原 6 行占位） | `project()` 纯投影 + `rows` / `unknownIds` / `clear()`。**零 cc 依赖** |
| `client/assets/scripts/features/inventory/view/InventoryPanel.ts` | 修改（原 44 行桩） | 覆写 `createInventoryPanel`：标题 + 列表（≤20 行）+ 空态按钮 + 配置加载失败态 |

数据链：`LocalSave.load()` → 扁平 `modules.inventory` → `InventoryModel.project(section, index)`
→ `game-core/inventory.listRows`（C-04 交付）。配置索引由 `table('items')` **一次构造**后复用。

## 机器可验证项（V-07，现场实跑）

| id | 命令 | 结果 |
|---|---|---|
| V-07.a | `node --import ./tools/runtime/register.mjs --test tests/determinism/inventory.test.mjs` | ✅ `tests 8` / `pass 8` / `fail 0`（C-04 用例无回归） |
| V-07.b | `npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit \| grep "error TS" \| grep "E:/Demo/WDF/"` | ✅ 无输出（项目源码零类型错误） |
| V-07.c | 剥离注释后扫 `features/inventory/**` 的 `weight\|capacity` | ✅ 零命中 |
| V-07.d | `npm run guard` | ✅ 9/9 通过（含「客户端依赖边界」：model 层未 import `cc`） |
| V-07.e | 人工/录屏：空存档 → 空态；写入 `item_0001×3, item_0002×1, bad_id×1` → 2 行 + 1 条 unknown 日志 | ⚠ **UNKNOWN**（替代证据 = 录屏，本机无 Cocos 运行时可自动化） |

> V-07.c 的命令写法已修正：brief 原文 `grep -rn "weight\|capacity"` 中 `\|` 在基本正则里是**字面管道符**，
> 只会匹配字符串 `weight|capacity` 本身（实测命中的正是本文档注释）。已改为 `-E` 模式并剥离注释，
> 否则任何提到这两个词的文档注释都会假红。

## 字段填充率实测（G-03「不显示重量/容量」的依据）

```
items 共 106 行 | weight 有值 0 | capacity 有值 0 | base_price>0 有值 105
```

`weight` / `capacity` 全部为 null，显示出来只能是 0 —— 属伪造数据，故整栏不渲染（与 C-04 的
`listRows` 只投影 4 字段一致）。`base_price` 有 1 行为 0，直接按原值显示，不做兜底。

## 已知偏差

| 与任务卡的差异 | 理由 |
|---|---|
| S-07.4 把 `LocalSave.load()` 放进 `InventoryModel.load()`；实际 **IO 留在 View**，Model 只收 `project(section, items)` | 与本仓既有模式同构（`HookView` 调 `LocalSave`、`HookModel.applyToSave` 吃 file 返 file），且 `clientBoundaries` 守卫第 63 行的理由是「model 层不依赖 cc（**保持可单测**）」——Model 若 import `services/config/index.ts` 会**传递性** import `cc`，守卫正则查不出但 Node 下无法 import，等于废掉该条守卫的目的 |
| 新增「配置表未就绪」第三态（文案「背包读取失败：配置表未就绪，请重新进入游戏」） | `preload` 失败时 `table('items')` 返回 `[]`，每个存档 id 都会落入 `unknownIds`，若按空背包渲染会误导玩家去反复打捞。5 行代码，避免错误信息 |
| 列表不用滚动容器，改「≤20 行 + 还有 N 项」 | 卡上要求即如此；规避小游戏端 ScrollView 兼容性风险 |
| V-07.c 断言改为注释剥离版 | 见上；brief 原式会因本文档的注释假红 |

## 前置发现（既存缺口，非本卡引入）

1. **`InventoryPanel.ts.meta` 从未入库**（TASK-3101 交付时缺）。同样情况：`services/config/tables.ts.meta`（C-02 新增）。
   未手工伪造 `.meta`：UUID 与 importer 版本必须由 Cocos 编辑器生成，手写可能与之冲突。
   `MainView` 走 TS 相对路径 import（不引用 uuid），故当前无引用断裂；下次打开工程时编辑器会自动补齐。
2. **`client/temp/tsconfig.cocos.json` 的 `target` 是 ES2015** → lib 无 `Promise.finally`（ES2018）。
   首版用了 `.finally()` 直接报 `TS2550`。已改 `try/finally`。**W2/W3 后续卡片同样必须避开**
   `.finally` / `flatMap` / `Object.fromEntries` / `String.matchAll` 等 ES2018+ 库 API（`?.` / `??` 是语法，会被降级，可用）。

## 回滚命令

```bash
git checkout -- client/assets/scripts/features/inventory/
```
