---
id: PLAN-V011-10
title: plan-v011 · 10 风险 / 未决 / 已裁决（D-54~D-56）
status: active
module: planning
owner: hark
created: 2026-10-29
review: 2026-11-12
related: [PLAN-V011-03, PLAN-V011-11]
---

# 10 · 风险 / 未决 / 已裁决

> **状态变更（2026-10-29）**：D-54 / D-55 / D-56 三条**已由用户裁决**，`decision-index.json` 中
> `status=DECIDED`、`decided_by=user`、`decided_at=2026-10-29`。本节保留原始选项与推理过程作为
> **决策留痕**（谁在什么信息下做了什么选择），不再作为"待办"。三条裁决的即时后果见 **§1.4**。

## 1. 已裁决（原文保留，供后续追溯）

### D-54 · 扩筏归属 + 浮力语义（**已裁：Q1=B、Q2=A**）

**一句话**：v1.0 出货到底含不含"扩筏"？如果含，浮力按什么算？

| 事实 | 证据 |
|---|---|
| v1.0 口径（R-6）写的是五环，含"扩" | `glossary.md:41`；`current-plan.md:25` |
| `raft` 不在 D-50 的 v1.1 移出清单里 | `decision-index.json` D-50 → `detail.modules_v11` 13 项逐一可查，无 `raft` |
| 但客户端 `raft` 是 18 行空壳，主界面无入口 | `02 §1.1`、`02 §1.2` |
| `raft_tiles` 只有 1 行；`items.capacity` 103 行为 0，3 个非零全是 `chest` 类 | `02 §1.8` |

**两问必须一起答**：

| 问 | 选项 | 后果 |
|---|---|---|
| **Q1 v1.0 含不含扩筏 UI？** | **A. 不含** → 五环口径改回"四环"，A 阶段整段降级为 v1.1 | 好处：v1.0 立刻可宣称完成；坏处：C2（`mvp-scope.md:16`「核心工作必须最先证明」）被删掉一环，"捞到的材料除了卖没有第二用途" |
| | **B. 含**（**本版默认按此排期**） | 好处：六层齐全模块从 7 → 8，C2 真的成立；代价：A 阶段 2.5 天 + 主控 1 张 opus UI 卡 |
| **Q2 浮力怎么算？** | **A. 只看 `raft_tiles.capacity`** → `items.capacity` 全归 0 并从 `items` schema 移除 | 语义干净：只有"船体地块"提供浮力。改动小（1 个字段 + 1 张表） |
| | **B. = 船体材料 `items.capacity` 之和 + `raft_tiles` 加成** | 需要为 17 类 `facility` / 19 类 `material` 逐项给容量 —— **设计源没给，必须补值**（自编=违规） |
| | **C. 只把 `chest` 的 20/40/60 改成 0，其余不动** | 最小改动，但"箱子给浮力"这个问题没被回答，下一个人会再问一次 |

**我的建议（不是决定）**：**Q1 = B、Q2 = A**。
理由：Q1 选 A 会让"捞到的材料无处可用"，玩家 15 分钟后就只剩"卖"，而 `mvp-scope.md:16` 把 C2 定为必须先证明的核心；
Q2 选 A 是唯一**不需要补任何新数值**就能自洽的口径，其余两个选项都要新增设计输入。

**✅ 用户裁决（2026-10-29）**：`Q1 = B`（v1.0 含扩筏 UI）、`Q2 = A`（浮力只看 `raft_tiles.capacity`）。
采纳建议原封不动。登记为 `decision-index.json` **D-54 → DECIDED**。

---

### D-55 · 推送目标与凭据（**已裁：origin 重指 aideanew/WDF；token 轮换由用户执行**）

| 事实 | 证据 |
|---|---|
| 远端是 `https://github.com/nevermeetagain/WDF.git`，本地 `main` upstream = `origin/master`，二者 SHA 相同（`4e572fa`） | `01 §1` |
| 本次 `git fetch origin` **失败**：`fatal: could not read Username for 'https://github.com': terminal prompts disabled` | `01 §F-1` |
| 历史上曾成功推送（`origin/master` HEAD 就是我的提交 `4e572fa`），说明凭据曾存在但**未持久化** | `git log origin/master` |

**需要你给**：一个对 `nevermeetagain/WDF` 有写权限的 fine-grained PAT（或确认已有凭据管理器可用）。
**若拿不到**：按你的指令"无法连接到 Github 则输出 zip 规划包"，我会把 `docs/04_planning/plan-v011/` + 17 份卡面打包成 zip 交付，并说明未推送。

#### 已做的探测（2026-10-29 实测，三条命令逐条给结果）

| # | 探测 | 结果 | 含义 |
|---|---|---|---|
| 1 | `git ls-remote https://github.com/nevermeetagain/WDF.git`（匿名） | `fatal: could not read Username`（要求凭据） | 该仓库**非公开**（私有或不存在） |
| 2 | `git ls-remote https://oauth2:<你的PAT>@github.com/nevermeetagain/WDF.git` | `remote: Repository not found` | 该 PAT（aideanew 账号）**看不到**该仓库 |
| 3 | `git ls-remote https://github.com/aideanew/WDF.git`（匿名 + 该 PAT） | 均返回 `4e572fa…` | **aideanew/WDF 公开且可写** |

#### 本规划的处置（~~不擅自改 `origin` 指向~~ → **已按裁决重指**）

- **已推送到 aideanew/WDF**：`4e572fa..79b0930 HEAD -> master`，后续补记 `79b0930..182e441`，远端 `refs/heads/master` = `182e441`（回读确认）。
- **`origin` 已于 2026-10-29 按用户裁决重指** → `https://github.com/aideanew/WDF.git`。
  自证（**全程不带任何令牌**）：`git fetch --prune origin` → `4e572fa..182e441  master -> origin/master`；
  `git rev-list --left-right --count origin/master...HEAD` → `0	0`。
  旧副作用（本地 `origin/master` 引用过期）随之消除。
- **令牌未落盘**：`grep -rl "github_pat_" .git/config .product-development` → 0 命中。
- **★ 在用户完成 token 吊销 + 凭据就位前，暂停一切推送**。此前"命令行内联 token"的做法已登记为
  `D-55.superseded_practice`，不再使用。用户告知凭据"就绪"后恢复推送。

---

### D-56 · C 阶段是否可绕过 C1 手感闸门（**BLOCKING，影响 C 阶段开工**）

| 事实 | 证据 |
|---|---|
| `mvp-scope.md:19` 立了闸门：「C1 未达标前不扩展新系统」 | 原文 |
| C1 达标判据是"首钩命中 ≥45% / 前 10 钩 40–60%"，需**真机真人**数据 | `mvp-scope.md:15` |
| 真机数据不存在，且 D-52 明文禁止用 SIMULATED 60% 冒充 | D-52 `red_lines` 第 2 条 |

**三选一**：

| 选项 | 含义 | 后果 |
|---|---|---|
| **A. 严格守闸门** | C 阶段不开工，等真机数据 | v1.1 全部停摆，且停摆原因不在代码侧 |
| **B. 只解绑"数据类"与"不改变手感的模块"**（**建议**） | B 阶段（纯数据）+ C 阶段的 `progression/crew/power/leaderboard/event/social/fishing/salvage` 可开工；`defense/island` 与手感无关也可开工 | 13 个模块全部可做，唯一被闸门限制的是"再扩展新的钩/捞玩法"——本版本来也没有这类卡 |
| **C. 完全解绑** | 闸门作废 | 违背 `mvp-scope.md:19`，且失去"手感优先"的纪律 |

**为什么建议 B**：闸门的原意是"防止在手感没调好时堆系统"。本版 C 阶段的 13 个模块里，
**没有一个改动 `hook` 的出钩参数**（`hook` 的 `target_dist/angle_deg/max_power_bp` 不动，D-04 等值迁移已冻结）。
所以"守闸门"与"做这些模块"在技术上不冲突 —— 冲突只在字面上。

**✅ 用户裁决（2026-10-29）**：**B**。登记为 `decision-index.json` **D-56 → DECIDED**，
`hard_condition` 写明：`hook` 的 `target_dist / angle_deg / max_power_bp` 与 D-04 等值迁移值**一律冻结**。
→ C 阶段 PD7-10~PD7-16 全部解除挂起，`task-index.json` 中这些卡的 `decisions[]` 已补 `D-56`。

---

## 1.4 三条裁决的即时后果（开工前必须照做，逐条可核对）

| # | 裁决 | 立即产生的动作 | 落到哪张卡 | 不做的后果 |
|---|---|---|---|---|
| **C-54.1** | Q1=B | `MainView` 加第 7 个 Tab（筏体），并接 `features/raft` | PD7-03 | v1.0 仍只有四环，与 `glossary.md:41` 不符 |
| **C-54.2** | Q2=A | `items.capacity` 全表归 0；`items` schema 移除该字段 | PD7-01 | 浮力出现两个口径，后续再改成本更高 |
| **C-54.3** | Q2=A 的副作用 | `items.capacity` 归 0 后，`placeholders.baseline.json` 会产生**baseline 外同值命中** → 必须同卡更新 baseline，且 **baseline 变更单独一个提交** | PD7-01（单独 commit） | `npm run guard` 直接 `exit 1`，阶段体检红 |
| **C-54.4** | Q2=A | `raft_tiles` 从 1 行补到「至少 2 种地块」否则扩筏无差异 | PD7-02 | UI 有入口但玩法恒等，等于假实现 |
| **C-54.5** | Q1=B | `game-core/raft` 的 `remainingBuoyancy()` 必须**被客户端真实调用**（当前零调用） | PD7-03 | 重犯本项目第 4 次「能力已实现、调用点没接」 |
| **C-55.1** | origin 重指 | 已完成，匿名 `fetch` 自证 `0 0` | — | — |
| **C-55.2** | token 轮换 | 用户吊销 3 个 token → 配凭据 → 告知"就绪" | 用户侧 | 主控继续无法推送 |
| **C-55.3** | 推送暂停 | 凭据就位前**不推送、不落盘任何 token** | 主控纪律 | 违背用户明令 |
| **C-56.1** | B | C 阶段 7 张卡解除挂起，可开工 | PD7-10~16 | v1.1 停摆且原因不在代码侧 |
| **C-56.2** | B 的硬条件 | `hook` 三个手感参数**冻结**；任何卡若需改这三个值 → 立即 `BLOCKED` 回上裁决 | PD7-10~16 的 `red_lines` | 闸门被偷换概念绕过 |

## 2. 风险清单

| # | 风险 | 概率 | 影响 | 触发信号 | 缓解 |
|---|---|---|---|---|---|
| **R-1** | ~~D-54 久拖不决 → A 阶段 5 张卡全部挂起~~ **已消散（2026-10-29 裁决）** | — | ~~v1.0 无法诚实结案~~ | 已裁 Q1=B/Q2=A | 原缓解措施未启用；风险转为 **R-1'** |
| **R-1'** | Q2=A 执行不彻底（`items.capacity` 归 0 但客户端仍读它） | 中 | 浮力仍两套口径，A 阶段"通过"是假的 | PD7-01 之后 `grep -rn "capacity" client/assets/scripts` 仍有命中 | PD7-01 验收加一条 `command` 型：该 grep 必须只剩 `raft_tiles` 相关 |
| **R-2** | 31 张表拿不到数据来源 | **高** | B/C 阶段大面积 `BLOCKED`（11/13 模块的第一阻塞点就是它） | PD7-06 第一步"来源清单"交不出来 | 每张 B 卡第一步固定为"提交来源清单"，交不出即 `BLOCKED`，**不许先写代码** |
| **R-3** | 并发写入冲突（本仓有多个 agent 在跑） | 中 | 覆盖他人改动 | `git status` 出现非本卡文件 | 提交前逐文件 `git add <file>`，**严禁 `git add -A`**（已有两次事故） |
| **R-4** | `handlers.ts` 单文件热点（O-2） | 中 | C 阶段尾部串行 + 冲突 | 两张卡同时改它 | 已定 Agent-Server 单写者 + C 阶段顺序落 |
| **R-5** | `MOCK_HANDLERS` 哑弹（`02 §1.6`） | 低 | 一旦 `FORCE_OFFLINE=true`，合规恒真、账号随机 | 有人为了调试打开开关 | PD7-17 步骤 1 删除或加"仅 dev 构建可用"守卫；本版只登记不改 |
| **R-6** | 塔防塌方（`defense` 30 行半实现 → 完整模拟） | **高** | C 阶段工期爆 | PD7-15 第一刀超过 3 天 | `mvp-scope.md:52` 已授权**降级为文字结算**，第一次熔断即降级，不硬撑 |
| **R-7** | 推送失败（D-55） | 中 | 双端不一致 | `git push` 报 403/认证失败 | 凭据轮换完成前**主动不推**；恢复后若仍失败，加 `-c http.version=HTTP/1.1` 重试一次（历史有效）；再失败则按指令输出 zip |
| **R-8** | 本版新增 17 条索引条目污染 `pd.mjs next` 的派工队列 | 低 | `next` 会把 17 张未就绪的卡当成"下一张" | `pd.mjs next` 输出 PD7-0x | 已用 `depends_on` 建立真实依赖，`next` 只会指向 G1 的 6 张中的前 3 张（受 `max 3 writer` 限制）；C 阶段卡因前置未完成不会出现 |

## 3. 未决（不阻塞，但需在执行中确认）

| # | 未决 | 何时必须确定 | 谁定 |
|---|---|---|---|
| U-1 | 扩筏扣金币还是扣材料（NB-1 假设扣金币） | PD7-02 开工前 | 主控按 ADR-0012 推定，若用户有异议再说。**D-54 未覆盖此问**（只裁了"含不含"与"浮力怎么算"） |
| U-2 | 扩筏是否有地块上限（NB-2 假设无上限） | PD7-01 一并确认 | 用户（若他关心数值上限）。**D-54 未覆盖此问** |
| U-3 | 赶海是否需要新表列（`event_session` 加"已结算"） | PD7-14 开工前 | 主控提交 ADR |
| U-4 | 聊天是否需要持久化（若需要 → 建表 = 新迁移） | PD7-16 开工前 | 主控提交 ADR（默认**不持久化**，只做频道内存态 + 一次性拉取） |
| U-5 | 软著是否已在 10-30 前提交（`lifecycle.md:33` 硬期限） | **今天（10-29）** | 用户侧，代码不可验证 |

## 4. 本规划承认的三处不足（自我否定，不掩饰）

| # | 不足 | 为什么不修 |
|---|---|---|
| N-1 | B 阶段 4 刀不满足"每刀可演示"（`06 §5` 已写） | 数据不是行为；强行合并会让每刀跨 3+ 模块 |
| N-2 | 契约自检第 4 项（错误码覆盖）为否（`04 §2`） | 修它需要解冻契约 = 改 `packages/contracts/**`，本版硬约束禁止；已给出解冻窗口的排期建议 |
| N-3 | 17 张卡的工期估算是**档位换算**（`sonnect ≈ 半天~2 天`），不是实测 | 本项目没有历史"卡 → 人天"的统计样本；写出来的数字应被当作**相对排序**而非承诺 |
