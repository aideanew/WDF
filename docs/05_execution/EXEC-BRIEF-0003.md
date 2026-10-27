---
id: EXEC-BRIEF-0003
title: v1.0 冲刺派工指令（TASK-4001~4016，三助手独立执行）
status: active
module: execution
owner: hark
created: 2026-10-27
related: [PLAN-V003-00, PLAN-V003-DS, EXEC-BRIEF-0002, ADR-0011]
---

# EXEC-BRIEF-0003 · v1.0 冲刺派工指令

> **前提**：用户已于 2026-10-27 裁决"全按建议值"（`docs/04_planning/plan-v003/decision-sheet.md`，status: accepted）。
> 本指令是**唯一执行依据**；与 plan-v003/05~08 的任务卡配合使用（卡=交付什么，本文件=怎么做与怎么验）。
> **主控不执行任何卡**；三个助手互相不能通信，唯一共享面 = 本文件 §2/§3 + 契约 + decision-sheet。

## 0. 怎么用

1. 每个助手拿到 §8 对应一段 prompt 开场，先读本文件 §1~§7 与 plan-v003 对应卡，再按 §4 波次顺序执行。
2. **同时最多 3 个写者**（§5 锁表）；单卡只跑自身验证，波次批末跑全量 `npm run verify`。
3. **禁 git commit**：所有助手只改文件+跑验证+按 §6 上报；统一由主控提交/推送。
4. 每卡上报一次，严格按 §6.1 模板；发现本文件与真实代码冲突 → 停手按 §7 熔断上报。

## 1. 通用铁律（G-01~G-18，违反即 FAIL）

| # | 铁律 | 依据 |
|---|---|---|
| G-01 | 默认只读；只写各卡"允许修改"清单内路径 | standing 规划 §1 |
| G-02 | 数值唯一来源 = `plan-v003/decision-sheet.md`；表内没有的值**禁止自编**，缺 → BLOCKED 上报 | E-06 + DS 解冻凭证 |
| G-03 | 禁改 `packages/contracts/**`，**仅两处例外**：TASK-4006（只准 `contracts/actions.ts` 增 `economy.sell`，禁碰 errors/ux）与 TASK-4015（errors/ux）；4015 与 4006 同提交暂存 | ADR-0011 + DS 解冻授权（主控 2026-10-27 扩裁） |
| G-04 | 改 `packages/**` 后必跑 `npm run sync`，否则守卫 `generatedUntouched` 红 | 守卫第 7 项 |
| G-05 | 禁手改 `client/assets/scripts/generated/**`（改源重 sync） | 同上 |
| G-06 | 类型检查唯一过滤式：`npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 \| grep -v "^C:/"`；**禁止** `grep 项目路径`（漏 services/** 假绿） | BASE-34 教训 |
| G-07 | 依赖 `'cc'` 的代码 Node 测不到：`npm test` 全绿 ≠ 完成，必须叠加 G-06 +（UI 卡）真机录屏。**无真机降级判据**：真机缺失时 UI 运行时断言记 **UNKNOWN**（不得记 PASS），替代证据 = G-06 零错 + 逻辑层单测 + 上报中列出走查过的代码行号；不阻塞该卡其余断言与下一卡 | P0 读表崩溃教训 + 主控 2026-10-27 裁定 |
| G-08 | Cocos 3.8 `resources.load` 全部重载返回 void、**无 loadAsync**：读资源一律 4 参回调包 Promise（范本 `services/config/index.ts` 已修好，照抄范式） | 10-27 主控 hot-fix |
| G-09 | 存档背包段是**扁平** `modules.inventory = { [itemId]: number }`，**没有 `.items` 子键**；未知 id（如 driftwood）走 unknownIds 分支不崩 | HookModel.ts:114-117 |
| G-10 | `QueryRes` 字段是 **`items`**（非 rows），另有 `me?/next?/snapshotAt` | contracts/leaderboard/index.ts:6 |
| G-11 | UX 态只准用 `generated/contracts/common/ux.ts` 的 `toUxState/conflictOf`；禁手写 `if (code===2001)`；`conflict` 只来自 `save.push accepted:false` | DESIGN-0001 |
| G-12 | 新面板必须走 `createXxxPanel(parent): PanelHandle` 工厂 + PanelKey 注册；MainView 仅 ≤5 行挂载改动 | TASK-3101 契约 |
| G-13 | game-core 纯函数：无 Math.random/Date.now/enum/namespace/IO/绝对导入；时间由入参传 | gameCorePurity 守卫 |
| G-14 | 改完任何 `git checkout --` 必跑换行探测：`git diff --quiet && npm run guard`（仓库已有 `.gitattributes`，仍须防残留） | C-06 教训 |
| G-15 | push/commit 归主控；助手本地验证命令一律不碰网络远端 | 并发纪律 |
| G-16 | 文档 md 必须带 front matter（id/title/status），status ∈ 守卫白名单 | docsFrontMatter |
| G-17 | 长命令不接管道（假死），重定向文件再读；**例外** G-06 过滤式 | P-06 |
| G-18 | 上报只报 PASS/FAIL/UNKNOWN + 证据路径，不写长篇解释 | 防自证循环 |

## 2. 锁定裁决值（= decision-sheet 摘要，转录唯一依据）

- **D-01 merchants**：渔村 region_bp=10000/限购20；流浪 8500/10；黑市 13000/5。回收价=`floor(base_price × recycle_bp/10000 × region_bp/10000)`。
- **D-02 facilities**：9 行（熔炉/灶台/锯台/砧台/木炭窑/炼油炉/高炉/锁匠铺/机械工坊），effect_bp=10000。
- **D-03 buildings**：6 行，大仓库 storage+50、货舱 +20，其余 0。
- **D-04 hooks**：1 行 target_dist=600、angle_deg=15、max_power_bp=DEFAULT_HOOK_CONFIG 现值（等值迁移）。
- **D-05 guide_steps**：5 行（出钩→背包→合成→回收→榜单），每行一句文案+target_panel。
- **D-06 ad_placements**：3 行（hook_cooldown/offline_double/shop_refresh），每位置每日上限 3。
- **D-07 items**：weight=1/capacity=0/stack=99/unlock_level=0（全 106 行）。**主控裁定：客户端本期维持不显示 weight/capacity/unlock_level**——TASK-3102/3103 的"读 0 = 伪造数据 / 不读 station/job/unlock_level"守卫断言（V-07.c / V-10.e）继续有效；显示放开延后至 v1.1（已登记 plan-v003/10-risks）。4002 只管把真实值转录进表，不改任何面板。
- **D-08 locks**：hits_required none=0/iron=3/copper=5/silver=8/gold=12；zone_bp=0。
- **D-09 chests**：smashable=true/size=1（3 行）。
- **D-10 recipes**：job 空、unlock_level=0。
- **D-11**：ADR-0012 影子账本（容差 0，不一致=1001+telemetry；限购日界=服务端 Asia/Shanghai 自然日）→ `economy.sell{itemId,count}`。
- **D-12**：新增 `BIND_TICKET_INVALID=2004`；**D-13**：event ops 仅登记；**D-14**：维持 INTERNAL 回落+登记。

> **ADR-0011 时序裁定（主控 2026-10-27）**：ADR-0011 文档现状 `proposed` 且写明"不进入本轮允许修改范围"，但 D-11/D-12 已由用户裁决锁定。**授权条款：缺口 1（sell/ADR-0012）与缺口 2（2004）视为主控预授权，TASK-4006 可即时按 §2/§3.3 改 contracts/actions，无需等 ADR 文档翻状态；ADR-0011/0012 的 `proposed→accepted` 状态翻转由 TASK-4015 在 W4 事后补录并链接提交号**。助手执行以本文件 + decision-sheet 为准，不得以 ADR 文档旧状态为由停手。

## 3. 跨任务接口契约（唯一共享面）

### 3.1 面板（沿用 TASK-3101，不得改形状）
`PanelKey` 现为 `'hook'|'inventory'|'crafting'|'leaderboard'`。**4007 是唯一授权扩 `'merchant'` 的卡**；`guide` 走浮层（同 settings 模式），不进 PanelKey。工厂签名 `createXxxPanel(parent): PanelHandle` 不变；导航一律 `app/nav.ts navigate()`。

### 3.2 配置服务（已实现，直接消费）
`services/config`：`table(name)`（行浅拷贝，未预加载→[]+warn）、`preload(names)`、`configVersion()`、`clearCache()`。表名联合需扩 `'merchants'|'facilities'|'buildings'|'hooks'|'guide_steps'|'ad_placements'`（**由 4002 一并扩**，含 `TableRowMap` 行类型 import 自生成物）。

### 3.3 服务端经济（4005/4006 产出，4007/4008 消费）
```
economy.sell  req { itemId: Id; count: int≥1 }  rid 必带（幂等）
              res { accepted: true; herbDelta: number; quotaLeft: number }
              失败：超卖/越权 → 1001 BAD_PAYLOAD；限购尽 → 3002 QUOTA_EXHAUSTED
ledger_entry 追加行：{ player_id, type:'sell'|'salvage', item_id, count, value_herb, at }
影子校验：sell.count ≤ Σ(salvage+push diff) − Σ(sell)，容差 0，违反 → 1001
```
4007/4008 **只准 `invoke('economy.sell')`**，禁直接改 game-core 或 LocalSave 的经济段。

### 3.4 存档键（主控裁定，4004 照办）
`modules.inventory`（扁平）、`modules.guide.done: string[]`（4004 新增，写前先读后并）。
**迁移裁定**：`modules` 是 `Record<string, unknown>` 开放 map，**新增 `modules.<key>` 属开放 map 扩展，不算存档结构变更，不递增 `SAVE_SCHEMA_VERSION`、不写迁移函数**；但 4004 须在其卡内登记一行"新增键 = guide.done，默认值 []"（写入 plan-v003/05 的卡面备注即可）。除此之外任何存档**已有键的形状变更**仍触发 AGENTS.md 的版本递增+迁移+测试三件套。

## 4. 波次与任务卡（L3 步骤 / L4 断言）

> **TASK-4001（数值转录工具设计）已并入 TASK-4002 执行**：其唯一核心产出 `tools/gen/transcribe.mjs` 当前**不存在**（tools/gen/ 仅有 catalog/config/conversation-log/docs-index 四个 mjs），由 S-402.2 新建——这是预期内的"建"而非"改"，不构成熔断。§4 因此只覆盖 15 张卡的执行细节。

### W1（B 先行，A 跟进；C 全程并行 S14 三卡）

**TASK-4002 数值转录（助手 B）**——卡面见 plan-v003/05
- S-402.1 探测：`cat docs/04_planning/plan-v003/decision-sheet.md` 确认 status=accepted。
- S-402.2 写 `tools/gen/transcribe.mjs`：读 decision-sheet 的 A/B 组 → 写 `game-data/source/*.csv` 对应行（**每行带 `;source=DS-D-xx` 注释列**）→ 触发 `npm run gen:config`。未覆盖项 skip 并打印。
- S-402.3 扩 `services/config/tables.ts` 的 `TableName`/`TableRowMap` 六新表（行类型 import 生成物）。
- S-402.4 `npm run gen:config && npm run sync`；回填勾销 `UNKNOWN-TABLES.md` §三/§四/§五（勾销行注明 DS 编号）。
- S-402.5 确认：guard 9/9；`node tools/gen/transcribe.mjs --dry-run` 幂等（二次跑 0 变更）。
- V-402.a `table('merchants').length===3 && table('hooks')[0].target_dist===600`
- V-402.b items 106 行中 weight 全=1、stack 全=99；locks hits_required=[0,3,5,8,12]
- V-402.c `configVersion()` 返回值 ≠ **基线 `b249f288e985da48`**（2026-10-27 主控实测 `_manifest.json` 现值），且 `_manifest.json` 的 `tables` 数组同步
- V-402.d 全量 verify 绿 + G-06 零项目错误
- 允许：game-data/**、tools/gen/**、services/config/tables.ts、UNKNOWN-TABLES.md。**`client/resources/config/**` 是 gen 产物：只准经 `npm run gen:config` 生成（G-05），禁手改**。禁止：contracts/**、server/**、features/**。

**TASK-4003 HookView 接表（助手 A）**：见 plan-v003/05；要点——缺行回落**现常量**并 warn；HookModel 入参 cfg 注入；hook 既有测试全绿。V：改 `hooks.target_dist` 600→500 后 `chargeAndCast` 达杆距离同步 −100（数值断言）；删表→回落 600 等值；G-06 零错。

**TASK-4004 引导层（助手 A，可与 4003 串行同波）**：见 plan-v003/05；新建 `features/guide/**`；`modules.guide.done` 读写并包 try/catch；V：首启出第 1 步、5 步后不再现、失败不阻塞主界面。

**S14 并行三卡（助手 C）**：4010 录屏（4 mp4+6 态矩阵，真机由用户提供，缺→BLOCKED 不造数）；4011 命中率采样（≥3人×20钩，附原始日志≥20条；未达标只记录禁调参）；4012 包体基线（`tools/measure-bundle.mjs`，主包数字落 EVD-4012；>4MB 出瘦身候选清单但不动包）。

### W2（B 先行架构，A 跟进 UI）

**TASK-4005 ADR-0012（助手 B，按已锁定方案成文）**
- S-405.1 按本文件 §2 D-11 与 §3.3 写 `docs/03_solution/decisions/ADR-0012-authoritative-inventory.md`：数据流图（salvage/claimInfo 与 push diff 记获得 → sell 校验 → ledger 追加）、容差=0 依据、失败码=1001、限购日界=服务端时区、回滚方案（关校验开关）。
- S-405.2 双向钢人段：记录方案 Y（全量权威背包）被弃理由。
- S-405.3 状态 `accepted`（用户已裁决），`review` 填 2026-11-27。
- V-405.a ADR-0012 存在且 front matter 合法；V-405.b 引用 ledger_entry 迁移行号（0001_init.sql:44）；V-405.c guard 文档检查绿。

**TASK-4006 economy.sell（助手 B）**
- S-406.1 contracts：`actions.ts` 增 `economy.sell`；payload zod（§3.3）；**此改动必须与 4015 的 errors 变更同一提交分支暂存**（4015 未到则先只加 action 不动 errors）。
- S-406.2 `game-core/economy` 纯函数 `sellValue(basePrice, recycleBp, regionBp): number`（floor、负数/0/溢出防御）+ 单测 ≥6（含 region_bp 8500/10000/13000 三档边界）。
- S-406.3 server `economy/handlers.ts` 实现：配额检查（3002）→ 影子校验（1001）→ `ledger_entry` 追加（type=sell）→ 返回 herbDelta/quotaLeft；幂等走既有 rid 表。
- S-406.4 `salvage` 侧（供 4009 复用）：`ledger_entry` 记获得（type=salvage）的 repo 函数。
- S-406.5 集成测试 `tests/integration/economy-sell.test.mjs`：正常卖/超卖/重复 rid/限购尽/影子不一致 5 例。
- V-406.a 新测试全绿且 `# tests ≥ 113`；V-406.b 集成断言 `ledger_entry` 有行；V-406.c 超卖零副作用（前后快照相等）；V-406.d verify 绿。
- 允许：`packages/contracts/src/actions.ts`（仅增 economy.sell）、`packages/game-core/src/economy/**`、`server/src/modules/economy/**`、`server/src/modules/salvage/**`、`tests/**`。**db 迁移：无**（ledger_entry 已在 0001_init.sql:44）。禁止：save.push 语义、contracts/errors.ts 与 ux.ts（留给 4015）。

**TASK-4007 商人页（助手 A）**：见 plan-v003/06；PanelKey 扩 `merchant`（唯一授权）；空额度=empty 态"今日额度已用完，明天再来"；卖成功 `navigate('inventory')`。V：切换不重建；G-06 零错；录屏 EVD-4007。

**TASK-4008 背包回收入口（助手 A）**：见 plan-v003/06；`app/panel-ui.ts` 增 `addConfirmDialog()`；仅 known 行有按钮（driftwood 无按钮不崩）；态走 toUxState。V：取消无副作用；revision 推进。

### W3

**TASK-4009 开锁 + salvage.claimInfo（助手 A，B 配合 handler）**：见 plan-v003/07。drops 空表降级路径已锁死（固定掉 base_price 最低物品 + telemetry 记录，**禁自编掉落**）。V：`grep salvage.claimInfo server/src/gateway/handlers.ts` 非 todo；verify 绿。

**TASK-4010/4011/4012（助手 C）**：W1 未完成则本波续做（断言同 W1）。

### W4

**TASK-4015 契约解冻（助手 B，精确到行）**
- S-415.1 `errors.ts` 增 `BIND_TICKET_INVALID: 2004`（保持只增不改）。
- S-415.2 `server/src/modules/save/service.ts` 绑定票据失败改抛 2004（原 2001 处）。
- S-415.3 `contracts/common/ux.ts` 的 `UX_BY_ERROR_NAME` 增 `BIND_TICKET_INVALID: { state:'noPermission', retryable:false, next:'login' }`（`satisfies` 强制，漏了编译红）。
- S-415.4 `error-catalog.md` 登记 2004 + D-14 缺口说明；契约测试增 2004 用例；`npm run gen && npm run sync`。
- S-415.5 ADR-0011 缺口1/2 状态改 `accepted` 并链接提交号；缺口3/4 保持 proposed。
- V-415.a 契约测试含 2004；V-415.b verify 全绿；V-415.c 15 码与 error-catalog 一一对应。
- **阻塞**：若 4006 未合入 → 先合 4006 再执行本卡（同提交约束）。

**TASK-4013 合规清单（助手 C）** / **TASK-4014 瘦身（助手 A，条件：4012 实测>4MB）** / **TASK-4016 四文档对齐（助手 C）**：见 plan-v003/08。

## 5. 并发与排他锁表

> 口径：**写者 = 助手**（一个助手同一时段只有一张在写卡；同一助手名下多卡为串行，不占多席）。

| 时段 | 写者1 | 写者2 | 写者3 | 排他要点 |
|---|---|---|---|---|
| W1 前半 | B:4002 | C:4012 | — | 4002 独占 game-data+tables.ts；C 完成 4012 后接 4010 |
| W1 后半 | A:4003→4004 | B:4005 | C:4010→4011 | A 独占 features/hook+guide；B 独占 docs/03_solution/decisions |
| W2 前半 | B:4006 | C 收尾 | — | 4006 独占 contracts/actions+server/economy |
| W2 后半 | A:4007→4008 | — | — | A 独占 panel-types+economy/inventory 视图 |
| W3 | A:4009 | B 配合 server | C:4010~12 | 4009 独占 salvage |
| W4 | B:4015 | A:4014(条件) | C:4013→4016 | 4015 独占 contracts/errors·ux；4016 最后跑 |

## 6. 上报协议

### 6.1 模板（严格照抄）
```
TASK-<id> · <名称>
STATUS: PASS | FAIL | UNKNOWN | BLOCKED
DIFF: <文件清单（增/改/删 计数）>
VERIFY: <逐条 V-x.y → PASS/FAIL，附命令退出码>
EVIDENCE: <EVD 路径>
UNRESOLVED: <无 或 列表>
```
### 6.2 判定
- 任一 V FAIL → 整卡 FAIL；BLOCKED 必须写明缺的裁决/前置编号。
- 主控只复核 diff + 复跑 VERIFY 命令；通过才进下一波。

## 7. 熔断与升级
- 同卡连续 2 次 FAIL → 停手，改任务书/升档位/标 BLOCKED；**禁止换提示词硬撞第 3 次**。
- 发现事实与本文件冲突（如契约字段与 §3 不符）→ 停手上报主控，不得自行解释。
- 真机环境缺失 → 4010/4011 标 BLOCKED 转 4012 先行，不造数据；**UI 卡（4003/4004/4007/4008/4009）的录屏断言按 G-07 降级记 UNKNOWN，卡本身不因此 BLOCKED**。

## 8. 三段可复制 prompt

### 8.1 助手 B（数据 + 服务端 + 契约）
```text
你是 WDF v1.0 冲刺的"数据与服务端执行者"。仓库根 E:/Demo/WDF，分支 master，起点 commit a37176e（先 git pull 确认）。
必读（按序）：docs/05_execution/EXEC-BRIEF-0003.md 全文（§1 铁律、§2 锁定值、§3 接口、§4 你名下卡片、§5 锁表、§6 上报、§7 熔断）、
docs/04_planning/plan-v003/decision-sheet.md（数值唯一来源）、plan-v003/05 与 06 与 08 中你名下任务卡。
你名下卡片与顺序：TASK-4002 → 4005 → 4006 → 4015（4015 须待 4006 合入且主控放行）。
硬约束提醒：数值只准来自 decision-sheet（G-02）；contracts 仅 4006 可增 economy.sell（G-03 例外一），errors.ts/ux.ts 直到 4015 才可动（例外二）；ADR-0011 缺口 1/2 已预授权（§2 裁定），勿因 ADR 文档旧状态停手；改 packages 后必 npm run sync（G-04）；
类型检查只用 EXEC-BRIEF §1 G-06 的过滤式（G-06）；客户端背包段是扁平 modules.inventory 无 .items（G-09）。
禁 git commit/push；每卡按 §6.1 模板上报，一次一张；连续 2 次 FAIL 停手（§7）。
```

### 8.2 助手 A（客户端 UI/玩法）
```text
你是 WDF v1.0 冲刺的"客户端执行者"。仓库根 E:/Demo/WDF，分支 master，起点 commit a37176e（先 git pull 确认）。
必读：EXEC-BRIEF-0003.md §1/§2/§3.1~3.2/§4/§5/§6/§7；plan-v003/decision-sheet.md（D-01~D-10 数值）；plan-v003/05/06/07/08 你名下卡。
你名下卡片与顺序：TASK-4003 → 4004 →（待 4006 上报 PASS）4007 → 4008 → 4009 → 4014（仅当 4012 实测>4MB）。
硬约束提醒：面板必须 createXxxPanel 工厂+PanelHandle（G-12）；PanelKey 只有 4007 可扩 merchant（§3.1）；
UX 态只用 toUxState/conflictOf（G-11）；读资源照抄 services/config/index.ts 的回调包 Promise 范式（G-08，无 loadAsync）；
依赖 'cc' 的代码 Node 测不到——每卡除 npm test 外必须跑 G-06 过滤式，UI 行为留待主控真机录屏（G-07）。
禁改 contracts/**、generated/**、server/**；禁 git commit/push；按 §6.1 上报；2 次 FAIL 停手。
```

### 8.3 助手 C（验证 + 证据 + 文档）
```text
你是 WDF v1.0 冲刺的"验证与文档执行者"。仓库根 E:/Demo/WDF，分支 master，起点 commit a37176e（先 git pull 确认）。
必读：EXEC-BRIEF-0003.md §1/§4/§5/§6/§7；plan-v003/07 与 08 你名下卡；docs/03_solution/design/DESIGN-0001-ux-states.md（6 态走查依据）。
你名下卡片与顺序：TASK-4012 → 4011 → 4010（真机材料就绪即做，缺环境标 BLOCKED 转下一张）→ 4013 → 4016（最后，须待 4015 PASS）。
硬约束提醒：一切数字必须来自真实测量/埋点，缺数据=UNKNOWN，禁止造数（G-02/G-18）；未达标只记录禁止顺手调参；
4011 采样需真机用户配合，先出采集脚本与记录模板。4016 前必须确认 4015 已 PASS 再动 current-plan/roadmap。
禁改代码与 contracts；禁 git commit/push；按 §6.1 上报；2 次 FAIL 停手。
```

## 9. 本指令事实校验（可复跑，2026-10-27 实测）

| # | 命令 | 期望 |
|---|---|---|
| 1 | `git log --oneline -1` | `a37176e`（或其后继）且 `git status --porcelain` 为空 |
| 2 | `grep -c "status: accepted" docs/04_planning/plan-v003/decision-sheet.md` | 1 |
| 3 | `grep -n "todo" server/src/gateway/handlers.ts` | 8 个 todo 动作（4006/4009 后减为 6） |
| 4 | `python -c "import json;print(len(json.load(open('client/assets/resources/config/items.json'))))"` | 106 |
| 5 | `grep -c "region_bp\|hits_required\|effect_bp" game-data/source/*.csv`（4002 后） | 非零 |
| 6 | `npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 \| grep -v "^C:/" \| grep -c "error TS"` | 0 |
| 7 | `npm run guard` | 9/9 |
| 8 | `npm test` | pass 107（4006 后 ≥113） |
| 9 | `grep -c "new Promise" client/assets/scripts/services/config/index.ts` ≥ 1 **且** `grep -n "loadAsync" client/assets/scripts/services/config/index.ts \| grep -v "//" \| wc -l` = 0（4 参回调范式在位；loadAsync 仅允许出现在注释里——第 13 行注释，G-08 证据） | 两式同时成立 |

> 波次批末主控动作：全量 `npm run verify` → 复核各卡上报 → 统一 commit/push（`-c http.version=HTTP/1.1`）。
