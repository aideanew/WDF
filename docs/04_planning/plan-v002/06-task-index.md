---
id: PLAN-V002-06
title: 任务索引（WP → AT，本轮可执行 + 沿用/阻塞清单）
status: active
owner: hark
created: 2026-10-26
---

# 06 任务索引

> 三级：**WP（交付什么）→ AT（最小可独立验证）→ ES（怎么做，见任务卡）**。
> **纪律**：未解除 BLOCKING 的 AT **不生成任务卡**（执行者拿到也无法完成，只会瞎猜）。
> 编号延续 plan-v001 规则；本轮新增从 **WP-20** 起，避免与 v001 的 WP-01~17 冲突。

## 6.1 本轮新增 WP 总览（10-26 可开工）

| WP | 名称 | 切片 | 归属 | AT 数 | 状态 |
|---|---|---|---|---|---|
| WP-20 | 契约补缺 | S-CONTRACT | Agent-Contract | 1 | 可开工（串行，先做） |
| WP-21 | 出钩核心（C1） | S2a+S2b | Agent-Core + Client | 3 | 可开工（数值可注入） |
| WP-22 | 服务端未阻塞 handler | S5'+S9'+杂 | Agent-Server | 4 | 可开工 |
| WP-23 | 开锁状态机 | S7' | Agent-Core | 1（+1 阻塞） | 1 可开工 |
| WP-24 | 测试补强 | 贯穿 | Agent-Guard | 2 | 可开工 |
| WP-25 | 文档一致性返工 | 贯穿 | Agent-Docs | 1 | 可开工 |

**本轮合计 12 个 AT 可开工**；另有 `AT-2302`（开锁 UI）因 `drops=0` 标 BLOCKED。

---

## 6.2 本轮原子任务（每张 16 项必填，逐条）

### AT-2001 · 契约补缺（chest 业务类型 + 错误路径对照表）
- **归属切片**：S-CONTRACT
- **来源需求**：MUST-10、03 §① §② 缺口
- **来源方案**：plan-v002/03 契约冻结包
- **目标**：`chest` 有业务类型定义；`14 个错误码`每个至少对照 1 条失败路径。
- **输入**：文档 `docs/03_solution/data/api-catalog.md`；契约 `common/errors.ts`；前置 `E-07 已完成`；前置状态 `payload 20/20`
- **输出**：`packages/contracts/src/chest/index.ts`、`docs/03_solution/data/api-catalog.md`
- **Execution Steps**：
  1. 在 `chest/index.ts` 定义 `ChestOpenReq/Res`、`LockTier` 类型（只描述，不含规则）
  2. 在 `api-catalog.md` 补"错误码 → 触发条件 → 前端文案"表，14 码逐行
  3. `npm run sync` 生成客户端副本
- **验收标准**：`tsc` 无错；`npm run guard` 通过；错误码表 14 行无空
- **验证命令**：`npm run guard && npm test`
- **证据路径**：`docs/06_validation/evidence/EVD-2001/`
- **允许修改**：`packages/contracts/src/**`、`docs/03_solution/data/api-catalog.md`
- **禁止修改**：`server/**`、`client/**`（generated 由 sync 覆盖）
- **依赖与阻塞**：Depends on 无；Blocks AT-2101/2103/2201（都要用类型）；阻塞条件：错误码语义与用户口径冲突则停
- **建议档位**：`opus`（契约语义不可逆）
- **升级条件**：若要新增/改错误码 → `fable`
- **预估规模**：小（<0.5d）

### AT-2101 · game-core/hook 蓄力+轨迹+命中（确定性）
- **归属切片**：S2a
- **来源需求**：MUST-01、v5.5 §4.3（1.2s 往返）
- **来源方案**：plan-v002/05 §5.2
- **目标**：`chargeAndCast(powerBp, angle, targetDist, params)` 返回确定性 `{hit, travelMs, ...}`，同输入同输出。
- **输入**：文档 v5.5 §4.3；契约 `chest` 无关；前置 AT-2001；前置状态 `game-core 纯度守卫可用`
- **输出**：`packages/game-core/src/hook/index.ts`
- **Execution Steps**：
  1. 定义 `HookParams`（力度曲线参数、命中半径，**由调用方注入，不写死**）
  2. 实现 `powerBp = f(longPressMs)`（往返 1.2s，注入总时长）
  3. 实现轨迹距离判定 `hit = |dist - reach| <= radius`
  4. 严格不使用 `Math.random`/`Date.now`/`cc`/IO
- **验收标准**：determinism 测试"同种子同序列"；`powerBp=0/10000` 边界；`radius` 增大 → 命中集单调不减
- **验证命令**：`node --test tests/determinism/hook.test.mjs`
- **证据路径**：`docs/06_validation/evidence/EVD-2101/`
- **允许修改**：`packages/game-core/src/hook/**`、`tests/determinism/hook.test.mjs`
- **禁止修改**：`client/**`、`server/**`、`packages/game-core/src/generated/**`
- **依赖与阻塞**：Depends AT-2001；Blocks AT-2102/2103；阻塞条件：v5.5 §4.3 参数与用户手感要求冲突则停（U 待裁决）
- **建议档位**：`opus`（核心规则、影响全部玩法）
- **升级条件**：若需推翻力度曲线语义 → `fable` + 用户确认
- **预估规模**：中（~1d）

### AT-2102 · HookView 程序化表现（力度条/飞行/回手）
- **归属切片**：S2b
- **来源需求**：MUST-01
- **来源方案**：参照 `BootController.ts` 纯代码建 UI + Graphics
- **目标**：屏幕出现 1.2s 往返力度条（蓝→绿→红），长按蓄力、松手发射、命中反馈。
- **输入**：契约 `hook` 类型；前置 AT-2101；前置状态 `Boot 场景可运行`
- **输出**：`client/assets/scripts/features/hook/view/HookView.ts`、`features/hook/model/HookModel.ts`
- **Execution Steps**：
  1. Graphics 画力度条底/填充，按 `powerBp` 更新
  2. 长按/松开事件接 `chargeAndCast`
  3. 命中时轻微震屏（平台 `vibrate`），埋点 `hook.hit/miss`
- **验收标准**：手工演示"长按→条往复→松手→命中/脱钩"；埋点可导出首钩命中率
- **验证命令**：手工录屏 → EVD-2102；`npm run guard`
- **证据路径**：`docs/06_validation/evidence/EVD-2102/`
- **允许修改**：`client/assets/scripts/features/hook/**`
- **禁止修改**：`packages/game-core/**`、`server/**`、`client/.../generated/**`
- **依赖与阻塞**：Depends AT-2101；Blocks AT-2103；阻塞条件：无美术资源时用 Graphics 兜底，不阻塞
- **建议档位**：`opus`
- **升级条件**：若需 prefab/动画资源 → 先由用户出资源
- **预估规模**：中（~1d）

### AT-2103 · 出钩接线（命中→入包→存档）
- **归属切片**：S2b/S1 收口
- **来源需求**：MUST-01、MUST-03
- **来源方案**：plan-v001 S1 链路
- **目标**：命中后物品 +1 写入 `LocalSave`，revision 递增，checksum 有效。
- **输入**：前置 AT-2101/2102 + AT-0106（LocalSave）；前置状态 `LocalSave 已可用`
- **输出**：`features/hook/model/HookModel.ts`
- **Execution Steps**：
  1. 命中回调取 `items` id（先固定 `item_0001` 漂流木）
  2. `LocalSave.save()` 累加 + revision+1
  3. 失败走统一错误 toast
- **验收标准**：集成测试断言 revision 递增、checksum 通过；杀进程重启物品还在
- **验证命令**：`node --test tests/integration/hook-save.test.mjs`
- **证据路径**：`docs/06_validation/evidence/EVD-2103/`
- **允许修改**：`features/hook/model/**`、`tests/integration/hook-save.test.mjs`
- **禁止修改**：`game-core/src/hook/**`、`server/**`
- **依赖与阻塞**：Depends AT-2101/2102；阻塞条件：无
- **建议档位**：`sonnect`
- **升级条件**：若存档结构要改 → `opus` + 迁移
- **预估规模**：小（~0.5d）

### AT-2201 · account.bindStart / bindConfirm
- **归属切片**：S5'（账号合并）
- **来源需求**：MUST-02、SR-03
- **来源方案**：`bind_ticket` 表已存在（`0001_init.sql:16`）
- **目标**：签发绑定票据→确认后两平台身份合并为同一 `player`；重复绑定幂等。
- **输入**：契约 `account` 类型；前置 `identity/bind_ticket` 表；前置状态 `account.login 已实现`
- **输出**：`server/src/modules/account/handlers.ts`（追加两 handler）、`service.ts`、`repo.ts`
- **Execution Steps**：
  1. `bindStart`：为当前 player 生成 ticket（存 `bind_ticket`），返回 ticket
  2. `bindConfirm`：校验 ticket → 把第二个 identity 挂到同 player
  3. 注册进 `gateway/handlers.ts`（替换 todo）
- **验收标准**：集成测试"两身份合并后 `playerId` 相同"；重复 confirm 幂等（`idempotency`）
- **验证命令**：`node --test tests/integration/bind.test.mjs`
- **证据路径**：`docs/06_validation/evidence/EVD-2201/`
- **允许修改**：`server/src/modules/account/**`、`server/src/gateway/handlers.ts`、`tests/integration/bind.test.mjs`
- **禁止修改**：`packages/contracts/**`（类型已冻结）、`server/db/migrations/0001_*`
- **依赖与阻塞**：Depends AT-2001；阻塞条件：若需改 `identity` 结构 → 先 `0002` 迁移（串行）
- **建议档位**：`opus`
- **升级条件**：若合并涉及跨区服 → `fable` + 用户裁决
- **预估规模**：中（~1d）

### AT-2202 · save.resolveFork
- **归属切片**：S5'
- **来源需求**：MUST-04、SR-05
- **来源方案**：`save_fork` 表（`0001_init.sql:31`）
- **目标**：分叉后二选一，存档收敛到选定 revision，另一支标记废弃。
- **输入**：契约 `save` 类型；前置 `save.pull/push`；前置状态 `save_fork` 表存在
- **输出**：`server/src/modules/save/handlers.ts`、`service.ts`、`repo.ts`
- **Execution Steps**：
  1. `resolveFork(baseRevision, chosenRevision)` 校验归属
  2. 更新 `save_fork` 状态 + 刷新 `save_snapshot`
  3. 注册 handler
- **验收标准**：集成测试"制造分叉→选边→pull 得选定档"
- **验证命令**：`node --test tests/integration/fork.test.mjs`
- **证据路径**：`docs/06_validation/evidence/EVD-2202/`
- **允许修改**：`server/src/modules/save/**`、`server/src/gateway/handlers.ts`、`tests/integration/fork.test.mjs`
- **禁止修改**：`packages/contracts/**`、`packages/game-core/src/save/**`
- **依赖与阻塞**：Depends AT-0107（已完成）；阻塞条件：无
- **建议档位**：`opus`
- **升级条件**：若冲突策略要改语义 → `fable`
- **预估规模**：中（~1d）

### AT-2203 · leaderboard.report / query（总收益榜）
- **归属切片**：S9'
- **来源需求**：MUST-12、functional-analysis §5.3
- **来源方案**：`income_daily`/`leaderboard_snapshot` 表
- **目标**：上报一次有效收益→写 `income_daily`；query 返回快照榜。
- **输入**：契约 `leaderboard` 类型；前置 `exceedsHourlyCap`（`game-core/leaderboard`）；前置状态 `表存在`
- **输出**：`server/src/modules/leaderboard/handlers.ts`、`service.ts`、`repo.ts`
- **Execution Steps**：
  1. `report`：校验→写 `income_daily`→更新快照；接 `exceedsHourlyCap` 风控
  2. `query`：读 `leaderboard_snapshot` 返回
  3. 注册两 handler
- **验收标准**：集成测试"上报 3 条→query 排序正确"；超频返回 4001
- **验证命令**：`node --test tests/integration/leaderboard.test.mjs`
- **证据路径**：`docs/06_validation/evidence/EVD-2203/`
- **允许修改**：`server/src/modules/leaderboard/**`、`gateway/handlers.ts`、`tests/integration/leaderboard.test.mjs`
- **禁止修改**：`packages/contracts/**`、`packages/game-core/src/leaderboard/**`（只读复用）
- **依赖与阻塞**：Depends AT-2001；阻塞条件：计分口径（§5.3）若改 → 用户裁决
- **建议档位**：`sonnect`
- **升级条件**：若加 Redis/压测 → `opus`
- **预估规模**：中（~1d）

### AT-2204 · telemetry.track
- **归属切片**：杂（贯穿）
- **来源需求**：functional-analysis telemetry
- **目标**：批量上报事件入库；超额丢弃；绝阻塞主流程。
- **输入**：契约 `telemetry` 类型；前置 `audit_log` 表
- **输出**：`server/src/modules/telemetry/handlers.ts`、`service.ts`
- **Execution Steps**：
  1. 收 `events[]`，校验批量上限
  2. 写库（或先 `console` 落地，表可后续加）
  3. 失败只 log 不抛
- **验收标准**：集成测试"上报不报错、主流程不受影响"；超额返回明确码
- **验证命令**：`node --test tests/integration/telemetry.test.mjs`
- **证据路径**：`docs/06_validation/evidence/EVD-2204/`
- **允许修改**：`server/src/modules/telemetry/**`、`gateway/handlers.ts`
- **禁止修改**：`packages/contracts/**`
- **依赖与阻塞**：无
- **建议档位**：`sonnect`
- **升级条件**：若需 TTL 表 → 先 0002
- **预估规模**：小（~0.5d）

### AT-2301 · 开锁一局状态机
- **归属切片**：S7'
- **来源需求**：MUST-10
- **来源方案**：`chest/index.ts` 已有 `LOCK_HITS/isHit`
- **目标**：一局连中计数、失误不重置已中数、工具用一次断一根。
- **输入**：前置 `chest` 原子规则；前置状态 `game-core 纯度`
- **输出**：`packages/game-core/src/chest/index.ts`（扩展）
- **Execution Steps**：
  1. 定义 `LockSession` 状态（已中数/工具剩余）
  2. `attempt()` 返回 hit/miss，更新状态
  3. 工具消耗-1，为 0 则终止
- **验收标准**：determinism 测试"连中 3 次→第 4 次失误→已中数仍 3"；工具耗尽终止
- **验证命令**：`node --test tests/determinism/chest.test.mjs`
- **证据路径**：`docs/06_validation/evidence/EVD-2301/`
- **允许修改**：`packages/game-core/src/chest/**`、`tests/determinism/chest.test.mjs`
- **禁止修改**：`client/**`、`server/**`
- **依赖与阻塞**：无（不依赖数值表）
- **建议档位**：`sonnect`
- **升级条件**：若锁档数值要进代码 → 禁止，必须进 game-data
- **预估规模**：小（~0.5d）

### AT-2302 · 开锁 UI 【BLOCKED】
- **阻塞**：`drops=0`（开箱产出无数值）、`chests.smashable/size` 空
- **状态**：不生成任务卡；数值齐备后再拆。

### AT-2401 · handler 契约测试补强
- **归属切片**：S-TEST
- **来源需求**：MUST-14、问题 C10（"全占位也全绿"）
- **目标**：每个已实现动作都有"成功 + 至少 1 失败路径"用例，且能识别"未实现返回 4999"。
- **输入**：`tests/integration/*`、`tools/`；前置 `payload 20/20`
- **输出**：`tests/integration/*.test.mjs`（扩充）、可能 `tools/test/gen-cases.mjs`
- **Execution Steps**：
  1. 遍历 `ACTIONS`，为已实现者生成成功/失败骨架
  2. 断言"todo 动作返回 4999，不得被当成功"
  3. 覆盖率报告落到 evidence
- **验收标准**：`npm test` 通过且用例数 > 20；未实现动作有专门断言
- **验证命令**：`npm test`
- **证据路径**：`docs/06_validation/evidence/EVD-2401/`
- **允许修改**：`tests/**`、`tools/**`
- **禁止修改**：`server/**`、`client/**`、`packages/**`
- **依赖与阻塞**：Depends 各 handler 落地进度；阻塞条件：无
- **建议档位**：`opus`
- **升级条件**：若要改测试框架 → 用户确认
- **预估规模**：中（~1d）

### AT-2402 · e2e 骨架 1 条
- **归属切片**：S-TEST
- **来源需求**：MUST-14（e2e=0）
- **目标**：登录→出钩(或 mock)→存档→push→pull 一条端到端脚本可跑。
- **输入**：`tests/e2e/README.md`（待补）
- **输出**：`tests/e2e/skeleton.test.mjs`
- **Execution Steps**：
  1. 起内存 PGlite + `handleRpc`
  2. 串 login→push→pull
  3. 断言 revision/checksum
- **验收标准**：`node --test tests/e2e/skeleton.test.mjs` 通过
- **验证命令**：`node --test tests/e2e/skeleton.test.mjs`
- **证据路径**：`docs/06_validation/evidence/EVD-2402/`
- **允许修改**：`tests/e2e/**`
- **禁止修改**：`server/src/modules/**`（只调用）
- **依赖与阻塞**：Depends AT-2202（resolveFork 可选）；阻塞条件：无
- **建议档位**：`sonnect`
- **升级条件**：若 e2e 要跑真 HTTP → `opus`
- **预估规模**：小（~0.5d）

### AT-2501 · 文档一致性返工
- **归属切片**：贯穿
- **来源需求**：02 C-04、01 §8（6 处滞后）
- **目标**：`current-plan.md`/`structure-verification.md` 的"6/14、300 行、FORCE_OFFLINE=false、20 测试"与代码一致。
- **输入**：01 §8 清单
- **输出**：`docs/04_planning/current-plan.md`、`docs/06_validation/structure-verification.md`
- **Execution Steps**：逐条改数字；补 plan-v002 指向
- **验收标准**：文档数字 == 代码实测（脚本比对）
- **验证命令**：`npm run guard`（front matter）
- **证据路径**：`docs/06_validation/evidence/EVD-2501/`
- **允许修改**：上述两文档
- **禁止修改**：代码
- **依赖与阻塞**：无
- **建议档位**：`sonnect`
- **升级条件**：无
- **预估规模**：小（~0.3d）

---

## 6.3 沿用 plan-v001 仍未完成的 AT（不在本轮，登记备查）

| 类别 | AT | 原因 |
|---|---|---|
| 数值阻塞 | AT-0301/0302/0303（S3）、AT-0403（S4）、AT-0601/0602（S6）、AT-1101/1102（S11）、AT-1201（S12）、AT-1501 | N-1~N-10 空表（01 §4） |
| 环境阻塞 | AT-0903、AT-1001/1002/1003/1004 | 无真机/备案（已降并行待办） |
| v1.1 移出 | AT-0801/0802/0803、AT-0902、AT-1302 | 10-23 12:27 决定 |
| 已实部分 | AT-0201/0202/0203/0204 | 本轮由 AT-2101/2102/2103 取代并细化 |
| 可做未做 | AT-0701/0702（开锁）、AT-0501/0502/0503（同步） | 本轮 AT-2301 覆盖 0701；余下顺延 |

> 完整 48 AT 原始定义见 `docs/04_planning/plan-v001/06-task-index.md`；本表只标"相对本轮的取舍"。

## 6.4 任务卡
- 本轮 first-cut 三张卡已落盘：`docs/05_execution/tasks/TASK-2001.md`、`TASK-2101.md`、`TASK-2201.md`。
- 其余 AT 的 ES 细节按 `docs/05_execution/task-template.md` 生成；**未解除阻塞者不生成**。
