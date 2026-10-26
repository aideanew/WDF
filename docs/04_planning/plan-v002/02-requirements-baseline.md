---
id: PLAN-V002-02
title: 需求基线复核（MUST/SHOULD/COULD/MUST NOT + 冲突 + 未知登记）
status: active
owner: hark
created: 2026-10-26
---

# 02 需求基线复核

> 独立复核，不默认既有需求完整。来源：`functional-analysis.md`、`milestones.md`、`v5.5`（经归纳件）、ADR-0007/0008。

## 2.1 复述与拆解

**核心问题**：一款"出钩捞物 → 制作 → 扩筏 → 员工经营 → 深海 → 占岛塔防 → 赶海排行"的微信/抖音双平台小游戏，逻辑与数值服务端权威、客户端演示，单/低配机 30 帧。

**用户/管理端/边界**：玩家（微信+抖音，未来 APP，绑定后同一账号）；管理端仅"脚本+SQL"（U-06 已定，无后台界面）；边界=只做 v1.0，第二版（pvp/trade/recruit/burial/ocean）只登记不建。

**关键词**：出钩手感、确定性、服务端权威、数值可调、存档可升级、幂等、主包≤4MB、30 帧。

## 2.2 分级（逐条可验证）

### MUST（缺失则项目不成立，均可改写为一句可验证的话）
| 编号 | 需求（可验证形式） | 现状 | 证据 |
|---|---|---|---|
| MUST-01 | 出钩：长按蓄力→力度条 1.2s 往返→松手发射→命中判定，结果确定性 | **未实现（game-core/hook 占位）** | `game-core/src/hook/index.ts` |
| MUST-02 | 账号：平台登录签发 token，未登录访问受保护动作返回 2001 | 已实现 | `handlers.ts:30`；`auth.test.mjs` |
| MUST-03 | 本地存档：写入→杀进程→重启可恢复，篡改 1 位判损坏 | 已实现 | `LocalSave.ts` / `save/schema.ts` |
| MUST-04 | 云存档：`save.push/pull` 落 `save_snapshot`，乐观锁+幂等 | 已实现 | `handlers.ts:35-36` |
| MUST-05 | 合规：启动 `compliance.check`，未联网不可进 | 已实现 | `handlers.ts:34` |
| MUST-06 | 配置：`config.manifest` 返回真实 configVersion，不符返回 9001 | 已实现 | `handlers.ts:49` |
| MUST-07 | 数值：items/prices/recipes/locks/chests 从《总表》转录，零自编 | 已转录 300 行 | `game-data/source` |
| MUST-08 | 背包/重量/浮力：超重拒绝、浮力≥总重 | **BLOCKING（N-1/N-3 无数值）** | `items.weight=0`、`raft_tiles=0` |
| MUST-09 | 合成/等级解锁：配方门槛、等级解锁 | **BLOCKING（N-4 + blueprints/quality 空）** | `levels=0` |
| MUST-10 | 开锁：4 档锁连中/失败不重置/工具消耗 | 半（原子规则在，状态机缺） | `chest/index.ts` |
| MUST-11 | 经济：回收价×50%、区域±30%、每日配额 | **BLOCKING（N-10/D-02）** | `merchants/limits=0` |
| MUST-12 | 排行榜：总收益榜快照 | 未实现（todo） | `handlers.ts:40-41` |
| MUST-13 | 上线：微信真机包、主包≤4MB、防沉迷、概率公示 | **BLOCKED（无真机）** | 无证据 |
| MUST-14 | 测试：`npm run verify` 全绿（守卫+测试） | 已实现（9+20） | 实测 |

### SHOULD（缺失则体验受损）
- SHOULD-01 塔防技术验证（固定步长+回放一致性）——不确定性最高，应早验证（BLOCKING N-5/N-8）。
- SHOULD-02 管理端脚本级开区/封号（需 `0002_regions.sql`）。
- SHOULD-03 e2e 测试补强（当前 0 用例）。
- SHOULD-04 账号绑定 `account.bindStart/bindConfirm`（多平台合并；当前 todo，**不需数值即可实现**）。

### COULD（资源允许才做）
- COULD-01 微信好友榜（开放数据域，非 Cocos 渲染）——v1.1 触发式。
- COULD-02 冒烟性能埋点（首屏 P90），需先有基线。

### MUST NOT（同等重要，框定范围）
| 编号 | 不做 | 依据 |
|---|---|---|
| MUSTNOT-01 | 真机联调 / ICP 备案 / 软著阻塞开发 | 用户：先本地开发（10-23） |
| MUSTNOT-02 | 为第二版（pvp/trade/recruit/burial/ocean）建目录或表 | AGENTS.md + current-plan「本计划不含」 |
| MUSTNOT-03 | 无基线的"优化"任务 | plan-v001/09 |
| MUSTNOT-04 | 自编《总表》没有的数值 | E-06 铁律 + `UNKNOWN-TABLES.md` |
| MUSTNOT-05 | 手改 `client/.../generated/`；在 game-core 用 `cc`/`Math.random`/`Date.now`/IO | AGENTS.md §2 |
| MUSTNOT-06 | 服务端信任客户端上报的分数/资源 | AGENTS.md §2 |

## 2.3 冲突清单（必须显式，不静默替用户决定）

| 编号 | 冲突 | 状态 | 处理 |
|---|---|---|---|
| C-01 | 范围超载：v1.0 约 24.5 人日 vs 5 周 25 工作日，单人满打满算不够 | 已确认（v001 判定 2.5–3 倍超载） | 见 10 §风险；建议本轮只保"核心+测试" |
| C-02 | `daily_quota` 语义冲突（D-02）：每人每天配额头按什么计 | **未决 BLOCKING** | 需用户裁决 |
| C-03 | `event_session` 无 `ops` 字段（D-03），赶海复算缺载体 | **未决 BLOCKING** | 需迁移 `0002`+字段 |
| C-04 | 文档口径滞后于代码（01 §8 六处） | 已确认 | 本轮顺手修正 current-plan/structure-verification |
| C-05 | 10 张核心数值表 0 行 vs "重点实现核心功能" | **未决 BLOCKING** | 数值缺失的切片只做"算法+参数注入"，不做数值模型 |

## 2.4 未知登记册

### BLOCKING（缺它规划根本分叉，必须人裁决）
| 编号 | 未知 | 需决定 |
|---|---|---|
| U-N1 | `items.weight/capacity/stack` 是否有值 | 是否允许本轮用"占位常量 1"跑通逻辑、数值后补？（**建议：允许算法层用注入参数，不写死数值**） |
| U-N2 | `raft_tiles/levels/units/waves/islands/merchants/hooks/lines` 等 13 表数据来源 | 是否有未纳入《总表》的补充文档？无则相关切片继续 BLOCKING |
| U-D2 | `daily_quota` 计额口径 | 按"把数"还是"价值"？ |
| U-D3 | 赶海 ops 复算载体 | 是否本轮新增 `0002` 迁移补字段 |
| U-P1 | 是否允许本轮**只做算法+契约+测试**，数值类 UI 延后 | 这决定本轮交付边界（**建议：允许**） |

### NON_BLOCKING（可假设+依据，任务卡标注）
| 编号 | 未知 | 本轮假设 |
|---|---|---|
| U-A1 | 好友榜是否要 | 假设 v1.1，不阻塞 |
| U-A2 | 真机包体 | 假设不验，标 proposed |

## 2.5 隐含要求与前置条件（用户没说但必需）
- 每个写动作必须幂等（SR-07）→ handler 必须有 `rid`+`idempotency` 表接入。
- 服务器时间为准（SR-06）→ 响应 `t` 必须真实，客户端算偏移。
- 契约唯一源（zod/TS）→ 改契约必须同步 `npm run sync` 生成客户端副本。
- 跨端确定性（SR-01）→ game-core 每次改动必须过 determinism 测试。
- 指数/索引缺失：`leaderboard.query`、`save_snapshot` 高频查询无索引 → 属性能前置，但**无基线不排优化**，仅登记。
