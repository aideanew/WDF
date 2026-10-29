---
id: PLAN-V011-C
title: plan-v011 · 阶段 C（v1.1 模块）· 7 张原子任务卡
status: active
module: planning
owner: hark
created: 2026-10-29
review: 2026-11-12
related: [PLAN-V011-B, PLAN-V011-07]
---

# 阶段 C · v1.1 模块（13 个模块，7 张卡）

## 1. 本阶段的边界（先说清不做什么）

| 项 | 结论 | 依据 |
|---|---|---|
| 范围 | **只有 D-50 登记的 13 个模块**：`progression` `crew` `power` `ads` `leaderboard` `event` `island` `defense` `social` `fishing` `salvage` `compliance` `telemetry` | D-50 `detail.modules_v11` 逐条 |
| 不做 | 远洋 / PVP / 交易 / 结盟 / 埋宝 / AI 玩家 / 管理后台 | `mvp-scope.md:34,56`（N-1、N-2） |
| 不建 | 不为 v1.2 预建表或目录 | §13.13（N-3） |
| 契约 | **0 改动**（13 个模块的契约全部已存在，`04 §1`） | — |
| 迁移 | 最多 `0003`（仅 PD7-14 可持有） | `05 §3` |

## 2. 阶段入口检查（不满足不得开工）

- [ ] B 阶段对应表已非空（每卡在自己的 `输入` 里写明依赖哪张表）
- [x] **D-56 已裁 → B**（2026-10-29，用户裁决：13 模块不改 `hook` 参数，C 阶段解绑 C1 手感闸门）
      → 本阶段**已解除**这道挂起。**硬条件仍需逐卡自检**：任何卡若要改
      `hook` 的 `target_dist / angle_deg / max_power_bp`（含 D-04 的等值迁移值）→ 立即 `BLOCKED` 回上裁决。
- [ ] `handlers.ts` 的写入权已指定（O-2：Agent-Server 单写者）

## 3. 阶段出口条件

- [ ] 13 个模块在 `module-catalog.json` 的六层判据下**不再是空壳**（逐模块给出行数 + 调用方证据）
- [ ] `npm run verify` EXIT=0（C 段出口的全量，本阶段唯一一次）
- [ ] `pd.mjs health .` → 0 错误
- [ ] 每个模块至少 1 个测试文件

---

# PD7-10 progression 等级与驶出浅海

- 阶段 / 角色 / 规划版本：C / executor / PLAN-R4
- 来源（E1）：`mvp-scope.md:26`（等级与驶出浅海）+ D-50 + 卡 PD7-06 的 `levels/unlocks`

## 归属
- 所属切片：SC-1
- 来源需求：mvp-scope §2 表第 3 行 → 设计源 v5.5 §5
- 来源方案：`packages/game-core/src/progression/`（现 3 行）+ `levels 49` 行

## 目标
打捞产生经验 → 升到 49 级封顶 → 达到某级后海域可切换；解锁判定读表不读代码。

## 输入
- 文档：`02 §1.7`（`levels 49 行`）、PD7-06 交付的 `unlocks.level`
- 契约：无新增（进度存本地存档 `modules.progression`）
- 前置任务：PD7-06
- 前置状态：`progression` 客户端 18 行、core 3 行；`levels` 有 `exp_to_next`

## 输出
- `packages/game-core/src/progression/index.ts`（`addExp` / `levelOf` / `isUnlocked` 三个纯函数）
- `client/assets/scripts/features/progression/model/ProgressionModel.ts`（从空壳改为真实）
- `client/assets/scripts/features/progression/view/`（等级条，挂在打捞面板顶部，**不新增 Tab**）
- `tests/determinism/progression.test.mjs`

## Execution Steps
1. [ ] core：`addExp(state, gain)` → `{ level, exp, leveledUp }`，表驱动（读 `levels.csv`）
2. [ ] core：`isUnlocked(level, kind, targetId)` → 查 `unlocks`
3. [ ] 客户端 model：出钩命中后调 `addExp`，写存档 `modules.progression`
4. [ ] 视图：打捞面板顶部一行"Lv.N  exp/exp_to_next"
5. [ ] 测试：1 级 → 2 级、满级封顶、解锁判定三条
6. [ ] `npm run typecheck:client`

## 验收标准
- [ ] A1 `command`：`node --import ./tools/runtime/register.mjs --test tests/determinism/progression.test.mjs` → PASS
- [ ] A2 `assert`：`isUnlocked` 的实现里**没有硬编码等级数字**（全读表）
- [ ] A3 `visual`：打捞面板顶部出现等级行（截图）
- [ ] A4 `command`：`npm run typecheck:client` → 0 错

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/progression.test.mjs
npm run typecheck:client
```

## 证据路径 `docs/06_validation/evidence/EVD-7110/`
## 允许修改
- `packages/game-core/src/progression/**`、`client/assets/scripts/features/progression/**`
- `client/assets/scripts/features/hook/view/HookPanel.ts`（仅顶部一行）、`tests/determinism/progression.test.mjs`

## 禁止修改
- `game-data/source/levels.csv`（PD7-06 的地盘）、`app/MainView.ts`（**不新增 Tab**）

## 依赖与阻塞
- Depends on：PD7-06
- Blocks：PD7-12、PD7-13、PD7-15
- 阻塞条件：`unlocks.level` 为空 → 停（`isUnlocked` 无参可依）

## 建议执行档位 `opus`　理由：跨模块参数源，错一处全盘错。
## 升级条件 若需改存档 schema 形状（非开放 map 扩展）→ 升 `fable`。
## 预估规模 中（1.5 天）

---

# PD7-11 crew 员工与 power 电力（含离线结算载体）

- 阶段 / 角色 / 规划版本：C / executor / PLAN-R4
- 来源（E1）：`mvp-scope.md:26`（员工与食物、职业）+ D-49（`offline_double` 无载体 → v1.1 补）

## 归属
- 所属切片：SC-2
- 来源需求：mvp-scope §2 表第 3 行 → 设计源 v5.5 §6、§7
- 来源方案：`05 §4`（存档 `modules.crew`）+ ADR-0012（权威划分）

## 目标
招 1 名员工 → 产出物进背包；离线 X 分钟后回来，按 `savedAt` 差值结算产出（S-3 由"注释承诺"变成"真实现"）。

## 输入
- 文档：PD7-07 的 `jobs/foods/crew_traits/generators/consumers`；`packages/game-core/src/save/index.ts`（`savedAt`）
- 前置任务：PD7-07
- 前置状态：`crew`/`power` core 各 3 行、客户端各 18 行；离线结算**完全不存在**（`02 §1.8`）

## 输出
- `packages/game-core/src/crew/index.ts`（`produce(jobs, elapsedMs)` 纯函数）
- `packages/game-core/src/power/index.ts`（`supply/demand` 判定）
- `client/assets/scripts/features/crew/**`、`features/power/**`
- `packages/game-core/src/save/schema.ts`（`modules.crew` / `modules.power` 开放 map 扩展，**不递增**）
- `tests/determinism/crew-offline.test.mjs`

## Execution Steps
1. [ ] core：`produce(assignments, elapsedMs)` → `{ itemId: count }[]`，**纯函数，入参含当前时间**
2. [ ] 离线结算：登录后 `save.pull` 拿 `savedAt` → `produce(..., now - savedAt)` → 结果入背包（**上限由 `jobs` 表给出，无上限则不设**）
3. [ ] `power`：`supply >= demand` 才允许设施运行
4. [ ] 客户端：员工面板（挂"筏"或商人面板内的子页，**不新增 Tab**）
5. [ ] 测试：0 秒不产出、1 小时按表产出、多员工累加
6. [ ] `npm run typecheck:client` + `typecheck:server`

## 验收标准
- [ ] A1 `command`：`node --import ./tools/runtime/register.mjs --test tests/determinism/crew-offline.test.mjs` → PASS
- [ ] A2 `assert`：`produce` 不读 `Date.now()`（时间由入参传入，game-core 纯度守卫会抓）
- [ ] A3 `visual`：离线 10 分钟后重进，背包多出对应产出（截图）
- [ ] A4 `assert`：`SAVE_SCHEMA_VERSION` **未变**（开放 map 扩展）

## 验证命令
```bash
npm run gen && node --import ./tools/runtime/register.mjs --test tests/determinism/crew-offline.test.mjs
npm run typecheck
```

## 证据路径 `docs/06_validation/evidence/EVD-7111/`
## 允许修改
- `packages/game-core/src/{crew,power,save}/**`、`client/assets/scripts/features/{crew,power}/**`
- `tests/determinism/crew-offline.test.mjs`

## 禁止修改
- `game-data/source/jobs.csv` 等（PD7-07 的地盘）、`app/MainView.ts`

## 依赖与阻塞
- Depends on：PD7-07
- Blocks：PD7-12（`offline_double` 需要离线结算存在）
- 阻塞条件：`jobs` 无产出速率 → 停

## 建议执行档位 `opus`　理由：离线结算 = "服务端权威 vs 本地"的边界问题（ADR-0012 同族），且要动存档。
## 升级条件 若离线产出需要服务端复核 → 升 `fable`（涉及 ADR）。
## 预估规模 中（2 天）

---

# PD7-12 广告三效果接线

- 阶段 / 角色 / 规划版本：C / executor / PLAN-R4
- 来源（E1）：D-49（三 placement 无载体，冻结至 v1.1）+ `ad_placements` 3 行（`daily_cap=3`）

## 归属
- 所属切片：SC-3
- 来源需求：mvp-scope §2 表末行（激励视频）→ 设计源 v5.5 §12 → D-49 / ADR-0014
- 来源方案：`server/src/modules/ads/`（138 行，`ads.claim` 已实现）

## 目标
三个 placement 各产生**真实效果**：`hook_cooldown` 缩短冷却、`offline_double` 离线产出翻倍、`shop_refresh` 刷新商店，且日限 3 次。

## 输入
- 文档：D-49 原文、`server/src/modules/ads/service.ts:4-5`（现状注释：三个 placement 均"发一个不存在的效果"）
- 前置任务：PD7-09（`limits` 表 = 商店）、PD7-10（等级）、PD7-11（离线结算）
- 前置状态：`hook` 无冷却字段；`shop` 不存在（`02 §1.8` 实测 grep 0 命中）

## 输出
- `hook` 冷却字段（`modules.hook.cooldownUntil`，存档开放 map 扩展）
- `economy.buyQuota` 落地（商店，`handlers.ts` 把 `todo` 换成真实实现）
- `server/src/modules/ads/service.ts`（三效果分发）
- `client/assets/scripts/features/ads/**`（从 18 行空壳改为真实）
- `tests/integration/ads-effects.test.mjs`

## Execution Steps
1. [ ] `hook` 冷却：出钩后置 `cooldownUntil`；`hook_cooldown` 广告清空它
2. [ ] 商店：`economy.buyQuota` 实现（读 `limits` + `daily_quota` 表，限购校验）
3. [ ] `shop_refresh`：重置当日限量
4. [ ] `offline_double`：离线产出 ×2（调 `produce` 的倍率参数）
5. [ ] 服务端：`ads.claim` 按 `placement` 分发，日限读 `ad_placements.daily_cap`
6. [ ] 测试：三个 placement 各一条 + 超额拒绝一条
7. [ ] **只改自己那一行** `handlers.ts` 的 `economy.buyQuota` 绑定（O-2）

## 验收标准
- [ ] A1 `command`：`node --import ./tools/runtime/register.mjs --test tests/integration/ads-effects.test.mjs` → PASS
- [ ] A2 `assert`：`handlers.ts` 里 `'economy.buyQuota': todo` 已消失
- [ ] A3 `assert`：第 4 次领同 placement → 返回拒绝（日限 3）
- [ ] A4 `visual`：三个按钮各产生可观察变化（截图）

## 验证命令
```bash
npm run gen && node --import ./tools/runtime/register.mjs --test tests/integration/ads-effects.test.mjs
```

## 证据路径 `docs/06_validation/evidence/EVD-7112/`
## 允许修改
- `server/src/modules/ads/**`、`server/src/modules/economy/**`、`client/assets/scripts/features/ads/**`
- `packages/game-core/src/{hook,save}/**`（冷却字段）
- `server/src/gateway/handlers.ts`（**仅 `economy.buyQuota` 一行**）
- `tests/integration/ads-effects.test.mjs`

## 禁止修改
- `packages/contracts/**`（`AdClaimReq/Res` 已冻结）、其他 handler 行

## 依赖与阻塞
- Depends on：PD7-09、PD7-10、PD7-11
- Blocks：无
- 阻塞条件：`limits` 表空 → 商店无法成立 → 停

## 建议执行档位 `sonnect`　理由：契约与 `ads.claim` 都已在，本卡是"接载体"。
## 升级条件 若要改成服务端复核（改 ADR-0014）→ 升 `opus`。
## 预估规模 中（1 天）

---

# PD7-13 leaderboard 赛季、称号、省份榜

- 阶段 / 角色 / 规划版本：C / executor / PLAN-R4
- 来源（E1）：`mvp-scope.md:54`（称号 + 总收益榜 + 省份榜）+ D-50 + D-53（`regions` 回落口径）

## 归属
- 所属切片：SC-4
- 来源需求：mvp-scope §5 v1.0 第 5 条 → 设计源 v5.5 §10
- 来源方案：`server/src/modules/leaderboard/`（283 行已有范式）

## 目标
榜单行带称号；省份榜按 `regions` 分组出真实数据（不再是回落默认区）。

## 输入
- 前置任务：PD7-06（`unlocks`）、PD7-09（`seasons/titles/regions`）
- 前置状态：`leaderboard` game-core 4 行、服务端 283 行、客户端 307 行（**总收益榜可用**）

## 输出
- `server/src/modules/leaderboard/`（赛季过滤 + 称号关联 + province 维度）
- `client/assets/scripts/features/leaderboard/view/LeaderboardPanel.ts`（称号列 + scope 切换）
- `tests/integration/leaderboard-season.test.mjs`

## Execution Steps
1. [ ] 服务端 `query`：`scope='province'` 从 `player.region` 聚合（已有 `player_region_idx`）
2. [ ] 赛季：`leaderboard_snapshot` 按赛季 id 过滤（表已存在）
3. [ ] 称号：`titles` 表 → `RankRow.title`
4. [ ] 客户端：scope 三档切换 + 称号显示
5. [ ] 测试：三 scope 各一条 + 空榜一条（`empty` 态）

## 验收标准
- [ ] A1 `command`：`node --import ./tools/runtime/register.mjs --test tests/integration/leaderboard-season.test.mjs` → PASS
- [ ] A2 `assert`：`regions` 非空时 `account.currentRegion()` 不走回落分支
- [ ] A3 `visual`：榜单行显示称号（截图）
- [ ] A4 `assert`：空榜返回 `items: []` 且客户端显 `empty` 态（不是 `error`）

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/integration/leaderboard-season.test.mjs
```

## 证据路径 `docs/06_validation/evidence/EVD-7113/`
## 允许修改
- `server/src/modules/leaderboard/**`、`client/assets/scripts/features/leaderboard/**`
- `tests/integration/leaderboard-season.test.mjs`

## 禁止修改
- `packages/contracts/src/leaderboard/**`（`QueryReq.scope` 已有 `'province'`，不改）、`handlers.ts`（本卡不新增动作）

## 依赖与阻塞
- Depends on：PD7-06、PD7-09
- Blocks：无
- 阻塞条件：`seasons` 空 → 赛季部分留空，只做省份榜与称号（不整体停）

## 建议执行档位 `sonnect`　理由：283 行已有范式，本卡是维度扩展。
## 升级条件 触碰榜单快照结构 → 升 `opus`。
## 预估规模 中（1 天）

---

# PD7-14 event 赶海整片（S8）

- 阶段 / 角色 / 规划版本：C / planner+executor / PLAN-R4
- 来源（E1）：`mvp-scope.md:64`（S8 整片移入 v1.1）+ D-50

## 归属
- 所属切片：SC-5
- 来源需求：mvp-scope §5 v1.1 第 2 条 → 设计源 v5.5 §8
- 来源方案：`event_session` 表（已建）+ 3 个契约（`EventStartReq/SubmitReq/ResultRes` 已冻结）

## 目标
20:00 进场 → 3 分钟 → 提交操作序列 → 服务端复算计分 → 出本场排名。

## 输入
- 前置任务：PD7-09（`events/event_drops`）
- 前置状态：服务端 `event` 6 行空壳 + 3 个 `todo`；契约齐备

## 输出
- `server/src/modules/event/**`（start/submit/result 三个 handler）
- `server/db/migrations/0003_*.sql`（**仅当**需要"已结算"列；见步骤 2）
- `client/assets/scripts/features/event/**`
- `tests/integration/event-carnival.test.mjs`

## Execution Steps
1. [ ] `event.start`：校验时段（非 20:00–21:00 → `3201`）、当日已参与（→ `3202`）、生成 seed 与装备快照
2. [ ] **判定是否需要 `0003`**：若"已结算"状态可由 `event_session` 现有列推导 → **不建迁移**
3. [ ] `event.submit`：服务端按 seed 复算（**不信客户端上报分数**，AGENTS.md 硬禁止）
4. [ ] `event.result`：返回 `totalValue/rank/settled`
5. [ ] 客户端：入口 + 3 分钟计时 + 提交
6. [ ] `handlers.ts` 换掉 3 个 `todo`（**只改这 3 行**，O-2）
7. [ ] 测试：时段外拒绝 / 重复参与拒绝 / 复算与客户端一致

## 验收标准
- [ ] A1 `command`：`node --import ./tools/runtime/register.mjs --test tests/integration/event-carnival.test.mjs` → PASS
- [ ] A2 `assert`：`grep -c "'event.start': todo" handlers.ts` → 0（3 个 todo 全换）
- [ ] A3 `assert`：服务端复算结果与提交的 ops 重放结果一致（不依赖客户端分数）
- [ ] A4 `assert`：若新增迁移，`0003` 头注释含卡号与依据（`05 §3` 规则 4）

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/integration/event-carnival.test.mjs
git diff --stat server/db/migrations/
```

## 证据路径 `docs/06_validation/evidence/EVD-7114/`
## 允许修改
- `server/src/modules/event/**`、`client/assets/scripts/features/event/**`
- `server/db/migrations/0003_*.sql`（**只有本卡能建**）、`handlers.ts`（仅 3 行）
- `tests/integration/event-carnival.test.mjs`

## 禁止修改
- `packages/contracts/src/event/**`、`event_session` 的既有列定义（只增不改）

## 依赖与阻塞
- Depends on：PD7-09
- Blocks：无
- 阻塞条件：`events` 表空 → 停

## 建议执行档位 `opus`　理由：服务端复算 + 种子确定性 + 可能的迁移，v1.1 最复杂一卡。
## 升级条件 不升级（已是最高执行档）。
## 预估规模 大（2–3 天）

---

# PD7-15 island + defense（岛与塔防，允许降级）

- 阶段 / 角色 / 规划版本：C / planner+executor / PLAN-R4
- 来源（E1）：`mvp-scope.md:29`（占岛/塔防/3 兵种/保护卡）+ `mvp-scope.md:52`（**允许降级为文字结算**）

## 归属
- 所属切片：SC-6
- 来源需求：mvp-scope §2 表第 6 行 → 设计源 v5.5 §8
- 来源方案：`defense 30 行骨架` + PD7-08 的 7 张表

## 目标
占 1 座无主岛 → 被袭击 → 3 兵种防守 → 出结果摘要（**回放可选，文字结算可接受**）。

## 输入
- 前置任务：PD7-06（解锁）、PD7-08（表）
- 前置状态：`defense` 30 行确定性骨架、`island` core 3 行 / 客户端 18 行

## 输出
- `packages/game-core/src/defense/index.ts`（扩成完整一波模拟）
- `packages/game-core/src/island/index.ts`（占岛/驻守）
- `client/assets/scripts/features/{island,defense}/**`
- `tests/determinism/defense-sim.test.mjs`

## Execution Steps
1. [ ] core `defense`：`simulate(seed, wave, units, defenses)` → `{ survived, log }`，**纯函数 + 确定性**
2. [ ] 若 core 模拟超过 2 天 → **触发降级**：改为 `resolveByTable()`（按兵种克制表直接出结果 + 一行文字摘要）
3. [ ] `island`：占岛（无主岛）、驻守员工、被袭击触发防守
4. [ ] 客户端：岛屿页（入口挂商人面板内子页，不新增 Tab）
5. [ ] 测试：同 seed 同输出 + 克制关系正确
6. [ ] **`handlers.ts` 不动**（本卡无新动作，全是本地判定 + 存档）

## 验收标准
- [ ] A1 `command`：`node --import ./tools/runtime/register.mjs --test tests/determinism/defense-sim.test.mjs` → PASS
- [ ] A2 `assert`：同 seed 跑两次结果完全相同
- [ ] A3 `visual`：占岛 → 防守 → 出摘要（截图；文字结算也算过）
- [ ] A4 `review`：若降级，`UNKNOWN-TABLES.md` 记录"回放推迟 v1.2"

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/defense-sim.test.mjs
```

## 证据路径 `docs/06_validation/evidence/EVD-7115/`
## 允许修改
- `packages/game-core/src/{defense,island}/**`、`client/assets/scripts/features/{island,defense}/**`
- `tests/determinism/defense-sim.test.mjs`

## 禁止修改
- `game-data/source/{units,waves,...}.csv`（PD7-08 的地盘）、`handlers.ts`

## 依赖与阻塞
- Depends on：PD7-06、PD7-08
- Blocks：无
- 阻塞条件：`waves` 空 → 停；模拟超 2 天 → 降级（**不要硬撑**）

## 建议执行档位 `opus`　理由：全项目最重一卡，决策成本高（降级与否）。
## 升级条件 不升级；**若降级成立 → 可降到 `sonnect` 继续**。
## 预估规模 大（3 天，降级后 1.5 天）

---

# PD7-16 轻玩法三件（social + fishing + salvage.claimInfo）

- 阶段 / 角色 / 规划版本：C / executor / PLAN-R4
- 来源（E1）：`mvp-scope.md:28,65` + D-50 + `4009` 已推迟 v1.1（`246d0f0`）

## 归属
- 所属切片：SC-7
- 来源需求：mvp-scope §5 v1.1 第 3 条（钓鱼、聊天）+ §2 表第 5 行（沉船）
- 来源方案：三份契约已冻结（`social` 4 行 / `salvage` 2 行类型）

## 目标
发一条快捷短语能看到；钓到 1 条鱼；领 1 份沉船信息（`salvage.claimInfo` 从 `todo` 转真实）。

## 输入
- 前置任务：PD7-09（`phrases/fish/bait/shipwrecks/oil/explore/drops/lines/lockpick_tools/blueprints`）
- 前置状态：服务端 `social`/`salvage` 各 6 行空壳 + `todo`×3

## 输出
- `server/src/modules/social/**`（send/pull）
- `server/src/modules/salvage/**`（claimInfo）
- `client/assets/scripts/features/{social,fishing,salvage}/**`
- `tests/integration/lightplay.test.mjs`

## Execution Steps
1. [ ] `social.send/pull`：频道（region/world）+ 短语 id，**默认不持久化**（U-4）
2. [ ] `salvage.claimInfo`：`daily_quota` 表限次（表已存在）
3. [ ] `fishing`：core 3 行 → 一条确定性钓鱼判定（不涉及服务端）
4. [ ] `handlers.ts` 换掉 3 个 `todo`（**只改这 3 行**）
5. [ ] 客户端三个面板（都挂现有 Tab 内子页，不新增 Tab）
6. [ ] 测试：短语发送成功/拉取、沉船限额、钓鱼确定性

## 验收标准
- [ ] A1 `command`：`node --import ./tools/runtime/register.mjs --test tests/integration/lightplay.test.mjs` → PASS
- [ ] A2 `assert`：`grep -c "todo" handlers.ts` 从 7 降到 **0**
- [ ] A3 `assert`：聊天**无新迁移**（未持久化，U-4 默认）
- [ ] A4 `visual`：三个功能各一张截图

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/integration/lightplay.test.mjs
grep -c "': todo" server/src/gateway/handlers.ts
```

## 证据路径 `docs/06_validation/evidence/EVD-7116/`
## 允许修改
- `server/src/modules/{social,salvage}/**`、`client/assets/scripts/features/{social,fishing,salvage}/**`
- `packages/game-core/src/fishing/**`
- `server/src/gateway/handlers.ts`（仅 3 行）、`tests/integration/lightplay.test.mjs`

## 禁止修改
- `packages/contracts/**`、`server/db/migrations/**`（本卡不建表）

## 依赖与阻塞
- Depends on：PD7-09
- Blocks：无
- 阻塞条件：`phrases` 空 → 聊天无内容可发（可用 1 条占位？**不许**）→ 停

## 建议执行档位 `sonnect`　理由：三条小闭环，契约齐备。
## 升级条件 钓鱼若要做确定性回放 → 升 `opus`。
## 预估规模 中（2 天）
