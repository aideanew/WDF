---
id: PLAN-V011-01
title: plan-v011 · 01 规划快照（本规划钉在哪个状态上）
status: active
module: planning
owner: hark
created: 2026-10-29
review: 2026-11-12
related: [PLAN-V011-00, PLAN-V011-02]
---

# 01 · 规划快照

**本规划的全部结论只对本节钉住的状态成立。** 状态一变，先重跑本节命令，再读其他文件。

## 1. 快照 YAML

```yaml
snapshot:
  规划日期: 2026-10-29
  git_branch: main            # upstream = origin/master；远端默认分支 = master（见 02 §3 I-11）
  git_commit: 4e572fa         # docs(p5): PD5-03 执行留痕
  remote: https://github.com/nevermeetagain/WDF.git
  工作区是否干净: true        # git status --porcelain 输出 0 行
  双端一致: 0 0               # git rev-list --left-right --count origin/master...HEAD
  需求文档清单:
    - docs/01_product/mvp-scope.md                        (2026-10-23 12:37)
    - docs/01_product/product-vision.md                   (2026-10-23 10:10)
    - docs/01_product/design-source/我的筏-深度设计方案-v5.5.md (冻结，未改)
    - docs/03_solution/decisions/decision-index.json      (2026-10-29 12:20)
    - docs/00_governance/module-catalog.json              (2026-10-23 10:43)
  代码文件数:
    ts文件: 245
    ts/mjs/js/json/csv/sql合计: 491
  测试命令:
    全量: npm run test        # node --import ./tools/runtime/register.mjs --test "tests/**/*.test.mjs"
    定向: npm run impact <kw> # tools/guard/impact.mjs
    阶段: npm run stage <kw>  # tools/dev/stage.mjs（impact + 定向 node --test）
    闸门: npm run verify      # gen + guard + test + typecheck（本规划**不在日常使用**，见 08 §4）
```

## 2. 快照各字段的取数命令（可直接复跑）

| 字段 | 命令 | 本次输出 |
|---|---|---|
| commit | `git rev-parse --short HEAD` | `4e572fa` |
| 工作区 | `git status --porcelain \| wc -l` | `0` |
| 双端 | `git rev-list --left-right --count origin/master...HEAD` | `0	0` |
| ts 文件数 | `git ls-files '*.ts' \| wc -l` | `245` |
| 全部代码文件 | `git ls-files \| grep -cE '\.(ts\|mjs\|js\|json\|csv\|sql)$'` | `491` |
| 测试文件数 | `git ls-files 'tests/**/*.mjs' \| wc -l` | `37` |
| 守卫项数 | `node tools/guard/run-all.mjs` | 10 项（9 项 `names` + 第 10 项占位值 baseline） |
| pds 体检 | `node <skill>/scripts/pd.mjs health .` | **体检通过（45 个提醒，0 错误）** |
| 任务索引 | `.product-development/task-index.json` | `plan_version: PLAN-R3`，70 张（DONE 50 / SUPERSEDED 9 / VERIFIED 3 / BLOCKED 8） |
| 主包体积 | `du -sh client/build/wechatgame` | `3.1M`（上限 3.5M，REQ-NF-0001:13） |

## 3. 与快照绑定的三条纪律

1. **本规划的"未实现"判定只对 `4e572fa` 成立。** 若接手时 `git rev-parse HEAD` 不是 `4e572fa` 且 `git log 4e572fa..HEAD` 触及 `client/assets/scripts/features/**`、`packages/game-core/src/**`、`game-data/source/**`，则 `02-fact-baseline.md §2` 的模块矩阵必须重测后再用。
2. **`docs/05_execution/task-index.md` 是生成视图，不得作为权威**（`current-plan.md` R-8 已定）。权威是 `.product-development/task-index.json`（`config.json:paths.task_index` 逐字指向）。
3. **本快照不含任何凭据。** 本次 `git fetch origin` 因缺凭据失败（`fatal: could not read Username for 'https://github.com'`），双端一致性以**本地 `origin/master` 引用**为据，不是以实时远端为据 —— 这个差别必须随结论一起说（见 `10-risks-pending.md R-7`）。

## 4. 采集过程中读取失败 / 无法访问的部分（不跳过，逐条说明）

| # | 对象 | 结果 | 处置 |
|---|---|---|---|
| F-1 | 远端实时状态（`git fetch origin`） | **失败**：`fatal: could not read Username for 'https://github.com': terminal prompts disabled` | 用本地 `origin/master`（与 HEAD 同 SHA）作一致性依据；推送阶段再解（`10 §R-7`） |
| F-2 | Cocos Creator 运行时 | **不可执行**（编辑器未启动，`getPlatform()` 不可注入） | 所有 UI 类卡片的人工验收标准写成"可截图/可录屏的可见现象"，不写"自动化断言" |
| F-3 | 真机（微信/安卓） | **不可访问** | 3 项真机相关沿用 D-51 的 `BLOCKED-HUMAN`，本规划**不新增**真机任务 |
| F-4 | `docs/02_requirements/features/` 下的 REQ-F 文档 | **不存在**（该目录只有 `README.md`） | 需求追溯改锚到 `mvp-scope.md` 条款号 + 设计源 v5.5 章节 + 决策 ID，见 `03 §2.1` |
| F-5 | 微信 appid / appsecret / 主体资质 | **用户侧未提供** | 不假设、不编造；PD7-17 标 `BLOCKED`，解除条件沿用 D-51 |

## 5. 快照的自我限制

1. 本快照的"代码文件数"是 `git ls-files` 口径，**不含 `node_modules`**，也不含 `client/build/`（构建产物不在 Git 内，但 `du` 实测仍在磁盘上，故主包体积可用）。
2. `4e572fa` 的测试通过数是**台账记录**（`docs/06_validation/pd/test-ledger.json`：`SNAP-4016` → tests 219/219 @ `4ff9396`；`TR-20261029011052-PD4-01` → 全量回归 PASS @ `73a4177`），**不是本次重跑结果**。本次遵照"拒绝全量回归"未重跑 `npm run verify`。
3. 因此本规划**不新提出任何"优化"任务**（`09-baseline-metrics.md §3` 逐条说明哪些指标尚无基线）。
