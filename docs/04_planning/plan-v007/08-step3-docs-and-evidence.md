---
id: PLAN-V007-08
title: 步骤 3 · W2 文档收口（4 处残留 + EVD 三份补录）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V007-07, PLAN-V007-03]
---

# 08 · 步骤 3：W2 文档收口

> **一句话**：代码已经对了，文档还错着 4 处。**矛盾比缺失更危险**——同一份文档里"有了"和"建议加"并存，读者会以为没定。
> 本步不动任何业务代码，只改文档 + 补 3 份 EVD。

## 1. 前置与边界

| 项 | 内容 |
|---|---|
| 前置 | W1 完成（`chest.open` 的错误路径已知，才能一次写对 `error-catalog`） |
| 允许修改 | `docs/03_solution/design/DESIGN-0001-ux-states.md`、`docs/03_solution/decisions/ADR-0011-contract-gaps.md`、`docs/03_solution/data/error-catalog.md`、`docs/04_planning/current-plan.md`、`docs/06_validation/evidence/EVD-{4007,4008,4015}/**`（新建） |
| 禁止修改 | 任何 `packages/**`、`server/**`、`client/**`、`game-data/**` |
| 出口 | V-2.1 ~ V-2.6 全绿 |
| 规模 | S（约 1.5 小时） |

## 2. 原子步骤

### 2.1 【F-23】`DESIGN-0001` 补 2004 行

#### 2.1.1 现状

```bash
grep -c "2004" docs/03_solution/design/DESIGN-0001-ux-states.md   # → 0
```

但 `tests/contract/ux.test.mjs` 的断言文本写着"逐行与 `DESIGN-0001 §2` 一致"——**测试在引用一份不存在的依据**。

#### 2.1.2 改法

在 `§2` 错误码表内，`2003 BANNED` 行之后插入：

```markdown
| 2004 | BIND_TICKET_INVALID | `noPermission` | false | `login`：绑定票据无效（不存在/已过期/已用/自绑/无身份可绑），重试只会再失败，必须重新登录后重新发起绑定 |
```

**注意插入位置**：必须按码值升序（2003 → 2004 → 2101），不要插到 `SESSION_EXPIRED` 之后（会造成 2002 → 2004 → 2003 乱序，这也是当前 `ux.test.mjs` 的 `EXPECTED` 表存在的小瑕疵，可顺手调）。

#### 2.1.3 副作用

改完需确认 `ux.test.mjs` 的 `EXPECTED` 与文档**逐行一致**（值、`retryable`、`next` 三项）。这是 `V-2.1` 的深层判据，不只是"有 2004 这个字符串"。

### 2.2 【F-24】`ADR-0011:24` 修正票据位置笔误

#### 2.2.1 现状

第 24 行：`- \`server/src/modules/save/service.ts:119\`：绑定票据失败复用 \`NOT_LOGGED_IN(2001)\``

#### 2.2.2 真相

票据逻辑在 `server/src/modules/account/service.ts:126-137`（`bindConfirm` 内 5 处 `BindError`）。`save/service.ts` **没有任何票据代码**。

#### 2.2.3 改法

```markdown
- `server/src/modules/account/service.ts:126-137`：绑定票据失败复用 `NOT_LOGGED_IN(2001)`
  （**2026-10-27 更正**：原文误记为 `save/service.ts:119`，该文件内无票据逻辑；
   4015 卡据此写错了目标文件，代码侧已按 `account/service.ts` 实施）
```

**为什么要留更正注记而非直接改掉**：ADR 已 `accepted`，错误事实被"批准"过。留注记才能让后来者知道"曾经错过、错在哪"，否则同样的错会被再犯一次。

#### 2.2.4 判据

```bash
grep -c "save/service.ts" docs/03_solution/decisions/ADR-0011-contract-gaps.md
```

期望：**0**（若更正注记里要引用原文，用反引号包裹并带"原文误记"字样，count 亦为 0 才算干净——建议改写为"原文误记为 save 模块"不出现完整路径）。

### 2.3 【F-25】`error-catalog` 删除旧"建议新增"

#### 2.3.1 现状（同一份文档三个口径）

| 行 | 内容 |
|---|---|
| 27 | `| 2004 | BIND_TICKET_INVALID | AUTH | ...` ← **正式登记** |
| 41 | `> 建议新增 2004 BIND_TICKET_INVALID 精确区分。` ← **旧的"建议"** |
| 43 | `> 缺口解冻（TASK-4015）：已新增 2004...` ← 新注记 |

#### 2.3.2 改法

**删除第 41 行**（它已被第 43 行取代）。若第 41 行所在段落还写了"合同冻结仅 14 码…"等历史，保留历史部分但把"建议新增"句删掉，并接一句：

```markdown
> **（2026-10-27 已解冻）** 上述缺口已关闭，见下方解冻注记与主表 2004 行。
```

#### 2.3.3 判据

```bash
grep -c "建议新增" docs/03_solution/data/error-catalog.md   # 期望 0
```

### 2.4 【F-26】`current-plan` 指向 v007

#### 2.4.1 现状

第 25-27 行仍写"下一阶段切换 = plan-v004…完整规划见 plan-v004/00-snapshot.md"。

#### 2.4.2 改法

在 `# 当前计划` 之后、原 `## 现在处于哪一步` 之前**插入**新段（不改历史段，历史段加"历史留痕"标记）：

```markdown
## 现在处于哪一步（2026-10-27 · plan-v007）

> 本段为当前唯一权威状态。下方各节为历史留痕，数字已过期。

- **当前规划**：`docs/04_planning/plan-v007/`（11 份，从 `00-README.md` 读起）。
- **已完成**：4002 / 4006 / 4007 / 4008 / 4012 / 4015（代码 + 闸门；证据见 W2 补录）。
- **进行中**：4009（开箱全栈，W1）、4020（幂等 rid，W0）。
- **待办**：4010 / 4011（真机 → UNKNOWN）、4013（合规清单）、4016（文档对齐）。
- **闸门**：`npm run guard` 9/9、`npm test` ≥132（原 128，W0/W1 新增）。
- **规划谱系**：v004 已废止、v005/v006 已冻结归档，**执行只看 v007**。
```

并把原 `## 现在处于哪一步` 标题改为 `## 现在处于哪一步（2026-10-26 及更早 · 历史留痕）`。

#### 2.4.3 判据

```bash
grep -c "plan-v007" docs/04_planning/current-plan.md   # ≥1
```

### 2.5 【D-40】EVD 三份补录

#### 2.5.1 五要素模板（每份 `README.md` 必须含）

```markdown
## ① 命令
（逐条可复制，含工作目录）

## ② 输出
（原文粘贴，不改写；关键行标 ✅/❌）

## ③ 时间
2026-10-27（GMT+8）

## ④ commit
（本卡改动对应的 7 位短 hash）

## ⑤ 判定
（逐条对应任务卡的验收编号；UNKNOWN 必须写"缺什么、何时补"）
```

#### 2.5.2 三份的具体内容

| EVD | 命令 | 关键输出 | 判定 |
|---|---|---|---|
| `EVD-4007` | `npm test -- --test-name-pattern="merchant"`；`tsc` 过滤式 | merchant 用例全绿；tsc 0 错 | 逻辑层 **PASS**；运行时 **UNKNOWN**（缺真机，由 4010 统一补） |
| `EVD-4008` | `npm test -- --test-name-pattern="inventory"`；`tsc` | 同上 | 同上；另附"回收三态（成功/3002/1001）"的代码行号走查 |
| `EVD-4015` | `npm test -- --test-name-pattern="15 个错误码"`；`grep -c BIND_TICKET_INVALID` 四处 | 全绿；四处各 ≥1 | **PASS**（契约层无需真机） |

#### 2.5.3 走查清单（无真机时的替代证据，G-07）

每份 EVD 附 `walkthrough.md`，六栏：

| ①文件:行号 | ②代码做了什么 | ③证明哪条验收 | ④依赖的契约/配置 | ⑤**未覆盖的部分（必填）** | ⑥复查命令 |
|---|---|---|---|---|---|

**反作弊**：⑤ 为空且行数 ≥3 的，视为未做走查。

### 2.6 索引重生成 + 闸门

```bash
npm run gen:docs
grep -c "TASK-40" docs/05_execution/task-index.md    # 期望 ≥13
npm run guard
```

> **不要跑完整 `npm run gen`**：会顺带重生成 `config` 与 `catalog`，产生与本步无关的 diff。`gen:docs` 只更新两个索引。

## 3. 验收断言

| # | 断言 | 命令 | 期望 |
|---|---|---|---|
| V-2.1 | `DESIGN-0001` 有 2004 且与测试逐行一致 | `grep -c "2004" docs/03_solution/design/DESIGN-0001-ux-states.md` | ≥1，且 `npm test -- --test-name-pattern="错误码"` 绿 |
| V-2.2 | `ADR-0011` 不再写 `save/service.ts` | `grep -c "save/service.ts" docs/03_solution/decisions/ADR-0011-contract-gaps.md` | **0** |
| V-2.3 | 无"建议新增"表述 | `grep -c "建议新增" docs/03_solution/data/error-catalog.md` | **0** |
| V-2.4 | `current-plan` 指向 v007 且有历史标记 | `grep -c "plan-v007\|历史留痕" docs/04_planning/current-plan.md` | ≥2 |
| V-2.5 | 三份 EVD 五要素齐 | `for d in 4007 4008 4015; do grep -c "## ⑤" docs/06_validation/evidence/EVD-$d/README.md; done` | 各 1 |
| V-2.6 | 索引收录 40xx | `grep -c "TASK-40" docs/05_execution/task-index.md` | ≥13 |
| V-2.7 | `guard` 绿（front matter 全过） | `npm run guard` | `EXIT=0` |

## 4. 提交边界（一次）

```text
docs(4015,4016): 文档收口——DESIGN-0001 补 2004 / ADR-0011 修票据位置 / error-catalog 删旧建议 / current-plan 指向 plan-v007 + EVD 三份补录

- DESIGN-0001-ux-states.md：§2 增 2004 行（码值升序，与 ux.test EXPECTED 逐行一致）
- ADR-0011-contract-gaps.md：票据校验位置 save/service.ts:119 → account/service.ts:126-137（带更正注记）
- error-catalog.md：删第 41 行旧"建议新增"（已被 43 行解冻注记取代）
- current-plan.md：插入 plan-v007 权威段，历史段加"历史留痕"标记
- 06_validation/evidence/EVD-4007|4008|4015/：五要素 + 走查清单
- 05_execution/task-index.md（gen:docs 产物）
```

> **为什么合成一次提交**：这 4 处是同一件事（"4015 收尾不彻底 + 规划未指向"）的四个面，分开提交会出现"改了 3 处还差 1 处"的中间态，而中间态的文档比不改更误导。

## 5. 风险与回退

| 风险 | 概率 | 影响 | 预案 |
|---|---|---|---|
| 改 `current-plan` 误删历史段 | 中 | 丢失决策留痕 | 只插入 + 改标题；正文数字不动 |
| `gen:docs` 覆盖手改索引 | 低 | 冲突 | 索引本就是生成物，手改必被覆盖（设计如此） |
| `grep -c "save/service.ts"` 因注记里保留原路径而不为 0 | 中 | 判据失败 | 注记改写为"原文误记为 save 模块（无票据代码）"，不出现完整路径 |
| EVD 写成"全部通过"无逐条对应 | 中 | 无效证据 | ⑤ 必须逐条映射任务卡验收编号 |
