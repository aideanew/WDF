---
id: PLAN-V005-10
title: 步骤 5 · W4 测试矩阵与防假绿体系
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V005-09, PLAN-V005-04]
---

# 10 · 步骤 5：W4 测试矩阵与防假绿

> **一句话**：本项目的验收口径长期是"`npm run guard && npm test` 绿"。但 `features/*/view/**` 依赖 `'cc'`，Node 测不到——**这套口径对所有 UI 卡天然无效**。本步把"绿"拆成五层，每层给可执行断言。
> **核心命题**：不是"多写测试"，而是**让测试能失败**。一个永远不会红的断言，等于没有断言。

## 1. 现状基线

| 项 | 实测 | 证据 |
|---|---|---|
| 测试文件 | 21 个 `.test.mjs` | `find tests -name "*.test.mjs" \| wc -l` |
| 用例总数 | **127**（pass 126 / fail 1，红的那条是 `F-02`） | `01` `E-04` |
| 目录分层 | `contract/` 3 · `determinism/` 9 · `integration/` 8 · `e2e/` 1 | `find tests` |
| 守卫 | 9 项（`run-all.mjs`） | `01` `E-03` |
| UI 覆盖 | **0**（`'cc'` 不可注入） | `04` §1.5 |
| 断言/代码比 | 无统计口径 | — |

### 1.1 三种"假绿"形态（本项目已各发生过一次）

| 形态 | 表现 | 真实案例 | 本步对策 |
|---|---|---|---|
| **A. 手段假绿** | 验证命令本身筛错了，看不到错 | `BASIC-34`：`grep 项目路径` 过滤 tsc 输出，漏掉 `services/**` 的 7 个真错误 | §3.1 唯一过滤式 + 断言"输出必须为空" |
| **B. 对象假绿** | 断言覆盖的不是被测对象 | UI 卡跑 `npm test` 全绿，但测试里没有一行 UI 代码 | §3.4 UI 走查清单（替代证据显式化） |
| **C. 契约假绿** | 实现与契约各自自洽，合起来不通 | `chest.open` 类型存在但动作未注册（`F-15`）；`LOCK_HITS` 与 `locks.csv` 双源（`F-16`） | §3.2/§3.3 交叉一致性断言 |

## 2. 五层测试矩阵

| 层 | 对象 | 可测性 | 工具 | 本计划归口 |
|---|---|---|---|---|
| **L1 纯函数** | `packages/game-core/**` | ✅ 完全 | `node --test` | 步骤 4（chest）|
| **L2 契约** | `packages/contracts/**` | ✅ 完全 | `node --test` + 硬编码期望表 | 步骤 1/4 |
| **L3 集成** | `server/**` + PGlite 内存库 | ✅ 完全 | `node --test` + `WDF_DB_DIR=:memory:` | 步骤 4 |
| **L4 静态一致性** | 源 ↔ 生成物 ↔ 文档 ↔ 数据 | ✅ 完全 | `node --test`（本步新建） | **本步核心** |
| **L5 UI 运行时** | `client/features/*/view/**` | ❌ Node 不可测 | 类型检查（结构）+ 走查清单（语义）+ 真机（行为） | 步骤 3/4 交付、步骤 6 补真机 |

### 2.1 L5 的三级替代证据（G-07 落地）

| 级 | 证据 | 强度 | 缺了会怎样 |
|---|---|---|---|
| ① 类型 | `tsc --noEmit` 零错 | 弱（只证结构） | 面板接线断了都不知道 |
| ② 走查 | 行号清单：每行证明了什么 | 中（证明"我读过"） | 无法区分"写过"与"写对" |
| ③ 真机 | 录屏 / 采样 | 强 | 只能记 UNKNOWN，**不得记 PASS** |

**铁律**：③ 缺失时，该卡整体判定**上限为"逻辑层 PASS + 运行时 UNKNOWN"**，不得写"完成"。

## 3. 本步新增的断言（TASK-4017 / TASK-4018）

### 3.1 唯一过滤式（防形态 A）

所有涉及客户端类型检查的地方，**只准**这一条：

```bash
npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 | grep -v "^C:/" > /tmp/tsc.log 2>&1
test ! -s /tmp/tsc.log || { echo "FAIL: 项目内类型错误"; cat /tmp/tsc.log; exit 1; }
```

**禁止写法**（历史踩坑）：`| grep client/assets` —— 会漏 `services/**`、`app/**`，造出"零错误"。
**断言化**：把上面三行写进 `tools/dev/check-client-types.mjs`，并加 `npm run check:types`，让"正确的检查方式"本身成为可复用命令而非口头纪律。

### 3.2 契约↔实现交叉断言（防形态 C-1）

新增 `tests/contract/action-coverage.test.mjs`：

| # | 断言 | 防什么 |
|---|---|---|
| ① | `Object.keys(ACTIONS).length === 21`（步骤 4 后 22） | 动作被误删/漏登记 |
| ② | 每个 `ACTIONS[k].module` 在 `server/src/modules/` 下**有同名目录** | 动作挂到不存在的模块 |
| ③ | `HANDLERS` 的键集 === `ACTIONS` 的键集 | `satisfies` 只保证"不漏"，不保证"不多"；此断言补上 |
| ④ | 每个 `auth:true` 的动作在 `payload.ts` 有 schema | 漏校验（既有 E-07 已覆盖，此处强化：断言"schema 的键集 ⊆ 动作的 params 类型键"不可行，改为断言"schema 非 `z.any()`"） |
| ⑤ | 每个 `idempotent:true` 的动作在客户端 `RpcClient` 里能拿到 rid | 防 4020 被回退 |

### 3.3 数据↔代码交叉断言（防形态 C-2，**本步最有价值的一条**）

新增 `tests/integration/data-integrity.test.mjs`。设计动机：`F-17` 的根因是"表空但代码路径依赖它"，而**没有任何断言能发现它**（`hook` 硬编码漂流木，`drops` 空却无人报错）。

| # | 断言 | 实现要点 |
|---|---|---|
| ① | **引用的 id 必须存在**：对已知外键列（`item_id`、`lock`、`tier`、`drop_group`）逐行校验目标表有对应 id | 列名→目标表白名单硬编码在测试里（表结构变动时测试红，逼人更新） |
| ② | **被代码引用的表非空**：扫描 `client/assets/scripts/**` 与 `server/src/**` 中的 `table('xxx')` / `preload(['xxx'])`，断言该 CSV ≥1 行 | 白名单豁免：允许为空的表必须显式登记（如 `drops` 当前豁免，**并在测试里附注原因**） |
| ③ | **开锁次数单源**：`locks.csv` 的 `hits_required` 与 `LOCK_HITS_FALLBACK` 五行全等 | 防 `F-16` 回潮 |
| ④ | **箱子双向映射**：`chests.csv` 每行 `item_id` 在 `items.csv` 存在，且该 item 的 `category === 'chest'` | 防 `F-04` 回潮 |
| ⑤ | **价格覆盖**：`items.csv` 的每个 id 在 `prices.csv` 有行（反之亦然） | 防"有物无价"导致回收按钮算不出价 |
| ⑥ | **可回收性**：`prices.csv` 中 `base_price ≥ 1 且 recycle_bp 非空` 的行 ≥8 | 防 D-27 的保底候选集为空 |

**②的实现细节**（这条最容易做成假绿，必须写死判据）：

```js
// 允许为空的表 + 理由（新增豁免必须写理由，否则测试红）
const EMPTY_ALLOWED = {
  drops: '打捞掉落未转录（无设计源），客户端 HookModel 硬编码 item_0001 兜底 —— v1.1 TASK-4022',
  event_drops: '赶海掉落未转录，赶海整片 v1.1',
  // …
};
for (const name of referencedTables) {
  const rows = readCsv(`${name}.csv`);
  if (rows.length === 0 && !EMPTY_ALLOWED[name]) {
    assert.fail(`表 ${name} 被代码引用但为空，且未登记豁免理由`);
  }
}
```

### 3.4 UI 走查清单模板（TASK-4018，防形态 B）

新建 `docs/06_validation/templates/ui-walkthrough.md`，固定六栏：

| 栏 | 填写要求 |
|---|---|
| ① 文件:行号 | 精确到行，能被人 `sed -n` 复查 |
| ② 代码做了什么 | 一句话客观描述，不写"实现了 XX 功能" |
| ③ 证明了哪条验收 | 回指任务卡的验收编号 |
| ④ 依赖的契约/配置 | 如 `economy.sell`、`table('merchants')` |
| ⑤ 未覆盖的部分 | **必填**，如"错误分支的 toast 未验证" |
| ⑥ 复查命令 | 让人一条命令复现你的阅读 |

**反作弊条款**：⑤ 为空且有 ≥3 行的卡，视为"未做走查"，退回。

### 3.5 EVD 五要素规范（TASK-4018）

每个 `docs/06_validation/evidence/EVD-xxxx/README.md` **必须**含：

```markdown
## ① 命令
（逐条可复制执行的完整命令，含工作目录）

## ② 输出
（原文粘贴，不改写、不摘要；关键行用 ✅/❌ 标注）

## ③ 时间
（YYYY-MM-DD HH:mm，时区 GMT+8）

## ④ commit
（本次改动对应的 7 位短 hash；若有前置依赖一并列出）

## ⑤ 判定
（PASS / FAIL / UNKNOWN，逐条对应任务卡的验收编号；
 UNKNOWN 必须写明"缺哪一项证据"与"何时补"）
```

**反作弊条款**：⑤ 写"全部通过"而无逐条对应的，视为无效证据。

## 4. 各波次新增断言配额

| 波次 | 新增测试文件 | 新增用例目标 | 累计 |
|---|---|---|---|
| W0（步骤 1） | 0（只修既有） | 0（127 → 127 全绿） | 127 |
| W2（步骤 3） | `determinism/rid.test.mjs`、`determinism/inventory-recycle.test.mjs` | +8 | 135 |
| W3（步骤 4） | 扩展 `determinism/chest.test.mjs`、新增 `integration/chest-open.test.mjs` | +11 | 146 |
| W4（本步） | `contract/action-coverage.test.mjs`、`integration/data-integrity.test.mjs` | +12 | **158** |

**判据**：`npm test` 输出 `pass ≥ 158`。少于 158 → 说明某波次的断言没落地。

## 5. 原子步骤

### 5.1 `TASK-4017`：契约与数据交叉断言

1. 5.1.1 新建 `tests/contract/action-coverage.test.mjs`（§3.2 五条）
2. 5.1.2 新建 `tests/integration/data-integrity.test.mjs`（§3.3 六条）
3. 5.1.3 把 `EMPTY_ALLOWED` 按当前 35 张空表逐张登记理由（引用 `game-data/UNKNOWN-TABLES.md` 的条目）
4. 5.1.4 跑 `npm test`，**预期至少一条红**（`drops` 或某外键），逐条修到绿或加豁免理由

> 第 4 步是**故意制造失败**：如果全绿，说明断言写得太松，回 5.1.1 收紧。

### 5.2 `TASK-4018`：证据规范落地

1. 5.2.1 新建 `docs/06_validation/templates/ui-walkthrough.md`（§3.4 六栏）
2. 5.2.2 新建 `docs/06_validation/templates/evd-readme.md`（§3.5 五要素）
3. 5.2.3 用模板**回顾改造** `EVD-4007`（步骤 1 补录的），验证模板可用、不缺栏
4. 5.2.4 `docs/06_validation/evidence/README.md` 增"五要素规范"章节 + 指向模板

### 5.3 把"正确检查方式"产品化

1. 5.3.1 新建 `tools/dev/check-client-types.mjs`（§3.1 三行逻辑），失败时退出码 1
2. 5.3.2 `package.json` 加 `"check:types": "node tools/dev/check-client-types.mjs"`
3. 5.3.3 `verify` 可选挂载：`"verify:full": "npm run verify && npm run check:types"`
4. 5.3.4 在 `AGENTS.md §3 完成前自检` 补一行：`- [ ] npm run check:types 通过`

> **为什么不直接改进 `verify`**：`tsc` 需联网装 `typescript@5.8`（`npx -p`），离线环境会失败。挂成独立命令，让 `verify` 保持无网络依赖。

## 6. 验收断言

| # | 断言 | 命令 | 期望 |
|---|---|---|---|
| V-4.1 | 用例数达标 | `npm test` | `pass ≥ 158`，`fail 0` |
| V-4.2 | 交叉断言可失败 | 手工把 `locks.csv` 的 `iron` 改 1 → `npm test` | `data-integrity` 红（验证守卫有效后改回） |
| V-4.3 | 豁免必须带理由 | `grep -c "EMPTY_ALLOWED" tests/integration/data-integrity.test.mjs` | ≥1 且每条豁免有注释理由 |
| V-4.4 | 模板可用 | `ls docs/06_validation/templates/` | `ui-walkthrough.md`、`evd-readme.md` |
| V-4.5 | 类型检查命令化 | `npm run check:types` | `EXIT=0` |
| V-4.6 | `verify` 仍绿 | `npm run verify` | `EXIT=0` |

> **V-4.2 是本步的灵魂**：它验证"断言能红"。**没有做过 V-4.2 的守卫，一律视为未验证**。

## 7. 提交边界（两次提交）

| # | 提交 | 内容 |
|---|---|---|
| 1 | `test(4017): 契约与数据交叉断言——动作覆盖 / 表引用非空 / 开锁单源 / 箱子映射 / 价格覆盖` | 两个新测试文件 + 豁免登记 |
| 2 | `docs(4018): 证据五要素与 UI 走查模板 + check:types 命令化` | 模板 + `tools/dev/check-client-types.mjs` + `package.json` + `AGENTS.md` 自检项 |

## 8. 风险与回退

| 风险 | 概率 | 影响 | 预案 |
|---|---|---|---|
| 交叉断言太严，一上来红一片 | 高 | 阻塞 verify | 按"先加豁免让绿、再逐条收紧"顺序推进；每条豁免写理由 |
| `EMPTY_ALLOWED` 变成"什么都豁免"的垃圾桶 | 中 | 守卫失效 | V-4.3 要求每条带理由；代码评审时对无理由豁免一律打回 |
| `check:types` 在离线环境装不上 typescript | 中 | 命令失败 | 不挂进 `verify`（§5.3 说明）；离线时降级为"记录 UNKNOWN" |
| 新增断言与既有 127 例冲突 | 低 | 测试红 | 冲突说明既有断言有假设被打破，**先查假设是否过期**，不得直接改旧断言 |
