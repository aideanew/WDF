---
id: PLAN-V010-08
title: plan-v010 · 阶段体检协议与完成定义
status: active
module: planning
owner: hark
created: 2026-10-28
review: 2026-11-11
related: [PLAN-V010-05, PLAN-V010-06]
---

# 08 · 阶段体检协议与完成定义

> 本文件是**执行纪律**，不是建议。用户 2026-10-27 明确：
> **「按阶段体检效率最高。单张卡只跑它改到的测试。每个阶段做完，只给这个阶段动过的模块体检一次；
> 全量回归等开发全部完成或发版前统一跑一次。」**

## 1. 三级体检（默认只用第 1 级）

| 级别 | 命令 | 什么时候跑 | 耗时 |
|---|---|---|---|
| **L1 · 单卡** | 见 §2 模板 | **每张卡完成时** | 10~60s |
| **L2 · 切片** | `npm run stage <kw>`（TASK-7050 产出前用 §3 手工版） | S0/S1/S2/S4/S5 各自收尾时 | 1~3min |
| **L3 · 全量** | `npm run verify` | **只在 S5 收尾与发版前** | 3~5min |

**禁止**：
- ❌ 用 L3 代替 L1（"我就改了个注释，全量确认一下"——这是被明确禁止的习惯，见 `03 N-6`）
- ❌ 在 L1 里加 `--test-reporter` 等额外参数导致输出不可判
- ❌ 一次提交里混两张卡的改动（否则 L1 无法定向）

## 2. L1 单卡体检模板

```bash
# ① 先圈影响面（本项目已有工具，不要手猜）
npm run impact <模块名或表名或动作名>

# ② 定向跑该模块的测试文件（按 impact 结果替换）
node --import ./tools/runtime/register.mjs --test \
  tests/determinism/<module>.test.mjs \
  tests/integration/<module>*.test.mjs \
  tests/contract/<module>*.test.mjs

# ③ 只在本卡动了这些层时才跑对应类型检查
npm run typecheck:client     # 只动了 client/**
npm run typecheck:server     # 只动了 server/** 或 packages/**
```

**判据**：退出码 `0` 即通过。**不看日志里有没有红字**（有些测试故意打印错误路径）。

### 2.1 按卡类型选体检项（照抄，不判断）

| 卡类型 | 必跑 | 可不跑 |
|---|---|---|
| 只改注释 / 文档 | `npm run gen:docs` + `npm run guard` | 所有测试 |
| 改 `tools/**` | 该工具的 `--help` 自测 + 受影响的 `npm run guard` | 业务测试 |
| 改 `packages/game-core/**` | `tests/determinism/<module>*.test.mjs` + `npm run typecheck:server` | client 测试 |
| 改 `server/**` | `tests/integration/<module>*.test.mjs` + `npm run typecheck:server` | client 测试 |
| 改 `client/**` | `npm run typecheck:client`（**Cocos 运行时不可测**） | 所有 `node --test` |
| 改 `game-data/source/*.csv` | `npm run gen:config` + 依赖该表的测试 | 全部 |
| 加迁移 `0002_*.sql` | `tests/e2e/skeleton.test.mjs`（迁移在启动时执行） + 该模块集成测试 | 其余 |

> **`client/**` 那一行是本项目的硬限制**：`'cc'` 依赖使客户端代码在 Node 下无法加载。
> **"`npm test` 全绿" 对客户端改动没有证明力**，只有 `typecheck:client` + 人工录屏。

## 3. L2 切片体检（TASK-7050 落地前的临时手工版）

```bash
# S0 收尾：工具 + 注释 + 占位清单
npm run guard && npm run shells
node --import ./tools/runtime/register.mjs --test tests/contract/*.test.mjs

# S1 收尾：账号 + 合规
node --import ./tools/runtime/register.mjs --test \
  tests/integration/auth.test.mjs tests/integration/bind.test.mjs tests/integration/compliance.test.mjs
npm run typecheck

# S2 收尾：广告
node --import ./tools/runtime/register.mjs --test tests/integration/ads.test.mjs tests/integration/payload.test.mjs

# S4 收尾：客户端
npm run typecheck:client
```

## 4. 完成定义（全项目唯一口径）

一张卡算 `Done`，当且仅当**七条全满足**：

```
1. 所有权内 diff —— 只改了卡里「允许修改」列出的路径
2. 验收条目 —— 逐条有结果（不是"应该没问题"）
3. 可复现 —— 验证命令别人跑一遍得到同样结果
4. evidence —— docs/06_validation/evidence/EVD-xxxx/ 能让一周后的人复现，不用问原作者
5. guard 通过 —— npm run guard 全绿（改了文档的还要 gen:docs 后无 diff）
6. 无新增同类错误 —— 不引入新的"注释说谎"「自造码」「占位当真实」
7. 未改冻结契约 —— 除非本卡就是改契约（本版除 ADR-0015 外不允许）
```

**`Done` ≠** 模型说完成 ≠ 代码写完 ≠ 推到 GitHub。

## 5. 防自证循环

| 角色 | 谁 |
|---|---|
| 写验收标准 | **规划阶段（本文件 + 各卡）** |
| 执行 | 开发 Agent（我 / 外部 Agent） |
| 判定 | **独立验证者**，只看 diff + 运行结果，只输出 `PASS / FAIL / UNKNOWN`，不写长篇解释 |

**禁止**：同一个执行者既是作者又是终审。
本版里我自己执行的卡（7001/7012/7022/7014/7040/7041/7042），
判定必须走一遍"重读 diff 对照验收标准"的独立动作 —— 我把它写成**每卡完成后的自检清单**，
并在 evidence 里留下"我对照了哪几条、哪几条只能说 UNKNOWN"。

## 6. evidence 目录规范（沿用 v009）

```
docs/06_validation/evidence/EVD-<卡号>/
  README.md        # 卡号、目标、验收条目逐条结论（PASS/FAIL/UNKNOWN）
  <命令输出>.txt   # 定向测试原始输出（不要复制粘贴成"已通过"）
  录屏.mp4         # 仅 UI 卡
```

**`UNKNOWN` 是合法结论**。写了 UNKNOWN 不算失败，把 UNKNOWN 写成 PASS 才算。

## 7. 阶段收尾检查（每切片一次，共 5 次）

```text
[ ] 该切片所有卡的 evidence 目录存在且含逐条结论
[ ] npm run guard 全绿
[ ] 若改了文档：npm run gen:docs 后 git status 无 diff
[ ] 若改了 game-data：npm run gen:config 后 configVersion 变化已记录
[ ] 本切片没有引入新的自造错误码
[ ] 本切片没有新增"注释描述的行为不存在"
```

## 8. 与用户"最高效率"要求的一致性

| 用户要求 | 本协议怎么落实 |
|---|---|
| 按阶段体检 | 三级体检，默认 L1（10~60s） |
| 单卡只跑它改到的测试 | §2 模板用 `impact` 圈定，不手猜；§2.1 表格照抄不判断 |
| 全量回归只在发版前 | L3 限定在 S5 与发版前 |
| 核心 + 高难度自己做 | `06 §4` 的档位表；UI 全部 `opus` 且归主控 |
| 中低难度派外部 Agent | `06 §3` 的所有权矩阵，Agent-A/B/C/D 各管一段 |
| 记录在全局，以后都按这个来 | §1~§4 已写入 `.workbuddy/memory/MEMORY.md`，跨会话生效 |
