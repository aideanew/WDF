---
id: PLAN-V008-08
title: 步骤 4 · 证据补录、合规重写、文档收口与推送（派工卡）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V008-07, PLAN-V008-09]
---

# 08 · 步骤 4：派给外部 Agent 的四张卡

> 归属：**外部 Agent**（中等/简单任务，用户 16:44 指令）。
> 本文件是**可直接转发的任务书**，每张卡自包含，不依赖前文上下文。
> 执行前必读：`plan-v008/00-README.md` §7 的 R-1~R-10。

---

## TASK-5008：把未跟踪测试纳入版本库 + 补 EVD

### 归属
- 所属切片：证据链完整性
- 来源需求：S-1（端到端证据可复现）
- 来源方案：`plan-v008/00-README.md` §3 F-35

### 目标
`git status` 里所有 `??` 的测试文件进入版本库；4007/4008/4009 三张卡有符合五要素的 EVD。

### 输入
- 前置状态：`tests/integration/chest.test.mjs` 当前为 `??`
- 参考范式：`docs/06_validation/evidence/EVD-2202/`（已有的合格 EVD）

### 输出
- 修改：`tests/integration/chest.test.mjs`（`git add` 即可，不改内容）
- 新增：
  - `docs/06_validation/evidence/EVD-4007/`（商人页 UI）
  - `docs/06_validation/evidence/EVD-4008/`（背包回收）
  - `docs/06_validation/evidence/EVD-4009/`（开箱）

### Execution Steps
1. [ ] `git status --porcelain | grep "^??"` 列出所有未跟踪文件，逐个判断"该进库 / 该进 gitignore"
2. [ ] `git add tests/integration/chest.test.mjs`
3. [ ] 为 EVD-4007 采集：`git log --oneline -3` 的 commit、`tsc` 输出、商人页 3 段录屏（或截图）
4. [ ] 为 EVD-4008 采集：回收流程截图 + `economy-sell` 测试输出
5. [ ] 为 EVD-4009 采集：**等 `06`/`07` 完成后**再采，含"账本一致性"用例输出
6. [ ] 每份 EVD 必须含五要素：`命令` / `输出` / `时间戳` / `commit` / `判定（PASS/FAIL/UNKNOWN）`

### 验收标准
- [ ] `git status --porcelain | grep "^??"` 只剩 `docs/04_planning/plan-v008/`（规划目录本身待提交）
- [ ] 三份 EVD 各含五要素，缺一即 FAIL
- [ ] EVD 里**不得出现**"已防作弊""完全正确""100% 通过"等无证据表述（参照 F-37 的教训）

### 验证命令
```bash
git status --porcelain | grep "^??"
ls -R docs/06_validation/evidence/EVD-4007 docs/06_validation/evidence/EVD-4008 docs/06_validation/evidence/EVD-4009
```

### 证据路径
`docs/06_validation/evidence/EVD-5008/`

### 允许修改
`tests/**`、`docs/06_validation/evidence/**`

### 禁止修改
`server/src/**`、`client/assets/scripts/**`、`packages/**`、`game-data/**`

### 依赖与阻塞
- Depends on：TASK-5004（EVD-4009 需要它完成后的测试输出）
- Blocks：TASK-5010
- 阻塞条件：若发现 `??` 文件里混有他人正在写的产物 → 停下问归属

### 建议执行档位
`lite`　理由：模板填充 + git add，无设计决策

### 升级条件
发现 EVD 目录结构与既有范式不一致需要重构 → 升默认档

### 预估规模
小（< 1 小时）

---

## TASK-5009：合规材料重写（F-36，★ 有法务风险）

### 归属
- 所属切片：合规与发布
- 来源需求：M-10（实名/防沉迷）、S-4（公示与配置一致）
- 来源方案：`plan-v008/01-fact-baseline.md` §3 第 2~5 行

### 目标
`docs/07_release/compliance/` 下所有材料**不含虚假陈述**、**不含过期数值**、**保留原有可执行清单**。

### 输入
- 当前文件：`copyright-materials.md`（已被改为 `COMP-001`，31 行）、`review-checklist.md`（`COMP-002`）、`probability-disclosure.md`
- 事实基线：`plan-v008/01-fact-baseline.md` §1 第 7/8 项

### 已确认的四处错误（逐条修，不许"顺手优化"）

| # | 位置 | 现状 | 必须改成 |
|---|---|---|---|
| **a** | `copyright-materials.md:25` | 「已通过微信官方提供的接口**接入防沉迷系统**」 | **虚假**。`compliance/service.ts:11-17` 是桩（`verified=playerExists()`, `minor=false`，注释写"接平台实名/防沉迷后，这里换成读真实状态"）。改为「**待接入**：当前为本地开发桩，`WDF_AUTH_MODE=platform` 未实现」 |
| **b** | `copyright-materials.md:31` | 「校验配置版本 `16921d30a67a934f`」 | `c6a54f0fb00341c5`（`client/assets/resources/config/_manifest.json:2` 是唯一真值；且与 `probability-disclosure.md` 当前值一致） |
| **c** | `copyright-materials.md:12` | 「需要**去除注释、空行**」 | **删除**。无依据（原文档、设计源、软著实务均无此要求），凭空新增的约束会误导执行 |
| **d** | 整篇 | 原版有「软著提交 ≤ 10-30」「不加急自己办（中国版权保护中心）」「每页 ≥50 行 / 页眉写软件名称+版本号 / 页脚连续页码 / 导出 PDF 不交散图」「不放第三方库·node_modules·generated」「操作说明书必含章节」——**全被删了** | **恢复**（可从 `git show HEAD:docs/07_release/compliance/copyright-materials.md` 取原文，再与新版合并，**不是覆盖**） |

### Execution Steps
1. [ ] `git show HEAD:docs/07_release/compliance/copyright-materials.md > /tmp/old-copyright.md`，读原文
2. [ ] 逐条比对现版与原文，列出"净删除项"（至少 5 条，见上表 d）
3. [ ] 合并：**保留原文所有可执行要求** + **新增现版正确的部分**（如微信提审材料分组），删掉 a/c
4. [ ] 修 b 的 configVersion
5. [ ] 对 `review-checklist.md` 做同样处理（本次未逐行审，标 UNCERTAIN，须完整比对）
6. [ ] 全库搜 `16921d30a67a934f` 与 `COMP-001`/`COMP-002` 的引用，改掉断链
7. [ ] 逐项加"达成度"标记：✅ 已实现（能指到代码行）/ ❌ 未实现 / ⚠️ 部分

### 验收标准
- [ ] `grep -rn "已.*接入防沉迷\|已通过微信.*接口" docs/` → 零命中（除非明确写"未接入"）
- [ ] `grep -rn "16921d30a67a934f" docs/ server/ client/` → 零命中
- [ ] `grep -n "去除注释" docs/07_release/compliance/*.md` → 零命中
- [ ] 原文的 5 条可执行要求全部回到文件里（逐条勾）
- [ ] 每个"已完成"项能指到具体代码行或 EVD 路径

### 验证命令
```bash
grep -rn "16921d30a67a934f" . --include=*.md --include=*.ts --include=*.json | grep -v node_modules
grep -rn "接入防沉迷\|已接入" docs/07_release/
npm run guard   # front matter 必须仍绿
```

### 证据路径
`docs/06_validation/evidence/EVD-5009/`（前后 diff + 逐条核对表）

### 允许修改
`docs/07_release/compliance/**`

### 禁止修改
`server/src/**`、`client/**`、`packages/**`、`game-data/**`、`docs/04_planning/**`

### 依赖与阻塞
- Depends on：无（可与 5008 并行）
- Blocks：TASK-5010
- **阻塞条件（重要）**：若要把某条标"✅ 已实现"，必须先跑 `grep` 确认代码真存在；**证不了就标 ❌**。不得凭文档描述标 ✅

### 建议执行档位
默认　理由：需要读代码核实"已实现"与否，属事实判断

### 升级条件
发现合规材料涉及版号/备案等超出本仓信息范围的事项 → 升 `reasoning` 并标 BLOCKING 交人裁决

### 预估规模
中（2~4 小时，主要成本是逐条核实）

### 附带事实（须告知用户，不由 Agent 决定）
「软著提交 ≤ 10-30」是 2026-10-23 的硬期限裁决，**今天 10-27，剩 3 天**。本卡只负责把该条恢复进文档，**不负责执行提交**。

---

## TASK-5010：文档收口（F-37 过度宣称 + 注释过期 + 索引重建）

### 归属
- 所属切片：文档一致性
- 来源需求：S-1
- 来源方案：`plan-v008/01-fact-baseline.md` §3 第 1 行

### 目标
规划/路线图/索引里**不再有与代码矛盾的"已完成"表述**。

### 输入
- `docs/04_planning/current-plan.md`（现含"TASK-4016 宣告本轮冲刺结束。相关问题已修复"）
- `server/src/gateway/handlers.ts:32`（注释写"全部 **20** 个动作"，实际 22）
- `plan-v007/11-drift-audit-w0w1.md`（对 chest 的 8 条指控已过期）

### Execution Steps
1. [ ] 改 `current-plan.md`：把"相关问题已修复"改为**可核验表述**，逐条列明"已修 / 未修"

   | 建议写法 | 依据 |
   |---|---|
   | TASK-4007/4008/4015 已完成 | `f3fa3e0` |
   | TASK-4009 服务端已实现、账本/开锁/UI 待 `5004~5007` | `plan-v008/06`、`07` |
   | M-10 实名防沉迷**未实现**（桩） | `compliance/service.ts:11-17` |
   | 当前 P0 未修：F-27/F-28 | `plan-v008/01` §1 |

2. [ ] 改 `handlers.ts:32` 注释：`20 个动作` → `22 个动作`（含 `chest.open`）
3. [ ] 在 `plan-v007/11-drift-audit-w0w1.md` 顶部加**过期声明**：

   ```md
   > ⚠️ **本文对 `chest/service.ts` 的 8 条指控已在 16:47 前后失效**——该文件被重写，
   > 现仅剩 `3103` 自造码、无账本、`hitsUsed` 未用三条成立（见 `plan-v008/01` §3）。
   > 保留原文以留痕，不作为当前事实引用。
   ```

4. [ ] `npm run gen:docs` 重建索引
5. [ ] 在 `plan-v008/00-README.md` 的谱系表里，把 v007 标为"已被 v008 取代（事实基线继承）"

### 验收标准
- [ ] `grep -n "相关问题已修复" docs/` → 零命中，或后接具体条目
- [ ] `grep -n "20 个动作" server/src/gateway/handlers.ts` → 零命中
- [ ] `plan-v007/11` 顶部有过期声明
- [ ] `npm run guard` 全绿（front matter 项）

### 验证命令
```bash
npm run gen:docs
npm run guard
grep -rn "相关问题已修复\|全部 20 个" docs/ server/src/
```

### 证据路径
`docs/06_validation/evidence/EVD-5010/`

### 允许修改
`docs/04_planning/{current-plan,roadmap}.md`、`docs/00_governance/**`、`docs/05_execution/task-index.md`、`server/src/gateway/handlers.ts`（**仅注释**）

### 禁止修改
任何 `.ts` 的**逻辑**（只许改注释）、`docs/04_planning/plan-v008/**`

### 依赖与阻塞
- Depends on：TASK-5004、TASK-5009
- Blocks：TASK-5011
- 阻塞条件：若 5004 未完成，"TASK-4009 状态"无法准确表述 → 等

### 建议执行档位
`lite`　理由：文案修正 + 索引重建

### 升级条件
若发现多处"已完成"与实际不符 → 升默认档，产出完整对照表

### 预估规模
小（< 1 小时）

---

## TASK-5011：推送双端一致

### 归属
- 所属切片：发布
- 来源需求：用户 16:44「最后推送到 github 保证双端一致」

### 目标
`origin/master` == 本地 `master`。

### 输入
- 当前状态：本地 ahead **10**（`git rev-list --left-right --count origin/master...master` → `0  10`）
- 凭据：**需要用户临时提供 `aideanew` 账号的 PAT（写权限）**

### Execution Steps
1. [ ] 全部卡完成后，`git status --porcelain` 应为空（或只剩无关产物）
2. [ ] 最后一次全量体检（**唯一一次全量**，用户 R-1 允许在发版前跑）：
   ```bash
   npm run guard && npm test
   npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 | grep -v "^C:/"
   ```
3. [ ] 向用户索取 PAT（**不得硬编码进代码或 `.gitconfig`**，用完即清）
4. [ ] `git -c http.version=HTTP/1.1 push https://oauth2:<PAT>@github.com/aideanew/WDF.git master`
   > 若报 `Recv failure: Connection was reset`，加 `-c http.version=HTTP/1.1`（本机 HTTPS 走 HTTP/2 握手被重置，10-27 实测）
5. [ ] 复核：`git fetch origin && git rev-list --left-right --count origin/master...master` → `0  0`
6. [ ] 若无法连接 GitHub → **输出 zip 规划包**：`docs/09_archive/plan-v008-export.zip`

### 验收标准
- [ ] `git rev-list --left-right --count origin/master...master` → `0 0`
- [ ] 远端可见最新 commit
- [ ] 本地无残留 PAT（`git remote -v` 不含 token）

### 验证命令
```bash
git fetch origin
git rev-list --left-right --count origin/master...master
git remote -v
```

### 证据路径
`docs/06_validation/evidence/EVD-5011/`（push 输出 + 双端 commit 对比）

### 允许修改
无（纯 git 操作）

### 禁止修改
任何文件；**禁止 `git push --force`**；**禁止把 token 写进任何被提交的文件**

### 依赖与阻塞
- Depends on：全部
- 阻塞条件：用户未提供 PAT → 输出 zip 并标 BLOCKING

### 建议执行档位
`lite`

### 升级条件
出现非快进冲突 → 升默认档，**先报告不擅自 rebase**

### 预估规模
小（< 15 分钟，不含等 PAT）

---

## 打包兜底

无论 5011 是否成功，都产出一份：

```bash
# 用 Python（本机无 zip 命令）
python -c "
import os, zipfile
src = r'E:/Demo/WDF/docs/04_planning/plan-v008'
dst = r'E:/Demo/WDF/docs/09_archive/plan-v008-export.zip'
with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted(os.listdir(src)):
        if f.endswith('.md'): z.write(os.path.join(src, f), f'plan-v008/{f}')
print(dst, os.path.getsize(dst))
"
```
