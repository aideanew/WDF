# game-data 留空待填统一登记册（E-06 决策落地）

> **铁律**：文档《材料与工具总表》等设计源里**没有给出**的数值，**一律不得自编**。
> 凡文档缺值的字段 → 放松为可选并留空；凡文档缺值的整表 → 维持空表；凡无法固定化的配方 → 跳过登记。
> 全部待补项统一登记在此，后续由设计文档补充或显式拍板默认值后再回填。

---

## 一、有源表转录状态

| 表 | 状态 | 行数 | 说明 |
|---|---|---|---|
| items | ✅ 已转录 | 106 | id 用 `item_NNNN` 稳定序号；`name/category/base_price` 取自总表；`craftable` 由总表"不可打造"标注推导（10 个 false）；`weight/capacity/stack/unlock_level` 由 D-07 填充（见第三节） |
| prices | ✅ 已转录 | 106 | `base_price/recycle_bp` 取自总表；`recycle_bp` schema 上限已由 10000 放宽至 100000（金锭/古董等最高 15000） |
| locks | ✅ 已转录 | 5 | none/iron/copper/silver/gold；`hits_required/zone_bp` 由 D-08 填充（见第三节） |
| chests | ✅ 已转录 | 3 | wood/copper/iron；`lock` 默认 none；`smashable/size` 由 D-09 填充（见第三节） |
| recipes | ✅ 已转录 | 80 | 总表二~十一段配方列解析；21 条特殊/设施类跳过（见第五节）；`unlock_level` 由 D-10 填充 0；`job` 保持空（见第三节）；名称映射 `简易过滤器→简易海水过滤器` 已补（原误跳 1 条已修复） |
| merchants | ✅ 已转录（D-01） | 3 | 渔村/流浪/黑市；region_bp + daily_limit |
| facilities | ✅ 已转录（D-02） | 9 | 熔炉/灶台/锯台/砧台/木炭窑/炼油炉/高炉/锁匠铺/机械工坊；effect_bp=10000、station 取 recipes 原工位串 |
| buildings | ✅ 已转录（D-03） | 6 | 大仓库/货舱/兵营/厨房/农田/潜水工坊；storage_bp |
| hooks | ✅ 已转录（D-04） | 1 | target_dist=600、angle_deg=15、max_power_bp=10000（等值迁移自 DEFAULT_HOOK_CONFIG） |
| guide_steps | ✅ 已转录（D-05） | 5 | 出钩→背包→合成→回收→榜单；text + target_panel |
| ad_placements | ✅ 已转录（D-06） | 3 | hook_cooldown/offline_double/shop_refresh；daily_cap=3 |

---

## 二、无数值来源的空表（维持空，不得编造）

以下 **35 张表**在 `docs/01_product/design-source/` 现有文档中**没有任何数值**，全部留空（0 行，不参与校验）：

bait, blueprints, consumers, crew_traits, defenses, drops, event_drops, events, explore, fish, foods, generators, islands, jobs, levels, limits, lines, lockpick_tools, oil, phrases, protection_cards, quality, raft_tiles, regions, rooms, seasons, shipwrecks, spawns, throwables, tides, titles, units, unlocks, waves, zones

> 注：ad_placements/buildings/facilities/guide_steps/hooks/merchants 已由 D-01~D-06 裁决值转录（2026-10-27），移出本节。`foods/fish/islands/events/tides/…` 玩法上确实存在，但当前设计文档未给数值。若后续补文档，优先从这些表开始。

---

## 三、已放松为可选的字段（文档缺值，留空待补）

| 表 | 字段 | 现状 | 可用性 | 备注 |
|---|---|---|---|---|
| items | `weight` | ✅ 106/106 填充（D-07） | ✅ 代定可调（D-43=B） | **已授权代定**：按品类 原料1/工具3/设备10（raw/material/food/misc=1、tool/lock/chest=3、equipment/facility=10）；misc/facility 品类内异质（如 misc 含发电机/发动机），为品类级代定的已知局限；可调，非设计源原值（TASK-7031） |
| items | `capacity` | ✅ 106/106 填充（D-07） | ✅ 代定可调（D-43=B） | **已授权代定**：仅 3 容器（木箱20/铜箱40/铁箱60，chest 类）>0，其余 0；容量≈面积/10 因 items.csv 无面积列而以容器级代定（可调，TASK-7031） |
| items | `stack` | ✅ 106/106 填充（D-07） | ⚠ 仅影响平衡 | 全 99；所有物品堆叠上限相同 |
| items | `unlock_level` | ✅ 106/106 填充（D-07） | ⚠ 仅影响平衡 | 全 0（schema min 1→0）；无等级门槛 |
| locks | `hits_required` | ✅ 5/5 填充（D-08） | ⚠ 仅影响平衡 | none=0/iron=3/copper=5/silver=8/gold=12（schema max 4→12）；v1.0 不做开锁，暂不影响 |
| locks | `zone_bp` | ✅ 5/5 填充（D-08） | ⚠ 仅影响平衡 | 全 0；同上 |
| chests | `smashable` | ✅ 3/3 填充（D-09） | ⚠ 仅影响平衡 | 全 true；设计源「上锁箱不能砸」无法表达（F-38） |
| chests | `size` | ✅ 3/3 填充（D-09） | ⚠ 仅影响平衡 | 全 1（schema enum→int）；三种箱子容量相同 |
| recipes | `job` | 0/80 填充 | ⚠ 仅影响平衡 | D-10 裁决"保持空"；引用 `jobs.id`，jobs 表为空 → 暂无法填；源表工位串如 `高炉/铁匠` 含职业信息但未拆分 |
| recipes | `unlock_level` | ✅ 80/80 填充（D-10） | ⚠ 仅影响平衡 | 全 0（schema min 1→0）；所有配方无条件可做 |
| prices | `recycle_bp` 上限 | — | ✅ 设计源原值 | 10000 → 100000（非留空，属上限放宽；价格值本身取自总表，非占位） |

> **可用性列口径（plan-v010 TASK-7004）**：❌ 影响计算 = 该值参与浮力/判定等可运行逻辑，D-43 裁决前不得使用；
> ⚠ 仅影响平衡 = 不影响"能不能跑"，只影响强弱，可暂用；✅ = 数值直接取自设计源，非裁决占位。
> 机器可读标记见 `client/assets/resources/config/_placeholder.json`（由 `npm run gen` 生成）。

> **station 字段说明**：recipes.station 已填 48/79（其余为本就无工位的段落，留空正确）。
> 但部分工位串合并了"工位+职业"，例如 `高炉/铁匠`、`机械工坊/机械师`。当前将整串原样存入 `station`，`job` 字段保持空白。
> 待决策：是否要把 `X/Y` 拆为 `station=X` + `job=Y`？若拆，需先填充 `jobs` 表（目前为空）。**当前选择：不拆、原样保留、job 留空**，后续补 jobs 表时再统一规范化。

---

## 四、recipes 跳过明细（21 条：设施/建筑类不产出 items.id + 无法固定化）

以下配方按"输出必须映射到 `items.id`"的规则被跳过——它们要么是**设施/建筑**（属 buildings/facilities 表，不通过 recipe 产出），要么**无法固定化**：

| 输出（原文） | 原始输入串 | 跳过原因 |
|---|---|---|
| 小锁柜 | 任意箱子+一把锁（装上即成） | 无法固定化（"任意箱子"） |
| 大仓库 | 砖×20+木板×20，可升级 | 输出为建筑（buildings），非 items |
| 货舱 | 木板×6+铁钉×2 | 输出为设施（facilities），非 items |
| 锯台 | 木板×2+废铁 | 设施 |
| 灶台 | 石头×5+黏土×5 | 设施 |
| 木炭窑 | 石头×10+黏土×10 | 设施 |
| 熔炉 | 砖×10 | 设施 |
| 砧台 | 铁锭×5 | 设施 |
| 炼油炉 | 砖×10+铁锭×5 | 设施 |
| 高炉 | 熔炉+砖×20（升级） | 设施（且含"升级"标记） |
| 锁匠铺 | 木板×10+铁锭×5 | 建筑 |
| 机械工坊 | 砖×20+钢材×5 | 建筑 |
| 潜水工坊 | 木板×10+帆布×5 | 建筑 |
| 农田 | 用锄头开地，不耗材料 | 建筑（无材料消耗） |
| 厨房 | 木板×10+灶台 | 建筑 |
| 兵营 | 木板×20+砖×10 | 建筑 |
| 勘测杆 | 木棍×3+布（占岛前用） | 建筑/工具 |
| 箭塔 | 木板×10+木棍×10（占岛送一座） | 防御建筑 |
| 投石机 | 木板×10+粗绳×2+石头×10（可升级） | 防御建筑（含"升级"） |
| 升高地形 | 石头×2，用铲子 | 地形操作，非正式产出 |
| 发动机、发电机 | 不可打造，岛上装筏 | 源表明确"不可打造" |

> 这些条目**不是转录遗漏**，而是受限于 recipe 数据模型（output 须为 items.id）。它们对应的设施/建筑数值应落在 `facilities.csv` / `buildings.csv`，待这两张表有源时再填，**不在此强行编造**。

---

## 五、进度

- `npm run gen:config` 通过：**46 张表、327 行**、configVersion=`38fc1faf915f8bbf`（2026-10-27，TASK-4002 转录 D-01~D-10 后）。
- 较上轮（300 行）新增 27 行（merchants 3 + facilities 9 + buildings 6 + hooks 1 + guide_steps 5 + ad_placements 3）；items/locks/chests/recipes 字段级填充不改行数。
- `npm run sync` 已执行：43 个文件同步至 `client/assets/scripts/generated/`。
- 空表 35 张（原 41，移出 6 张已转录表），待补来源后转录即可。
- 全部留空待填项已统一登记于本文档第三、四、五节，后续补充时回填并勾销。
