---
id: PLAN-V002-00
title: 规划快照（plan-v002 基线钉桩）
status: active
owner: hark
created: 2026-10-26
supersedes: plan-v001（2026-10-23 冻结快照）
review: 2026-11-02
---

# 00 规划快照

> 本规划钉在下列确定状态上，任何执行者必须能凭此复现。相对 plan-v001（10-23）的**递进**见文末对照表。

## 快照

```yaml
snapshot:
  规划日期: 2026-10-26
  git_repo: github.com/aideanew/WDF
  git_branch: master
  git_commit: 4e3578d63abac5ed058e7847eecbaa3fb16bff60
  远端一致性: 本地 HEAD == origin/master（rev-list 0/0，已 fetch 核对）
  工作区: 有未提交改动（E 系列 + BootController 修复，本规划不擅自提交业务代码）
  技术栈: Cocos Creator 3.8.8 / Node 22 / Fastify 5 / zod / PGlite / HMAC-SHA256
  需求权威: docs/01_product/design-source/我的筏-深度设计方案-v5.5.md
  测试命令: npm test        # 20 个用例（单元7/契约3/集成10/e2e0）
  守卫命令: npm run guard   # 9 项
  全量闸门: npm run verify  # gen + guard + test
  数值现状: 46 表 / 300 行 / configVersion=b249f288e985da48
```

## 相对 plan-v001 的递进（辩证：什么变了、什么没变）

| 维度 | plan-v001 (10-23) | 现状 (10-26) | 证据 |
|---|---|---|---|
| 服务端动作 | 5 实现 / 15 todo | **6 / 14**（+`account.refresh`） | `server/src/gateway/handlers.ts:30-49` |
| 数值表 | 46 表 / 0 行 | **46 表 / 300 行**（items106/prices106/locks5/chests3/recipes80） | `game-data/source/*.csv` |
| 客户端联网 | `FORCE_OFFLINE=true` | **`false`**（真联网 + 2002 静默刷新） | `client/.../RpcClient.ts` |
| payload 校验 | 4/20 | **20/20** | `server/src/gateway/payload.ts` |
| 测试 | 17 | **20**（e2e 仍 0） | `tests/**` |
| game-core | 8 逻辑 / 10 占位 | **未变**（10 占位） | `packages/game-core/src` |
| 客户端 features | 23 空壳 | **未变**（23 空壳） | `client/.../features` |
| DB | 13 表 / 无索引 | **未变**（无 regions / 无 0002 / 无索引） | `server/db/migrations/0001_init.sql` |
| 分包 | 0/7 生效 | **8 个 subpackages（全本地）** | `client/build/wechatgame/game.json` |

## 本规划前提与局限（不得当成"已完成"）

- 未逐条通读 v5.5 全文；模块功能以 `docs/02_requirements/functional-analysis.md`（归纳件）为准，数值以《材料与工具总表》转录件为准。
- 十余张核心数值表仍 0 行（见 01 §4）→ 相关切片标 **BLOCKING**，不臆造数字。
- 无真机证据 → 包体/性能/防沉迷类保持 `proposed`，不宣称通过（延续 ADR-0001）。
- `game-core` 规则函数与 v5.5 章节的覆盖完整度**未逐条核对**，标"部分确认"。
