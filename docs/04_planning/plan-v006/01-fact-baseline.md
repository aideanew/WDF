---
id: PLAN-V006-01
title: 事实基线（含文档与代码不一致清单）
status: active
module: planning
---

# 2. 事实基线

## 2.1 已确认的事实
1. `TASK-4015`、`TASK-4007`、`TASK-4008` 的代码均已合入，且依赖的跨模块引用错误已被修复。
2. `npm run guard` 检查全绿（跨模块边界与生成物一致性已达标）。
3. `npm test` 128 个测试用例全绿，其中 `2004` 相关契约测试均已覆盖。
4. plan-v005 中指出的阻塞项 (F-01 ~ F-12) 绝大部分随着最新提交已不复存在。

## 2.2 文档与代码不一致清单
1. **箱子与物品 id 割裂**：`chests.csv` 使用 `chest_wood` 等标识，而背包中记录的为 `item_0065`，仍需在 `chests.csv` 中新增 `item_id` 字段。
2. **开锁配置不一致**：`game-core/chest` 硬编码了 `LOCK_HITS`，而 `locks.csv` 中定义了另一套开锁次数。
3. **沉船动作错位**：文档规划使用 `salvage.claimInfo` 进行开箱，但该动作语义为获取沉船信息；实际需新增 `chest.open` 契约。
4. **客户端幂等性缺失**：客户端写操作未传递 `rid` 字段，服务端 `idempotency` 防重机制无法在客户端重试时生效。
