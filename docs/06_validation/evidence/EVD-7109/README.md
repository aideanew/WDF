---
id: EVD-7109
title: PD7-09 玩法簇数据（19 张表 + locks/chests 补全 + baseline 收口）
status: blocked
owner: hark
created: 2026-10-30
review: 2026-11-30
---

# EVD-7109 · PD7-09 玩法簇数据（2026-10-30）

## 状态：BLOCKED（6 张设计空表，A1 无法满足）

**本卡整体 BLOCKED**，原因：6 张表**设计语义留空**（非漏填），`placeholders.baseline.json` 的 `empty_tables` 无法清零，验收 A1「空表清单为空（31→0）」**无法满足**：

| 表 | 留空原因 | 依据 |
|---|---|---|
| `waves` | PD7-08 BLOCKED（设计源无波次数值） | DS §7 无「第几波几个」 |
| `drops` | D-27：设计源从未定义「箱子开出什么」，0 行是本来就没规则 | `server/src/modules/chest/service.ts:47-49` |
| `explore` | §3.5 只给定性（探索无人小岛/关键区域），无具体探索点清单 | DS §3.5:237-240 |
| `limits` | 商人限购已由 `merchants.daily_limit` 表达（D-01），无独立锚点 | DS §9.2 |
| `phrases` | §9.4 只给「区服/世界频道」结构，无具体短语文案 | DS §9.4:656-657 |
| `regions` | D-53：区名由运营给定，不种数据 | `server/src/modules/account/repo.ts:51` |

**19 张表中 14 张已转录**（结构 + 有源数值），6 张设计语义留空已登记 UNKNOWN-TABLES 三之五。

## 目标与交付

**目标**：19 张玩法簇空表清零（14 张达成）+ locks/chests 补全 + baseline 收口（只减不增）。

| 交付 | 位置 |
|---|---|
| 来源清单（B-L1） | `docs/06_validation/evidence/EVD-7109/source-list.md` |
| 海域 3 表（zones/tides/spawns） | `game-data/source/{zones,tides,spawns}.csv` + schema 扩展 |
| 钓鱼/沉船 4 表（fish/bait/shipwrecks/oil） | `game-data/source/{fish,bait,shipwrecks,oil}.csv` + schema 扩展 |
| 活动 2 表（events/event_drops） | `game-data/source/{events,event_drops}.csv` + schema 扩展 |
| 榜单 2 表（seasons/titles） | `game-data/source/{seasons,titles}.csv` + schema 扩展 |
| 开箱基础（lines/lockpick_tools/blueprints） | `game-data/source/{lines,lockpick_tools,blueprints}.csv` + schema 扩展 |
| 5 张设计空表（drops/explore/limits/phrases/regions） | 留空 + 登记 UNKNOWN-TABLES 三之五 |
| locks/chests 补全 | `locks.zone_bp` 命中区（§8.4:583-588）；`chests.smashable` 材质决定（§3.6:250,260，修正 D-09） |
| baseline 收口（只减不增） | `tools/guard/placeholders.baseline.json`（empty_tables 31→6，same_value_hits 增 5 设计同值） |
| 确定性断言 | `tests/determinism/play-loop.test.mjs`（pl1-13 新增） |

## 来源锚点（B-L1，逐字段）

- `zones` 三圈海域 ← DS §2.1:88-99；深海 size=800 ← §2.1:96
- `tides` 每 6 小时/10 分钟 ← DS §2.2:105
- `spawns` 漂浮物清单 ← DS §3.1:126；刷出率待定 ← §3.1
- `fish` 鱼/电鳗/灯笼鱼 ← DS §3.2:139
- `bait` 鱼饵 ← DS §13.12:999；吸引效果待定
- `shipwrecks` 三级信息/锁档比例 ← DS §3.3:148-184；潜水带出概率（等级相关）另表
- `oil` 石油深海/远洋 ← DS §3.4:233；产量待定
- `explore` 定性 ← DS §3.5:237-240（无具体探索点）
- `seasons` 赛季结算 ← DS §10.1:665；时长待定
- `titles` 加成表 ← DS §10.3:724-726
- `events` 每日一海 20-21/3 分钟/21:05 ← DS §10.2:683,679
- `event_drops` 锁档 50/25/15/9.8/0.2% + 箱大小 40/30/20/10% ← DS §10.2:687-701；物品内容待定 ← §10.2:702
- `lines` 绳子三档 ← DS §3.1:130；承重可调待定
- `lockpick_tools` 三级价格 ← DS §8.4:596,600；高级每区服 3/天 ← §8.4:601
- `blueprints` 高级/精密材料需图纸 ← DS §13.3:971-984；图纸对应待定
- `locks.zone_bp` 命中区 ← DS §8.4:583-588
- `chests.smashable` 材质决定 ← DS §3.6:250,260

## 设计决策（本卡）

| # | 决策 | 结论 |
|---|---|---|
| D1 | drops | **D-27 留空**（设计源未定义掉落规则，service.ts:47-49），非漏填 |
| D2 | chests.smashable | **材质决定**（§3.6:260 铜/铁箱砸不开），修正 D-09 全 true（D-09 基于 F-38 误读） |
| D3 | chests.lock/size | **设计三箱同构**（§3.6:244 任何箱子配任何锁；§3.6 未给材质-大小），保留同值注明 |
| D4 | locks.hits_required | **D-08 占位 3/5/8/12 与 §8.4 冲突**（设计源 1/2/3/4），保留 D-08 待用户裁决 |
| D5 | regions | **D-53 不种数据**（区名由运营给定，repo.ts:51），留空；PD7-09 步骤 6「regions 非空覆盖回落」前提不成立（currentRegion 查 DB regions 非 config） |
| D6 | limits | **无独立锚点**（商人限购已由 merchants.daily_limit 表达 D-01），留空 |
| D7 | event_drops | **有源**（§10.2:688,701 锁档/箱大小分布），修正来源清单「无源留空」初判 |

## 无源字段（B-L5，留空 + 登记，见 UNKNOWN-TABLES 三之五）

zones.size_km（浅海/远洋）、spawns.rate_bp、fish 食用价值/稀有度、bait 吸引效果、oil.yield_rate、explore（整表）、seasons.duration_days/奖励、limits（整表）、blueprints.blueprint_item、event_drops 物品内容、phrases（整表）、regions（整表）、drops（整表）、waves（整表）。

## 验收（当场复跑）

| # | 验收 | 实测 | 判定 |
|---|---|---|---|
| A1 | `npm run gen && node tools/guard/placeholders.mjs` → 空表清单为空 | gen EXIT=0（46 表/568 行，configVersion=b957a92f71db5157）；placeholders EXIT=0，**空表 6 张（设计语义留空，非漏填）** → 31→0 **未达成**（A1 不满足，BLOCKED） | ⚠ BLOCKED |
| A2 | `npm run test` → 全 PASS | 确定性测试 160 项：**158 PASS / 2 失败**（items-w 3/6，**D-54 归 0 既有债务，与 PD7-09 无关**，经 git stash 验证预先存在） | ⚠ 2 既有失败 |
| A3 | baseline `empty_tables` 为 `[]` | `empty_tables` = 6 张设计空表（waves/drops/explore/limits/phrases/regions），`same_value_hits` 每项已标「设计真实值」或为既有 | ⚠ A3 未达成（空表 6 张，设计语义） |
| A4 | 19 张表每张非空表字段有源 | pl1-13 断言通过（13/13），逐字段锚点见来源清单 | ✅ |

## 关键输出摘录

**play-loop 测试（13/13）**：
```
✔ pl 1 zones 三圈海域（§2.1:90-94），仅深海 size=800 有源
✔ pl 2 tides 每 6 小时/10 分钟（§2.2:105）
✔ pl 3 spawns 漂浮物（§3.1:126），刷出率待定留空
✔ pl 4 fish 鱼/电鳗/灯笼鱼（§3.2:139）
✔ pl 5 shipwrecks 三级信息 + 锁档比例合计 10000（§3.3:148-184）
✔ pl 6 titles 10 档加成 +25%~+1%（§10.3:724-726）
✔ pl 7 events 每日一海 20-21 点 3 分钟（§10.2:683）
✔ pl 8 event_drops 锁档+箱大小分布各合计 10000（§10.2:687-701）
✔ pl 9 blueprints 7 种高级材料需图纸（§13.3:971-984）
✔ pl 10 lockpick_tools 三级价格（§8.4:596,600）
✔ pl 11 locks.zone_bp 命中区（§8.4:583-588）
✔ pl 12 chests.smashable 材质决定（§3.6:250,260）
✔ pl 13 设计上留空 5 张表（B-L5/D-27/D-53）
tests 13 / pass 13 / fail 0
```

**placeholders**：EXIT=0；空表 6 张（设计语义留空）；同值 10 项全在 baseline 内（无新增红）。

**gen**：configVersion = `b957a92f71db5157`；46 表/568 行（原 512，+56 行 PD7-09）。

## 边界自检

- ✅ 未动 `packages/game-core/src/**`（手写）、`packages/contracts/**`、`server/db/migrations/**`
- ✅ 未动 `items.csv`/`recipes.csv`/`levels.csv` 等 PD7-06/07/08 表
- ⚠ `config-types.ts` 由 gen 重生成（非手写，AUTO-GENERATED）
- ⚠ 2 项既有测试失败（items-w 3/6，D-54 归 0 债务，与 PD7-09 无关，stash 验证预先存在）
- ⚠ 未推送（本地 `main` 领先 `origin/master` 11 提交；等 `~/.git-pat` 就绪 + 用户确认后推送）

## 提交

- `e6136e1` — baseline 收口（单独提交，只减不增，附实测输出：placeholders EXIT=0 空表 6 张/同值 10 项无新增红、play-loop 13/13、gen 46 表/568 行）
- `3cd7628` — PD7-09 核心（19 表 + locks/chests 补全 + play-loop 测试 + EVD-7109 证据，58 files/+950/-143）
- `84be0e0` — task-index 留痕（status→BLOCKED，detail 6 张设计空表）

> 推送推迟：`~/.git-pat` 已存在但权限 644（非安全铁律要求的 600），且用户未确认「就绪」；与 PD7-07/08 一致标注「未推送」。
