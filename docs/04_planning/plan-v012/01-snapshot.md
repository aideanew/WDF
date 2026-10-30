---
id: PLAN-V012-01
title: plan-v012 · 规划快照（钉在 8fbb57b）
status: active
module: planning
owner: hark
created: 2026-10-30
review: 2026-11-13
related: [PLAN-V012-00, PLAN-V012-02]
---

# 01 · 规划快照

## 1. 钉点

```yaml
规划日期: 2026-10-30
git_branch: main
git_commit: 8fbb57b            # ← 本规划的**事实基线**（所有行数/行号类结论钉在这里）
工作区是否干净: true
远端: https://github.com/aideanew/WDF.git
远端 HEAD（规划时）: 182e441    # git ls-remote origin refs/heads/master
本地领先远端（规划时）: 19 个提交
双端一致（规划时）: false

# ↓ 规划落盘后（2026-10-30 本轮完成，已复验）
规划主体提交: 9b98c58          # 17 份 md + decision-index + current-plan
远端 HEAD（现在）: 与本规划最后一次提交相同
双端一致（现在）: true         # git rev-list --left-right --count origin/master...HEAD → "0	0"
                               # 复验命令：test "$(git rev-parse HEAD)" = "$(git ls-remote origin refs/heads/master | cut -f1)"
```

**为什么事实基线钉在 `8fbb57b` 而不是推送后的 `9b98c58`**：`9b98c58` 只加 `docs/` 下的规划文件，
**零业务代码改动**（`git diff --stat 8fbb57b..9b98c58 -- '*.ts' '*.csv' '*.sql' '*.json'` 只含 `decision-index.json`）。
所以"行数 / 行号 / 表行数"这类结论在 `9b98c58` 上完全不变，仍然以 `8fbb57b` 为准。

**远端历史**：`182e441`（2026-10-29 的规划落账）不含任何 PD7 执行成果；
`182e441..9b98c58` 共 20 个提交（PD7 执行 19 个 + 本轮规划 1 个）已全部推送。

## 2. 规模

| 项 | 值 | 命令 |
|---|---|---|
| `.ts` 文件（含 generated） | **250** | `find client server packages tools tests -name "*.ts" \| wc -l` |
| `.mjs` 文件 | **64** | `find tools tests -name "*.mjs" \| wc -l` |
| `.ts` 总行（**不含** generated） | **8515** | `find ... -name "*.ts" \| grep -v generated \| xargs cat \| wc -l` |
| 文档 md | **381** | `find docs -name "*.md" \| wc -l` |
| 证据目录 | **53** | `ls docs/06_validation/evidence/ \| wc -l` |
| 测试文件 | **39** | `find tests -name "*.test.mjs" \| wc -l` |
| 测试用例（静态计数） | **263** | `grep -rhoE "^\s*(test\|it)\(" tests --include=*.test.mjs \| wc -l` |
| 测试**实跑**用例数 | **270** | `node --import ./tools/runtime/register.mjs --test "tests/**/*.test.mjs"` → `tests 270` |
| 测试实跑结果 | **267 pass / 3 fail** | 同上；差的 7 条是循环内生成的用例（静态 grep 数不到） |
| 数值表 | **46**（40 有数据 / 6 空） | 逐 CSV 行数 |
| 服务端动作 | **22**（15 实现 / 7 todo） | `server/src/gateway/handlers.ts:45-68` |
| 数据库迁移 | **2**（`0001_init` / `0002_regions`） | `ls server/db/migrations/` |
| v1 模块（catalog） | **23**；v2 模块 5 | `module-catalog.json` |

## 3. 需求文档清单（全量读取，路径 + 关键锚）

| 路径 | 行数/大小 | 本版引用的锚 |
|---|---|---|
| `docs/01_product/design-source/我的筏-深度设计方案-v5.5.md` | 114 KB / 1350+ 行 | §1.3、§3.5、§5.3、§7、§10.2、§11.1、§11.3、§11.4 |
| `docs/01_product/design-source/设计要点记录.md` | 86 KB | 冲突时以较新时间为准（`AGENTS.md:8`） |
| `docs/01_product/mvp-scope.md` | 66 行 | §1 C1/C2/C3 闸门、§2 模块×周次、§5 v1.0/v1.1 分期 |
| `docs/00_governance/glossary.md` | — | 五环定义、`modules` 开放 map |
| `docs/00_governance/module-catalog.json` | 28 模块 | `phase` / `client` / `core` / `server` / `tables` |
| `docs/03_solution/decisions/decision-index.json` | 42 条决策 | D-01~D-57（D-57 仍 PROPOSED） |
| `game-data/UNKNOWN-TABLES.md` | 275 行 | 6 张空表的处置理由 |

## 4. 测试与门禁命令（实际可执行，逐条验过存在）

```bash
npm run gen          # 46 表 → generated + resources json + catalog + docs-index
npm run guard        # 9 项守卫（含 placeholders 第 10 项）
npm run test         # node --test tests/**/*.test.mjs（39 文件 / 静态 263 / 实跑 270）
npm run typecheck    # client + server 两段 tsc --noEmit
npm run verify       # 以上四项串联 —— 本规划只在阶段出口跑
npm run impact <kw>  # 按关键词圈定受影响测试（单卡用这个，不用 test 全量）
```

**⚠ 关键事实（本轮实跑，不是转述）**：`npm run test` 在 HEAD `8fbb57b` 是**红的**——
270 条里 **3 条失败**（267 pass）：

| 失败用例 | 根因 | 处置 |
|---|---|---|
| `items-w 3 容器 capacity>0 且递增` | `items.capacity` 被 D-54 Q2=A 一律归 0，测试断言的是 D-54 **之前**的语义 | **PD8-18** |
| `items-w 6 浮力自洽：容器装载后可留正浮力` | 同上（前提 `capacity>0` 不成立） | **PD8-18** |
| `全部带 README.md 的 EVD 目录都在索引中` | `EVD-7109/README.md` 在 `8fbb57b` 加入，而 `document-index.md` 上一次生成在 `3cd7628` | **PD8-01**（`npm run gen:docs` 即修） |

→ **任何"阶段出口 `npm run verify` EXIT=0"的承诺，在 PD8-18 与 PD8-01 完成前都是空的。**
这条事实推翻了 v011 规划里"测试全绿"的隐含前提（v011 未实跑过全量）。

## 5. 读取失败或无法访问（如实说明，不跳过）

| # | 项 | 状态 | 后果 |
|---|---|---|---|
| **F-1** | Cocos 运行时 | **不可执行**：本机无 Cocos Creator 编辑器，客户端无法真实启动 | 所有 UI 卡验收为 `manual`（截图），无法自动化 |
| **F-2** | 真机 | **无** | C1 手感、6 项性能指标无基线（沿用 D-51） |
| **F-3** | 微信 appid / appsecret / 主体资质 | **无** | PD8-17 保持 `BLOCKED-HUMAN` |
| **F-4** | `docs/02_requirements/features/` 下的 REQ-F 编号 | **不存在**（该目录只有 README） | 卡片的"来源需求"用三段式锚（`mvp-scope` + 设计源 + 决策号）替代，见 `03 §1` |
| **F-5** | `~/.git-pat` 权限 | **644**（协议要求 600） | 推送前须 `chmod 600`；本版 PD8-01 会处理 |

## 6. `pd.mjs health` 当前**未通过**（5 个错误，可逐条复现）

```bash
$ node <skills>/product-development/scripts/pd.mjs health .
  错误：[PD7-07] 状态 DONE 但没有提交记录（无文件变化请写 no_change_reason）
  错误：[PD7-08] 非法 detail waves 无源（设计源无波次数值）…
  错误：[PD7-08] BLOCKED 但没有 blocked_reason
  错误：[PD7-09] 非法 detail 6 张设计空表…
  错误：[PD7-09] BLOCKED 但没有 blocked_reason
体检未通过：5 个错误，45 个提醒
```

**根因（读源码定位，不是猜）**：
`C:/Users/EDY/.claude/skills/product-development/scripts/lib.mjs:14` 定义
`DETAIL = ['READY', 'REFINE_BEFORE_EXECUTION']`——`detail` 是**枚举**，执行侧往里写了自由文本；
block 理由的正确字段是 `blocked_reason`（`pd.mjs:130` 校验 `status === 'BLOCKED' && !t.blocked_reason`）。
PD7-07 的错误是 `DONE_LIKE` 要求 `execution.commits[]` 或 `no_change_reason`（`pd.mjs:135`）。

→ 这是 **PD8-01 的第一项工作**，不是"治理层的小瑕疵"：health 不通意味着下游 `pd.mjs next`
的派工队列不可信（`status` 输出里 PD7-08/09 的阻塞原因显示为 `undefined`）。

## 7. 快照的一句话结论

**代码侧事实**：数据转录领先于实现（40/46 表有数，31/46 表零消费方），
**治理侧事实**：health 未通过、19 个提交未推、双端不一致。
这两件都不是"再写一个规划"能解决的，所以 v012 的前两张卡就是修它们。
