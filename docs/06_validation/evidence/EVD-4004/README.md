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
| e) 类型检查 | PASS | `npm run typecheck` 裸跑 0 错（2026-10-28 复跑；旧「过滤式」口径已作废） |
| f) 纯逻辑自动化 | PASS（8/8） | `tests/determinism/guide-flow.test.mjs`（见 §5） |

## 5. 后补单测（2026-10-28，缺口已关闭）

`tests/determinism/guide-flow.test.mjs`，**8 例全通过**：

```
# tests 8 / # pass 8 / # fail 0
```

覆盖：`readDone` 四分支容错（缺键 / 类型错 / 非数组 / 正常）+ `hydrate` 三种推进态（首启 / 中途 / 全完成）+ `applyDone` 落盘（`modules.guide.done` 追加、`revision+1`、`sealSave` 后 `verifySave` 为 true）+ 全完成返回同一引用（不产生多余写）× 入参不可变 + JSON 往返后重进不再出现。

**仍存局限**：单测只锁 `GuideModel` 纯逻辑；`GuideOverlay` 的节点激活与 `MainView` 挂载时序依赖 `'cc'`，Node 侧覆盖不到 → 该部分按 G-07 记 **UNKNOWN**，需编辑器预览或真机人工走查一次。
