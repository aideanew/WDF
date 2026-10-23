---
id: DATA-0002
title: 本地存档结构
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 本地存档结构

结构以 `packages/game-core/src/save/schema.ts` 为准。顶层：`schemaVersion, configVersion, saveId, revision, savedAt(服务器时间), checksum, modules{...}`；`modules` 的键来自 `module-catalog.json` 的 `save` 字段。

| 版本 | 日期 | 变化 | 迁移函数 |
|---|---|---|---|
| 1 | 2026-10-23 | 初始 | — |
