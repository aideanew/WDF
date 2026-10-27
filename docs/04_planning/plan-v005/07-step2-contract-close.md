---
id: PLAN-V005-07
title: 步骤 2 · W1 契约解冻收尾（2004 全链路）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V005-06, PLAN-V005-03]
---

# 07 · 步骤 2：W1 契约解冻收尾（TASK-4015）

> **一句话**：2004 码已在 `contracts` 里，但**没有任何一处业务代码返回它**。本步把"码存在"变成"码生效"。
> **纠错前提**：`TASK-4015` 卡与 `ADR-0011` 都把票据校验定位在 `server/src/modules/save/service.ts`，**实测在 `server/src/modules/account/service.ts`**（`01` `F-07`）。本步按实测位置执行，并顺手修正 ADR-0011 的错误事实来源。

## 1. 前置与边界

> **⚠ 15:13 复测提示（执行前必读）**：外部并行执行者已完成本步的 **§2.1（服务端五处改 2004）与 §2.2（测试断言跟进）**。
> **实际仍需做的**：**§2.3（`error-catalog.md` 正式登记）**、**§2.4（`ADR-0011` 翻 accepted + 修正票据位置笔误）**、§2.5（`gen` + `verify`）。
> 核对命令见 `01` §10.2。**这三项是 4016 收口的前置，不能跳过**。

| 项 | 内容 |
|---|---|
| 前置 | W0 完成（`verify` 绿） |
| 允许修改 | `server/src/modules/account/service.ts`、`tests/integration/bind.test.mjs`、`docs/03_solution/data/error-catalog.md`、`docs/03_solution/decisions/ADR-0011-contract-gaps.md` |
| 禁止修改 | `packages/contracts/**`（W0 已定稿）、`server/src/modules/save/**`（那里没有票据逻辑）、`server/src/gateway/**`（handler 只透传，无需改） |
| 出口 | V-1.1 ~ V-1.5 全绿 |
| 规模 | S |

## 2. 原子步骤

### 2.1 服务端：五处票据失败改抛 2004

文件：`server/src/modules/account/service.ts`，`bindConfirm()` 内 `withTx` 回调（实测 `:118-127`）。

#### 2.1.1 逐处替换（五行，一一对应）

| 行（实测） | 原代码 | 改为 | 语义 |
|---|---|---|---|
| ① | `if (!row) throw new BindError(ERR.NOT_LOGGED_IN, 'bind ticket not found');` | `ERR.BIND_TICKET_INVALID` | 票据不存在 |
| ② | `if (row.used_at) throw new BindError(ERR.NOT_LOGGED_IN, 'bind ticket already used');` | `ERR.BIND_TICKET_INVALID` | 已使用 |
| ③ | `if (new Date(row.expires_at).getTime() < t) throw new BindError(ERR.NOT_LOGGED_IN, 'bind ticket expired');` | `ERR.BIND_TICKET_INVALID` | 已过期 |
| ④ | `if (anchor === confirmerPlayerId) throw new BindError(ERR.NOT_LOGGED_IN, 'cannot bind a player to itself');` | `ERR.BIND_TICKET_INVALID` | 自绑（票据指向自己，票据无效） |
| ⑤ | `if (moved === 0) throw new BindError(ERR.NOT_LOGGED_IN, 'no identity to bind on this platform');` | `ERR.BIND_TICKET_INVALID` | 无身份可绑 |

#### 2.1.2 为什么五处**全部**改 2004（而不是只改前三处）

- `BAD_PAYLOAD(1001)` 的 UX 是 `{state:'error', retryable:false}`，**无 `next` 出口** → 玩家看到错误却无任何恢复路径（`DESIGN-0001 §2`）。
- `BIND_TICKET_INVALID(2004)` 的 UX 是 `{state:'noPermission', retryable:false, next:'login'}` → 明确引导"重新登录后重试绑定"，恰好是这五种失败的唯一正确出路。
- 语义上五者共性是「**这张票据无法完成绑定**」，与 2004 的定义（`errors.ts` 注释：不存在/过期/已用/自绑/无身份）完全一致 —— 注释本就是按这五种情形写的。

#### 2.1.3 保持 `NOT_LOGGED_IN` 的其他用途不变

`account` 模块内**非票据**场景（如令牌无效、player 不存在）仍用 2001。判据：

```bash
grep -n "ERR.NOT_LOGGED_IN" server/src/modules/account/service.ts
```

**期望**：`bindConfirm` 之外仍有 ≥1 处（证明没被一刀切替换）。

### 2.2 契约测试：六处断言跟进

文件：`tests/integration/bind.test.mjs`。

#### 2.2.1 五条断言（`:107, :116, :124, :129, :138`）

```js
- assert.equal(c3.c, 2001, '已用票据换 rid 重放必须被拒');
+ assert.equal(c3.c, 2004, '已用票据换 rid 重放必须被拒（2004 票据无效）');

- assert.equal(missing.c, 2001, '不存在的票据应返回明确错误码');
+ assert.equal(missing.c, 2004, '不存在的票据应返回 2004');

- assert.equal(expired.c, 2001, '过期票据应被拒');
+ assert.equal(expired.c, 2004, '过期票据应返回 2004');

- assert.equal(self.c, 2001, '自绑必须被拒，防止把 identity 从自己挪给自己');
+ assert.equal(self.c, 2004, '自绑必须被拒（2004）');

- assert.equal(noId.c, 2001, '确认方在该平台无 identity 应被拒');
+ assert.equal(noId.c, 2004, '确认方在该平台无 identity 应返回 2004');
```

#### 2.2.2 标题与文件头注释（`:11` / `:111`）

```js
- *  - 失败路径：票据不存在 / 过期 / 已用 / 自绑 → 2001（合同冻结无专用码，缺口填补复用，见 service.ts）
+ *  - 失败路径：票据不存在 / 过期 / 已用 / 自绑 / 无身份 → 2004 BIND_TICKET_INVALID（ADR-0011 缺口 2 已解冻）

-test('AT-2201 失败路径：票据不存在 / 过期 / 自绑 → 2001（非 500）', async () => {
+test('AT-2201 失败路径：票据不存在 / 过期 / 自绑 / 无身份 → 2004（非 500）', async () => {
```

#### 2.2.3 跑测试

```bash
npm test > /tmp/wdf_test_w1.log 2>&1; echo "EXIT=$?"
grep -E "^ℹ (tests|pass|fail)" /tmp/wdf_test_w1.log
```

**通过判据**：`fail 0`。若 `bind.test.mjs` 仍断言 2001 → 说明 §2.1 漏改。

### 2.3 `error-catalog.md`：从"建议"升级为"正式登记"

#### 2.3.1 主表新增 2004 行

文件：`docs/03_solution/data/error-catalog.md`，在 `| 2003 | BANNED | ... |` 行之后插入：

```markdown
| 2004 | BIND_TICKET_INVALID | AUTH | 绑定票据无效（不存在/过期/已用/自绑/无身份可绑） | 绑定已失效，请重新登录后重试 | account.bindConfirm |
```

#### 2.3.2 改写"已登记缺口"段落（保留历史，标注已关闭）

原段落（第 38-41 行附近）以"合同冻结仅 14 码…建议新增 `2004`"结尾。改为：

```markdown
> **缺口已关闭（2026-10-27，ADR-0011 缺口 2 解冻）**：原 AT-2201 因合同仅 14 码而让票据失败复用
> **2001**，导致客户端拉登录而非提示"重新发起绑定"（UX 语义错位，见 DESIGN-0001 §2）。
> 现新增 **2004 BIND_TICKET_INVALID**，`account.bindConfirm` 五处失败分支（不存在/已用/过期/自绑/无身份）
> 统一返回该码；码值 2001 恢复其"未登录"单一语义。
> **历史留痕**：解冻前的复用决策见 ADR-0011 §缺口 2（已翻 accepted）。
```

**判据**：`grep -c "建议新增" docs/03_solution/data/error-catalog.md` → 0。

### 2.4 `ADR-0011`：状态翻转 + 修正错误事实来源

#### 2.4.1 front matter

```yaml
-status: proposed
+status: accepted
```

#### 2.4.2 修正"事实来源"里的错误定位（**关键**）

原文：

```markdown
- `server/src/modules/save/service.ts:119`：绑定票据失败复用 `NOT_LOGGED_IN(2001)`
```

改为：

```markdown
- `server/src/modules/account/service.ts:118-127`：绑定票据失败复用 `NOT_LOGGED_IN(2001)`
  （**2026-10-27 更正**：原记 `save/service.ts:119` 系搬迁后未同步，该文件内无票据逻辑）
```

#### 2.4.3 改写"决策"段

把"三项均标 proposed / 未裁决"改为分项结论：

```markdown
## 决策（2026-10-27 更新）

| 缺口 | 结论 | 落地 |
|---|---|---|
| 缺口 1 · sell 动作 | **已解冻并实现** | 选 A（服务端权威 + `ledger_entry` 影子校验），TASK-4006，commit `23ee575` |
| 缺口 2 · 2004 码 | **已解冻并实现** | 选 A，TASK-4015，本步骤 |
| 缺口 3 · 赶海 ops 载体 | **仍 proposed，延后至 v1.1** | 未裁决；`event_session` 无 ops 字段的现状保留，见 plan-v005/13 |

`packages/contracts/**` 的禁改窗口自本 ADR 翻 accepted 起**重新封闭**（除新 ADR 授权）。
```

**判据**：`grep -n "status:" docs/03_solution/decisions/ADR-0011-contract-gaps.md` → `accepted`。

### 2.5 全量闸门复跑

```bash
npm run gen > /tmp/wdf_gen_w1.log 2>&1; echo "GEN EXIT=$?"
npm run verify > /tmp/wdf_verify_w1.log 2>&1; echo "VERIFY EXIT=$?"
grep -E "^ℹ (tests|pass|fail)|守卫" /tmp/wdf_verify_w1.log
```

> `gen` 会重生成 `catalog`（动作目录）与 `docs-index`（含 `task-index`），并同步 client 副本。**必须跑**，否则 `docs-index` 与 `task-index` 继续滞后（`01` `F-10`/`E-19`）。

**通过判据**：`VERIFY EXIT=0`。

## 3. 验收断言

| # | 断言 | 命令 | 期望 |
|---|---|---|---|
| V-1.1 | 15 码在四处一致 | `grep -c "BIND_TICKET_INVALID" packages/contracts/src/common/errors.ts packages/contracts/src/common/ux.ts tests/contract/ux.test.mjs docs/03_solution/design/DESIGN-0001-ux-states.md` | 四行各 ≥1 |
| V-1.2 | catalog 有 2004 正式行 | `grep -n "2004" docs/03_solution/data/error-catalog.md` | 命中表格行 |
| V-1.3 | 服务端五处返回 2004 | `grep -c "BIND_TICKET_INVALID" server/src/modules/account/service.ts` | = 5 |
| V-1.4 | 2001 未被一刀切 | `grep -c "ERR.NOT_LOGGED_IN" server/src/modules/account/service.ts` | ≥1 且 ≠5 |
| V-1.5 | ADR-0011 accepted | `grep -n "^status:" docs/03_solution/decisions/ADR-0011-contract-gaps.md` | `accepted` |
| V-1.6 | verify 全绿 | `npm run verify` | `EXIT=0` |
| V-1.7 | 集成测断言 2004 | `grep -c "2004" tests/integration/bind.test.mjs` | ≥5 |

## 4. 提交边界

**一次提交**：

```text
feat(4015): 2004 BIND_TICKET_INVALID 全链路生效 + ADR-0011 翻 accepted

- server/src/modules/account/service.ts：bindConfirm 五处失败分支 2001 → 2004
- tests/integration/bind.test.mjs：五条断言 + 标题/注释跟进
- docs/03_solution/data/error-catalog.md：2004 正式登记，缺口段落标注已关闭
- docs/03_solution/decisions/ADR-0011-contract-gaps.md：status accepted + 修正票据校验位置
  （save/service.ts:119 → account/service.ts:118-127）+ 三缺口结论分项落定
```

> **D-24 补充**：`SellReq.merchantId` 的类型补齐已在 W0 随 `sync` 一并落定（服务端 `payload.ts:52` 早已支持），本步不再重复提交，仅在 commit message 附注"类型对齐已在 W0 完成"。

## 5. 风险与回退

| 风险 | 概率 | 影响 | 预案 |
|---|---|---|---|
| 误把非票据场景的 2001 也改掉 | 中 | 登录失败语义混乱 | V-1.4 双判据卡住（≥1 且 ≠5） |
| `bind.test.mjs` 有未发现的第 6 处 2001 断言 | 中 | 测试红 | 实际以 `grep -c 2001 tests/integration/bind.test.mjs` 结果为准，改到 0 |
| `npm run gen` 覆盖了 W0 的 `DESIGN-0001` 手改 | 极低 | 文档回退 | `gen` 不处理 `docs/03_solution/design`，仅产出索引 |
| 客户端侧收到 2004 但 `RpcClient` 未触发登出 | 低 | 玩家卡在错误页 | `RpcClient` 的 2002 静默刷新逻辑不含 2004；2004 由 UI 层 `toUxState(next:'login')` 处理，属设计预期 |

**回退**：`git checkout -- server/src/modules/account/service.ts tests/integration/bind.test.mjs docs/03_solution/data/error-catalog.md docs/03_solution/decisions/ADR-0011-contract-gaps.md`。
