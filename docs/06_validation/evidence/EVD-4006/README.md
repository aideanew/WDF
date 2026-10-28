---
id: EVD-4006
title: TASK-4006 economy.sell 商人回收（影子账本 + 限购 + 幂等）
status: accepted
module: validation
owner: hark
created: 2026-10-27
review: 2026-11-27
related: [TASK-4006, ADR-0012, PLAN-V003-06]
---

# EVD-4006 · economy.sell

## 1. 目标与交付

新增商人回收动作：服务端**影子账本**校验（容差 0）→ 写 `ledger_entry` 流水 → 按 `region_bp` 与 `recycle_bp` 算回收价 → 日限购计数 → 同 rid 幂等。

**提交**：`23ee575`（+ `9d22859` sync 产物）　**范围**：
- `packages/contracts/src/common/actions.ts`（+1 action）、`contracts/economy/index.ts`（`SellReq/SellRes`）
- `packages/game-core/src/economy/index.ts`（`sellValue` 纯函数）
- `server/src/modules/economy/{service,repo,handlers}.ts`（校验链：限购 → 影子 → 流水 → 返回）
- `server/src/gateway/{handlers,payload}.ts`（路由注册 + zod schema）
- `tests/determinism/economy.test.mjs`（13 例）、`tests/integration/economy-sell.test.mjs`（5 例）

## 2. 实现要点

```
sell 校验链（service.ts:49-109）
  幂等(rid) → 参数(itemId/count) → 商人存在 → 有回收价
  → 限购 used+count > dailyLimit → 3002
  → 影子 gained-sold < count → 1001
  → sellValue(base, recycle_bp, region_bp) × count → withTx[ 写 sell 流水 + 限购 upsert ]
```
- 影子来源：`ledger_entry.asset/delta`（正=获得，负=卖出），`ledgerSum()` 聚合；容差 0。
- 限购：复用既有 `daily_quota(region=playerId, day=Asia/Shanghai, key='sell:<merchant>')`，**不新建表**。
- 日界：`dayOf(serverNow)` = UTC+8 自然日。

## 3. ★主控接手时修的三处缺陷（助手异常中断前的半成品）

| # | 缺陷 | 影响 | 修法 |
|---|---|---|---|
| 1 | `service.ts` 残留 `import { findSnapshot } from '../save/repo.ts'`（未使用） | 守卫"服务端依赖边界"红（跨模块只能调 service） | 删除该 import |
| 2 | `readFileSync(join(__root,'server/generated/config/prices.json'))` 双重路径 | 模块加载即抛，**连带 5 个测试文件全崩** | 改为 `join(__root,'generated','config','prices.json')` |
| 3 | 缺 `economy.sell` 的 zod schema | `payload.test` 红：动作既无 schema 又无豁免 | `payload.ts` 增 schema（itemId 非空、count int∈[1,999]、merchantId 三枚举可选） |

另：`handlers.test.mjs` 的 ACTIONS 断言由 20 → **21**（只增不改的契约演进）。

## 4. ★D-01 回收价公式量纲修正（本次最重要的判定）

原裁决式 `base_price × recycle_bp/10000 × region_bp/10000` 与 `prices` 表数据量纲不符：**实测 106 行**，`recycle_bp` 恒等于 `floor(base_price × 50%)`（85 行恰好 0.5，其余为取整噪声如 0.4987/0.5015），即它是**回收基数绝对值**，不是万分比系数。按原式代入（item_0001: base=10, recycle_bp=5）得 `10×0.0005×1 = 0.005 → 0`，**全部物品回收价归零，经济崩塌**。

修正为 `floor(recycle_bp × region_bp / 10000)`（decision-sheet D-01 已改注），与 M1 既有 `recyclePrice(base, bp)` 在 `recycle_bp = base/2` 时**数学等价**（`floor(base×5000×(10000+bp)/1e8)`，bp ∈ [-3000,3000]）。

## 5. VERIFY（本次复跑）

| 断言 | 结果 | 命令 / 证据 |
|---|---|---|
| a) `determinism/economy.test.mjs` 全绿 | **13/13 PASS** | `node --import ./tools/runtime/register.mjs --test tests/determinism/economy.test.mjs` |
| b) `integration/economy-sell.test.mjs` 全绿 | **5/5 PASS** | 同上指向该文件 |
| c) 五例覆盖 | PASS | 正常卖（herbDelta 公式）/ 超卖 1001 / 同 rid 幂等重放 / 限购尽 3002 / 失败零副作用快照 |
| d) `ledger_entry` 有行 | PASS | `sell-1` 断言 `ledgerSum().sold === 2` |
| e) 失败零副作用（V-406.c） | PASS | `sell-5` 前后 `ledgerSum`/`quotaUsed` 深比较相等 |
| f) guard | **9/9 PASS** | `npm run guard` |
| g) tsc 项目错误 | **0** | G-06 过滤式 |

## 6. 局限

- 幂等缓存是**进程内 Map**（`service.ts:42`），多实例部署下同 rid 跨实例不幂等；MVP 单实例可接受，已在代码注释标注。
- 限购"日界"用服务端时间，客户端本地时间不参与判定（D-11 已锁定）。
- `merchantId` 字段未进 `SellReq` TS 类型（运行时 zod 已接受），**归 TASK-4015 补**（D-18）——后续 `f3fa3e0` 已补。
