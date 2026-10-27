---
id: PLAN-V005-06
title: 步骤 1 · W0 止血——让 verify 回绿
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V005-05, PLAN-V005-03]
---

# 06 · 步骤 1：W0 止血

> **一句话**：仓库现在是红的（guard 3 处 + test 1 条）。先把红关掉，再谈新功能。
> **为什么排第一**：`verify` 是后续 7 步的唯一闸门。闸门红着，任何"完成"都无法证明。
> **不做的事**：不改 `server/src/modules/account/service.ts`（那是步骤 2），不写任何 UI 代码。

## 1. 前置与边界

> **⚠ 15:13 复测提示（执行前必读）**：外部并行执行者已完成本步的 §2.1（sync 待跑，守卫仍红）与 §2.2.1/§2.2.2（测试已改、127/127 绿）。
> **实际仍需做的只有**：§2.1.1 的 `npm run sync`、**§2.2.3（`DESIGN-0001` 增 2004 行）**、§2.3（EVD-4007）、§2.4（类型检查）。
> 核对手册见 `01` §10.2。**不要因为"测试绿了"就跳过 §2.2.3**——那是本步唯一还没人做的事。

| 项 | 内容 |
|---|---|
| 前置 | 无（可立即开工） |
| 允许修改 | `tests/contract/ux.test.mjs`、`docs/03_solution/design/DESIGN-0001-ux-states.md`、`docs/06_validation/evidence/EVD-4007/**`（新建）、`client/assets/scripts/generated/**`（仅由 `npm run sync` 生成） |
| 禁止修改 | `packages/contracts/**`（内容已正确，本步只同步）、`server/**`、任何 `client/assets/scripts/features/**` |
| 出口 | V-0.1 ~ V-0.4 全绿 |
| 规模 | S（约 30 分钟） |

## 2. 原子步骤

### 2.1 同步生成物（关掉 guard 的 3 处红）

#### 2.1.1 执行同步

```bash
npm run sync
```

预期输出：3 个 contracts 文件被复制到 `client/assets/scripts/generated/contracts/`。

#### 2.1.2 复跑守卫，确认归零

```bash
npm run guard
```

**通过判据**：末行输出 `守卫通过` 或 0 处失败；不得出现 `❌ 生成物未手改且已同步`。

#### 2.1.3 记录同步前后差异（证据）

```bash
git status --porcelain client/assets/scripts/generated/ | tee docs/06_validation/evidence/EVD-4007/sync-diff.txt
```

> 若该 EVD 目录尚未创建，先做 §2.3.1。

### 2.2 契约测试 14 → 15（关掉 test 的 1 条红）

> **背景**：`packages/contracts/src/common/errors.ts` 已含 `BIND_TICKET_INVALID: 2004`（工作区未提交），但测试硬编码 14。这是"代码已改、守据未改"的典型漂移，本步把它对齐。

#### 2.2.1 在 `EXPECTED` 表插入 2004 期望值

文件：`tests/contract/ux.test.mjs`，在 `SESSION_EXPIRED` 与 `BANNED` 两行之间插入：

```js
  SESSION_EXPIRED: { state: 'noPermission', retryable: false, next: 'login' },
+ BIND_TICKET_INVALID: { state: 'noPermission', retryable: false, next: 'login' },
  BANNED: { state: 'noPermission', retryable: false, next: 'contact' },
```

**为什么插在这里**：保持"码值升序"的阅读顺序（2001/2002/2004/2003 不行——应插在 `SESSION_EXPIRED` 之后、`BANNED` 之前会导致 2004 排在 2003 前）。**正确做法**：插在 `BANNED` **之后**、`MINOR_TIME_LIMIT` 之前，与码值 2003 → 2004 → 2101 严格升序一致。

```js
  BANNED: { state: 'noPermission', retryable: false, next: 'contact' },
+ BIND_TICKET_INVALID: { state: 'noPermission', retryable: false, next: 'login' },
  MINOR_TIME_LIMIT: { state: 'noPermission', retryable: false, next: 'wait' },
```

#### 2.2.2 修正断言数量与测试标题

```js
-test('14 个错误码全覆盖，且逐行与 DESIGN-0001 §2 一致', () => {
+test('15 个错误码全覆盖，且逐行与 DESIGN-0001 §2 一致', () => {
   const codeNames = Object.keys(ERR).sort();
-  assert.equal(codeNames.length, 14, 'ERR 码数量应为 14（合同冻结）');
+  assert.equal(codeNames.length, 15, 'ERR 码数量应为 15（2004 已解冻，见 ADR-0011）');
```

#### 2.2.3 同步 `DESIGN-0001 §2`（文档与测试必须同改）

文件：`docs/03_solution/design/DESIGN-0001-ux-states.md`，§2 的错误码表内，`2003 BANNED` 行之后插入：

```markdown
| 2004 | BIND_TICKET_INVALID | `noPermission` | false | `login`：绑定票据无效（不存在/已用/过期/自绑/无身份），重试只会再失败，必须重新发起绑定 |
```

**判据**：`grep -n "2004" docs/03_solution/design/DESIGN-0001-ux-states.md` 命中。

#### 2.2.4 复跑测试

```bash
npm test > /tmp/wdf_test_w0.log 2>&1; echo "EXIT=$?"
grep -E "^ℹ (tests|pass|fail)" /tmp/wdf_test_w0.log
```

**通过判据**：`pass 127`、`fail 0`、`EXIT=0`。

### 2.3 补录 EVD-4007（把"代码完成"升级为"四参照系完成"）

> 依据 `01` §6 `F-11`：4007 有 306 行代码但无证据目录。这一步是纯补证，**不改任何代码**。

#### 2.3.1 建目录与索引

```bash
mkdir -p docs/06_validation/evidence/EVD-4007
```

`docs/06_validation/evidence/EVD-4007/README.md` 必须含**五要素**（规范见 `10` §10.5）：

| 要素 | 本卡内容 |
|---|---|
| ①命令 | `npm test -- --test-name-pattern="merchant"` / `npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 \| grep -v "^C:/"` |
| ②输出 | `merchant-flow.test.mjs` 全绿原文 |
| ③时间 | 2026-10-27 |
| ④commit | `470436e`（4007 实现）+ 本次补证的提交号 |
| ⑤判定 | **逻辑层 PASS / 运行时 UNKNOWN（无真机，真机证据由 4010 统一补）** |

#### 2.3.2 落走查清单（无真机时的替代证据，G-07）

新建 `docs/06_validation/evidence/EVD-4007/walkthrough.md`，逐条列"我读过的行 + 它证明了什么"：

| 行号 | 内容 | 证明了什么 |
|---|---|---|
| `app/MainView.ts:24,30,60` | import + Tab 标签 + 工厂映射 | 商人页已接入导航 |
| `app/panel-types.ts:20` | `PanelKey` 含 `'merchant'` | 契约扩展合规（4007 唯一授权卡） |
| `features/economy/model/EconomyModel.ts:24-33,41-71,87-116` | `unitPrice/sellableRows/applySell/quotaText` | 价格与落账为纯函数，可 Node 测 |
| `features/economy/view/MerchantPanel.ts:224-247` | `invoke('economy.sell')` + 3002 特判 + `toUxState` | 错误态走统一映射，无手写码分支 |
| `tests/determinism/merchant-flow.test.mjs`（108 行） | 单测 | 逻辑层有自动化守据 |

#### 2.3.3 一致性核对：面板内无魔法数字

```bash
grep -nE "[^a-zA-Z_](10000|8500|13000|20|10|5)[^0-9]" client/assets/scripts/features/economy/view/MerchantPanel.ts | head
```

**通过判据**：无 `regionBp`/`dailyLimit` 字面量硬编码（数值必须来自 `table('merchants')`）。若命中，**记缺陷但不在本步修**（属 4007 遗留，另开 `TASK-4021` 小修卡，进 W2 附带处理）。

### 2.4 客户端类型检查复跑（确认 7 个既存错误仍为 0）

#### 2.4.1 跑唯一正确的过滤式

```bash
npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 | grep -v "^C:/" > /tmp/wdf_tsc_w0.log 2>&1; echo "EXIT=$?"
wc -l /tmp/wdf_tsc_w0.log
```

**通过判据**：`wc -l` 为 0（无项目内错误）。

> **禁止**用 `grep 项目路径` 过滤——历史教训 `BASIC-34`：会漏掉 `services/**`，造成"零错误"假绿（`EXEC-BRIEF-0003` G-06）。

#### 2.4.2 若有错则分类

| 错误类型 | 处置 |
|---|---|
| 引擎绝对路径 `C:/...` | 已过滤，忽略 |
| 项目内 `client/assets/**` | **必须修**，本步内修完（属止血范围） |
| 项目内 `services/**` | 同上 |
| 与 2004 有关（如 `UX_BY_ERROR_NAME` 缺键） | 说明 §2.2 未做完，回退重做 |

## 3. 验收断言（本步完成判据，逐条可执行）

| # | 断言 | 命令 | 期望 |
|---|---|---|---|
| V-0.1 | 守卫 0 红 | `npm run guard` | `EXIT=0`，无 `❌` |
| V-0.2 | 测试 0 红 | `npm test` | `pass 127 / fail 0` |
| V-0.3 | 类型检查 0 错 | §2.4.1 | `wc -l` = 0 |
| V-0.4 | EVD-4007 五要素齐 | `ls docs/06_validation/evidence/EVD-4007/` | 含 `README.md` + `walkthrough.md` + `sync-diff.txt` |
| V-0.5 | 15 码四处一致 | `grep -c "BIND_TICKET_INVALID" packages/contracts/src/common/errors.ts packages/contracts/src/common/ux.ts tests/contract/ux.test.mjs docs/03_solution/design/DESIGN-0001-ux-states.md` | 四处各 ≥1 |

## 4. 提交边界

**一次提交**（不可拆）：

```text
fix(4015-w0): sync 生成物 + 契约测试 14→15 码 + DESIGN-0001 §2 同步 + 补录 EVD-4007

- client/assets/scripts/generated/contracts/{common/errors,common/ux,economy/index}.ts  ← npm run sync
- tests/contract/ux.test.mjs：EXPECTED 增 BIND_TICKET_INVALID，断言 14→15
- docs/03_solution/design/DESIGN-0001-ux-states.md：§2 增 2004 行
- docs/06_validation/evidence/EVD-4007/：补录 4007 证据（五要素 + 走查清单）
```

**为什么必须一次提交**：`errors.ts` 已含 2004 而未提交；若只提交测试改动而漏 contracts，则 `sync` 产物会与源不一致，守卫再红。

## 5. 风险与回退

| 风险 | 概率 | 影响 | 预案 |
|---|---|---|---|
| `npm run sync` 顺带覆盖手改文件 | 低 | 生成物回退 | 生成物禁手改是既有纪律，覆盖即正确 |
| `EXPECTED` 插入位置错导致 2003/2004 顺序乱 | 低 | 仅可读性 | 以码值升序为准：2003 → 2004 → 2101 |
| 类型检查冒出与 2004 无关的既有错误 | 中 | 阻塞 V-0.3 | 本步内一并修（属止血范围），并在 EVD 记录"修了什么" |
| `merchant-flow.test.mjs` 因 2004 新增而失败 | 极低 | 阻塞 | 该测试不涉及错误码表，若失败说明改动越界 |

**回退方式**：`git checkout -- tests/contract/ux.test.mjs docs/03_solution/design/DESIGN-0001-ux-states.md && npm run sync`。
