---
id: PLAN-V013-04
title: plan-v013 · 需求基线复核（MUST / SHOULD / COULD / MUST NOT + 冲突 + 未知登记册）
status: active
module: planning
owner: hark
created: 2026-10-30
review: 2026-11-13
related: [PLAN-V013-02, PLAN-V013-03, PLAN-V013-08]
---

# 需求基线复核

> 本文件不复述需求，只做三件事：**给每条需求定位到原文行**、**标出互相冲突的需求**、**登记还不知道的**。
> 凭据规则：每条必须有 **①文档原文 ②可复跑命令 ③代码/数据交叉验证** 三层。
> 三层凑不齐的，一律进 §6 未知登记册，不进 MUST。

---

## 0. 需求来源清单（先证明我读的是权威版）

| 来源 | 路径 | id | 状态 | 权威性 |
|---|---|---|---|---|
| 产品范围 | `docs/01_product/mvp-scope.md` | — | active | **产品范围最高权威**（§5 注明「已定·Hark代定，用户 10-23 10:45 全权委托」） |
| 平台约束 | `docs/02_requirements/constraints/REQ-C-0001-platform.md` | `REQ-C-0001` | active | 硬约束（包体/合规） |
| 术语与口径 | `docs/00_governance/glossary.md` | `GOV-0002` | active | **口径最高权威**（术语定义一处一义） |
| 决策 | `docs/03_solution/decisions/decision-index.json` | 45 条 | 41 DECIDED | 裁决效力 |
| 用户本轮指令 | 本会话 `long_text_quote` | — | — | **流程纪律最高权威** |

**反向核对（避免引到过期版）**：

```bash
grep -n "^status:" docs/01_product/mvp-scope.md docs/00_governance/glossary.md \
  docs/02_requirements/constraints/REQ-C-0001-platform.md
```

→ 三份均 `active`，无 `superseded`。**本次引用的都是现行版。**

---

## 1. MUST（必须做到，缺一即不算交付）

### M-01 五环闭环必须真跑通（不是"有代码"）

| 层 | 凭据 |
|---|---|
| ① 原文 | `glossary.md:41`：「五环（v1.0 代码层）= **捞→包→做→扩→卖**（出钩打捞 → 背包 → 制作 → 扩筏 → 商人回收）；代码层口径（R-6，2026-10-28 用户拍板）」 |
| ② 命令 | `node -e "console.log(require('fs').readFileSync('docs/00_governance/glossary.md','utf8').split('\n')[40])"` → 同上 |
| ③ 交叉验证 | 五环对应 5 个 game-core 模块行数：`hook 153 / inventory 56 / crafting 89 / **raft 20** / economy 56` → **「扩」只有 20 行，是两个孤立纯函数，无调用方** |

**结论：五环里四环有形，第五环（扩）只有壳。** 这是 M-01 未满足的唯一原因，也是 `PD8-02/03` 的存在理由。
**当前状态：未满足**（`PD8-02` TODO，且被 `D-57` 阻塞）。

### M-02 整船浮力 ≥ 总重量（可算、可拒、可解释）

| 层 | 凭据 |
|---|---|
| ① 原文 | `glossary.md:17`：「浮力：全部船体材料容量之和；规则：整船浮力 ≥ 总重量」；`mvp-scope.md §5`：「船体建造：房间统一大小，整船浮力 ≥ 总重量」 |
| ② 命令 | `grep -n "浮力" docs/00_governance/glossary.md docs/01_product/mvp-scope.md` |
| ③ 交叉验证 | `D-54`（DECIDED）：「浮力只看 `raft_tiles.capacity`（Q2=A）」；代码 `raft_tiles.capacity` 已由 `PD8-18` 对齐（`items.capacity` 一律归 0） |

**当前状态：规则口径已定，实现未接**（`PD8-02`）。

### M-03 v1.0 必须做的事项（**这条是本版最大的冲突源，见 §5 K-01**）

`mvp-scope.md §5` 原文（v1.0 段）：

| 序号 | 事项 | 有无卡承接 | 卡状态 |
|---|---|---|---|
| 1 | 出钩与"捞—做—扩"循环 | 有 | 四环 DONE，扩 = `PD8-02` TODO |
| 2 | 浅海 + 深海，等级上限 49 | 有 `PD8-08` | TODO |
| 3 | 船体建造（房间统一大小，浮力≥重量） | 有 `PD8-02/03/11` | TODO |
| 4 | 7 个员工岗位 | 有 `PD8-09` | TODO |
| 5 | 自己的岛、无主岛 | 有 `PD8-14` | TODO + **D-58 未裁** |
| 6 | 野人岛 + 迷宫塔防 + 回放（第 3 周末不稳则文字结算） | 有 `PD8-14` | 同上，已收敛为 A′ |
| 7 | 兵种先做 3 个（近战/远程/坦克） | **有 `PD8-14` 部分承接** | `waves.csv` **0 行** → 无法落地 |
| 8 | 每日一海 | 有 `PD8-15` | TODO |
| 9 | 称号系统 | 有 `PD8-15` | TODO |
| 10 | 总收益榜 + 省份榜 | 有 `PD8-15` | TODO |
| 11 | 区服（管理员开新区） | 有 `tests/integration/ops-region.test.mjs`（DONE） | 已交付 |
| 12 | 商人 / 回收 | 有（`economy` 56 行 + `economy-sell` 测试） | **DONE** |
| 13 | 区服管理与封号只做脚本 + SQL | 无独立卡 | **未承接**（见 U-3） |
| 14 | 激励视频 | 有 `PD8-16`（广告 UI） | TODO |
| 15 | 实名、防沉迷、隐私协议 | 有 `PD8-17` | **BLOCKED**（等资质） |
| 16 | 必须联网（ADR-0008，拍板 4 选 B） | 有 `tests/integration/*`（离线拒绝） | **DONE** |

→ **16 项里，3 项已交付（11/12/16），1 项未承接（13），12 项待做且多数受决策阻塞。**

### M-04 每张卡的验收必须可复跑

| 层 | 凭据 |
|---|---|
| ① 原文 | 用户本轮指令：「每个小点、要点、论点必须带三层以上凭据」+「按阶段体检：单张卡只跑它改到的测试」 |
| ② 命令 | `tools/guard/run-all.mjs` 有 10 项；`package.json.scripts.verify` = `gen && guard && test && typecheck` |
| ③ 交叉验证 | **13 项一致性缺陷中，C-06 正是"验收不可复跑"**（`PD8-01` 指向仓外 `pd.mjs`） |

**当前状态：不满足** → `PD9-01`。

### M-05 治理产物必须自洽（**本版新增的 MUST，此前不存在**）

| 层 | 凭据 |
|---|---|
| ① 原文 | 用户本轮指令：「基于**本地实际代码**」「深度分析、交叉验证」「优先自我否定」 |
| ② 命令 | `03-consistency-audit.md` 的 13 项判据，每项一条命令 |
| ③ 交叉验证 | 13 项缺陷中 **C-01/C-10 为 P0**，且 `replans[0]` 记录过 FIX-25 同型事故（"索引内 v1.1 卡被当作就绪，next 会误派工"） |

→ **这不是我发明的需求，是从"三次同型事故"里反推出来的。** 详见 §5 K-05。

---

## 2. SHOULD（应当做到，可不阻塞发布）

| id | 内容 | 凭据 | 现状 |
|---|---|---|---|
| S-01 | 六态 UX 覆盖（`loading/empty/error/noPermission/success/conflict`） | `glossary.md:37` + `DESIGN-0001` + `tests/contract/ux.test.mjs`（DONE） | 契约已定、测试已绿；`PD8-04` 负责把它接到 raft 拒绝分支 |
| S-02 | 概率公示由配置表生成 | `REQ-C-0001`：「概率公示由配置表生成」 | 表在（46 张），生成器未见 → U-4 |
| S-03 | 主包 ≤4MB / 主+分包 ≤30MB | `REQ-C-0001` | `guard` 第 6 项 + `npm run check:bundles` 存在，**无基线记录** → U-5 |
| S-04 | 影子账本容差 0（卖出 ≤ 累计获得 − 已卖出） | `glossary.md:34` + `ADR-0012` + `tests/integration/economy-sell.test.mjs`（DONE） | **已满足** |
| S-05 | `configVersion` = 数值表内容哈希 | `glossary.md:27` | `tools/gen/config.mjs` 存在；哈希口径未核 → U-6 |

---

## 3. COULD（可以不做，做了不加分）

| id | 内容 | 为什么是 COULD |
|---|---|---|
| C-01 | `D-60`（经验 = `items.base_price` 1:1） | 只影响 `PD8-08` 的一条公式；不裁也能用 `base_price` 作为默认（可逆、低风险）。**注：`D-60.applies_to = ["PD8-08"]` 但 PD8-08 未登记它 → C-13 的一例** |
| C-02 | `TASK-1601`（契约测试自动生成 + 数值表非空断言） | 已自标"登记，暂不实施"，且 `BLOCKED`；`PD9-01` 会覆盖其 60% 价值 |
| C-03 | `TASK-1602`（密钥扫描守卫，第 10 项） | 现状：`guard` 已有 10 项（第 10 项是占位值），密钥扫描**未实现**；但仓库内无真凭据（`git ls-files \| grep -c git-pat` = 0）→ 风险低 |

---

## 4. MUST NOT（绝对不做）

| id | 禁止项 | 凭据（原文） |
|---|---|---|
| N-01 | **不得新建分支** | 用户本轮指令（重复三次）；`config.json.git.main_branch = master`，`task_branch_pattern = task/{id}` 但 `auto_push_task_branch = false` |
| N-02 | **不得擅自改 `origin`** | 用户本轮指定仓库为 `nevermeetagain/WDF`，但该仓库不可写；改远端属"未经授权的范围变更" → `D-61` 待裁 |
| N-03 | **不得跑全量回归/门禁** | 用户本轮：「**拒绝全量回归/门禁**」 |
| N-04 | **不得自造数值** | `placeholders.baseline` 第 10 项守卫的存在前提；历史事故：`items.weight` 全 1 / `capacity` 全 0（`02 §5` 的 8 个空壳模块仍在使用这些值） |
| N-05 | **不得改业务代码/测试代码/配置文件**（本版） | 用户本轮「只可写入 `docs/**` + `packages/contracts/**` + `database/migrations/001_init.sql`」 |
| N-06 | **不得用 `git add -A`** | 工作树被多路并发写入；`.workbuddy/memory` 已记录两次被卷入别路文件 |
| N-07 | **不得把决策 id 填进 `superseded_by`** | `replans[3]` FIX-36：「`pd.mjs` 的 `taskMap` 只含任务，填决策必然 8 错」 |
| N-08 | **不得在 `withTx` 回调内用全局 `q()`** | `.workbuddy/memory` PGlite 事务死锁记录（历史事故） |
| N-09 | **不得跨模块摸对方 `repo.ts`** | `guard` 第 3/4 项「客户端/服务端依赖边界」 |
| N-10 | **不得重写 11 张僵尸卡的卡面文档** | 本版方法论：用状态表达过时，而不是改写历史（`03 §2.8`） |

---

## 5. 冲突登记（5 条，每条给出裁决路径）

### K-01【最高优先】v1.0 范围有三套口径，互不相容

| 口径 | 原文 | 声称的 v1.0 范围 |
|---|---|---|
| **甲：`mvp-scope.md §5`** | 「v1.0（5 周，微信首发）」+ 16 项清单 | **16 项**，含船体建造、7 员工、岛+塔防、每日一海、称号、双榜、激励视频、实名防沉迷 |
| **乙：`glossary.md:42`** | 「v1.0 代码层 = 五环对应的 **10 模块**（`hook/sea/chest/inventory/crafting/raft/economy/account/guide/settings`）；**其余 13 个 v1 模块进 v1.1**」 | **10 模块** |
| **丙：`D-50`（DECIDED）** | 「延期登记：**13 个 v1.1 模块** + 31 张空表正式登记为延期决策（R-6，用户已拍板）」 | **10 模块**（与乙一致） |

**三层验证**：

```bash
grep -n "v1.0 代码层" docs/00_governance/glossary.md        # 乙
sed -n '/^## 5\./,/^## 6\./p' docs/01_product/mvp-scope.md   # 甲
node -e "const d=require('./docs/03_solution/decisions/decision-index.json').decisions;
console.log(d.find(x=>x.id==='D-50').title)"                  # 丙
```

**冲突的实质**：甲是**产品范围**（对用户承诺什么），乙丙是**代码层分期**（这一轮写哪些模块）。
两者**不是同一层的东西**，但**都没有写明自己属于哪一层** →
于是"v1.0 完成了吗"这个问题，按甲答"没有"，按乙丙答"完成了"。

**这正是 `D-59`（PROPOSED）要裁的东西，而它已挂了两代规划没裁。**

→ **本版建议（不代替用户裁决）**：裁的不是"甲对还是乙对"，而是**把两个词分开**：
- 「v1.0 产品范围」= 甲（16 项，对用户/审核的承诺）
- 「v1.0 代码里程碑」= 乙丙（10 模块，可验收的工程节点）
并在 `glossary.md` 各加一行限定语。**这样两边都不必改，冲突即消。**

### K-02 `drops` 空表 vs `PD8-07` 要求"表驱动"

见 `03 §2.9`（C-09）。**裁决项：`D-63`（本版新增，见 `08` §3）。**

### K-03 塔防"文字结算"也需要数值

| 层 | 凭据 |
|---|---|
| ① 原文 | `mvp-scope.md §5`：「野人岛 + 迷宫塔防 + 回放（**第 3 周末不稳就临时改成文字结算**）」 |
| ② 命令 | `wc -l game-data/source/waves.csv` → **1**（只有表头）；`head -1 game-data/source/units.csv` / `defenses.csv` |
| ③ 交叉验证 | `D-58`（PROPOSED）已把它收敛为 **A′**：「可算的算，不可算的返 `unknown`」 |

**冲突点**：产品说"不稳就退文字结算"，但**文字结算也要说"你赢了还是输了"**——
而没有 `units.hp/attack`、`defenses.damage`，就算不出胜负。
→ A′ 是唯一自洽解法（返 `unknown`），**但 A′ 本身还没被盖章（仍 PROPOSED）**。

### K-04 `PD8-01` 的"零业务代码改动"验收与已有 4 个未推送提交

| 层 | 凭据 |
|---|---|
| ① 原文 | `PD8-01.acceptance.A6`：「零业务代码改动」，`evidence: git diff --stat -- *.ts *.csv *.sql 为空` |
| ② 命令 | `git rev-list --count origin/master..HEAD` → **4**；4 个提交里 `a8b7ac9` 改了 `tables.ts`（`TableName` 11→46） |
| ③ 交叉验证 | `PD8-01.execution.commits = ["7b476c0"]`，但同一批次里 `PD8-06` 的提交 `a8b7ac9` 也在未推送队列 |

**冲突点**：A6 作为 `PD8-01` 单卡的验收是成立的（单卡 diff 为空），
但**它把"未推送"这个状态掩盖了**——任何只看 A6 的人会以为"没有代码变更 = 干净"，
而真相是"**有 4 个提交在本地，推不上去**"。

→ 裁决项并入 `D-61`：推送口径必须显式化。

### K-05 "三层凭据"纪律 vs 现实里没有人工检查凭据的机制

| 层 | 凭据 |
|---|---|
| ① 原文 | 用户本轮：「每个小点、要点、论点必须带三层以上凭据，没有则视为不通过」 |
| ② 命令 | `guard` 10 项中**无一项**检查"卡面是否带凭据"；`docsFrontMatter` 只查 3 字段存在性 |
| ③ 交叉验证 | 13 项一致性缺陷里，**6 项是"文档说了、数据没做"** |

**冲突点**：纪律要求三层凭据，但**验收机制只检查字段存在性**。
→ 结果必然是：**凭据靠人写，真假靠人信。**
本版的处置：不新增"凭据格式"约束（那会造出一堆形式化凭据），
而是**把关键判据变成可执行命令**（`PD9-01` 守卫的 13 个 J 项）。

---

## 6. 未知登记册（不知道就写不知道）

| id | 未知 | 为什么不知道 | 影响 | 谁来解决 |
|---|---|---|---|---|
| **U-1** | ~~`PD8-06` 是否零代码交付~~ | **已注销**：`execution.commits=["a8b7ac9"]`，`TableName` 实测 46 | — | — |
| **U-2** | 全量测试真实数（267 静态 vs 274 自述 vs 270 卡面） | **拒绝全量回归**（N-03） | 无法给"全绿"背书；只能给"定向 2 文件：7 pass / 1 fail" | 发版前统一跑一次 |
| **U-3** | `mvp-scope §5` 第 13 项「区服管理与封号只做脚本 + SQL」由谁交付 | 无对应卡；`PD7-17`/`PD8-17` 是合规模块不是运维脚本 | v1.0 的 16 项里会有 1 项**无人认领** | 用户指派或登记为新卡 |
| **U-4** | 「概率公示由配置表生成」的生成器在哪 | `REQ-C-0001` 要求，仓库未见生成脚本 | 提审时会被卡 | 需查 `tools/` 或承认未做 |
| **U-5** | 主包体基线（当前多少 MB） | 无采样记录；`check:bundles` 存在但未跑 | `REQ-C-0001` 的 ≤4MB 无法判合规 | 需一次采样（非全量回归） |
| **U-6** | `configVersion` 哈希口径（是否含表顺序） | `gen/config.mjs` 未逐行审 | 改了表但哈希不变 → 客户端不刷新 | 需读实现 |
| **U-7** | `nevermeetagain/WDF` 是否真不可写，或只是 PAT 权限不足 | 只验到 `Repository not found`（可能是私有/无权限/不存在三种原因同一个报错） | 决定 `D-61` 选哪个选项 | 用户确认仓库归属 |
| **U-8** | `PD8-03`（raft 建造面板 UI）的交互稿在哪 | `allowed_paths` 含 `MainView.ts` / `panel-types.ts`，但无 UI 设计稿文档 | **高难度 UI，主控自己做**（用户纪律），无稿就得先设计 | 主控 |
| **U-9** | 15 个 21 行 feature 目录里，哪些是"v1.1 预留"哪些是"忘了做" | 无登记字段区分 | 可能重复造卡 | 需对照 `D-50` 的 13 模块名单 |

### 6.1 U-9 的核对结果（本版已做一半）

```bash
node -e "
const fs=require('fs'),p=require('path');const b='client/assets/scripts/features';
for(const d of fs.readdirSync(b)){let n=0;const st=[p.join(b,d)];
 while(st.length){const c=st.pop();for(const e of fs.readdirSync(c,{withFileTypes:true})){const f=p.join(c,e.name);
  if(e.isDirectory())st.push(f);else if(/\.ts$/.test(e.name))n+=fs.readFileSync(f,'utf8').split('\n').length;}}
 if(n===21)console.log(d);}"
```

15 个 21 行目录：`account ads compliance crew defense event fishing island power progression raft salvage sea social telemetry`

对照 `D-50` 的「13 个 v1.1 模块」与 `glossary.md:42` 的 10 模块名单：

| 分类 | 目录 | 判断 |
|---|---|---|
| **v1.0 必须做，现在是空壳** | `raft`、`sea` | **必须补**（M-01/M-02） |
| v1.1 范围（`D-50` 已登记延期） | `crew` `defense` `event` `fishing` `island` `power` `progression` `salvage` `social` | 合法延期，**不算欠债** |
| 不在 13 模块名单内 | `ads` `compliance` `account` `telemetry` | `account`/`telemetry` 应有实现却只有 21 行 → **需单独确认** |

→ **U-9 收敛为**：`account` 与 `telemetry` 两个 21 行目录**没有合理解释**（既不在 v1.1 延期名单，也非 v1.0 五环），
登记为新未知 `U-10`，**但不建卡**（用户纪律：不造空壳卡）。留给 `D-59` 裁决时一并处理。

---

## 7. 隐含要求（用户没说、但不做就会翻车的）

| id | 隐含要求 | 为什么是"必须" | 凭据 |
|---|---|---|---|
| **I-01** | 推送前必须知道**往哪个远端推** | 现在有 2 个仓库、2 个分支名、4 个未推送提交、2 份 PAT | `00 §2 判断 4` |
| **I-02** | 索引必须能被**非本人**读懂 | 有 18 处 `pd.mjs` 引用，其中含 `<ABS>`/`<skill>` 占位符 → 外人跑不了 | `03 §2.6` |
| **I-03** | 证据目录不能随便放东西 | `EVD-8101` 一个 zip 打红一条契约测试 | `03 §2.7` |
| **I-04** | 决策一旦 PROPOSED 挂了，必须有人推进 | `D-57` 挂了 **≥1 代规划**（v011 `10-risks-pending.md#U-1` → v012 `#D-57` → v013 仍未裁） | 见下 |

**I-04 的取证**（这条最能说明"漂移"是怎么发生的）：

```bash
grep -rn "D-57" docs/03_solution/decisions/decision-index.json | head -2
```

```
"file": "docs/04_planning/plan-v011/10-risks-pending.md",
"source": "docs/04_planning/plan-v011/10-risks-pending.md#U-1"
```

→ **D-57 最初是 v011 里的一个"未知项 U-1"，被 v012 升级成决策 D-57，
到 v013 它还是 PROPOSED。** 而它挡着 `PD8-02 → PD8-03 → PD8-04 → PD8-11` **4 张卡**。

**一个"未知"可以被登记两代而不被解决——因为登记它的文档一代比一代新，而它本身没变。**

---

## 8. 需求 → 卡 覆盖矩阵（只列 MUST）

| 需求 | 承接卡 | 卡状态 | 缺口 |
|---|---|---|---|
| M-01 五环 | `PD8-02`(扩) + 四环已 DONE | TODO / **D-57 阻塞** | 扩环 |
| M-02 浮力 | `PD8-02` + `PD8-04` | TODO | 拒绝分支 |
| M-03 十六项 | 见 §1 M-03 表 | 3 已交付 / 12 待做 / 1 未承接 | 第 13 项无人认领（U-3） |
| M-04 验收可复跑 | `PD9-01` | **本版新增** | 13 项一致性缺陷 |
| M-05 治理自洽 | `PD9-01~03` | **本版新增** | 同上 |

**结论**：MUST 层面有 **2 条需求（M-04/M-05）此前完全没有卡承接**，本版用 `PD9-01/02/03` 补上。
其余缺口都在既有卡内，**不新增实现卡**（避免与 `PD8-*` 重复——那正是 `C-01` 的病）。
