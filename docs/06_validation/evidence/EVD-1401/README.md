---
id: EVD-1401
title: 1401 开新区 + 封号（脚本 / SQL 级，不做后台）
status: active
owner: hark
created: 2026-10-29
review: 2026-11-29
---

# EVD-1401 · 开新区 + 封号（TASK-1401，2026-10-29）

## 目标与交付

**目标**：运维能用一条命令开新区、一条命令封号；新玩家落在当前开放区；被封玩家登录被拒且留审计。**不建管理后台、不新增玩家可调用的管理动作。**

| 交付 | 位置 |
|---|---|
| 迁移（建 regions + 部分唯一索引 + player.region 索引） | `server/db/migrations/0002_regions.sql` |
| 开区 CLI | `server/src/modules/ops/open-region.mjs` |
| 封号 CLI | `server/src/modules/ops/ban-player.mjs` |
| ops 业务/数据层（tx 感知） | `server/src/modules/ops/{service,repo}.ts` |
| 登录封禁校验（2003 BANNED + 审计） | `server/src/modules/account/{service,handlers}.ts` |
| `currentRegion()` 查表 + 回落（D-53） | `server/src/modules/account/repo.ts:46-58` |
| 操作手册（开区/封号/回滚） | `docs/07_release/operations/ops-runbook.md` |

## 验收（可复跑）

**① 集成测试（4 例，内存库）**——完整输出见 `ops-region-test.txt`，`node --import ./tools/runtime/register.mjs --test tests/integration/ops-region.test.mjs`：

| 例 | 断言 | 结果 |
|---|---|---|
| AT-1401-1 | 表空时 `currentRegion()` 回落 `s1` **且打告警**（D-53 约束②） | ✅ |
| AT-1401-2 | 开区后 `is_current` 恰好一行 = 新区；新玩家 `region` = 当前区 | ✅ |
| AT-1401-3 | 封号后登录返 **2003**，`audit_log` ≥2 条（ban_player + login_banned） | ✅ |
| AT-1401-4 | 突变验证：部分唯一索引是「至多一区 current」的约束来源 | ✅ |

**② 全量门禁**：`npm test` **235/235**（231 既有 + 4 新增，D-53 兜底保证既有不变红）；`npm run verify` **EXIT=0**（guard 10/10、typecheck 0 错）。`npm run verify` 输出里可见两条 `[region] regions 表无当前开放区，回落本地默认区 s1` —— 即回落**不静默**。

**③ CLI 冒烟**（`cli-smoke.txt`）：`open-region.mjs s9 九服` 跑迁移并「✅ 已开新区 s9，并置为当前开放区」（EXIT=0）；`ban-player.mjs` 缺参正确退出 1 并打用法。

## 突变验证（AT-1401-4）——「唯一 current」是被约束住的，不是代码自觉

- **有索引**：`regions_test` 已是 current，再直接 `INSERT` 一行 `is_current=true`（模拟误实现）→ **报错** `Key (is_current)=(t) is duplicated`（constraint `regions_current_idx`）。
- **删索引（突变）**：同样 `INSERT` → **成功**，两行 current 并存 → 证明约束是**索引给的**，删了就没。
- **复原**：删掉 bug 行后重建索引 → 回到单 current（`region_test`）。

> 口径说明：open-region 本身**总是先清旧 current 再置新**（保证唯一），所以测试走「直接 SQL 误置两行 current」来验证约束本体；这是验证「约束是否 load-bearing」的标准突变法。

## 决策与口径

- **D-53**（`decision-sheet.md` §H）：`currentRegion()` 先查 `regions WHERE is_current`；空表回落到 `WDF_DEFAULT_REGION ?? 's1'` 并 `console.warn`（不静默）。`0002_regions.sql` **不种任何区数据**（区名由运营给定，测试库用 `region_test`）。
- **错误码**：封号拒绝登录用**现有** `ERR.BANNED=2003`（`contracts/src/common/errors.ts:17`），不新造；信息带截止时间。**未新增** `packages/contracts` 动作、未改 `0001_init.sql`、未在 `regions.csv` 编区名（仍只有表头）。

## 局限登记

- `regions.csv` 仍为表头（无数据行）——符合 D-53「不种数据」；正式区名待运营给定后由运维登记。
- 开区/封号 CLI 连本地库（PGlite `.local/pg` 或真 PG）；**不设管理后台**（U-06 选 A），玩家令牌无管理动作（验收 4）。
