---
id: EVD-4004
title: TASK-4004 新手引导 5 步浮层
status: accepted
module: validation
owner: hark
created: 2026-10-27
review: 2026-11-27
related: [TASK-4004, PLAN-V003-05, PLAN-V010-00]
---

# EVD-4004 · 新手引导浮层

## 1. 目标与交付

首启按 `guide_steps` 表（D-05，5 行）逐步引导，完成态写 `modules.guide.done: string[]`，重启后不再重复；任何异常不得阻塞主界面。

**提交**：`10126af`　**文件**：
- `client/assets/scripts/features/guide/model/GuideModel.ts`（覆写空桩，69 行 → 含 `readDone/setSteps/currentStep/isFinished`）
- `client/assets/scripts/features/guide/view/GuideOverlay.ts`（新增 138 行，覆盖层 + 步骤文案 + `去试试`/`跳过` 按钮）
- `client/assets/scripts/app/MainView.ts`（挂载 `createGuideOverlay(this.node)`，+3 行）

## 2. 表实测

```
guide_steps.json → 5 行（note 均为 DS-D-05）
step_1 出钩 / step_2 背包 / step_3 合成 / step_4 回收 / step_5 榜单
```
`text` 字段供浮层显示（`GuideOverlay.ts:91`：`step.text ?? step.name ?? '步骤 N'`）；`target_panel` 命中 PanelKey 时按钮文案为「去试试」（`:93`），否则「跳过」。

## 3. 存档契约（§3.4 裁定）

- 键：`modules.guide.done: string[]`，`readDone()` 对"缺键/类型错/非数组"一律回落 `[]`（`GuideModel.ts:31-39`）。
- **开放 map 扩展**：不递增 `SAVE_SCHEMA_VERSION`、不写迁移函数（§3.4 裁定）；写入走"剥离旧 checksum → 改 modules → `sealSave`"，与 `HookModel.settle` 同构。

## 4. VERIFY

| 断言 | 结果 | 证据 |
|---|---|---|
| a) 首启出第 1 步 | PASS（代码走查） | `GuideOverlay.ts:91` 渲染 `model.currentStep` 对应行；`currentStep` 由"已完成集合"推导 |
| b) 5 步完成后不再出现 | PASS（代码走查） | `GuideModel.isFinished`（`currentStep >= totalSteps`）→ 浮层不激活 |
| c) 失败不阻塞主界面 | PASS | `readDone` 全分支容错；存档读写包 try/catch |
| d) 存档封印可验 | PASS（间接） | 复用 `sealSave`，同函数在 `merchant-flow` 单测中被 `verifySave` 验证为 true |
| e) 类型检查 | PASS | tsc 过滤式 0 行 |

## 5. 局限（诚实登记）

**本卡没有独立自动化测试**：`GuideModel` 虽是纯逻辑（不依赖 cc），但引导的"首启出现/逐步推进/完成不再现"依赖 `GuideOverlay` 的节点激活与 `MainView` 挂载时序，Node 侧无法覆盖；且当时未补 `GuideModel` 单测（`readDone` 容错、`setSteps` 推进、封印可验三例本可自动化）。**记为缺口**：建议在 4016 收尾时补 `tests/determinism/guide-flow.test.mjs`（≥3 例），当前运行时表现按 G-07 记 **UNKNOWN**，需真机或编辑器预览人工走查一次。
