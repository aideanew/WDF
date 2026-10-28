# EVD-7041 —— 面板统一六态提示（`ux-hint` 纯映射 + `panel-ui.renderUxState`）

- **对应任务**：plan-v010 TASK-7041（`05-slices-and-cards.md` §6 S4）
- **执行者**：主控
- **独立验收者**：子智能体（防自证循环，结论待填）
- **采集时间**：2026-10-28
- **前置**：TASK-7001（六态契约落地）、DESIGN-0001（设计源，§2/§4 权威）

## 设计（DAG：本卡只改 `panel-ui.ts` 基础设施，不碰任何面板桩）

六态中 `loading`/`success`/`conflict` 由调用方处理（骨架/成功内容/二选一弹窗），本卡只统一
`empty`/`error`/`noPermission` 三态的**提示 + 下一步按钮**。为保证 Node 可测（防自证循环），
文案/按钮推导放**纯函数层** `app/ux-hint.ts`（不 import cc），Cocos 渲染层 `panel-ui.ts`
只做「按 plan 造 Label + 按钮」。

- `ux-hint.ts`：`uxHintPlan(view, texts)` → `{ text, next?, retryable }`；`UX_NEXT_LABEL` 六出口文案。
- `panel-ui.ts`：`renderUxState(parent, view, opts)` → 复用既有 `addLabel`/`addButton` 渲染，
  返回 Label 或 null（loading/success/conflict）。

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | `empty` 提示 + 透传 next、不可重试（§4.4 必须给下一步） | **PASS** | ux-hint.ts `uxHintPlan` + ux 1/2 |
| 2 | `error` 可归因文案（texts 覆盖）+ 仅 `view.retryable` 决定重试按钮（§4.2） | **PASS** | ux 3/4 |
| 3 | `noPermission` 提示 + 透传 next、不可重试（§4.3 必带出口，铁律 3） | **PASS** | ux 5 |
| 4 | `loading`/`success`/`conflict` 返回 null（调用方处理） | **PASS** | ux 6 |
| 5 | 六种 UxNext 出口都有按钮文案 | **PASS** | ux 8 |
| 6 | `panel-ui.renderUxState` 复用 addLabel/addButton 渲染、无重复样板 | **PASS** | panel-ui.ts L80-103 |
| 7 | 类型检查通过（`typecheck:client` exit 0） | **PASS** | typecheck-client.txt |
| 8 | 纯映射测试通过（8 例，Node 直载 ux-hint.ts） | **PASS** | ux-hint-test.txt（pass 8/fail 0） |
| 9 | `npm run guard` 全过 | **PASS** | guard.txt |

## 反证（独立验收者）

- `ux-hint.ts` 不 import cc / platform / wx / tt，Node 直载无副作用（register.mjs 自动补 `.ts`）。
  契约链 `ux.ts → errors.ts + save.ts` 均无 import，纯度满足。
- `renderUxState` 只依赖既有 `addLabel`/`addButton`（TASK-3101/TASK-5007a 产出），未新增渲染样板；
  面板桩各自在自己卡片里改调 `renderUxState`，本卡不改任何面板行为（DAG）。
- 未改 generated、packages/contracts、game-core、server/src、game-data；未动存档/数据库版本。
- 缺省兜底文案（暂无数据/操作失败/无权）仅作兜底，面板应按场景给 `texts` 覆盖（§4.2 归因要求）。

## 变更清单（单卡）

- `client/assets/scripts/app/ux-hint.ts`（新增：纯映射 + 六出口文案）
- `client/assets/scripts/app/panel-ui.ts`（新增 `renderUxState`；复用 addLabel/addButton）
- `tests/determinism/ux-hint.test.mjs`（新增 8 例）

原始输出：`ux-hint-test.txt` / `typecheck-client.txt` / `guard.txt`。
