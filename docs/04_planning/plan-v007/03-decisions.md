---
id: PLAN-V007-03
title: 裁决表（D-34 ~ D-41）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V007-02]
---

# 03 · 裁决表

> 8 项，全部带推荐值。回复"**全按推荐**"即可整批解冻，W0 立刻可开工。
> 已裁决的 D-19~D-33 不再重列（结论已生效：D-19 item_id / D-27 item_0020 / D-30 rid / D-31 chest.open / D-32 locks.csv 权威）。

## 1. 裁决项

### D-34 · 三套规划并存，以谁为准

| 项 | 内容 |
|---|---|
| 现状 | `plan-v004`（8 卡，部分废止）、`plan-v005`（14 份，严谨但步骤已过期）、`plan-v006`（7 份 / 192 行，薄且漏判据） **三者并存**，`current-plan.md` 还指向 v004 |
| 证据 | `01` §1；`04_planning/` 下 v004~v007 四目录 |
| 选项 | A. **v007 为唯一现行，v004/v005/v006 全部标归档只读**（保留文件，加首行标记）<br>B. 以 v005 为基，把 v006/v007 内容并回 v005（要在已完成的 step1~3 上打补丁，步骤编号全乱）<br>C. 以 v006 为基（薄，需补回 4 项判据 + 全部验收断言） |
| **推荐** | **A** |
| 理由 | v005 的**事实与缺陷体系**有价值（编号 F-01~F-18 已并入 v007），但其**步骤编号**对应的是"4015/4008 未完成"的起点，现已前移 40%，强行打补丁会产生"Step1 已完成的 Step1"这类自相矛盾；v006 只有 192 行、无验收断言，不足以支撑执行。 |
| 影响 | v005/v006 的 `00-*` 首行加归档标记；`current-plan`/`roadmap` 指向 v007 |
| 不裁决后果 | 任何人开工前都要先判断"读哪个"，且三个答案互斥 |

### D-35 · 4008 的按钮 UI 是否抽成 `panel-ui` 工厂

| 项 | 内容 |
|---|---|
| 问题 | `InventoryPanel.ts:100-119` 手工建按钮 30 行；`panel-ui.ts` 无 `addButton` |
| 证据 | `02` F-20 |
| 选项 | A. **抽 `addButton`，4008 改用，4009 复用**（`addRow` 暂不做）<br>B. 不抽，4009 再写一遍（两份实现）<br>C. 抽 `addButton` + `addRow`（行容器重构，改动大） |
| **推荐** | **A** |
| 理由 | D-35 只需解决"第二个使用者"；`addRow` 的行容器重构会改动 4008 已验证的渲染路径（`MAX_ROWS` 截断、坐标布局），收益低风险高。待 4009 的 UI 确需时再单独提 C。 |
| 影响 | `app/panel-ui.ts`（只增）、`InventoryPanel.ts`（替换建按钮段） |
| 守据 | 4008 的既有行为不变：`npm test` 128 全绿 + 类型检查零错 |

### D-36 · 背包回收时 `merchantId` 取哪个商人

| 项 | 内容 |
|---|---|
| 问题 | 4008 未传 `merchantId` → 服务端兜底 `merchant_village`（`regionBp=10000`）；玩家在商人页选黑市（13000）时，**从背包回收只拿渔村价，低 23%** |
| 证据 | `02` F-21；`economy/service.ts` `MERCHANTS` 表 |
| 选项 | A. 记"上次所选商人"进存档（`modules.*.lastMerchant`）<br>**B′. 固定 `merchant_village` + 显式传参 + UI 文案明示"渔村价，商人页可选更高价"**<br>C. 背包弹窗里让玩家选商人（交互变重，与"快速回收"定位冲突） |
| **推荐** | **B′** |
| 理由 | ① `lastMerchant` 是 **UI 偏好**而非游戏进度，塞进存档要付"schema 版本 + 迁移 + 回归测试"三重代价，v1.0 收口期风险高于收益；② B′ 零存档变更、**不欺骗玩家**（文案明说这是渔村价）；③ 把"按所选商人定价"登记为 v1.1 优化（`10` §5）。<br>**关键点：显式传 `merchantId: 'merchant_village'`，不依赖服务端兜底** —— 客户端意图明确、日志可查、将来改默认值不会静默变价。 |
| 影响 | `InventoryPanel.ts`（1 行 payload + 1 处文案）、`current-plan.md` 增已知局限 **L8** |
| 不裁决后果 | 要么玩家困惑"为什么背包卖得比商人少"，要么为一个小体验改存档结构 |

### D-37 · `game-core/chest` 的 `attempt` 是否增 `required` 入参

| 项 | 内容 |
|---|---|
| 问题 | 新 TASK-4009 卡的允许修改清单**没有** `packages/game-core/src/chest/**`，但 F-16（`LOCK_HITS` 1/2/3/4 vs `locks.csv` 3/5/8/12 冲突）必须在那里解决 |
| 证据 | `01` §5；新 TASK-4009 卡"允许修改"段 |
| 选项 | A. **`attempt(session, hit, required)` + `createSession(tier, tools, required)`，`LOCK_HITS` 降级为 `LOCK_HITS_FALLBACK`（值改为 3/5/8/12）**，加"CSV ↔ 常量"一致性单测<br>B. 改 `locks.csv` 去迁就 `LOCK_HITS`（推翻用户已裁决的 D-08）<br>C. 客户端按 `LOCK_HITS` 判、服务端按 `locks.csv` 判（**双源永久不一致**） |
| **推荐** | **A** |
| 理由 | 配置驱动 > 硬编码；`game-core` 不能读表，配置必须由调用方传入——这本来就是"纯函数 + 入参"的正确形状。C 会导致铁锁永不打开。 |
| 影响 | `game-core/chest/index.ts`、`tests/determinism/chest.test.mjs`、`SalvageView`（传参来源） |
| 卡修订 | TASK-4009 的"允许修改"需增 `packages/game-core/src/chest/**` |

### D-38 · `screen-salvage.md` 由谁产出

| 项 | 内容 |
|---|---|
| 问题 | 新 TASK-4009 卡"输入"写 `docs/03_solution/ui/screen-salvage.md (需先补充)`，但**没有把"补文档"列入 Execution Steps，允许修改里也没有该路径** |
| 证据 | `02` F-10；`ls docs/03_solution/ui/` 只有 `screen-inventory.md` / `style-guide.md` / `cocos-editor-glossary.md` |
| 选项 | A. **作为 4009 的第 1 个原子步骤产出**（允许新增该文件），按 `screen-inventory.md` 体例，含 7 态<br>B. 另立 `TASK-4021` 专写文档，4009 依赖它<br>C. 不写文档直接实现（事后补） |
| **推荐** | **A** |
| 理由 | 开箱会引入 `lock-playing` / `lock-failed` 两个**面板内部态**，它们不在 `toUxState` 六态里。没有文档约束，实现者必然手写 `if` 分支（违反"态只走 `toUxState`"）。B 多一次往返；C 是纪律倒退。 |
| 卡修订 | TASK-4009 的 Execution Steps 第 1 步 = 写文档；允许修改增 `docs/03_solution/ui/screen-salvage.md` |

### D-39 · 开箱可达性（F-17）在 v1.0 是否处理

| 项 | 内容 |
|---|---|
| 问题 | 开箱路径**四环全断**：打捞只掉漂流木、`drops` 空、三箱 `lock=none`、`chests.id≠items.id`。机制做完也**碰不到** |
| 证据 | `02` F-17；`HookModel.ts:20`、`drops.csv` 0 行、`chests.csv` 全 `none` |
| 选项 | A. **机制做（4009），可达性转 v1.1 `TASK-4022`（需 `drops` 设计源）；真机断言记 UNKNOWN**<br>B. v1.0 就补三处数值让它可见（`drops` 3 行 + `chest_copper.lock=copper`）——**属玩法变更，需授权**<br>C. 4009 整体移 v1.1 |
| **推荐** | **A** |
| 理由 | 契约与规则债（`chest.open`、开锁单源）**必须现在还**，否则 v1.1 要重开契约窗口；表现层做最小可见；数值债不动（R-2）。<br>**注意 plan-v006 完全没记录这条**，若按 v006 执行，会误以为 4009 完成即可真机演示。 |
| 影响 | `09` 的 EVD 判定、`current-plan` 已知局限（L1/L2） |
| 若选 B | 必须在同一提交内改 `game-data/source/drops.csv` 与 `chests.csv`，并**改变全部玩家的打捞手感**，属玩法决策 |

### D-40 · EVD 补录范围

| 项 | 内容 |
|---|---|
| 问题 | `evidence/` 下 4000 系列**只有 `EVD-4002`**；4007/4008/4015 三张已完成卡均无证据 |
| 证据 | `01` §2 ③ 列 |
| 选项 | A. **补 4007/4008/4015 三份**（每份 5 要素：命令/输出/时间/commit/判定）<br>B. 只补 4007/4008（4015 的证据可由 `f3fa3e0` 的 diff + 128 测试输出替代）<br>C. 都不补，等真机一起补 |
| **推荐** | **A** |
| 理由 | 阈值很低（每份 1 页），但它是 v1.0 出口条件的一部分（"无假数据"要求可追溯）。C 会让 v1.0 永远缺 3 张卡的证据。 |
| 影响 | `docs/06_validation/evidence/EVD-4007|4008|4015/` |

### D-41 · 4010/4011 无真机如何判定

| 项 | 内容 |
|---|---|
| 问题 | 用户 10-23 已定"先本地开发不用真机"，真机大概率没有 |
| 证据 | `plan-v002` 决策记录；当前无设备 |
| 选项 | A. **UNKNOWN + 三件套**（采样脚本可 `--dry-run`、模拟基线标 `SIMULATED`、真机手册 8 步）<br>B. 直接标 UNKNOWN 不做事<br>C. 用模拟结果冒充实测 |
| **推荐** | **A** |
| 理由 | B 会让"UNKNOWN"与"未实现"混为一谈（返工成本差一个量级）；C 是伪造。A 的成本约 1 小时，产出是"有真机就能 30 分钟补完"的机械路径。 |
| 硬约束 | `hitrate.md` 首行必须写数据来源；`SIMULATED` **不得**用于满足 v1.0 出口条件"首钩 ≥45%" |

## 2. 汇总表（供一次性勾选）

| 裁决 | 主题 | 推荐 | 影响波次 |
|---|---|---|---|
| D-34 | 规划收敛 | **A：v007 唯一现行，v004~v006 归档** | W0 前置 |
| D-35 | 按钮抽工厂 | **A：只抽 `addButton`** | W0 |
| D-36 | 回收商人口径 | **B′：固定渔村 + 显式传参 + 文案明示（登记 L8）** | W0 |
| D-37 | 开锁单源 | **A：`attempt` 增 `required`，`LOCK_HITS` 降级** | W1 |
| D-38 | 开箱文档 | **A：4009 第 1 步产出 `screen-salvage.md`** | W1 |
| D-39 | 可达性 | **A：机制做 + 转 v1.1 `TASK-4022` + 真机 UNKNOWN** | W1 |
| D-40 | EVD 补录 | **A：补 4007/4008/4015 三份** | W2 |
| D-41 | 真机降级 | **A：UNKNOWN + 三件套** | W3 |

## 3. 卡修订清单（裁决后必须同步改卡）

| 卡 | 需改 |
|---|---|
| `TASK-4020` | 步骤 2 的"注入 payload"→"写入 `meta.rid`"；补"递归重试复用同一 rid"；补源码级断言（`F-19`） |
| `TASK-4009` | 允许修改增 `packages/game-core/src/chest/**`（D-37）与 `docs/03_solution/ui/screen-salvage.md`（D-38）；Execution Steps 第 1 步插入"写文档"；备注 D-39 可达性归属 |
| `TASK-4008` | 补 `merchantId`（D-36）与 `count<=0` 守卫（F-22） |
