---
id: PLAN-V007-01
title: 事实基线（2026-10-27 15:58 实测 + 逐卡四参照系审计）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V007-00]
---

# 01 · 事实基线

> 采集时间：2026-10-27 15:58（GMT+8）。采集方式：逐命令实测现网工作树。
> **本文件取代 plan-v005/01 作为当前事实源**；v005/01 保留其 15:00 快照价值（历史对照）。

## 1. 仓库状态

```text
HEAD        7cb62c0  docs(plan): add plan-v006 and update tasks for v1.0 completion
前置        f3fa3e0  feat(4015,4007,4008): complete tasks and resolve conflicts
            470436e  feat(4007): 商人页 UI
工作树      clean（git status --porcelain 输出为空）
```

### 1.1 质量闸门

| 闸门 | 结果 | 明细 |
|---|---|---|
| `npm run guard` | **9/9 全绿** | 根目录白名单 / game-core+contracts 纯度 / 客户端依赖边界 / 服务端依赖边界 / 模块清单 / Asset Bundle / **生成物未手改且已同步** / 文档 front matter / 无空目录 |
| `npm test` | **128/128 全绿**，`EXIT=0` | 127 → 128，新增 2004 独立用例 |
| 客户端类型检查 | 未在本轮复跑 | 列为 W0 出口断言 `V-1.5` |

**v006/00 与助手报告里的"guard 8/9 / InventoryPanel 跨模块 import 违规"已不成立** —— `f3fa3e0` 已修复并提交，该红是**中间态快照**，不是当前事实。

## 2. 逐卡四参照系审计（R-1 落地）

> ①代码存在 ②闸门绿 ③证据目录 ④可复现命令。任一 ✗ = 未完成。

| 卡 | ①代码 | ②闸门 | ③EVD | ④复现 | 判定 | 缺口 |
|---|---|---|---|---|---|---|
| 4002 数值转录 | ✅ 11 表 | ✅ | ✅ `EVD-4002` | ✅ `npm run gen:config` | **DONE** | — |
| 4006 `economy.sell` | ✅ | ✅ | ✅ 集成测 5 例 | ✅ | **DONE** | — |
| 4007 商人页 | ✅ 306 行 | ✅ | ❌ **无 EVD-4007** | ⚠ 仅逻辑测 | **DONE（缺证）** | 证据目录 |
| 4008 背包回收 | ✅ 见 §3 | ✅ | ❌ **无 EVD-4008** | ⚠ 仅逻辑测 | **DONE（缺证 + 3 处硬伤）** | 见 §3 |
| 4012 包体基线 | ✅ | ✅ | ✅ `EVD-4012` | ✅ | **DONE** | — |
| 4015 契约解冻 | ✅ 全链路 | ✅ | ❌ 无 EVD-4015 | ✅ | **DONE（缺证 + 3 处文档残留）** | 见 §4 |
| **4009 开箱** | ❌ | — | ❌ | ❌ | **未开工** | 3 处阻塞 + 可达性 |
| **4010 真机** | ❌ | — | ❌ | ❌（无设备） | **未开工** | 环境 |
| **4011 采样** | ❌ | — | ❌ | ❌ | **未开工** | `tools/sample-hook-hitrate.mjs` 不存在 |
| **4013 合规** | ⚠ `review-checklist.md` 仍"待编写" | ✅ | ✅ 目录 | ✅ | **半成品** | 正文 |
| **4016 文档对齐** | ❌ 见 §4 | — | ❌ | ❌ | **未开工** | 4 处残留 |
| **4020 rid** | ❌ | — | ❌ | ❌ | **未开工** | 卡本身有 1 处硬错（`02` F-19） |

**结论**：6 张未完成（4009/4010/4011/4013/4016/4020）+ 3 张"代码完成但缺证"（4007/4008/4015）。

## 3. 4008 的真实实现形态（与规划不同，且有 3 处硬伤）

### 3.1 做了什么

`client/assets/scripts/features/inventory/view/InventoryPanel.ts:88-157`：

- 每行右侧**手工**建 `Node('Recycle_i')` + `Graphics` 圆角矩形 + `Label`，绑定 `TOUCH_END`；
- 点击 → `addConfirmDialog()` → 确认 → `sellOne(r)`；
- `sellOne` → `invoke('economy.sell', {itemId: r.id, count: 1})` → `applySell()` → `load()`；
- 失败走 `toUxState(code)` 分类文案。

`app/panel-ui.ts` 只新增了 `addConfirmDialog`（1 个工厂），**没有 `addButton` / `addRow`**。

### 3.2 三处硬伤

| # | 问题 | 证据 | 后果 |
|---|---|---|---|
| **F-20** | 按钮 UI **30 行硬编码在面板内**，未沉淀为 `panel-ui.addButton` | `InventoryPanel.ts:100-119` | 4009 的"打开"按钮要再抄一遍；两份实现必然漂移 |
| **F-21** | `invoke` **未传 rid**（第 3 参），`payload` **未传 merchantId** | `InventoryPanel.ts:140`：`invoke<SellReq, SellRes>('economy.sell', payload)` | 幂等失效（重试双扣）；商人默认兜底为 village，与 4007 面板所选商人不一致 |
| **F-22** | 无 `count <= 0` 拦截、无 `known` 显式判定 | 同上 | 边界物品可发空请求（`rows` 本身是 known，暂无实际泄露，但无守据） |

> **F-21 的严重性**：`economy.sell` 标 `idempotent: true`，服务端读 `req.m.rid`。不传 = 幂等表永远不命中。这是 `02` F-13 的直接受害点，**W0 必须优先修**。

## 4. 文档残留（4015 收尾不彻底，4 处）

| # | 位置 | 现状 | 应为 |
|---|---|---|---|
| **F-23** | `DESIGN-0001-ux-states.md` §2 错误码表 | **无 2004 行**（`grep -c "2004"` → **0**） | 增一行（码值 2004 的 UX） |
| **F-24** | `ADR-0011-contract-gaps.md:24` | 仍写 `server/src/modules/save/service.ts:119` | `account/service.ts:126-137`（该文件无票据逻辑） |
| **F-25** | `error-catalog.md:41` | "**建议新增** `2004 BIND_TICKET_INVALID`" 与第 27 行**正式登记行**并存 | 删除"建议"表述，改为"已解冻"注记 |
| **F-26** | `current-plan.md:25-27` | 仍写"下一阶段 = plan-v004" | 指向 `plan-v007` |

> F-25 是典型的"补了新行忘删旧话"，读者会以为 2004 还没定。这类矛盾比缺失更危险。

## 5. 未变的事实（v005/01 仍然有效，此处只列结论）

| 项 | 值 | 详见 |
|---|---|---|
| 数值表 | 11 有数 / 35 空 / 46 总 | v005/01 §3 |
| `locks.csv` | `none=0 / iron=3 / copper=5 / silver=8 / gold=12` | `E-06` |
| `chests.csv` | 3 行，`lock` **全 `none`**，无 `item_id` 列 | `E-06`/`E-07` |
| `game-core/chest` `LOCK_HITS` | `1/2/3/4`（与 `locks.csv` **冲突**） | `E-31` |
| 打捞掉落 | `HookModel.ts:20` 硬编码 `item_0001 漂流木` | `E-32` |
| `drops.csv` | **0 行** | `E-05` |
| 服务端动作 | 12/21 实现，9 个 `todo` | `E-09` |
| `contracts/chest` | 有 `ChestOpenReq/Res` 类型，`ACTIONS` **无 `chest.open`** | `E-30` |
| `salvage.claimInfo` | 语义 = "领沉船信息份数"，非开箱 | `E-29` |
| 客户端 rid | 全仓 **0 处**传 rid | `E-28` |
| `screen-salvage.md` | **不存在** | `E-27` |
| 保底候选 | `item_0013`（价 0，须排除）；最小有效 = `item_0020`（价 4） | `E-08` |

## 6. 一句话总结

> **闸门已绿、128 测全过，但"绿"只覆盖逻辑层。真实剩余 = 6 张卡 + 3 张卡的证据缺口 + 4 处文档残留 + 4008 的 3 处硬伤。**
> 下一刀切在 **W0：rid 注入（修 F-21）+ 4008 收尾**，因为它同时解掉 F-13/F-20/F-21，且是 4009 的前置。
