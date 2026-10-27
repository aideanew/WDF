---
id: PLAN-V005-05
title: 执行 DAG（8 波次 · 冲突矩阵 · 关键路径 · 出口判据）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V005-04, PLAN-V005-03]
---

# 05 · 执行 DAG

> 8 个波次 = 8 个步骤文件 = 8 次可提交的收敛。**波次内不许回头改上一波的文件**（发现要改 → 回上一波重开）。

## 1. 波次总览

| 波次 | 步骤文件 | 主题 | 卡 | 前置 | 出口闸门 | 规模 |
|---|---|---|---|---|---|---|
| **W0** | `06` | 止血：让 verify 回绿 | 4015 前置 + 4007 补证 | 无 | `guard` 0 红 + `test` 0 红 | S |
| **W1** | `07` | 契约解冻收尾（2004 全链路） | 4015 | W0 | `verify` 全绿 + 15 码四处对齐 | S |
| **W2** | `08` | **幂等 rid 注入** + 背包回收入口 + 弹窗组件 | **4020** + 4008 | W1 | 类型检查零错 + 单测 + EVD | M |
| **W3** | `09` | 开箱机制（规则单源 + `chest.open` 契约 + 最小 UI） | 4009（重构为 a/b） | W2 | `verify` 绿 + 集成测 + probe 不劣化 | L |
| **W4** | `10` | 测试矩阵补强（防假绿） | 4017 / 4018 | W3 | 新增断言全绿 + `pass ≥ 158` | M |
| **W5** | `11` | 真机证据与命中率采样（合法降级） | 4010 / 4011 | W3 | EVD 含 UNKNOWN 或实采数据 | S |
| **W6** | `12` | 合规清单 + 四文档对齐 | 4013 / 4016 | W1（4016 需 W1） | `guard` 绿 + 索引收录 40xx | S |
| **W7** | `13` | v1.1 种子与空表清欠登记 | 4019 | W6 | 登记册落盘，不改业务代码 | S |

## 2. DAG

```text
                        ┌──────────────────────────────────────────┐
                        │ W0 止血（06）                             │
                        │  · sync 三件套                            │
                        │  · ux.test 14→15 + DESIGN-0001 §2         │
                        │  · 补录 EVD-4007 + 类型检查复跑            │
                        └───────────────┬──────────────────────────┘
                                        │ verify 绿（硬门）
                                        ▼
                        ┌──────────────────────────────────────────┐
                        │ W1 契约收口（07 / TASK-4015）              │
                        │  · account/service.ts 五处错误码           │
                        │  · error-catalog 2004 正式登记            │
                        │  · ADR-0011 → accepted                    │
                        └───────────────┬──────────────────────────┘
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
        ┌────────────────────────────┐        ┌────────────────────────────┐
        │ W2 回收+rid（08/4020,4008）│        │ W6 合规+文档（12/4013,4016）│
        │  · 4020 RpcClient 自动 rid │        │  · review-checklist 落内容    │
        │  · 行容器重构 + addButton  │        │  · 四文档对齐 + gen:docs      │
        │  · addConfirmDialog        │        │  （4016 需 W1，4013 随时可做） │
        │  · EconomyModel 只增导出   │        └────────────────────────────┘
        └───────────────┬────────────┘
                        │ 组件工厂 + rid 就绪
                        ▼
        ┌────────────────────────────────────────────┐
        │ W3 开箱机制（09/4009→a+b）                  │
        │  · screen-salvage.md（先文档）              │
        │  · D-32 开锁次数单源（locks.csv 权威）      │
        │  · D-31 新增 chest.open（ADR-0013）          │
        │  · chest 服务端三件套 + 保底口径(D-27)      │
        │  · chests.csv 加 item_id（D-19）             │
        │  · 最小 UI：背包"打开" + 连点               │
        └───────────────┬────────────────────────────┘
                     ┌──┴──────────────────┐
                     ▼                     ▼
        ┌────────────────────────┐  ┌────────────────────────────┐
        │ W4 测试补强（10）       │  │ W5 真机+采样（11/4010,4011） │
        │  · 契约防漂移           │  │  · 四面板录屏（缺则 UNKNOWN） │
        │  · salvage 集成测       │  │  · 首钩 60 次采样（缺则 UNKNOWN）│
        │  · UI 走查清单模板       │  └────────────────────────────┘
        └───────────┬────────────┘
                    ▼
        ┌────────────────────────────────────────────┐
        │ W7 v1.1 种子（13 / 4019）                   │
        │  · 35 空表清欠计划 + buyQuota 解冻 + 8 handler │
        └────────────────────────────────────────────┘
```

## 3. 关键路径

```text
W0 ──► W1 ──► W2 ──► W3 ──► W5 ──► (v1.0 出口)
                  └──► W4 ──┘
W6 与 W2/W3 并行（只动 docs，不动代码）
W7 在 W6 之后（要引用 W6 更新过的 roadmap）
```

- **关键路径长度 = 5 个波次**（W0→W1→W2→W3→W5）。
- **可并行的两处**：
  1. `W6(4013 合规清单)` 与 `W1/W2/W3` 完全并行（不同目录、不同文件类型）。
  2. `W5(4011 采样脚本)` 的**脚本编写部分**可与 W0 并行（`tools/sample-hook-hitrate.mjs` 是独立新文件）；但**采样执行**必须等 W3（否则打捞流程未定稿）。
- **不可并行的原因（硬证据）**：
  - W2 与 W3 共享 `client/.../app/panel-ui.ts`（W2 建三个工厂，W3 复用）→ 同文件，必串行。
  - W3 与 W4 共享 `tests/**` 与 `salvage` 服务端 → W4 的断言必须针对 W3 的最终实现写，否则返工。
  - W0 与 W1 共享 `packages/contracts` 三文件 → W0 先把它们 sync 归位，W1 才在绿的基线上继续改。

## 4. 文件级冲突矩阵（谁能和谁并行）

| | W0 | W1 | W2 | W3 | W4 | W5 | W6 | W7 |
|---|---|---|---|---|---|---|---|---|
| **W0** | — | ✗ 同 contracts | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **W1** | ✗ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **W2** | ✓ | ✓ | — | ✗ panel-ui | ✓ | ✓ | ✓ | ✓ |
| **W3** | ✓ | ✓ | ✗ | — | ✗ tests+salvage | ✓ | ✓ | ✓ |
| **W4** | ✓ | ✓ | ✓ | ✗ | — | ✓ | ✓ | ✓ |
| **W5** | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| **W6** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✗ 需 W6 产物 |
| **W7** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | — |

**唯一例外**：`docs/06_validation/evidence/EVD-xxxx/` 各自独立子目录，任意两波互不冲突。

## 5. 每波出口判据（不满足不得进下一波）

### 5.1 W0 出口

| # | 判据 | 命令 |
|---|---|---|
| V-0.1 | `guard` 0 红 | `npm run guard` |
| V-0.2 | `test` 0 红（≥127 例） | `npm test` |
| V-0.3 | 客户端类型检查 0 错 | `npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 \| grep -v "^C:/"` 输出为空 |
| V-0.4 | `EVD-4007/` 存在且含五要素 | `ls docs/06_validation/evidence/EVD-4007/` |

### 5.2 W1 出口

| # | 判据 | 命令 |
|---|---|---|
| V-1.1 | 15 码在四处一致（`errors.ts` / `ux.ts` / `ux.test.mjs` / `DESIGN-0001`） | `grep -c` 四处对照 |
| V-1.2 | `error-catalog.md` 有 2004 正式行（非"建议"） | `grep -n "2004" docs/03_solution/data/error-catalog.md` |
| V-1.3 | 绑定失败返回 2004（集成测断言） | `npm test`（`tests/integration/bind.test.mjs`） |
| V-1.4 | ADR-0011 `status: accepted` | `grep status docs/03_solution/decisions/ADR-0011-*.md` |
| V-1.5 | `npm run verify` 全绿 | `npm run verify` |

### 5.3 W2 出口

| # | 判据 | 命令 |
|---|---|---|
| V-2.0 | **幂等 rid 已注入**（4020）：契约里 `idempotent:true` 动作数 = 13，且 `RpcClient` 含自动补逻辑 | `npm test -- --test-name-pattern="rid"` |
| V-2.1 | `addConfirmDialog` / `addButton` / `addRow` 存在于 `panel-ui.ts` | `grep -n "^export function add" client/assets/scripts/app/panel-ui.ts` |
| V-2.2 | 背包行有按钮，`known` 判定下沉 model | `grep -n "isKnown\|knownIds" client/.../inventory/model/InventoryModel.ts` |
| V-2.3 | 4007 的既有断言仍绿（未破坏） | `npm test -- --test-name-pattern="merchant"` |
| V-2.4 | 类型检查 0 错 | V-0.3 同式 |
| V-2.5 | `EVD-4008/` 五要素齐 | `ls docs/06_validation/evidence/EVD-4008/` |

### 5.4 W3 出口

| # | 判据 | 命令 |
|---|---|---|
| V-3.1 | `chest.open` 已在三处注册（契约/网关/schema） | `grep -ln "chest.open" packages/contracts/src/common/actions.ts server/src/gateway/handlers.ts server/src/gateway/payload.ts` |
| V-3.2 | `chest` 三件套非空壳（≥30 行/件） | `wc -l server/src/modules/chest/*.ts` |
| V-3.3 | 开锁次数单源（`locks.csv` ↔ `LOCK_HITS_FALLBACK` 五行全等） | `npm test -- --test-name-pattern="chest"` |
| V-3.4 | 集成测：开箱成功 → `ledger_entry` 有 `type='chest'` 行；`hitsUsed` 不足 → 1001 且不写账 | `npm test -- --test-name-pattern="chest.open"` |
| V-3.5 | `npm run probe` 断言仍全绿（未劣化） | `npm run probe` |
| V-3.6 | `screen-salvage.md` 存在且含 7 态 | `ls docs/03_solution/ui/screen-salvage.md` |
| V-3.7 | `salvage.claimInfo` **仍为 todo**（未被错用） | `grep -n "salvage.claimInfo" server/src/gateway/handlers.ts` |
| V-3.8 | `npm run verify` 全绿 | `npm run verify` |
| V-3.9 | 真机断言记 **UNKNOWN**（`F-17` 路径不可达） | `grep -c "UNKNOWN" docs/06_validation/evidence/EVD-4009/README.md` |

### 5.5 W4 出口

| # | 判据 | 命令 |
|---|---|---|
| V-4.1 | 新增断言数 ≥ 12 | `npm test` 输出 tests 计数对比 |
| V-4.2 | 契约防漂移守卫：`ERR` 与 `UX_BY_ERROR_NAME` 键集相等 | 已有（`ux.test.mjs`）+ 新增动作集断言 |
| V-4.3 | UI 走查清单模板落盘 | `ls docs/06_validation/templates/ui-walkthrough.md` |

### 5.6 W5 出口

| # | 判据 | 命令 |
|---|---|---|
| V-5.1 | `tools/sample-hook-hitrate.mjs` 可 `--dry-run` | `node tools/sample-hook-hitrate.mjs --dry-run` |
| V-5.2 | `EVD-4010/` 有录屏或**显式 UNKNOWN 标注** | `ls docs/06_validation/evidence/EVD-4010/` |
| V-5.3 | `EVD-4011/` 有采样表或**显式 UNKNOWN 标注** | `ls docs/06_validation/evidence/EVD-4011/` |

### 5.7 W6 出口

| # | 判据 | 命令 |
|---|---|---|
| V-6.1 | `review-checklist.md` 正文 > 60 行且无"待编写" | `grep -c "待编写" docs/07_release/compliance/review-checklist.md` → 0 |
| V-6.2 | `task-index.md` 收录全部 40xx | `grep -c "TASK-40" docs/05_execution/task-index.md` |
| V-6.3 | `current-plan.md` 不再出现"plan-v003 为当前" | `grep -n "plan-v00" docs/04_planning/current-plan.md` 人工核对 |
| V-6.4 | `guard` 绿（front matter 全过） | `npm run guard` |

### 5.8 W7 出口

| # | 判据 | 命令 |
|---|---|---|
| V-7.1 | v1.1 种子清单含 35 空表逐张负责人/来源状态 | `ls docs/04_planning/plan-v006/` 或 `plan-v005/13` 附录 |
| V-7.2 | 未改任何业务代码 | `git diff --stat` 仅 docs |

## 6. 波次与 plan-v004 卡号的映射（防止编号混乱）

| plan-v004 卡 | plan-v005 处置 | 新波次 |
|---|---|---|
| 4007 | 代码已完，**补证据** | W0 |
| 4008 | 保留卡号，**扩容清单**（D-23） | W2 |
| 4009 | **重构为 4009a（规则+服务端）/ 4009b（最小 UI）/ 4009c（可达性→4022）**（D-22/D-27/D-31/D-32/D-33） | W3 |
| 4010 | 保留卡号，**降级判据显式化** | W5 |
| 4011 | 保留卡号，**脚本与执行分离** | W5 |
| 4012 | 已 PASS，不再处置 | — |
| 4013 | 保留卡号，**补软著时效核对** | W6 |
| 4015 | 保留卡号，**改目标文件 + 补测试**（D-21/D-25） | W0+W1 |
| 4016 | 保留卡号，**增 gen:docs 步骤 + 已知局限清单** | W6 |
| **4017**（新） | 契约与数据交叉断言（动作覆盖 / 表引用非空 / 单源一致 / 价格覆盖） | W4 |
| **4018**（新） | EVD 五要素规范 + UI 走查模板 + `check:types` 命令化 | W4 |
| **4019**（新） | v1.1 种子登记（35 空表分级 / 9 todo 依赖真相 / 波次建议） | W7 |
| **4020**（新） | **客户端幂等 rid 注入**（`F-13`）：RpcClient 按 `ACTIONS[].idempotent` 自动补 | W2 |
| **4021**（新，条件触发） | 4007 遗留小修（若 W0 §2.3.3 扫出魔法数字） | W2 附带 |
| **4022**（新，v1.1） | **开箱可达性**：填 `drops`/`spawns` + 给箱子配锁（需设计源） | v1.1-W0 |
