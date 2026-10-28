---
id: EVD-4003
title: TASK-4003 HookView 接 hooks 表（缺行回落）
status: accepted
module: validation
owner: hark
created: 2026-10-27
review: 2026-11-27
related: [TASK-4003, PLAN-V003-05, PLAN-V010-00]
---

# EVD-4003 · HookView 接表

## 1. 目标与交付

手感三参数（目标距离 / 出钩角度 / 蓄力上限）从写死常量改为读 `hooks` 表；表空或字段缺失时回落等值常量并 `warn`（不崩、不改手感）。

**提交**：`d84851c`　**文件**：`client/assets/scripts/features/hook/view/HookView.ts`

改动三处：
- 常量重命名 `DEMO_TARGET_DIST/DEMO_ANGLE_DEG` → `FALLBACK_TARGET_DIST/FALLBACK_ANGLE_DEG`（语义从"演示值"变为"回落值"，`HookView.ts:21-23`）。
- 新增 `loadHookConfig()`（`:52`）：`preload(['hooks'])` → 取首行 → 三个字段逐个 `typeof === 'number'` 校验后赋值；`rows[0]` 缺失时 `console.warn` 并 return。
- `releaseNow()` 改用实例字段 `this.demoAngleDeg / this.demoTargetDist`（`:164`），不再引用常量。

## 2. 表实测

```
client/assets/resources/config/hooks.json → 1 行
{ id:'hook_default', name:'默认出钩', target_dist:600, angle_deg:15, max_power_bp:10000, note:'DS-D-04' }
```

与回落常量**等值**（600/15/10000），符合 D-04"等值迁移"要求。

## 3. VERIFY

| 断言 | 结果 | 证据 |
|---|---|---|
| a) 表非空时参数来自表 | PASS | 代码走查 `:52-66`；表实测 1 行三字段齐全 |
| b) 表空/缺字段回落且不崩 | PASS | `:53-56` 早退 + `:63-65` 逐字段 typeof 守卫 |
| c) hook 既有测试全绿 | PASS | `tests/determinism/hook.test.mjs` **6/6**（`node --import ./tools/runtime/register.mjs --test tests/determinism/hook.test.mjs`） |
| d) 类型检查 | PASS | `npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 \| grep -v "^C:/"` → 0 行 |

## 4. 局限（G-07 降级）

卡面 V"改 `hooks.target_dist` 600→500 后 `chargeAndCast` 达杆距离同步 −100"属 **UI 运行时**断言，`'cc'` 依赖在 Node 测不到，**记 UNKNOWN**。替代证据：`game-core/hook` 的 `release()/chargeAndCast()` 纯函数已有 6 例确定性测试覆盖（改表只影响入参、不影响核心算法），外加载荷参数走查。真机/编辑器预览时需人工确认一次"改表即手感变"。
