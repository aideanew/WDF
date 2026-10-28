---
id: PLAN-V010-01
title: plan-v010 · 实测基线（快照 + 命令原文 + 文档/代码不一致清单）
status: active
module: planning
owner: hark
created: 2026-10-28
review: 2026-11-11
related: [PLAN-V010-00, PLAN-V010-02]
---

# 01 · 实测基线

## 1. 规划快照

```yaml
snapshot:
  规划日期: 2026-10-28
  采集时刻: 08:56–09:20 (GMT+8)
  git_branch: master
  git_commit: ea6ad204b0625c80de4330b8623c3bb4459fe161
  远程指针: ea6ad204b0625c80de4330b8623c3bb4459fe161   # 双端一致（0/0）
  工作区是否干净: true
  代码文件数:
    ts_handwritten: 244            # 排除 generated / node_modules
    client: 145  server: 56  game-core: 25  contracts: 18
  数值表: 46 张，其中 11 张有数据 / 35 张 0 行
  测试: 26 个 .mjs 测试文件 / 174 个用例（v009 收官值）
  测试命令: node --import ./tools/runtime/register.mjs --test "tests/**/*.test.mjs"
  门禁命令: npm run verify   # = gen && guard && test && typecheck
```

> 采集方式：`git fetch origin master` → `rev-parse` 双端比对；`find` + `wc -l` 统计；
> 本版**未运行** `npm run verify`（用户明确要求拒绝全量门禁）。因此 174 是 v009 收官值，
> 不是本次重测值 —— 这是本基线唯一的非实时数字，已显式标注。

## 2. 已确认的事实（带命令原文）

### F2-1 客户端 feature：8 真 / 15 占位

```bash
for d in client/assets/scripts/features/*/; do echo "$(basename $d) $(cat $(find "$d" -name '*.ts') | wc -l)"; done
```

| 真实实现（总行数） | 纯占位（每个**恰好 18 行**） |
|---|---|
| chest 631 / economy 457 / settings 432 / hook 407 / crafting 365 / inventory 309 / leaderboard 306 / guide 220 | account, ads, compliance, crew, defense, event, fishing, island, power, progression, raft, salvage, sea, social, telemetry（共 15 个） |

占位文件的实际内容（`features/fishing/` 全部 3 个文件）：

```ts
// model/FishingModel.ts —— 只有版本号，无任何业务字段与方法
export class FishingModel {
  private version = 0;
  get stateVersion(): number { return this.version; }
  protected touch(): void { this.version++; }
}

// view/FishingView.ts —— lateUpdate 里唯一一行是注释
@ccclass('FishingView')
export class FishingView extends Component {
  private seenVersion = -1;
  lateUpdate(): void {
    // if (model.stateVersion !== this.seenVersion) { ... }
  }
}
```

> **判据**：18 行 = 3 文件（index 1 + model 7 + view 10）。15 个 feature 行数完全相同 →
> 同一份脚手架模板复制，**不存在任何模块特有的业务代码**。

### F2-2 客户端基础服务：5 个空壳、零引用

```bash
cat client/assets/scripts/services/{audio,pool,time,bus,log}/index.ts   # 每个 2 行
grep -rn "services/audio\|services/pool\|services/time\|services/bus\|services/log" client/assets/scripts/
# 结果：除文件自身外 0 命中
```

内容形如：

```ts
/** 对象池：漂浮物、钩子、飘字、敌人、投射物、列表格子。 */
export const SERVICE = 'pool';
```

> **后果**：`MainView.ts` 与 `GameApp.ts` 的注释都提到"预下载 Bundle""停掉定时器""切后台保存"，
> 但承担这些职责的 pool / time / bus / save.flush **都不存在**。

### F2-3 服务端空模块：5 个 × 6 行

```bash
for d in server/src/modules/*/; do echo "$(basename $d) $(cat $(find "$d" -name '*.ts') | wc -l)"; done
```

| 有实现 | 空壳（各 6 行 = service/repo/handlers 各 2 行） |
|---|---|
| account 357 / save 333 / leaderboard 283 / economy 244 / chest 183 / config 153 / telemetry 74 / compliance 33 / ops 6 | ads, event, salvage, social, ops |

`server/src/modules/salvage/service.ts` 全文：

```ts
/** salvage · 业务与事务 */
export const MODULE = 'salvage';
```

> `ops` 计入空壳但**不计为缺口**：`mvp-scope.md:56` 已定「区服管理与封号只做脚本 + SQL，不做管理后台」。

### F2-4 game-core 空模块：8 个 × 3 行

| 有规则 | 空壳（3 行，仅 `MODULE_ID`） |
|---|---|
| generated 358 / hook 151 / crafting 88 / chest 69 / save 68 / common 59 / economy 55 / inventory 54 / defense 30 / sea 19 / raft 18 | crew, defense*(见注), event, fishing, island, power, progression, salvage |

> 注：`defense` 30 行、`sea` 19 行、`raft` 18 行是"有函数但不可用"的第三类，
> 单独在 `02-requirement-inventory.md §3` 讨论（**写了代码，但输入数据是占位值**）。

### F2-5 服务端动作：22 登记 / 14 实现 / 8 todo

```bash
grep -n "todo" server/src/gateway/handlers.ts
```

未实现：`salvage.claimInfo`、`economy.buyQuota`、`event.start/submit/result`、`social.send/pull`、`ads.claim`。

### F2-6 数值表：46 张，35 张 0 行

```
prices 106 / items 106 / recipes 80 / facilities 9 / buildings 6 / locks 5 /
guide_steps 5 / merchants 3 / chests 3 / ad_placements 3 / hooks 1  → 11 张有数
其余 35 张 0 行（清单见 game-data/UNKNOWN-TABLES.md §二）
```

### F2-7 `GameApp` 是死代码

```bash
grep -rn "GameApp" client/assets/scripts/ --include="*.ts"
# client/assets/scripts/app/GameApp.ts:14/18/19   ← 自身
# client/assets/scripts/features/chest/view/ChestPanel.ts:202  ← 一句注释
```

真入口是 `BootController`（挂在 `Boot.scene`），它**只做 compliance.check → account.login → 挂 MainView**。
`GameApp.ts:1-10` 描述的「7 步启动链」**没有任何一行代码实现**。

### F2-8 合规是恒真桩

`server/src/modules/compliance/service.ts`：

```ts
export async function check(playerId: string): Promise<ComplianceRes> {
  return { verified: await playerExists(playerId), minor: false, offlineAllowanceMs: 0 };
}
```

`minor` 恒 `false`、无实名、无时段限制。`docs/07_release/compliance/anti-addiction.md`
**没有**宣称"已实现"（已核：`grep -n "已实现" 该文件` 为空），所以**不构成新的虚假陈述**；
但 `mvp-scope.md:57` 把「实名、防沉迷」列入 v1.0 必做 → **它是未实现的需求**。

## 3. 文档与代码不一致清单（逐条）

| # | 文档说 | 代码实际 | 证据 |
|---|---|---|---|
| D1 | `handlers.ts:32` 注释「已落地 12 件（全部 20 个动作）」 | **14 实现 / 22 动作**，且注释漏列 `chest.open`、`economy.sell` | `handlers.ts:35-58` 实际 22 键 |
| D2 | `MainView.ts:5` 注释「底部 4 个 Tab」、`:57`「挂载 5 个面板」 | **6 Tab / 6 面板**（hook/inventory/chest/crafting/merchant/leaderboard） | `MainView.ts:27-34`、`:58-65` |
| D3 | `GameApp.ts:1-10` 描述 7 步启动链（含离线结算、Bundle 预下载） | 方法体只有 `getPlatform()` + `onHide` 注册，**无第 2~7 步** | `GameApp.ts:17-24` |
| D4 | `07-decisions-pending.md` 之外，历史口径「数值表已转录 300 行」给人"数值齐了"印象 | 11 张有数中，`items.weight` 全表唯一值 `1`、`capacity` 唯一值 `0`（D-07 占位） | `items.csv` 取值集合实测 |
| D5 | `04_planning/current-plan.md` 指针仍指 plan-v009 | v009 已收官，应指 v010 | 本版 S5 修正 |
| D6 | `plan-v009/00-README.md` §10 称"8 张卡全 done" | 事实成立（`ea6ad20` 已推），但未标 `superseded` | 本版置 superseded |

## 4. 仅来自文档、未在代码验证的（标注来源）

- v1.0 范围（`mvp-scope.md §5`）：**已读，未逐条核代码**——本版 `02` 做的事就是逐条核。
- 微信 `appid/secret` 是否存在：**无法验证**（仓库无凭据文件，`.gitignore` 排除）。
  → 记为 BLOCKING `D-44`。
- 软著是否已在 10-30 前提交：**仓库无记录**（`07_release/compliance/copyright-materials.md` 只有材料清单）。
  → 记为 NON_BLOCKING `U-3`（法务并行线，不影响代码）。

## 5. 读取失败或无法访问

| 项 | 原因 | 影响 |
|---|---|---|
| Cocos 运行时行为（录屏类验收） | 沙箱无 Cocos 编辑器 | UI 任务只能人工验收，本版不排"UI 自动化测试" |
| 微信真机登录 | 无 appid/secret、无真机（**D-44=2，2026-10-28**） | M-9 降级为 **UNKNOWN**：`WDF_AUTH_MODE` 保持 `dev`；客户端已接平台真实 code（TASK-7010），服务端 `platform` 模式明确抛错不伪装；真机登录标记为未实现 |
| `client/temp/tsconfig.cocos.json` | 由编辑器生成、被 gitignore | 类型检查须在有编辑器的机器上跑（本项目已知，见 v009） |

## 6. 本基线的自我限制

1. **174 个测试用例数未重测**（用户要求拒绝全量门禁）。若与 v009 收官值不一致，以重测为准。
2. **行数不是行为**。本文件用行数做"是否有实现"的**粗筛**，细判在 `02` 逐模块进行；
   行数多也可能是注释多（例如 `chest/service.ts` 101 行里 21 行是注释）。
3. 本基线**不评价代码质量**，只回答"在不在"。
