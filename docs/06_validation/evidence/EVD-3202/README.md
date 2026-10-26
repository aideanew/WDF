---
id: EVD-3202
title: TASK-3202 inventory 存档段投影 验收证据
status: active
module: inventory
owner: agent-core
created: 2026-10-26
related: [TASK-3202, MUST-07, MUST-08, ADR-0002]
---

# EVD-3202 · inventory 投影验收证据

## 改动文件

| 文件 | 类型 | 说明 |
|---|---|---|
| `packages/game-core/src/inventory/index.ts` | 修改（原 3 行占位） | `listRows` + `ItemRow` / `ListRowsResult` 类型 |
| `tests/determinism/inventory.test.mjs` | 新增 | 8 用例 |

## 机器可验证项（V-04，全部实跑通过）

| id | 场景 | 结果 |
|---|---|---|
| V-04.a | `node --import ./tools/runtime/register.mjs --test tests/determinism/inventory.test.mjs` | ✅ `tests 8` / `pass 8` / `fail 0`（要求 ≥6） |
| V-04.b | `grep -cE "weight\|capacity\|stack\|unlock_level" packages/game-core/src/inventory/index.ts` | ✅ `0` |
| V-04.c | `npm run sync && npm run guard` | ✅ 已同步 43 个文件 / 9-9 通过 |

## 签名澄清（配合 BASE-19，v2 与任务卡正文均写错）

```ts
listRows(section: unknown, items: Record<string, ItemsRow>): { known: ItemRow[]; unknownIds: string[] }
```

- `section` = `save.modules.inventory` —— **扁平 `{[itemId]: count}`**，没有 `.items` 一层。
  证据 `HookModel.applyToSave`：`const inv = { ...(modules.inventory ?? {}) }`。
- `items` = **配置表**的 id→`ItemsRow` 索引（由 `table('items')` 构造），不是存档数据。

## 非法输入的全集覆盖

用例对以下 `section` 值断言一律返回 `{known:[], unknownIds:[]}` 且不抛：
`undefined` / `null` / `[]` / `'item_0001'` / `42` / `true` / `false` / `{}` / `0` / `NaN`

数量过滤：`0` / `-1` / `1.5` / `'3'` 全部跳过，只留整数正数。

## 已知偏差

| 与任务卡的差异 | 理由 |
|---|---|
| `section` 语义为扁平 map（非 `modules.inventory.items`） | 任务卡正文写错；实测 `HookModel` 写入的是扁平结构（BASE-19）。主控已放行更正任务卡正文 |
| 排序用码元比较而非 `localeCompare` | `localeCompare` 依赖 ICU 区域，跨环境不确定；本模块要求确定性 |
| 额外 2 个用例（共 8，要求 ≥6） | 补非法 section 全集、真实存档段解析 |

## 回滚命令

```bash
git checkout -- packages/game-core/src/inventory/index.ts \
  client/assets/scripts/generated/game-core/inventory/index.ts \
  client/assets/scripts/generated/_sync-manifest.json
rm tests/determinism/inventory.test.mjs
```
