---
id: EXEC-BRIEF-0001
title: 助手派工指令 v2（四级大纲：批次 → 任务 → 原子步骤 → 验证断言）
status: active
module: execution
owner: hark
created: 2026-10-26
review: 2026-11-26
related: [TASK-3001, TASK-3100, TASK-3101, TASK-3105, DESIGN-0001, ADR-0011]
---

# 助手派工指令 v2（EXEC-BRIEF-0001）

> **本文档的唯一用途**：把 M1 的 13 张任务卡拆给互不通信的并行开发 CLI。
> **判断标准**：拿到一段 prompt、只具备局部上下文的执行者，能否**不追问、不猜测**地把活干完并自证。
>
> 结构：`L1 批次 → L2 任务 → L3 原子步骤 → L4 验证断言`。任何一级都可单独引用（如"按 A-3.4 执行"）。

---

## 0. 怎么用这份指令

| 角色 | 读哪几节 | 不看哪几节 |
|---|---|---|
| 助手 A（客户端） | §2 通用铁律、§3 接口契约、§4.2 的 A-1~A-5、§5~§7 | B/C 的条目 |
| 助手 B（纯函数） | §2、§3.2/§3.4、§4.3 的 B-1~B-3、§5~§7 | A/C 的条目 |
| 助手 C（闸门/文档） | §2、§4.4 的 C-1~C-2、§5~§7 | A/B 的条目 |
| 主控（本人） | 全部 | — |

**幂等要求**：同一段 prompt 重复执行必须安全——所有步骤都带"先检查再改"，不允许出现"再插入一遍"。发现已存在且正确 → 跳过并记录 `SKIP(已满足)`。

---

## 1. 分工总表与依赖

| 编号 | 任务 | 归属 | 档位 | 规模 | 前置 |
|---|---|---|---|---|---|
| — | TASK-3001 UX 态契约 | **核心 · ✅已完成** | opus | 0.5d | — |
| A-1 | TASK-3002 configVersion 单一来源 | 助手 A | sonnect | 0.3d | — |
| A-2 | TASK-3100 客户端配置读取服务 | 助手 A | sonnect | 0.5d | A-1 |
| A-3 | TASK-3102 背包列表页 | 助手 A | sonnect | 0.5d | A-2、B-2、核心 3101 |
| A-4 | TASK-3103 合成面板 | 助手 A | sonnect | 1d | A-2、B-1、核心 3101 |
| A-5 | TASK-3104 排行榜页 | 助手 A | sonnect | 0.5d | 核心 3101 |
| B-1 | TASK-3201 crafting 判定 | 助手 B | sonnect | 0.5d | — |
| B-2 | TASK-3202 inventory 投影 | 助手 B | sonnect | 0.3d | — |
| B-3 | TASK-3302 存档封印回归测试 | 助手 B | sonnect | 0.3d | — |
| C-1 | TASK-3301 守卫第 10 项 | 助手 C | sonnect | 0.5d | — |
| C-2 | TASK-3401 文档/索引对齐 | 助手 C | sonnect | 0.2d | 其余全部 |
| — | TASK-3101 主界面 Tab + 面板接缝 | **核心** | sonnect | 0.8d | 3001 |
| — | TASK-3105 云存档分叉 UI | **核心** | opus | 0.75d | 3101、3002 |

**核心只拿 3 张**（3001 已完成 + 3101 + 3105）：契约语义、UI 接缝、存档覆盖。其余 10 张全部外派。

```
B1（并行，3 写者）  核心:3101     A:A-1→A-2        B:B-1/B-2/B-3    C:C-1
                                   │
B2（并行，2 写者）  A:A-3（需 B-2 与 3101）、A-5（需 3101）      核心:3105
B3（串行）          A:A-4（需 B-1）
B4（收口）          C:C-2（需全部完成）
```

---

## 2. 通用铁律（编号引用，勿改语义）

| 编号 | 规则 | 违反后果 |
|---|---|---|
| G-01 | 只改任务卡「允许修改」列的路径 | 所有权冲突，主控回滚 |
| G-02 | 禁止改 `packages/contracts/**`、`**/generated/**`、`server/**`、`game-data/source/**`、`server/db/migrations/**` | 契约/数值失守 |
| G-03 | 禁止编造数值。缺数字段**不显示**（`items.weight` 0/106 是现状） | 视为伪造交付 |
| G-04 | 改过 `packages/**` 必跑 `npm run sync` | 守卫第 7 项红 |
| G-05 | 类型检查用 `npx -p typescript@5.8 tsc`，**禁止裸 `npx tsc`**（会拉同名假包、退出码 0 但没检查） | 假绿 |
| G-06 | 禁止 `git commit` / `git push`（并行 CLI 会互相覆盖），统一由主控提交 | 历史被覆盖 |
| G-07 | 同一卡连续 2 次验收失败 → 停手，输出 `BLOCKED` 报告 | 隐性烧钱 |
| G-08 | 不得新增 `*_v2` / `*_backup` / `*副本*` 文件 | 污染仓库 |
| G-09 | 客户端 `features/**/model` 禁止 `import { ... } from 'cc'`（只有 `view` 可以） | 破坏可测性 |
| G-10 | 幂等：重跑前先 grep 目标文件是否已含目标实现，含则 `SKIP` 并说明 | 重复代码 |
| G-11 | 不要修改 `docs/04_planning/**`、`docs/05_execution/tasks/**`（除自己的 EVD 证据目录） | 计划被篡改 |
| G-12 | 上报只给结论与证据，不写推理散文 | 主控无法快速判定 |

---

## 3. 跨任务接口契约（唯一共享面，写死不得改）

### 3.1 面板接口（核心 TASK-3101 产出，助手 A 照此实现）

```ts
// client/assets/scripts/app/panel-types.ts（由核心落地）
import type { Node } from 'cc';

export type PanelKey = 'hook' | 'inventory' | 'crafting' | 'leaderboard';

export interface PanelHandle {
  readonly key: PanelKey;
  readonly node: Node;
  /** 首次显示 / 再次切回时调用；实现方负责按需刷新 */
  onShow(): void;
  /** 切走时调用；必须停掉定时器与监听，不得销毁 */
  onHide(): void;
  /** 显式刷新数据（下拉/按钮触发） */
  refresh(): void;
  /** 仅销毁自身节点与监听 */
  destroy(): void;
}

export type PanelFactory = (parent: Node) => PanelHandle;
```

**约定**：每个 `features/<module>/view/<X>Panel.ts` 导出 `export function createXxxPanel(parent: Node): PanelHandle`。**MainView 由核心维护，助手不得编辑**；助手只提供工厂函数。

### 3.2 配置读取服务（助手 A 的 A-2 产出，A-3/A-4 消费）

```ts
// client/assets/scripts/services/config/index.ts（A-2 实现）
export type TableName = 'items' | 'recipes' | 'prices' | 'locks' | 'chests';
export function table<K extends TableName>(name: K): ReadonlyArray<TableRowMap[K]>; // 未加载 → [] + warn
export function preload(names: TableName[]): Promise<{ loaded: TableName[]; failed: TableName[] }>;
export function configVersion(): string;   // 来自 resources/config/_manifest.json，不回落字面量
export function clearCache(): void;
```

**数据事实（已实测，勿再猜）**：表文件在 `client/assets/resources/config/<name>.json`，是**行数组**；`recipes.inputs` 是**字符串** `item_0001*1;item_0002*2`（80 行分布：单输入 31 / 双 44 / 三 2 / 四 3）；空字段（`job`/`unlock_level`/`weight`）在 JSON 里被省略。

### 3.3 UX 态（已完成，直接消费）

```ts
// 契约副本路径：client/assets/scripts/generated/contracts/common/ux.ts
// 相对路径按文件深度自行调整（features/<m>/model → '../../../generated/contracts/common'）
import { toUxState, conflictOf } from '../../../generated/contracts/common/ux';
toUxState(code) → { state: 'error'|'empty'|'noPermission'|'success'|... , retryable, next?, code }
```
禁止自己写 `if (code === 2001)` 分支；`conflict` 只来自 `save.push` 的 `accepted:false`。

### 3.4 存档段键名（现状，勿改）

`SaveFile.modules` 是自由段：
- 背包：`modules.inventory.items = { [itemId: string]: number }`（`HookModel` 写的是 `item_0001`）
- **已知脏数据**：`BootController` 历史写入键为 `driftwood`（非法 id）→ 读取时必须走"未知 id"分支，不得崩溃、不得丢弃引导报错。

---

## 4. 四级执行大纲

### 4.1 批次（L1）

| 批次 | 内容 | 并发写者 | 批末动作 |
|---|---|---|---|
| B1 | 核心 3101 + A-1/A-2 + B-1/B-2/B-3 + C-1 | 3（核心、A、B、C 中最多 3 同时写；C 与核心无交集，可并入） | `npm run guard && npm test` |
| B2 | A-3、A-5 + 核心 3105 | 2 | 同上 |
| B3 | A-4 | 1 | 同上 |
| B4 | C-2 | 1 | 同上 + 提交 |

### 4.2 助手 A（客户端）

#### A-1 · TASK-3002 configVersion 单一来源
- A-1.1 读 `client/assets/scripts/generated/game-core/generated/config-types.ts:3`，确认 `CONFIG_VERSION` 当前值（记入报告）。
- A-1.2 打开 `services/net/RpcClient.ts`，定位 `export const CONFIG_VERSION = '...'`（约第 9-10 行）。
- A-1.3 改为 `import { CONFIG_VERSION } from '../../generated/game-core/generated/config-types';` 并追加 `export { CONFIG_VERSION };`（保持既有 import 方不破）。
- A-1.4 打开 `services/save/LocalSave.ts`，把 `configVersion: '16921d30a67a934f'` 改为 `configVersion: CONFIG_VERSION`（同源 import，路径 `../../generated/game-core/generated/config-types`）。
- A-1.5 `grep -rn "16921d30a67a934f" client/assets/scripts` → 必须无输出。

**L4 断言**
- V-A-1.a `grep` 无输出（exit 1）→ PASS
- V-A-1.b `npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit` → 无错
- V-A-1.c `node --test tests/e2e/skeleton.test.mjs` → `# fail 0`
- V-A-1.d `npm run guard` → 9/9（C-1 完成后为 10/10）

#### A-2 · TASK-3100 客户端配置读取服务
- A-2.1 新建 `services/config/tables.ts`：`TableName` 联合类型 + `TableRowMap`（行类型 **import** 自 `generated/game-core/generated/config-types`，禁止复制字段定义）。
- A-2.2 `tables.ts` 内**不得**出现 `from 'cc'`（G-09 的反向要求：此文件要给 Node 测试用）。
- A-2.3 `services/config/index.ts` 实现缓存 `Map<TableName, readonly Row[]>` 与在途 `Map<TableName, Promise<Row[]>>`。
- A-2.4 `table(name)`：命中返回**浅拷贝数组**；未命中返回 `[]` 且 `console.warn('[config] 未预加载: '+name)`。
- A-2.5 `preload(names)`：`Promise.all` 并行；已在途/已缓存的跳过（幂等）；单项失败记入 `failed` 并 warn，不抛出。
- A-2.6 `configVersion()`：读 `resources/config/_manifest.json`；读不到则 `throw new Error('配置缺少 _manifest.json，先跑 npm run gen')`（**禁止**回落字面量）。
- A-2.7 `clearCache()`：清缓存 + 在途表。

**L4 断言**
- V-A-2.a `preload(['items','recipes'])` 后 `table('items').length===106 && table('recipes').length===80`（行数为实测值）
- V-A-2.b 并发两次 `preload(['items'])` → loader 调用计数 === 1（用可替换的 loader 或日志计数证明）
- V-A-2.c `table('items')[0].name='X'` 后再读 → 仍是原名（证明返回副本）
- V-A-2.d `configVersion() === CONFIG_VERSION`（不一致即数值未同步，报错不静默）
- V-A-2.e `tsc` 无错、`npm run guard` 通过、`grep -c "from 'cc'" services/config/tables.ts` 为 0

#### A-3 · TASK-3102 背包列表页
- A-3.1 确认前置：`packages/game-core/src/inventory/index.ts` 已导出 `listRows`（B-2 交付）；`features/inventory/view/InventoryPanel.ts` 存在（核心 3101 交付）。任一不满足 → `BLOCKED`，**不得自建**。
- A-3.2 读 `features/hook/model/HookModel.ts` 确认 `modules.inventory.items` 的写入键名，与 `listRows` 入参对齐。
- A-3.3 `InventoryModel`：`load()` 返回 `{ known, unknownIds }`；`unknownIds` 只记 warn，不显示、不崩。
- A-3.4 `createInventoryPanel(parent)`：标题 + 列表（最多 20 行，超出显示"还有 N 项"）；每行 `名称 ×数量 | 类别 | 基准价`。
- A-3.5 空态：`known.length===0` → "还没有捞到东西，去打捞吧" + 按钮切到 `hook`（通过 `PanelHandle` 之外的回调参数实现，不直接改 MainView）。
- A-3.6 **不显示重量/容量**（G-03）。

**L4 断言**
- V-A-3.a `known` 行数与手工构造的存档条目数一致（含 `driftwood` 时归入 `unknownIds`）
- V-A-3.b `tsc` 无错；`npm run guard` 通过
- V-A-3.c 录屏：空存档 → 空态；有物品 → 2 行且名称来自 `items.json`
- V-A-3.d `grep -c "weight" features/inventory/**` 为 0

#### A-4 · TASK-3103 合成面板
- A-4.1 确认 `packages/game-core/src/crafting/index.ts` 已导出 `parseInputs/canCraft/consume`（B-1 交付）与 `CraftingPanel.ts` 存在（3101）。否则 `BLOCKED`。
- A-4.2 `CraftingModel.recipes()`：`table('recipes')` → 映射为 `RecipeShape`（`output→out`、`output_count→outCount`、`inputs` 交给 `parseInputs`）；`station`/`job` 暂不展示（G-03）。
- A-4.3 分组：可制作 / 材料不足；不足项显示"缺 名称 ×N"。
- A-4.4 `craft(recipeId)`：`canCraft` → `consume` → 写回 `modules.inventory.items` → `LocalSave.save()`；成功后 `refresh()`。
- A-4.5 顶部固定一行说明："当前版本不校验等级与职业（数值未定）"。
- A-4.6 埋点：若 `features/telemetry` 仍为桩（11 行）→ **跳过埋点**，在报告"未解决项"注明；不得为埋点自建 API。

**L4 断言**
- V-A-4.a `node --test tests/determinism/crafting.test.mjs` → fail 0（B-1 的用例）
- V-A-4.b `node --test tests/integration/hook-save.test.mjs` → fail 0（存档封印未被破坏）
- V-A-4.c 录屏：给 `item_0001×20` → 至少 1 条变"可制作"；制作后库存 -1、产物 +1、revision +1
- V-A-4.d 材料不足时点制作 → 库存与 revision 均不变
- V-A-4.e `tsc` 无错、guard 通过

#### A-5 · TASK-3104 排行榜页
- A-5.1 读 `server/src/modules/leaderboard/service.ts`（**只读**）确认 query 返回字段名与 `me` 结构。
- A-5.2 `LeaderboardModel.fetch(scope='global')` → `invoke('leaderboard.query', { scope, limit: 20 })`。
- A-5.3 态映射：`c===0 && rows.length>0` → success；`c===0 && rows.length===0` → empty；否则 `toUxState(c)`。
- A-5.4 渲染：名次 / 名称 / 收益；`me` 行高亮；空态"本季还没有人上榜，先去打捞"。
- A-5.5 `4001` → 提示"操作过于频繁"并禁用刷新 3s；刷新时保留旧榜 + 顶部细进度条。

**L4 断言**
- V-A-5.a `node --test tests/integration/leaderboard.test.mjs` → fail 0（服务端侧不回归）
- V-A-5.b 服务端起 + 造 3 条 → 榜单 3 行降序；空库 → 空态
- V-A-5.c `tsc` 无错、guard 通过

### 4.3 助手 B（纯函数 + 单测）

#### B-1 · TASK-3201 crafting 判定
- B-1.1 `parseInputs(raw: string)`：按 `;` 切分，每段 `id*count`（`*` 单分隔）；空串 → `[]`；非法段 → 收集进 `invalid[]` 不抛。
- B-1.2 `RecipeShape`：`{ id, out, outCount, inputs: {id,count}[], rawInputs }`（`rawInputs` 保留原串便于排障）。
- B-1.3 `canCraft(recipe, inv)` → `{ ok, missing: {id, need, have}[] }`，`missing` 顺序 === `inputs` 顺序。
- B-1.4 `consume(recipe, inv)` → 新对象，不改入参，不做 ok 校验。
- B-1.5 单测覆盖：单输入够 / 缺 1 / **3 输入**（真实存在 3 条）/ 4 输入 / 非法串 / 空库存 / 不可变性 / 确定性深比较。

**L4 断言**
- V-B-1.a `node --test tests/determinism/crafting.test.mjs` → `# tests ≥ 8`，`# fail 0`
- V-B-1.b 源码无 `Math.random|Date.now|from 'cc'|node:fs`
- V-B-1.c `npm run guard` 通过（`gameCorePurity`）

#### B-2 · TASK-3202 inventory 投影
- B-2.1 `listRows(section: unknown, items: Record<string, ItemsRow>)`。
- B-2.2 非法 section（undefined/非对象/数组）→ `{known:[],unknownIds:[]}`，不抛。
- B-2.3 数量 ≤0 跳过；未知 id 进 `unknownIds`（保持原顺序）。
- B-2.4 排序：`base_price` 降序，同价按 `id` 升序（稳定、确定性）。
- B-2.5 单测：3 已知 + 1 未知 / 空 section / 0 数量 / 顺序确定性 / 不改入参 / 不读 weight。

**L4 断言**
- V-B-2.a `node --test tests/determinism/inventory.test.mjs` → `# tests ≥ 6`，fail 0
- V-B-2.b `grep -c "weight\|capacity\|unlock_level" packages/game-core/src/inventory/index.ts` 为 0
- V-B-2.c guard 通过

#### B-3 · TASK-3302 存档封印回归测试
- B-3.1 用例 1：`sealSave` → JSON 往返 → `verifySave===true`
- B-3.2 用例 2（反例）：`sealSave({...sealed})` → `verifySave===false`（证明不剥离旧 checksum 必坏）
- B-3.3 用例 3（正解）：解构剥离后再 seal → `true`
- B-3.4 用例 4：改 `modules` 不重封印 → `false`
- B-3.5 用例 5：`checksum` 非整数 → `false` 且不抛
- B-3.6 文件头注释写明"不覆盖 `LocalSave.save`（`getPlatform()` 无注入点）"

**L4 断言**
- V-B-3.a `node --test tests/determinism/save-seal.test.mjs` → `# tests 5`，fail 0
- V-B-3.b 现场把 `computeChecksum` 临时改为忽略 body → 用例 4 必须红；随后 `git checkout -- packages/game-core/src/save/schema.ts` 复原
- V-B-3.c `git status` 中不残留 `schema.ts` 改动

### 4.4 助手 C（闸门 + 文档）

#### C-1 · TASK-3301 守卫第 10 项
- C-1.1 **先解决导入副作用**：`tools/sync/to-client.mjs` 顶层会执行写文件，**禁止直接 import**。新建 `tools/lib/sync-targets.mjs` 导出 `SYNC_TARGETS`（`[['packages/game-core/src','game-core'],['packages/contracts/src','contracts']]`）与 `GEN_HEADER` 复用说明。
- C-1.2 改 `tools/sync/to-client.mjs` 使用该共享常量（不改生成行为，验证 `npm run sync` 输出仍为 `已同步 43 个文件`）。
- C-1.3 `tools/guard/checks.mjs` 新增 `sourceSync()`：逐源文件比对"`GEN_HEADER` + 源内容"与目标文件（规范化换行、去尾随空白）；目标缺失亦失败；错误信息含 `npm run sync`。
- C-1.4 `tools/guard/run-all.mjs` 注册 label `源与生成物同步`。
- C-1.5 三步验证（见 L4），完成后复原探测改动。

**L4 断言**
- V-C-1.a 无改动 → guard `10/10`
- V-C-1.b `echo "// probe" >> packages/game-core/src/hook/index.ts` 且不 sync → guard 失败，输出含 `npm run sync`
- V-C-1.c `npm run sync` 后 → `10/10`
- V-C-1.d 复原后 `git status --porcelain` 为空

#### C-2 · TASK-3401 文档/索引对齐（最后执行）
- C-2.1 实跑 `npm run guard`、`npm test`，记录真实数字。
- C-2.2 统计已实现 handler：非 `todo` 的动作数（`gateway/handlers.ts`）。
- C-2.3 用实测值替换 `current-plan.md` 中的守卫数/测试数/handler 数，每处标注"实测日期"。
- C-2.4 `npm run gen:docs` 重建索引，确认条数 = `docs/05_execution/tasks/*.md` 数 − 1（README）。
- C-2.5 修正 `TASK-2101.md` 状态（`proposed` → `done`，已完成但漏改）。

**L4 断言**
- V-C-2.a `grep -c "^| TASK-" docs/05_execution/task-index.md` === `ls docs/05_execution/tasks/*.md | wc -l` − 1
- V-C-2.b `current-plan.md` 里出现的每个数字都能被 C-2.1/C-2.2 的命令复现
- V-C-2.c `npm run verify` 全绿

---

## 5. 并发、增量与性能规则

| 规则 | 内容 |
|---|---|
| P-01 | 同时最多 3 个写入者；本表已保证路径不相交（见 §5.2） |
| P-02 | 单卡只跑自己的测试文件（`node --test <file>`），**批末**才跑 `npm test` 全量 |
| P-03 | `npm run guard` 只在"改了 packages 或 tools"后跑，不是每步都跑 |
| P-04 | 禁止 `npm ci` / `rm -rf node_modules`；依赖已装好 |
| P-05 | 长命令不要接管道（`| tail`）——会假死；用重定向到文件再读 |
| P-06 | 同一张表的加载必须走 `services/config`（A-2），禁止各自读 JSON，避免 4 份缓存 |
| P-07 | 缓存策略：`preload` 一次加载当前页面所需表，不得在 `render` 循环里调用 `preload` |

**P-08 排他文件锁表（同一时刻只允许一个写者）**

| 文件 | 所有者 |
|---|---|
| `packages/contracts/src/common/**` | 核心（已完成） |
| `packages/game-core/src/{crafting,inventory}/**` | 助手 B |
| `tools/lib/sync-targets.mjs`、`tools/sync/to-client.mjs`、`tools/guard/**` | 助手 C |
| `client/assets/scripts/app/**` | 核心（3101） |
| `client/assets/scripts/services/config/**`、`services/net/RpcClient.ts`、`services/save/LocalSave.ts` | 助手 A |
| `client/assets/scripts/features/{inventory,crafting,leaderboard}/**` | 助手 A（3101 只建桩，不改后续实现） |
| `client/assets/scripts/features/settings/**` | 核心（3105） |
| `docs/04_planning/**`、`docs/05_execution/task-index.md` | 核心 / 助手 C（仅 C-2 批次） |

---

## 6. 验收与上报协议

### 6.1 每张卡的上报模板（严格照抄，不得增删字段）

```text
卡号: TASK-xxxx
状态: PASS | FAIL | UNKNOWN | BLOCKED
变更文件:
  - <路径>（新增|修改）
L4 断言结果:
  - V-A-1.a PASS  <一行实际输出>
  - V-A-1.b PASS  <一行实际输出>
未解决项: <无 | 具体到文件:行 + 现象 + 已尝试>
已知偏差: <无 | 与任务卡的差异及原因>
```

### 6.2 判定规则

| 状态 | 条件 |
|---|---|
| PASS | 该卡所有 L4 断言通过，且 `git status` 只含该卡允许范围内的文件 |
| FAIL | 任一断言失败（必须附原始输出，禁止只说"失败"） |
| UNKNOWN | 依赖外部环境（Cocos 运行时/服务端未起）无法验证 → 必须说明"用什么替代证据"，人工项必须给录屏路径 |
| BLOCKED | 前置任务未交付，或触发任务卡「阻塞条件」 |

### 6.3 主控复核

- 主控只读 `git diff` + 断言输出，**不看执行者自述**；每个 PASS 都会独立复跑一次关键断言。
- 出现"PASS 但测试数下降" → 直接判 FAIL（回归被掩盖）。

---

## 7. 熔断与升级

| 触发 | 动作 |
|---|---|
| 同卡连续 2 次 FAIL | 停手 → 输出 BLOCKED → 主控重写任务卡或升级档位 |
| 发现任务卡与真实代码冲突 | 停手 → 在报告"未解决项"写明冲突 → **不得自行选择一边** |
| 需要改契约/错误码/迁移 | 停手 → 引用 ADR-0011 → 等裁决 |
| 需要新增依赖 | 停手 → 报告，主控决定 |
| 估算工作量 > 任务卡规模 2 倍 | 停手 → 请求拆分 |

---

## 8. 可直接复制的三段 prompt

### 8.1 助手 A

```text
你是 WDF 客户端执行者。仓库根 E:/Demo/WDF，先读 docs/05_execution/ASSISTANT-BRIEF.md 的 §2、§3.1、§3.2、§3.4、§4.2、§5~§7，然后严格按 A-1 → A-2 → A-3 → A-4 → A-5 顺序执行。

铁律摘要（详见 §2，违反即回滚）：只改自己那份文件（§5 P-08 排他表）；禁改 packages/server/generated/game-data；禁编数值；类型检查用 npx -p typescript@5.8 tsc；不许 git commit；同卡 2 次失败就停。

执行判据（自己查，不要问人）：
- 做 A-3 前先确认 packages/game-core/src/inventory/index.ts 已导出 listRows，且 features/inventory/view/InventoryPanel.ts 存在；否则输出 BLOCKED 等前置。
- 做 A-4 前先确认 game-core/src/crafting/index.ts 已导出 canCraft/consume，且 features/crafting/view/CraftingPanel.ts 存在；否则 BLOCKED。
- 做 A-5 前先确认 features/leaderboard/view/LeaderboardPanel.ts 存在；否则 BLOCKED。

每张卡做完按 §6.1 模板上报；一次回复只报一张卡，不要合并。
```

### 8.2 助手 B

```text
你是 WDF 纯规则执行者，只写 packages/game-core 纯函数与 node 测试，不碰 UI/服务端。仓库根 E:/Demo/WDF，先读 docs/05_execution/ASSISTANT-BRIEF.md 的 §2、§3.2（数据事实）、§3.4、§4.3、§5~§7，然后按 B-1 → B-2 → B-3 顺序执行。

关键事实（已实测，勿再猜）：recipes.inputs 是字符串 "item_0001*1;item_0002*2"，80 行分布为 单31/双44/三2/四3；items.weight 等字段全空，禁止读取。

做完必跑：npm run sync && npm run guard && npm test（基线 72 用例，你应新增 ≥19 用例）。
上报按 §6.1，一张卡一条。
```

### 8.3 助手 C

```text
你是 WDF 工程闸门维护者，只改 tools/** 与（最后）计划文档。仓库根 E:/Demo/WDF，先读 docs/05_execution/ASSISTANT-BRIEF.md 的 §2、§4.4、§5~§7。

先做 C-1（守卫第 10 项），全部 L4 断言现场做出来并复原探测改动；C-2 只有在主控明确通知"其余任务已完成"后再做。

特别注意：tools/sync/to-client.mjs 顶层有写文件副作用，禁止直接 import；按 C-1.1 先抽 tools/lib/sync-targets.mjs。
上报按 §6.1。
```

---

## 9. 本指令自身的事实校验（可复跑，2026-10-26 实测）

本文件里每一个具体数字/行号都可用下面 7 条命令复核；**任何一条与你的现场不符 → 说明代码已变，先停手报告，不要照旧执行**。

| # | 断言 | 校验命令 | 实测值 |
|---|---|---|---|
| 1 | 配方表 80 行 | `node -e "console.log(require('./client/assets/resources/config/recipes.json').length)"` | `80` |
| 2 | 物品表 106 行 | `node -e "console.log(require('./client/assets/resources/config/items.json').length)"` | `106` |
| 3 | 客户端配置服务是空壳 | `wc -l < client/assets/scripts/services/config/index.ts` | `2` |
| 4 | 生成物 CONFIG_VERSION | `grep -n "export const CONFIG_VERSION" client/assets/scripts/generated/game-core/generated/config-types.ts` | `3: ... 'b249f288e985da48'` |
| 5 | LocalSave 旧哈希位置 | `grep -n "16921d30a67a934f" client/assets/scripts/services/save/LocalSave.ts` | `48` |
| 6 | RpcClient 旧哈希位置 | `grep -n "16921d30a67a934f" client/assets/scripts/services/net/RpcClient.ts` | `10` |
| 7 | 面板桩尚不存在（核心 3101 未落地） | `ls client/assets/scripts/features/inventory/view/InventoryPanel.ts` | 不存在（符合预期） |

**指令的已知局限（不掩盖）**：

1. Cocos 运行时行为（`resources.load` 实际返回、渲染帧率）无法在 Node 下验证 → A-2 的 loader 必须可替换，纯逻辑必须能在 Node 下测；UI 一律人工录屏。
2. 服务端相关断言（A-5）需 `npm run dev:server` 起本地 5050；未起时只能跑 `node --test tests/integration/leaderboard.test.mjs`（内存 PGlite），此时状态应记为 `UNKNOWN` 而非 `PASS`。
3. 本指令不覆盖 `TASK-3101`（核心）与 `TASK-3105`（核心）的实现细节，只锁定它们对外暴露的工厂/接口形状（§3.1）。

