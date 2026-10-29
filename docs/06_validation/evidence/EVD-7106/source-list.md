---
id: EVD-7106-SRC
title: PD7-06 来源清单（B-L1：每个字段「取自哪份文档哪一节/哪一行」）
status: active
owner: hark
created: 2026-10-29
---

# PD7-06 来源清单（B-L1）

> 铁律 B-L1：第一步永远是「提交来源清单」，不是「填数字」。交不出的字段 → 留空 + 登记 UNKNOWN-TABLES。
> 本卡只抄设计源已给的东西；设计源没有的数值一律不编（B-L5）。

## 0. 引用文献（简写）

| 简写 | 文档 | 关键锚点 |
|---|---|---|
| DS | `docs/01_product/design-source/我的筏-深度设计方案-v5.5.md` | §5.4:440-453、§5.5:455-459 |
| UL | `docs/01_product/design-source/等级解锁表-草案.md` | 全文（2026-10-22 17:52 用户已定 + Hark 建议） |
| MT | `docs/01_product/design-source/材料与工具总表.md` | §品质:185 |
| IT | `game-data/source/items.csv` | 实体 id 登记处 |
| FC | `game-data/source/facilities.csv` | 实体 id 登记处 |
| BD | `game-data/source/buildings.csv` | 实体 id 登记处 |

---

## 1. unlocks 表（方案 B：每行一目标，`level` 存等级）

### 1.1 结构（补列）

| 列 | 类型 | 来源 | 依据 |
|---|---|---|---|
| `level` | int | **UL 等级列** | UL:2「按等级段解锁」；每段起点 1/6/11/16/20/20/25/30/35/40/45 |
| `kind` | enum(ability/buildable/milestone) | **UL 表头**「新能力（新玩法）/新可建」+ 20 级里程碑 | UL:3；20 级行为「驶出浅海/占岛/遇见商人」= milestone（UL:9） |
| `target_id` | string（**无外键**，D2 用户拍板） | **UL 单元格**，映射到实体 id 或能力名 | UL:5-15；实体 id 取 IT/FC/BD；能力名无表故存字符串 |

### 1.2 值（每行一目标，逐格转录）

**段 1–5（level=1，UL:5）**
- ability：出钩打捞、钓鱼、划桨
- buildable：工作台=item_0073、桨=item_0049、鱼竿=item_0048、简易海水过滤器=item_0076、雨水收集器=item_0078、烤架=item_0075、筏块=item_0072

**段 6–10（level=6，UL:6）**
- ability：建房间（可加盖楼层）、救第一个员工、研究图纸
- buildable：研究台=item_0074、吊床=item_0081、种植箱=item_0080、储水罐=item_0079
- ⚠ 房间框架：**无对应实体**（不在 IT/FC/BD/rooms）→ 登记 UNKNOWN-TABLES，不落表（B-L5）

**段 11–15（level=11，UL:7）**
- ability：甲板开锁、开船看海图、参加每日一海（10 级起）
- buildable：货舱=cargo_hold(BD)、捕鱼笼=item_0084、养鱼箱=item_0083、舵=item_0085、帆=item_0087、锚=item_0086、海图桌=item_0088、打捞网=item_0046

**段 16–19（level=16，UL:8）**
- ability：多爪钩、勘测准备
- buildable：多爪钩=item_0045、锯台=saw_table(FC)
- ⚠ 勘测杆：无对应实体 → 登记，不落表

**段 20（level=20，UL:9，milestone）**
- milestone：驶出浅海进深海、占岛（送箭塔+一波野人教学）、遇见商人

**段 20–24（level=20，UL:10）**
- ability：岛基地、塔防布阵、熔炼
- buildable：灶台=stove(FC)、木炭窑=charcoal_kiln(FC)、熔炉=furnace(FC)、厨房=kitchen(BD)、农田=farm(BD)、大仓库=warehouse(BD)、兵营=barracks(BD)
- ⚠ 升高地形：**地形操作非实体** → 登记，不落表

**段 25–29（level=25，UL:11）**
- ability：潜水打捞沉船、采石油、装发动机、抢野人船
- buildable：潜水服=item_0058、潜水工坊=diving_workshop(BD)、炼油炉=oil_refinery(FC)、油桶=item_0057
- ⚠ 发动机机位：无对应实体 → 登记，不落表

**段 30–34（level=30，UL:12）**
- ability：钢材与机械、锁柜防野人、攻城器械
- buildable：高炉=blast_furnace(FC)、锁匠铺=locksmith(FC)、铁锁=item_0068、铜锁=item_0069、机械工坊=mechanic_workshop(FC)、绞盘=item_0092、弓弩车=item_0093
- ⚠ 投石机：**防御建筑非 items 实体**（recipe 已跳过，见 UNKNOWN-TABLES 四）→ 登记，不落表

**段 35–39（level=35，UL:13）**
- ability：用电
- buildable：电线=item_0034、电池=item_0035、太阳能板=item_0090、鳗鱼发电机=item_0091、抽油机=item_0089、冰箱=item_0082、电动过滤器=item_0077、望远镜=item_0062
- ⚠ 电工房：**§5.4:432 已取消电工和电工房**（电工由机械师在机械工坊完成）→ UL:13 仍列属**陈旧冲突**，登记，不落表
- 注：「发电（太阳能/电鳗/石油）」为 UL 单格，按 §6:471-475 拆为 3 实体（太阳能板/鳗鱼发电机/抽油机）

**段 40–44（level=40，UL:14）**
- ability：深潜、搬家
- buildable：高级潜水服=item_0059、水下探照灯=item_0061、水下探寻装置=item_0096、银锁=item_0070

**段 45–49（level=45，UL:15）**
- ability：自动打捞（离线收益）
- buildable：自动打捞装置=item_0094、自动捕捞装置=item_0095、金锁=item_0071

> 首版上限 49、50 远洋第二版不落表（UL:2「首版等级上限 49，首版不开远洋」；UL:16 的 50 级行跳过）。

## 2. quality 表（D3：只登记 3 档，倍率暂不进表）

| 列 | 来源 | 依据 |
|---|---|---|
| `id` | 品质名 | DS §5.5:459 / MT:185 |
| `name` | 品质名（粗糙/普通/精良） | 同上 |
| `note` | 用途 + 倍率（**倍率只登记不落列**） | DS §5.5:459「价值 ×0.7/×1/×1.5，只用于打造的工具和熟食」 |

- 3 行：quality_rough=粗糙、quality_normal=普通、quality_fine=精良。
- ⚠ `value_multiplier`（×0.7/×1/×1.5）：**schema 无该列，本卡不进表**，登记 UNKNOWN-TABLES 附锚点 DS §5.5:459。

## 3. recipes.unlock_level（D5）

- **无源**：DS §5.4:453「【待定】各物品要几级」→ 80 行**留空** + 登记。
- A2 要求：不再出现在占位命中列表。

## 4. items.unlock_level（D5）

- **无源**：DS §5.4:453 → 106 行**留空** + 登记。

## 5. items.stack（D4）

- **无源**：全文检索 DS/MT/UL 无「堆叠上限 99」条文 → 106 行**留空** + 登记。
- 现有 99 为 D-07 代定，非设计源原值。

## 6. levels 表

- **不动**（只 `id,exp_to_next`，方案 B 选 `unlocks.level` 单向引用，levels 不加列；A4 满足）。
