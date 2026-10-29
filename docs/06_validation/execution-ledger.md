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
| 10-28（PLAN-R1 复跑） | 9/9 | **231/231** | 0 | verify EXIT=0，工作树干净 |
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

## 9. 2026-10-28 二轮体检：缺陷台账（FIX-1~FIX-23）

> 来源：主控按"规划者"角色对全仓做的实证盘查（非功能缺口，全部是**可验证的缺陷**）。
> 处置拆分见下批派工单 W1~W4。**本节状态以 §9 表格为准**（下方 W5 更正段已覆盖初版口径：
> 初版写"FIX-9 未派工"，该结论已于 W5-4 作废，FIX-9 已收口）。
>
> **W5 复核更正（2026-10-28）**：提交 `408b036` 信息写"12 项缺陷收口"系**高估**——W4 实际收口 **10 项**（FIX-1~8、FIX-11、FIX-13）。此后：FIX-9 于 W5-4 复核后收口（仅 `audio`/`pool`/`log` 3 个零引用，`time` 属实实现移出）；FIX-10 外部依赖不做；FIX-12 由 W5-3 收口（空表报告）；FIX-14 由 W5-4 收口（过期注释）；FIX-15 由 W5-1 收口（索引落地页排除）；FIX-16 新登记（time 来源）。

| 号 | P | 缺陷 | 证据坐标 | 状态 |
|---|---|---|---|---|
| FIX-1 | P0 | `GameApp.start()` 零调用点 → `lifecycle.onHide` 从未注册 → **切后台保存实际不生效**（违反 C3） | `GameApp.ts:19`；`BootController.ts:24-41` | ✅ `2a9f064` |
| FIX-2 | P0 | 激励视频**三个位面的奖励载体全不存在**（无冷却字段 / 无离线结算 / 无商店）→ 建入口即假按钮 | `ads/service.ts:16-19,38-46`；`hooks.json` 无 cooldown；客户端 `showRewardedAd` 调用点 0 | ✅ W1-2 `a6f4a87`（冻结，登记 D-49） |
| FIX-3 | P1 | 提审清单 `configVersion` 过期（写 `c6a54f0f…`，实测 `20a313a4…`），并违反清单自身第 7 条 | `review-checklist.md:57` vs `_manifest.json:2` | ✅ W1-3 |
| FIX-4 | P1 | 同一文件内注释自相矛盾：「8 个 todo」vs 实列 7 个 | `handlers.ts:28` vs `:40` | ✅ W1-3 |
| FIX-5 | P1 | 5 份 EVD 证据存在但文档索引查不到 | `docs-index.mjs:7` 跳过一切 `README.md` | ✅ W2-1 `0c96ec5` |
| FIX-6 | P1 | 网络失败 = 内部错误 = 未开放，**三者同码 4999**，靠 msg 字符串区分 | `RpcClient.ts:129,163` | ✅ W2-2 `8791ea4` |
| FIX-7 | P1 | 两条 UI 注释的事实已被 TASK-7031 推翻（称 weight/capacity `0/106` 填充，实测 weight `{1:53,3:28,10:25}`） | `InventoryPanel.ts:10`、`CraftingPanel.ts:11` | ✅ W1-4 `eb16ddd` |
| FIX-8 | P2 | 占位值无任何机检：`items.stack` 106 行全 99、`items.unlock_level` 106 行全 0、`recipes.unlock_level` 80 行全 0、`recipes.station` 32 行空 | `server/generated/config/` | ✅ W2-3 `f436049`（station 为空串非全表同值，规则不判，属另一类） |
| FIX-9 | P3 | 3 个零引用基础服务（`audio`/`pool`/`log` 各 3 行，引用数全 0）；`time` **非**零引用——30 行真实实现已接线（`RpcClient.ts:2,109` `syncFromResponse`） | `client/assets/scripts/services/` | ✅ 已收口（W5-4，2026-10-28）：复核更正——仅 3 个零引用（R-4 口径：改头注释），`time` 属实实现，移出 |
| FIX-10 | P2 | `compliance` 恒真桩（`verified = playerExists()`、`minor` 恒 false），而 `mvp-scope.md:57` 列为 v1.0 必做 | `compliance/service.ts:13` | 外部依赖，不做 |
| FIX-11 | P2 | 提审清单 7 类 17 项**全未勾**，其中 4 项本可机检 | `review-checklist.md` | ✅ W3-1 `8009cc4` |
| FIX-12 | P2 | 47 张表 / 16 有数 / **31 全空**，在"已转录"叙事下不可见 | `server/generated/config/` | ✅ W5-3 `e653edc`（空表报告 + `--all` 小表段） |
| FIX-13 | P1 | **启动页标题写的是另一个项目的名字**：`'奖励一颗麻籽'`。全仓仅这一处代码命中，且 `EVD-3101` 把这个错误写成了"验收预期" | `BootController.ts:30`；`EVD-3101/README.md:25` | ✅ 本批修正 |
| FIX-14 | P1 | 两处 UI 注释仍描述 W2-2 之前的旧行为（"ERR.SYSTEM 造错、code 可能 undefined"），实际已是 `NET_CODE_OFFLINE=-1`、code 恒 number | `LeaderboardModel.ts:84-85`、`SaveSyncModel.ts:224` | ✅ W5-4 `a1b662c` |
| FIX-15 | P2 | W2-1 收窄 README 跳过规则后，evidence 目录自己的落地页 `evidence/README.md`（无 front matter id）被纳入索引并显 ⚠缺 | `docs-index.mjs:12` | ✅ W5-1 `4fecfd9`（精确排除） |
| FIX-16 | P2 | `time` 时间源：客户端经 `RpcClient` 每次真实响应 `syncFromResponse` 校准服务器偏移（`RpcClient.ts:2,109`），但时间消费侧是否统一走该偏移的**口径未成文**，登记追踪 | `client/assets/scripts/services/time/`；`RpcClient.ts:2,109` | ✅ 已收口（PD1-04，2026-10-29）：口径已成文——当前所有客户端业务时间判定均为**本地相对计时**（Hook 蓄力/飞行手感、Leaderboard 3000ms 本地节流）或**存档时间戳**（服务端 `serverNow` 覆盖，`save.service.ts:70,86`），**无需与服务器时钟对齐**；`time.now()` 偏移机制已就绪（`RpcClient.ts:109` 校准），待未来出现需与服务器时间对齐的业务（冷却/活动）时接入 |
| FIX-17 | P1 | W5-5 的 docs-index 突变测试直接写仓库（动态建/删 EVD-TMP），违反测试纯净性 | `tests/contract/docs-index.test.mjs` | ✅ W6-1 `8524298`（改纯函数测试，测试不再写仓库） |
| FIX-18 | P2 | 台账 §9 自相矛盾：正文称「FIX-9 未派工」，表格又给「已收口」；标题 FIX-1~FIX-16 与实收口数不符 | `execution-ledger.md` §9 | ✅ W6-2 `09eb30d`（矛盾行改历史注记并作废，标题更正） |
| FIX-19 | P2 | `hook-hitrate.mjs` `resolve2` 用 `join(ROOT, p)`，绝对路径被拆坏 | `tools/sample/hook-hitrate.mjs:46` | ✅ PD1-01 `c030904`（改 `isAbsolute ? p : resolve(ROOT, p)`，实测 `--from E:/tmp/s.jsonl` EXIT=0） |
| FIX-20 | P3 | `hook-hitrate.mjs` 两处注释宣称 postmaster.pid「在保护」，实际该文件不存在（PGlite WASM 单进程），分支永不触发 | `tools/sample/hook-hitrate.mjs:12,49-50` | ✅ PD1-01 `c030904`（删死代码段，注释改「无锁：PGlite 单进程 WASM，本脚本不做并发防护」） |
| FIX-21 | P2 | `placeholders` 不在 `verify` 链内 → 占位值回归永远不红，违反「不在 verify 里就不是闸门」铁律 | `package.json` `verify` vs `placeholders` | ✅ PD1-02 `c3cc89e`（并入 run-all 成为第 10 项守卫 + baseline 白名单；未直接塞 verify shell 链，符合 R-7） |
| FIX-22 | P2 | 台账 §4 门禁快照停在 `219`，实测 `231`；三份文档互相对不上 | `execution-ledger.md:72` | ✅ 本卡（§4 追加 PLAN-R1 复跑 `231/231` 快照） |
| FIX-23 | P1 | FIX-17~20 四条缺陷未写入任何权威文件，只存在于提交信息，违反 pds 底线 2「行为留痕」 | 全仓 grep `FIX-17/18/19/20` 在 `docs/` 零命中 | ✅ 本卡（§9 追加 FIX-17~23 七行） |
| FIX-24 | P1 | **PLAN-R1 的 14 张卡（PD0-01~PD4-01）从未进入权威任务索引，也没有卡面**：`task-index.json` 只有 52 张历史卡（`plan_version` 却写 `PLAN-R1`），`pd.mjs status` 报「共 52 张、完成 33」，`pd.mjs next` 把 17 张历史卡当就绪卡派工 → 本轮所有「收口」在 pds 里不存在，只是聊天记录 | `.product-development/task-index.json`；`docs/05_execution/tasks/`（无 PD-*.md） | ✅ PLAN-R2（补 14 条 + 14 份卡面到 `.product-development/tasks/`，`paths.task_cards` 同步改指） |
| FIX-25 | P1 | **测试台账用了非法枚举**：`result: "PARTIAL-AUTOMATED"` 不在 `RESULT=['PASS','FAIL','UNKNOWN']` 内 → `pd.mjs health` 报错「体检未通过：1 个错误」，即执行侧声称「10 张卡 done、verify EXIT=0」时 health 实际是红的；另有 6 条 `evidence` 写成 `execution-ledger.md#4` 锚点，被当文件路径判「证据文件不存在」 | `docs/06_validation/pd/test-ledger.json`；`pd.mjs:173` | ✅ PLAN-R2（`original_result` 保留原文，`result` 更正为 `PASS` + `scope_limit=automated-only` + `unverified` 三项；6 条 evidence 去锚点 → health 0 错误 52 提醒） |

### FIX-13 详情（2026-10-28 用户提问触发）

- **用户问题**：「为什么会出现 `this.setTitle('奖励一颗麻籽')`，这是一个项目吗？」
- **核实结论**：是**一个**项目（本仓 `README.md:1` = 《我的筏不可能这么大》），这一行是**串项目的文案残留**。
  `奖励一颗麻籽` 全仓只有 2 处命中：`BootController.ts:30`（代码）与 `EVD-3101/README.md:25`（证据描述），
  其余 0 处；本仓产品文档中 `麻籽` / `星辉` 亦**零命中**（三币制在本项目的正式名称走 `灵草`）。
- **为什么算 P1 而非 P3**：`copyright-materials.md:13` 要求「软件名称与小游戏名一致：我的筏不可能这么大」，
  启动页打出别的名字会直接出现在**提审截图**里；且 `EVD-3101` 把错误当预期写进了证据，
  等于**用证据固化 bug**——与「修注释前先问这句话描述的对象存在吗」同类。
- **修正**：文案改为 `'我的筏不可能这么大'`（取 `project-charter.md:16`），并加注释指向权威源；
  `EVD-3101/README.md:25` 的预期同步更正并留更正说明，不改写历史结论。
- **防复发建议（未做，登记）**：启动页/分享文案里的游戏名应从 `docs/01_product/project-charter.md` 或
  `game-data` 的单一常量读取，而不是硬编码字面量。属重构，不进本批。

### R-1~R-6 口径登记（W3-2，2026-10-28 用户拍板）

> 规划者（用户）对 W1~W4 六项裁决的口径，逐条登记如下；**范围变更需用户点头**。

| 号 | 口径 | 内容 |
|---|---|---|
| R-1 | 激励视频三效果无载体 | `hook_cooldown`/`offline_double`/`shop_refresh` 的奖励载体（冷却字段/离线结算/商店）未落地 → 冻结至 v1.1，不伪造效果（D-49）。 |
| R-2 | 占位值机检只报告 | `npm run placeholders` report-only（挂 stage 不挂 verify）；`--strict` 才作门禁。 |
| R-3 | 网络失败本地合成码 | 契约 15 码冻结不动；客户端网络失败改本地码 `-1`（`NET_CODE_OFFLINE`），与 4999/未开放分离。 |
| R-4 | 空壳目录处置 | 不删空壳目录；只改 4 个零引用服务的头注释（`audio`/`pool`/`log`/`time`）。 |
| R-5 | 文档索引规则 | 不改 EVD 文件名；改 `docs-index.mjs` 跳过规则（EVD README 纳入索引，缺 id 显 ⚠缺）。 |
| R-6 | 代码层 v1.0 = 五环 | 捞→包→做→扩→卖五环（10 模块）；其余 13 个 v1 模块进 v1.1。 |

## 10. PLAN-R2 处置记录（2026-10-29，主控复核执行侧 10 卡报告后）

> 触发：执行侧报告「PD0/PD1/PD3/PD4 共 10 张卡完成，HEAD=`bf0fe75`，verify EXIT=0」，并就 PD2-01/02/03 三项
> BLOCKED-HUMAN 请规划者裁决。主控未采信自述，逐项复跑后**发现两处账实不符**（FIX-24/FIX-25），
> 补录后 `pd.mjs health` 由「1 个错误」转为「0 错误 52 提醒」通过。

### 10.1 复跑证据（2026-10-29，HEAD=`bf0fe75`）

| 项 | 命令 | 结果 |
|---|---|---|
| 闸门 | `npm run verify` | **EXIT=0**；守卫 **10/10**（新增第 10 项「占位值 baseline 内（旧债不阻断）」）、`tests 231/231`、`tsc` client+server 0 错 |
| 体检 | `pd.mjs health .` | 补录前 **体检未通过：1 个错误**（FIX-25）→ 补录后 **体检通过（52 个提醒）**、0 错误 |
| 索引 | `pd.mjs status .` | 补录前「共 52 张、完成 33、就绪 17 张（全是历史卡）」→ 补录后 66 张，PD2-01/02/03 入 `BLOCKED` |
| 双端 | `git rev-list --left-right --count origin/master...master` | `0 0` |

### 10.2 D-51：PD2 三项的结案口径（登记于 `plan-v003/decision-sheet.md` §F）

三项**记为 `BLOCKED-HUMAN`，不记为「延期」**——延期的语义是主动放弃时间窗，而事实是等外部输入（真机 / 用户操作 / 平台资质），**没有一项是代码待写**。
恢复触发条件逐条写死（D-51 正文）。PD4-01 的 PASS **只覆盖自动化范围**，3 项人工项在台账标 `UNKNOWN`，
**禁止读作「完整验收通过」**。三项不作为 v1.0 发版阻塞项，但也不从待办中消失。

### 10.3 索引口径收紧（FIX-25 连带发现）

`pd.mjs next` 补录前把 17 张卡列为「可开工」，其中 9 张已由书面裁决移出 v1.0 范围
（`TASK-0802/0803` 赶海整片移 v1.1、`TASK-0902/0903` leaderboard 属 D-50、`TASK-1502/1503` 属 31 张空表、
`TASK-4009` 用户 10-28 拍板推迟、`TASK-1601/1602` 原卡自述「登记，暂不实施」）。
已按「有书面依据才动」原则改为 `BLOCKED` + `blocked_reason`，**无依据的 7 张（0103/0106/0108/0202/1301/1401/4020）一律不动**，
留待下一轮核实现状后单独裁决。

### 10.4 4011「20 钩」处置（D-52，2026-10-29）

主控无法真机打钩，按用户授权（「你自行裁决 20 钩」）自行裁决：**一分为二**。

| 半边 | 问题 | 交付 | 状态 |
|---|---|---|---|
| 机制侧 | 蓄力多久能命中？判定逻辑是否可解？ | `tools/sample/hook-window.mjs`（复用 `game-core/hook` 的 `powerAt`/`chargeAndCast`，**不重写公式**） | ✅ PD2-04 `acc9398` |
| 手感侧 | 真人首钩命中率/前 10 钩/`chargeMs` 分布 | 无（只能真人） | ⏸ PD2-01 BLOCKED-HUMAN |

**实测（`hooks.json` 表值 `target_dist=600`、`angle_deg=15°`、`cycleMs=1200`）**

| 指标 | 值 |
|---|---|
| 命中蓄力窗口 | **348–852 ms**（单段连续） |
| 窗口宽度 | 505 / 1200 = **42.1%** |
| 窗口下沿力度 | **5800 bp（58.0% 满力）** |
| 20 钩（均匀零假设，种子 20261029） | **12/20 = 60.0%**，首钩命中（536 ms → 8933 bp） |

**这次裁决能说与不能说**：能说——C1 的「首钩 ≥45%」在**机制上可达**（窗口 42.1%、零假设 60%），
且角度 15° 的垂直偏移仅 ±1（`armLength=1`）对 60 的命中半径无实质影响，**命中实际只由蓄力时长决定**。
不能说——真人命中率；那取决于力度条是否看得清、提示是否明确，只能真机实测。
**红线三条**（D-52）：SIMULATED 不得当 4011 验收、不得宣称 C1 已达标、不得据此调 `target_dist`/`hitRadius`。
