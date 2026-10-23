---
id: ADR-0004
title: 数据库：PostgreSQL（Redis 推迟）
status: proposed
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 数据库：PostgreSQL（Redis 推迟）

## 决定（建议）
PostgreSQL：事务 + 唯一约束保障流水与幂等；jsonb 存存档；收益事件按日分区。排行读快照表，日活上来再加 Redis ZSET。

## 后果
迁移用顺序 SQL 文件；已执行迁移不可修改。
