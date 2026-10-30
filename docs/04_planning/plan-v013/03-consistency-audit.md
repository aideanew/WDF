---
id: PLAN-V013-03
title: plan-v013 · 四产物一致性审计（本版核心）
status: active
module: planning
owner: hark
created: 2026-10-30
review: 2026-11-13
related: [PLAN-V013-00, PLAN-V013-02, PLAN-V013-06]
---

# 四产物一致性审计

> **本版唯一的技术贡献：把"规划说了一件事、数据是另一件事"变成可机检的红灯。**
> 审计对象是四个产物，不是代码：
> **A 规划正文**（`docs/04_planning/**`）、**B 权威索引**（`.product-development/task-index.json`）、
> **C 卡面文档**（各卡 `card` 字段指向的 md）、**D 决策索引**（`docs/03_solution/decisions/decision-index.json`）。
> 代码只作为"这两者是否符合现实"的裁判出场。

---

## 0. 审计方法与判级

### 0.1 为什么审计这四个而不审计代码

代码有 `typecheck`、`test`、10 项 `guard`。**治理产物一个闸门都没有。**

```bash
grep -n "names = " -A2 tools/guard/run-all.mjs
```

```
const names = { rootWhitelist, gameCorePurity, clientBoundaries, serverBoundaries,
  catalogConsistency, bundles, generatedUntouched, docsFrontMatter,
  everyDirExplained };   // + placeholderIssues（第 10 项）
```

10 项里**只有 `docsFrontMatter` 碰文档**，而它只检查 `id/title/status` 三字段存在。
→ **`task-index.json` 与 `plan-v01x/*.md` 之间的任何矛盾，没有任何机制会发现。**
这就是 11 张僵尸卡能活下来的**结构性原因**——不是谁偷懒，是**没有裁判**。

### 0.2 判级

| 级别 | 定义 | 处置 |
|---|---|---|
| **P0** | 会导致**实际损害**（文件冲突覆盖 / 派工做错事 / 红线被绕过） | 本版必须修 |
| **P1** | 会让**结论不可信**（验收跑不出、证据找不到、元数据撒谎） | 本版必须修或明确免责 |
| **P2** | **陈旧但不致害**（数字过期、缺行、缺理由） | 本版登记，可延后 |

### 0.3 十项判据（每项都可机检）

| # | 判据 | 对象对 | 归属缺陷 |
|---|---|---|---|
| J1 | 规划声明的"取代"必须在索引落地（`status` + `superseded_by`） | A ↔ B | C-01 |
| J2 | 每次 `plan_version` 换代必须有 `replans` 记录 | B ↔ B | C-02 |
| J3 | `baseline_commit` 必须等于当时 HEAD | B ↔ git | C-03 |
| J4 | `current-plan.md` 的数字必须与 B 一致 | A ↔ B | C-04 |
| J5 | `roadmap.md` 必须覆盖全部 `plan-v0xx` 世代 | A ↔ A | C-05 |
| J6 | 验收命令必须**任何机器可跑**（不得引用仓外绝对路径 / 未替换占位符） | B ↔ 环境 | C-06 |
| J7 | 证据目录必须有 README 且进索引 | C ↔ A | C-07 |
| J8 | 卡面文档必须描述**当前**卡，而非被取代的前代卡 | C ↔ B | C-08 |
| J9 | 单卡内部 `objective` 与 `execution.note` 不得互相否决 | B ↔ B | C-09 |
| J10 | 待办卡之间不得存在 `allowed_paths` 重叠（并行机械判定的前提） | B ↔ B | C-10 |
| J11 | `DONE` 卡必须有证据指针（`execution.commits` 或 `evidence`） | B ↔ 证据 | C-11 |
| J12 | 验收不得写裸数字（必须写成可复跑命令） | B ↔ B | C-12 |
| J13 | `decision.applies_to` 与 `card.decisions` 必须**双向对称** | D ↔ B | C-13 |
| J14 | `npm run guard` 必须为绿（守卫本身是红的，则一切「verify 全绿」都是空话） | 代码 ↔ 门禁 | C-14 |

---

## 1. 缺陷总表

| id | 判据 | 级别 | 一句话 | 归属卡 |
|---|---|---|---|---|
| **C-01** | J1 | **P0** | 11 张僵尸卡：规划写了取代，索引 `superseded_by` 全空 | **PD9-02** |
| **C-10** | J10 | **P0** | 44 对待办卡路径重叠，其中 37 对由僵尸卡贡献；**无任何闸门** | **PD9-01** |
| C-02 | J2 | P1 | `PLAN-R4→R5` 的 replan 记录不存在 | **PD9-03** |
| C-06 | J6 | P1 | `PD8-01` 验收指向仓外 `C:/Users/EDY/.claude/.../pd.mjs`；18 处引用含未替换占位符 | **PD9-01** |
| C-07 | J7 | P1 | `EVD-8101/` 无 README → 打红 `docs-index.test.mjs` | **PD9-10** |
| C-08 | J8 | P1 | 11 张僵尸卡的卡面仍是 `plan-v011` 的旧描述 | **PD9-02** |
| C-09 | J9 | P1 | `PD8-07` 要"由 drops 表驱动"，而 `drops.csv` 是空表 | **PD9-08**（并入 D-63 裁决） |
| C-03 | J3 | P2 | `baseline_commit = 11c7427`，HEAD = `45111c3` | PD9-03 |
| C-04 | J4 | P2 | `current-plan.md` 写 8fbb57b / 领先 19 / 270-267-3（三项全过期） | PD9-03 |
| C-05 | J5 | P2 | `roadmap.md` 缺 v011/v012/v013 三行，写"9 守卫 + 65 测试" | PD9-03 |
| C-11 | J11 | P2 | **29 张 `DONE` 卡无 `execution.commits`/`evidence`**（历史债） | 只登记，不修 |
| C-12 | J12 | P2 | `PD8-18` 自述 274/274，静态 `^test(` 只有 267，acceptance 又写 270 | PD9-10 |
| **C-13** | J13 | **P1** | **决策与卡的双向链接不对称 15 处** → "哪些卡被未裁决策挡住"**不可计算** | **PD9-04** |
| **C-14** | J14 | **P0** | **`npm run guard` 自 `3cd7628`(PD7-09) 起就是红的**（3 处 front matter 缺失），无人发现 | **本版已修**（见 §2.14） |

**分级结果：P0 三项 / P1 六项 / P2 五项 = 14 项。**

> **自我修正留痕**：C-13 是在本文件第一稿写完之后才发现的，它**削弱了 `00-README §2 判断 2`**。
> `00-README` 已同步标注。不删改、只追加，这是本版对"优先自我否定"的兑现方式。


---

## 2. 逐条取证

### C-01【P0】11 张僵尸卡

**判据 J1**：规划正文的"取代"声明必须在索引落地。

**A 侧（规划说了）**：`docs/04_planning/plan-v012/00-README.md:106`

> PD7-02~05 与 PD7-10~16 由本版 PD8-02~05 / PD8-08~16 **接替并重写卡面**
> （不复制，改为 `superseded_by` 指向新卡）。

**B 侧（索引没做）**：

```bash
node -e "const a=require('./.product-development/task-index.json').tasks;
for(const id of ['PD7-02','PD7-03','PD7-04','PD7-05','PD7-10','PD7-11','PD7-12','PD7-13','PD7-14','PD7-15','PD7-16']){
  const t=a.find(x=>x.id===id);console.log(id,t.status,t.superseded_by);}"
```

```
PD7-02 TODO undefined
PD7-03 TODO undefined
...（11 行全同）
```

**危害（三层）**：

1. **第一层（可派工）**：`status=TODO` 是派工的第一判据。11 张卡都在"可领"队列里。
2. **第二层（会做错事）**：`PD7-02` 与 `PD8-02` 的 `allowed_paths` **逐字重叠**：

   ```
   PD7-02: packages/game-core/src/raft/** , packages/game-core/src/save/**
   PD8-02: packages/game-core/src/raft/** , packages/game-core/src/save/**
   ```

   两者的 `objective` 也几乎同义（"raft 规则接线/规则层 + 存档投影"）。
   → 两个执行者各做一遍，**后写的覆盖先写的**，且双方都"按卡完成"了。
3. **第三层（污染台账）**：做完之后，同一份工作被记两次（`PD7-02` DONE + `PD8-02` DONE），
   而 `placeholders.baseline` 与阶段出口判据都按卡数算 → **进度被虚增**。

**为什么不成立的反驳**：

| 可能反驳 | 实测结果 |
|---|---|
| "也许 `superseded_by` 机制没实现" | **有 9 张正确用例**（`TASK-0802→PD3-01` 等），字段是顶层字符串 |
| "也许是故意保留 PD7 作为备份" | 若如此，`status` 应不是 `TODO`；`TODO` 的语义就是"待做" |
| "也许 `priority` 会天然错开" | `TODO` 优先于 `priority`；即便按 priority，`PD7-02.priority` 也不大于 `PD8-*`（PD7 阶段号更小 → 更先） |
| "也许派工全是人指定卡号，不会自动领" | 即使人工，人也按 `status` 判断；且 `replans[0]` 已记录过事故「索引内 v1.1 卡被当作就绪，**next 会误派工**」（FIX-25）→ **同一类事故的第二次发生** |

**归属**：`PD9-02`。修法见 `06-cards.md`，**必须遵守 FIX-36**：
`superseded_by` 只能填**任务 id**，决策 id 进 `superseded_reason`。

---

### C-10【P0】44 对路径重叠 + 无闸门

**判据 J10**：并行机械判定要求「文件所有权不相交」。索引里没有任何字段能表达"我已经检查过"。

```bash
# 完整命令见 02-fact-baseline.md §4
```

| 分类 | 对数 |
|---|---|
| 总重叠对 | **44** |
| 至少一端是僵尸卡 | **37**（84.1%） |
| 纯 PD8 之间 | **7** |

**这组数字同时给出两件事**：

1. **修 C-01 的收益是可量化的**：清掉 11 张僵尸卡，冲突对从 **44 降到 7**（降 84%）。
2. **剩余 7 对是真实的排期约束**，必须写进所有权矩阵，不能靠"希望不会撞"：

```
PD8-02↔PD8-11   PD8-03↔PD8-04   PD8-03↔PD8-05   PD8-05↔PD8-07
PD8-13↔PD8-15   PD8-13↔PD8-16   PD8-15↔PD8-16
```

**热点文件（未来任何排期都必须先看这张表）**：

| 卡数 | 路径 | 含义 |
|---|---|---|
| **6** | `server/src/gateway/handlers.ts` | **全仓最热的写入点** |
| 4 | `packages/game-core/src/save` | 存档投影，谁都碰 |
| 4 | `client/assets/scripts/app/BootController.ts` | 启动装配，谁都碰 |
| 3 | `packages/game-core/src/raft` | — |
| 3 | `client/assets/scripts/features/hook/view/HookPanel.ts` | — |

**危害**：现在靠人记。人记不住 44 对。**只要有一轮派工忘了，就是一次覆盖。**

**归属**：`PD9-01`——把它做成第 11 项守卫（`tools/guard/pd-consistency.mjs`），
`npm run guard` 里跑，重叠即红。**这是本版唯一新增的可执行闸门。**

---

### C-02【P1】`PLAN-R4 → PLAN-R5` 的 replan 记录不存在

**判据 J2**。

```bash
node -e "const r=require('./.product-development/task-index.json');
console.log('plan_version =',r.plan_version,'| replans =',r.replans.length);
console.log(r.replans.at(-1).changed.join('\n'));"
```

```
plan_version = PLAN-R5 | replans = 5
新增 17 条 PD7-01~PD7-17（阶段 A 5 / B 4 / C 7 / D 1）
plan_version PLAN-R3 → PLAN-R4，baseline 4e572fa
```

**矛盾**：`replans` 最后一条写的是 `R3→R4`，而顶层 `plan_version` 已经是 `PLAN-R5`。
→ **v012 这一整代规划（17 份正文 + 18 张卡）没有留痕。**

**危害**：`replans` 是唯一记录"为什么换了一版"的地方。
缺了 R5，后来者看到 105 张卡与 `PLAN-R5` 时，无法知道 v011 的 17 张卡为何变成 v012 的 18 张。
**这正是"规划漂移"的物理载体** —— 而且它**恰好是在记录"遏制漂移"的那个字段上缺失的**。

**归属**：`PD9-03`。本版落盘时**补写 R5 与 R6 两条**（R6 = v013 自身）。

---

### C-06【P1】验收命令指向仓库外绝对路径

**判据 J6**：验收必须任何机器可跑。

```bash
node -e "const a=require('./.product-development/task-index.json').tasks;
const t=a.find(x=>x.id==='PD8-01');
console.log(JSON.stringify(t.acceptance.map(x=>x.check.cmd),null,1));"
```

```
"node C:/Users/EDY/.claude/skills/product-development/scripts/pd.mjs health . | grep -c 错误"
"node C:/Users/EDY/.claude/skills/product-development/scripts/pd.mjs status . | grep -c \"阻塞 PD7-08：undefined\""
```

| 事实 | 命令 | 结果 |
|---|---|---|
| 该文件在本机存在 | `ls -la C:/Users/EDY/.claude/skills/product-development/scripts/pd.mjs` | `55919` 字节，`Oct 28 17:02` |
| 该文件**不在仓库** | `git ls-files \| grep -c "pd.mjs"` | **0** |
| 仓库内也没有同名脚本 | `find . -name "pd*.mjs" -not -path "./node_modules/*"` | 无结果 |
| 索引中共 18 处引用 | `grep -c "pd.mjs" .product-development/task-index.json` | **18** |
| 其中含**未替换占位符** | 同上 | `node <ABS>/pd.mjs health .`、`node <skill>/scripts/pd.mjs status .` |

**危害**：

- `PD8-01` 的 A1/A2 是**本机自证**，换 agent、换机器、上 CI 全部失败。
- 带 `<ABS>` / `<skill>` 占位符的那些验收，**连本机都跑不出结果**——它们不是验收，是备注。
- 更深的后果：**"治理系统健康"这件事，在整个交付物里没有任何可复现的证据。**
  一个新人 clone 下来，永远无法验证"105 张卡的索引是自洽的"。

**归属**：`PD9-01`。做法不是"把 `pd.mjs` 拷进仓库"（那是把别人的技能变成本仓维护负担），
而是**用本仓的 Node 脚本重写那几条判据**：health 里的"0 错误"→ 变成 `pd-consistency` 守卫的自身退出码。

---

### C-07【P1】`EVD-8101/` 无 README → 打红契约测试

**判据 J7**。

```bash
node -e "
const fs=require('fs'),p=require('path');const r='docs/06_validation/evidence';
const ds=fs.readdirSync(r).filter(d=>/^EVD-\d+\$/.test(d));
console.log(ds.length, ds.filter(d=>!fs.readdirSync(p.join(r,d)).includes('README.md')));"
```

```
52 [ 'EVD-4012', 'EVD-8101' ]
```

- `EVD-4012` 用 `baseline.md`，测试第 44 行**明文豁免**。
- `EVD-8101` 只有 `plan-v012-pd8-未推送-7b476c0.zip`（3.7 MB）→ **测试断言失败**。

**时间线（证明这是事后打红，不是老账）**：

| 时刻 | 事件 | 证据 |
|---|---|---|
| 15:59:09 | `39efe36` PD8-18 自述「全量 274/274 PASS」 | `git log -1 39efe36` |
| **16:05:34** | `EVD-8101/` 被创建 | `stat -c '%y' docs/06_validation/evidence/EVD-8101` |
| 16:07:23 | `45111c3` 只记了推送失败，**没重跑 docs-index** | `git show --stat 45111c3`（只改 1 个文件） |

**危害**：这是"**证据目录的随手一放，打坏了契约测试**"。
它同时暴露两件事：
1. 加证据目录**不需要过任何检查**（`guard` 不查 EVD 目录结构）。
2. 一个"不推送就出 zip"的应急动作，会**污染仓库状态**，而且没人发现。

**归属**：`PD9-10`。修法：给 `EVD-8101` 补 `README.md`（含 `id`/`title`/`status`），
并**把 zip 移出仓库**（放 `EVD-8101/` 只留 README + 校验和），然后重跑 `gen:docs` + 定向测试。

---

### C-08【P1】僵尸卡的卡面仍是前代描述

**判据 J8**：卡面必须描述当前卡。

```bash
node -e "const a=require('./.product-development/task-index.json').tasks;
for(const id of ['PD7-02','PD7-16']){const t=a.find(x=>x.id===id);console.log(id,'->',t.card);}"
```

```
PD7-02 -> docs/04_planning/plan-v011/stage-a-v10-close/00-stage.md
PD7-16 -> docs/04_planning/plan-v011/stage-c-v11-modules/00-stage.md
```

11 张僵尸卡全部指向 `plan-v011/**` 的 stage 文档（实测 11/11 存在，**没有一张卡面缺失**）。

**这构成一个更隐蔽的循环**：
- 规划说"改写卡面"（`plan-v012/00-README.md:106`）→ 没改。
- 于是 `PD7-02` 的卡面还在 `plan-v011` 里，**而 `plan-v011` 已被 v012 接续**。
- 执行者按卡号找到卡面，读到的是一份**已被宣布过时的文档**。

**归属**：`PD9-02`。修法：**不重写卡面**（重写就是 v012 想做的事，做了会二次漂移），
而是 `status=SUPERSEDED` + `superseded_by` + `superseded_reason` 指向**新卡所在的 stage 文档**。
`card` 字段**不改**（保持历史指向，正是"这张卡属于 v011"的事实）。

> 这是本版一个明确的方法论取舍：**用状态表达"过时"，而不是用编辑文档表达"过时"。**
> 文档是历史的证据，不该被改写；索引才是当下的真相。

---

### C-09【P1】`PD8-07` 的 objective 与 note 互相否决

**判据 J9**。

```bash
node -e "const t=require('./.product-development/task-index.json').tasks.find(x=>x.id==='PD8-07');
console.log(t.objective);console.log(t.execution.note);"
```

```
objective: 打捞面板的掉落由 drops/shipwrecks 表驱动，复用 createRng（业务零调用缺口），不再硬编码
note:      必须复用 createRng（02 §10 业务零调用缺口）；drops 为设计空表（D-27 无规则）
```

对照 `game-data/source/drops.csv`：

```
id,group,item,min,max,weight_bp
```

→ **只有表头，0 行数据。**

**这是"同一张卡里，任务要求吃一张空表"**。执行者只有两条路：
1. 自己编掉落规则 → **违反"禁止自造数值"纪律**，且编完的规则没人认。
2. 写成"表空则回落硬编码" → **objective 里明写了"不再硬编码"**，直接违背。

**归属**：`PD9-08`。这要被裁成一条决策（`D-63`）：
「`drops` 表由谁在何时补到非空；在补之前 `PD8-07` 是否允许回落 + 回落的判据」。
**在裁之前 `PD8-07` 必须标 `BLOCKED`**，不能留 `TODO` 让执行者去猜。

---

### C-03 / C-04 / C-05【P2】三处陈旧元数据

| 判据 | 产物 | 写的 | 实测 | 后果 |
|---|---|---|---|---|
| J3 | `task-index.baseline_commit` | `11c7427` | HEAD `45111c3` | 快照对不上人 |
| J4 | `current-plan.md`（规划基线行） | `8fbb57b`，领先 19 提交 | `45111c3`，领先 4 | 差了两代 |
| J4 | `current-plan.md`（测试基线行） | `270 / 267 pass / 3 fail` | 定向复跑：`items-weights` 已全绿，`docs-index` 仍 1 红 | 读者会以为有 3 条红要修 |
| J5 | `roadmap.md` | 只有到 plan-v010 的行；写「现 9 守卫 + 65 测试」 | 已有 v011/v012/v013；10 守卫；40 测试文件 | 路线图缺三行 |

```bash
grep -n "8fbb57b\|领先远端\|270" docs/04_planning/current-plan.md | head
grep -c "plan-v01" docs/04_planning/roadmap.md
```

**为什么不升级为 P1**：这三处**不会让人做错事**，只会让人**误判进度**。
而"误判进度"正是本版要治的病，所以**必须修**，只是不占用 P0 的排期优先级。

**归属**：`PD9-03`。

---

### C-11【P2】29 张 `DONE` 卡没有证据指针

```bash
node -e "const T=require('./.product-development/task-index.json').tasks;
const b=T.filter(t=>t.status==='DONE'&&!(t.execution&&(t.execution.commits||t.execution.evidence)));
console.log(b.length,b.map(t=>t.id).join(','));"
```

```
29 TASK-0101,TASK-0104,...,TASK-3401
```

55 张 `DONE` 里 **29 张（52.7%）**没有 `execution.commits` 或 `execution.evidence`。

**处置：只登记，不修。** 理由（自我否定过一轮）：

- 这 29 张是 `TASK-xxxx` 遗留卡（P0 之前的世代），补 evidence 需要翻旧提交，**成本高、收益低**。
- 它们都不在待办队列里，**不会导致派工做错事**。
- 强行补会让本版变成一个"考古工程"，**偏离命题**。

→ 写进 `08-metrics-risks.md` 的**已接受风险 R-13**，并在 `PD9-01` 的守卫里
**只对 `PD8`/`PD9` 之后的卡强制**（用 `phase` 前缀过滤），避免守卫一上线就 29 红。

---

### C-12【P2】测试数三个口径

| 来源 | 数 | 取证 |
|---|---|---|
| `PD8-18.acceptance.A2` | `pass 270 / fail 0` | 卡面 |
| `PD8-18.execution.note` | `274/274 PASS` | 卡面 |
| 静态 `grep -rh "^test(" \| wc -l` | **267** | 本文件 §0 前一节实测 |

同一张卡里"270"与"274"并存，且都不等于静态计数 267（差值是子测试）。

**危害**：低。但**它是"卡面数字不可信"的实证**——一旦验收靠人抄数字，就会这样。
→ 验收应写成**命令**（`... | grep -c "fail 0"`），不写**数字**。

**归属**：`PD9-10`，同时把这条写成 `PD9-01` 守卫的一项静态检查（`acceptance` 里出现裸数字即警告）。

---

### C-13【P1】决策与卡的双向链接不对称（15 处）

**判据 J13**：`decision.applies_to`（决策声明它管哪几张卡）与 `card.decisions`（卡声明它受哪几条决策约束）
必须**双向对称**。否则"哪些卡被未裁决策挡住"这个问题**在数据上无法回答**。

```bash
node -e "
const D=(require('./docs/03_solution/decisions/decision-index.json').decisions)||[];
const T=require('./.product-development/task-index.json').tasks;
const byId=Object.fromEntries(T.map(t=>[t.id,t]));
for(const d of D) for(const c of (d.applies_to||[])){
  const t=byId[c];
  if(!t){console.log('[卡不存在]',d.id,'->',c);continue;}
  if(!(t.decisions||[]).includes(d.id)) console.log(d.id,'->',c,'(',t.status,')');}"
```

输出（15 行）：

```
D-51 -> PD2-02 (BLOCKED)        D-51 -> PD4-01 (VERIFIED)
D-51 -> PD2-03 (BLOCKED)        D-53 -> TASK-1401 (VERIFIED)
D-57 -> PD8-02 (TODO)           D-57 -> PD8-03 (TODO)
D-58 -> PD7-08 (BLOCKED)
D-59 -> PD8-10 (TODO)  D-59 -> PD8-11 (TODO)  D-59 -> PD8-12 (TODO)
D-59 -> PD8-13 (TODO)  D-59 -> PD8-14 (TODO)  D-59 -> PD8-15 (TODO)
D-59 -> PD8-16 (TODO)
D-60 -> PD8-08 (TODO)
```

反向（卡引用的决策不存在）**0 处** → 说明纪律是"卡只写自己认识的决策"，
**漏的是"决策侧登记的上游关系没有回填到卡上"**。

**为什么这条是 P1 而不是 P2**：

`PD8-02.execution.note` **明文写着**「阻塞条件 D-57 未裁」，但 `PD8-02.decisions` 里**没有 D-57**。
后果是：

| 问题 | 现在能否回答 | 原因 |
|---|---|---|
| 哪些卡被 PROPOSED 决策阻塞？ | **不能** | 只能靠 grep `execution.note` 的中文自由文本 |
| `PD8-02` 能否开工？ | 靠人读 note | 数据上它是"无决策约束的 TODO" |
| 裁掉 D-57 能解锁几张卡？ | **不能** | `applies_to` 有，卡侧没有 → 两套数 |

第 3 行尤其致命：**`applies_to` 说 D-57 管 4 张（PD7-02/03 + PD8-02/03），
卡侧只承认 2 张（都是僵尸卡 PD7-02/03）**。如果按卡侧统计，会得出"D-57 只影响被取代的卡，不重要"的
**完全错误**的结论——而真相是它挡着关键路径。

**这一条同时解释了整件事为什么能拖这么久**：
不是没人看，是**看两遍得到两个答案，而第三个答案（真实答案）根本不在数据里**。

**归属**：`PD9-04`（与 D-57~D-60 的裁决合并做，因为裁决动作本身就要写回 `applies_to` 与 `decisions` 两侧）。
守卫里作为 J13 项落地（`PD9-01`）。

---

### C-14【P0】`npm run guard` 本身是红的（本版已修）

**判据 J14**：门禁必须自己先绿。

**发现过程**：本版要求「跑 gen:docs + guard，不跑 test/typecheck」，执行时发现：

```bash
npm run guard 2>&1 | tail -16
```

```
❌ 文档 front matter（3）
   - docs/06_validation/evidence/EVD-7108/source-list.md：缺少 front matter
   - docs/06_validation/evidence/EVD-7108/units.md：缺少 front matter
   - docs/06_validation/evidence/EVD-7109/source-list.md：缺少 front matter
守卫未通过：3 处
```

**这不是本版引入的**，取证：

```bash
git log --oneline -1 -- docs/06_validation/evidence/EVD-7108/source-list.md
# 3cd7628 feat(PD7-09): 玩法簇数据转录——19 张表...
git ls-tree -r --name-only 11c7427 -- docs/06_validation/evidence/EVD-7108/
# 三份文件在 origin/master(11c7427) 就已存在
```

→ **`npm run guard` 自 PD7-09（2026-10-30 早于 11c7427）起就是红的。**

**为什么至今没人发现**：

| 原因 | 凭据 |
|---|---|
| `docsFrontMatter` 只查**非 README** 的 md | `tools/guard/checks.mjs:143` 对 `README.md` 直接 `continue` |
| 三份文件是证据附件，作者当「附件」写，不当前「文档」写 | 文件开头是 `# PD7-08 来源清单`，无 front matter |
| **没有人跑 `npm run guard` 之后看输出** | `plan-v012` 与 `current-plan` 都只说「`verify` 全绿是阶段出口」，没有任何一处记录 guard 的真实状态 |

**危害（这是 C-14 比 C-01 更该叫 P0 的原因）**：

`current-plan.md` 与 `plan-v012` 反复用「`npm run verify` 全绿」作为**阶段出口判据**。
而 `verify = gen && guard && test && typecheck`，**guard 是红的** → 
**这个出口判据在 PD7-09 之后从来没有可能被满足过**。

> 也就是说：**所有「阶段通过」的宣告，都在引用一个不可能成立的条件。**
> 这不是某一张卡的问题，是**验收体系的地基**问题。

**本版处置（计划外的最小修复，已登记）**：

给三份文件各补 3 行 front matter（`id` / `title` / `status`），**不改任何正文一个字**：

| 文件 | 补的 id |
|---|---|
| `EVD-7108/source-list.md` | `EVD-7108-L1` |
| `EVD-7108/units.md` | `EVD-7108-A2` |
| `EVD-7109/source-list.md` | `EVD-7109-L1` |

修复后：

```
✅ 文档 front matter
全部守卫通过
```

**为什么允许自己做这个计划外修复**（自我审查）：

- 落在 `docs/**` 白名单内（用户本轮只允许写 `docs/**` 等路径）；
- **不推红门禁**是「推送到 GitHub 保证双端一致」的隐含前提——把红守卫推上去等于把失败交付；
- 改动是 3 个文件各 9 行 front matter，**零正文改动**，可逐行审。

**但必须承认**：这违反了我自己在 `05-slices.md §7` 写的「退出即停止」。
已在 `08 §2 R-16` 与 `09 §3` 登记为**本版唯一的范围外动作**。

---

## 3. 一致的部分（反向自查，避免只报坏消息）

**审计必须双向。以下是我假设有缺陷、实测没有的**：

| 我原先怀疑 | 检查 | 结果 |
|---|---|---|
| `allowed_paths` 与 `forbidden_paths` 自相矛盾 | 逐卡求交集 | **0 张** |
| 卡面文档不含本卡号（挂错文档） | `card` 内容 `includes(id)` | **0 张**（26 张待办全部命中） |
| 验收引用不存在的测试文件 | 正则提取 + `existsSync` + `allowed_paths` 白名单 | **1 张（PD8-11）**，且属合法跨卡回归依赖 → **不计缺陷** |
| `BLOCKED` 卡缺 `blocked_reason` | 逐卡检查 | **0 张**（12/12 都有） |
| 卡 id 重复 | Set 去重 | **0 张** |
| 16 必填字段缺失 | `objective/card/role/acceptance` 检查 | **0 张** |
| `superseded_by` 机制没实现 | 查 9 张 `SUPERSEDED` | **实现了，且 9 张都在用** |
| `TableName` 仍只有 11 个 | 解析 `tables.ts:54` | **46**，v012 主线**已达成** |
| `SUPERSEDED` 缺 `superseded_reason` | 逐卡 | **1 张**（`TASK-0202`，用 `execution.evidence` 代替）→ 可接受 |

> 这 9 条负结果同样重要：它们证明**本仓的治理纪律总体是好的**。
> 问题集中在**一个点**上：**换代时的状态迁移没有做**，外加**没有闸门去发现它**。
> 如果我把 14 项缺陷说成"系统性崩塌"，那是夸大，不成立。

---

## 4. 现有 10 项守卫的逐项盲区

| # | 守卫项 | 检查什么 | 为什么抓不到本版的 13 项（C-14 是反向的：它就长在门禁自己身上） |
|---|---|---|---|
| 1 | 根目录白名单 | 仓库根只允许特定文件 | 与索引无关 |
| 2 | game-core/contracts 纯度 | 无 `Math.random`/`Date.now` 等 | 与索引无关 |
| 3 | 客户端依赖边界 | 不许跨 feature 摸 repo | 与索引无关 |
| 4 | 服务端依赖边界 | 同上 | 与索引无关 |
| 5 | 模块清单与目录一致 | `module-catalog.json` ↔ 目录 | **只查目录，不查卡** |
| 6 | Asset Bundle 规则 | 分包 | 与索引无关 |
| 7 | 生成物未手改且已同步 | `generated` 目录 | 与索引无关 |
| 8 | 文档 front matter | `id/title/status` **存在性** | **只查"有没有"，不查"对不对"** |
| 9 | 无空目录 | 每目录有 README | **EVD-8101 有目录有内容，只是没 README**——第 9 项查的是 README，不是"证据完整性"，且 `everyDirExplained` 只管"目录被解释"，zip 也算解释？→ 见下 |
| 10 | 占位值 baseline | `items.weight` 等占位数据 | 与索引无关 |

**关于第 9 项的一处实证**：`EVD-8101` 有 zip 文件、没有 README，第 9 项**没报**。
说明它判的是"目录是否有说明"，而 `EVD-8101` 可能因为路径在 `docs/` 下被白名单放过。
→ **`docs-index.test.mjs` 抓到了，`guard` 没抓到。**
**两个闸门覆盖面不重叠，才让 C-07 逃过去。** 这不是守卫写错了，是**没人负责"证据目录结构"这件事**。

---

## 5. 结论

1. **14 项缺陷里，12 项是同一个根因**：`plan-v012` 把"治理"当成了**写文档**，
   而治理的实质是**改数据**（`status` / `superseded_by` / `replans` / `baseline_commit`）。
2. **唯一的 P0 可执行修复**是新增第 11 项守卫（`PD9-01`），
   因为**没有闸门，就有第二次**——`replans[0]` 里 FIX-25 的同型事故已经发生过一次。
3. **修完之后，冲突对从 44 降到 7**（`02 §4`）。这 7 对是真实约束，写进 `07-dag-ownership-budget.md`。
4. **本版不碰任何代码**。上述 C-01~C-13 全部落在 `docs/**`、`.product-development/**`、
   `tools/guard/**`（新增文件）之内，符合"只可写入"的范围。
