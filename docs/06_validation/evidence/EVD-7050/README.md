# EVD-7050 —— `npm run stage` 定向体检（I-4：影响面 + 该模块所有测试，一条命令）

- **对应任务**：plan-v010 TASK-7050（`05-slices-and-cards.md` §7「`npm run stage` 定向体检」）
- **执行者**：主控
- **独立验收者**：子智能体（防自证循环，结论待填）
- **采集时间**：2026-10-28
- **前置**：TASK-7001（module-catalog 唯一登记处）、I-4（阶段体检要能自动圈定测试）

## 设计

`npm run stage <关键词>` = 两步，复现 `tools/guard/impact.mjs` 的模块匹配谓词
（`id === kw || tables.includes(kw) || save.includes(kw) || name.includes(kw)`，module-catalog 权威）：
1. **定位模块** → `module-catalog.json` 命中；
2. **映射测试** → `tests/{determinism,integration,contract}/<module>*.test.mjs`（文件名前缀）∪
   内容整体词引用模块 id 的联动测试；**串行**跑，逐文件汇总；无测试时**明确打印"该模块无测试"**，
   不静默成功（I-4）。

与全量 `npm run verify`（gen + guard + 全测 + 双端类型检查）的区别：`stage` 是**定向**的，
只跑关键词命中模块的测试，用于「单卡只跑它改到的测试」（N-6 阶段体检），不做门禁。

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | `npm run stage chest` 跑 ≥4 个测试文件 | **PASS** | stage-chest.txt：`# stage chest：模块 chest → 6 个测试文件` |
| 2 | `npm run stage fishing` 打印"无测试"（不静默成功） | **PASS** | stage-fishing.txt：`命中模块 fishing，但该模块无测试`，exit 0 |
| 3 | 串行跑 + 逐文件汇总 | **PASS** | stage.mjs 第 3 步：`spawnSync` 逐个文件；`# stage chest 汇总：6 个文件，失败 0 个` |
| 4 | 映射覆盖文件名前缀 + 联动测试 | **PASS** | stage.mjs 第 2 步：chest 命中 6 个（chest.test / chest-flow.test / game-core / items-weights / integration-chest / handlers） |
| 5 | `npm run guard` 全过（package.json 变更不回归） | **PASS** | guard.txt：全部守卫通过 |
| 6 | 不触碰 `tools/guard/*`、`tools/runtime/*`（禁止修改） | **PASS** | `git status` 仅 `tools/dev/stage.mjs` + `package.json` + 证据目录 |

## 反证（独立验收者）

- 关键词未命中模块时退出码 1（`stage 未知词` → 明确报错，非静默）。
- 内容匹配用**整体词**（`\bchest\b`）避免 `hook`/`lines` 等通用词过度命中；跨模块联动测试（如 chest 的
  game-core/items-weights/handlers）按"该模块所有测试"纳入，属预期超集。
- `stage` 不 gen、不 guard、不 typecheck —— 只跑测试（定向体检语义）；全量门禁仍是 `npm run verify`。

## 变更清单（单卡）

- `tools/dev/stage.mjs`（新增：定位模块 + 映射测试 + 串行跑 + 无测试提示）
- `package.json`（新增 `stage` script）
- `docs/04_planning/plan-v010/09-execution-log.md`（7040/7050 记录，随本卡）

原始输出：`stage-chest.txt` / `stage-fishing.txt` / `guard.txt`。
