---
id: PLAN-V012-00
title: plan-v012 · 从「数据转录」转向「数据消费」——第四代规划总纲
status: active
module: planning
owner: hark
created: 2026-10-30
review: 2026-11-13
related: [PLAN-V011-00, PLAN-V012-01, PLAN-V012-02]
---

# plan-v012 · 总纲

## 0. 这一版为什么存在（一句话 + 一条硬证据）

**PD7-06~PD7-09 把 30 张表从空转录到有数（46 表中 40 张非空），但 46 张表里有 31 张的消费方是零。**

这不是"数据不够"，是"数据躺在磁盘上没有任何代码读它"。前四代规划（v008~v011）都把缺口定位在
「数值缺失 → 转录」，v011 的 B 阶段就是为此设计的，并且**已经成功完成**（40/46 非空）。
今天实测的结果是：**转录完成后，模块实现几乎没动**——

| 实测 | 数字 | 证据 |
|---|---|---|
| game-core 里只有 `export const MODULE_ID` 一个常量的模块 | **7 个**（crew/event/fishing/island/power/progression/salvage）+ leaderboard 4 行 | `packages/game-core/src/*/index.ts` 逐文件 cat |
| 客户端 `features/` 只有 3 文件 18 行的模块 | **15 个** | `client/assets/scripts/features/*/` 逐目录计行 |
| 客户端配置加载器能读的表 | **11 张**（`TableName` 联合类型） | `client/assets/scripts/services/config/tables.ts:16-25` |
| 已导出到客户端 resources 的表 | **48 个 json**（46 表 + `_manifest` + 1） | `ls client/assets/resources/config/*.json \| wc -l` |
| 生成的 `XxxRow` 类型 | **46 个**（全覆盖） | `packages/game-core/src/generated/config-types.ts` |

**结论**：类型齐（46）、文件齐（48）、数据齐（40/46），**唯独 `TableName` 只登记了 11 张**。
这是本仓最便宜、收益最大的一处改动，也是 v012 的第一主线。

## 1. 四代命题的递进（每代被什么证伪）

| 代 | 命题 | 被什么推翻 |
|---|---|---|
| v008~v009 | 「卡没做完，逐张推完就行」 | 做完 8 张卡后发现 v1.0 仍不可演示（`plan-v010/03-self-negation.md` N-4） |
| v010 | 「20 卡收官，v1.0 五环已闭环」 | `features/raft` 18 行空壳、`MainView` 6 Tab 无筏体 → **只成立四环**（`plan-v011/00-README.md` C-1） |
| v011 | 「先补数据（B 阶段 4 卡），再上模块（C 阶段 7 卡）」 | **A 阶段只完成 1/5**（PD7-01 DONE，PD7-02~05 TODO）；B 阶段 2 卡 BLOCKED 但**阻塞理由被高估**（`02 §3`）；C 阶段 0 开工 |
| **v012（本版）** | **「数据已够，缺的是消费端」**：先把 `TableName` 与模块接线打通，再按依赖簇实现 | 待验证 |

## 2. 本版的三个核心判断（每个都附反证与成立前提）

### 判断 1：真正的瓶颈是「消费端」，不是「数据」

**支持**：31/46 表零消费方（`02 §4` 逐表审计）；`TableName` 仅 11 张而 `XxxRow` 有 46 个；
13 个模块的 core 合计 **21 行**（7×3 行）。

**反对（我自己构造的最强反驳）**：也许这些表本就"为 v1.2 预留"，零消费方是正常的。
→ **反证成立一半**：`client/assets/resources/config/` 已把 46 张全导出，说明生成链认为它们"要发到客户端"；
若真是预留，`tools/gen/config.mjs` 不会为它们产出 json。所以"零消费方"是实现欠账，不是设计冗余。
→ **但**：`explore`/`limits`/`phrases` 三张连设计源都没有条目，它们确实是"预留"，见判断 2。

**成立前提**：`module-catalog.json` 的 `phase: v1` 标记仍有效（23 个 v1 模块）。若用户把 13 个模块再往后推，判断 1 的主线要改成"只做接线不做模块"。

### 判断 2：PD7-08/PD7-09 的 BLOCKED **被高估了**

| 空表 | 代码消费方（非 generated） | 真实影响 | 我的判定 |
|---|---|---|---|
| `explore` | **0** | 探索玩法无源 | 不阻塞任何模块；探索降级为"无探索点"或走 v1.1 |
| `limits` | **0** | 商人限购已由 `merchants.daily_limit` 表达（D-01） | 不阻塞 |
| `phrases` | **0** | 聊天文案无语料 | 不阻塞聊天**功能**，只缺文案；可用运营下发 |
| `waves` | **0** | 塔防波次无数值 | **不阻塞**：`mvp-scope.md:52` 已授权"第 3 周末不稳就临时改成文字结算"，文字结算不需要波次表 |
| `drops` | 2（均为注释） | `HookModel.ts:21` 把掉落写死成 `item_0001` | **真缺口**：打捞永远只出漂流木 |
| `regions` | 6（有真实读+写） | `account/repo.ts:54` 读、`ops/repo.ts:22-25` 写 | 已有 D-53 回落，可空 |

**结论**：6 张空表里，**4 张零消费方（不阻塞）、1 张有回落（可空）、1 张是真缺口（drops）**。
PD7-08 的 `BLOCKED` 理由（"waves 无源"）在代码层面不成立——塔防按文字结算降级后不需要波次数值。
→ 登记为 **D-58（PROPOSED）**，见 `10 §1`。

### 判断 3：D-50 与 `mvp-scope.md §5` 直接冲突，必须显式裁一次

| 依据 | 主张 | 时间 | 权威 |
|---|---|---|---|
| `mvp-scope.md §5`（PRD-0004，**status: active**） | v1.0 **必须含**：塔防、3 兵种、岛屿、7 员工岗位、等级 49、每日一海、称号、总收益榜+省份榜、激励视频 | 2026-10-23「已定·Hark代定」 | 产品需求文档 |
| `D-50`（`decision-index.json`，**DECIDED**） | 13 个模块（progression/crew/power/ads/leaderboard/event/island/defense/social/fishing/salvage/compliance/telemetry）**延期到 v1.1** | 2026-10-28 用户拍板 | 决策登记册 |

**两者都是"已定"，且互相覆盖。** 后果：**"v1.0 完成"有两个互不兼容的判据**——
按 `mvp-scope §5` 算，v1.0 完成度约 35%（见 `03 §2`）；按 `D-50` 算，v1.0 只欠 raft/sea 的 UI。
我倾向以 D-50 为准（更晚、用户亲自拍板），**但这必须由用户显式确认一次，否则"v1.0 是否完成"永远无法判定**
→ 登记为 **D-59（PROPOSED）**，见 `10 §1`。

## 3. 四阶段总览

| 阶段 | 目录 | 卡 | 目标 | 出口判据 |
|---|---|---|---|---|
| **0 治理与推送** | `stage-0-governance/` | PD8-01 | `pd.mjs health` 从 5 错误回到 0；19 个未推提交推上去 | health 0 错误 + `origin/master == HEAD` |
| **A v1.0 收口** | `stage-a-v10-close/` | PD8-02~05 | 五环的「扩」变成可演示行为（D-54 Q1=B 的兑现） | 主界面 7 Tab + 建一格三个数字同时变 + 拒绝态不误报 + 潮汐可见 |
| **B 数据接线层** | `stage-b-wiring/` | PD8-06~07 | 客户端能读全部 46 表；消除 `HOOK_DEMO_ITEM_ID` 硬编码 | `TableName` 覆盖 46 张；打捞产出走 `drops` 或显式 D-27 降级 |
| **C 模块实现** | `stage-c-modules/` | PD8-08~16 | 13 模块从"空壳"变成"有行为"（按 D-50 属 v1.1） | 每模块 core 有纯函数 + client 有面板 + 有测试 |
| **D 运营与合规** | `stage-d-ops/` | PD8-17 | 合规去桩 | **BLOCKED-HUMAN**（等 appid/资质，D-51） |

**阶段之间不是"必须串行"**：阶段 0 与 A 可并行（文件不相交）；B 的 PD8-06 与 A 的 PD8-02 可并行
（一个改 `client/assets/scripts/services/config/tables.ts`，一个改 `packages/game-core/src/raft/**`）。
精确并行依据见 `07 §2`。

## 4. 与 plan-v011 的关系（不是推翻，是接续 + 三处订正）

| # | v011 的说法 | v012 的订正 | 证据 |
|---|---|---|---|
| **V12-C1** | 「B 阶段（数据）是 C 阶段（模块）的前置」 | B 阶段**已完成 40/46**，实际前置变成 **`TableName` 接线**（新 B 阶段） | `02 §4` 零消费方审计 |
| **V12-C2** | PD7-08/09 `BLOCKED` 是因为"设计源无值" | 6 张空表里 4 张零消费方 → 不阻塞；`waves` 降级方向已授权，**但"文字结算"本身仍要吃数值**（`units`/`defenses` 的 hp/attack/damage 全缺）→ 收敛为 **A′**（不可算的返 `unknown`） | `02 §11` + `10 §1 D-58` |
| **V12-C3** | 「v1.0 五环」口径不变 | 口径本身有冲突（D-50 vs `mvp-scope §5`），必须显式裁 | `10 §1 D-59` |

**v011 的 17 张卡全部保留历史**：PD7-01/06/07 DONE（不重开），PD7-08/09 BLOCKED（在本版被重新界定），
PD7-02~05 与 PD7-10~16 由本版 PD8-02~05 / PD8-08~16 **接替并重写卡面**（不复制，改为 `superseded_by` 指向新卡）。

## 5. 文件导航

| 文件 | 什么时候读 |
|---|---|
| [`01-snapshot.md`](01-snapshot.md) | 确认本规划钉在哪个 commit |
| [`02-fact-baseline.md`](02-fact-baseline.md) | **最重要**。31/46 零消费方审计 + **§10 调用点缺口** + **§11 11 张 draft 表** + I-01~I-14 |
| [`03-requirement-baseline.md`](03-requirement-baseline.md) | 需求分级与冲突 |
| [`04-contract-freeze.md`](04-contract-freeze.md) | 契约完整性自检 |
| [`05-data-model-baseline.md`](05-data-model-baseline.md) | 14 张 PG 表 + 迁移编排 |
| [`06-slices.md`](06-slices.md) | 16 个垂直切片 |
| [`07-dag-ownership.md`](07-dag-ownership.md) | 依赖 DAG + 所有权矩阵（含重叠消除） |
| [`08-budget.md`](08-budget.md) | 18 卡档位与成本 |
| [`09-baseline-metrics.md`](09-baseline-metrics.md) | 指标资格判定与首次测量 |
| [`10-risks-pending.md`](10-risks-pending.md) | **D-57/58/59/60 待裁 + 风险 + 未决** |
| [`11-selfcheck.md`](11-selfcheck.md) | 落盘清单 + 自检 + 局限 + 第一刀 |
| `stage-*/00-stage.md` | 卡面（以 `# PD8-xx` 为锚） |

## 6. 实施进度（唯一进度权威）

> 任何人不得在本表之外宣称"某阶段已完成"。

| 阶段 | 卡片 | 状态 | 备注 |
|---|---|---|---|
| 0 治理 | PD8-01 + **PD8-18** | TODO | health 5 错误见 `02 §6`；PD8-18 修 `items-w` 2 条恒红（`01 §4`） |
| A v1.0 收口 | PD8-02~05 | TODO | PD8-02 步骤 2 等 D-57 |
| B 接线 | PD8-06~07 | TODO | PD8-06 是**10 张 C 阶段卡的前置** |
| C 模块 | PD8-08~16 | TODO | 按 D-50 属 v1.1；开工顺序见 `07 §3` |
| D 运营 | PD8-17 | TODO（外部阻塞） | 沿用 D-51 |

## 7. 与本版无关但必须说的一句

`docs/06_validation/evidence/` 已有 51 个 EVD 目录，`tests/` 已有 39 文件（静态 263 用例 / **实跑 270**），
`AGENTS.md:37` 要求 `npm run verify` 通过——**本规划不跑全量回归**（用户明令），
所有卡的验收都用**定向命令**，全量只在阶段出口跑一次。这一条写进每张卡的"验证命令"字段。

**但要诚实说明**：本轮为了把基线钉准，**跑了一次全量 `--test`**（不是 `verify`，不含 `gen`/`guard`/`typecheck`），
结果是 **267 pass / 3 fail**。这 3 条红在 PD8-18 与 PD8-01 完成前会一直在，
所以"阶段出口 `verify` EXIT=0"这句话**目前是欠账，不是现状**。
