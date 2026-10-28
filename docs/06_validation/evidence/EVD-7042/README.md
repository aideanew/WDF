---
id: EVD-7042
title: 启动链真实化（`save.flush` 接入 onHide，其余两项登记"不做"）
status: accepted
owner: hark
created: 2026-10-28
review: 2026-11-28
---

# EVD-7042 —— 启动链真实化（`save.flush` 接入 onHide，其余两项登记"不做"）

- **对应任务**：plan-v010 TASK-7042（`05-slices-and-cards.md` §6 S4）
- **执行者**：主控
- **独立验收者**：子智能体（防自证循环，结论待填）
- **采集时间**：2026-10-28
- **前置**：TASK-7002（已删 GameApp 虚构注释）、D-42=C（12 模块移 v1.1 → 离线结算/S-4 依赖的员工系统在 v1.1）

## 处置结论（先减后加）

旧 `GameApp` 注释描绘的「7 步启动链」三项承诺（离线结算 / Bundle 预下载 / save.flush）处置：
- **save.flush**：真实实现 —— `GameApp.onHide` → `LocalSave.flush()`（把最近一次写入的存档剥离旧 checksum、以新 savedAt 重新落盘；本会话无写入时返回 false 诚实不假装成功）。
- **离线结算（S-4）**：依赖员工产出系统（D-42=C 已随 12 模块移 v1.1）→ 本版**不实现**，保持 ❌，写入 `02 §4.2` 注释登记。
- **Bundle 预下载**：无需求来源（`02 §4.2` 未列）→ 本版**不实现**，只登记"不做"。

启动链主段（compliance.check → account.login → MainView）已在 `BootController` 真实（TASK-7010/7012 已核），本卡只补 onHide 保存钩子。

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | `GameApp.onHide` 调用 `LocalSave.flush()`（非空注释） | **PASS** | GameApp.ts L21-27 |
| 2 | `LocalSave.flush()` 剥离旧 checksum、以新 savedAt 重 seal | **PASS** | LocalSave.ts `flush()` |
| 3 | 本会话无写入时 flush 返回 false（诚实不假装成功） | **PASS** | LocalSave.ts `flush()`（`!lastSave` 早退） |
| 4 | 离线结算 / Bundle 预下载登记"不做"（02 §4.2 注释） | **PASS** | `02-requirement-inventory.md` §4.2 注释 |
| 5 | 类型检查通过（`typecheck:client` exit 0） | **PASS** | typecheck-client.txt |
| 6 | flush 规则测试通过（5 例，纯函数层） | **PASS** | flush-test.txt（pass 5/fail 0） |
| 7 | `npm run guard` 全过 | **PASS** | guard.txt |

## 反证（独立验收者）

- `LocalSave`/`GameApp` 因 `getPlatform()` 静态 import `cc/env`，Node 下不可直载（save-seal.test.mjs 已记录此预置限制，非本卡引入）；故 flush 规则在纯函数层验证（sealSave/verifySave 层，与 save-seal 同法）。
- 未改 `platform/index.ts`（构建期常量检测不触碰，避免树摇回归）；未改 generated、packages/contracts、server/src。
- `02 §4.2` 注释明确：仅 save.flush 真实实现，离线结算/S-4 与 Bundle 预下载不实现、只登记，不作虚假承诺。

## 变更清单（单卡）

- `client/assets/scripts/services/save/LocalSave.ts`（新增 `flush()` + `lastSave` 缓存）
- `client/assets/scripts/app/GameApp.ts`（onHide → `LocalSave.flush()`；头注释更新）
- `docs/04_planning/plan-v010/02-requirement-inventory.md`（§4.2 处置注释）
- `tests/determinism/save-flush.test.mjs`（新增 5 例）

原始输出：`flush-test.txt` / `typecheck-client.txt` / `guard.txt`。
