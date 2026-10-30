---
id: PLAN-V012-02
title: plan-v012 · 事实基线（钉在 8fbb57b，逐条可复跑）
status: active
module: planning
owner: hark
created: 2026-10-30
review: 2026-11-13
related: [PLAN-V012-01, PLAN-V012-03]
---

# 02 · 事实基线

> **本文是全项目最新的事实权威。** 文档说的不算，这里说的算；这里说的每一条都能用文中的命令复跑。
> 若某条与文档冲突，**以本文为准，并把冲突登记在 §7**。

## 1. 客户端（`client/assets/scripts/`）

### 1.1 `features/` 逐目录实测（`.ts` 文件数与总行数）

| 模块 | 文件 | 行数 | 判定 |
|---|---|---|---|
| chest | 4 | **631** | 真实现 |
| economy | 4 | **457** | 真实现 |
| settings | 5 | **432** | 真实现 |
| hook | 4 | **410** | 真实现 |
| crafting | 4 | **366** | 真实现 |
| inventory | 4 | **310** | 真实现 |
| leaderboard | 4 | **307** | 真实现 |
| guide | 4 | **220** | 真实现 |
| account / ads / compliance / crew / defense / event / fishing / island / power / progression / **raft** / salvage / **sea** / social / telemetry | 各 3 | **各 18** | **空壳** |

**15 个模块恰好各 18 行 / 3 文件**，形状完全一致 → 是模板批量生成，不是"正在开发中"。

复跑：`for d in client/assets/scripts/features/*/; do echo "$(basename $d) $(find $d -name '*.ts' | wc -l) $(find $d -name '*.ts' | xargs cat | wc -l)"; done`

### 1.2 空壳的实际内容（以 `progression` 为例，逐字抄）

```ts
/** 等级与解锁 的用例与状态（不依赖 cc 节点）。一次操作 = 校验 → 扣 → 加 → 写本地存档。 */
export class ProgressionModel {
  private version = 0;
  get stateVersion(): number { return this.version; }
  protected touch(): void { this.version++; }
}
```

**注意**：类注释承诺"校验 → 扣 → 加 → 写本地存档"，**方法体一个都没有**。
这是本仓第 1 类病症（"一刀深"）的标准形态：**注释描述了一个不存在的流程**。

### 1.3 主界面入口（v1.0 五环缺"扩"的直接证据）

`client/assets/scripts/app/MainView.ts:27-33`：

```ts
const TABS: ReadonlyArray<{ key: PanelKey; label: string }> = [
  { key: 'hook', label: '打捞' },
  { key: 'inventory', label: '背包' },
  { key: 'chest', label: '箱子' },
  { key: 'crafting', label: '合成' },
  { key: 'merchant', label: '商人' },
  { key: 'leaderboard', label: '榜单' },
];
```

**6 个 Tab，没有"筏"**。`panel-types.ts:13` 的 `PanelKey` 同样是 6 个键。
→ `glossary.md` 定义的五环「捞→包→做→**扩**→卖」中，**"扩"没有入口**。D-54 裁 `Q1=B`（含扩筏 UI），此项目前**未兑现**。

### 1.4 客户端配置加载器（本版最关键的一处瓶颈）

`client/assets/scripts/services/config/tables.ts:16-25`：

```ts
export type TableName =
  | 'items' | 'recipes' | 'prices' | 'locks' | 'chests'
  | 'merchants' | 'facilities' | 'buildings' | 'hooks' | 'guide_steps' | 'ad_placements';
```

**11 张。** 而：

| 对比项 | 数量 | 证据 |
|---|---|---|
| 生成的 `XxxRow` 类型 | **46** | `packages/game-core/src/generated/config-types.ts` 里 `export interface XxxRow` 计数 = 46 |
| 已导出到客户端 resources 的 json | **48**（46 表 + `_manifest` + 1） | `ls client/assets/resources/config/*.json \| wc -l` |
| `TableName` 可访问 | **11** | 上面的联合类型 |

**结论**：46 张表的数据文件**已经在客户端包里**，但 TypeScript 层只允许访问 11 张。
其余 35 张（含 `levels` / `unlocks` / `jobs` / `rooms` / `titles` / `islands`…）**在客户端不可达**。

### 1.5 谁在调 `preload`

| 调用点 | 加载的表 |
|---|---|
| `features/chest/view/ChestPanel.ts:127` | `chests`, `items` |
| `features/crafting/view/CraftingPanel.ts:56` | `items`, `recipes` |
| `features/economy/view/MerchantPanel.ts:94` | `merchants`, `prices`, `items` |
| `features/guide/view/GuideOverlay.ts:121` | `guide_steps` |
| `features/hook/view/HookView.ts:53` | `hooks` |
| `features/inventory/view/InventoryPanel.ts:67` | `items` |

6 处，覆盖 11 张中的 8 张（`locks`/`facilities`/`buildings`/`ad_placements` 由服务端或 registry 间接用）。

## 2. game-core（`packages/game-core/src/`）

| 模块 | 行数 | 判定 | 依据 |
|---|---|---|---|
| hook | **152** | 真实现 | `powerAt` / `chargeAndCast` / 确定性 |
| crafting | 88 | 真实现 | 材料判定 |
| chest | 69 | 真实现 | — |
| save | 68 | 真实现 | 封印 / schema 版本 |
| common | 59 | 基础设施 | `Result` / `ux` |
| economy | 55 | 真实现 | 定价 / 回收 |
| inventory | 55 | 真实现 | 投影（只取 4 字段） |
| defense | **30** | **真实现（但极小）** | `distanceField` 反向 BFS + `allEntrancesReachable`，是完整算法，不是空壳 |
| raft | **19** | **半实现** | 只有 `remainingBuoyancy` + `checkChange`，**无 `canBuild` / `applyBuild`**，且**零客户端调用** |
| sea | 19 | **半实现** | `tideState` 已实现，**零调用方** |
| leaderboard | 4 | 空壳 | — |
| crew / event / fishing / island / power / progression / salvage | **各 3** | **空壳** | 全文 = 注释 2 行 + `export const MODULE_ID = 'xxx';` |

**13 个 v1.1 模块的 core 合计 = 7×3 + 4 = 25 行。** 这是"实现欠账"的量化形态。

`raft/index.ts:4` 的原注释：
> `/** 已定（10-22 23:02）：整船浮力 ≥ 总重量；浮力 = 全部船体材料容量之和。材料自重计入重量（【建议】公式，待数值表落地）。 */`

**与 D-54 Q2=A 措辞不一致**（`全部船体材料` vs `只看 raft_tiles.capacity`）→ 登记 I-07。

## 3. 服务端（`server/src/`）

| 模块 | 行数 | 判定 |
|---|---|---|
| account | 442 | 真实现（登录/绑定/区服） |
| save | 333 | 真实现（pull/push/resolveFork） |
| leaderboard | 283 | 真实现 |
| economy | 244 | 真实现（sell/影子账本） |
| chest | 183 | 真实现 |
| config | 153 | 真实现（manifest） |
| ads | 138 | 真实现（激励视频） |
| ops | 74 | 真实现（区服/封禁，**无界面**，符合 D-01） |
| telemetry | 74 | 真实现 |
| compliance | 33 | 真实现（薄） |
| **event / salvage / social** | **各 6** | **空壳** |

**动作层**：`server/src/gateway/handlers.ts:45-68` —— **22 个动作，15 实现，7 个 `todo`**
（`salvage.claimInfo` / `economy.buyQuota` / `event.start` / `event.submit` / `event.result` / `social.send` / `social.pull`）。
`todo` 返回 `ERR.INTERNAL + FEATURE_NOT_AVAILABLE`（D-46=A），客户端走"未开放"态不重试。

## 4. ★ 数值表消费方审计（本版核心证据）

**46 张表里，31 张没有任何非 generated 代码读过**（含注释命中）。

### 4.1 零消费方 31 张（括号内为数据行数）

```
bait(1) blueprints(7) consumers(5) crew_traits(4) defenses(3) event_drops(9)
explore(0) foods(6) generators(3) islands(4) jobs(7) levels(49) limits(0)
lines(3) lockpick_tools(3) oil(1) phrases(0) protection_cards(3) quality(3)
raft_tiles(1) rooms(10) seasons(1) shipwrecks(3) spawns(8) throwables(2)
tides(1) titles(10) units(3) unlocks(82) waves(0) zones(3)
```

**其中 5 张有完整数据却零消费方，是"数据已就绪、代码没接"的铁证**：

| 表 | 行数 | 数据质量 | 零消费方意味着 |
|---|---|---|---|
| `unlocks` | **82** | 按等级分布 1/6/11/16/20/25/30/35/40/45，`kind` = ability 25 / buildable 54 / milestone 3 | 82 条解锁项**没有任何代码读** |
| `levels` | **49** | 1→49 级，`exp_to_next` 100→1060 | 经验曲线**没有任何代码读**，玩家不可能升级 |
| `titles` | **10** | — | 称号系统无载体 |
| `rooms` | **10** | 铁匠/农场/兵营/厨房/大仓库/货舱/潜水工坊/机械工坊/锁匠铺/科研部 | 船体建造无载体 |
| `jobs` | **7** | 7 个员工岗位 | 员工系统无载体 |

复跑（把这 31 张逐个数出来）：

```bash
node -e "const fs=require('fs');const t=fs.readdirSync('game-data/source').filter(f=>f.endsWith('.csv')).map(f=>f.replace('.csv',''));console.log(t.length)"   # 46
# 完整审计脚本见 §4.3
```

### 4.2 有消费方的 15 张

| 表 | 行 | 真实消费方（首个） |
|---|---|---|
| ad_placements | 3 | `server/src/modules/ads/service.ts` |
| chests | 3 | `client/.../features/chest/view/ChestPanel.ts` |
| events | 3 | `server/src/gateway/payload.ts` |
| fish | 3 | ~~`packages/game-core/src/fishing/index.ts`（**唯一真正被 core 读的 v1.1 表**）~~ → **订正：假命中** |
| guide_steps | 5 | `client/.../services/config/tables.ts` |
| hooks | 1 | `packages/game-core/src/hook/index.ts` |
| items | 106 | `packages/game-core/src/inventory/index.ts` |
| locks | 5 | `server/src/modules/chest/repo.ts` |
| merchants | 3 | `server/src/modules/economy/service.ts` |
| prices | 106 | `packages/game-core/src/economy/index.ts` |
| recipes | 80 | `packages/game-core/src/crafting/index.ts` |
| buildings / facilities / locks / merchants / prices / recipes | — | 仅 `client/.../services/config/tables.ts` 的**类型注册**，不是业务逻辑 |
| **drops** | **0** | **仅 2 处注释命中，0 处真实读取** |
| **regions** | **0** | `server/src/modules/account/repo.ts:54` 有真实 SQL；`ops/repo.ts:22-25` 有写入 |

### 4.3 审计脚本（可复跑，落在 `/e/tmp/wdf_cons2.mjs` 那次实测）

```js
// 遍历 packages/game-core/src + server/src + client/assets/scripts（排除 generated）
// 对每张表名与其 camelCase 形式做 includes 匹配，命中数 0 即"零消费方"
```

**这个方法能说的与不能说的**：
- **能说**：没有任何代码提到这个表名 → 不可能读它。
- **不能说**：命中 ≠ 正确使用（`facilities` 只被类型注册命中，业务上仍未使用）。

### 4.4 一处自我否定的实测订正（fish）

`§4.2` 原写"`fish` 被 `packages/game-core/src/fishing/index.ts` 真实读取，是唯一真正被 core 读的 v1.1 表"。
**这是错的**，实测该文件全文只有 3 行：

```ts
/** 钓鱼：钓鱼玩法与产出
 * 规则待按 v5.5 章节 3.2 抽取。只写纯函数。 */
export const MODULE_ID = 'fishing';
```

命中的是 `MODULE_ID = 'fishing'` 里的 `fishing` 子串，**不是读表**。
→ **15 张"有消费方"的表里没有任何一张被 v1.1 模块的 core 真实读取**；
真实读表全部集中在 hook / crafting / chest / inventory / economy 这 5 个已完成模块。

## 5. 数据质量（占位值伪装，第 2 类病症）

`tools/guard/placeholders.baseline.json` 当前：`empty_tables` 6 张、`same_value_hits` 10 项。
逐项判定（**note 为空 = 没有设计依据**）：

| 表 | 字段 | 值 | 行数 | 有 note？ | 我的判定 |
|---|---|---|---|---|---|
| crew_traits | max_value | 25 | 4 | ✅「DS §5.3 幸福感每项 max=25」 | 设计真实值 |
| crew_traits | step | 5 | 4 | ✅「DS §5.3 step=5」 | 设计真实值 |
| event_drops | event_id | event_daily_sea | 9 | ✅ | 设计真实值 |
| islands | has_reef_cliff | 礁石+悬崖 | 4 | ✅ | 设计真实值 |
| spawns | zone | zone_shallow | 8 | ✅ | 设计真实值 |
| **facilities** | **effect_bp** | **10000** | **9** | ❌ | **可疑**：9 个设施效果全 = 100%（10000bp），等于"所有设施一样强" |
| **items** | **capacity** | **0** | **106** | ❌ | **已由 D-54 裁为有意归 0**（保留列位） |
| **items** | **stack** | **99** | **106** | ❌ | **可疑**：106 个物品全可叠 99（含设施/箱子） |
| **items** | **unlock_level** | **0** | **106** | ❌ | **可疑**：全物品 0 级解锁 = 门槛未启用 |
| **recipes** | **unlock_level** | **（空）** | **80** | ❌ | **确证**：80 条配方全空 → 所有配方无条件可做 |

`recipes.csv` 实测：`awk -F, 'NR>1{print $7}' game-data/source/recipes.csv | sort -u` → **只有空行**。
`crafting/index.ts:2` 的注释自认：「`recipes.unlock_level` 与 `job` 当前 0/80 填充」。
`CraftingModel.ts:9` 同样写「`station` / `job` / `unlock_level` **完全不读**」。

**这意味着**：等级系统（49 级曲线 + 82 条解锁项）与制作系统（80 配方）之间**没有任何连接**——
玩家可以 1 级造出全部 80 个配方。这是"C2 捞—做—扩"里"做"环节的深层空洞。

## 6. 治理状态（`pd.mjs`）

```bash
$ pd.mjs health .        # 体检未通过：5 个错误，45 个提醒
$ pd.mjs status .        # 规划 PLAN-R4：共 78 张有效任务，已完成 56（72%），进行中 0，阻塞 11，已替代 9
                         # 现在可以开工：PD7-10(executor), PD7-11(executor), PD7-05(executor)
```

**5 个错误是我逐条从源码定位的，不是转述**：

| # | 错误 | 根因（源码行） | 修法 |
|---|---|---|---|
| 1 | PD7-07 DONE 但无提交记录 | `pd.mjs:135` 要求 `execution.commits[]` 或 `no_change_reason` | 补 `commits` 数组（实际有 `973e5b6`） |
| 2 | PD7-08 非法 detail | `lib.mjs:14` `DETAIL = ['READY','REFINE_BEFORE_EXECUTION']`，执行侧写了自由文本 | `detail` 改回 `READY`，理由写进 `blocked_reason` |
| 3 | PD7-08 BLOCKED 但无 blocked_reason | `pd.mjs:130` | 补 `blocked_reason` |
| 4 | PD7-09 非法 detail | 同 #2 | 同 #2 |
| 5 | PD7-09 BLOCKED 但无 blocked_reason | 同 #3 | 同 #3 |

**后果**：`pd.mjs status` 里 PD7-08/09 的阻塞原因显示为 `undefined` → 派工队列不可信。
`task-index.json` 的 `baseline_commit` 仍是 `4e572fa`（实际 HEAD `8fbb57b`）。

## 7. 文档 ↔ 代码不一致清单（I-01~I-14）

| # | 文档说什么 | 代码实际 | 严重度 |
|---|---|---|---|
| **I-01** | `panel-types.ts:5`：「`PanelKey` 锁定 **4 个**主 Tab（打捞/背包/合成/榜单）」 | 实际 6 个键，`MainView` 也是 6 个 Tab | 低（注释过期，但误导接手者） |
| **I-02** | `BootController.ts:12`：「account.login（**mock**）」 | `BootController.ts:61` 实际调 `getPlatform().login()` 拿真 code（D-44） | 中（把真实现说成 mock） |
| **I-03** | `HookModel.ts:20`：「数值表就位后接 **drops** 配置」 | `drops.csv` **0 行**，且 `HookModel.ts:21` 硬编码 `item_0001` | **高**（打捞永远只出漂流木） |
| **I-04** | `decision-index.json` 有 D-01~D-18、D-49~D-57 | **无 D-19~D-48**（历史空号，被 plan-v010 正文引用过） | 中（追溯断链） |
| **I-05** | `task-index.json` 的 `baseline_commit` = `4e572fa` | HEAD = `8fbb57b`（19 个提交之后） | 低（元数据过期） |
| **I-06** | `mvp-scope.md §5`：v1.0 **必须含**塔防/3 兵种/岛屿/7 员工/等级 49/每日一海/称号 | `D-50` 把这 13 模块**全部延期 v1.1** | **高**（v1.0 完成判据二义） |
| **I-07** | `raft/index.ts:4`：「浮力 = **全部船体材料**容量之和」 | `D-54 Q2=A`：**只看 `raft_tiles.capacity`**，`items.capacity` 一律归 0 | 中（注释与裁决冲突） |
| **I-08** | `facilities.csv` 9 行 `effect_bp` 全 `10000` | baseline 无 note，非"设计真实值" | 中（占位值伪装） |
| **I-09** | `recipes.csv` 有 `unlock_level` 列 | **80/80 全空**；`items.unlock_level` 106/106 全 0 | **高**（门槛未启用，见 §5） |
| **I-10** | `module-catalog.json` 给 `telemetry` / `account` 标 `client: true` | `telemetry` 是埋点无界面；`account` 的绑定 UI 属 v1.1 | 低（会被误判为"客户端缺实现"） |
| **I-11** | 输出格式要求每卡有 `REQ-F-xxx` 来源 | `docs/02_requirements/features/` **只有 README，0 个 REQ** | 中（改用三段式锚，见 `03 §1`） |
| **I-12** | `task-index.json` 的 `detail` 字段是枚举 | PD7-08/09 写了自由文本 | **高**（health 5 错误之一） |
| **I-13** | `TableName` 11 张 | resources 里有 48 个 json、46 个 Row 类型 | **高**（本版主线，见 §1.4） |
| **I-14** | v011 的 `D-57` 建议消耗筏块，PD7-02 依赖它 | D-57 仍 `PROPOSED`，PD7-02 仍 `TODO` | 中（`canBuild` 签名未定） |

## 8. 六层矩阵（逐模块，本版最实用的一张表）

判定口径：**数值** = catalog `tables` 里有数据的张数/总张数；**core/client/server/contract** = 该模块目录行数；
**测试** = `tests/*/` 里文件名含模块 id 的文件数。

| 模块 | 数值 | core | client | server | contract | 测试 | 判定 |
|---|---|---|---|---|---|---|---|
| hook | 2/2 | 153 | 410 | — | — | 2 | ✅ 完整 |
| chest | 4/4 | 70 | 631 | 183 | 21 | 3 | ✅ 完整 |
| crafting | 3/3 | 89 | 366 | — | — | 2 | ✅ 完整 |
| inventory | 1/1 | 56 | 310 | — | — | 1 | ✅ 完整 |
| economy | 2/3（`limits` 0） | 56 | 457 | 244 | 12 | 2 | ✅ 完整 |
| guide | 1/1 | — | 220 | — | — | 1 | ✅ 完整 |
| settings | 0 表 | — | 432 | — | — | 0 | ⚠ 无测试 |
| leaderboard | 2/2 | **5** | 307 | 283 | 7 | 1 | ⚠ core 空壳（称号无载体） |
| account | 0/1（`regions` 0） | — | **21** | 442 | 8 | 0 | ⚠ client 空壳 |
| ads | 1/1 | — | **21** | 138 | 3 | 1 | ⚠ client 空壳 |
| compliance | 0 表 | — | **21** | 33 | 2 | 0 | ⚠ client 空壳 |
| telemetry | 0 表 | — | **21** | 74 | 3 | 1 | ⚠ client 空壳（**但可能不需要**，I-10） |
| progression | **2/2（49+82 行）** | **4** | **21** | — | — | 0 | ❌ 数据齐、三层全空 |
| crew | 3/3 | **4** | **21** | — | — | 1 | ❌ 同 |
| power | 2/2 | **4** | **21** | — | — | 1 | ❌ 同 |
| raft | 3/3（含 `rooms`10） | **19** | **21** | — | — | 3 | ❌ 半实现 + 无 UI |
| sea | 3/3 | **19** | **21** | — | — | 1 | ❌ `tideState` 零调用 |
| salvage | 2/3（`explore` 0） | **4** | **21** | **9** | 3 | 0 | ❌ 三层空壳 |
| fishing | 2/2 | **4** | **21** | — | — | 0 | ❌ 同 |
| island | 3/3 | **4** | **21** | — | — | 0 | ❌ 同 |
| defense | 3/4（`waves` 0） | 31 | **21** | — | — | 1 | ❌ core 有寻路、其余空 |
| event | 2/2 | **4** | **21** | **9** | 7 | 0 | ❌ 三层空壳 |
| social | 0/1（`phrases` 0） | — | **21** | **9** | 5 | 0 | ❌ 同 |

**汇总**：六层齐全 **6 个**（hook/chest/crafting/inventory/economy/guide）+ 1 个基本齐（settings，缺测试）；
**13 个"数据齐但实现空"**。这 13 个正好是 D-50 登记的那 13 个。

## 9. 本基线的三处自我否定

| # | 我原本可能得出的结论 | 为什么不能这么说 |
|---|---|---|
| N-1 | 「13 个模块零进度，所以要从零写」 | **不准确**：`defense` 的 `distanceField` 是完整 BFS 寻路（30 行），`raft` 的 `remainingBuoyancy` 是完整公式，`sea` 的 `tideState` 是完整实现。**它们缺的不是算法，是调用方与上层** |
| N-2 | 「31 张表零消费方 = 数据白做了」 | **不准确**：`TableName` 只 11 张是直接原因，扩枚举即可让 35 张变得可达。数据没白做，只是"没有门" |
| N-3 | 「health 5 错误是小事」 | **不准确**：`status` 输出里 PD7-08/09 的阻塞原因是 `undefined`，直接影响派工决策。这是"元数据坏了导致决策错"的典型 |
| **N-4** | 「`fish` 是唯一被 core 读的 v1.1 表」（`§4.2` 原结论） | **错**，见 `§4.4`：命中的是 `MODULE_ID='fishing'` 子串。**"有消费方"的 15 张表里，v1.1 模块一张都没真读** |
| **N-5** | 「测试全绿，可以直接跑 `npm run verify`」 | **错**：HEAD `8fbb57b` 实跑 **270 条 / 3 红**（`01 §4`）。"阶段出口 EXIT=0"必须先修 PD8-18 与 PD8-01 |
| **N-6** | 「`unlocks.target_id` 有 14 条无法 join，是数据缺陷」 | **错**：`levels-unlocks.test.mjs` 的 `lv 8` 已把"buildable 目标必须存在于 items/facilities/buildings 之一"钉成断言且 **PASS** —— 异构 `target_id` 是 **D2 已拍板的设计**，不是缺陷。真正的要求是**代码侧四路解析**（PD8-08 已按此设计） |

## 10. 调用点缺口（第 3 类病症的第 4、5 例）

前面几节讲的是"数据没有门"（`TableName`）与"模块没有体"（3 行空壳）。
本节记录第三种形态：**能力已经实现、业务零调用**——不是缺代码，是漏接线。

| 能力 | 实现位置 | 业务调用点 | 判定 |
|---|---|---|---|
| `createRng(seed)`（mulberry32 确定性随机） | `common/rng.ts:13-28` | **0**（只有 `tests/determinism/game-core.test.mjs` 调） | 缺口 |
| `seedFrom(text)` | `common/rng.ts:31-38` | 1（`save/schema.ts:21` 的 checksum） | ✅ 已接 |
| `elapsed(from,to,cap)`（回拨归零 + 30 天上限） | `common/time.ts:7-11` | **0** | 缺口 |
| `ok` / `err`（`Result`） | `common/result.ts` | hook / crafting / raft / chest | ✅ 已接 |
| `distanceField` / `allEntrancesReachable` | `defense/index.ts` | **0**（只有同目录自测） | 缺口 |

复跑：

```bash
grep -rn "createRng" --include=*.ts . | grep -v node_modules | grep -v "common/rng.ts"
grep -rn "elapsed(" --include=*.ts . | grep -v node_modules | grep -v "common/time.ts"
```

**对本版的影响**：
- `createRng` 缺的调用点正好是 **PD8-07（掉落抽取）**、**PD8-13（沉船抽档）**、**PD8-14（岛屿抽取）**——三张卡都用它，**不许新写随机**
- `elapsed` 缺的调用点正好是 **PD8-09（离线补算）**——不许自己算 `to - from`

## 11. 11 张 schema 仍是 `draft`（决定 C 段能做什么、不能做什么）

`game-data/schemas/*.schema.json` 的 `status` 实测：**active 35 / draft 11**。

| draft 表 | 列数 | 现有列 | 数据行 | `todo` 原文（节选） | 后果 |
|---|---|---|---|---|---|
| `unlocks` | 6 | +level,kind,target_id | **82** | 字段待抽取；三列由 PD7-06 按方案 B 补 | ✅ 可用（`levels-unlocks` 已 9/9 PASS） |
| `rooms` | **3** | id,name,note | 10 | 字段待从 v5.5（模块 raft）抽取 | **无 cost 列 → 房间造价不可表达** |
| `waves` | **3** | id,name,note | 0 | 字段待从 v5.5（模块 defense）抽取 | **无法表达"第几波几个" → 波次模拟不可做** |
| `foods` | **3** | id,name,note | 6 | 同上（crew） | 无热量值 → "吃得饱"不可算 |
| `limits` | 3 | id,name,note | 0 | 同上（economy） | 冗余（`merchants.daily_limit` 已表达） |
| `phrases` | 3 | id,name,note | 0 | 同上（social） | 聊天无文案（功能不受阻） |
| `quality` | 3 | id,name,note | 3 | 同上（crafting） | 品质无属性 |
| `regions` | 3 | id,name,note | 0 | 同上（account） | D-53：区名运营给定 |
| `crew_traits` | 5 | +max_value,step | 4 | 两列由 PD7-07 按 §5.3:460 补 | ✅ 可用（有 note 依据） |
| `generators` | 5 | +output_ratio,fuel | 3 | 两列由 PD7-07 按 §6:471-481 补 | ✅ 可用 |
| `consumers` | 4 | +power_draw | 5 | `power_draw` 无源留空 | **耗电值 0/5 → 供电平衡不可算** |

**这张表把"能不能做"从主观判断变成读 schema 的 `status` 与列数。**
C 段 9 张卡的"能交付 / 不能交付"分区全部由它决定（见 `stage-c-modules/00-stage.md` 各卡）。

## 12. 生成链的一致性（为什么 `json` 与 `Row` 类型不可能形状不符）

`tools/gen/config.mjs` 一次遍历同时产出三样东西：客户端 json、服务端 json、`config-types.ts`。
关键实现（逐行读过）：

- `:36-44` 用**同一份 schema** 解析同一个 CSV；`raw === '' && !required` → **该键直接不写**
- `:104-108` 类型生成用**同一个 `d.required`** 决定是否加 `?`
- `:48-55` 生成期就做三类打回：`int` 正则、`enum` 白名单、`ref` 外键、`sumTo` 分组求和

→ **`json` 键集 ⊇ 类型必填键、⊆ 类型全键**是**构造性保证**，不是"看起来一致"。
残留风险只剩一种：**有人手改了 json**（`npm run guard` 的 generated 项会抓）。

`sumTo` 的现成用例：`drops.weight_bp`（`by: group, total: 10000`）与 `shipwrecks` 五档 bp
—— 这两处让 PD8-07 / PD8-13 **不需要自己写权重合计校验**。
