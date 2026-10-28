# EVD-7040 —— 账号面板范围核查（先减后加：三项内容均无 v1.0 需求来源，登记"不做"）

- **对应任务**：plan-v010 TASK-7040（`05-slices-and-cards.md` §6 S4「账号面板（登录态、绑定入口、换设备提示）」）
- **执行者**：主控
- **独立验收者**：子智能体（防自证循环，核"无需求来源"声明是否属实，结论待填）
- **采集时间**：2026-10-28
- **前置**：TASK-7010（登录已真实，独立验收 PASS）、D-45（v1.0 不提审，范围从紧）、§7 I-3（空壳无入口）

## 处置结论（先减后加，与 TASK-7042 同法）

本卡三项内容**均无 v1.0 界面需求来源** → **本版不实现、只登记"不做"**，不作虚假承诺。
不造一个"没有入口、没有需求、玩家点不到"的假账号面板。

| 项 | 处置 | 依据 |
|---|---|---|
| 绑定入口 | **不做**（v1.1） | `mvp-scope.md:66` v1.1「微信 + 抖音账号绑定互通」；`立项评审-Hark回答.md:211`「绑定界面可以放 v1.1」；`设计要点记录.md:723`（已定·Hark代定 10-23 10:45） |
| 登录态 | **不做**（无面板需求） | 登录已真实：TASK-7010 `BootController`（独立验收 PASS）；`MainView.ts:27-34` 仅 6 Tab 无账号 Tab；同步态已由 `SettingsPanel.ts:68` 承接 |
| 换设备提示 | **不做**（无需求来源） | `02 §7` I-3「本版 15 空壳**无入口**（MainView 只有 6 Tab），暂不需要」；云端找回未列 v1.0 库存 |

**v1.0 里 account 模块真实存在的是服务端**：`server/src/modules/account/`（login / bindStart /
bindConfirm / playerExists / RefreshRes，357 行，`02 §2` 判"服务端齐"）；客户端 `features/account/`
保持 `@unimplemented` 空壳（`02 §6.2` NB-3：保留、不删，不破坏 module-catalog 与守卫一致性）。

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | 绑定互通属 v1.1（设计权威，非 v1.0） | **PASS** | `mvp-scope.md:66`；`立项评审-Hark回答.md:211`；`设计要点记录.md:723` |
| 2 | 客户端无账号 Tab 入口（MainView 仅 6 Tab） | **PASS** | `client/assets/scripts/app/MainView.ts:27-34`（打捞/背包/箱子/合成/商人/榜单） |
| 3 | 登录已真实，无需面板（TASK-7010 已核） | **PASS** | `BootController.ts` 登录链 + EVD-7010 |
| 4 | 同步/登录失效态已有承接（settings） | **PASS** | `SettingsPanel.ts:68`（`ux.state==='noPermission'` → '登录已失效，请重新进入'） |
| 5 | 空壳无入口即无需 UI（§7 I-3） | **PASS** | `02 §7` I-3 |
| 6 | 无虚假承诺：只登记"不做"，未造假面板 | **PASS** | 本 README + `02 §4.2` 注记 |
| 7 | 服务端 account 真实存在（非空壳） | **PASS** | `server/src/modules/account/service.ts`（login/bindStart/bindConfirm，`WDF_AUTH_MODE` 分流） |
| 8 | 客户端 account 保持空壳标注（NB-3） | **PASS** | `features/account/view/AccountView.ts`（骨架、无 cc 面板）、`AccountModel.ts` |

## 反证（独立验收者）

- 本卡**不产生代码**，只作范围核查与登记；不改 generated、packages/contracts、game-data、server/src、
  game-core。唯一文件级变更：`docs/04_planning/plan-v010/02-requirement-inventory.md`（§4.2 注记）+ 本证据目录。
- 判定依据全部是**已定设计**（mvp-scope / 设计要点记录 / 立项评审），非主控新提；D-45（v1.0 不提审）与
  I-3 均已在本版裁决/清单内，无新增范围裁决。
- **NB-3 的 `@unimplemented` 字面标注（独立验收者低风险观察）**：`02 §6.2` NB-3 提到 15 空壳"显式标注
  `@unimplemented`"，但 grep `client/assets/scripts/features/*/` 全目录**零命中**（account 与其余 14 个空壳
  一致，均无该标注）。此为**计划级既有缺口**（非本卡引入、非 account 特有），不属本卡 8 条验收标准；
  本卡只核"无 v1.0 界面需求来源 + 未造假"，二者均成立。若后续统一补 NB-3 标注应全量补（15 壳一起），
  避免单壳标注造成不一致。

## 变更清单（单卡）

- `docs/04_planning/plan-v010/02-requirement-inventory.md`（§4.2 注记：7040 三项内容登记"不做"）
- `docs/06_validation/evidence/EVD-7040/`（本目录）
