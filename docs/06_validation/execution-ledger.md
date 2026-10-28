---
id: EVD-LEDGER
title: 执行台账（提交 ↔ 任务卡 ↔ 证据 全链对照）
status: active
module: validation
owner: hark
created: 2026-10-27
review: 2026-11-27
related: [EVD-4002, EVD-4012, PLAN-V003-00, PLAN-V010-00, EXEC-BRIEF-0003]
---

# EVD-LEDGER · 执行台账

> **为什么有这份文件**：卡完成时证据分散在 6 个地方（git 提交、EVD 目录、测试文件、日志、裁决文档、对话上报）。本文件是**唯一索引**，用来回答"这一步做了什么、凭什么算完成、证据在哪"。
> **更新纪律**：每完成一批卡追加一节；数字必须可复跑，不写"大概/应该"。

## 1. 证据来源分类（找证据先看这里）

| 类型 | 位置 | 内容 | 可信度 |
|---|---|---|---|
| 代码变更 | `git log`（10-26 起 80+ 提交） | 每个提交带卡号/缺陷号 | 最高（不可篡改） |
| 自动化验收 | `tests/**/*.test.mjs`（219 例） | 契约/确定性/集成/e2e | 高（可复跑） |
| 门禁 | `npm run guard` / `npm run verify` | 9 项守卫 + gen/test/typecheck | 高（可复跑） |
| 卡级证据 | `docs/06_validation/evidence/EVD-*/` | 实测记录、截图、measure.json | 中（人工产出） |
| 工作日志 | `.workbuddy/memory/YYYY-MM-DD.md`（832 行） | 逐时段决策与实测发现 | 中（含自我纠错） |
| 裁决 | `plan-v003/decision-sheet.md`（D-01~D-18） | 数值/口径唯一来源 | 高（用户授权） |
| 架构决策 | `docs/03_solution/decisions/ADR-0011/0012/0013` | 契约缺口、影子账本、schema 版本 | 高 |

## 2. v1.0 冲刺卡状态（plan-v003 的 16 卡）

| 卡 | 内容 | 状态 | 提交 | 证据 |
|---|---|---|---|---|
| 4002 | 数值转录（六表清欠 46 行） | ✅ PASS | `c0c3c35` | `EVD-4002/`、`tools/gen/transcribe.mjs`、configVersion `38fc1faf` |
| 4003 | HookView 接 hooks 表（缺行回落） | ✅ PASS | `d84851c` | 代码走查（回落分支 + warn） |
| 4004 | 新手引导 5 步浮层 | ✅ PASS | `10126af` | `features/guide/**`、`modules.guide.done`、`tests/determinism/guide-flow.test.mjs` 8 例（2026-10-28 补） |
| 4005 | ADR-0012 影子账本成文 | ✅ PASS | `8dc787f` | `ADR-0012-authoritative-inventory.md` |
| 4006 | economy.sell（影子校验/限购/幂等） | ✅ PASS | `23ee575`+`9d22859` | `tests/integration/economy-sell.test.mjs` 5 例、`tests/determinism/economy.test.mjs` 8 例 |
| 4007 | 商人页 UI | ✅ PASS | `470436e` | `features/economy/{model,view}`、`tests/determinism/merchant-flow.test.mjs` 8 例 |
| 4008 | 背包回收入口 + 确认弹窗 | ✅ PASS | `f3fa3e0` | `InventoryPanel.ts:96-134`、`panel-ui.addConfirmDialog` |
| 4009 | 开锁交互 + salvage.claimInfo | ⊘ v1.1 推迟 | `246d0f0` | 用户 2026-10-28 拍板：开锁交互已落地（`ChestPanel.ts:364`）；`salvage.claimInfo` 维持 `todo`（`handlers.ts:48`），不写占位码 |
| 4010 | 四面板真机录屏 | ⏸ BLOCKED | — | 缺真机环境 |
| 4011 | 首钩命中率采样 | ⏸ BLOCKED | — | 缺真机用户 |
| 4012 | 包体基线 2.913MB/4MB | ✅ PASS | `8908704` | `EVD-4012/baseline.md`、`measure.json` |
| 4013 | 合规材料清单 | ⚠ 部分 | `8a13b0f` | `docs/07_release/compliance/` 5 份（虚假陈述已删、未接入已登记） |
| 4014 | 瘦身 | ⊘ 关闭 | — | 4012 实测 ≤4MB，条件不成立（`3c1add1` 裁定） |
| 4015 | 契约解冻（2004） | ✅ PASS | `f3fa3e0` | `errors.ts:19 BIND_TICKET_INVALID: 2004`、`error-catalog.md` |
| 4016 | 四文档对齐 | ✅ PASS | 本批 | `EVD-4016/README.md`：`error-catalog` / `glossary` / `current-plan` / `roadmap` 四处 + plan-v003/v004 标 `superseded` |

**统计（15 卡）：10 PASS / 1 部分（4013）/ 2 BLOCKED（4010·4011）/ 1 推迟 v1.1（4009）/ 1 关闭（4014）。**

## 3. 关键时间线（按日，完整链见 `git log --since="2026-10-26"`）

| 时间 | 事件 | 提交 |
|---|---|---|
| 10-26 12:42–17:55 | 契约补缺、确定性出钩、账号合并、榜单、埋点、BootController 修复、ASSISTANT-BRIEF v2、TASK-3101 主界面 | `1448b88`…`ee9f5a8` |
| 10-27 07:47 | M1 收官 C-01~C-10（含 P0 读表崩溃修复） | `13e6b68` |
| 10-27 10:06–10:30 | plan-v003 规划 11 文件 + 派工包 + 外部审计 14 处修复 | `a37176e` `4179dcb` `f3fdbf2` |
| 10-27 11:07–11:51 | 推送职责移交、单助手模式、4002~4006 落地（含主控接手补完 4006） | `0b8f9b4`…`9d22859` |
| 10-27 13:44 | 4012 包体基线 PASS、4014 关闭 | `8908704` `3c1add1` |
| 10-27 14:09–14:37 | plan-v004 并入、D-15~D-18 裁决、CRLF 守卫修复、4007 商人页（主控亲自实现） | `565d108`…`470436e` |
| 10-27 15:46–16:11 | 另一路完成 4008/4015 + plan-v005/v006/v007 | `f3fa3e0` `7cb62c0` `8f986b2` |
| 10-27 17:34–21:15 | plan-v008/v009：开箱服务端权威化、设计源校正、类型检查入 verify、限流与 cfg 提示、ADR-0013 | `c6fcd33`…`ea6ad20` |
| 10-28 09:07–10:10 | plan-v010：空壳显性化、`npm run shells`、D-42/D-43 裁决、7002/7004/7005 卡 | `19120fb`…`05d59ac` |

## 4. 门禁快照（每个数字都可复跑）

| 时点 | guard | tests | tsc 项目错误 | 备注 |
|---|---|---|---|---|
| 10-27 07:47（M1 收官） | 9/9 | 107/107 | 0 | 修 7 个类型错误后 |
| 10-27 11:51（4006 完成后） | 9/9 | 119/119 | 0 | 新增 economy 8+5 例 |
| 10-27 14:37（4007 完成后） | 9/9 | 127/127 | 0 | 新增 merchant 8 例 |
| 10-28 14:25（4016 收官 + 4004 补测后） | 9/9 | **219/219** | 0 | determinism 128 / 契约 27 / 集成 63 / e2e 1 |
| 复跑命令 | `npm run guard` | `npm test` | `npm run typecheck`（裸跑，不过滤） | — |


## 6. plan-v010 的 20 卡（2026-10-28，另一路执行）

| 切片 | 卡 | 状态 | 说明（按提交实测复核） |
|---|---|---|---|
| S0 工程初始化 | 7001–7005 | ✅ 5/5 | `npm run shells` 空壳清单 / 注释去假 / 未开放动作 4999+`FEATURE_NOT_AVAILABLE` / 占位值可区分 / 5 个空 service 处置 |
| S1 步行骨架 | 7010–7012 | ✅ 3/3 | 客户端平台登录接线（**真调 `wx.login`**）、code2session 标 UNKNOWN、ADR-0015 |
| S1（续） | 7013–7014 | ⊘ 推迟 | D-45=B：合规真实化 / 合规拦截 UI **零代码记录，推迟 v1.1**（合法但不等于功能落地） |
| S2 广告闭环 | 7020–7022 | ✅ 3/3 | `ads.claim` 服务端发奖、激励视频适配器、ADR-0014 防作弊口径 |
| S3 数值解锁 | 7031–7033 | ✅ 3/3 | items.weight/capacity（D-43=B 代定）、levels+unlocks、raft_tiles+rooms（D-42=C） |
| S4 UI 骨架 | 7040–7042 | ✅ 3/3 | 7040 账号面板**登记不做**（三项均无 v1.0 需求来源）、panel-ui 六态、启动链 `save.flush` |
| S5 体检+文档 | 7050–7051 | ✅ 2/2 | `npm run stage` 定向体检、文档指针（7051 进入时已就位，零改动） |

**主控复核（2026-10-28 14:05）**：双端一致 `9da93b7`、`rev-list --left-right` = `0 0`、工作树干净；**token 泄漏扫描：真实前缀 `github_pat_11COBB` 全仓零命中**（`TASK-1602.md` 命中的是密钥扫描正则规格文本，非真 token）。
**口径提醒**：20 卡中 4 张为"零代码交付"（7011 标 UNKNOWN、7013/7014 记录推迟 v1.1、7040 登记不做），按 plan-v010 定义计 PASS，但**不应读作"功能落地"**。

## 7. plan-v010 完成后，v1.0 真正还欠什么

| 项 | 状态 | 影响 |
|---|---|---|
| **4009 开锁交互 + `salvage.claimInfo`** | ⊘ **v1.1 推迟（用户 2026-10-28 拍板）** | 开锁交互（`chest.open`）已落地（服务端+客户端 `ChestPanel.ts:364` 已接）；`salvage.claimInfo` 按 plan-v005 `03:174` 裁决**维持 `todo` → v1.1 沉船玩法**（用户确认，不覆盖；salvage 表 `drops/shipwrecks/oil/explore` 全 0 行，仅 D-27 保底 `item_0020` 口径可落地，故维持推迟不写占位码）。**「领取」断环登记为 v1.1 阻塞** |
| 4010 四面板真机录屏 | ⏸ BLOCKED | 缺真机环境，证据缺口 |
| 4011 首钩命中率采样 | ⏸ BLOCKED | 缺真机用户，手感无基线 |
| 4013 合规材料清单 | ⚠ 部分 | 虚假陈述已删，清单未闭环 |
| 4016 四文档对齐 | ✅ **已完成（2026-10-28）** | 见 `EVD-4016/README.md`；plan 谱系 v003/v004 补标 `superseded` |
| TASK-4004 单测 | ✅ **已补（2026-10-28）** | `tests/determinism/guide-flow.test.mjs` 8 例全通过，缺口关闭 |

> 两套规划的关系：**plan-v003**（数值清欠/权威背包/商人页/契约解冻）+ **plan-v010**（空壳显性化/登录真实化/广告闭环/数值解锁/UI 六态/体检工具）。二者交付物不重叠，合并后才构成 v1.0 全貌；上表剩余 3 项（4010/4011/4013）**全部是外部依赖或材料缺口，没有一项是代码待写**。

## 8. 已知记录缺口（诚实登记，不粉饰）

1. ~~4003/4004/4006/4007 没有独立 EVD 文件~~ → **已补齐（2026-10-28）**：新增 `EVD-4003/4004/4006/4007/4016/README.md`，各含目标、交付、VERIFY 复跑数字与 G-07 局限登记。~~剩余真实缺口：TASK-4004 缺独立单测~~ → **已由 `tests/determinism/guide-flow.test.mjs`（8 例）关闭**。
2. **助手每卡的上报报文只存在于对话中**（STATUS/DIFF/VERIFY 模板），未落盘。可追溯靠 git 提交 + 测试复跑，但"谁在什么时间报了什么"没有独立档案。
3. **口径冲突已纠正两次**：① 主控 10-28 曾误判"4008 未做"，实际 `f3fa3e0`（10-27 15:46）已完成；② 本轮 current-plan 曾按"174+8=182"预估写入测试数，实测为 **219**（plan-v010 执行中还新增了若干用例），已按实跑数更正。**教训：文档里的数字必须来自当场复跑，不能由前值推算。**
4. ~~plan 谱系多版本并存未标现行~~ → **已修（4016）**：`plan-v003`/`plan-v004` 的 `00-snapshot.md` 已由 `status: active` 改为 `superseded`，`current-plan.md` 指针唯一指向 `plan-v010`。
5. **★新发现（2026-10-28）：EVD 目录下的 `README.md` 不会进文档索引。** `tools/gen/docs-index.mjs:7` 明确跳过所有 `README.md`（只放行 `docs/00_governance/README.md`），而 plan-v005 §10.5 的"五要素"规范又**要求**证据文件必须叫 `EVD-xxxx/README.md` —— 两条规则直接冲突，结果是 `EVD-4003/4004/4006/4007/4016` 五份证据**存在但索引里查不到**（`EVD-4012/baseline.md` 因为不叫 README 反而能查到）。
   - **本次不擅自改名**：改名会违反 plan-v005 的证据命名规范，且 plan-v005/v005 文档里的 `ls` 判据全是按 `README.md` 写的。
   - **建议**：把 `docs-index.mjs` 的跳过条件从"文件名等于 README.md"收窄为"目录下无其他 md 的落地页"，或给 EVD 目录开白名单。属工具改动，需单独一次提交 + 突变验证，不混在本批。
