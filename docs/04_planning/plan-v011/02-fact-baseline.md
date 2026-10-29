---
id: PLAN-V011-02
title: plan-v011 · 02 事实基线（实测 + 文档/代码不一致 I-01~I-12）
status: active
module: planning
owner: hark
created: 2026-10-29
review: 2026-11-12
related: [PLAN-V011-01, PLAN-V011-03]
---

# 02 · 事实基线

> 纪律：**文档不是当前实现。** 两者冲突时以真实代码为准，并把差异逐条列在本文件 §3。
> 本文件所有数字都是 2026-10-29 在 `4e572fa` 上实测，命令随行给出，可独立复跑。

## 1. 已确认的事实（有代码/命令证据）

### 1.1 客户端 23 个 feature 目录：8 个有真实行为，15 个是 18 行空壳

```
命令：for d in client/assets/scripts/features/*/; do echo "$(basename $d) $(find $d -name '*.ts' -exec cat {} + | wc -l)"; done | sort -k2 -n
```

| 分组 | 模块（行数） |
|---|---|
| **有真实行为（8）** | `chest 631`、`economy 457`、`settings 432`、`hook 410`、`crafting 366`、`inventory 310`、`leaderboard 307`、`guide 220` |
| **18 行空壳（15）** | `account`、`ads`、`compliance`、`crew`、`defense`、`event`、`fishing`、`island`、`power`、`progression`、**`raft`**、`salvage`、**`sea`**、`social`、`telemetry` |

**空壳的判据不是行数，是内容。** 逐字证据（`client/assets/scripts/features/raft/model/RaftModel.ts`）：

```ts
/** 筏体建设 的用例与状态（不依赖 cc 节点）。一次操作 = 校验 → 扣 → 加 → 写本地存档。 */
export class RaftModel {
  private version = 0;
  get stateVersion(): number { return this.version; }
  protected touch(): void { this.version++; }
}
```

注释承诺"校验 → 扣 → 加 → 写本地存档"四件事，**方法体里一件都没有**；`RaftView.lateUpdate()` 唯一一行是注释掉的伪代码。

### 1.2 主界面只有 6 个 Tab，"扩筏"没有入口

```
命令：sed -n '27,34p' client/assets/scripts/app/MainView.ts
```

```
const TABS = [ {hook 打捞} {inventory 背包} {chest 箱子} {crafting 合成} {merchant 商人} {leaderboard 榜单} ];
```

`PanelKey`（`panel-types.ts:13`）= `'hook' | 'inventory' | 'chest' | 'crafting' | 'leaderboard' | 'merchant'`。
**`raft` 不在其中，也没有任何浮层入口。** 对照 `glossary.md:41` 的定义「五环（v1.0 代码层）= 捞→包→做→扩→卖」——
"扩"在口径里，不在界面上。**这是本版最重要的一条事实。**

### 1.3 game-core：规则层同样 8 空 + 3 半

```
命令：for d in packages/game-core/src/*/; do echo "$(basename $d) $(find $d -name '*.ts' -exec cat {} + | wc -l)"; done | sort -k2 -n
```

| 分组 | 模块（行数） |
|---|---|
| 空壳（3 行，仅 `MODULE_ID`） | `crew`、`event`、`fishing`、`island`、`power`、`progression`、`salvage`（7 个） |
| 近乎空壳（4 行） | `leaderboard` |
| **半实现（有函数、无调用方）** | `raft 19`、`sea 19`、`defense 30` |
| 真实实现 | `economy 55`、`inventory 55`、`chest 69`、`crafting 88`、`hook 152`、`common 59`、`save 68`、`generated 358` |

`raft` 的两个函数是真函数（`remainingBuoyancy` / `checkChange`），但 `checkChange` 的调用方只有测试，
**客户端零调用**（`grep -rn "checkChange" client/assets/scripts` → 0 命中）。

### 1.4 服务端 13 个模块目录：3 个 6 行空壳，动作层 22 登记 / 15 实现 / 7 todo

```
命令：for d in server/src/modules/*/; do echo "$(basename $d) $(find $d -name '*.ts' -exec cat {} + | wc -l)"; done | sort -k2 -n
```

| 行数 | 模块 |
|---|---|
| **6（空壳）** | `event`、`salvage`、`social` |
| 33 | `compliance`（恒真桩，见 §1.5） |
| 74 / 74 | `ops`、`telemetry` |
| **138** | `ads`（`ads.claim` 已落地，TASK-7020） |
| 153 / 183 / 244 / 283 / 333 / **442** | `config`、`chest`、`economy`、`leaderboard`、`save`、`account` |

动作登记（`server/src/gateway/handlers.ts:45-68`，`satisfies Record<ActionName, Handler>` 保证不漏）：

| 项 | 数 | 明细 |
|---|---|---|
| 登记动作 | 22 | `packages/contracts/src/common/actions.ts` 逐条 |
| 已实现 | 15 | account×4、compliance、save×3、chest、economy.sell、leaderboard×2、ads.claim、telemetry、config |
| `todo` | 7 | `salvage.claimInfo`、`economy.buyQuota`、`event.start/submit/result`、`social.send/pull` |

### 1.5 合规仍是恒真桩（外部资质依赖，非代码待写）

```
server/src/modules/compliance/service.ts:13-16  →  verified = playerExists()；minor 恒 false；offlineAllowanceMs: 0
```

D-51 已裁定这是 `BLOCKED-HUMAN`（需 appid + appsecret + 主体资质），**本版不重复登记、不新增卡**。

### 1.6 客户端仍内置 4 个 mock handler（`FORCE_OFFLINE=false` 下为死代码，但是哑弹）

```
命令：sed -n '175,200p' client/assets/scripts/services/net/RpcClient.ts
```

`MOCK_HANDLERS` 覆盖 `compliance.check`（返回 `verified:true, minor:false`）、`account.login`（`Math.random` 造 id）、`save.push`、`save.pull`。
当前 `FORCE_OFFLINE = false`（`:22`）→ 不生效。**但只要有人把它打开，合规立刻变成恒真、账号变成随机号。**

### 1.7 数值表：46 张，15 张有数，31 张全空

```
命令：for f in game-data/source/*.csv; do echo "$(basename $f .csv) $(( $(wc -l < $f) - 1 ))"; done | sort -k2 -n
```

| 分组 | 表（行数） |
|---|---|
| **全空（31）** | `bait blueprints consumers crew_traits defenses drops event_drops events explore fish foods generators islands jobs limits lines lockpick_tools oil phrases protection_cards quality regions seasons shipwrecks spawns throwables tides titles units waves zones` |
| 有数（15） | `hooks 1`、`raft_tiles 1`、`ad_placements 3`、`chests 3`、`merchants 3`、`guide_steps 5`、`locks 5`、`buildings 6`、`facilities 9`、`rooms 10`、`unlocks 11`、`levels 49`、`recipes 80`、`items 106`、`prices 106` |

### 1.8 「有数」里仍有 5 项同值 + 4 项语义可疑（**比空表更危险**）

```
命令：node tools/guard/placeholders.mjs（baseline：tools/guard/placeholders.baseline.json）
```

| 表.字段 | 实测 | 判定 |
|---|---|---|
| `items.stack` | `99` × 106 | 占位（baseline 内旧债） |
| `items.unlock_level` | `0` × 106 | 占位（同上） |
| `locks.zone_bp` | `0` × 5 | 占位（同上）；`locks.drop_group` 另 5 行全空 |
| `recipes.unlock_level` | `0` × 80 | 占位（同上）；`recipes.job` 另 80 行全空 |
| `facilities.effect_bp` | `10000` × 9 | 占位（同上） |
| **`items.weight`** | `{1:53, 3:28, 10:25}` | **已非全 1**（W1-4 / TASK-7031 三档转录），可用 |
| **`items.capacity`** | `{0:103, 20:1, 40:1, 60:1}` | **3 个非零值全部是 `category=chest`** —— 箱子提供浮力？语义可疑 → D-54 |
| **`raft_tiles`** | 1 行：`raft_block / item_0072 / capacity 50 / weight 10` | 地块只有 1 种，"扩一格"缺少原料分层 |
| **`chests`** | `lock` 全 `none`、`smashable` 全 `true`、`size` 全 `1` | 三箱同构 → 开锁玩法（S-2）仍无载体 |

> **与 plan-v010 的差异必须写明**：plan-v010 §3 称「`items.capacity` 全表唯一值 `0` → 扩筏必然失败」。
> 今日实测已不是全 0（`eb16ddd` W1-4 后）。**结论从"必然失败"降级为"口径可疑"**——`remainingBuoyancy()`
> 现在能算出正数（`raft_tiles.capacity 50 − weight 10 = +40`），但"哪些物品能当船体材料"没有口径。

### 1.9 测试与守卫

| 项 | 实测 |
|---|---|
| 测试文件 | 37（`tests/contract 6` / `determinism 16` / `integration 13` / `e2e 1` / `fixtures 1`） |
| 用例数（台账） | **219/219 @ `4ff9396`**（`test-ledger.json:SNAP-4016`，determinism 128 / 契约 27 / 集成 63 / e2e 1） |
| 全量回归（台账） | **PASS @ `73a4177`**（`TR-20261029011052-PD4-01`，`scope: final`） |
| 守卫 | **10 项**：根目录白名单、game-core/contracts 纯度、客户端依赖边界、服务端依赖边界、模块清单一致、Bundle 规则、生成物未手改、文档 front matter、无空目录、占位值 baseline |
| 证据目录 | 48 个 `docs/06_validation/evidence/EVD-*` |
| 迁移 | **2 个**：`server/db/migrations/0001_init.sql`、`0002_regions.sql` |

### 1.10 治理管线（pds）

| 项 | 实测 |
|---|---|
| 权威任务索引 | `.product-development/task-index.json`，`plan_version: PLAN-R3`，70 张（DONE 50 / SUPERSEDED 9 / VERIFIED 3 / BLOCKED 8） |
| 卡面目录 | `.product-development/tasks/`（`config.json:paths.task_cards` 逐字指向），18 份 |
| 决策登记册 | `docs/03_solution/decisions/decision-index.json`，38 条（architecture 15 / product 23） |
| 体检 | `pd.mjs health .` → **通过（45 个提醒，0 错误）** |
| 未完成卡 | 8 张 BLOCKED，全部有外部 owner（D-50 范围移出 9 张已 SUPERSEDED） |

## 2. 仅来自文档、本次未在代码中验证的结论（标注来源）

| # | 结论 | 来源 | 为什么未验证 |
|---|---|---|---|
| D-1 | 「主包 3.1MB、引擎 `cocos-js` 占 2.5MB、`game.json` 含 8 个 `subpackages`」 | `current-plan.md:120` | **体积已复测**（`du -sh` = 3.1M）；分包清单未复测（需解包 `game.json`，属构建产物） |
| D-2 | 「首钩命中率 SIMULATED 12/20 = 60%」 | D-52 `mechanism.sim20` | 机制侧模型输出，**不是真人数据**；D-52 明文禁止当 4011 验收 |
| D-3 | 「低端安卓 4GB 稳定 30 帧、首次可操作 P90 ≤5s、内存 180–250MB」 | `REQ-NF-0001:10-12` | 无真机、无平台工具 → **全部无基线** |
| D-4 | 「本地存档 ≤300KB」 | `REQ-NF-0001:14` | 未测；存档结构 `packages/game-core/src/save/` 有 schema 但无体积断言 |
| D-5 | 「软著硬期限 ≤2026-10-30」 | `lifecycle.md:33` | 用户侧法务事项，代码不可验证；**今日已 10-29，仅剩 1 天** |

## 3. 文档与代码不一致清单（逐条列出，不静默）

| # | 位置 | 文档说 | 代码/实测 | 影响 | 处置 |
|---|---|---|---|---|---|
| **I-01** | `client/assets/scripts/app/BootController.ts:12` | 「account.login（**mock**）→ setToken」 | `:61-64` 已用 `getPlatform().login()` 取真实 code（TASK-7010 落地），`plat` 按平台映射 | 读注释的人会以为登录还是假的，可能"修"出一个回退 | A 阶段顺带改注释（PD7-04 步骤 5） |
| **I-02** | `client/assets/scripts/app/panel-types.ts:13` | 「`PanelKey` 锁定 **4 个主 Tab**」 | 类型实为 **6 个**；`MainView.ts:27-34` 也是 6 个 | 与本版 §1.2 的"无 raft"结论直接相关：读数会误以为 Tab 只有 4 个 | PD7-03 一并订正 |
| **I-03** | `.product-development/config.json:git.main_branch` | `"master"` | 本地分支名 `main`（upstream `origin/master`） | 脚本若按字符串切分支会失败 | 不改 config（避免越权），登记为已知；执行者一律用 `git branch --show-current` |
| **I-04** | `docs/03_solution/decisions/decision-index.json` | （无 D-19~D-48） | 册内只有 `D-01~D-18`、`D-49~D-53` | `plan-v010/07-decisions-pending.md` 与 `02` 正文引用的 **D-42~D-47 无登记实体**，追溯断链 | 本版新裁决从 **D-54** 起编；空号**不补**（补=伪造历史），改为在 `03 §2.4` 登记"失效引用清单" |
| **I-05** | `docs/04_planning/current-plan.md:12-20` | plan-v010 的 20 卡「已全部落账」，v1.0「收官」 | 20 卡确实落账（`9da93b7`），但其中 7013/7014 按 D-45=B 推迟；`raft`/`sea` 客户端仍 18 行 | 「收官」一词会让人按"收尾"排期 | 本版改口径为「v1.0 四环闭环、第五环欠账」（`03 §2.2` M-2） |
| **I-06** | `docs/00_governance/glossary.md:41` | 「五环（v1.0 代码层）= 捞→包→做→**扩**→卖」 | 扩（raft）无界面、无调用方 | 同一概念两处口径 | 本版不改 glossary（属治理文档，待 A 阶段出口一起改），先把冲突写进 `03 §3 C-1` |
| **I-07** | `docs/01_product/mvp-scope.md:48-58` | v1.0 含「7 个员工岗位」「自己的岛」「野人岛+迷宫塔防」 | D-50 已把这 13 模块登记为 v1.1 | 源需求文档未随裁决更新 | 不改源文档（设计已冻结）；`03 §3 C-2` 记录，排期一律以 D-50 为准 |
| **I-08** | `docs/04_planning/roadmap.md:21` | v1.1 = 赶海/钓鱼/聊天/保护卡/深海/社交/称号/员工 | D-50 的 v1.1 清单是 13 个模块（含 `compliance`/`ads`/`telemetry`/`progression`/`leaderboard`） | 两份 v1.1 清单不一致 → 排期会漏 5 个模块 | B/C 阶段以 **D-50 的 13 项为准**（明细见 `03 §2.2`） |
| **I-09** | `docs/02_requirements/features/` | 应有 REQ-F-xxx | **目录内只有 `README.md`**，0 个 REQ-F 文件 | `06` 要求"每卡追溯到 REQ-F"，在本仓**无法满足** | 追溯锚改为 `mvp-scope.md` 条款 + 设计源章节 + 决策 ID（`03 §2.1` 给出映射表） |
| **I-10** | `plan-v010/02-requirement-inventory.md:26` | 「v1.0 范围，**24 个**模块」 | `module-catalog.json` 里 `phase: v1` 是 **23 个**（`ops` 不在册，仅被守卫 allow 白名单放行） | 分母不同 → 完成度百分比不同 | 本版统一用 **23 + 1(ops 不建界面)** = 24 的写法，并注明分母来源 |
| **I-11** | `.product-development/config.json` / 远端 | 分支 `master` | 本地 `main`、远端 `origin/master` | 见 I-03；另：本次 `git fetch` **因缺凭据失败** | `01 §3` 已限定"双端一致"的证据强度 |
| **I-12** | `client/assets/scripts/services/net/RpcClient.ts:175-200` | （无文档提及） | `MOCK_HANDLERS` 4 个 handler 仍在，`compliance.check` 的 mock 返回 `verified:true` | 打开 `FORCE_OFFLINE` 即合规恒真 | 不改代码（本版只读）；`10 §R-5` 登记为"哑弹风险"，PD7-17 处置 |

## 4. 推论：三个阶段的排序为什么必须是这样

1. **A 必须先做。** 五环缺一环是"口径与实现不一致"，不是"新功能"；在任何 v1.1 工作之前把它补齐，
   否则 v1.0 永远无法被诚实地说成"完成"，而 v1.1 的一切要以 v1.0 上线为前提（`mvp-scope.md:62`）。
2. **B 必须在 C 之前。** 13 个 v1.1 模块里 **11 个的第一阻塞点是同一件事：表 0 行**（`plan-v010/02 §2.1`）。
   先写代码再补数，等于用占位值再造一批"看起来实现了"的模块（本项目已栽三次，见 `08_knowledge/lessons-learned.md`）。
3. **D 只能挂在外部条件上。** `compliance` 去桩需要 appid/secret/资质，本版**不排期、只登记解除条件**（D-51）。
