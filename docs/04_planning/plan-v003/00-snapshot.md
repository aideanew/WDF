---
id: PLAN-V003-00
title: 快照与索引（v1.0 冲刺规划）
status: active
module: planning
owner: hark
created: 2026-10-27
related: [PLAN-0001, PLAN-V002-00, ADR-0011, MVP-Freeze]
---

# plan-v003 · v1.0 冲刺规划（M2）

> **一句话**：M1 已收官（13/13 卡），端到端断点已从"features 占位"**转移到"数值表 0 行"**。
> 本规划不写新玩法逻辑为主，而是**先清欠账、再解架构悬案、最后冲刺 v1.0 上线四件事**。

## 0.1 规划快照

```yaml
snapshot:
  规划日期: 2026-10-27
  git_branch: master
  git_commit: 13e6b68
  工作区: 干净，双端一致（origin/master == master）
  门禁基线: guard 9/9 · tests 107/107（determinism 52 / 契约 21 / 集成 33 / e2e 1）
  客户端类型检查: 新式过滤（grep -v "^C:/"）项目自身错误 = 0
  契约: 6 份冻结（API/Errors/Identity/Resources/Events/UX-States）
  数据: 46 表 300 行（configVersion=b249f288e985da48）；真表 5 张，空表 41 张
```

## 0.2 与前序规划的关系

| 前序 | 状态 | 本规划继承什么 |
|---|---|---|
| plan-v001 | superseded | 48 原子任务台账、期次裁决（12:27）：商人/回收进 v1.0，S8 赶海整片移 v1.1 |
| plan-v002 | done | 12 AT 收官；UX 态契约（DESIGN-0001） |
| EXEC-BRIEF-0002（M1） | done | 13 卡全完成；契约仍冻结（ADR-0011 未解冻） |

## 0.3 文件索引（每步一个 md）

| 文件 | 内容 | 谁读 |
|---|---|---|
| [01-fact-baseline.md](01-fact-baseline.md) | 事实基线 + 文档/代码差异清单 | 全员 |
| [02-scope-and-decisions.md](02-scope-and-decisions.md) | v1.0 范围复核 + **BLOCKING 裁决清单（数值欠账结构化）** | **用户必读** |
| [03-slices.md](03-slices.md) | 垂直切片 S11~S16 + 排序理由 | 全员 |
| [04-task-index-and-dag.md](04-task-index-and-dag.md) | 任务索引 + 依赖 DAG + 所有权矩阵 | 派工 |
| [05-wave1-data-unblock.md](05-wave1-data-unblock.md) | W1 数值清欠（卡 TASK-4001~4004） | 执行者 |
| [06-wave2-authority.md](06-wave2-authority.md) | W2 权威背包+商人回收（TASK-4005~4008） | 执行者 |
| [07-wave3-unlock-verify.md](07-wave3-unlock-verify.md) | W3 开锁+真机验证（TASK-4009~4012） | 执行者 |
| [08-wave4-release.md](08-wave4-release.md) | W4 合规包体+契约解冻（TASK-4013~4016） | 执行者 |
| [09-metrics.md](09-metrics.md) | 基线指标（含首次测量值或"尚无基线"） | 全员 |
| [10-risks.md](10-risks.md) | 风险 / 未决 / 待裁决 | 用户+主控 |
| [11-self-check.md](11-self-check.md) | 本规划自检结果 | 全员 |

## 0.4 使用纪律（沿用 EXEC-BRIEF-0002 已验证有效的）

1. **默认只读**；只写本规划允许的路径；缺事实标 BLOCKING，不编造。
2. 契约冻结不动：`packages/contracts/**` 本轮**禁止修改**，除非 08-wave4 的解冻卡被用户授权执行。
3. 改 `packages/**` 后必跑 `npm run sync`（守卫第 7 项会抓）。
4. 类型检查唯一正确过滤式：`npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 | grep -v "^C:/"`。
   （**禁止** `grep 项目路径`——会漏 `services/**` 造成假绿，10-27 实测吞掉过 7 个真错误。）
5. client 侧依赖 `'cc'` 的代码 Node 测不到：`npm test` 全绿 ≠ 完成，需 tsc 过滤式 + 人工录屏兜底。
6. 助手禁 `git commit`；统一主控提交。push 被重置时加 `-c http.version=HTTP/1.1`。
