---
id: EXEC-BRIEF-0002
title: 助手派工指令 v3（六级大纲：基线 → 前置门禁 → 批次 → 任务 → 原子步骤 → 验证断言 → 证据）
status: active
owner: hark
created: 2026-10-26
review: 2026-11-26
supersedes: EXEC-BRIEF-0001
related: [TASK-3002, TASK-3100, TASK-3102, TASK-3103, TASK-3104, TASK-3105, TASK-3201, TASK-3202, TASK-3301, TASK-3302, TASK-3401, DESIGN-0001, ADR-0011]
---

# 助手派工指令 v3（EXEC-BRIEF-0002）

> **唯一用途**：把 M1 剩余的 **11 张任务卡**拆给互不通信的并行开发 CLI。
> **判断标准**：拿到一段 prompt、只有局部上下文的执行者，能否**不追问、不猜测**地把活干完并自证。
>
> **v3 与 v2 的关系**：v2 已废。v3 的全部数字与路径均在 2026-10-26 现场实测复核，**并修正了 v2 的 17 处会导致误判或返工的问题**（见 §16）。其中 5 处会让执行者误报 FAIL 或写出读不到数据的代码。

---

## 0. 六级大纲体系（编号即引用）

任何一级都可单独引用（如"按 S-07.3 执行"）。

| 级 | 代号 | 含义 | 数量 | 粒度要求 |
|---|---|---|---|---|
| **L0** | `BASE-nn` | 事实基线（不可变前提） | 31 | 每条都有复核命令；不符 → 停手 |
| **L0.5** | `PF-01..06` | 前置门禁（每个执行者开工前必跑） | 6 | 全部通过才可动笔 |
| **L1** | `W1..W4` | 批次（波次，决定谁与谁并行） | 4 | 写者 ≤3，路径不相交 |
| **L2** | `C-01..C-11` | 任务卡（= 1 张 TASK 卡） | 11 | 独立完成、独立可回滚 |
| **L3** | `S-c.n` | 原子步骤（前置探测 → 动作 → 后置确认） | 98 | 单步可独立执行与撤销 |
| **L4** | `V-c.n.x` | 验证断言（可机器判定 PASS/FAIL） | 52 | 给命令 + 期望输出 + 判定 |
| **L5** | `E-c` | 证据产物（落盘路径） | 11 | 无证据 = 未完成 |

**原子化定义（L3 的硬标准）**：一个步骤必须同时满足——① 有明确的前置探测（grep/ls，能判断"是否已做过"）；② 动作是单一文件内的单一改动；③ 有即时后置确认；④ 单步可用 `git checkout -- <file>` 撤销。不满足任一条 → 拆。

**幂等总则**：同一 prompt 重跑必须安全。每个 L3 步骤都带前置探测；已存在且正确 → 记 `SKIP(已满足)` 并跳过，**绝不重复插入**。

---

## 1. 角色分工（读哪几节，不看哪几节）

| 角色 | 负责卡 | 读 | 不看 |
|---|---|---|---|
| 助手 A（客户端） | C-01, C-02, C-07, C-08, C-10 | §2 §3 §4 §5 §7 §8(C-01/02/07/08/10) §9~§11 | B/C 的卡 |
| 助手 B（纯规则+单测） | C-03, C-04, C-05 | §2 §3 §4 §5 §7 §8(C-03/04/05) §9~§11 | A/C 的卡 |
| 助手 C（闸门+文档） | C-06, C-11 | §2 §4 §5 §7 §8(C-06/11) §9~§11 | A/B 的卡 |
| 核心（本人） | C-09（TASK-3105） | 全部 | — |
| 主控 | — | 全部 | — |

**v2 已废止的分工**：TASK-3101（主界面 Tab + 4 面板桩）**已于 2026-10-26 由核心完成**（卡片 `status: done`；`app/panel-types.ts`、`app/nav.ts`、`app/panel-ui.ts`、`MainView.ts`、5 个面板桩全部落盘）。**它不在本指令的剩余任务里。**

---

## 2. L0 事实基线（31 条，全部 2026-10-26 实测）

> **用法**：开工前跑 §4 前置门禁。任何一条与现场不符 → 说明代码已变，**停手报告，不要照旧执行**。

| id | 事实 | 实测值 | 复核命令 |
|---|---|---|---|
| BASE-01 | 守卫项数 | **9**（全绿） | `npm run guard` |
| BASE-02 | 测试数 | **107 pass / 0 fail**（2026-10-26，W3 收官后；初写时 72，W1 后 97） | `npm test` 看末尾 `ℹ tests/pass/fail` |
| BASE-03 | `items.json` 行数 | **106** | `node -e "console.log(require('./client/assets/resources/config/items.json').length)"` |
| BASE-04 | `recipes.json` 行数 | **80** | 同上，换 `recipes.json` |
| BASE-05 | `_manifest.json` 表数 | **46** | `node -e "console.log(require('./client/assets/resources/config/_manifest.json').tables.length)"` |
| BASE-06 | 生成物 `CONFIG_VERSION` | **`b249f288e985da48`** | `grep -n "CONFIG_VERSION" client/assets/scripts/generated/game-core/generated/config-types.ts` |
| BASE-07 | 旧哈希出现处 | **恰好 2 处**：`RpcClient.ts:10`、`LocalSave.ts:48` | `grep -rn "16921d30a67a934f" client/assets/scripts` |
| BASE-08 | `services/config/index.ts` | **2 行**（空壳） | `wc -l < ...` |
| BASE-09 | `game-core/src/crafting/index.ts` | **3 行**（仅 `MODULE_ID`） | 同 |
| BASE-10 | `game-core/src/inventory/index.ts` | **3 行**（仅 `MODULE_ID`） | 同 |
| BASE-11 | 任务卡 | **44 文件**（43 卡 + README），索引 43 行 | `ls docs/05_execution/tasks/*.md \| wc -l` |
| BASE-12 | 已完成卡 | **2**（3001、3101） | `grep -l "status: done" docs/05_execution/tasks/TASK-3*.md` |
| BASE-13 | **剩余卡** | **11** | BASE-11 − 1 − BASE-12 |
| BASE-14 | handler | **20 总数 / 12 已实现 / 8 todo** | 见 S-11.2（**不可用 `grep -c todo`**） |
| BASE-15 | `tsc` 输出 | **21 个 error，全在 Cocos 引擎 `.d.ts`，项目源码 0 个** | 见 §5.1（**"tsc 无错"是错的表述**） |
| BASE-16 | 换行配置 | `core.autocrlf=true`；**已加 `.gitattributes`（仅 `packages/**`、`tools/**`、`server/**` → `eol=lf`）**；`.editorconfig` 声明 `end_of_line=lf`。客户端与 RAW 文档目录属性为 `unspecified` | `git config --get core.autocrlf; git check-attr -z eol -- packages/game-core/src/hook/index.ts client/assets/scripts/app/MainView.ts` |
| BASE-17 | `features/telemetry` | **18 行**（桩，view 11 行） | `find ... -name '*.ts' \| xargs wc -l` |
| BASE-18 | `RecipesRow.inputs` 类型 | **`string`**（非数组）→ 必须解析 | `grep -A8 "interface RecipesRow" packages/game-core/src/generated/config-types.ts` |
| BASE-19 | **存档段真实形状** | `modules.inventory` = **扁平 `{[itemId]: number}`**，**没有嵌套 `.items`** | `sed -n '112,118p' client/assets/scripts/features/hook/model/HookModel.ts` |
| BASE-20 | `driftwood` | **不再被写入**（仅 `BootController.ts:14` 注释残留） | `grep -rn "driftwood" client/assets/scripts` |
| BASE-21 | `QueryRes` 字段名 | **`items`**（非 `rows`）；另有 `me?` / `next?` / `snapshotAt` | `cat packages/contracts/src/leaderboard/index.ts` |
| BASE-22 | `app/panel-types.ts` | **已存在，31 行**，与 §3.1 逐字一致 | `wc -l < client/assets/scripts/app/panel-types.ts` |
| BASE-23 | `app/nav.ts` | **已存在**，导出 `setNav` / `clearNav` / `navigate` | `cat client/assets/scripts/app/nav.ts` |
| BASE-24 | 面板桩 | **5 个全存在**：`InventoryPanel` / `CraftingPanel` / `LeaderboardPanel` / `SettingsPanel` / `HookPanel` | `ls client/assets/scripts/features/*/view/*Panel.ts` |
| BASE-25 | ADR-0011 | **已存在**（`status: proposed`） | `ls docs/03_solution/decisions/ADR-0011-contract-gaps.md` |
| BASE-26 | `getPlatform()` | **无注入点**（`platform/index.ts` 模块级单例） | `sed -n '1,20p' client/assets/scripts/platform/index.ts` |
| BASE-27 | `generatedUntouched()` | **已实现源↔生成物逐字比对**（含 `npm run sync` 提示） | `grep -n "源与副本是否一致" tools/guard/checks.mjs` |
| BASE-28 | `current-plan.md` | **数字过期**：写"65 个测试"，实测 **97**（2026-10-26）；写"13 卡中 3001 完成"，实测 W1 六卡全完成 | `grep -n "65 个测试\|9 项守卫" docs/04_planning/current-plan.md`；`npm test` |
| BASE-29 | `ItemsRow.category` | 10 值字面量联合（`'raw'\|'material'\|'tool'\|'food'\|'facility'\|'building'\|'chest'\|'lock'\|'equipment'\|'misc'`） | `grep -A11 "interface ItemsRow" .../config-types.ts` |
| BASE-30 | `HOOK_DEMO_ITEM_ID` | **`'item_0001'`** | `grep -n "HOOK_DEMO_ITEM_ID =" .../HookModel.ts` |
| BASE-31 | **单文件测试的必需参数** | `node --import ./tools/runtime/register.mjs --test <file>`。**裸 `node --test` 必失败**：`ERR_UNSUPPORTED_DIR_IMPORT`（`packages/*/src` 用无扩展名目录导入，需自定义 loader） | `node --test tests/e2e/skeleton.test.mjs` 对照 `node --import ./tools/runtime/register.mjs --test ...` |
| BASE-32 | **客户端 TS 目标** | `client/temp/tsconfig.cocos.json` 的 `target: ES2015`（lib 随之）→ **禁用 ES2018+ 库 API**：`Promise.finally`（TS2550）、`Array.flatMap`、`Object.fromEntries`、`String.matchAll`。`?.` / `??` 是语法会被降级，可用 | 用 `.finally()` 一次即报 `TS2550`；`cat client/temp/tsconfig.cocos.json` |
| BASE-33 | **`.meta` 缺口（既存）** | `InventoryPanel.ts.meta`（TASK-3101 交付时缺）与 `tables.ts.meta`（C-02 新增）**从未入库**。`MainView` 走 TS 相对路径 import 不引用 uuid，故无断裂；编辑器下次打开自动补齐。**勿手工伪造 UUID** | `git ls-files client/assets/scripts/features/inventory/view/` |
| BASE-34 | **项目真存在 7 个类型错误（既存/前卡遗留，未修）** | 用 §5.1 新式判定式可复现：①`generated/game-core/inventory/index.ts:31` `Object.entries` 需 ES2017（**C-04 产物**）②③`services/config/index.ts:12` `JsonAsset.json` 类型为 void、`tables.ts:57` 行浅拷贝断言需先转 `unknown`（**C-02 产物**）④~⑦`services/net/RpcClient.ts:88,89,99,101` `RpcResponse.d`/`.msg` 不在类型上、**`ERR.SYSTEM` 不存在 → 网络不可达时 `RpcError.code === undefined`**（**既存**） | §5.1 命令 |

---

## 3. 跨任务接口契约（唯一共享面，写死不得改）

### 3.1 面板接口（已落地，`app/panel-types.ts`，逐字对齐）

```ts
export type PanelKey = 'hook' | 'inventory' | 'crafting' | 'leaderboard';
export interface PanelHandle {
  readonly key: PanelKey;
  readonly node: Node;
  onShow(): void;   // 首次显示 / 再次切回；实现方负责按需刷新
  onHide(): void;   // 切走；必须停定时器与监听，不得销毁节点
  refresh(): void;  // 显式刷新
  destroy(): void;  // 仅销毁自身节点与监听
}
export type PanelFactory = (parent: Node) => PanelHandle;
```

- 每个 `features/<module>/view/<X>Panel.ts` 导出 `export function createXxxPanel(parent: Node): PanelHandle`。
- **`MainView.ts` 与整个 `app/**` 由核心维护，助手只读**；助手只覆写桩体。
- **Tab 切换只改 `node.active`，不销毁重建**（`MainView` 已如此实现，勿改）。
- **`settings` 不在 `PanelKey` 内**（设置是右上角"设"按钮浮层）。

### 3.2 跨面板导航（**已解决，不要再造回调参数**）

```ts
import { navigate } from '../../../app/nav';   // 从 features/<m>/view 起算
navigate('hook');   // 请求 MainView 切 Tab；未注册时静默无操作
```

> v2 的 A-3.5 要求"通过 PanelHandle 之外的回调参数实现"——**此机制已由 `app/nav.ts` 提供**，直接 `navigate()`。

### 3.3 配置读取服务（C-02 产出，C-07/C-10 消费）

```ts
// client/assets/scripts/services/config/index.ts（C-02 实现）
export type TableName = 'items' | 'recipes' | 'prices' | 'locks' | 'chests';
export function table<K extends TableName>(name: K): ReadonlyArray<TableRowMap[K]>;
export function preload(names: TableName[]): Promise<{ loaded: TableName[]; failed: TableName[] }>;
export function configVersion(): string;
export function clearCache(): void;
```

**数据事实（已实测，勿再猜）**：

- 表文件在 `client/assets/resources/config/<name>.json`，是**行数组**；`items` 106 行、`recipes` 80 行、表名总数 46。
- `recipes.inputs` 是**字符串** `'item_0001*1;item_0002*2'`（80 行分布：单输入 31 / 双 44 / 三 2 / 四 3）。
- 空字段（`job` / `unlock_level` / `weight` / `capacity` / `stack` / `craftable`）在 JSON 里**被省略**（TS 侧为可选属性）。
- `items.name` 与 `base_price` 是**必填**（非可选）。

### 3.4 UX 态（已落地，直接消费）

```ts
import { toUxState, conflictOf } from '../../../generated/contracts/common/ux';
toUxState(code) → { state: 'error'|'empty'|'noPermission'|'success'|'conflict', retryable, next?, code }
```

- 契约含 **14 个错误码**的完整映射（`satisfies Record<keyof typeof ERR, ...>`，漏一个即编译失败）。
- `3001 DUPLICATE_REQUEST` → `success`（幂等回放），**绝不可当冲突或错误**。
- `4001 RATE_LIMITED` → `{ state:'error', retryable:true, next:'retry' }`。
- `conflict` **只**来自 `save.push` 的 `accepted:false`（`conflictOf(res)`），不由错误码产生。
- 禁止自写 `if (code === 2001)` 分支。

### 3.5 排行榜契约（**v2 此处字段名有误**）

```ts
// packages/contracts/src/leaderboard/index.ts（已冻结）
export interface QueryReq { scope: 'global' | 'region' | 'province'; cursor?: string; limit: number }
export interface QueryRes { items: RankRow[]; me?: RankRow; next?: string; snapshotAt: number }
export interface RankRow  { rank: number; playerId: string; name: string; value: number; title?: string }
```

服务端口径（`server/src/modules/leaderboard/service.ts`，**只读**）：赛季常量 `CURRENT_SEASON='S1'`；名称兜底 `玩家<playerId 后4位>`；`flagged` 玩家不入榜；province 快照未产出 → 返回空 `items`（契约合法）。

### 3.6 存档段键名与封印铁律（**v2 此处有错，以此为准**）

```ts
SaveFile {
  schemaVersion: 1;
  configVersion: string;
  saveId: string;
  revision: number;
  savedAt: number;
  modules: Record<string, unknown>;   // 自由段
  checksum: number;
}

// 背包段：modules.inventory 本身就是扁平的 id→数量映射
save.modules.inventory = { 'item_0001': 3, 'item_0002': 1 }   // ← 没有 .items 一层
```

**证据**（`HookModel.applyToSave`，`:114-117`）：

```ts
const modules = { ...body.modules } as Record<string, Record<string, number>>;
const inv = { ...(modules.inventory ?? {}) };
inv[HOOK_DEMO_ITEM_ID] = (inv[HOOK_DEMO_ITEM_ID] ?? 0) + 1;
modules.inventory = inv;
```

> v2 §3.4 写作 `modules.inventory.items = {...}` —— **错**。按 v2 实现会读到 `undefined`，背包永远空、合成永远缺材料。

**封印铁律**：写回前必须剥离旧 checksum，否则 `verifySave` 永远失败：

```ts
const { checksum: _stale, ...body } = file;
const sealed = sealSave({ ...body, revision: body.revision + 1, savedAt: Date.now() });
```

**历史脏数据（仅限旧档）**：`BootController` 曾在 3101 之前写入非法键 `driftwood`，现已移除（BASE-20）。**新建存档不会再产生**；但用户本地可能残留旧档 → 读取端仍须走"未知 id"分支，不崩、不丢弃。

---

## 4. L0.5 前置门禁 PF-01~PF-06（每个执行者动笔前必跑）

> **全部通过才可开工。任一失败 → 输出 `BLOCKED` + 原始输出，不要猜。**

```bash
# PF-01 工作树干净（并行写者互相覆盖的头号来源）
git status --porcelain && echo "---（上面若非空，先报告）" || echo "✅ 干净"

# PF-02 守卫 9/9
npm run guard            # 期望：全部守卫通过

# PF-03 测试 72/72
npm test                 # 期望：ℹ tests 72 / pass 72 / fail 0

# PF-04 ★换行污染探测（新）——autocrlf 陷阱，见 §16 修正 6
# 只扫 sync 的两个源目录：它们的内容被 guard 第 7 项做原始字节比对。
# client/** 下已存在大量 CRLF 文件（实测 20+），但从不参与字节比对，扫了只会永远假红。
git ls-files "packages/game-core/src/*.ts" "packages/contracts/src/*.ts" \
  | xargs -I{} sh -c 'file "{}" | grep -q CRLF && echo "❌ CRLF: {}"'
# 期望：无输出（2026-10-26 实测：0 个）

# PF-05 生成物未过期
grep -q "b249f288e985da48" client/assets/scripts/generated/game-core/generated/config-types.ts \
  && echo "✅ CONFIG_VERSION 一致" || echo "❌ 先跑 npm run gen"

# PF-06 旧哈希现状（应恰好 2 处，除非你在做 C-01）
grep -rn "16921d30a67a934f" client/assets/scripts | wc -l   # 期望 2
```

**PF-01 备注**：`packages/game-core/src/hook/index.ts` 在部分机器上会因 `core.autocrlf=true` 显示为 ` M` 但 `git diff` 为空（BASE-16）。判定用 `git diff --quiet -- <file>`，退出 0 即视为干净。

---

## 5. 通用铁律（编号引用，勿改语义）

| 编号 | 规则 | 违反后果 |
|---|---|---|
| G-01 | 只改任务卡「允许修改」列的路径 | 所有权冲突，主控回滚 |
| G-02 | 禁改 `packages/contracts/**`、`**/generated/**`、`server/**`、`game-data/source/**`、`server/db/migrations/**` | 契约/数值失守 |
| G-03 | 禁编数值。缺数字段**不显示**（`items.weight` 0/106 填充） | 视为伪造交付 |
| G-04 | 改过 `packages/**` 必跑 `npm run sync` | 守卫第 7 项红 |
| G-05 | 类型检查用 `npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit`，**禁裸 `npx tsc`**（拉同名假包、退出码 0 但未检查） | 假绿 |
| G-06 | 禁止 `git commit` / `git push` | 历史被覆盖 |
| G-07 | 同卡连续 2 次验收失败 → 停手输出 `BLOCKED` | 隐性烧钱 |
| G-08 | 不得新增 `*_v2` / `*_backup` / `*_old` / `*副本*` 文件 | 污染仓库（守卫第 1 项会拦） |
| G-09 | `features/**/model` 禁 `import ... from 'cc'`（仅 `view` 可以） | 破坏可测性（守卫第 3 项会拦） |
| G-10 | 幂等：重跑前先跑前置探测，已满足 → `SKIP(已满足)` | 重复代码 |
| G-11 | 不改 `docs/04_planning/plan-v001/**`、`plan-v002/**`、`docs/05_execution/tasks/**`、`structure-verification.md` 的历史快照段 | 计划被篡改 |
| G-12 | 上报只给结论与证据，不写推理散文 | 主控无法快速判定 |
| **G-13** | **`tsc` 判定必须排除引擎路径**：`grep -v "^C:/"`（引擎 `.d.ts` 以绝对路径报出）。**禁用** `grep -E "E:/Demo/WDF/"`——项目文件是相对路径，会被整段吞掉 | 假 PASS（项目错误全部漏检，见 BASE-34） |
| **G-14** | **改完 `git checkout --` 后必跑 PF-04**（autocrlf 会把文件还原成 CRLF） | 守卫假红 |
| **G-15** | **同一张表只经 `services/config` 读**（C-02） | 多份缓存漂移 |
| **G-16** | **单文件测试必须带 `--import ./tools/runtime/register.mjs`**：裸 `node --test <file>` 会因 `ERR_UNSUPPORTED_DIR_IMPORT` 必失败（`.ts` 用无扩展名目录导入，需自定义 loader） | 必然假 FAIL |

### 5.1 类型检查的正确判定式（G-13 落地）

```bash
# 正解：排除引擎路径（Cocos 的 .d.ts 在 C:/ 下，路径以绝对形式报出）
npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 \
  | grep "error TS" \
  | grep -v "^C:/"
```

输出为空 = 项目源码零类型错误；非空即为**真错误**（当前基线见 BASE-34，共 7 个，尚未修）。

> **⚠ 本节的旧写法是坏的，已作废**：`| grep -E "E:/Demo/WDF/"` 只匹配**绝对**路径，
> 而 tsc 对 tsconfig include 进来的文件报的是**相对**路径（`client/assets/scripts/...`），
> 于是项目自己的错误全部被静默吞掉。C-01~C-07 的「✅ 零类型错误」断言建立在此错误之上，
> **均不成立**——真值见 BASE-34。这是本轮最严重的验证基础设施缺陷。
>
> 引擎侧恒定报错（`target: ES2015` 的 lib 太老）：`jsb.d.ts` 与 `cc.d.ts` 合计约百条，全在
> `C:/ProgramData/cocos/editors/Creator/3.8.8/...`，属引擎问题，不要试图修。

---

## 6. L1 批次与 DAG

### 6.1 DAG

```
W1 (≤3 写者)
 ├─ 助手 A:  C-01 (3002) ──→ C-02 (3100)
 ├─ 助手 B:  C-03 (3201)    C-04 (3202)    C-05 (3302)     ← 三者互相独立
 └─ 助手 C:  C-06 (3301，已重定范围)                            ← 建议最先跑（解除 autocrlf 陷阱）

W2 (≤2 写者)
 ├─ 助手 A:  C-07 (3102)   ← 需 C-02, C-04
 │            C-08 (3104)   ← 需 C-01
 └─ 核心:    C-09 (3105)   ← 需 C-01

W3 (1 写者)
 └─ 助手 A:  C-10 (3103)   ← 需 C-03, C-02

W4 (1 写者，收口)
 └─ 助手 C:  C-11 (3401)   ← 需全部 PASS
```

### 6.2 批次表

| 批次 | 内容 | 并发写者 | 批末动作 |
|---|---|---|---|
| W1 | C-06 先行 → 然后 C-01/02/03/04/05 并行 | 3 | `npm run guard && npm test` |
| W2 | C-07, C-08, C-09 | 2 | 同上 |
| W3 | C-10 | 1 | 同上 |
| W4 | C-11 | 1 | 同上 + 主控提交 |

### 6.3 已完成的（不在 DAG 内，仅供依赖引用）

| 卡 | 状态 | 产物 |
|---|---|---|
| TASK-3001 UX 态契约 | ✅ | `generated/contracts/common/ux.ts`（14 码映射） |
| TASK-3101 主界面 Tab + 面板接缝 | ✅ | `app/{panel-types,nav,panel-ui,MainView}.ts` + 5 个面板桩 |

---

## 7. 所有权矩阵（排他文件锁，同一时刻只允许一个写者）

| 路径 | 所有者 | 批次 |
|---|---|---|
| `tools/lib/sync-targets.mjs`、`tools/sync/to-client.mjs`、`tools/guard/**`、`.gitattributes` | 助手 C | W1 |
| `packages/game-core/src/crafting/index.ts` | 助手 B（C-03） | W1 |
| `packages/game-core/src/inventory/index.ts` | 助手 B（C-04） | W1 |
| `tests/determinism/crafting.test.mjs` | 助手 B（C-03）独占新建 | W1 |
| `tests/determinism/inventory.test.mjs` | 助手 B（C-04）独占新建 | W1 |
| `tests/determinism/save-seal.test.mjs` | 助手 B（C-05）独占新建 | W1 |
| `client/assets/scripts/services/net/RpcClient.ts` | 助手 A（C-01） | W1 |
| `client/assets/scripts/services/save/LocalSave.ts` | 助手 A（C-01） | W1 |
| `client/assets/scripts/services/config/**` | 助手 A（C-02） | W1 |
| `client/assets/scripts/features/inventory/**` | 助手 A（C-07） | W2 |
| `client/assets/scripts/features/leaderboard/**` | 助手 A（C-08） | W2 |
| `client/assets/scripts/features/crafting/**` | 助手 A（C-10） | W3 |
| `client/assets/scripts/features/settings/**` | 核心（C-09） | W2 |
| `client/assets/scripts/app/**` | 核心（已完；助手**只读**） | — |
| `docs/04_planning/**`、`docs/05_execution/task-index.md` | 助手 C（C-11）独占 | W4 |
| `packages/contracts/**`、`**/generated/**`、`server/**`、`game-data/**` | **全员禁写** | — |

**不相交性证明**：同一批次内任意两张卡的「允许修改」集合交集为空（上表按批次分组后可逐对核对）；跨批次串行，无并发。

---

## 8. L2 任务卡 → L3 原子步骤 → L4 验证断言

### 每个 L3 步骤的固定结构

```
S-c.n  <动词短语>
  探测: <grep/ls 命令>          ← 命中 = 已做过 → SKIP
  动作: <单一文件的单一改动>
  确认: <即时后置检查>
```

---

### W1 · C-01 = TASK-3002 configVersion 单一来源（助手 A，0.3d）—— ✅ 已完成 2026-10-26

| 步骤 | 探测 | 动作 | 确认 |
|---|---|---|---|
| S-01.1 | `grep -n "export const CONFIG_VERSION" client/assets/scripts/generated/game-core/generated/config-types.ts` | 记录当前值（应为 `b249f288e985da48`，BASE-06） | 值已记入报告 |
| S-01.2 | `sed -n '9,11p' client/assets/scripts/services/net/RpcClient.ts` | 将 `:10` 的字面量 `export const CONFIG_VERSION = '16921d30a67a934f';` 替换为 `import { CONFIG_VERSION } from '../../generated/game-core/generated/config-types';` + 紧随 `export { CONFIG_VERSION };`（**导出名不变**，`invoke()` 内的 `cfg: CONFIG_VERSION` 无需改） | `grep -c "CONFIG_VERSION" RpcClient.ts` ≥ 2 |
| S-01.3 | `grep -n "configVersion" client/assets/scripts/services/save/LocalSave.ts` | `:48` → `configVersion: CONFIG_VERSION`，并在文件头加 `import { CONFIG_VERSION } from '../../generated/game-core/generated/config-types';` | 无字面量残留 |
| S-01.4 | — | 跑 V-01 全套 | 全部 PASS |

**禁止事项**：不得改 `CLIENT_VERSION`（另一回事）；不得改 `FORCE_OFFLINE`；**不得为 `generated` 建 fallback 字面量**（生成物缺失 → 先跑 `npm run gen`，这是 TASK-3002 的阻塞条件）。

**L4 断言**

| id | 命令 | 期望 |
|---|---|---|
| V-01.a | `grep -rn "16921d30a67a934f" client/assets/scripts` | **无输出**（exit 1） |
| V-01.b | §5.1 类型检查式 | ~~`✅ 项目源码零类型错误`~~ **该断言无效**：旧过滤器吞掉了项目错误，真值 7 个（BASE-34） |
| V-01.c | `node --import ./tools/runtime/register.mjs --test tests/e2e/skeleton.test.mjs` | `fail 0` |
| V-01.d | `npm run guard` | 9/9 通过 |

**E-01**：`docs/06_validation/evidence/EVD-3002/` — grep 输出 + tsc 过滤输出 + skeleton 测试结果
**回滚**：`git checkout -- client/assets/scripts/services/net/RpcClient.ts client/assets/scripts/services/save/LocalSave.ts`

---

### W1 · C-02 = TASK-3100 客户端配置读取服务（助手 A，0.5d，需 C-01）—— ✅ 已完成 2026-10-26

| 步骤 | 探测 | 动作 | 确认 |
|---|---|---|---|
| S-02.1 | `ls client/assets/scripts/services/config/tables.ts` | 新建 `tables.ts`：`TableName` 联合 + `TableRowMap`，行类型**import** 自 `generated/game-core/generated/config-types`（`ItemsRow` / `RecipesRow` / `PricesRow` / `LocksRow` / `ChestsRow`），**禁复制字段定义** | 文件存在 |
| S-02.2 | `grep -c "from 'cc'" client/assets/scripts/services/config/tables.ts` | 确保为 `0`（此文件要给 Node 测试用，G-09 的反向要求） | 0 |
| S-02.3 | — | `index.ts` 实现 `const cache = new Map<TableName, readonly Row[]>()` 与 `const inflight = new Map<TableName, Promise<Row[]>>()` | 编译通过 |
| S-02.4 | — | `table(name)`：命中 → 返回**行浅拷贝数组**（见下方设计要点）；未命中 → `[]` + `console.warn('[config] 未预加载: '+name)` | 逻辑就位 |
| S-02.5 | — | `preload(names)`：已在缓存 / 在途的**跳过**；其余 `Promise.all` 并行；单项失败记入 `failed` + warn，**不抛** | 逻辑就位 |
| S-02.6 | `cat client/assets/resources/config/_manifest.json` | `configVersion()` 读 `_manifest.json` 的 `configVersion`；读不到 → `throw new Error('配置缺少 _manifest.json，先跑 npm run gen')`（**禁回落字面量**） | 逻辑就位 |
| S-02.7 | — | `clearCache()`：清 `cache` + `inflight` | 逻辑就位 |
| S-02.8 | — | 把 loader 做成**可替换**（模块内 `let loadJson`，提供测试注入点）——Cocos 运行时下无法自动化，纯逻辑必须在 Node 下可测 | 可在 Node 测 |
| S-02.9 | — | 跑 V-02 全套 | 全部 PASS |

**⚠ 设计要点（否则 V-02.c 过不了）**：`table()` 若只返回 `[...arr]`，只防数组被 `splice`，**防不住 `arr[0].name='X'` 改行对象**。V-02.c 明确断言这一点，故必须返回行浅拷贝：`arr.map(r => ({ ...r }))`。

**L4 断言**

| id | 断言 | 判定方式 |
|---|---|---|
| V-02.a | `preload(['items','recipes'])` 后 `table('items').length===106`、`table('recipes').length===80` | stub loader 读真实 JSON |
| V-02.b | 并发两次 `preload(['items'])` → loader 实际调用 **=== 1** | loader 计数 |
| V-02.c | `table('items')[0].name='X'` 后再读 → 仍是原名 | 行浅拷贝 |
| V-02.d | `configVersion() === 'b249f288e985da48'`（与 BASE-06 一致；不一致必须报错不静默） | 断言相等 |
| V-02.e | `grep -c "from 'cc'" tables.ts` === 0；§5.1 类型检查通过；`npm run guard` 9/9 | 命令 |

**E-02**：`EVD-3100/` — loader 计数证据 + 上述断言输出
**回滚**：`git checkout -- client/assets/scripts/services/config/ && rm client/assets/scripts/services/config/tables.ts*`

---

### W1 · C-03 = TASK-3201 crafting 判定（助手 B，0.5d）—— ✅ 已完成 2026-10-26

> **裁决（消除卡片与派工的矛盾）**：TASK-3201 的「阻塞条件」写"若 `recipes.inputs` 的解析产物在 `config-types.ts` 中不是数组结构 → 停下登记 ADR-0010，不得在 game-core 里解析原始字符串"。实测 `RecipesRow.inputs: string`（BASE-18），字面上触发该条件。
> **但此条件应判定为不成立**：把字符串解析为结构化输入**本身就是纯规则**（无 IO、无随机、无时间），按 AGENTS.md 归属表"纯规则 → `packages/game-core/src/<module>/"，解析**必须**在 game-core 做；放到客户端 model 层则等于把规则下沉到表现层。故 C-03 正常执行，ADR-0010 / ADR-0011 仅作信息登记，**不需停手**。

| 步骤 | 探测 | 动作 | 确认 |
|---|---|---|---|
| S-03.1 | `wc -l < packages/game-core/src/crafting/index.ts` | 确认当前 3 行（BASE-09） | = 3 |
| S-03.2 | — | 定义 `export interface RecipeShape { id: string; out: string; outCount: number; inputs: { id: string; count: number }[]; rawInputs: string }`（`rawInputs` 保留原串便于排障） | 编译通过 |
| S-03.3 | — | `export type InventoryShape = Readonly<Record<string, number>>` | 编译通过 |
| S-03.4 | — | `export function parseInputs(raw: string): { inputs: RecipeShape['inputs']; invalid: string[] }`：按 `;` 切，每段 `id*count`（`*` 为**唯一**分隔）；空串 → `[]`；非法段（无 `*`、count 非正整数）**收集进 `invalid[]`，不抛** | 单测覆盖 |
| S-03.5 | — | `export function canCraft(recipe: RecipeShape, inv: InventoryShape): { ok: boolean; missing: { id: string; need: number; have: number }[] }`；`missing` 顺序 **=== inputs 顺序**（**禁排序**，否则不稳定） | 单测覆盖 |
| S-03.6 | — | `export function consume(recipe: RecipeShape, inv: InventoryShape): Record<string, number>`：返回**新对象**、不改入参、**不做 ok 校验**（调用方先 `canCraft`） | 单测覆盖 |
| S-03.7 | `ls tests/determinism/crafting.test.mjs` | 新建测试：单输入够 / 缺 1 / **3 输入**（真实存在 2 条）/ **4 输入**（真实存在 3 条）/ 非法串 / 空库存 / 不可变性 / 确定性深比较 | ≥ 8 用例 |
| S-03.8 | — | `npm run sync` + 跑 V-03 全套 | 全部 PASS |

**硬约束**：`packages/game-core` 内禁 `import 'cc'`、`Math.random`、`Date.now` / `new Date`、任何 IO、禁非相对导入、禁 `enum` / `namespace`（守卫第 2 项全查）。**保留现有 `export const MODULE_ID = 'crafting';`**。

**L4 断言**

| id | 命令 | 期望 |
|---|---|---|
| V-03.a | `node --import ./tools/runtime/register.mjs --test tests/determinism/crafting.test.mjs` | `tests ≥ 8`、`fail 0` |
| V-03.b | `grep -cE "Math.random\|Date.now\|new Date\|from 'cc'\|node:fs" packages/game-core/src/crafting/index.ts` | 0 |
| V-03.c | `npm run sync && npm run guard` | 9/9（`gameCorePurity` 绿） |

**E-03**：`EVD-3201/` — 测试结果 + guard 输出
**回滚**：`git checkout -- packages/game-core/src/crafting/index.ts && rm tests/determinism/crafting.test.mjs*`

---

### W1 · C-04 = TASK-3202 inventory 投影（助手 B，0.3d）—— ✅ 已完成 2026-10-26

> **签名澄清（配合 BASE-19）**：`section` = `save.modules.inventory`（**扁平 id→数量 map**）；`items` = **配置表**的 id→`ItemsRow` 索引（由 `table('items')` 构造）。v2 与 TASK-3102 文案里的 `modules.inventory.items` 是错的，以本行为准。

| 步骤 | 探测 | 动作 | 确认 |
|---|---|---|---|
| S-04.1 | `wc -l < packages/game-core/src/inventory/index.ts` | 确认当前 3 行（BASE-10） | = 3 |
| S-04.2 | — | `export interface ItemRow { id: string; name: string; category: ItemsRow['category']; basePrice: number; count: number }` | 编译通过 |
| S-04.3 | — | `export function listRows(section: unknown, items: Record<string, ItemsRow>): { known: ItemRow[]; unknownIds: string[] }` | 签名就位 |
| S-04.4 | — | 非法 `section`（`undefined` / `null` / 非对象 / 数组 / 字符串）→ `{ known: [], unknownIds: [] }`，**不抛** | 单测覆盖 |
| S-04.5 | — | 数量 `<= 0` 或非数字 → 跳过（不展示 0 个） | 单测覆盖 |
| S-04.6 | — | id 不在 `items` 里 → 进 `unknownIds`，**保持原顺序**，不崩 | 单测覆盖 |
| S-04.7 | — | 排序：`basePrice` **降序**，同价按 `id` **升序**（**确定性**，禁依赖对象键顺序） | 单测覆盖 |
| S-04.8 | — | **显式不读** `weight` / `capacity` / `stack` / `craftable` / `unlock_level`（全空，读 0 = 伪造数据） | grep 为 0 |
| S-04.9 | `ls tests/determinism/inventory.test.mjs` | 新建测试：3 已知 + 1 未知 / 空 section / 各型非法 section / 0 数量 / 顺序确定性 / 不改入参 / 不读 weight | ≥ 6 用例 |
| S-04.10 | — | `npm run sync` + 跑 V-04 全套 | 全部 PASS |

**硬约束**：同 C-03（保留 `MODULE_ID`，纯函数，无 IO / 随机 / 时间）。

**L4 断言**

| id | 命令 | 期望 |
|---|---|---|
| V-04.a | `node --import ./tools/runtime/register.mjs --test tests/determinism/inventory.test.mjs` | `tests ≥ 6`、`fail 0` |
| V-04.b | `grep -cE "weight\|capacity\|stack\|unlock_level" packages/game-core/src/inventory/index.ts` | 0 |
| V-04.c | `npm run sync && npm run guard` | 9/9 |

**E-04**：`EVD-3202/` — 测试结果 + grep 输出
**回滚**：`git checkout -- packages/game-core/src/inventory/index.ts && rm tests/determinism/inventory.test.mjs*`

---

### W1 · C-05 = TASK-3302 存档封印回归测试（助手 B，0.3d）—— ✅ 已完成 2026-10-26

| 步骤 | 探测 | 动作 | 确认 |
|---|---|---|---|
| S-05.1 | `grep -n "^export" packages/game-core/src/save/schema.ts` | 确认导出 `SAVE_SCHEMA_VERSION` / `SaveFile` / `computeChecksum` / `sealSave` / `verifySave` | 5 个 |
| S-05.2 | `ls tests/determinism/save-seal.test.mjs` | 新建文件，**文件头注释写明局限**（见下） | 存在 |
| S-05.3 | — | 用例 1：`sealSave(body)` → `JSON.parse(JSON.stringify(x))` 往返 → `verifySave === true` | 绿 |
| S-05.4 | — | 用例 2（反例）：`sealSave({...sealed})` → `verifySave === false`（证明不剥离旧 checksum 必坏） | 绿 |
| S-05.5 | — | 用例 3（正解）：解构剥离后 `sealSave(rest)` → `true` | 绿 |
| S-05.6 | — | 用例 4：改 `modules` 任一字段不重封印 → `false` | 绿 |
| S-05.7 | — | 用例 5：`checksum` 为非整数（字符串）→ `false` 且**不抛** | 绿 |
| S-05.8 | — | 现场突变验证（**验完必须复原**）：临时把 `computeChecksum` 改为忽略 body → 用例 4 必红 → `git checkout -- packages/game-core/src/save/schema.ts` → 跑 PF-04 | 已复原 |
| S-05.9 | — | 跑 V-05 全套 | 全部 PASS |

**文件头必须写的已知局限（原文可用）**：

> 本文件不覆盖 `LocalSave.save()` 本体：`getPlatform()` 为模块级单例且**无注入点**（`client/assets/scripts/platform/index.ts`，BASE-26），Node 下也无法 import `cc/env`。故本测试覆盖的是**同一条规则的纯函数层**（`game-core/save`），不是客户端接线。要覆盖接线需先给 platform 加注入点——属业务代码变更，未获授权。

**L4 断言**

| id | 命令 | 期望 |
|---|---|---|
| V-05.a | `node --import ./tools/runtime/register.mjs --test tests/determinism/save-seal.test.mjs` | `tests 5`、`fail 0` |
| V-05.b | S-05.8 突变验证后：`git diff --quiet -- packages/game-core/src/save/schema.ts` | 退出 0（已复原） |
| V-05.c | PF-04 换行探测 | 无输出 |
| V-05.d | `npm test` | `fail 0`，且 tests ≥ 77 |

**E-05**：`EVD-3302/` — 测试结果 + 突变验证红/绿前后输出
**回滚**：`rm tests/determinism/save-seal.test.mjs*`（本卡不碰源码）

---

### W1 · C-06 = TASK-3301 守卫同步校验（助手 C，0.5d）—— **范围已重定 · ✅ 已完成 2026-10-26**

> **执行结果**：S-06.1~06.7 全部完成，V-06.a~h 全部现场实跑通过。证据见 `docs/06_validation/evidence/EVD-3301/`。
> 改动：新增 `tools/lib/sync-targets.mjs`、`.gitattributes`；修改 `tools/sync/to-client.mjs`、`tools/guard/checks.mjs`。
> **V-06.c 的期望已被超越**：加 `.gitattributes` 后 `git checkout` 直接产出 LF，陷阱不再发生，该断言由"仍失败"转为"9/9 全绿"（见 V-06.c 行）。

> **⚠ 关键更正（v2 最大误判）**：v2 让 C-1 新增第 10 项 `sourceSync()`。实测 `checks.mjs` 的 `generatedUntouched()`（第 7 项）**已经**做了源↔生成物逐字比对：
>
> ```js
> // 源与副本是否一致（防止改了 packages 忘记 sync）
> for (const [src, name] of [...]) for (const f of walk(...)) {
>   ... bad.push(`未同步到客户端：${rel(f)}（npm run sync）`)
>   ... bad.push(`客户端副本过期：${rel(f)}（npm run sync）`)
> }
> ```
>
> **现场验证**：执行卡上写死的探针 `echo "// probe" >> packages/game-core/src/hook/index.ts` → 守卫红，输出 `客户端副本过期：packages/game-core/src/hook/index.ts（npm run sync）`。
>
> **→ 新增第 10 项 = 重复覆盖，无收益。C-06 改为修它真正的缺口（下面 2 项）。**

**C-06 的真实缺口（两项，均已实测复现）**

1. **无换行规范化**：TASK-3301 步骤 2 明确要求"规范化比较（统一换行、去尾随空白）"，但现有实现是**原始字节比较**。
2. **autocrlf 假红陷阱（新发现，最危险）**：本仓 `core.autocrlf=true` 且**无 `.gitattributes`**（BASE-16），而 `.editorconfig` 声明 `end_of_line=lf`。现场复现：
   ```
   echo "// probe" >> packages/game-core/src/hook/index.ts
   npm run guard            → ❌ 客户端副本过期（预期）
   git checkout -- packages/game-core/src/hook/index.ts
   git status --porcelain   → 空（看着干净！）
   npm run guard            → ❌ 客户端副本过期（假红！）
   ```
   根因：`git checkout` 按 autocrlf 把文件**还原成 CRLF**（5348 字节），而 `generated/` 副本是 LF（5274 字节，差 151 字节 = 换行差）。**守卫的"未手改"判据被换行差击穿。**
   这正是 v2 的 C-1.5 / V-C-1.d 让执行者跑 `git checkout --` 会**必然触发**的坑——v2 完全没提。
   现状实测：`packages/game-core/src` 下仅 1 个 CRLF 文件（即上述事故残留），`generated/` 下 0 个。已用 `sed -i 's/\r$//'` 修复（字节回到 5197，与 HEAD 一致）。

| 步骤 | 探测 | 动作 | 确认 |
|---|---|---|---|
| S-06.1 | `grep -n "targets\|'packages/game-core/src'" tools/sync/to-client.mjs tools/guard/checks.mjs` | 该映射字面量在**两处重复**（`to-client.mjs` 的 `const targets` + `checks.mjs` 的 for 数组）。新建 `tools/lib/sync-targets.mjs` 导出 `SYNC_TARGETS = [['packages/game-core/src','game-core'],['packages/contracts/src','contracts']]`（**只挪这个字面量**；`GEN_HEADER` 已在 `tools/lib/util.mjs` 共享，勿动） | 新文件存在 |
| S-06.2 | `grep -n "SYNC_TARGETS\|const targets" tools/sync/to-client.mjs` | `to-client.mjs` 改为 import `SYNC_TARGETS` | `npm run sync` 输出仍 `已同步 43 个文件` |
| S-06.3 | `grep -n "\[\['packages/game-core/src'" tools/guard/checks.mjs` | `checks.mjs` 的 `generatedUntouched()` 同样改 import | guard 9/9 |
| S-06.4 | `grep -n "slice(read(p(out)).indexOf" tools/guard/checks.mjs` | 把该行比对改为**规范化后比较**：新增 `const norm = (s) => s.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '');`，比较 `norm(read(out).slice(read(out).indexOf('\n') + 1)) === norm(read(f))` | 逻辑就位 |
| S-06.5 | — | **错误信息加固**：`客户端副本过期` 分支在"规范化后相等"时输出 `…（差异仅为换行；core.autocrlf=true 所致，跑 npm run sync 或统一为 LF）`，便于执行者定位 | 逻辑就位 |
| S-06.6 | `ls .gitattributes` | 新建 `.gitattributes`，**范围最小化**：仅 `packages/** text eol=lf`、`tools/** text eol=lf`、`server/** text eol=lf`。**刻意不写 `* text=auto eol=lf`**——见下方理由 | 文件存在 |
| S-06.7 | — | 跑 V-06 全套，含 autocrlf 复现探针 | 全部 PASS |

**⚠ S-06.6 为什么只覆盖代码目录（实测决定）**：全仓扫描出 **135 个既存 CRLF 文件**——120 个在 `client/assets`、
10 个在 `docs/08_knowledge`（含约定"保持原文"的 RAW 原始资料目录 `docs/08_knowledge/sources/`）、其余零散；
而 `packages/` 下 **0 个**。全仓 `eol=lf` 会为一个当前影响 0 个文件的问题扰动 135 个文件，并触碰 RAW 原始资料。

范围验证（`git check-attr -z eol`）：`packages/**`、`tools/**`、`server/**` 均为 `lf`；
`client/assets/scripts/app/MainView.ts` 与 `docs/08_knowledge/sources/README.md` 均为 `unspecified`（未触碰）。
属性覆盖 143 个文件，`git ls-files -c` 显示 **0 个既存文件需重规范化** → 无一次性 churn。

**连带改动**：`.gitattributes` 原本**不在 `rootWhitelist` 的根目录白名单里**（`checks.mjs` 的 `rootWhitelist()`），
新增会直接搞红守卫第 1 项，故已补入白名单。这一条不在 TASK-3301「允许修改」清单内，属超出授权的连带修改——
已就范围与主控确认后才执行。

**L4 断言**

| id | 命令 | 期望 |
|---|---|---|
| V-06.a | `npm run guard`（无改动基线） | **9/9 全绿**（**不是 10/10**——未新增检查项） |
| V-06.b | `echo "// probe" >> packages/game-core/src/hook/index.ts` 后 `npm run guard` | 失败，输出含 `npm run sync` |
| V-06.c | `git checkout -- packages/game-core/src/hook/index.ts` 后 `npm run guard` | **9/9 全绿**（加 `.gitattributes` 后 checkout 直接产出 LF，陷阱不再发生）。**改动前**此断言期望"仍失败并含换行提示"——`norm()` 的第二分支作为纵深防线保留，仍会在属性覆盖不到的场景报出专项提示 |
| V-06.d | `sed -i 's/\r$//' packages/game-core/src/hook/index.ts` 后 `npm run guard` | 9/9 全绿（规范化生效）。加 `.gitattributes` 后此步已非必要 |
| V-06.e | 手改生成物探针：`echo "// x" >> client/assets/scripts/generated/game-core/hook/index.ts` 后 guard | 仍失败（第 7 项哈希检查未退化） |
| V-06.f | 全量复原：复原两文件 → `npm run sync && npm run guard` | 9/9 全绿 |
| V-06.g | `npm run sync` 输出 | `已同步 43 个文件`（行为未变） |
| V-06.h | `npm test` | `fail 0`，tests ≥ 72 |

**E-06**：`EVD-3301/` — V-06.a~h 的原始输出（**尤其 V-06.c 的假红复现**，这是本卡最有价值的证据）
**回滚**：`git checkout -- tools/guard/checks.mjs tools/sync/to-client.mjs && rm tools/lib/sync-targets.mjs* .gitattributes*`

---

### W2 · C-07 = TASK-3102 背包列表页（助手 A，0.5d，需 C-02 + C-04）—— ✅ 已完成 2026-10-26

> **执行结果**：S-07.1~07.10 完成，V-07.a~d 全部现场实跑通过，V-07.e 记 `UNKNOWN(替代证据=录屏)`。证据见 `docs/06_validation/evidence/EVD-3102/`。
> 改动：`features/inventory/model/InventoryModel.ts`（纯投影）、`features/inventory/view/InventoryPanel.ts`（列表 ≤20 行 + 空态 + 加载失败态）。
> **两处偏差已登记**：①IO 留在 View、Model 收 `project(section, items)`（与 `HookView`/`HookModel` 同构，保住守卫第 63 行「model 不依赖 cc → 可单测」的本意）；②V-07.c 原命令 `\|` 是字面管道符，改为 `-E` + 剥离注释。
> **新增事实**：BASE-32（客户端 target ES2015，禁 `Promise.finally` 等 ES2018+ API）、BASE-33（两个 `.meta` 从未入库）。

| 步骤 | 探测 | 动作 | 确认 |
|---|---|---|---|
| S-07.1 | `grep -n "listRows" client/assets/scripts/generated/game-core/inventory/index.ts` | **前置门禁**：C-04 已交付 `listRows`（sync 后的生成物里可见） | 有导出 |
| S-07.2 | `grep -n "createInventoryPanel" client/assets/scripts/features/inventory/view/InventoryPanel.ts` | **前置门禁**：3101 桩存在 | 有导出 |
| S-07.3 | `sed -n '112,118p' client/assets/scripts/features/hook/model/HookModel.ts` | 确认存档段是**扁平 `modules.inventory`**（BASE-19），`listRows` 第一参直接传它 | 已确认 |
| S-07.4 | `wc -l < client/assets/scripts/features/inventory/model/InventoryModel.ts` | 实现 `load(): { known: ItemRow[]; unknownIds: string[] }`：`LocalSave.load()` → `modules.inventory` → `listRows(inv, idMap)`；`unknownIds` 只记 warn，**不显示、不崩** | 编译通过 |
| S-07.5 | — | id→`ItemsRow` 索引用 `table('items')` **一次构造**（G-15），**禁在 render 里调 `preload`**（P-08） | 逻辑就位 |
| S-07.6 | — | 覆写 `createInventoryPanel(parent)`：标题 + 列表（**最多 20 行**，超出显示"还有 N 项"）；每行 `名称 ×数量 \| 类别 \| 基准价` | 逻辑就位 |
| S-07.7 | — | 空态：`known.length===0` → "还没有捞到东西，去打捞吧" + 按钮 `navigate('hook')`（**用 §3.2 的 `navigate`，不要自造回调**） | 逻辑就位 |
| S-07.8 | — | **不显示重量/容量**（G-03） | grep 为 0 |
| S-07.9 | `wc -l < client/assets/scripts/features/telemetry/model/TelemetryModel.ts` | 埋点仍为桩（6 行）→ **跳过埋点**，在报告"跳过项"注明；**不得为埋点自建 API** | 已注明 |
| S-07.10 | — | 跑 V-07 全套 | 见下 |

**L4 断言**

| id | 命令 | 期望 |
|---|---|---|
| V-07.a | `node --import ./tools/runtime/register.mjs --test tests/determinism/inventory.test.mjs` | `fail 0`（C-04 用例不回归） |
| V-07.b | §5.1 类型检查（**新式** `grep -v "^C:/"`） | 不新增错误；基线 7 个（BASE-34）。~~`✅ 零类型错误`~~ 旧断言无效 |
| V-07.c | 剥离注释后 `grep -rE "weight\|capacity" features/inventory/`（**原式 `\|` 是字面管道符**，且会被文档注释假红） | 无输出 |
| V-07.d | `npm run guard` | 9/9 |
| V-07.e | **人工/录屏**：空存档 → 空态；写入 `item_0001×3, item_0002×1, bad_id×1` → 列表 2 行、日志 1 条 unknown、无崩溃 | 录屏路径落 EVD |

**状态说明**：UI 断言在 Cocos 运行时下无法自动化 → V-07.e 记 `UNKNOWN(替代证据=录屏)`，**不记 PASS**。
**E-07**：`EVD-3102/` — 类型检查 + grep + 录屏
**回滚**：`git checkout -- client/assets/scripts/features/inventory/`

---

### W2 · C-08 = TASK-3104 排行榜页（助手 A，0.5d，需 C-01）—— ✅ 已完成 2026-10-26

> **执行结果**：S-08.1~08.9 完成，V-08.a/c 全绿、V-08.b 未新增错误（基线 7）、V-08.d 记 `UNKNOWN`。证据见 `docs/06_validation/evidence/EVD-3104/`。
> 改动：`features/leaderboard/model/LeaderboardModel.ts`、`features/leaderboard/view/LeaderboardPanel.ts`。服务端零改动。
> **重要更正（本卡触发）**：执行中发现 §5.1 的 `grep -E "E:/Demo/WDF/"` 过滤器**只匹配绝对路径**，
> 而 tsc 对项目文件报**相对**路径 → **C-01~C-07 的「✅ 零类型错误」全部为假 PASS**。
> 真值 **7 个既存错误**（BASE-34）。§5.1 / G-13 / V-01.b / V-07.b / §12 prompt 已全部改正，
> 验收标准改为「不新增」。
> **附带发现**：`RpcClient.ts:99` 用 `ERR.SYSTEM`，但 `ERR` 里没有 SYSTEM → 网络不可达时 `RpcError.code === undefined`。
> 本卡在 `LeaderboardModel.fetch` 兜成 `ERR.INTERNAL`，根因留给 RpcClient（C-01 所有物）。

> **⚠ 字段名更正**：`QueryRes` 的字段是 **`items`**，不是 `rows`（BASE-21）。完整契约见 §3.5。

| 步骤 | 探测 | 动作 | 确认 |
|---|---|---|---|
| S-08.1 | `sed -n '1,30p' server/src/modules/leaderboard/service.ts` | **只读**核对：`CURRENT_SEASON='S1'`、名称兜底 `玩家<playerId 后4位>`、`flagged` 不入榜、province 返回空 `items` | 已核对 |
| S-08.2 | `grep -n "'leaderboard.query'" server/src/gateway/handlers.ts` | 确认**非 todo**（`:44` 已接 `leaderboardHandlers`） | 已接 |
| S-08.3 | — | `LeaderboardModel.fetch(scope='global')` → `invoke<QueryReq, QueryRes>('leaderboard.query', { scope, limit: 20 })`（**显式标注泛型**，避免 `unknown`） | 编译通过 |
| S-08.4 | — | 态映射：`c===0 && items.length>0` → `success`；`c===0 && items.length===0` → `empty`；否则 `toUxState(c)` | 逻辑就位 |
| S-08.5 | — | 渲染：名次 / 名称 / 收益（`value`）；`me` 行按 `playerId` 匹配高亮；空态"本季还没有人上榜，先去打捞" | 逻辑就位 |
| S-08.6 | — | `4001` → 提示"操作过于频繁" + 禁用刷新 3s（`toUxState(4001)` 给出 `retryable:true, next:'retry'`） | 逻辑就位 |
| S-08.7 | — | 刷新时**保留旧榜** + 顶部细进度条（`loading` 态不得清屏） | 逻辑就位 |
| S-08.8 | — | 埋点同 C-07：桩则跳过并登记 | 已注明 |
| S-08.9 | — | 跑 V-08 全套 | 见下 |

**L4 断言**

| id | 命令 | 期望 |
|---|---|---|
| V-08.a | `node --import ./tools/runtime/register.mjs --test tests/integration/leaderboard.test.mjs` | `fail 0`（5 用例，服务端不回归） |
| V-08.b | §5.1 类型检查 | 零项目错误 |
| V-08.c | `npm run guard` | 9/9 |
| V-08.d | **人工**：`npm run dev:server` + `leaderboard.report` 造 3 条 → 3 行降序；空库 → 空态；`me` 高亮；刷新不闪白 | 录屏落 EVD |

**状态说明**：服务端未起时 V-08.d 记 `UNKNOWN`（替代证据 = V-08.a 的内存 PGlite 集成测试），**不得记 PASS**。
**E-08**：`EVD-3104/`
**回滚**：`git checkout -- client/assets/scripts/features/leaderboard/`

---

### W2 · C-09 = TASK-3105 云存档分叉 UI（**核心执行**，opus，0.75d，需 C-01）—— ✅ 已完成 2026-10-26

> **执行结果**：S-09.1~09.10 完成。V-09.a~e 全绿（fork 5/5、skeleton 1/1、save-seal 6/6、类型检查未新增、guard 9/9），V-09.f 记 `UNKNOWN`。证据见 `docs/06_validation/evidence/EVD-3105/`。
> **S-09.2 阻塞点结论：不阻塞** —— `server/src/modules/save/service.ts:37-41` 的 `pull()` 返回
> `{ summary, snapshot: row.body }`，快照是完整存档体，可整档替换，无需本地拼档。
> 改动：新增 `features/settings/model/SaveSyncModel.ts`；覆写 `features/settings/view/SettingsPanel.ts`。服务端零改动。
> **登记的重构项**：`makeButton` 已在 3 个面板里复制，应下沉到 `app/panel-ui.ts`（`app/**` 归核心，本卡不回头改已交付的 C-07/C-08）。

| 步骤 | 探测 | 动作 | 确认 |
|---|---|---|---|
| S-09.1 | `cat packages/contracts/src/save/index.ts` | 只读核对 `SavePushRes` / `SavePullRes` / `ResolveForkReq` 字段 | 已核对 |
| S-09.2 | `grep -n "resolveFork\|snapshot" packages/contracts/src/save/index.ts` | **阻塞点核验**：`save.pull` 是否返回完整 `snapshot`？若无 → **停手登记缺陷**，不得本地"拼"存档 | 结论明确 |
| S-09.3 | `grep -n "createSettingsPanel" client/assets/scripts/features/settings/view/SettingsPanel.ts` | 桩存在（3101 交付） | 有导出 |
| S-09.4 | — | 新建 `features/settings/model/SaveSyncModel.ts`：`status()`（`save.pull` → `{localRevision, cloud}`）、`push()`、`resolve(keep)` | 编译通过 |
| S-09.5 | — | `push()`：`accepted:true` → `success`；`accepted:false` → `conflict`（携 `SaveSummary`）。**冲突判定只走 `conflictOf()`**（§3.4） | 逻辑就位 |
| S-09.6 | — | `resolve('cloud')` 成功后**整档替换**本地（不能只改 revision），随后 `verifySave` 必须通过 | 逻辑就位 |
| S-09.7 | — | **禁把 `3001 DUPLICATE_REQUEST` 当冲突**：它经 `toUxState` 得 `success`，直接刷新状态 | 逻辑就位 |
| S-09.8 | — | 覆写 `SettingsPanel` 云存档区：显示"本地 rev N / 云端 rev M"；冲突弹窗两按钮分别写明后果（"保留本地将覆盖云端" / "保留云端将丢弃本地进度"） | 逻辑就位 |
| S-09.9 | — | 写入一律走"剥离旧 checksum 再 seal"（§3.6 铁律） | 逻辑就位 |
| S-09.10 | — | 跑 V-09 全套 | 见下 |

**L4 断言**

| id | 命令 | 期望 |
|---|---|---|
| V-09.a | `node --import ./tools/runtime/register.mjs --test tests/integration/fork.test.mjs` | `fail 0`（5 用例） |
| V-09.b | `node --import ./tools/runtime/register.mjs --test tests/e2e/skeleton.test.mjs` | `fail 0` |
| V-09.c | `node --import ./tools/runtime/register.mjs --test tests/determinism/save-seal.test.mjs`（C-05 产物） | `fail 0` |
| V-09.d | §5.1 类型检查 | 零项目错误 |
| V-09.e | `npm run guard` | 9/9 |
| V-09.f | **人工**：制造分叉 → 冲突弹窗文案明确；选"保留本地" → 云端 rev = 本地+1；选"保留云端" → 本地整档覆盖且 `verifySave` 通过；同 `rid` 重发 → 不产生第二次冲突 | 录屏落 EVD |

**E-09**：`EVD-3105/` — 集成测试 + 录屏
**回滚**：`git checkout -- client/assets/scripts/features/settings/`

---

### W3 · C-10 = TASK-3103 合成面板（助手 A，1d，需 C-03 + C-02）—— ✅ 已完成 2026-10-26

> **执行结果**：S-10.1~10.10 完成。V-10.a 11/11、新增 `crafting-flow.test.mjs` **10/10**、
> V-10.b 4/4、V-10.c 未新增、V-10.d 9/9、V-10.e 零命中、全量 **107/107**；V-10.f 仅剩视觉部分记 `UNKNOWN`。
> 证据见 `docs/06_validation/evidence/EVD-3103/`。
> 改动：`CraftingModel.ts`、`CraftingPanel.ts`、新增 `tests/determinism/crafting-flow.test.mjs`。
> **核心语义（S-10.6/10.7）已自动化，不等录屏**：`CraftingModel` 零 cc 依赖，Node 直载可测
> （与 `tests/integration/hook-save.test.mjs` 同手法）。
> **任务卡前提更正**：TASK-3103 写"21 条设施/建筑类 invalid"，实测 **80/80 全部可解析、跳过 0 条**——
> 那 21 条是 UNKNOWN-TABLES 阶段根本没进表的配方。用例已把这条事实钉死。

| 步骤 | 探测 | 动作 | 确认 |
|---|---|---|---|
| S-10.1 | `grep -n "parseInputs\|canCraft\|consume" client/assets/scripts/generated/game-core/crafting/index.ts` | **前置门禁**：C-03 三函数已交付 | 三个都有 |
| S-10.2 | `grep -n "createCraftingPanel" client/assets/scripts/features/crafting/view/CraftingPanel.ts` | 3101 桩存在 | 有导出 |
| S-10.3 | — | `CraftingModel.recipes()`：`table('recipes')` → 映射 `RecipeShape`（`output→out`、`output_count→outCount`、`inputs` 交 `parseInputs`）；**`invalid` 非空的配方不展示**（TASK-3103 阻塞条件：21 条设施/建筑类已合规跳过），并在报告列出跳过条数 | 编译通过 |
| S-10.4 | — | `station` / `job` / `unlock_level` **暂不展示**（G-03） | grep 为 0 |
| S-10.5 | — | 分组：可制作 / 材料不足；不足项显示"缺 `名称` ×N"（名称查 `table('items')`） | 逻辑就位 |
| S-10.6 | — | `craft(recipeId)`：`canCraft` → `consume` → 写回 `modules.inventory`（**扁平 map**，§3.6）→ 剥离旧 checksum → `sealSave` → `LocalSave.save()` → `revision+1`；成功后 `refresh()` | 逻辑就位 |
| S-10.7 | — | 材料不足点制作 → **零副作用**（库存与 revision 均不变，不落盘） | 逻辑就位 |
| S-10.8 | — | 顶部固定一行："当前版本不校验等级与职业（数值未定）" | 文案就位 |
| S-10.9 | — | 埋点同 C-07 / C-08：桩则跳过并登记 | 已注明 |
| S-10.10 | — | 跑 V-10 全套 | 见下 |

**L4 断言**

| id | 命令 | 期望 |
|---|---|---|
| V-10.a | `node --import ./tools/runtime/register.mjs --test tests/determinism/crafting.test.mjs` | `fail 0`（C-03 用例不回归） |
| V-10.b | `node --import ./tools/runtime/register.mjs --test tests/integration/hook-save.test.mjs` | `fail 0`（存档封印未破坏） |
| V-10.c | §5.1 类型检查（**新式** `grep -v "^C:/"`） | 不新增错误；基线 7 个（BASE-34） |
| V-10.d | `npm run guard` | 9/9 |
| V-10.e | 剥离注释后扫 `features/crafting/**` 的 `weight\|capacity\|unlock_level\|\bjob\b\|station` | 代码零命中（**原式 `\|` 是字面管道符**，且直接 grep 会命中"不显示这些字段"的说明注释；另需 `\bjob\b`，否则局部变量 `job` 假红） |
| V-10.f | **人工**：库存给真实配方输入 → ≥1 条转"可制作"；制作后库存 −N、产物 +1、`revision+1`、`verifySave` 通过；材料不足点制作 → 库存与 revision 均不变 | 录屏落 EVD |

**E-10**：`EVD-3103/` — 测试结果 + 跳过的 `invalid` 配方清单 + 录屏
**回滚**：`git checkout -- client/assets/scripts/features/crafting/`

---

### W4 · C-11 = TASK-3401 文档/索引对齐（助手 C，0.2d，最后执行）—— ✅ 已完成 2026-10-26

> 只有在主控明确通知"其余卡全部 PASS"后才开工。

| 步骤 | 探测 | 动作 | 确认 |
|---|---|---|---|
| S-11.1 | `npm run guard` | 实跑并记录守卫项数（**9**，非 10） | 记录 |
| S-11.2 | `grep -c "^  '[a-z.]*': todo," server/src/gateway/handlers.ts` | 统计 todo handler。**⚠ 不要用 `grep -c todo`（得 10）**——它把 `const todo: Handler = ...` 定义行和注释行也算进去了。正确值 **8**，已实现 **12**（总 20） | 记录 8 / 12 |
| S-11.3 | `npm test` | 记录测试数（基线 72，本批新增后应 ≥ 91） | 记录 |
| S-11.4 | `grep -n "65 个测试\|9 项守卫" docs/04_planning/current-plan.md` | 用实测值替换过期数字（BASE-28），**每处标注"实测日期 2026-10-26"** | 数字对齐 |
| S-11.5 | `grep -n "13 张任务卡\|3001 已完成" docs/04_planning/current-plan.md` | 改为"13 卡中 2 卡完成（3001、3101），剩余 11" | 对齐 |
| S-11.6 | `grep -rn "守卫第 10 项\|10 项守卫\|sourceSync" docs/04_planning/*.md docs/05_execution/tasks/TASK-3301.md` | 按 C-06 结论更正：第 7 项已覆盖同步校验，本轮改为换行规范化 + `.gitattributes` | 对齐 |
| S-11.7 | `grep -n "status:" docs/05_execution/tasks/TASK-2101.md` | 修正状态为 `done`（已完成但漏改） | 已改 |
| S-11.8 | `grep -n "16921d30a67a934f\|65 个测试" docs/03_solution/**/*.md docs/06_validation/*.md 2>/dev/null` | 顺手排查其它文档里的过期哈希/数字（**只改本轮相关文件**，历史快照段禁改，G-11） | 已排查 |
| S-11.9 | `npm run gen:docs` | 重建索引 | 已生成 |
| S-11.10 | `grep -c "^| TASK-" docs/05_execution/task-index.md; ls docs/05_execution/tasks/*.md \| wc -l` | 条数 === 文件数 − 1（README） | 43 === 43 |
| S-11.11 | `grep -n "EXEC-BRIEF" docs/00_governance/document-index.md` | 若索引需登记，把本指令 v3 登记进去（v2 已废） | 已登记 |
| S-11.12 | — | 跑 V-11 全套 | 全部 PASS |

**L4 断言**

| id | 命令 | 期望 |
|---|---|---|
| V-11.a | `grep -c "^| TASK-" docs/05_execution/task-index.md` vs `ls docs/05_execution/tasks/*.md \| wc -l` − 1 | 相等（43 === 43） |
| V-11.b | `current-plan.md` 中每个数字都能被 S-11.1~3 的命令复现 | 逐处可复现 |
| V-11.c | `npm run verify` | 全绿（gen + guard + test） |
| V-11.d | `npm run guard` | `docsFrontMatter` 项绿（front matter 合法、ID 不重复） |

**E-11**：`EVD-3401/` — verify 输出 + 索引核对
**回滚**：`git checkout -- docs/04_planning/ docs/05_execution/task-index.md docs/05_execution/tasks/TASK-2101.md`

---

## 9. 并发、增量与性能规则

| 编号 | 规则 |
|---|---|
| P-01 | 同时最多 3 个写入者；§7 所有权矩阵已保证同批次路径不相交 |
| P-02 | 单卡只跑自己的测试文件（`node --import ./tools/runtime/register.mjs --test <file>`，见 G-16）；**批末**才跑 `npm test` 全量 |
| P-03 | `npm run guard` 只在"改了 packages 或 tools"后跑，不是每步都跑 |
| P-04 | `npm run sync` 只在改了 `packages/**` 后跑（G-04） |
| P-05 | 禁止 `npm ci` / `rm -rf node_modules`；依赖已装好 |
| P-06 | 长命令不要接管道（可能假死/吞退出码）；重定向到文件再读。**例外**：§5.1 的 tsc 判定必须用管道过滤 |
| P-07 | 同一张表只经 `services/config` 读（G-15），避免多份缓存漂移 |
| P-08 | 缓存策略：`preload` 只在页面 `onShow` 时调一次；**禁在 render 循环里调 `preload`** |
| P-09 | Tab 切换只改 `node.active`，**不销毁重建**（避免重复请求与丢状态） |
| P-10 | `tsc` 判定必须过滤引擎 `.d.ts`（G-13）；不要在 CI 里把它当硬门禁，否则会恒定红 |
| P-11 | `npx -p typescript@5.8 tsc` 每次会重新下载包（**本地无 typescript 依赖**，BASE-15）。一个会话内首次下载后走缓存；若网络不可用 → 记 `UNKNOWN` 并说明 |
| P-12 | 改完任何 `git checkout --` 后**必跑 PF-04** 换行探测（G-14） |
| P-13 | 单文件测试必须带 `--import ./tools/runtime/register.mjs`（G-16）；不要用 `npm test` 代替单文件（慢 20 倍且噪声多） |
| P-14 | 不要在 `packages/game-core` 里为了"省事"加缓存或全局状态——纯度守卫会拦，且会破坏可测性 |

---

## 10. 上报与判定协议

### 10.1 每卡上报模板（严格照抄，不得增删字段）

```text
卡号: C-0X / TASK-xxxx
状态: PASS | FAIL | UNKNOWN | BLOCKED
前置门禁: PF-01..06 全部通过 | 哪一项失败 + 原始输出
变更文件:
  - <路径>（新增|修改）
L4 断言结果:
  - V-0X.a PASS  <一行实际输出>
  - V-0X.b UNKNOWN <替代证据 + 原因>
未解决项: <无 | 具体到 文件:行 + 现象 + 已尝试>
跳过项: <无 | 具体到 S-c.n + 原因（如"telemetry 仍为桩"）>
已知偏差: <无 | 与任务卡的差异及裁决理由>
证据路径: docs/06_validation/evidence/EVD-xxxx/
回滚命令: <单条可复制命令>
```

### 10.2 判定规则

| 状态 | 条件 |
|---|---|
| PASS | 所有 L4 断言通过，且 `git status` 只含该卡允许范围内的文件 |
| FAIL | 任一断言失败（**必须附原始输出**，禁止只说"失败"） |
| UNKNOWN | 依赖外部环境（Cocos 运行时 / 服务端未起 / 网络）无法验证 → 必须写明"用什么替代证据"；人工项必须给录屏路径 |
| BLOCKED | 前置任务未交付，或触发卡内阻塞条件 |

**UNKNOWN 不是 PASS**：UI 与联网类断言未做人工验证时一律 UNKNOWN。本批 A 类卡的 UI 断言预计全是 UNKNOWN（Cocos 无 headless 自动化），这是**已知局限**，不是缺陷。

### 10.3 主控复核

- 主控只读 `git diff` + 断言输出，**不看执行者自述**；每个 PASS 独立复跑一次关键断言。
- 出现"PASS 但测试数下降" → 直接判 FAIL（回归被掩盖）。
- 出现"PASS 但 `tsc` 未过滤引擎错误就报零错误" → 直接判 FAIL（假绿）。
- 出现"PASS 但 `git status` 含卡外文件" → 直接判 FAIL（所有权冲突）。

---

## 11. 熔断与升级

| 触发 | 动作 |
|---|---|
| 同卡连续 2 次 FAIL | 停手 → 输出 BLOCKED → 主控重写卡或升级档位 |
| 任务卡与真实代码冲突 | 停手 → 在"已知偏差"写明冲突与你的判断 → **不得自行选择一边** |
| 需要改契约 / 错误码 / 迁移 | 停手 → 引用 ADR-0011 → 等裁决 |
| 需要新增依赖（含把 `typescript` 加为 devDependency） | 停手 → 报告，主控决定 |
| 估算工作量 > 卡片规模 2 倍 | 停手 → 请求拆分 |
| PF-01~06 任一失败 | 停手 → BLOCKED + 原始输出 |
| 发现 `packages/**` 出现 CRLF（PF-04 红） | 跑 `sed -i 's/\r$//' <file>` 修复 + 报 C-06，**不要自行提交** |
| 守卫从 9 项变成 10 项 | 停手 → 谁加的检查？C-06 之外的守卫改动需主控确认 |
| 发现 `tsc` 报告项目源码有错误但无法复现 | 停手 → 附原始输出，可能是执行环境差异 |
| 前端 `features/**` 出现 `wx.` / `tt.` | 立即回滚该步（AGENTS.md 硬禁止） |

---

## 12. 可直接复制的三段 prompt

### 12.1 助手 A（客户端）

```text
你是 WDF 客户端执行者。仓库根 E:/Demo/WDF。
先读 docs/05_execution/ASSISTANT-BRIEF.md 的 §2（全部）、§3、§4（PF-01~06）、§5、§7、§8 的 C-01/C-02/C-07/C-08/C-10、§9~§11。

顺序：先跑 §4 前置门禁（6 项全过才动笔）→ C-01 → C-02 →（等主控放行 W2）C-07、C-08 →（等主控放行 W3）C-10。

必须记住的 5 条现场事实（不要再去猜）：
1. 存档段是扁平的：save.modules.inventory = { item_0001: 3 }，没有 .items 一层。读错会永远空背包。
2. leaderboard.query 返回 QueryRes.items（不是 rows），另有 me / next / snapshotAt。
3. 空背包"去打捞"按钮直接 import { navigate } from '../../../app/nav' 调 navigate('hook')，不要自造回调参数。
4. 类型检查**必须排除引擎路径**（引擎 .d.ts 以绝对路径报出，项目文件是相对路径）：
   npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 | grep "error TS" | grep -v "^C:/"
   输出应为空。⚠ 不要用 `grep -E "E:/Demo/WDF/"`——那只会匹配绝对路径，项目错误会被整段吞掉（C-01~C-07 因此误报"零错误"，真值见 BASE-34）。当前既存 7 个真错误，你的验收标准是**不新增**。
5. MainView.ts、app/**、generated/**、packages/**、server/** 一律只读。features/telemetry 仍是桩，埋点全部跳过并在"跳过项"登记，不得自建 API。

UI 断言在 Cocos 下无法自动化 → 一律记 UNKNOWN(替代证据=录屏路径)，不要写 PASS。
每张卡按 §10.1 模板上报，一次只报一张。禁 git commit。改完任何 git checkout 后必跑 PF-04。
```

### 12.2 助手 B（纯规则 + 单测）

```text
你是 WDF 纯规则执行者。仓库根 E:/Demo/WDF。只写 packages/game-core 纯函数与 node 测试，不碰 UI / 服务端 / 工具链。
先读 docs/05_execution/ASSISTANT-BRIEF.md 的 §2、§3.6、§4（PF-01~06）、§5、§7、§8 的 C-03/C-04/C-05、§9~§11。

顺序：跑前置门禁 → C-03、C-04、C-05（三者独立，任意顺序）。

关键事实（已实测，勿猜）：
- recipes.inputs 是字符串 "item_0001*1;item_0002*2"；80 行分布 单31/双44/三2/四3。
- TASK-3201 的阻塞条件字面上被触发（inputs 不是数组），但裁决为不成立：解析字符串就是纯规则，按 AGENTS.md 必须在 game-core 做。见 §8 C-03 开头的裁决说明。不需要停手。
- ItemsRow.category 是 10 值字面量联合；name 与 base_price 必填；weight/capacity/stack/craftable/unlock_level 全为可选且实际全空 → 一个都不许读。
- 存档段是扁平的 save.modules.inventory = { [itemId]: count }（没有 .items）。listRows(section, items) 中 section 就是它，items 是配置表的 id→ItemsRow 索引。
- game-core/src/index.ts 必须导出每个模块目录（守卫 catalogConsistency 会查）；改动后保留各模块的 MODULE_ID 导出。
- 纯函数硬约束：禁 import 'cc'、禁 Math.random、禁 Date.now / new Date、禁 node:fs 等 IO、禁非相对导入、禁 enum/namespace。

改完 packages/** 必跑：npm run sync && npm run guard。基线 72 用例，你应新增 ≥19（C-03≥8 / C-04≥6 / C-05=5）。
每张卡按 §10.1 模板上报，一次只报一张。禁 git commit。改完任何 git checkout 后必跑 PF-04。
```

### 12.3 助手 C（闸门 + 文档）

```text
你是 WDF 工程闸门维护者。仓库根 E:/Demo/WDF。只改 tools/**、.gitattributes 与（最后）计划文档。
先读 docs/05_execution/ASSISTANT-BRIEF.md 的 §2、§4（PF-01~06）、§5、§7、§8 的 C-06/C-11、§9~§11。

最重要的一条：C-06 的范围已重定。守卫第 7 项 generatedUntouched() 已经做了源↔生成物逐字比对
（现场探针 echo "// probe" >> packages/game-core/src/hook/index.ts 已确认会红并提示 npm run sync）。
所以不要再新增第 10 项 sourceSync() —— 那是重复覆盖，零收益。
基线是 9 项守卫（不是 10 项）。

C-06 真正要修两件事：
  (1) 现有比对是原始字节比较，没做换行规范化（TASK-3301 步骤 2 明确要求过）；
  (2) 本仓 core.autocrlf=true 且没有 .gitattributes，git checkout 会把源文件还原成 CRLF，
      而 generated/ 副本是 LF → 守卫假红，但 git status 看起来是干净的。
      这条 v2 完全没提，而 v2 的 C-1.5 恰恰让人去跑 git checkout，必然踩中。
      按 §8 C-06 的 S-06.1~S-06.7 做，含新建 .gitattributes（* text=auto eol=lf）。
      注意：加 .gitattributes 后全仓已存在的 CRLF 文件会被 git 标为 modified，
      这是预期的一次性重规范化 —— 列出受影响文件数与前 10 条路径报给主控，不要自己提交。

C-11 的 handler 统计不要用 grep -c todo（得 10，错了）——它把 const todo 定义行和注释行也算进去；
正确是 8 个 todo / 12 个已实现（总 20），命令见 S-11.2。
C-11 只在主控明确通知"其余卡全部 PASS"后才开工。
每张卡按 §10.1 模板上报。禁 git commit。
```

---

## 13. 本指令自身的事实校验（可复跑，2026-10-26 实测）

| # | 断言 | 校验命令 | 实测 |
|---|---|---|---|
| 1 | 守卫 9 项全绿 | `npm run guard` | ✅ 9/9 |
| 2 | 测试 72/72 | `npm test` | ✅ pass 72 / fail 0 |
| 3 | recipes 80 行 | `node -e "console.log(require('./client/assets/resources/config/recipes.json').length)"` | `80` |
| 4 | items 106 行 | 同上换文件名 | `106` |
| 5 | manifest 46 表 | `node -e "console.log(require('./client/assets/resources/config/_manifest.json').tables.length)"` | `46` |
| 6 | 生成物版本 | `grep -n "CONFIG_VERSION" client/assets/scripts/generated/game-core/generated/config-types.ts` | `3: ... 'b249f288e985da48'` |
| 7 | 旧哈希 2 处 | `grep -rn "16921d30a67a934f" client/assets/scripts` | `RpcClient.ts:10`、`LocalSave.ts:48` |
| 8 | config 服务空壳 | `wc -l < client/assets/scripts/services/config/index.ts` | `2` |
| 9 | crafting 核心空壳 | `wc -l < packages/game-core/src/crafting/index.ts` | `3` |
| 10 | inventory 核心空壳 | `wc -l < packages/game-core/src/inventory/index.ts` | `3` |
| 11 | 面板桩 5 个已存在 | `ls client/assets/scripts/features/*/view/*Panel.ts` | 5 个（含 Hook / Settings） |
| 12 | panel-types 31 行 | `wc -l < client/assets/scripts/app/panel-types.ts` | `31` |
| 13 | nav.navigate 存在 | `grep -n "export function navigate" client/assets/scripts/app/nav.ts` | 有 |
| 14 | recipes.inputs 是 string | `grep -A8 "interface RecipesRow" .../config-types.ts` | `inputs: string;` |
| 15 | 存档段扁平 | `sed -n '112,118p' .../HookModel.ts` | `modules.inventory = inv`（无 `.items`） |
| 16 | QueryRes 用 items | `grep -n "items" packages/contracts/src/leaderboard/index.ts` | `items: RankRow[]` |
| 17 | 同步校验已在第 7 项 | `grep -n "源与副本是否一致" tools/guard/checks.mjs` | 有 |
| 18 | autocrlf 陷阱**已关闭**（修复前可复现） | 见 V-06.c；`git checkout -- packages/game-core/src/hook/index.ts && file <该文件>` | ✅ checkout 后为 LF，守卫 9/9 全绿（修复前为 CRLF + 假红） |
| 19 | tsc 恒报 21 个引擎错误 | §5.1 命令去掉过滤 | 21 个，全在 `C:/ProgramData/cocos/...` |
| 20 | telemetry 仍为桩 | `find client/assets/scripts/features/telemetry -name '*.ts' \| xargs wc -l` | 18 行 |
| 21 | ADR-0011 存在 | `ls docs/03_solution/decisions/ADR-0011-contract-gaps.md` | 存在 |
| 22 | 任务卡 44 文件 / 索引 43 行 | `ls docs/05_execution/tasks/*.md \| wc -l; grep -c "^| TASK-" docs/05_execution/task-index.md` | `44` / `43` |
| 23 | handler 8 todo / 12 实现 | `grep -c "^  '[a-z.]*': todo," server/src/gateway/handlers.ts` | `8` |
| 24 | 当前计划数字过期 | `grep -n "65 个测试" docs/04_planning/current-plan.md` | 有（实为 72） |
| 25 | 剩余卡 11 张 | BASE-11(44) − 1(README) − BASE-12(2 done) | `11` |
| 26 | 无本地 typescript 依赖 | `ls node_modules/typescript/package.json` | 不存在（故 npx 每次下载） |
| 27 | `.gitattributes` 已存在且范围最小化 | `git check-attr -z eol -- packages/game-core/src/hook/index.ts tools/guard/checks.mjs server/src/core/db.ts client/assets/scripts/app/MainView.ts docs/08_knowledge/sources/README.md` | 前三者 `lf`；后两者 `unspecified` |
| 28 | sync 源目录零 CRLF | `git ls-files "packages/game-core/src/*.ts" "packages/contracts/src/*.ts" \| xargs -I{} sh -c 'file "{}"\|grep -q CRLF\&\&echo {}'` | 无输出（0 个） |
| 29 | §0 的六个数量与正文一致 | `f=docs/05_execution/ASSISTANT-BRIEF.md; echo BASE $(grep -cE '^\| BASE-[0-9]+' $f); echo PF $(grep -oE 'PF-0[1-6]' $f \| sort -u \| wc -l); echo STEPS $(grep -cE '^\| S-[0-9]{2}\.[0-9]+' $f); echo ASSERTS $(grep -cE '^\| V-[0-9]{2}\.[a-z]' $f); echo EVID $(grep -cE '^\*\*E-[0-9]{2}\*\*：' $f); echo WAVES $(grep -oE '\bW[1-4]\b' $f \| sort -u \| wc -l); echo CARDS $(grep -oE 'C-0[1-9]\|C-1[01]' $f \| sort -u \| wc -l)` | `BASE 31 / PF 6 / STEPS 98 / ASSERTS 52 / EVID 11 / WAVES 4 / CARDS 11` |

---

## 14. 本指令的已知局限（不掩盖）

1. **Cocos 运行时行为无法在 Node 下验证**：`resources.load` 实际返回、渲染帧率、布局溢出、手势。→ A 类卡的 UI 断言一律 UNKNOWN + 录屏；纯逻辑必须下沉到 game-core 或可注入 loader 的 service 层。
2. **`getPlatform()` 无注入点**（BASE-26）：`LocalSave` 接线不可自动化测试。C-05 覆盖的是同规则的纯函数层。要覆盖接线需先给 platform 加注入点——属业务代码变更，未获授权。
3. **`tsc` 无法作为硬门禁**：引擎 `.d.ts` 恒报 21 个错误（非本项目缺陷）。必须用 §5.1 的过滤式；若要把 `tsc` 变绿，需给 `client/tsconfig.json` 加 `skipLibCheck` / 排除引擎声明——那会改 Cocos 生成的 tsconfig，需主控授权。
4. **服务端相关断言需起本地服务**：`npm run dev:server`（5050）。未起时只能用内存 PGlite 的集成测试替代，状态记 UNKNOWN。
5. **本指令不覆盖 TASK-3001 与 TASK-3101 的实现**（均已完成），只锁定它们已交付的对外形状（§3.1、§3.2、§3.4、§3.5）。
6. ~~**`.gitattributes` 引入的一次性重规范化**会污染 `git status`（大量 CRLF 文件标 modified）。这是 S-06.6 的已知副作用，须由主控裁决是单独提交还是回退。~~ **（已关闭 2026-10-26：主控选"只覆盖代码目录"，`.gitattributes` 仅含 `packages/**`、`tools/**`、`server/**`，覆盖 143 文件但 `git ls-files -c` 显示 0 个既存文件需重规范化 → churn 为 0。）**
7. ~~**换行问题的根治属工具链决策**：S-06.6 是建议方案。若主控倾向"保持现状 + 只靠 S-06.4 规范化比较"，删除 S-06.6 即可，其余步骤不受影响。~~ **（已决 2026-10-26：采用"只覆盖代码目录"方案并落地。两层防护并存——`.gitattributes eol=lf` 是主防线，`norm()` 规范化比对 + 换行专项报错是属性覆盖不到时的纵深防线。）**
8. **`npx -p typescript@5.8 tsc` 依赖网络**：本地无 typescript 依赖，每次冷启动都要下载。离线环境下类型检查只能记 UNKNOWN。
9. ~~**卡片自身的文档债**：TASK-3102 / TASK-3202 的正文也写了 `modules.inventory.items`（同 v2 的错），C-11 应顺手更正——但那是 `docs/05_execution/tasks/**`，需主控确认是否在 G-11 范围内放行。~~ **（已澄清：2026-10-26 主控在 G-11 放行范围内更正 TASK-3102/3103/3202/3104 正文——存档结构改为扁平 `modules.inventory`、榜单判空改为 `QueryRes.items`，与 BASE-19/BASE-21 对齐。）**

---

## 15. 扩展点（怎么给本指令加东西）

| 想加什么 | 怎么做 |
|---|---|
| 新任务卡 | ① 在 `docs/05_execution/tasks/` 建 `TASK-3xxx.md`（照 `task-template.md`）；② 在 §8 末尾追加 `C-1X` 段，套 L3 / L4 / L5 结构；③ 在 §6.1 DAG 插入并说明依赖；④ 在 §7 所有权矩阵加行，**确认同批次不相交**；⑤ 在 §2 补必要的新 BASE 条目 |
| 新守卫检查项 | ① `tools/guard/checks.mjs` 加函数（返回问题数组）；② `run-all.mjs` 的 `names` 加 label；③ §2 的 BASE-01 数字 +1；④ §11 熔断表已有"守卫从 9 项变 10 项"的停手规则 |
| 新配置表 | ① `game-data/source/<t>.csv`；② `npm run gen`；③ 若需客户端消费，在 C-02 的 `TableName` 联合加一项（否则没人会消费它） |
| 新面板 | ① `features/<m>/view/<X>Panel.ts` 导出 `createXxxPanel`；② 若需进主 Tab，改 `PanelKey` 联合 → **必须走 ADR-0011 裁决**（契约面） |
| 新错误码 | 先改 `DESIGN-0001` §2，否则 `ux.ts` 的 `satisfies Record<keyof typeof ERR, ...>` 会编译失败（这是设计内的护栏） |
| 工具链/环境问题 | 记入三处，缺一处就会有人再踩：① `BASE-nn`（事实）；② `PF-0x`（门禁）；③ §11（熔断规则） |
| 新增执行者角色 | 在 §1 加行 + §7 所有权矩阵加列 + §12 加一段 prompt |

---

## 16. v2 → v3 修正清单（可核查）

| # | v2 原文 | 实测真相 | v3 处理 |
|---|---|---|---|
| 1 | §9 断言 7："面板桩尚不存在（3101 未落地）" | 5 个面板桩 + `panel-types.ts` + `nav.ts` + `MainView.ts` **全部已存在**，TASK-3101 `status: done` | 3101 移出剩余任务（BASE-12/13、§1、§6.3） |
| 2 | §3.4：`modules.inventory.items = {[id]:number}` | **扁平** `modules.inventory = {[id]:number}`，无 `.items`（HookModel:114-117） | §3.6 更正；C-04 / C-07 / C-10 均引用 BASE-19 |
| 3 | A-5.3：`rows.length` 判空 | 契约字段是 **`items`**（BASE-21） | §3.5 补契约全文；C-08 全程用 `items` |
| 4 | 全卡断言"tsc 无错" | 恒定 **21 个引擎 `.d.ts` 错误**，项目源码 0 个 | 新增 G-13 + §5.1 过滤式；所有卡改用 |
| 5 | C-1：新增第 10 项 `sourceSync()` | 第 7 项 `generatedUntouched()` **已实现**同功能（现场探针确认会红）；真实缺口是**无换行规范化** | C-06 重定范围；断言从"10/10"改为"9/9 + 规范化生效" |
| 6 | 未提换行问题，却让执行者跑 `git checkout --`（C-1.5 / V-C-1.d） | autocrlf=true + 无 `.gitattributes` → checkout 还原 CRLF → **守卫假红且 `git status` 干净**（已复现） | 新增 BASE-16、PF-04、G-14、P-12、C-06 主任务、S-06.6、§14 局限 6/7 |
| 7 | A-3.5：空态跳转"通过 PanelHandle 之外的回调参数实现" | 已由 `app/nav.ts` 的 `navigate()` 解决 | §3.2 直接给用法；C-07 S-07.7 用 `navigate('hook')` |
| 8 | C-2.2："统计非 todo 的动作数" | `grep -c todo` = 10（含定义行 + 注释行），真实 **8 todo / 12 实现 / 20 总** | S-11.2 给精确命令与正确值；BASE-14 |
| 9 | TASK-3201 阻塞条件 vs B-1 的 `parseInputs` 矛盾 | `RecipesRow.inputs: string`，字面触发阻塞；但解析属纯规则，按 AGENTS.md 归 game-core | C-03 开头给出书面裁决，不 stonewall |
| 10 | 未提基线数字过期 | `current-plan.md` 写"65 个测试"（实 72）、"13 卡中 3001 完成"（实 2 卡完成） | BASE-28 + S-11.4 / 11.5 / 11.6 |
| 11 | A-1.2 行号"约第 9-10 行" | 精确 `RpcClient.ts:10`、`LocalSave.ts:48` | S-01.2 / S-01.3 给精确行号 |
| 12 | §5 P-05 只说禁管道 | `tsc` 判定**必须**用管道过滤才能正确 | §5.1 给完整命令；P-06 补例外；P-11 说明 `npx -p` 每次下载 |
| 13 | §4.2 A-2.4："`table(name)` 命中返回**浅拷贝数组**" | 浅拷贝数组防不住 `arr[0].name='X'` 改行对象，与自己的 V-A-2.c 自相矛盾 | S-02.4 + 设计要点改为**行浅拷贝** |
| 14 | C-1.1 前提："`tools/sync/to-client.mjs` 顶层会执行写文件，禁止直接 import" | 正确，但**`GEN_HEADER` 已在 `tools/lib/util.mjs` 共享**，不需再抽 | S-06.1 只挪 `targets` 字面量，明确"勿动 GEN_HEADER" |
| 15 | §3.4："已知脏数据 driftwood → 读取时必须走未知 id 分支" | `driftwood` **已不再被写入**（3101 移除，仅注释残留） | §3.6 改为"仅限旧档"，避免误导执行者以为新档也会产生 |
| 16 | §1 分工表把 3101 列为"核心待办 0.8d" | 已完成 | §1 / §6.3 更正为"已完成，仅供依赖引用" |
| 17 | 全篇 11 条断言写裸 `node --test <file>`，P-02 / P-13 也照此示范 | **裸跑必失败**：`ERR_UNSUPPORTED_DIR_IMPORT`（`packages/*/src` 用无扩展名目录导入，须 `--import ./tools/runtime/register.mjs` 注册 loader）。现场实测：裸跑 skeleton 测试 fail 1，加 loader 后 pass 1 | 新增 G-16 + BASE-31；全部命令与 P-02/P-13 已改为带 loader 形式 |
