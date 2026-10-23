---
id: ADR-0002
title: 前后端共用确定性规则包 game-core
status: accepted
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 前后端共用确定性规则包 game-core

## 背景
~~主线断网可玩~~（10-23 10:40 起改为必须联网，见 ADR-0008），赶海/排行/开锁需服务器复核，塔防需服务器结算与回放。

## 决定
建立 `packages/game-core`：纯 TS、无 cc、无 IO、种子随机、时间注入、整数优先；服务端直接引用，客户端由 tools/sync 复制。

## 后果
规则只写一次；determinism 测试成为必跑项。
