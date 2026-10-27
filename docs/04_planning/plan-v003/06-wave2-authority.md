---
id: PLAN-V003-06
title: W2 权威背包+商人回收（TASK-4005~4008）
status: active
module: planning
owner: hark
created: 2026-10-27
related: [ADR-0011, PLAN-V003-04]
---

# 06 · W2 · S12 权威背包 + 商人/回收

> **本波是 v1.0 的架构重心**。ADR-0011 缺口1 的风险原文："服务端无权威背包，校验只能事后复核，无法事前阻止刷钱"（F-15）。
> 因此 4005 的 ADR **先于一切实现**。

## TASK-4005 ADR-0012 权威背包（核心，opus）

**目标**：裁决"服务端如何在客户端权威存档模式下，防住回收/商人刷钱"，产出可实现的方案。
**输入**：ADR-0011 缺口1 三选项；`server/db/migrations/0001_init.sql:44`（ledger_entry 已存在无写入方）；`save/service.ts` push 语义。
**方案骨架（双向钢人后）**：
- **方案 X（推荐）服务端影子账本**：服务端存 `ledger_entry`（只追加流水），`economy.sell` 校验"本次卖出数量 ≤ 服务端累计获得 − 已卖出"（获得来源= salvage.claimInfo 结算 + save.push 快照 diff 容差）。**支持**：无需改存档权威模型，向后兼容。**反对**：diff 容差窗口内仍可小额套利；实现复杂度高。→ 缓解：容差=0（严格），不一致直接 `BAD_PAYLOAD` 并 telemetry 上报。
- **方案 Y（弃）**：服务端全量权威背包 = 推翻存档架构，M1 存档契约全部重写。反对强度足够，弃。
**验收**：ADR-0012 落 `docs/03_solution/decisions/`，含：数据流图、容差=0 依据、失败码选择（复用 1001）、回滚方案；**用户已签核**。
**允许**：仅该 ADR 文件；**禁止**：任何代码。
**规模**：小（0.3d，决策为主）。

## TASK-4006 economy.sell 实现（核心，opus）

**目标**：新增 `economy.sell{itemId,count}`（契约解冻由 4015 统一执行，本卡先在**本仓内**按 ADR-0012 实现并与 4015 同批合入）。
**步骤**：1) contracts 加动作+payload zod（与 4015 同一提交）；2) handler：查 prices.recycle_bp × 区域系数 → 写 `ledger_entry`（type=sell）→ 返回新余额；3) 影子校验按 ADR-0012（容差 0）；4) game-core 纯函数 `sellValue(basePrice, recycleBp, regionBp)` + 单测（含 ±30% 边界、0/负数、溢出）；5) 集成测试：正常卖/超卖/重复 rid 幂等。
**验收**：a) `npm test` 新增 ≥6 用例全绿；b) `ledger_entry` 有行（集成测试 SQL 断言）；c) 超卖返回 1001 且零副作用。
**验证命令**：`npm test -- tests/integration/economy-sell.test.mjs`（存在则定向跑，否则全量）+ 全量 verify。
**允许**：contracts/common/actions·save、server/economy/**、game-core/economy/**；**禁止**：save.push 语义变更。
**规模**：大（1–1.5d）。

## TASK-4007 商人页 UI + 限购（助手 A，sonnect）

**目标**：新 Tab"商人"（走既有 `createXxxPanel` 工厂 + PanelKey 扩展），读 `merchants` 表展示回收价/限购，卖出入走 4006 接口。
**步骤**：1) `panel-types.ts` PanelKey 增 `merchant`（**本卡是唯一授权改该文件者**）；2) `features/economy/view/MerchantPanel.ts`；3) buyQuota 接真数值（日重置：服务端返回 quota，端上不自己算日界——归 D-11 裁决）；4) 卖出成功后 `navigate('inventory')` 回背包刷新。
**验收**：a) 空态"今日额度已用完"（QUOTA_EXHAUSTED→empty 态，DESIGN-0001 §2）；b) 卖出后背包行数减少且金币增加（`modules.currency.gold += herbDelta`，D-15）；c) 面板切换不重建（沿用 3101 纪律）。
**验证命令**：全量 verify + tsc 过滤式。
**允许**：app/panel-types.ts（仅加 key）、features/economy/**、app/MainView.ts 挂载 ≤5 行；**禁止**：改 PanelHandle 结构。
**规模**：中（0.5–1d）。

## TASK-4008 背包回收入口 + 确认弹窗（助手 A，sonnect）

**目标**：背包每行加"回收"按钮 → 通用确认弹窗组件 → 调 `economy.sell` → 成功后 `refresh()`。
**步骤**：1) `app/panel-ui.ts` 增 `addConfirmDialog()`（复用给后续所有危险操作）；2) InventoryPanel 行按钮（仅 known 行）；3) 成功/失败 UX 态走 `toUxState`（禁止手写 if code==2001）；4) 冲突/失败保留行数据（失败不吞）。
**验收**：a) 未知 id 行（driftwood 脏数据）无按钮不崩；b) 弹窗可取消且无副作用；c) 卖出后 revision 推进。
**验证命令**：全量 verify。
**允许**：app/panel-ui.ts、features/inventory/**；**禁止**：直接改 game-core（4.4 已消解重叠）。
**规模**：中（0.5d）。

## W2 批末

全量 verify + SQL 查 `ledger_entry` 截图入 `EVD-4006/`；真机演示录屏入 `EVD-4007/`。
