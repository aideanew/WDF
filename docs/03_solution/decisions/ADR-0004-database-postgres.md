---
id: ADR-0004
title: 数据库：PostgreSQL（Redis 推迟）
status: accepted
owner: hark
created: 2026-10-23
review: 2026-11-23
decided: 2026-10-23 10:45
---

# 数据库：PostgreSQL（Redis 推迟）

## 决定（已定·Hark代定 2026-10-23 10:45）
**PostgreSQL，单库**：事务 + 唯一约束保障流水与幂等；jsonb 存存档；收益事件按日分区；排行读快照表。

**Redis 暂不上**：日活与排行榜压测达不到要求时再加，不作为首发依赖。

## 后果
迁移用顺序 SQL 文件；已执行迁移不可修改。上线前必须做一次排行榜压测，用数据决定是否引入 Redis。
