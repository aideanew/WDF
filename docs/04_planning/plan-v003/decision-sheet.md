---
id: PLAN-V003-DS
title: 裁决表（D-01~D-14，已全部裁决）
status: accepted
module: planning
owner: hark
created: 2026-10-27
related: [PLAN-V003-02, PLAN-V003-05, EXEC-BRIEF-0003]
---

# 裁决表 · decision-sheet

> **裁决记录**：用户于 2026-10-27 拍板"**全按建议值**"。本表即唯一合法数值来源（E-06 铁律的解冻凭证）。
> 执行者转录时**每个值标注来源列 = 本表编号**；未列入本表的值仍然**禁止自编**。

## A. 表级（6 张）

| # | 表 | 锁定内容 | 转录目标 |
|---|---|---|---|
| D-01 | merchants | 3 行：`merchant_village`(渔村, region_bp=10000, 日限购 20) / `merchant_wander`(流浪, 8500, 10) / `merchant_black`(黑市, 13000, 5)；回收价公式 = `floor(recycle_bp × region_bp / 10000)`（**2026-10-27 主控修正**：实测 prices 表 106 行，`recycle_bp` 字段语义为**回收基数绝对值**（≈ floor(base_price×50%)，非万分比系数）——原式 `base×recycle_bp/10000×region_bp/10000` 会使全部回收价为 0，与 M1 既有 `recyclePrice`（50% 基准±30%）在 recycle_bp=base/2 时数学等价） | `game-data` → config `merchants.json` |
| D-02 | facilities | 9 行（熔炉/灶台/锯台/砧台/木炭窑/炼油炉/高炉/锁匠铺/机械工坊），字段 `effect_bp=10000`（产出×1.0 占位）、`station` 取 recipes 原工位串 | config `facilities.json` |
| D-03 | buildings | 6 行（大仓库 storage+50 / 货舱 storage+20 / 兵营 0 / 厨房 0 / 农田 0 / 潜水工坊 0），效果字段 `storage_bp`，其余 0 占位 | config `buildings.json` |
| D-04 | hooks | 1 行：`target_dist=600`、`angle_deg=15`、`max_power_bp` 以 `generated/game-core/hook` 的 `DEFAULT_HOOK_CONFIG` 现值为准转录（等值迁移，不改手感） | config `hooks.json` |
| D-05 | guide_steps | 5 行：①出钩收获第一件物品 ②查看背包 ③完成一次合成 ④商人处回收 ⑤查看榜单；每行一句文案 + `target_panel` | config `guide_steps.json` |
| D-06 | ad_placements | 3 行：`hook_cooldown` / `offline_double` / `shop_refresh`，每位置每日上限各 3（合计 ≤9，符合 GDD 广告位上限） | config `ad_placements.json` |

## B. 字段级（10 项）

| # | 表.字段 | 锁定值 |
|---|---|---|
| D-07 | items.weight / capacity / stack / unlock_level | 全 106 行：`1 / 0 / 99 / 0` |
| D-08 | locks.hits_required / zone_bp | none=0(不适用) / iron=3 / copper=5 / silver=8 / gold=12；zone_bp 全 0 |
| D-09 | chests.smashable / size | 3 行全部 `true / 1` |
| D-10 | recipes.job / unlock_level | job 保持空（沿用"不拆工位串"）；unlock_level 全 0 |

## C. 契约/架构（4 项）

| # | 议题 | 裁决 |
|---|---|---|
| D-11 | 回收与权威背包 | **A'**：先落 ADR-0012（服务端影子账本 `ledger_entry`，容差 0，不一致返回 1001+telemetry），再实现 `economy.sell{itemId,count}`。限购日界=**服务端时区（Asia/Shanghai）自然日**。 |
| D-12 | 绑定票据码 | **A**：解冻新增 `BIND_TICKET_INVALID = 2004`（ERR 14→15 码），`account.bindConfirm` 失败改返回 2004。 |
| D-13 | event ops 载体 | 本期不迁移，仅登记（v1.1 前处理）。 |
| D-14 | 网络错误码 | **B**：维持回落 `ERR.INTERNAL(4999)`，在 `error-catalog.md` 登记缺口（下次解冻窗口再议 4002）。 |

## 解冻授权

- D-11/D-12 构成对 ADR-0011 缺口 1/缺口 2 的**用户授权解冻**（缺口 3/4 维持登记）。
- 解冻执行只允许发生在 **TASK-4015**，且必须与 TASK-4006 的 contracts 变更**同一提交**合入（避免契约与实现分裂）。
