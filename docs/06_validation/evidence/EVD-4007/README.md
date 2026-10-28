---
id: EVD-4007
title: TASK-4007 商人页 UI + 限购（黄金术语统一 / sellValue 复算 / 额度顶部）
status: accepted
module: validation
owner: hark
created: 2026-10-27
review: 2026-11-27
related: [TASK-4007, PLAN-V003-06, PLAN-V004-00, EVD-4006]
---

# EVD-4007 · 商人页 UI

## 1. 目标与交付

商人 Tab：三个商人切换、可卖列表（单价 / 持有）、行级「卖 1」、顶部额度与金币、3002 → empty 态、1001 → error 态。

**提交**：`470436e`（主控亲自实现）　**文件**：
- `client/assets/scripts/features/economy/model/EconomyModel.ts`（**覆写空桩**：`unitPrice/sellableRows/applySell/goldOf/quotaText` + 保留 `EconomyModel` 类出口）
- `client/assets/scripts/features/economy/view/MerchantPanel.ts`（新增，`createMerchantPanel(parent): PanelHandle`）
- `client/assets/scripts/app/panel-types.ts`（`PanelKey` 扩 `'merchant'`）
- `client/assets/scripts/app/MainView.ts`（TABS + 工厂，底部 **5 Tab**）
- `tests/determinism/merchant-flow.test.mjs`（新增 8 例）

## 2. 三处裁决的落地方式

| 裁决 | 落地 |
|---|---|
| **D-15** 货币=金币 | `modules.wallet = { gold }`（键名服从 `module-catalog.json` 既有 `save:["wallet"]`，非自造 `currency`）；卖出成功 `gold += herbDelta`；**镜像非权威**，权威在 `ledger_entry` |
| **D-16** 单价来源 | `unitPrice()` 内部 `sellValue()`（game-core 单点），面板不出现任何价格公式 |
| **D-17** 额度口径 | 仅顶部一行 `今日剩余额度 X / N`（首进=满额，卖出后取服务端 `quotaLeft`）；行只显示单价+持有 |

## 3. 目录归属（踩坑记录）

初版建在 `features/merchant/`，守卫报"孤儿目录（catalog 未登记）"——`module-catalog.json` 中商人属**既有 `economy` 模块**（chapter 9.1/9.2）。已迁至 `features/economy/` 并覆写其中原空桩 `EconomyModel`（空桩仅 7 行 version 计数器），保留 `index.ts` 的 `EconomyModel` 类出口以免破坏模块边界。

## 4. VERIFY（本次复跑）

| 断言 | 结果 | 命令 / 证据 |
|---|---|---|
| a) 单价三档与 sellValue 一致 | PASS | `merchant-flow` 用例 1：`unitPrice(10,5,10000)=5 / (…,8500)=4 / (…,13000)=6` |
| b) 可卖列表过滤与排序确定 | PASS | 用例 2：剔除 `recycle_bp=0`、零持有、未知 id；单价降序 + id 升序 |
| c) 卖出落盘（金币+、背包−、revision+1、可验封印） | PASS | 用例 3/4/6：`applySell` → `verifySave` true、卖光删键、JSON 往返保留 |
| d) 入参不可变 | PASS | 用例 5：序列化前后相等 |
| e) 金币容错 | PASS | 用例 7：`null`/缺键/非法值 → 0，`7.9 → 7` |
| f) 额度文案 | PASS | 用例 8：`quotaText(18,20)`、负值钳到 0 |
| g) 全套单测 | **8/8 PASS** | `node --import ./tools/runtime/register.mjs --test tests/determinism/merchant-flow.test.mjs` |
| h) 类型检查 / 守卫 | **tsc 0 / guard 9/9** | G-06 过滤式、`npm run guard` |

## 5. 局限（G-07）

- **UI 运行时断言记 UNKNOWN**：面板切换不重建、3002/1001 视觉回落、卖 1 按钮点击热区，均依赖 `'cc'` 与真实触摸，Node 测不到；未做真机/编辑器逐屏走查。替代证据 = 上述 8 例逻辑层单测 + tsc 0 + 代码走查。
- 卖出链路依赖服务端（`npm run dev:server`，端口 5050）；无服务端时界面显示失败态（错误码 4999/网络失败），列表与单价照常可看。
- `herbDelta` 字段名保留未改（D-15：改名另立卡）。
