---
id: PLAN-V007-10
title: 步骤 5 · W4 v1.0 宣告（四文档对齐 + v1.1 种子 + 自检清单）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V007-08, PLAN-V007-09]
---

# 10 · 步骤 5：W4 v1.0 宣告

> **一句话**：代码收口靠闸门，**项目收口靠文档**。本步把四份权威文档拉到与代码一致，并产出**已知局限清单**——它是交付的一部分，不是免责声明。
> 本文件 §6 内含全局自检与反作弊清单，是整套规划的验收出口。

## 1. 前置与边界

| 项 | 内容 |
|---|---|
| 前置 | W2 完成（文档 4 处残留已清）、W3 完成（清单已实体化） |
| 允许修改 | `docs/03_solution/data/error-catalog.md`、`docs/00_governance/glossary.md`、`docs/04_planning/{current-plan,roadmap}.md`、`game-data/UNKNOWN-TABLES.md` |
| 禁止修改 | 任何代码；不再改 `DESIGN-0001`/`ADR-0011`（W2 已定稿） |
| 出口 | V-4.1 ~ V-4.6 全绿 |
| 规模 | S |

## 2. 原子步骤

### 2.1 `error-catalog.md` 最终核对

W1 已加 `chest.open` 的错误路径（`1001` 开箱校验失败），本步只做**一致性核对**：

| 检查 | 判据 |
|---|---|
| 15 码与 `errors.ts` 一一对应 | `grep -c "^\| [0-9]\{4\} " error-catalog.md` = 15 |
| `chest.open` 的失败路径已登记 | `grep -c "chest.open" error-catalog.md` ≥1 |
| 无"建议新增"残留 | `grep -c "建议新增"` = 0（W2 已清，此处复验） |

### 2.2 `glossary.md` 补 6 术语

| 术语 | 定义 | 首次出现 |
|---|---|---|
| **影子账本**（`ledger_entry`） | 服务端只追加的资产流水；与客户端存档比对，容差 0，不一致返回 1001 | ADR-0012 |
| **幂等 rid** | 写动作的请求号，写在 `meta.rid`；同一 `(playerId, rid)` 24h 内重放返回首次结果（只缓存成功） | TASK-4020 |
| **可达性** | 一条功能路径能否被真实玩家在现有数值下触发；**不可达 ≠ 未实现** | `02` F-17 |
| **EVD 五要素** | 命令/输出/时间/commit/判定；缺一即无效证据 | `08` §2.5 |
| **MEASURED / SIMULATED** | 真机实测 / 模型推算；后者不得用于满足出口条件 | `09` §2.2 |
| **UNKNOWN** | 因环境缺失未验证；必须写明"缺什么、何时补"，不得记 PASS | G-07 |

### 2.3 `current-plan.md` 收官段 + 已知局限（**本步最重要的产出**）

#### 2.3.1 收官段

W2 已插入 plan-v007 段，本步把它升级为"v1.0 收官"：

```markdown
## 现在处于哪一步（2026-10-27 · v1.0 收官）

- **规划**：`docs/04_planning/plan-v007/`（唯一现行；v004~v006 已归档）。
- **交付**：打捞 → 背包（回收/开箱）→ 合成 → 榜单 → 商人 → 云存档，闭环可演示。
- **闸门**：`npm run guard` 9/9；`npm test` ≥132。
- **服务端**：13/22 动作已实现（新增 `chest.open`）；9 个 `todo` 见 §5 v1.1 种子。
- **数值**：11 张有数 / 35 张空（46 总）。
- **已知局限**：见下节，**必须随交付一并说明**。
```

#### 2.3.2 已知局限（**8 条**）

```markdown
## v1.0 已知局限（交付时必须一并说明）

| # | 局限 | 影响 | 原因 | 何时解决 |
|---|---|---|---|---|
| L1 | 打捞掉落固定为漂流木 | 玩家捞不到其它物品与箱子 | `drops.csv` 空（无设计源）；`HookModel.ts:20` 硬编码兜底 | v1.1 TASK-4022 |
| L2 | 开箱路径真机不可达 | 开箱机制与测试已完成，但触发条件不成立 | 箱子进不了背包（L1）+ 三箱 `lock=none` | v1.1 TASK-4022 |
| L3 | 无真机证据 | 五面板/六态/冷启动均为 UNKNOWN | 用户 10-23 定"先本地开发不用真机" | 有设备时按 device-lab-manual |
| L4 | 命中率只有 SIMULATED | 出口条件"首钩 ≥45%"未用实测满足 | 同 L3 | 同 L3 |
| L5 | 35 张数值表为空 | 赶海/钓鱼/员工/岛屿/等级等整片不可用 | 无设计源，禁自编 | v1.1 逐表转录 |
| L6 | 9 个服务端动作仍 todo | 相关玩法不可联网 | 依赖空表或 v1.1 玩法 | v1.1 |
| L7 | `chest.open` 的 `hitsUsed` 可被客户端伪造 | 理论上可刷开箱保底物 | 收益上限受"持有箱子数"约束（箱子不可制造）；已在 ADR-0013 登记 | v1.1 TASK-4030（seed + pointer 服务端复算） |
| L8 | 背包回收固定渔村价（`regionBp=10000`） | 黑市回收高 30%，背包卖会少拿 | UI 偏好不入存档，避免 schema 迁移（D-36） | v1.1 按所选商人定价 |
```

**这张表是本步的核心**：把"没做到"写清楚，比把"做到了"写十遍更有价值。

### 2.4 `roadmap.md` 出口条件"诚实化"

#### 2.4.1 改 v1.0 行

```markdown
-| **v1.0 冲刺（现在，plan-v003）** | ... | **plan-v003** |
+| **v1.0 冲刺（✅ 已完成 2026-10-27，plan-v007 收口）** | 数值清欠 → 商人回收 → 开箱机制 → 契约解冻（2004/chest.open）→ 测试矩阵 → 合规与包体 | **plan-v007** |
```

#### 2.4.2 改出口条件行（**态度条款**）

```markdown
| v1.0 | `npm run verify` 全绿（9 守卫 + ≥132 测试）+ 主包 ≤4MB（实测 2.913MB）✅ + 软著/备案材料就绪；**真机 6 态与命中率为 UNKNOWN（见 current-plan L3/L4）**，不以 UNKNOWN 冒充通过 |
```

> **这条改动的含义**：不是降低判据，而是**降低虚假承诺**。原文写"真机 6 态通过"，实际永远无法满足；改成"UNKNOWN 不算通过"，让文档第一次说了实话。

### 2.5 索引重生成

```bash
npm run gen:docs
grep -c "TASK-40" docs/05_execution/task-index.md    # ≥13
npm run guard
```

### 2.6 `UNKNOWN-TABLES.md` 回写分级

在现有登记册中：

| 动作 | 内容 |
|---|---|
| 追加 | 每张空表补"分级（P0~P5）"与"解锁什么"（见 §3.1） |
| 修正 | 已填的 11 张从"待填"移入"已转录" |
| 标注 | `drops`/`spawns` 标 **P0 阻塞**（需用户提供设计源） |

## 3. v1.1 种子（只登记，不实现）

### 3.1 空表 35 张分级

| 级 | 定义 | 表 | 张 |
|---|---|---|---|
| **P0** | 解锁 v1.0 局限 L1/L2 | `drops` `spawns` | 2 |
| **P1** | 解锁已实现但空转的动作 | `limits` | 1 |
| **P2** | 解锁 v1.1 已定玩法 | `events` `event_drops` `phrases` `shipwrecks` `explore` `tides` `waves` `seasons` | 8 |
| **P3** | 成长与建造 | `levels` `unlocks` `jobs` `titles` `blueprints` `raft_tiles` `rooms` `generators` `defenses` | 9 |
| **P4** | 细粒度手感 | `bait` `fish` `foods` `quality` `throwables` `oil` `protection_cards` `lockpick_tools` | 8 |
| **P5** | 世界与边界 | `islands` `regions` `zones` `lines` `consumers` `crew_traits` | 6 |
| — | 合计 | | **34**（另 1 张核对） |

**结论**：v1.0 的两个最大局限卡在**没有设计源**，不是卡在工时。`drops` 不填，任何"让开箱可见"的工程努力都无效。

### 3.2 服务端 9 个 `todo` 的真实依赖

| 动作 | 依赖 | 数值就绪？ | 判定 |
|---|---|---|---|
| `economy.buyQuota` | `merchants`(3) + `prices`(106) | **是** | **可提前**（v1.1-W1） |
| `ads.claim` | `ad_placements`(3) | **是** | **可提前**（v1.1-W2） |
| `salvage.claimInfo` | `shipwrecks`(0) `explore`(0) | 否 | v1.1-W4 |
| `event.start/submit/result` | `events`(0) + ADR 缺口 3（`event_session` 无 ops 字段） | 否 + 表结构缺口 | v1.1-W5 |
| `social.send/pull` | `phrases`(0) | 否 | v1.1-W6 |
| ~~`chest.open`~~ | 已就绪 | 是 | **v1.0 已实现** |

> 旧结论"8 个 todo 全依赖空表"**部分是错的**：`buyQuota`/`ads.claim` 数值早已就绪。

### 3.3 v1.1 波次建议

| 波次 | 主题 | 新卡 | 规模 |
|---|---|---|---|
| W0 | 可达性解禁（L1/L2） | `TASK-4022` 填 `drops`/`spawns` + 箱子配锁 | M |
| W1 | 商人买入闭环 | `TASK-4023` `economy.buyQuota` + 商人页买入 tab | M |
| W2 | 广告位闭环 | `TASK-4024` `ads.claim` + 3 处广告位 | M |
| W3 | 成长线 | `TASK-4025` `levels`/`unlocks` + 经验结算 | L |
| W4 | 沉船与潜水 | `TASK-4026` `shipwrecks`/`explore` + `salvage.claimInfo` | L |
| W5 | 赶海整片 | `TASK-4027` ADR-0014（ops 载体）→ `event.*` | XL |
| W6 | 社交 | `TASK-4028` `phrases` + `social.*` | M |
| W7 | 建造与防御 | `TASK-4029` `raft_tiles`/`rooms`/`generators`/`defenses` | XL |
| W8 | 权威连点（治 L7） | `TASK-4030` `chest.begin` 下发 seed + 服务端复算 | L |

**排序理由**：W0 性价比最高（只填数 + 配值，解锁 v1.0 两大局限）；W1/W2 是已实现能力的补完；W3 是所有后续的前置；W5 依赖 W4（赶海复用潜水装备）；W8 只在 W0 让开箱可达后才值得做。

## 4. 验收断言

| # | 判据 | 命令 | 期望 |
|---|---|---|---|
| V-4.1 | 索引收录全部 40xx | `grep -c "TASK-40" docs/05_execution/task-index.md` | ≥13 |
| V-4.2 | 已知局限 8 条 | `grep -c "^\| L[0-9]" docs/04_planning/current-plan.md` | **8** |
| V-4.3 | `roadmap` 指向 v007 且出口诚实 | `grep -c "plan-v007" docs/04_planning/roadmap.md`；`grep -c "UNKNOWN" roadmap.md` | ≥1；≥1 |
| V-4.4 | `glossary` 补 6 术语 | `grep -cE "影子账本\|幂等 rid\|可达性\|EVD 五要素\|MEASURED\|UNKNOWN" docs/00_governance/glossary.md` | ≥6 |
| V-4.5 | 空表分级落盘 | `grep -cE "^\| \*\*P[0-5]\*\*" game-data/UNKNOWN-TABLES.md` | ≥6 |
| V-4.6 | `npm run verify` 全绿 | `npm run verify` | `EXIT=0` |

## 5. 提交边界（一次）

```text
docs(4016): v1.0 收官——current-plan 收官段+8 条已知局限 / roadmap 出口诚实化 / glossary 补 6 术语 / UNKNOWN-TABLES 分级 / 索引重生成
```

## 6. 全局自检与反作弊（交付前逐条跑）

### 6.1 五步总表

| 步 | 主题 | 出口闸门 | 状态 |
|---|---|---|---|
| 1 | W0 rid + 4008 收尾 | V-0.1~V-0.7 | ☐ |
| 2 | W1 开箱全栈 | V-1.1~V-1.10 | ☐ |
| 3 | W2 文档收口 | V-2.1~V-2.7 | ☐ |
| 4 | W3 真机+合规 | V-3.1~V-3.6 | ☐ |
| 5 | W4 v1.0 宣告 | V-4.1~V-4.6 | ☐ |

**只允许 `☑`（全绿）或 `☐`**。`☑（部分）` = 未通过。

### 6.2 v1.0 出口判据

| # | 判据 | 可满足性 |
|---|---|---|
| E-1 | `npm run verify` 全绿（9 守卫 + ≥132 测试） | ✅ W2 后 |
| E-2 | 主包 ≤4MB（实测 2.913MB） | ✅ 已满足 |
| E-3 | 闭环可演示（打捞→背包→合成→榜单→商人→云存档，含回收/开箱） | ✅ W1 后 |
| E-4 | 无假数据（缺数字段不显示） | ✅ 已满足 |
| E-5 | 软著/备案材料就绪 | ✅ W3 后 |
| E-6 | 真机 6 态 | ❌ **UNKNOWN**（无设备） |
| E-7 | 首钩命中率 ≥45%（MEASURED） | ❌ **UNKNOWN**（仅 SIMULATED） |

**结论**：E-1~E-5 满足 → 可宣布"功能收官"；E-6/E-7 的 UNKNOWN 必须随交付说明（L3/L4）。**不得**把 UNKNOWN 说成通过。

### 6.3 反作弊清单（12 条）

| # | 作弊形态 | 检测命令 |
|---|---|---|
| 1 | 假绿·过滤式错误 | `grep -rn "grep.*client/assets" docs/ tools/` → 0；统一用 `check:types` |
| 2 | 假绿·改测试而非改实现 | `git diff <commit> -- tests/` 与源码 diff 对照；只有 tests 变 = 可疑 |
| 3 | 伪造真机 | `grep -riE "实测\|真机" docs/06_validation/evidence/` 后逐条核对有无录屏 |
| 4 | SIMULATED 冒充 MEASURED | `grep -c "MEASURED" EVD-4011/hitrate.md` = 0 |
| 5 | 空 EVD | `grep -L "## ⑤" docs/06_validation/evidence/*/README.md` → 空 |
| 6 | UNKNOWN 写成 PASS | EVD 中的 UNKNOWN 条数与 `current-plan` L3/L4 交叉核对 |
| 7 | 数值写死 | `grep -rnE "\b(10000\|8500\|13000)\b" client/.../features/` → 0 |
| 8 | 手改 generated | `npm run guard` 第 7 项 |
| 9 | 跨所有权修改 | 按 `04` §3 矩阵核对 commit 的 `--name-only` |
| 10 | 契约加码不加映射 | `grep -rn "as any" packages/contracts/` → 0 |
| 11 | 卡片划勾无提交 | `git log --grep="<卡号>"` 必须有提交 |
| 12 | 改代码没改文档 | `npm run gen:docs` 后 `git status` 无变化才算索引同步；`current-plan` 数字与 `npm test` 计数一致 |

### 6.4 元规则

> **任何"通过"的结论，必须能被一个不看解释的人用命令复现。**
> 不能复现的通过 = 未验证（不是"已验证但没写命令"）。

### 6.5 本规划的可证伪点

| # | 判断 | 可能怎么错 | 推翻方法 |
|---|---|---|---|
| 1 | 打捞只掉漂流木（L1/L2 根因） | 若 `HookView` 另有读 `drops` 的路径 | `grep -rn "drops\|item_00" client/.../features/hook/` 全量核对 |
| 2 | `LOCK_HITS` 与 `locks.csv` 语义相同（都是"连中次数"） | 若 1/2/3/4 实为"期望尝试次数" | 读 `chest.test.mjs` 全部断言 |
| 3 | 保底应为 `item_0020` | 若 `prices.csv` 变动 | 落地前重跑筛选式；判据与值分离 |
| 4 | 4008 的回收走 `economy.sell` 且已闭环 | 若 `applySell` 落账与 `wallet.gold` 不符 | 读 `EconomyModel.applySell` + 跑 merchant 测试 |
| 5 | W1 与 W2 必须串行（共享 `error-catalog`） | 若 W1 不改错误路径 | 除非确认零改动，否则维持串行（保守优先） |
| 6 | ≥132 测试是合理下限 | 若 W1 交叉断言发现更多缺陷 | 132 是下限不是上限，超出不算偏差 |

**使用方式**：发现某条错了，**不需要推翻整份规划**——只修正对应条款，并在本表追加"已证伪 + 修正指向"。规划的健壮性来自"错得起"。
