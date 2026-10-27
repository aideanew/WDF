---
id: PLAN-V004-03
title: 契约冻结包与解冻计划
status: active
module: planning
owner: hark
created: 2026-10-27
related: [PLAN-V004-02]
---

# 03 · 契约冻结包与解冻计划

> 本项目的前后端、数据端依赖于 6 份统一契约。未授权情况下严禁修改。

## 3.1 现存契约状态

1. **API**: 冻结。`economy.sell` 已由 4006 成功加入。
2. **Errors**: 冻结。但 `BIND_TICKET_INVALID=2004` 亟需加入（ADR-0011 缺口2）。
3. **Identity**: 冻结。
4. **Resources**: 冻结。
5. **Events**: 冻结。
6. **UX States**: 冻结。需配合 Errors 增加 2004 码的映射。

## 3.2 解冻计划（由 TASK-4015 执行）

本轮必须由指定任务解锁并修改 `packages/contracts/src/common/errors.ts` 和 `ux.ts`，步骤如下：
- `errors.ts` 增 `BIND_TICKET_INVALID: 2004`。
- `server/src/modules/save/service.ts` 票据验证失败改为抛出 2004。
- `contracts/common/ux.ts` 将 2004 映射至 `{ state:'noPermission', retryable:false, next:'login' }`。
- 同步更新 `error-catalog.md` 并执行 `npm run gen && npm run sync`。

此修改是受控解冻，改完立即重新冻结，并确保 `npm test` 中契约测试全绿。
