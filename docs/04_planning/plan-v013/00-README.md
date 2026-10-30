---
id: PLAN-V013-00
title: plan-v013 · 从「消费端接线」转向「治理产物一致性」——第五代规划总纲
status: active
module: planning
owner: hark
created: 2026-10-30
review: 2026-11-13
related: [PLAN-V012-00, PLAN-V011-00, PLAN-V013-01, PLAN-V013-03]
---

# plan-v013 · 总纲

## 0. 这一版为什么存在（一句话 + 一条硬证据）

**plan-v012 的正文写着「PD7-02~05 与 PD7-10~16 由 PD8 接替」，但权威索引里这 11 张仍是 `TODO`、`superseded_by` 为空。**

```bash
node -e "const a=require('./.product-development/task-index.json').tasks;
for(const id of ['PD7-02','PD7-03','PD7-04','PD7-05','PD7-10','PD7-11','PD7-12','PD7-13','PD7-14','PD7-15','PD7-16']){
  const t=a.find(x=>x.id===id); console.log(id, t.status, (t.superseded_by)||'（无）');}"
# 输出：11 行全部 `TODO （无）`
```

对照 `docs/04_planning/plan-v012/00-README.md:106`：

> PD7-02~05 与 PD7-10~16 由本版 PD8-02~05 / PD8-08~16 **接替并重写卡面**（不复制，改为 `superseded_by` 指向新卡）。

**规划说了 → 索引没做 → 派工器看到的仍是 11 张可领的卡。**
一个按 `next` 取卡的执行者会去做 `PD7-02`，另一个会去做 `PD8-02`，两者
`allowed_paths` 都是 `packages/game-core/src/raft/**` + `packages/game-core/src/save/**`
→ **同一个文件被两个 CLI 改 = 冲突覆盖**。这正是规划指令 §8.1 明令禁止的情形。

## 1. 五代命题的递进（每代被什么证伪）

| 代 | 命题 | 被什么推翻 |
|---|---|---|
| v008~v009 | 「卡没做完，逐张推完就行」 | 8 张卡做完，v1.0 仍不可演示 |
| v010 | 「空壳显性化 + 20 卡收官 = 五环闭环」 | `features/raft` 18 行空壳 → 只成立四环（`plan-v012:37`） |
| v011 | 「先补数据，再上模块」 | A 阶段只完成 1/5（PD7-01 DONE，PD7-02~05 TODO） |
| v012 | 「数据已够（40/46），缺的是消费端」——主线 `TableName` 11→46 | **该主线已达成**（实测 `TableName` = **46**），命题未被推翻；被推翻的是**它的执行台账** |
| **v013（本版）** | **「治理产物之间要一致」**：规划正文、权威索引、卡面文档、代码四者互相矛盾时谁说了算，以及如何让矛盾变红灯 | 待验证 |

> v013 不推翻 v012 的技术判断。**v012 判断对了（消费端是瓶颈），但它的"已取代"声明没有落地成数据。**
> 这是"文本层做对了、数据层没跟上"——与 v009（`verify` 里没 tsc）、v010（目录在、行为无）同构，
> 只是这次的载体是 **JSON 索引**而不是代码。

## 2. 本版四个核心判断（每个附反证与成立前提）

### 判断 1：11 张僵尸卡是本版唯一的**可致灾**缺陷

**支持**：11/11 为 `TODO` 且 `superseded_by` 空（上方命令）；PD7-02 与 PD8-02 的 `objective` 与
`allowed_paths` 逐字相同；两者 `depends_on` 均已满足（PD7-01 DONE / PD8-02 无依赖）→ **两者都可被派工**。

**反证（我构造的最强反驳）**：也许派工器只认 `priority`，PD7 的 priority 与 PD8 不同，会天然错开。
→ **反证不成立**：`priority` 是**同一阶段内的排序号**，PD7-02 与 PD8-02 分属 P7/P8 两个 phase，
按 `next` 取最小 phase 的 TODO 时 **PD7-02 先于 PD8-02**，正好命中重复卡。
→ 且 `status` 是派工的第一判据，`TODO` 就是"可领"。

**成立前提**：派工器存在且读 `status`/`priority`。若派工完全由人指定卡号，风险降级为"人可能看错"，
**仍然存在**，只是不自动化。

### 判断 2：v012 的阶段 C 其实**已经解锁 10 张卡**，但没人知道

**支持**：PD8-07~10、PD8-12~16 共 **10 张**的 `depends_on` 只有 `PD8-06`，而 `PD8-06` 已 `DONE`
且实测 `TableName = 46` 达成。按 `config.json.dependency_satisfied_by = ["DONE","VERIFIED"]`，
这 10 张**依赖已满足**。

**反证**：`PD8-14` 的 `execution.note` 提到 `D-58` 未裁 → 那 1 张不算解锁。
→ **采纳**：解锁数修正为 **9 张**（PD8-07/08/09/10/12/13/15/16 共 8 张 + 其中 PD8-11 需 PD8-02 → 排除）。
精确：dep 仅 `PD8-06` 且无决策阻塞的 = **PD8-07/08/09/10/12/13/15/16 = 8 张**。

**成立前提**：PD8-06 的 DONE 不是"零代码交付"。这条**已验证**——`PD8-06.execution.commits = ["a8b7ac9"]`
且 `TableName` 实测解析出 **46** 个成员（`02-fact-baseline.md §6`）。原 `U-1` 注销。

**★本条已被 C-13 削弱（自我否定）**：`D-59.applies_to` 覆盖 `PD8-10/11/12/13/14/15/16`，
而这 7 张卡的 `decisions` 字段**都没写 `D-59`**（`03 §2.13`）。
→ 上述 8 张在**依赖**意义上确实解锁，但在**范围**意义上：
**干净可开工 3 张 = `PD8-07` / `PD8-08` / `PD8-09`**；
**须先裁 D-59 才能定范围的 5 张 = `PD8-10` / `PD8-12` / `PD8-13` / `PD8-15` / `PD8-16`**。
（`PD8-14` 不在解锁集内，它另有 D-58。）

### 判断 3：4 项 PROPOSED 决策里，只有 2 项真的挡路

**支持**：45 条决策中 41 `DECIDED`、**4 `PROPOSED`**（D-57/D-58/D-59/D-60）。
按未完成卡的 `execution.note` 反查，被显式引用为阻塞条件的只有 **D-57（PD8-02）** 与 **D-58（PD8-14）**。

**反证**：D-59（v1.0 判据）的 `applies_to` 覆盖 `PD8-10/11/12/13/14/15/16` 共 7 张（`03 §2.13`）。
它虽不阻塞任何单卡的**代码动作**，但它决定"何时可以宣布 v1.0 完成"——这是**全局判据**，不阻塞执行却阻塞验收。
D-60（经验=base_price）的 `applies_to` 是 `PD8-08`，但 `PD8-08.decisions` 里没有它（C-13 的一例），若不裁，实现者会自选。
→ **反证成立**：4 项都要裁。**关键路径排序修正为：D-57 最急（挡 PD8-02→03→04→11 共 4 张），
D-59 次急（决定 5 张已解锁卡的范围口径），D-58 已由 A′ 收敛（只需盖章），D-60 可延后（只影响一张卡的公式）。**

### 判断 4：仓库身份有四处不一致，其中一处**已经让我推不动**

| 项 | 值 | 来源 |
|---|---|---|
| 用户本次指定仓库 | `nevermeetagain/WDF` | 本轮指令 §全部项目信息 |
| 本地 `origin` | `aideanew/WDF` | `git remote -v` |
| 本地分支 | `main`（`ahead 4`） | `git branch -vv` |
| `config.json` 声明主分支 | `master` | `.product-development/config.json` `git.main_branch` |
| `nevermeetagain` 实际分支 | `main`（仅此一条） | `git ls-remote --heads` |
| `aideanew` 实际分支 | `master`（仅此一条） | `git ls-remote --heads` |

**实测**：`nevermeetagain/WDF@main = 4e572fa`，`git merge-base 45111c3 4e572fa = 4e572fa`
→ **目标仓库是本地 HEAD 的祖先，落后两天**（只到 plan-v010）。**且本地另有 4 个提交未推送**（`45111c3` 领先 `origin/master 11c7427` 4 个）。
用现有 PAT 推送 `nevermeetagain`：`remote: Repository not found.` → **不可写**。

→ 这是 **BLOCKING `D-61`**，见 `08-metrics-risks.md`。本版不擅自改 `origin`（用户明令"禁止新建分支"，改远端也需授权）。

## 3. 切片总览（垂直切片，不是"阶段"）

| 切片 | 目标 | 卡 | 出口判据（可复跑） |
|---|---|---|---|
| **S1 一致性止血** | 让"规划说了、索引没做"变成红灯；清 11 张僵尸卡；台账补记 | PD9-01 / 02 / 03 | `npm run pd:consistency` 退出码 0；重叠对 44→7 |
| **S2 决策消解** | 把 4 项 PROPOSED 变成 DECIDED（**需用户拍板**） | PD9-04 / 05 / 06 | `PROPOSED = 0` 且 J13 单向链接 15→0 |
| **S3 身份与推送** | 裁清推哪个仓库哪个分支，并推上去 | PD9-07 / 08 | `origin/master..HEAD` = 0；分支数 = 1 |
| **S4 测试真值** | 修 `EVD-8101` 打红的 docs-index；定向复测落台账（**不跑全量**） | PD9-09 | 定向 2 文件 8/8 PASS；EVD 缺 README 数 2→1 |
| **S5 指针交接** | `current-plan` / `roadmap` 切到 v013 | PD9-10 | 四条 grep 命中 |

> S5 之后才是 `PD8-*` 的实现接续（8 张已解锁，其中 3 张干净可开工、5 张须先裁 D-59）。**本版不重写任何 PD8 卡面。**

## 4. 与 v012 的关系（明确不重复）

- **v012 的 PD8-01~18 全部保留**，不重开、不重写。PD8-06/18 `DONE`，PD8-01 `IN_PROGRESS`（推送未完成），其余按 §2 判断 2 的解锁清单执行。
- **v012 的 17 份正文保留**，只把 `00-README.md` 的 `status` 改 `superseded`（本版接续，不推翻；`PD9-10` 执行）。
- **本版新增的 10 张 PD9 卡全部不碰业务代码**（`packages/**` / `client/**` / `server/**` / `game-data/**` / `database/**` 全部在 `forbidden_paths` 里）。
  唯一写代码的是 `PD9-01`，写的是 `tools/guard/` 下的守卫脚本 —— **属工具链，非业务**。
  原措辞"零实现卡"不准确，已改为**"零业务代码卡"**（详见 `06 §1`）。

## 5. 进度权威（本表是唯一口径）

| 项 | 值 | 取证 |
|---|---|---|
| 权威索引 | `.product-development/task-index.json`（`plan_version: PLAN-R5`） | 顶层字段 |
| 总卡数 | **105** | 同上 |
| 状态分布 | DONE 55 / VERIFIED 3 / SUPERSEDED 9 / BLOCKED 12 / TODO 25 / IN_PROGRESS 1 | 同上 |
| **路径重叠对（待办卡两两）** | **44**（含僵尸 37 / 纯 PD8 7） | `02-fact-baseline.md §4` |
| **一致性缺陷** | **14**（P0 3 / P1 6 / P2 5） | `03-consistency-audit.md §1` |
| **`npm run guard`** | 修前 **3 红** → 本版修后 **全绿（10/10）** | `03 §2.14`（C-14） |
| **可派工但重复的僵尸卡** | **11**（PD7-02~05、PD7-10~16） | `01-snapshot.md §3` |
| 决策登记 | **45**（41 DECIDED / 4 PROPOSED） | `decision-index.json` |
| 未解锁的 PD8 卡 | 9（PD8-02~05、11、14、17 + PD8-01 进行中） | 依赖图 |

> **任何人不得使用百分比口径**。若必须给，须同时写明「按卡数 / 按模块数 / 按验收项」哪一种。

## 6. 目录

| 文件 | 内容 |
|---|---|
| `00-README.md` | 本文件 |
| `01-snapshot.md` | 快照 YAML + 仓库身份四处不一致 + 僵尸卡逐条 |
| `02-fact-baseline.md` | 实测基线（命令 + 数字） |
| `03-consistency-audit.md` | **本版核心**：规划/索引/卡面/代码四产物一致性审计 |
| `04-requirement-baseline.md` | 需求复核、MUST~MUST NOT、冲突、未知登记册 |
| `05-slices.md` | 垂直切片 S1~S5 与排序理由 |
| `06-cards.md` | 原子任务卡 PD9-01~10（全字段） |
| `07-dag-ownership-budget.md` | DAG、所有权矩阵、并行机械判定、档位与预算 |
| `08-metrics-risks.md` | 基线指标、风险、未决、待裁决（D-57~D-61） |
| `09-selfcheck.md` | 逐条自检结果 |
