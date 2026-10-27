---
id: PLAN-V003-05
title: W1 数值清欠（TASK-4001~4004）
status: active
module: planning
owner: hark
created: 2026-10-27
related: [PLAN-V003-02, PLAN-V003-04]
---

# 05 · W1 · S11 数值清欠

> **铁律前置**：E-06（`game-data/UNKNOWN-TABLES.md` 头部）——文档没给的数值不得自编。
> 本波所有卡的第一验收项都是"**每个数字能指出处**"。

## TASK-4001 裁决清单落地辅助（核心，opus）

**目标**：把 02 §2.4 的 D-01~D-10 变成用户 10 分钟可勾完的裁决表，并备好转录脚手架。
**输入**：`02-scope-and-decisions.md` §2.4；`UNKNOWN-TABLES.md` §三/§四。
**输出**：
- `docs/04_planning/plan-v003/decision-sheet.md`（勾选式：每项 默认值/备选/留空 三选）
- `tools/gen/transcribe.mjs`（骨架：读 decision-sheet → 写 `game-data/source/*.csv` → 调 `npm run gen:config`，未裁决项直接 skip 并打印）
**步骤**：1) 生成 decision-sheet（从 §2.4 机械转换）；2) transcribe.mjs 支持 `--only=tokens` 增量；3) 对 locks/chests 先跑通一张表样例。
**验收**：不勾任何项时跑 transcribe → 全 skip、`gen:config` 行数不变（46 表 300 行）；勾 D-08 后 locks 表 hits_required 出现 4 个值。
**验证命令**：`node tools/gen/transcribe.mjs --dry-run && npm run gen:config`
**允许**：tools/gen/**、plan-v003/**；**禁止**：contracts/**、业务代码。
**规模**：小（0.5d）。**升级**：若用户要求改裁决交互形态 → 停手重出。

## TASK-4002 转录与回填勾销（助手 B，sonnect）

**目标**：按用户已勾选的 decision-sheet 转录数值，使 v1.0 所需 6 表（merchants/facilities/hooks/guide_steps + locks/chests 字段）非空。
**步骤**：1) `git pull` 确认 decision-sheet 有勾选（无 → BLOCKED 上报，不得猜）；2) 逐表转录，**每行加 source 注释列**（指向文档原文或裁决编号）；3) `npm run gen:config` + `npm run sync`；4) UNKNOWN-TABLES §三/§四/§五 回填勾销。
**验收**：a) 每个新值可溯源（注释列）；b) `gen:config` 行数/configVersion 变化且守卫 9/9；c) 0 行表仅剩 v1.0 不需要的；d) 未勾选项保持空。
**验证命令**：`npm run gen:config && npm run sync && npm run guard && npm test`
**允许**：game-data/**、client/assets/resources/config/**（经 gen 生成）、UNKNOWN-TABLES.md；**禁止**：contracts/**、server/**、手改 generated/**。
**规模**：中（0.5–1d）。

## TASK-4003 HookView 手感参数接表（助手 A，sonnect）

**目标**：`hooks` 表转录后，把 HookView 写死的 3 常量（HookView.ts:21-26）改为读表，出钩手感不变（回归等值）。
**步骤**：1) `config.table('hooks')` 读入；2) 缺行/缺字段回落现常量并 `console.warn`（**回落值=现值，不是新发明**）；3) HookModel 入参改为 cfg 注入；4) 现有 hook 测试全绿。
**验收**：a) 改表数值 → 手感变化可观测（力度条时长）；b) 删表回落原手感；c) tsc 过滤式 0 错。
**验证命令**：`npm run guard && npm test && npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 | grep -v "^C:/"`
**允许**：features/hook/**；**禁止**：改 HookModel 状态机语义、generated/**。
**规模**：小（0.3d）。

## TASK-4004 guide_steps 引导层（助手 A，sonnect）

**目标**：5 步引导数据驱动的最小 UI（半透明遮罩+一句文案+下一步），接 MainView 既有面板，不侵入面板内部。
**步骤**：1) 读 `config.table('guide_steps')`；2) 新建 `features/guide/view/GuideOverlay.ts`（纯代码 UI，参照 panel-ui 范式）；3) 步骤完成条件 = 对应 PanelHandle 首次 onShow；4) 完成态写 LocalSave `modules.guide.done`。
**验收**：a) 首启出第 1 步；b) 5 步走完不再出现（清档重现）；c) 引导失败不阻塞主界面（try/catch 全包）；d) 守卫+测试绿。
**验证命令**：同 4003。
**允许**：features/guide/**（新建）、app/MainView.ts 挂载点 ≤3 行；**禁止**：改各 Panel 内部。
**规模**：中（0.5d）。

## W1 批末动作

`npm run verify` 全绿 + UNKNOWN-TABLES 回填状态截图入 `EVD-4002/`。
