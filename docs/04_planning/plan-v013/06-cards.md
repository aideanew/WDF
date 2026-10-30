---
id: PLAN-V013-06
title: plan-v013 · 原子任务卡 PD9-01~10（19 字段全集）
status: active
module: planning
owner: hark
created: 2026-10-30
review: 2026-11-13
related: [PLAN-V013-03, PLAN-V013-05, PLAN-V013-07]
---

# 原子任务卡 PD9-01 ~ PD9-10

## 0. 字段口径（先说清"16 字段"这件事）

指令要求每张卡含 16 个必填字段。**本仓权威索引 `.product-development/task-index.json` 的卡对象是 19 个字段**，
它**覆盖并超出**那 16 个——多出的三个（`tests` / `legacy_ids` / `execution`）是本仓 `pd.mjs` 与守卫读取所必需的。
本文件按 **19 字段全集**写，任何一张卡都可**逐字段直接粘贴进 `tasks` 数组**。

```bash
# 现有 105 张卡一定具备的字段集（取并集）
node -e "const T=require('./.product-development/task-index.json').tasks;
const keys=new Set();T.forEach(t=>Object.keys(t).forEach(k=>keys.add(k)));
console.log([...keys].join(' / '));"
```

---

## 1. 卡片总览

| id | 标题 | 切片 | 角色 | 依赖 | 决策 | 交付物类型 |
|---|---|---|---|---|---|---|
| **PD9-01** | 治理一致性守卫（第 11 项）：13 判据 error/warn 分级 | S1 | executor | — | — | **代码（1 个 mjs + 1 个测试）** |
| **PD9-02** | 清 11 张僵尸卡（`SUPERSEDED` + 主接替者） | S1 | executor | PD9-01 | — | 索引数据 |
| **PD9-03** | `replans` 补记 R5/R6 + `baseline_commit` 校准 | S1 | planner | — | — | 索引元数据 |
| **PD9-04** | 裁 `D-57`（建一格消耗）+ `D-58`（空表/塔防 A′） | S2 | planner | PD9-02 | D-57, D-58 | 决策 + 卡状态 |
| **PD9-05** | 裁 `D-59`（v1.0 判据：产品范围 vs 代码里程碑） | S2 | planner | PD9-02 | D-59 | 决策 + glossary |
| **PD9-06** | 裁 `D-60`（经验 = `base_price`）或撤销登记 | S2 | planner | PD9-02 | D-60 | 决策 |
| **PD9-07** | 裁 `D-61`（仓库身份：哪个远端、哪个分支名） | S3 | planner | — | D-61 | 决策 + config |
| **PD9-08** | 推送 4 个悬空提交并校验双端 | S3 | executor | PD9-07 | D-61 | git 操作 |
| **PD9-09** | 修 `EVD-8101` + 测试真值复测落台账 | S4 | tester | PD9-01 | — | 证据 + 台账 |
| **PD9-10** | 指针交接：`current-plan` / `roadmap` 切到 v013 | S5 | planner | PD9-01~09 | — | 文档指针 |

**「零业务代码」声明（精确版，纠正 `00-README §4` 的措辞）**：
10 张卡**全部不触碰** `packages/game-core/**`、`packages/contracts/**`、`client/**`、`server/**`、`game-data/**`、`database/**`。
唯一写代码的是 `PD9-01`，写的是 **`tools/guard/` 下的一个守卫脚本 + 一个测试**——属工具链，非业务。
→ 原措辞"零实现卡"不准确，**改为"零业务代码卡"**。

---

## 2. 卡面

### PD9-01 · 治理一致性守卫（第 11 项）

```json
{
  "id": "PD9-01",
  "title": "治理一致性守卫：13 判据接入 npm run guard（error/warn 两级）",
  "phase": "P9",
  "role": "executor",
  "status": "TODO",
  "detail": "READY",
  "areas": ["tools"],
  "priority": 1,
  "requirements": ["docs/04_planning/plan-v013/03-consistency-audit.md#J1-J13", "docs/04_planning/plan-v013/04-requirement-baseline.md#M-04"],
  "decisions": [],
  "depends_on": [],
  "card": "docs/04_planning/plan-v013/06-cards.md#pd9-01",
  "objective": "把 13 条治理判据（J1~J13）变成一条可复跑命令：在现有索引上先红，修完之后全绿；error 级阻断，warn 级只报告",
  "allowed_paths": ["tools/guard/pd-consistency.mjs(新建)", "tools/guard/run-all.mjs", "package.json", "tests/contract/pd-consistency.test.mjs(新建)"],
  "forbidden_paths": ["packages/**", "client/**", "server/**", "game-data/**", "database/**", "tools/gen/**", ".product-development/task-index.json", "docs/03_solution/decisions/decision-index.json"],
  "acceptance": [
    { "id": "A1", "desc": "新脚本对当前索引报出 C-01(11)/C-13(15)/C-10(44)/C-02(1)/C-03(1) 五类，退出码非 0", "check": { "type": "command", "cmd": "node tools/guard/pd-consistency.mjs ; test $? -ne 0" } },
    { "id": "A2", "desc": "测试文件全 PASS，且对 C-01 做突变验证（把任一僵尸卡改回 SUPERSEDED 后该断言转绿）", "check": { "type": "command", "cmd": "node --import ./tools/runtime/register.mjs --test tests/contract/pd-consistency.test.mjs" } },
    { "id": "A3", "desc": "接入 run-all.mjs：条目数从 10 变 11，输出含「治理产物一致性」", "check": { "type": "command", "cmd": "node tools/guard/run-all.mjs | grep -c 治理产物一致性" } },
    { "id": "A4", "desc": "npm run pd:consistency 可单独调用", "check": { "type": "command", "cmd": "npm run pd:consistency" } },
    { "id": "A5", "desc": "C-11 的 29 张历史 DONE 卡只 warn 不 error（不阻断 guard）", "check": { "type": "manual", "evidence": "review：guard 输出中标 warn 的条数 = 29" } },
    { "id": "A6", "desc": "零业务代码改动", "check": { "type": "command", "cmd": "git diff --stat -- packages/ client/ server/ game-data/ database/" } }
  ],
  "tests": { "targeted": ["tests/contract/pd-consistency.test.mjs"] },
  "legacy_ids": [],
  "execution": {
    "status": "TODO",
    "note": "13 判据的定义与取证命令全部在 03-consistency-audit.md §0.3~§2.13，实施时逐条搬命令，不要重新设计判据。分级：C-01/C-10/C-13/C-02/C-03/C-06 为 error；C-04/C-05/C-11/C-12 为 warn。C-07/C-08/C-09 需读文档正文，只做 warn。"
  }
}
```

**为什么这张卡是 P0**：没有它，`PD9-02` 修完 11 张卡之后，第 12 张会照样诞生。
凭据：`replans[0]` 里 FIX-25 已记录同型事故（`next` 误派工），**这是第二次**。

---

### PD9-02 · 清 11 张僵尸卡

```json
{
  "id": "PD9-02",
  "title": "11 张僵尸卡置 SUPERSEDED + superseded_by 指向 PD8 接替卡",
  "phase": "P9",
  "role": "executor",
  "status": "TODO",
  "detail": "READY",
  "areas": ["governance"],
  "priority": 2,
  "requirements": ["docs/04_planning/plan-v012/00-README.md#L106", "docs/04_planning/plan-v013/03-consistency-audit.md#C-01"],
  "decisions": [],
  "depends_on": ["PD9-01"],
  "card": "docs/04_planning/plan-v013/06-cards.md#pd9-02",
  "objective": "v012 声明的「PD7-02~05 / PD7-10~16 由 PD8 接替」在索引里落地：11 张卡 status→SUPERSEDED、superseded_by 指向 PD8 任务 id、superseded_reason 记下拆分与依据",
  "allowed_paths": [".product-development/task-index.json"],
  "forbidden_paths": ["docs/04_planning/plan-v011/**", "docs/04_planning/plan-v012/**", "packages/**", "client/**", "server/**"],
  "acceptance": [
    { "id": "A1", "desc": "11 张卡 status 均为 SUPERSEDED", "check": { "type": "command", "cmd": "node -e \"const T=require('./.product-development/task-index.json').tasks;const ids=['PD7-02','PD7-03','PD7-04','PD7-05','PD7-10','PD7-11','PD7-12','PD7-13','PD7-14','PD7-15','PD7-16'];const bad=ids.filter(i=>T.find(t=>t.id===i).status!=='SUPERSEDED');if(bad.length){console.error(bad);process.exit(1)}\"" } },
    { "id": "A2", "desc": "superseded_by 全部非空且指向真实存在的任务 id（不得填决策 id，FIX-36）", "check": { "type": "command", "cmd": "node -e \"const T=require('./.product-development/task-index.json').tasks;const ids=['PD7-02','PD7-03','PD7-04','PD7-05','PD7-10','PD7-11','PD7-12','PD7-13','PD7-14','PD7-15','PD7-16'];const bad=ids.filter(i=>{const t=T.find(x=>x.id===i);return !t.superseded_by||!T.find(x=>x.id===t.superseded_by)});if(bad.length){console.error(bad);process.exit(1)}\"" } },
    { "id": "A3", "desc": "superseded_reason 全部非空，且含 DN id 时是写进 reason 而不是 superseded_by", "check": { "type": "manual", "evidence": "review 11 条 reason" } },
    { "id": "A4", "desc": "待办卡路径重叠对从 44 降到 7", "check": { "type": "command", "cmd": "node tools/guard/pd-consistency.mjs --report J10 | grep -c 'overlap'" } },
    { "id": "A5", "desc": "11 张卡的 card 字段不变（仍指向 plan-v011/**，保留历史归属）", "check": { "type": "command", "cmd": "git diff .product-development/task-index.json | grep -c 'plan-v011/stage-'" } },
    { "id": "A6", "desc": "卡面文档零改动", "check": { "type": "command", "cmd": "git status --porcelain docs/04_planning/plan-v011/" } }
  ],
  "tests": { "targeted": ["tests/contract/pd-consistency.test.mjs"] },
  "legacy_ids": [],
  "execution": {
    "status": "TODO",
    "note": "映射表见 02-fact-baseline.md §3。注意 PD7-11→PD8-09（主）+PD8-10（reason）、PD7-16→PD8-16（主）+PD8-12（reason），superseded_by 是单字符串，不得改数组。"
  }
}
```

---

### PD9-03 · `replans` 补记 R5/R6 + `baseline_commit` 校准

```json
{
  "id": "PD9-03",
  "title": "replans 补记 PLAN-R4→R5 与 R5→R6，baseline_commit 校准到实际 HEAD",
  "phase": "P9",
  "role": "planner",
  "status": "TODO",
  "detail": "READY",
  "areas": ["governance"],
  "priority": 3,
  "requirements": ["docs/04_planning/plan-v013/03-consistency-audit.md#C-02", "docs/04_planning/plan-v013/03-consistency-audit.md#C-03"],
  "decisions": [],
  "depends_on": [],
  "card": "docs/04_planning/plan-v013/06-cards.md#pd9-03",
  "objective": "索引里两次换代（v011→v012、v012→v013）都有账可查；baseline_commit 不再指向一个不是 HEAD 的提交",
  "allowed_paths": [".product-development/task-index.json"],
  "forbidden_paths": ["docs/04_planning/plan-v012/**", "docs/04_planning/plan-v011/**"],
  "acceptance": [
    { "id": "A1", "desc": "replans 条数从 5 变 7，最后两条的 changed 含 PLAN-R4→PLAN-R5 与 PLAN-R5→PLAN-R6", "check": { "type": "command", "cmd": "node -e \"const r=require('./.product-development/task-index.json');if(r.replans.length!==7){console.error(r.replans.length);process.exit(1)}\"" } },
    { "id": "A2", "desc": "plan_version 为 PLAN-R6", "check": { "type": "command", "cmd": "node -e \"const r=require('./.product-development/task-index.json');if(r.plan_version!=='PLAN-R6'){console.error(r.plan_version);process.exit(1)}\"" } },
    { "id": "A3", "desc": "baseline_commit 等于当日实际 HEAD", "check": { "type": "command", "cmd": "node -e \"const r=require('./.product-development/task-index.json');const h=require('child_process').execSync('git rev-parse HEAD').toString().trim();if(r.baseline_commit!==h){console.error(r.baseline_commit,h);process.exit(1)}\"" } },
    { "id": "A4", "desc": "R5 的 reason 引用 plan-v012/00-README.md，R6 的引用 plan-v013/00-README.md", "check": { "type": "manual", "evidence": "review 两条 reason" } }
  ],
  "tests": { "targeted": [] },
  "legacy_ids": [],
  "execution": {
    "status": "TODO",
    "note": "R5 的 at 写 2026-10-30（v012 实际落盘日），after_phase 写 P8。补记不是篡改：事件发生过，缺的是记录。"
  }
}
```

---

### PD9-04 · 裁 `D-57` + `D-58`

```json
{
  "id": "PD9-04",
  "title": "裁决 D-57（建一格消耗 item_0072）与 D-58（空表/塔防收敛 A′）",
  "phase": "P9",
  "role": "planner",
  "status": "TODO",
  "detail": "READY",
  "areas": ["product", "game-core"],
  "priority": 4,
  "requirements": ["docs/04_planning/plan-v013/04-requirement-baseline.md#K-02", "docs/04_planning/plan-v013/04-requirement-baseline.md#K-03"],
  "decisions": ["D-57", "D-58"],
  "depends_on": ["PD9-02"],
  "card": "docs/04_planning/plan-v013/06-cards.md#pd9-04",
  "objective": "两条挂了两代的产品口径被正式裁定：PROPOSED→DECIDED，decided_by/decided_at 填实；applies_to 与对应卡的 decisions 双向对称；PD8-02/PD8-03/PD8-14 的阻塞标记随之更新",
  "allowed_paths": ["docs/03_solution/decisions/decision-index.json", ".product-development/task-index.json"],
  "forbidden_paths": ["packages/**", "client/**", "server/**", "game-data/**", "docs/01_product/**"],
  "acceptance": [
    { "id": "A1", "desc": "D-57 与 D-58 的 status 均为 DECIDED，decided_by / decided_at 非空", "check": { "type": "command", "cmd": "node -e \"const d=require('./docs/03_solution/decisions/decision-index.json').decisions;for(const i of ['D-57','D-58']){const x=d.find(y=>y.id===i);if(x.status!=='DECIDED'||!x.decided_by||!x.decided_at){console.error(i);process.exit(1)}}\"" } },
    { "id": "A2", "desc": "PD8-02 / PD8-03 的 decisions 含 D-57；PD8-14 含 D-58", "check": { "type": "command", "cmd": "node -e \"const T=require('./.product-development/task-index.json').tasks;const g=i=>T.find(t=>t.id===i);const bad=[];if(!g('PD8-02').decisions.includes('D-57'))bad.push('PD8-02');if(!g('PD8-03').decisions.includes('D-57'))bad.push('PD8-03');if(!g('PD8-14').decisions.includes('D-58'))bad.push('PD8-14');if(bad.length){console.error(bad);process.exit(1)}\"" } },
    { "id": "A3", "desc": "PD8-02 的 execution.note 不再含「D-57 未裁」字样", "check": { "type": "command", "cmd": "node -e \"const t=require('./.product-development/task-index.json').tasks.find(x=>x.id==='PD8-02');if(/D-57 未裁/.test(t.execution.note||'')){console.error('still blocked');process.exit(1)}\"" } },
    { "id": "A4", "desc": "J13 单向链接数从 15 下降（至少消掉 D-57 的 2 条与 D-58 的 1 条）", "check": { "type": "command", "cmd": "node tools/guard/pd-consistency.mjs --report J13 | grep -c 'one-way'" } },
    { "id": "A5", "desc": "零代码改动", "check": { "type": "command", "cmd": "git diff --stat -- packages/ client/ server/ game-data/" } }
  ],
  "tests": { "targeted": [] },
  "legacy_ids": [],
  "execution": {
    "status": "TODO",
    "note": "本卡只落裁决，不实现。D-57 的选项：①消耗 1×item_0072 不扣金币（现方案，推荐）②消耗金币 ③两者都要。D-58 的选项：①A′ 现金方案（推荐，已由 v012 收敛）②全部返 unknown ③等数值补齐再做。选项表与后果见 08-metrics-risks.md §3。"
  }
}
```

---

### PD9-05 · 裁 `D-59`（v1.0 判据）

```json
{
  "id": "PD9-05",
  "title": "裁决 D-59：区分「v1.0 产品范围（16 项）」与「v1.0 代码里程碑（10 模块）」",
  "phase": "P9",
  "role": "planner",
  "status": "TODO",
  "detail": "READY",
  "areas": ["governance", "product"],
  "priority": 5,
  "requirements": ["docs/04_planning/plan-v013/04-requirement-baseline.md#K-01", "docs/01_product/mvp-scope.md#§5", "docs/00_governance/glossary.md#L42"],
  "decisions": ["D-59"],
  "depends_on": ["PD9-02"],
  "card": "docs/04_planning/plan-v013/06-cards.md#pd9-05",
  "objective": "消除三套 v1.0 口径的互斥：产品范围取 mvp-scope §5 的 16 项，代码里程碑取 glossary/ D-50 的 10 模块，两个词各自加限定语，使「v1.0 完成了吗」有唯一答案",
  "allowed_paths": ["docs/03_solution/decisions/decision-index.json", "docs/00_governance/glossary.md", ".product-development/task-index.json"],
  "forbidden_paths": ["docs/01_product/mvp-scope.md", "packages/**", "client/**", "server/**"],
  "acceptance": [
    { "id": "A1", "desc": "D-59 status=DECIDED 且 decided_by 为 user（此条必须用户拍板，不得代裁）", "check": { "type": "command", "cmd": "node -e \"const x=require('./docs/03_solution/decisions/decision-index.json').decisions.find(y=>y.id==='D-59');if(x.status!=='DECIDED'||x.decided_by!=='user'){console.error(x.status,x.decided_by);process.exit(1)}\"" } },
    { "id": "A2", "desc": "glossary 同时含「v1.0 产品范围」与「v1.0 代码里程碑」两条术语且互不矛盾", "check": { "type": "command", "cmd": "grep -c 'v1\\.0 产品范围\\|v1\\.0 代码里程碑' docs/00_governance/glossary.md" } },
    { "id": "A3", "desc": "PD8-10/11/12/13/14/15/16 的 decisions 均含 D-59（消掉 7 条单向链接）", "check": { "type": "command", "cmd": "node -e \"const T=require('./.product-development/task-index.json').tasks;const bad=['PD8-10','PD8-11','PD8-12','PD8-13','PD8-14','PD8-15','PD8-16'].filter(i=>!T.find(t=>t.id===i).decisions.includes('D-59'));if(bad.length){console.error(bad);process.exit(1)}\"" } },
    { "id": "A4", "desc": "mvp-scope.md 零改动（本卡只加限定语，不改产品范围）", "check": { "type": "command", "cmd": "git diff --stat -- docs/01_product/" } }
  ],
  "tests": { "targeted": [] },
  "legacy_ids": [],
  "execution": {
    "status": "TODO",
    "note": "推荐方案见 04-requirement-baseline.md §5 K-01：不改任何一份文档的范围内容，只在 glossary 加两条术语 + 各自限定语。这是唯一「两边都不用改」的解法。"
  }
}
```

---

### PD9-06 · 裁 `D-60` 或撤销登记

```json
{
  "id": "PD9-06",
  "title": "处置 D-60（经验=items.base_price）：裁决、或撤销登记并说明",
  "phase": "P9",
  "role": "planner",
  "status": "TODO",
  "detail": "READY",
  "areas": ["product", "game-core"],
  "priority": 6,
  "requirements": ["docs/04_planning/plan-v013/03-consistency-audit.md#C-13"],
  "decisions": ["D-60"],
  "depends_on": ["PD9-02"],
  "card": "docs/04_planning/plan-v013/06-cards.md#pd9-06",
  "objective": "让 D-60 有终态：要么 DECIDED 并写进 PD8-08.decisions，要么 SUPERSEDED 并说明为何不做；消灭这条孤立决策",
  "allowed_paths": ["docs/03_solution/decisions/decision-index.json", ".product-development/task-index.json"],
  "forbidden_paths": ["packages/**", "client/**", "server/**", "game-data/**"],
  "acceptance": [
    { "id": "A1", "desc": "D-60 不再是 PROPOSED", "check": { "type": "command", "cmd": "node -e \"const x=require('./docs/03_solution/decisions/decision-index.json').decisions.find(y=>y.id==='D-60');if(x.status==='PROPOSED'){console.error('still proposed');process.exit(1)}\"" } },
    { "id": "A2", "desc": "若 DECIDED：PD8-08.decisions 含 D-60；若 SUPERSEDED：decisions 数组清掉该引用，二者不可同时", "check": { "type": "command", "cmd": "node -e \"const d=require('./docs/03_solution/decisions/decision-index.json').decisions.find(y=>y.id==='D-60');const t=require('./.product-development/task-index.json').tasks.find(x=>x.id==='PD8-08');const has=t.decisions.includes('D-60');if((d.status==='DECIDED')!==has){console.error('mismatch',d.status,has);process.exit(1)}\"" } }
  ],
  "tests": { "targeted": [] },
  "legacy_ids": [],
  "execution": {
    "status": "TODO",
    "note": "推荐 DECIDED（成本最低：base_price 已在表里，1:1 直接可用）。撤销会让 PD8-08 的 expGain 无口径，反而更贵。"
  }
}
```

---

### PD9-07 · 裁 `D-61`（仓库身份）

```json
{
  "id": "PD9-07",
  "title": "裁决 D-61：推送目标仓库与分支名（nevermeetagain vs aideanew；main vs master）",
  "phase": "P9",
  "role": "planner",
  "status": "TODO",
  "detail": "READY",
  "areas": ["governance"],
  "priority": 7,
  "requirements": ["docs/04_planning/plan-v013/08-metrics-risks.md#D-61", "docs/04_planning/plan-v013/00-README.md#判断4"],
  "decisions": ["D-61"],
  "depends_on": [],
  "card": "docs/04_planning/plan-v013/06-cards.md#pd9-07",
  "objective": "把「往哪推」从四个互相矛盾的事实变成一条明文：一个仓库 URL、一个分支名；写进 config.json 与 decision-index，此后每次推送都按它校验",
  "allowed_paths": ["docs/03_solution/decisions/decision-index.json", ".product-development/config.json"],
  "forbidden_paths": ["docs/05_execution/**", "packages/**", "client/**", "server/**"],
  "acceptance": [
    { "id": "A1", "desc": "D-61 status=DECIDED 且 decided_by=user", "check": { "type": "command", "cmd": "node -e \"const x=require('./docs/03_solution/decisions/decision-index.json').decisions.find(y=>y.id==='D-61');if(x.status!=='DECIDED'||x.decided_by!=='user'){console.error(x.status);process.exit(1)}\"" } },
    { "id": "A2", "desc": "config.json 的 git.main_branch 与实际远端分支名一致", "check": { "type": "command", "cmd": "node -e \"const c=require('./.product-development/config.json');const out=require('child_process').execSync('git ls-remote --heads origin').toString();if(!out.includes('refs/heads/'+c.git.main_branch)){console.error(c.git.main_branch);process.exit(1)}\"" } },
    { "id": "A3", "desc": "本地分支名与 config 的 main_branch 一致（或明确记录例外与原因）", "check": { "type": "manual", "evidence": "review：现本地 main / 远端 master，需在 D-61 决策正文里写明映射关系" } }
  ],
  "tests": { "targeted": [] },
  "legacy_ids": [],
  "execution": {
    "status": "TODO",
    "note": "禁止擅自改 origin（N-02）。四选项见 08-metrics-risks.md §3 D-61。本卡只落决策，推送在 PD9-08。"
  }
}
```

---

### PD9-08 · 推送 4 个悬空提交并校验双端

```json
{
  "id": "PD9-08",
  "title": "按 D-61 推送 4 个悬空提交 + plan-v013，并校验双端 SHA 相等",
  "phase": "P9",
  "role": "executor",
  "status": "TODO",
  "detail": "READY",
  "areas": ["governance"],
  "priority": 8,
  "requirements": ["docs/04_planning/plan-v013/00-README.md#判断4", "docs/04_planning/plan-v013/05-slices.md#S3"],
  "decisions": ["D-61"],
  "depends_on": ["PD9-07", "PD9-09", "PD9-03"],
  "card": "docs/04_planning/plan-v013/06-cards.md#pd9-08",
  "objective": "origin 侧与本地 HEAD 完全一致；不新增任何分支；凭据不出现在任何日志或提交里",
  "allowed_paths": [],
  "forbidden_paths": ["packages/**", "client/**", "server/**", "game-data/**"],
  "acceptance": [
    { "id": "A1", "desc": "origin/master..HEAD 提交数为 0", "check": { "type": "command", "cmd": "test \"$(git rev-list --count origin/master..HEAD)\" = \"0\"" } },
    { "id": "A2", "desc": "远端分支 SHA == 本地 HEAD", "check": { "type": "command", "cmd": "test \"$(git ls-remote origin refs/heads/master | cut -f1)\" = \"$(git rev-parse HEAD)\"" } },
    { "id": "A3", "desc": "未新增分支（本地与远端各只有一条）", "check": { "type": "command", "cmd": "test \"$(git branch | wc -l)\" = \"1\" && test \"$(git ls-remote --heads origin | wc -l)\" = \"1\"" } },
    { "id": "A4", "desc": "令牌未入库且提交里无完整 github_pat_ 匹配", "check": { "type": "command", "cmd": "test \"$(git ls-files | grep -c git-pat)\" = \"0\" && test \"$(git log --all -p | grep -c 'github_pat_[A-Za-z0-9]\\{20,\\}')\" = \"0\"" } },
    { "id": "A5", "desc": "远端可见 plan-v013 目录", "check": { "type": "command", "cmd": "git ls-tree -r --name-only origin/master | grep -c 'docs/04_planning/plan-v013/'" } }
  ],
  "tests": { "targeted": [] },
  "legacy_ids": [],
  "execution": {
    "status": "TODO",
    "note": "推送命令必须 git -c http.version=HTTP/1.1 push <url> HEAD:master（本地 main / 远端 master）。输出先重定向到文件，再用 sed 遮蔽凭据。失败即停，不硬试认证方案。"
  }
}
```

---

### PD9-09 · 修 `EVD-8101` + 测试真值复测落台账

```json
{
  "id": "PD9-09",
  "title": "EVD-8101 补 README 并移出 zip；定向复测 2 个文件并把真值写进 test-ledger",
  "phase": "P9",
  "role": "tester",
  "status": "TODO",
  "detail": "READY",
  "areas": ["test", "governance"],
  "priority": 9,
  "requirements": ["docs/04_planning/plan-v013/03-consistency-audit.md#C-07", "docs/04_planning/plan-v013/03-consistency-audit.md#C-12"],
  "decisions": [],
  "depends_on": ["PD9-01"],
  "card": "docs/04_planning/plan-v013/06-cards.md#pd9-09",
  "objective": "docs-index.test.mjs 从 1 红转 0 红，且原因是「证据目录补齐」而不是「放宽断言」；test-ledger 新增一条含 commit、命令、pass/fail 的实测记录",
  "allowed_paths": ["docs/06_validation/evidence/EVD-8101/**", "docs/00_governance/document-index.md", "docs/06_validation/pd/test-ledger.json"],
  "forbidden_paths": ["tests/**", "tools/gen/docs-index.mjs", "packages/**", "client/**", "server/**"],
  "acceptance": [
    { "id": "A1", "desc": "EVD-8101 有 README.md 且 front matter 含 id/title/status", "check": { "type": "command", "cmd": "grep -c '^id:\\|^title:\\|^status:' docs/06_validation/evidence/EVD-8101/README.md" } },
    { "id": "A2", "desc": "EVD 目录中缺 README 的只剩 EVD-4012（设计豁免）", "check": { "type": "command", "cmd": "node -e \"const fs=require('fs'),p=require('path');const r='docs/06_validation/evidence';const d=fs.readdirSync(r).filter(x=>/^EVD-\\d+$/.test(x));const no=d.filter(x=>!fs.readdirSync(p.join(r,x)).includes('README.md'));if(no.length!==1||no[0]!=='EVD-4012'){console.error(no);process.exit(1)}\"" } },
    { "id": "A3", "desc": "定向两文件 8/8 PASS", "check": { "type": "command", "cmd": "node --import ./tools/runtime/register.mjs --test tests/determinism/items-weights.test.mjs tests/contract/docs-index.test.mjs" } },
    { "id": "A4", "desc": "测试代码与规则代码零改动", "check": { "type": "command", "cmd": "git diff --stat -- tests/ tools/gen/docs-index.mjs" } },
    { "id": "A5", "desc": "test-ledger 新增记录含 commit、cmd、pass、fail 四个字段", "check": { "type": "command", "cmd": "node -e \"const l=require('./docs/06_validation/pd/test-ledger.json');const a=l.records||l;const last=a[a.length-1];if(!last.commit||!last.cmd||last.pass===undefined||last.fail===undefined){console.error(JSON.stringify(last));process.exit(1)}\"" } }
  ],
  "tests": { "targeted": ["tests/determinism/items-weights.test.mjs", "tests/contract/docs-index.test.mjs"] },
  "legacy_ids": [],
  "execution": {
    "status": "TODO",
    "note": "zip 移出仓库到 docs/06_validation/evidence/EVD-8101/ 之外（或改名为 .zip.sha256 只留校验和），README 里写明原文件名、大小、SHA256、存放位置。禁止改测试豁免（见 05-slices.md S4 反证）。"
  }
}
```

---

### PD9-10 · 指针交接

```json
{
  "id": "PD9-10",
  "title": "current-plan 切到 plan-v013、roadmap 补 v011/v012/v013 行、plan-v012 标 superseded",
  "phase": "P9",
  "role": "planner",
  "status": "TODO",
  "detail": "READY",
  "areas": ["governance"],
  "priority": 10,
  "requirements": ["docs/04_planning/plan-v013/03-consistency-audit.md#C-04", "docs/04_planning/plan-v013/03-consistency-audit.md#C-05"],
  "decisions": [],
  "depends_on": ["PD9-01", "PD9-02", "PD9-03", "PD9-04", "PD9-05", "PD9-06", "PD9-07", "PD9-08", "PD9-09"],
  "card": "docs/04_planning/plan-v013/06-cards.md#pd9-10",
  "objective": "下一个打开仓库的人第一眼看到「现在做 plan-v013，第一刀是 PD9-01」，且 current-plan 里的每个数字都能在索引里对上",
  "allowed_paths": ["docs/04_planning/current-plan.md", "docs/04_planning/roadmap.md", "docs/04_planning/plan-v012/00-README.md"],
  "forbidden_paths": ["docs/04_planning/plan-v011/**", "docs/04_planning/plan-v012/0[1-9]-*.md", ".product-development/task-index.json"],
  "acceptance": [
    { "id": "A1", "desc": "current-plan 顶部指向 plan-v013", "check": { "type": "command", "cmd": "grep -c 'plan-v013' docs/04_planning/current-plan.md" } },
    { "id": "A2", "desc": "current-plan 不再出现过期基线 8fbb57b", "check": { "type": "command", "cmd": "test \"$(grep -c '8fbb57b' docs/04_planning/current-plan.md)\" = \"0\"" } },
    { "id": "A3", "desc": "roadmap 含 v011 v012 v013 三行", "check": { "type": "command", "cmd": "test \"$(grep -c 'plan-v011\\|plan-v012\\|plan-v013' docs/04_planning/roadmap.md)\" -ge \"3\"" } },
    { "id": "A4", "desc": "plan-v012/00-README.md 的 status 改为 superseded 且指向 v013", "check": { "type": "command", "cmd": "grep -c '^status: superseded' docs/04_planning/plan-v012/00-README.md" } },
    { "id": "A5", "desc": "gen:docs 后 document-index 含 plan-v013 全部文件", "check": { "type": "command", "cmd": "npm run gen:docs && grep -c 'plan-v013/' docs/00_governance/document-index.md" } }
  ],
  "tests": { "targeted": [] },
  "legacy_ids": [],
  "execution": {
    "status": "TODO",
    "note": "顺序必须最后：前面 9 张卡做完，current-plan 里写的出口才成立。plan-v012 只改 00-README 的 status，不改其余 16 份（它们是被接续的历史证据）。"
  }
}
```

---

## 3. 字段完备性自检

| 字段 | PD9-01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| id / title / phase / role / status / detail | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| areas / priority | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| requirements / decisions / depends_on | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| card / objective | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| allowed_paths / forbidden_paths | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅（空数组=零写文件） | ✅ | ✅ |
| acceptance（≥1，含 check.type） | ✅×6 | ✅×6 | ✅×4 | ✅×5 | ✅×4 | ✅×2 | ✅×3 | ✅×5 | ✅×5 | ✅×5 |
| tests.targeted / legacy_ids / execution | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**合计 45 条验收，其中 `type=command` 39 条（86.7%）、`type=manual` 6 条。**
每一条 `cmd` 都只依赖仓库内文件 + 本机 `node`/`git`，**没有一条引用 `~/.claude/**`**（这是对 C-06 的直接修复）。

```bash
# 自检：本文件中「以仓外绝对盘符路径开头的验收命令」条数
# 口径：匹配 JSON 里 "cmd": "node 后紧跟 <盘符>:/ 的情形
grep -c '"cmd": "node [A-Z]:/' docs/04_planning/plan-v013/06-cards.md
# 期望：0（本行自身虽然含该模式，但 [A-Z] 命中的是 `[` 而非字母，故不自匹配）
```
