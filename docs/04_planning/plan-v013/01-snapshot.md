---
id: PLAN-V013-01
title: plan-v013 · 规划快照与仓库身份核对
status: active
module: planning
owner: hark
created: 2026-10-30
review: 2026-11-13
related: [PLAN-V013-00, PLAN-V013-02]
---

# 01 · 规划快照与仓库身份

## 1. 快照

```yaml
snapshot:
  规划日期: 2026-10-30
  采集时刻: 16:56–17:20 (GMT+8)
  项目: WDF（奖励一颗麻籽 / wdf-my-raft）

  git:
    本地分支: main
    本地 HEAD: 45111c3   # 完整 SHA 见 `git rev-parse HEAD`
    origin URL: https://github.com/aideanew/WDF.git
    origin/master: 11c7427   # 本地领先 4 个提交（45111c3 / 7b476c0 / 39efe36 / a8b7ac9），未推送
    工作区: 仅两项未跟踪 —— docs/04_planning/plan-v013/（本规划）、docs/06_validation/evidence/EVD-8101/（兜底 zip）

  目标远端（用户本轮指定）:
    仓库: https://github.com/nevermeetagain/WDF.git
    实际分支: main（唯一分支）
    指针: 4e572fa49bbcf9c9139c8505f2b5663d04bf30e8
    与本地关系: 4e572fa 是 45111c3 的祖先（merge-base = 4e572fa），落后两天（只到 plan-v010）
    写权限: ❌ 用现有 PAT 推送 → remote: Repository not found.

  治理:
    PD schema: product-development/config@2
    权威索引: .product-development/task-index.json
    plan_version: PLAN-R5（本版落盘后由 PD9-03 升为 PLAN-R6）
    baseline_commit: 11c7427（**不等于 HEAD 45111c3** → 一致性缺陷 C-03）
    任务卡数: 105
    决策数: 45（DECIDED 41 / PROPOSED 4）

  规模:
    手写 TS 文件: 202        # 排除 generated 与 node_modules
    测试文件: 40 个 .test.mjs
    docs: 408 篇 .md（其中 338 进 document-index；README.md 按设计跳过）
    数值表: 46 张（40 非空 / 6 空 / 568 行）

  命令:
    定向测试: node --import ./tools/runtime/register.mjs --test <file>
    全量闸门: npm run verify   # 本版按用户要求「拒绝全量回归」未执行
    影响面: npm run impact <kw>
    阶段体检: npm run stage <kw>
```

## 2. 双端一致性核对（三层证据）

```bash
# ① 本地 → 追踪引用
git rev-parse HEAD            # 11c7427...
git rev-parse origin/master   # 11c7427...

# ② 远端真实指针（不走缓存，避免 origin/master 陈旧）
git ls-remote --heads https://github.com/aideanew/WDF.git
# 11c7427...  refs/heads/master

# ③ 目标远端
git ls-remote --heads https://github.com/nevermeetagain/WDF.git
# 4e572fa...  refs/heads/main
```

| 端 | 分支 | 指针 | 与本地 HEAD 关系 |
|---|---|---|---|
| 本地 `E:\Demo\WDF` | `main` | `11c7427` | — |
| `aideanew/WDF` | `master` | `11c7427` | **相同**（可写，当前 `origin`） |
| `nevermeetagain/WDF` | `main` | `4e572fa` | **祖先，落后 2 天**（不可写） |

**结论**：`aideanew` 与本地**完全一致**；`nevermeetagain` 落后且不可写。
用户本轮指令把 WDF 指向 `nevermeetagain`，但**该仓库不是最新**（只到 `plan-v010`，缺 v011/v012/PD7/PD8）。
→ 登记为 **D-61（BLOCKING）**，四选项见 `08-metrics-risks.md §3`。

## 3. 僵尸卡逐条（本版核心事实）

**判定依据**：`plan-v012/00-README.md:106` 声明取代 → 索引应为 `SUPERSEDED` + `superseded_by` 有值。
**实测**：11/11 仍 `TODO`，`superseded_by` 全空。

| 卡片 | 索引 status | superseded_by | 应指向 | 与后继卡 objective 关系 |
|---|---|---|---|---|
| PD7-02 | TODO | （无） | PD8-02 | 逐字相同（raft 用例层 + 存档投影） |
| PD7-03 | TODO | （无） | PD8-03 | 同（raft 建造面板） |
| PD7-04 | TODO | （无） | PD8-04 | 同（浮力/承重六态） |
| PD7-05 | TODO | （无） | PD8-05 | 同（潮汐窗口） |
| PD7-10 | TODO | （无） | PD8-08 | progression |
| PD7-11 | TODO | （无） | PD8-09 + PD8-10 | crew + power 被拆两卡 |
| PD7-12 | TODO | （无） | PD8-16（部分） | ads；**注意 D-49 已冻结三效果至 v1.1** |
| PD7-13 | TODO | （无） | PD8-15（部分） | leaderboard 赛季/称号 |
| PD7-14 | TODO | （无） | PD8-15 | event 赶海 |
| PD7-15 | TODO | （无） | PD8-14 | island + defense |
| PD7-16 | TODO | （无） | PD8-12 + PD8-13 + PD8-16 | 三件被拆三卡 |

**为什么这会致灾（而非只是难看）**

```bash
node -e "const a=require('./.product-development/task-index.json').tasks;
const p7=a.find(x=>x.id==='PD7-02'),p8=a.find(x=>x.id==='PD8-02');
console.log('PD7-02',p7.status,'dep',p7.depends_on,'allowed',p7.allowed_paths);
console.log('PD8-02',p8.status,'dep',p8.depends_on,'allowed',p8.allowed_paths);"
```

- 两者 `status` 都是"可领"，`depends_on` 都已满足（PD7-01 `DONE`；PD8-02 无依赖）；
- 两者 `allowed_paths` 都含 `packages/game-core/src/raft/**` 与 `packages/game-core/src/save/**`；
- 并行拆卡规则（规划指令 §7.1）要求「文件所有权不相交」→ **这一条被直接违反**。

## 4. 与 v012 基线的关系

`task-index.json` 顶层：`plan_version = PLAN-R5`、`baseline_commit = 11c7427`。
本版快照与之**一致**，无需重设基线。

但 `replans` 数组显示已发生至少两次重规划（PLAN-R1→R2、P0 复盘改 role）。本版是第三次，
**因此必须在 `replans` 里留痕**（PD9-01 的步骤 5）——否则下一次接手无法知道 v013 存在。

## 5. 读取失败 / 无法访问

| 项 | 原因 | 影响 |
|---|---|---|
| `pd.mjs`（`plan-v012` 与 `current-plan` 引用的健康检查 CLI） | **不在仓库**（`find . -name "pd*.mjs"` 无结果）；**不在已安装技能列表**（无 PDS 技能） | 无法执行 `pd.mjs health`；本版改用直接读 JSON 的自建校验（PD9-01） |
| `nevermeetagain/WDF` 写权限 | 现有 PAT 仅 `aideanew` 作用域 | 推送目标受限 → D-61 |
| Cocos 运行时 | 沙箱无编辑器 | UI 类验收只能人工 + 录屏 |
| 微信 `appid`/`appsecret` | 不在仓库（正确做法） | PD8-17 保持 `BLOCKED-HUMAN` |
