---
id: PLAN-V004-04
title: 数据模型基线
status: active
module: planning
owner: hark
created: 2026-10-27
related: [PLAN-V004-03]
---

# 04 · 数据模型基线

## 4.1 数据库结构

- **现状**：PGlite `0001_init.sql` 已包含基础账号、存档分叉表，以及 `ledger_entry`（用于 salvage 和 sell 的流水记录）。
- **本次迁移**：无。`ledger_entry` 已由 4006 直接使用，本轮纯 UI 侧任务无需数据库迁移。

## 4.2 本地存档结构

- **现状**：`modules.inventory` 扁平化结构，`modules.guide.done` 已在 4004 中以开放 map 扩展方式写入。
- **本次迁移**：无。UI 组件只做只读查询和纯函数调用（如调用 `economy.sell` 后由后端响应刷新资产）。

## 4.3 数值表（configVersion）

- **现状**：`configVersion=38fc1faf915f8bbf`，已包含转录的商人、锁、箱子等基础数据。
- **本次变更**：无。严格禁止在此阶段增减数值表。UI 仅读取 `services/config` 提供的静态表。
