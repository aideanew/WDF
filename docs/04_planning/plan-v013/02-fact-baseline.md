---
id: PLAN-V013-02
title: plan-v013 · 事实基线（全部实测，命令可复跑）
status: active
module: planning
owner: hark
created: 2026-10-30
review: 2026-11-13
related: [PLAN-V013-00, PLAN-V013-01, PLAN-V013-03]
---

# 事实基线（2026-10-30 实测）

> **本文件只有两类内容：跑过的命令、命令输出的数字。**
> 任何一条没写的数，本规划里就不许出现。写作时间 2026-10-30 17:10 前后，
> 工作树 `HEAD = 45111c3`，`git status` 仅两项未跟踪（`docs/04_planning/plan-v013/`、`docs/06_validation/evidence/EVD-8101/`）。

---

## 0. 基线快照（一句话）

| 项 | 值 |
|---|---|
| `git rev-parse HEAD` | **`45111c3`** |
| `git rev-parse origin/master` | **`11c7427`** |
| `git rev-list --count origin/master..HEAD` | **4**（本地领先 4 个提交，**未推送**） |
| 分支 | 本地 `main`，远端 `master`（`git branch -vv` 显示 `[origin/master: ahead 4]`） |
| `origin` | `https://github.com/aideanew/WDF.git` |
| 权威索引 `plan_version` | `PLAN-R5` |
| 权威索引 `baseline_commit` | `11c7427`（**写的是 11c7427，实际 HEAD 是 45111c3** → 见 `03` §2.4） |

**四个未推送提交**：

```
45111c3 chore(PD8-01): 记录推送失败（403 + GCM 取消），待用户处理凭据
7b476c0 feat(PD8-01): 治理元数据修复 + 登记 18 张卡 + 双端同步准备
39efe36 test(PD8-18): 测试口径对齐 D-54（items.capacity 归 0）
a8b7ac9 feat(PD8-06): TableName 11→46，46 张配置表全部可读
11c7427 docs(PLAN-R5): ...        ← origin/master 停在这里
```

---

## 1. 任务卡基线

```bash
node -e "const r=require('./.product-development/task-index.json');
const a=r.tasks;const c={};for(const t of a)c[t.status]=(c[t.status]||0)+1;
console.log(r.plan_version, r.baseline_commit, a.length, JSON.stringify(c));"
```

输出：

```
PLAN-R5 11c7427 105 {"DONE":55,"SUPERSEDED":9,"VERIFIED":3,"BLOCKED":12,"TODO":25,"IN_PROGRESS":1}
```

| 指标 | 值 | 说明 |
|---|---|---|
| 总卡数 | **105** | — |
| `DONE` | 55 | 依赖满足（`dependency_satisfied_by`） |
| `VERIFIED` | 3 | 同上 |
| `SUPERSEDED` | 9 | **已有 9 张正确使用该状态**（见 §1.2） |
| `BLOCKED` | 12 | 其中 6 张 BLOCKED-HUMAN（4010/4011/4013/PD2-01/02/03），2 张 v1.1 backlog（TASK-1601/1602），PD7-08/09/17 |
| `TODO` | **25** | 其中 **11 张是僵尸卡**（§3） |
| `IN_PROGRESS` | 1 | `PD8-01`（推送未完成） |
| **实际可派工（去僵尸）** | **15** | 25 − 11 + 1（IN_PROGRESS 仍在跑） |

### 1.1 `TODO` 的 25 张逐条

| id | 标题 | 是否僵尸 |
|---|---|---|
| PD7-02 | raft 规则接线与存档投影（canBuild/applyBuild） | **是** |
| PD7-03 | raft 建造面板 UI（主控独占，改 MainView 第 7 个入口） | **是** |
| PD7-04 | 浮力/承重拒绝的六态落地（3101 零契约改动本地拦截） | **是** |
| PD7-05 | 海域潮汐窗口可见（services/time 最小实现 + 打捞面板一行） | **是** |
| PD7-10 | progression 等级与驶出浅海 | **是** |
| PD7-11 | crew 员工与 power 电力（含离线结算） | **是** |
| PD7-12 | 广告三效果接线（hook_cooldown/offline_double/shop_refresh） | **是** |
| PD7-13 | leaderboard 赛季、称号、省份榜 | **是** |
| PD7-14 | event 赶海整片（S8：start/submit/result） | **是** |
| PD7-15 | island + defense（岛与塔防，允许降级文字结算） | **是** |
| PD7-16 | 轻玩法三件（social + fishing + salvage.claimInfo） | **是** |
| PD8-02 | raft 规则层：canBuild / applyBuild + 存档投影 | 否 |
| PD8-03 | raft 建造面板（主控独占，高难度 UI） | 否 |
| PD8-04 | 浮力/承重拒绝的六态落地 | 否 |
| PD8-05 | 海域潮汐窗口可见 | 否 |
| PD8-07 | 打捞产出表驱动（read drops/shipwrecks + createRng） | 否 |
| PD8-08 | 进度与解锁闸门（levels/unlocks 四路解析 + elapsed） | 否 |
| PD8-09 | 船员与战力（crew_traits 驱动 + elapsed） | 否 |
| PD8-10 | 电力（power）：consumers 驱动 + 无兜底 | 否 |
| PD8-11 | 房间与设施（raft 上层）：rooms/recipes 驱动 | 否 |
| PD8-12 | 钓鱼（fishing）：真实实现 + 权重抽取复用 | 否 |
| PD8-13 | 深海沉船与石油（salvage）：shipwrecks 驱动 | 否 |
| PD8-14 | 占岛与防御（island + defense）：D-58 A′ | 否 |
| PD8-15 | 每日一海与称号（event + leaderboard） | 否 |
| PD8-16 | 聊天 + 合规 UI + 广告 UI（social / compliance / ads） | 否 |

### 1.2 9 张 `SUPERSEDED` 的写法（**这是本版要复制的范式**）

```bash
node -e "const a=require('./.product-development/task-index.json').tasks;
for(const t of a.filter(x=>x.status==='SUPERSEDED'))
  console.log(t.id,'→',t.superseded_by,'|',t.superseded_reason||'(无 reason)');"
```

| id | `superseded_by` | 结论 |
|---|---|---|
| TASK-0202 | `TASK-2102` | ✅ 指向**任务**，且 `execution.evidence` 写了交接说明 |
| TASK-0802 / 0803 / 0902 / 0903 / 1301 / 1502 / 1503 / 4009 | `PD3-01` | ✅ 8 张统一指向「v1.1 范围登记」接管卡 |

**这 9 张证明了两件事，直接推翻了三种"改不动"的辩解**：

1. **机制存在且在用**：`superseded_by` 是**顶层字段**，不为空、可被解析。
2. **纪律有明文**：`replans[3].changed` 写着「依据 D-50 保留在 `superseded_reason` 中——**决策是依据不是接替者**，
   `pd.mjs` 的 `taskMap` 只含任务，填决策必然 8 错」（FIX-36）。
   → 所以 11 张僵尸卡的 `superseded_by` **只能填 `PD8-xx`**，`D-57`/`D-58` 只能进 `superseded_reason`。

---

## 2. 决策基线

```bash
node -e "const d=require('./docs/03_solution/decisions/decision-index.json');
const a=d.decisions||d;const c={};for(const x of a)c[x.status]=(c[x.status]||0)+1;
console.log(a.length,JSON.stringify(c));"
```

输出：`45 {"DECIDED":41,"PROPOSED":4}`

| id | 状态 | 一句话 | 被哪些卡引用 |
|---|---|---|---|
| D-57 | **PROPOSED** | 建一格消耗 1× `item_0072`（筏块），不扣金币 | PD7-02(TODO)、PD7-03(TODO)、**PD8-02(TODO)** |
| D-58 | **PROPOSED** | 6 张空表是否阻塞 / 塔防收敛为 A′ | PD8-14(TODO) |
| D-59 | **PROPOSED** | v1.0 判据取 D-50 还是 `mvp-scope.md §5` | PD8-08(TODO)、PD8-09(TODO) |
| D-60 | **PROPOSED** | 经验 = `items.base_price` 1:1 | **无卡引用**（只出现在 `plan-v012/stage-c-modules/00-stage.md` 正文与 `10-risks-pending.md`） |

> **D-60 是"孤儿决策"**：它从未进入任何卡的 `decisions` 数组。
> 这一条是**对本版前一稿的自我否定**：我在 `00-README §2 判断 3` 里把 D-60 说成"影响 PD8-08 行为口径"，
> 实测 `PD8-08.decisions` 只有 `D-59`，**D-60 不影响任何卡的执行**。已在 `08` 中降级为 COULD。

---

## 3. 僵尸卡基线（11/11）

```bash
node -e "const a=require('./.product-development/task-index.json').tasks;
for(const id of ['PD7-02','PD7-03','PD7-04','PD7-05','PD7-10','PD7-11','PD7-12','PD7-13','PD7-14','PD7-15','PD7-16']){
  const t=a.find(x=>x.id===id);console.log(id,t.status,'|superseded_by=',t.superseded_by,'|',t.card);}"
```

输出（11 行）：**所有 `status=TODO`、所有 `superseded_by=undefined`**。

| 卡 | 应指向 | 依据 |
|---|---|---|
| PD7-02 | `PD8-02` | v012 `00-README.md:106` 明文 |
| PD7-03 | `PD8-03` | 同上 |
| PD7-04 | `PD8-04` | 同上 |
| PD7-05 | `PD8-05` | 同上 |
| PD7-10 | `PD8-08` | 同上（progression） |
| PD7-11 | `PD8-09` + `PD8-10` | 一张拆两张 → 主接替者 `PD8-09`，另一张写进 `superseded_reason` |
| PD7-12 | `PD8-16` | 广告三效果并入 ads UI |
| PD7-13 | `PD8-15` | leaderboard → event+leaderboard 合并卡 |
| PD7-14 | `PD8-15` | event → 同卡 |
| PD7-15 | `PD8-14` | island+defense |
| PD7-16 | `PD8-12` + `PD8-16` | fishing → PD8-12，social → PD8-16，主接替者 `PD8-16` |

**`superseded_by` 是单值还是多值？** 实测 9 张全是**单字符串**（`"TASK-2102"` / `"PD3-01"`）。
→ PD7-11 与 PD7-16 有"一卡拆两卡"的情况，**必须选一个主接替者**，另一张写 `superseded_reason`，
不得擅自把字段改成数组（会让 `pd.mjs` 的 `taskMap` 查表失败，重演 FIX-36 的 8 错）。

---

## 4. 路径冲突基线（**本版最硬的量化证据**）

机械判定口径：把 `allowed_paths` 去掉 `(新建)`、`(仅...)` 后缀与尾部 `/**`，
若 `a === b` 或一方是另一方的父目录 → 判为**重叠**（两卡可改同一批文件）。

```bash
node -e "
const T=require('./.product-development/task-index.json').tasks;
const open=T.filter(t=>['TODO','IN_PROGRESS'].includes(t.status));
const norm=s=>s.replace(/\(新建\)|\(仅.*?\)/g,'').replace(/\/\*\*\$/,'').replace(/\/\$/,'');
const p=[];for(let i=0;i<open.length;i++)for(let j=i+1;j<open.length;j++){
 const A=(open[i].allowed_paths||[]).map(norm),B=(open[j].allowed_paths||[]).map(norm);
 if(A.some(a=>a&&B.some(b=>b&&(a===b||a.startsWith(b+'/')||b.startsWith(a+'/')))))p.push([open[i].id,open[j].id]);}
console.log('重叠对',p.length);"
```

输出：**44**

| 分类 | 对数 | 说明 |
|---|---|---|
| 总数 | **44** | 26 张待办卡两两之间存在路径重叠 |
| **至少一端是僵尸卡** | **37** | 84.1% 的冲突由 11 张僵尸卡贡献 |
| 纯 `PD8` 之间 | **7** | 即使清掉僵尸，仍有 7 对必须串行 |

**纯 PD8 的 7 对**（这些是**真实**的排期约束，不是治理缺陷）：

```
PD8-02↔PD8-11   PD8-03↔PD8-04   PD8-03↔PD8-05   PD8-05↔PD8-07
PD8-13↔PD8-15   PD8-13↔PD8-16   PD8-15↔PD8-16
```

**热点文件（被 ≥3 张待办卡共用）**：

| 卡数 | 路径 |
|---|---|
| **6** | `server/src/gateway/handlers.ts` |
| 4 | `packages/game-core/src/save` |
| 4 | `client/assets/scripts/app/BootController.ts` |
| 3 | `packages/game-core/src/raft` |
| 3 | `client/assets/scripts/features/hook/view/HookPanel.ts` |

> **推论（本版最重要的一条排期规则）**：`handlers.ts` 是 6 张卡的公共写入点。
> 任何"两张卡并行"的想法，只要碰到这 5 个路径就必须串行。
> 这条规则**不依赖僵尸卡是否清理**，因此是本版唯一对未来排期有持续价值的结论。

**自我否定**：我原以为"`allowed_paths` 与 `forbidden_paths` 自相矛盾"也会有问题。实测：

```bash
# allowed 与 forbidden 互相包含的卡
node -e "..."; # 输出：（空）
```

→ **0 张**。这条假设**不成立**，本版不写这条缺陷。

---

## 5. 代码规模基线

```bash
# game-core 各模块行数（排除 generated）
node -e "
const fs=require('fs'),p=require('path');
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=p.join(d,e.name);
 if(e.isDirectory())walk(f,o);else if(/\.ts$/.test(e.name)&&!f.includes('generated'))o.push(f);}return o;}
const by={};for(const f of walk('packages/game-core/src')){const m=f.split(/[\\\\/]/)[3];
 by[m]=(by[m]||0)+fs.readFileSync(f,'utf8').split('\n').length;}
console.log(Object.entries(by).sort((a,b)=>a[1]-b[1]).map(x=>x[1]+' '+x[0]).join('\n'));"
```

输出（19 个模块 / 合计 **681** 行）：

| 行数 | 模块 | 判定 |
|---|---|---|
| 4 | crew / event / fishing / island / power / progression / salvage | **空壳（7 个）** |
| 5 | leaderboard | **空壳（1 个）** |
| 19 | index.ts | 汇总导出 |
| 20 | raft | 只有 2 个孤立纯函数 |
| 20 | sea | — |
| 31 | defense | — |
| 56 | economy | — |
| 56 | inventory | — |
| 63 | common | — |
| 70 | chest | — |
| 71 | save | — |
| 89 | crafting | — |
| 153 | hook | 最厚 |

→ **8 个模块 ≤5 行**（与 `placeholders.baseline` 的登记一致）。

```bash
# 客户端 feature 目录行数
node -e "...walk('client/assets/scripts/features')..."
```

输出（23 个目录 / 合计 **3481** 行）：

| 行数 | 目录 |
|---|---|
| **21** | account / ads / compliance / crew / defense / event / fishing / island / power / progression / raft / salvage / sea / social / telemetry（**15 个**） |
| 224 | guide | 
| 311 | leaderboard |
| 314 | inventory |
| 370 | crafting |
| 414 | hook |
| 437 | settings |
| 461 | economy |
| 635 | chest |

> **修正一个沿用三轮的错误口径**：前几版规划写"≤18 行占位"。实测**恰好 21 行**，无一个 ≤18。
> 21 行的内容形如 `export { RaftModel } from './model/RaftModel';` —— 纯转发，零行为。
> **口径改为「21 行 = 纯转发壳」**，全文替换。

---

## 6. 数值表基线

```bash
node -e "
const fs=require('fs'),p=require('path');const d='game-data/source';
const f=fs.readdirSync(d).filter(x=>x.endsWith('.csv'));let e=[],r=0;
for(const x of f){const L=fs.readFileSync(p.join(d,x),'utf8').trim().split(/\r?\n/);
 if(L.length<=1)e.push(x);else r+=L.length-1;}
console.log(f.length,'空',e.length,e.join(','),'行',r);"
```

输出：

```
46 空 6 drops.csv,explore.csv,limits.csv,phrases.csv,regions.csv,waves.csv 行 568
```

| 指标 | 值 |
|---|---|
| CSV 表总数 | **46** |
| 非空表 | **40** |
| 空表 | **6**（`drops` / `explore` / `limits` / `phrases` / `regions` / `waves`） |
| 数据行合计 | **568**（v012 记录为 322，已增长） |
| `TableName` 联合类型成员数 | **46**（`client/assets/scripts/services/config/tables.ts`，v012 的 11→46 已达成） |

**`drops` 空表带来的直接后果（实测）**：

```
$ cat game-data/source/drops.csv
id,group,item,min,max,weight_bp
```

而 `PD8-07` 的 `objective` 是「打捞面板的掉落**由 drops/shipwrecks 表驱动**」，
其 `execution.note` 自己写着「**drops 为设计空表（D-27 无规则）**」。
→ **同一张卡的"要做什么"与"能不能做"互相矛盾**。这不是我的推断，是卡面两句话的对撞。

---

## 7. 测试基线（**只做定向，不做全量**）

按用户纪律「单张卡只跑它改到的测试」，本版只跑与「上一轮 3 条已知红」相关的 2 个文件：

```bash
node --import ./tools/runtime/register.mjs --test \
  tests/determinism/items-weights.test.mjs tests/contract/docs-index.test.mjs
```

输出摘要：

```
ℹ tests 8   ℹ pass 7   ℹ fail 1
✖ 全部带 README.md 的 EVD 目录都在索引中（无遗漏；EVD-4012 用 baseline.md 除外）
  AssertionError: 仅 EVD-4012 无 README.md（baseline.md），应恰少一个
```

| 测试文件 | 上一轮 | 现在 | 原因 |
|---|---|---|---|
| `tests/determinism/items-weights.test.mjs` | **2 fail** | **5/5 PASS** | 由 `39efe36`（PD8-18）修绿 |
| `tests/contract/docs-index.test.mjs` | 1 fail | **1 fail（未修好）** | **新原因**，见下 |

**新的失败原因（本版挖到的真因）**：`EVD-8101` 目录**只有 zip、没有 README.md**。

```bash
node -e "
const fs=require('fs'),p=require('path');const r='docs/06_validation/evidence';
const ds=fs.readdirSync(r).filter(d=>/^EVD-\d+\$/.test(d));
console.log('EVD 目录',ds.length,'无 README:',ds.filter(d=>!fs.readdirSync(p.join(r,d)).includes('README.md')));"
```

输出：

```
EVD 目录 52 无 README: [ 'EVD-4012', 'EVD-8101' ]
   EVD-4012 -> baseline.md,measure.json     ← 设计如此，测试已豁免
   EVD-8101 -> plan-v012-pd8-未推送-7b476c0.zip   ← 事故
```

时间线证明这条红是**事后打红的**：

| 时刻 | 事件 |
|---|---|
| `39efe36` **15:59:09** | PD8-18 自述「全量 274/274 PASS」 |
| **16:05:34** | `EVD-8101/` 被创建，塞入 3.7MB zip |
| `45111c3` 16:07 | 只记了推送失败的 note，**没发现测试已被打红** |

→ **一个未跟踪的兜底 zip 目录，让一条契约测试转红，并且没人察觉。**
这就是本版命题「治理产物之间要一致」的最鲜活的实例：**产物之间不校验，错误就会静默沉淀**。

**关于"274"这个数**：

```bash
grep -rh "^test(" tests --include="*.test.mjs" | wc -l   # → 267
```

| 来源 | 数 | 说明 |
|---|---|---|
| `PD8-18.execution.note` 自述 | 274/274 | 含 `t.test()` 子测试 |
| 静态计数 `^test(` | **267** | 不含缩进的子测试与 `await t.test` |
| 本版口径 | **267（静态）** | 只说能复跑的数；274 标为 U-2 未核实 |

---

## 8. 验收命令可执行性基线

**`PD8-01` 的四条验收里，两条指向仓库外的绝对路径**：

```json
"cmd": "node C:/Users/EDY/.claude/skills/product-development/scripts/pd.mjs health . | grep -c 错误"
```

实测该文件**存在**于本机：

```
$ ls -la C:/Users/EDY/.claude/skills/product-development/scripts/pd.mjs
-rwxr-xr-x 1 EDY 197121 55919 Oct 28 17:02 .../pd.mjs
```

但它**不在仓库里**：

```bash
git ls-files | grep -c "pd.mjs"   # → 0
find . -name "pd*.mjs" -not -path "./node_modules/*"   # → 无结果
```

| 事实 | 后果 |
|---|---|
| `pd.mjs` 是用户 `~/.claude/skills/` 下的个人技能脚本 | 换机器 / 换 agent / CI 上**必然失败** |
| 索引里另有 `<ABS>/pd.mjs`、`<skill>/scripts/pd.mjs` 等**未替换的占位符** | 这类验收**任何人都跑不出结果** |
| 共 **18 处** `pd.mjs` 引用（`.product-development/task-index.json`） | 治理系统的健康状况**只在本机能验证** |

→ 结论：**「`pd.mjs health` 0 错误」不是一个可交付的验收标准，是一个本机自证。**
本版把它登记为 `D-62`，并给出把校验内化为仓库内脚本的路径（PD9-01）。

**反向自查（避免诬告）**：待办卡的验收引用「不存在的测试文件」的情况只有 1 张：

```bash
# 引用 tests/**.test.mjs 但文件不存在、且不在 allowed_paths 里（即无权新建）
node -e "..."; # → ❌ PD8-11 -> tests/determinism/raft.test.mjs ；1 / 26
```

`PD8-11` 的 `depends_on` 含 `PD8-02`，而 `raft.test.mjs` 正是 PD8-02 的产出 → **属合法的跨卡回归依赖，不是缺陷**。
→ 这条**不计入缺陷清单**。本版不为凑数而编缺陷。

---

## 9. 其余产物基线

| 产物 | 量 | 取证 |
|---|---|---|
| `tests/**/*.test.mjs` | **40** 个文件 | `find tests -name "*.test.mjs"` |
| `docs/**/*.md` | 398 篇 | 见 `01-snapshot.md §5` |
| 守卫项 | **10** 项（9 结构性 + 1 占位值 baseline） | `tools/guard/run-all.mjs:2` 的 `names` 对象 |
| **`npm run guard` 现状** | **修前 3 红 / 修后全绿** | 修前：3 份 EVD 附件缺 front matter（自 `3cd7628`/PD7-09 起）；本版补齐后 `全部守卫通过`（见 `03 §2.14`） |
| `npm run verify` 组成 | `gen && guard && test && typecheck` | `package.json.scripts.verify` |
| `replans` 台账条数 | **5** | `task-index.json.replans` |
| `replans` 最后一条的 `plan_version` | `PLAN-R4` | `replans[4].changed` |
| **索引当前** `plan_version` | **`PLAN-R5`** | 顶层字段 |

→ **`PLAN-R4 → PLAN-R5` 这一代的 replan 记录不存在**。这是 §3 之外的第二处"文本说了、数据没做"，
且它恰好落在"记录规划换代"这个最该留痕的位置上。见 `03-consistency-audit.md §2.3`。

---

## 10. 本文件的自证清单

| 我主张的 | 命令 | 我实际看到 |
|---|---|---|
| HEAD=45111c3 | `git rev-parse --short HEAD` | `45111c3` |
| 领先 4 提交 | `git branch -vv` | `[origin/master: ahead 4]` |
| 105 卡 | §1 | `105` |
| 11 僵尸 | §3 | 11 行全 `TODO` + `undefined` |
| 44 对重叠 | §4 | `44` |
| 8 个空壳模块 | §5 | 7×4 行 + 1×5 行 |
| 15 个 21 行 feature | §5 | 15 行标 `21` |
| 46/6/568 | §6 | 一致 |
| 1 红（docs-index） | §7 | `fail 1` |
| EVD 52 目录 / 2 缺 README | §7 | 一致 |
| `pd.mjs` 不在仓库 | §8 | `git ls-files` → 0 |

**未取证的（不许在本版任何文件里断言）**：

- 全量 274 条测试的真实通过数（拒绝全量回归）。
- `PD8-06` / `PD8-18` 的实现质量（只读了它们的 `execution.note`，未逐行审代码）。
- `nevermeetagain/WDF` 的写权限（只验到 `Repository not found`）。
- 任何"性能""手感""真机表现"类结论（本版不涉及运行时）。
