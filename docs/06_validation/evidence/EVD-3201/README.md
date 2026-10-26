---
id: EVD-3201
title: TASK-3201 crafting 可制作判定 验收证据
status: active
module: crafting
owner: agent-core
created: 2026-10-26
related: [TASK-3201, MUST-09, ADR-0002]
---

# EVD-3201 · crafting 判定验收证据

## 改动文件

| 文件 | 类型 | 说明 |
|---|---|---|
| `packages/game-core/src/crafting/index.ts` | 修改（原 3 行占位） | `parseInputs` / `canCraft` / `consume` + 四个类型。**零 import** |
| `tests/determinism/crafting.test.mjs` | 新增 | 11 用例 |

## 机器可验证项（V-03，全部实跑通过）

| id | 场景 | 结果 |
|---|---|---|
| V-03.a | `node --import ./tools/runtime/register.mjs --test tests/determinism/crafting.test.mjs` | ✅ `tests 11` / `pass 11` / `fail 0`（要求 ≥8） |
| V-03.b | `grep -cE "Math\.random\|Date\.now\|new Date\|from 'cc'\|node:fs" packages/game-core/src/crafting/index.ts` | ✅ `0` |
| V-03.c | `npm run sync && npm run guard` | ✅ 已同步 43 个文件 / 9-9 通过 |

## 用真实数据驱动的关键用例

测试直接读 `client/assets/resources/config/recipes.json`（80 行），断言：

| 断言 | 实测 |
|---|---|
| 全部 80 条配方 `parseInputs` 的 `invalid` 均为空 | ✅ |
| 输入串数量分布 | ✅ `{1: 31, 2: 44, 3: 2, 4: 3}` —— 与 EXEC-BRIEF BASE-04 完全一致 |
| 真实 3 输入配方 `recipe_0043`（`item_0058*1;item_0031*1;item_0035*1`） | ✅ 解析为 3 段 |
| 真实 4 输入配方 `recipe_0078` | ✅ 解析为 4 段 |

## 阻塞条件裁决（重要）

TASK-3201「阻塞条件」原文："若 `recipes.inputs` 的解析产物在 `config-types.ts` 中不是数组结构 →
停下登记 ADR-0010，**不得在 game-core 里解析原始字符串**"。

实测 `RecipesRow.inputs: string`（非数组），字面上触发该条件。但**裁决为不成立**：

- 把字符串解析为结构化输入**本身就是纯规则**（无 IO、无随机、无时间），
  按 AGENTS.md 归属表"纯规则 → `packages/game-core/src/<module>/"，解析必须在 game-core 做；
- 放到客户端 model 层等于把规则下沉到表现层，且会让 `canCraft` 依赖客户端产物，破坏前后端一致性；
- 放到 `tools/gen` 生成阶段会改变生成物结构，波及所有消费方，成本远超收益。

故正常执行。ADR-0010 / ADR-0011 仅作信息登记，未变更任何契约。

## 设计取舍

- **`consume` 包含产出**（扣材料 + 加产物）：TASK-3103 的流程是 `canCraft → consume → 写回`，
  若 consume 只扣材料，调用方还得自己加产物，容易漏。V-10.f 明确要求"产物 +1"。
- **库存不足时夹到 0 而非负数**：consume 不校验 ok（调用方先 canCraft），夹到 0 可防脏数据流入存档。
- **不用 `localeCompare`**：改用 UTF-16 码元比较，避开 ICU 区域差异，保证跨环境确定性。

## 已知偏差

| 与任务卡的差异 | 理由 |
|---|---|
| `consume` 额外产出产物 | 见上「设计取舍」 |
| 多一个 `parseSegment` 私有函数 + `RecipeInput` 导出类型 | 拆分使 `parseInputs` 保持单职责 |
| 额外 3 个用例（共 11，要求 ≥8） | 覆盖 `consume` 夹取、非法片段全集、真实数据分布 |

## 回滚命令

```bash
git checkout -- packages/game-core/src/crafting/index.ts \
  client/assets/scripts/generated/game-core/crafting/index.ts \
  client/assets/scripts/generated/_sync-manifest.json
rm tests/determinism/crafting.test.mjs
```
