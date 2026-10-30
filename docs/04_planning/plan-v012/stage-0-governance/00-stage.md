---
id: PLAN-V012-S0
title: plan-v012 · 阶段 0（治理收口）· 2 张卡
status: active
module: planning
owner: hark
created: 2026-10-30
review: 2026-11-13
related: [PLAN-V012-01, PLAN-V012-07]
---

# 阶段 0 · 治理收口与推送（2 张卡：PD8-01 治理、PD8-18 校验收尾）

## 1. 为什么这是第一刀（不是"打扫卫生"）

| 事实 | 后果 |
|---|---|
| `pd.mjs health .` → **5 个错误** | 治理层红灯，意味着"完成"的判定标准本身不可信 |
| `pd.mjs status .` 里 PD7-08/09 的阻塞原因显示 **`undefined`** | 派工队列基于坏数据 → 后续决策失真 |
| `task-index.json` 的 `baseline_commit = 4e572fa`，实际 HEAD `8fbb57b` | 任何人都无法确认"规划钉在哪个状态" |
| 本地领先远端 **19 个提交**，`双端一致 = false` | 用户明确要求"保证 github 双端一致"，这一条当前**不成立** |

**判据（出口）**：`health` 0 错误 + `status` 无 `undefined` + `origin/master == HEAD`。

## 2. 阶段出口条件

- [ ] `node <skills>/product-development/scripts/pd.mjs health .` → **0 错误**（允许保留 45 个提醒）
- [ ] `pd.mjs status .` 输出里 PD7-08/09 的阻塞原因是**可读文本**，不是 `undefined`
- [ ] `git rev-list --left-right --count origin/master...HEAD` → `0	0`
- [ ] `git ls-remote origin refs/heads/master` 与本地 `HEAD` 的 SHA **完全相同**
- [ ] 令牌未入库：`git ls-files | grep -c "git-pat"` → 0，且仓库内**无长度 ≥ 40 的 `github_pat_` 匹配**（即无完整 token；前缀字面量允许，它不是凭证）
      （**注**：NTFS 上 `chmod 600` 是空操作，`ls -l` 恒显示 `-rw-r--r--`；改用"未入库 + 未泄漏"作判据，见 PD8-01 A5）
- [ ] `docs/00_governance/document-index.md` 已重新生成（含 `EVD-7109`）→ `node --test tests/contract/docs-index.test.mjs` 转绿
- [ ] `node --test tests/determinism/items-weights.test.mjs` → **6/6 PASS**（PD8-18）
- [ ] 全量实跑 **270/270 PASS**（修前 267/270；本阶段是唯一"允许动全量"的时点，因为红的就是全量指标）
- [ ] **零业务代码改动**：`git diff --stat -- '*.ts' '*.csv' '*.sql'` 为**空**（PD8-18 改的是 `tests/**`，不算业务代码）

---

# PD8-01 治理元数据修复与双端同步

- 阶段 / 角色 / 规划版本：0 / planner+executor / PLAN-R5
- 来源（E1）：`02-fact-baseline.md §6`（5 个错误的逐条根因）+ `01-snapshot.md §1`（19 个未推提交）

## 归属
- 所属切片：SG-1
- 来源需求：M-12（治理元数据可信）、M-13（双端一致）
- 来源方案：`lib.mjs:14` 的 `DETAIL` 枚举；`pd.mjs:130/135` 的校验规则

## 目标
`pd.mjs health` 从 5 错误回到 0，且本地 `HEAD` 与 `origin/master` 的 SHA 相同。

## 输入
- 文档：`02-fact-baseline.md §6`（错误 ↔ 根因 对照表）
- 契约：无
- 前置任务：无
- 前置状态：工作区干净（`git status --porcelain` 为空）

## 输出
- `.product-development/task-index.json`（3 处修复，见步骤 2-4）
- `docs/06_validation/execution-ledger.md`（新增一节：本轮的推送记录）
- `~/.git-pat`（**仅权限**，`chmod 600`；不改内容）

## Execution Steps
1. [ ] **先复跑一遍，把 5 个错误贴进证据**（不凭记忆）：
       `node <skills>/product-development/scripts/pd.mjs health . 2>&1 | grep 错误`
2. [ ] 修 PD7-08：`detail` 从自由文本改回 `"READY"`；把原文本搬进 `blocked_reason`；
       同时按 **D-58** 的裁决结果决定 `status`（若裁 A → 改 `TODO` 并清 `blocked_reason`；若裁 B → 保持 `BLOCKED`）
3. [ ] 修 PD7-09：同上（`blocked_reason` = "6 张设计空表：4 张零消费方不阻塞、1 张有回落、drops 为真缺口见 PD8-07"）
4. [ ] 修 PD7-07：`execution` 补 `commits: ["973e5b6"]`（提交真实存在，`git log --oneline | grep PD7-07` 可验）
5. [ ] 更新 `task-index.json` 的 `baseline_commit` → 当前 HEAD（`8fbb57b`），并把 `plan_version` → `PLAN-R5`
6. [ ] 登记本版 18 张卡 PD8-01~18（`card` 指向 `docs/04_planning/plan-v012/stage-*/00-stage.md`）；
       每张卡的 `acceptance[].check.type` 只能是 `command` / `measure` / `manual`（`pd.mjs` 的硬校验）
6b. [ ] **修 `docs-index` 红项**：`npm run gen:docs` → `docs/00_governance/document-index.md` 含 `EVD-7109`
       （根因：`EVD-7109/README.md` 在 `8fbb57b` 加入，而索引上一次生成在 `3cd7628`；**只重生成，不手改**）
7. [ ] 令牌安全（**判据已按 NTFS 现实改写**）：`chmod 600` 在本机无效 → 改为**三查**
       ① `git ls-files | grep -c "git-pat"` = 0　② 仓库内无长度 ≥ 40 的 `github_pat_` 匹配（**不是**"无该前缀字面量"——本轮实测有 8 处文档在描述密钥扫描规则）
       ③ 推送输出**先重定向到文件、屏蔽后落盘**，不让 token 进对话日志
       **不 echo、不写盘、不复制内容**；若 `~/.git-pat` 存的是完整凭据 URL（本机就是），
       直接用 `$(cat ~/.git-pat)/<owner>/<repo>.git` 拼 URL，**不要**再套 `oauth2:<token>@`
8. [ ] **逐文件** `git add`（严禁 `git add -A`；本仓已两次事故），提交
9. [ ] 推送：`PAT=$(tr -d '\r\n' < ~/.git-pat)`
       **本机该文件存的是完整凭据 URL**（`https://<user>/<repo>.git` 形式，用户段已含 PAT），
       因此 URL = `"$PAT/aideanew/WDF.git"`；**不要**再套 `oauth2:` 前缀拼 token 进 URL
       —— 本轮第一次尝试正是这么拼的，拼出 `https://oauth2:https://...` 嵌套 URL，
       报 `Port number was not a decimal number between 0 and 65535`（RC=128）
       首次失败可加 `-c http.version=HTTP/1.1` 再试一次；输出**先重定向到文件**，屏蔽 token 后再展示
10. [ ] 回读验证：`git ls-remote origin refs/heads/master` == `git rev-parse HEAD`

## 验收标准
- [ ] A1 `command`：`pd.mjs health .` → 输出含"体检通过"，且 `grep -c 错误` 为 0
- [ ] A2 `command`：`pd.mjs status . | grep -c "阻塞 PD7-08：undefined"` → 0
- [ ] A3 `command`：`test "$(git rev-list --count origin/master..HEAD)" = "0"` → 退出码 0
- [ ] A4 `command`：`test "$(git ls-remote origin refs/heads/master | cut -f1)" = "$(git rev-parse HEAD)"`
- [ ] A5 `command`：`git ls-files | grep -c "git-pat"` → **0**，且仓库内无长度 ≥ 40 的 `github_pat_` 匹配（完整 token 长 93 字符；`github_pat_` 前缀字面量不算泄漏）
      （**原定判据 `ls -l ~/.git-pat` → `-rw-------` 已作废**：本轮实测 `chmod 600` 在 NTFS/MSYS 上是空操作，
      权限位恒为 `-rw-r--r--`。Windows 下真正的保护来自 NTFS ACL 与"文件不在仓库工作树内"，POSIX 权限位不可作为验收门）
- [ ] A6 `manual`：`git diff --stat -- '*.ts' '*.csv' '*.sql'` 为空（零业务代码改动）

## 验证命令
```bash
node C:/Users/EDY/.claude/skills/product-development/scripts/pd.mjs health . | tail -3
node C:/Users/EDY/.claude/skills/product-development/scripts/pd.mjs status . | grep -E "阻塞 PD7-0[89]"
git rev-list --count origin/master..HEAD
git ls-remote origin refs/heads/master
ls -l ~/.git-pat
git diff --stat -- '*.ts' '*.csv' '*.sql'
```

## 证据路径
`docs/06_validation/evidence/EVD-8101/`（修前 5 个错误的原始输出 + 修后 0 错误 + 推送前后的 SHA 对照 + `git-pat` 权限）

## 允许修改
- `.product-development/task-index.json`、`.product-development/runs/**`
- `docs/06_validation/execution-ledger.md`、`docs/06_validation/evidence/EVD-8101/**`
- `~/.git-pat`（**仅权限位**）

## 禁止修改
- 任何 `.ts` / `.csv` / `.sql`
- `packages/contracts/**`
- `~/.git-pat` 的**内容**（不得写入、不得替换）
- 任何 `docs/0*` 下的业务文档

## 依赖与阻塞
- Depends on：无
- Blocks：无（其他卡不依赖它，但它让后续"完成"判定可信）
- 阻塞条件：若推送连续 2 次失败（403/认证）→ **停，不改认证方案硬试**；按用户已授权的兜底输出 zip 规划包，并在卡内记 `BLOCKED-HUMAN`

## 建议执行档位
`sonnect`　理由：改元数据不动逻辑；但必须逐文件 `git add`（历史事故点）。

## 升级条件
若发现 health 错误数 > 5（即有本版未登记的其他错误）→ 升 `opus`，先把完整错误清单落进证据再动。

## 预估规模
小（半天）　**小于 2 小时的部分**：health 修复本身约 30 分钟；推送与验证约 30 分钟。

---

# PD8-18 测试口径对齐 D-54（校验收尾）

- 阶段 / 角色 / 规划版本：0 / executor / PLAN-R5
- 来源（E1）：`01 §4`（HEAD `8fbb57b` 实跑 270 条 / **3 红**）+ `tests/determinism/items-weights.test.mjs:30-60`

## 归属
- 所属切片：SG-2
- 来源需求：M-12（判定可信）
- 来源方案：`D-54 Q2=A`（浮力只看 `raft_tiles.capacity`，`items.capacity` 一律归 0）

## 目标
`items-weights.test.mjs` 的 6 条断言与 D-54 后的数据一致 → `npm run test` 回到 **270/270**。
**只改测试，不改数据、不改实现**。

## 输入
- 文档：`01 §4` 的失败清单、`tests/determinism/items-weights.test.mjs` 全文（61 行）
- 契约：无
- 前置任务：无（与 PD8-01/02/06 并行，G1 尾部串行收尾）
- 前置状态：实跑 `6 tests / 4 pass / 2 fail`

## 失败的两条与根因（逐字对照）

| 用例 | 断言原文 | 为什么红 |
|---|---|---|
| `items-w 3 容器 capacity>0 且递增` | 断言 `chest` 类物品 `capacity > 0` 且木<铜<铁 | D-54 后 `items.capacity` **106/106 全 0**（容量语义搬到 `raft_tiles.capacity`） |
| `items-w 6 浮力自洽：容器装载后可留正浮力` | 用 `capacity` 算浮力余量 | 前提 `capacity > 0` 不成立；且浮力现在只看 `raft_tiles`（`raft-tiles.test.mjs` 的 `raft-t 5` 已覆盖） |

## 输出
- `tests/determinism/items-weights.test.mjs`（改 2 条断言 + 文件头注释）

## Execution Steps
1. [ ] 复跑并留证：`node --import ./tools/runtime/register.mjs --test tests/determinism/items-weights.test.mjs`
       → 贴出 `4 pass / 2 fail` 原始输出（**不凭记忆**）
2. [ ] 把 `items-w 3` 改为断言 **D-54 后的事实**：`capacity` 全为 0 且**列位保留**
       （`assert.ok(items.every(i => i.capacity === 0))`），用例名改为
       「`items.capacity` 按 D-54 一律归 0（容量语义在 `raft_tiles`）」
3. [ ] `items-w 6` **删除**并在文件头注明「浮力自洽已由 `raft-tiles.test.mjs` 的 `raft-t 5` 覆盖」（**不留重复断言**）
4. [ ] 文件头注释更新：`D-43=B` 的语境补一句「`capacity` 已于 2026-10-28 被 D-54 Q2=A 归 0」
5. [ ] 复跑该文件 → **6/6 PASS**（删 1 条 + 改名 1 条，总数保持 6）
6. [ ] 全量实跑一次（本阶段唯一允许动全量的时点）→ **270/270**

## 验收标准
- [ ] A1 `command`：`node --import ./tools/runtime/register.mjs --test tests/determinism/items-weights.test.mjs` → `fail 0`
- [ ] A2 `command`：全量 `node --import ./tools/runtime/register.mjs --test "tests/**/*.test.mjs"` → `pass 270 / fail 0`
- [ ] A3 `command`：`git diff --stat game-data/ packages/` → **空**（零数据、零实现改动）
- [ ] A4 `review`：`items-w 3` 的新断言**断言的是现状**（全 0），不是"改成永真"
       —— 判据：若有人把某个 `capacity` 改成非 0，这条必须变红（做一次突变验证并留证）

## 验证命令
```bash
node --import ./tools/runtime/register.mjs --test tests/determinism/items-weights.test.mjs
node --import ./tools/runtime/register.mjs --test "tests/**/*.test.mjs"
git diff --stat game-data/ packages/
```

## 证据路径
`docs/06_validation/evidence/EVD-8118/`（含修前 `2 fail` 原始输出 + 修后 6/6 + 一次突变验证）

## 允许修改
- `tests/determinism/items-weights.test.mjs`（**唯一**文件）

## 禁止修改
- `game-data/source/items.csv`（红线：不许为了让测试变绿去改数据）
- `packages/game-core/src/**`、`client/**`
- 其他任何测试文件（各有其主）

## 依赖与阻塞
- Depends on：无
- Blocks：**阶段 0 出口**（`verify` 绿）→ 间接阻塞所有"阶段出口 `verify` EXIT=0"的承诺
- 阻塞条件：若发现 `items-w` 的失败不只是这两条（即有第 3 条红）→ 停，先把完整失败清单贴进 EVD 再动

## 建议执行档位
`sonnect`　理由：只改 2 条断言 + 1 处注释，但它是"判定可信"的前提，不可跳过。

## 升级条件
若发现必须改 `items.csv` 才能让测试有意义 → 停，说明 D-54 的落地有缺口，转主控裁决。

## 预估规模
小（四分之一天）
