# EVD-7004 —— 占位值与真实值可区分

- **对应任务**：plan-v010 TASK-7004（`05-slices-and-cards.md`）
- **执行者**：主控
- **独立验收者**：子智能体（防自证循环，结论 **PASS**，完成度 100%）
- **采集时间**：2026-10-28
- **基线**：`6685212`（7002 后）

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | `_placeholder.json` 存在且含 `items.weight`、`items.capacity` | **PASS** | 结构 `{table:{field:true}}`；`items.weight:true`、`items.capacity:true` 实测存在 |
| 2 | 重跑 `npm run gen` 后 `git status` 只多该文件（其余 config 不变） | **PASS** | 46 表/327 行；config 目录仅 `?? _placeholder.json`；configVersion 生成前后均 `c6a54f0fb00341c5`（未漂移） |
| 3 | `UNKNOWN-TABLES.md` 的 ✅ 标记与「可用性」列不再矛盾 | **PASS** | §3 可用性 11 行与 `04 §4` 可用? 列逐组一致（10 组占位 + prices.recycle_bp=✅ 正确） |

## 反证（独立验收者）

- `game-data/source`、`packages/game-core` 零改动（未改任何 `.csv`）。
- `--check` 模式在旁挂写入前 `process.exit(0)`，未被破坏。
- `configVersion = sha(JSON.stringify(clean))`，`clean` 不含 PLACEHOLDER_FIELDS → **旁挂文件未进 hash**（阻塞条件满足）。
- 10 组占位字段全部为 schema 真实声明字段（`weight/capacity` 在 items.schema.json、`job` 在 recipes.schema.json）。
- `tests/contract/contract.test.mjs` 3/3 pass。

## 变更清单（单卡）

- `tools/gen/config.mjs`：新增 `PLACEHOLDER_FIELDS` 常量（10 组字段）+ 写 `_placeholder.json`（非 --check 路径，不进 hash）
- `game-data/UNKNOWN-TABLES.md`：§3 加「可用性」列（❌ 2 / ⚠ 8 / ✅ 1）+ 口径注
- 产物：`client/assets/resources/config/_placeholder.json`（`npm run gen` 生成）

原始输出：`acceptance.txt`。
