---
id: PLAN-V006-03
title: 契约冻结包与数据模型
status: active
module: planning
---

# 4. 契约冻结包

1. **API**: 
   - 新增 `chest.open` (请求: `itemId`, `hitsUsed`；响应: `success`, `rewards`)
   - 保持 `salvage.claimInfo` 为 v1.1 预留。
2. **Errors**: 
   - 已冻结 15 个错误码（含 `2004 BIND_TICKET_INVALID`）。
3. **Identity**: 
   - 保持现有 JWT 机制，`rid` 在 RpcClient 层面统一注入。
4. **Resources**: 无新增。
5. **Events**: 无新增。
6. **UX States**:
   - 新增 `lock-wait` 态，用于处理连点等待。

# 5. 数据模型基线

- **chests.csv**: 需增加 `item_id` 列，用于与 `items.csv` 映射。
- **locks.csv**: 维持现有结构，作为开锁难度的权威源。
- 数据库结构暂无变更，保持 `0001_init.sql`。
