---
id: EVD-3103
title: TASK-3103 合成面板 验收证据
status: active
module: crafting
owner: agent-client-a
created: 2026-10-26
related: [TASK-3103, TASK-3201, TASK-3100, ADR-0002, MUST-09]
---

# EVD-3103 · 合成面板验收证据

## 改动文件

| 文件 | 类型 | 说明 |
|---|---|---|
| `client/assets/scripts/features/crafting/model/CraftingModel.ts` | 修改（原 6 行占位） | `toShapes()` / `project()` / `applyToSave()`。**零 cc 依赖** |
| `client/assets/scripts/features/crafting/view/CraftingPanel.ts` | 修改（原 35 行桩） | 覆写 `createCraftingPanel`：顶部说明 + 可制作/材料不足分组 + 点击制作 |
| `tests/determinism/crafting-flow.test.mjs` | **新增** | 10 用例，覆盖 S-10.5 / S-10.6 / S-10.7 全语义 |

## 机器可验证项（V-10，现场实跑）

| id | 命令 | 结果 |
|---|---|---|
| V-10.a | `node --import ./tools/runtime/register.mjs --test tests/determinism/crafting.test.mjs` | ✅ `pass 11` / `fail 0`（C-03 无回归） |
| V-10.a′ | `node --import ./tools/runtime/register.mjs --test tests/determinism/crafting-flow.test.mjs` | ✅ **`tests 10` / `pass 10` / `fail 0`**（本卡新增） |
| V-10.b | `node --import ./tools/runtime/register.mjs --test tests/integration/hook-save.test.mjs` | ✅ `pass 4` / `fail 0`（存档封印未破坏） |
| V-10.c | §5.1 类型检查（新式） | ✅ 7 个，与 BASE-34 基线一致，**未新增** |
| V-10.d | `npm run guard` | ✅ 9/9 |
| V-10.e | 剥离注释后扫 `features/crafting/**` 的 `weight\|capacity\|unlock_level\|\bjob\b\|station` | ✅ 代码零命中 |
| V-10.f | `npm test` | ✅ **`tests 107` / `pass 107` / `fail 0`** |
| V-10.g | **人工**：制作后 UI 列表刷新、库存行变化 | ⚠ **UNKNOWN**（核心语义已由 V-10.a′ 自动化覆盖，仅剩视觉部分） |

## 核心语义已由自动化测试覆盖（不必等录屏）

`CraftingModel` 只依赖 `generated/game-core`，Node 可直载，因此 S-10.6 / S-10.7 是**可测的**：

| 用例 | 断言 |
|---|---|
| 材料足够 | `revision+1`、材料 −1、产物 `+outCount`、`verifySave === true`、**入参档完全未被改动** |
| 材料不足 | `applyToSave` **返回入参同一引用**（`===`），revision/库存不动 |
| 空存档（无 inventory 段） | 同样零副作用 |
| JSON 往返（模拟杀进程） | `verifySave` 仍过、revision 与库存保留、可继续合成到 revision 2 |
| 分组 | craftable/lacking 划分正确；缺料文案 `缺 名称 ×N`；**3 输入配方按 inputs 顺序列出 3 条** |
| invalid 输入串 | `bad_no_star` / `bad_zero` / `bad_float` / `bad_mixed` 4 条全部剔除并计数 |
| 产物未知 id | 剔除并计数（不显示空名字） |
| `output_count` 非法值 | 兜底为 1（不显示 `×0` / `×NaN`） |
| 非法 section | `undefined`/`null`/`[]`/`'item_0001'`/`42`/`true` 全部不崩、判为材料不足 |

## 任务卡前提更正（重要）

TASK-3103「依赖与阻塞」写："若 80 条配方中有无法解析的输入串（**21 条设施/建筑类**已在
`UNKNOWN-TABLES.md` §4 跳过）"。实测：

```
recipes.json 共 80 条 | invalid 输入串 0 条 | 产物不在 items 表 0 条 | 输入材料不在 items 表 0 个 id
```

**80 条全部可解析，跳过数为 0。** "21 条"指的是 UNKNOWN-TABLES 阶段**根本没进表**的配方，
不是表内的非法条目。代码仍按"剔除并计数"实现（防御性），但当前不会触发。
用例 `真实 80 条配方全部可解析` 把这条事实钉死，防止未来数据变更时静默丢配方。

顺带实测：`station` 有值 **48/80**、`job` **0/80**、`unlock_level` **0/80**。
`station` 其实有数据，但本卡按 S-10.4 一律不读（门槛逻辑属数值未定，且会牵涉新 UI 语义）。

## 已知偏差与跳过项

| 项 | 说明 |
|---|---|
| V-10.e 改为注释剥离版 | brief 原式 `\|` 是字面管道符（同 V-07.c 的问题）；且直接 grep 会命中"不显示 station/job/unlock_level"这句**说明注释**。已改为 `-E` + 剥离注释，与 `tools/guard/checks.mjs` 的 `stripComments` 同口径 |
| 列表上限 16 行 + "还有 N 条配方未显示" | 80 条配方超出屏面预算（面板纵向可用约 810px）；不做 ScrollView（规避小游戏端滚动兼容性，与 C-07 一致） |
| 埋点跳过 | `features/telemetry` 仍是桩，不得自建 API |
| 面板刷新按钮 | 合成面板**没有**刷新按钮：点击制作成功后自动重算，切 Tab 回来会 `refresh()`。榜单/设置的刷新按钮是网络请求需要，这里是纯本地计算 |

## 回滚命令

```bash
git checkout -- client/assets/scripts/features/crafting/
rm tests/determinism/crafting-flow.test.mjs
```
