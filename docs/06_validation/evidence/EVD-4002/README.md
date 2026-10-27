---
id: EVD-4002
title: TASK-4002 数值转录 验收证据
status: active
module: game-data
owner: agent-b
created: 2026-10-27
related: [TASK-4002, PLAN-V003-DS, EXEC-BRIEF-0003]
---

# EVD-4002 · 数值转录验收证据

## 改动文件

| 文件 | 类型 | 说明 |
|---|---|---|
| `game-data/schemas/{merchants,facilities,buildings,hooks,guide_steps,ad_placements}.schema.json` | 修改 | draft→active，加 D-01~D-06 字段 |
| `game-data/schemas/{locks,items,recipes,chests}.schema.json` | 修改 | 约束修正：locks max 4→12、items/recipes unlock_level min 1→0、chests size enum→int |
| `game-data/source/*.csv`（10 个） | 修改 | 6 新表写入 + 4 表字段填充（D-07~D-10） |
| `tools/gen/transcribe.mjs` | 新增 | 读 decision-sheet 值写 CSV，幂等 |
| `client/assets/scripts/services/config/tables.ts` | 修改 | TableName/TableRowMap 扩 6 新表 |
| `game-data/UNKNOWN-TABLES.md` | 修改 | §一/二/三/五 勾销回填 |

## 机器可验证项（V-402，全部实跑通过）

| id | 命令 | 结果 |
|---|---|---|
| V-402.a | `merchants.json` 行数 + `hooks[0].target_dist` | ✅ 3 行 / target_dist=600 |
| V-402.b | items weight 全=1、stack 全=99；locks hits_required | ✅ [0,3,5,8,12] |
| V-402.c | configVersion ≠ 基线 `b249f288e985da48` | ✅ `38fc1faf915f8bbf` |
| V-402.d | guard + test + G-06 | ✅ 9/9 / 107 pass / 0 type error |
| V-402.5 | `transcribe.mjs --dry-run` 二次跑 | ✅ 0 变更（幂等） |

## schema 约束修正（D-07~D-10 要求值超出原约束）

| schema | 字段 | 原约束 | 修正 | D 编号 |
|---|---|---|---|---|
| locks | hits_required | max=4 | max=12 | D-08（gold=12） |
| items | unlock_level | min=1 | min=0 | D-07（全 0） |
| recipes | unlock_level | min=1 | min=0 | D-10（全 0） |
| chests | size | enum small/medium/large/huge | int min=1 | D-09（size=1） |

## 回滚

```bash
git checkout -- game-data/ tools/gen/transcribe.mjs client/assets/scripts/services/config/tables.ts
```
