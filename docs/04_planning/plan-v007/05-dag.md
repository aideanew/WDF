---
id: PLAN-V007-05
title: 执行 DAG（5 波次 · 冲突矩阵 · 出口判据）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V007-04]
---

# 05 · 执行 DAG

> 5 个波次 = 5 个步骤文件。**波次内不回头改上一波的文件**（发现要改 → 回上一波重开）。

## 1. 波次总览

| 波次 | 步骤文件 | 主题 | 卡 | 前置 | 出口闸门 | 规模 |
|---|---|---|---|---|---|---|
| **W0** | `06` | **基础链路**：rid 注入 + 4008 三处收尾 | 4020 / 4008 | D-34~D-36 已裁决 | `verify` 绿 + 记录从 128 增到 ≥132 | S |
| **W1** | `07` | **开箱全栈**：文档→规则单源→契约→服务端→UI | 4009 | W0 | `verify` 绿 + 集成测 + `probe` 不劣化 | L |
| **W2** | `08` | **文档收口**：4 处残留 + EVD 三份补录 | — | W1 | `guard` 绿 + 4 处残留归零 + EVD 齐 | S |
| **W3** | `09` | **真机降级 + 合规** | 4010 / 4011 / 4013 | W1（4013 随时可做） | 脚本 `--dry-run` 通过 + UNKNOWN 带上下文 + 清单无"待编写" | M |
| **W4** | `10` | **v1.0 宣告**：四文档对齐 + v1.1 种子 | 4016 | W2 | `guard` 绿 + 索引收录 + 已知局限 7 条 | S |

## 2. DAG

```text
              ┌──────────────────────────────────────────────┐
              │ W0 基础链路（06）                             │
              │  · 4020 RpcClient 自动 rid（写入 meta，非 payload）│
              │  · 4008 收尾：addButton 抽取 / merchantId / count 守卫│
              │  · 修卡：4020 步骤 2、4008 允许清单            │
              └───────────────────┬──────────────────────────┘
                                  │ rid 生效 + 按钮可复用
                                  ▼
              ┌──────────────────────────────────────────────┐
              │ W1 开箱全栈（07）                             │
              │  1 screen-salvage.md（先文档，7 态）           │
              │  2 game-core：attempt 增 required，LOCK_HITS 降级│
              │  3 chests.csv +item_id（D-19）                 │
              │  4 chest.open 契约 + ADR-0013                  │
              │  5 chest 服务端三件套（保底 item_0020，D-27）  │
              │  6 客户端：背包"打开" + 连点 UI               │
              └───────┬────────────────────────────┬─────────┘
                      │                            │
                      ▼                            ▼
      ┌────────────────────────────┐  ┌────────────────────────────────┐
      │ W2 文档收口（08）           │  │ W3 真机+合规（09）             │
      │  · DESIGN-0001 补 2004      │  │  · 4011 采样脚本 + SIMULATED   │
      │  · ADR-0011 修位置笔误      │  │  · 4010 真机 UNKNOWN + 手册    │
      │  · error-catalog 删旧"建议" │  │  · 4013 合规清单实体化         │
      │  · current-plan 指向 v007   │  └────────────────────────────────┘
      │  · EVD 4007/4008/4015 补录  │
      └───────────────┬────────────┘
                      ▼
      ┌────────────────────────────────────────────┐
      │ W4 v1.0 宣告（10）                          │
      │  · 4016 四文档对齐 + 已知局限 7 条          │
      │  · gen:docs 索引收录                         │
      │  · v1.1 种子（35 空表分级 / 9 todo / 4022） │
      └────────────────────────────────────────────┘
```

## 3. 关键路径

```text
W0 ──► W1 ──► W4          （W2、W3 均可与 W1 后的部分并行）
        └──► W2 ──┘
        └──► W3
```

- **关键路径长度 = 3**（W0 → W1 → W4）。
- **可并行组**：
  - `W2` 与 `W3` 完全并行（不同目录，W2 动 `docs/03_solution` + EVD，W3 动 `tools/` + `docs/07_release`）。
  - `4013(合规清单)` 可与 W0/W1 **全程并行**（只动 `docs/07_release/compliance/**`）。
  - `4011 的脚本编写` 可与 W0 并行（`tools/sample-hook-hitrate.mjs` 是新文件，零冲突）；但**采样执行**必须等 W1（流程定稿）。

### 3.1 不可并行的硬理由

| 对 | 冲突文件 | 说明 |
|---|---|---|
| W0 ↔ W1 | `app/panel-ui.ts` | W0 抽 `addButton`，W1 复用；同文件必串行 |
| W1 ↔ W2 | `docs/03_solution/data/error-catalog.md` | W1 加 `chest.open` 错误路径，W2 删旧"建议"；同文件 |
| W1 ↔ W3 | 无直接冲突，但 4010 的真机验收对象是 W1 产物 → 逻辑依赖 | 真机必须等 W1 |
| W2 ↔ W4 | `current-plan.md` / `roadmap.md` | W2 改指向，W4 再校准；允许两次改但要串行 |

## 4. 文件级冲突矩阵

| | W0 | W1 | W2 | W3 | W4 |
|---|---|---|---|---|---|
| **W0** | — | ✗ panel-ui | ✓ | ✓ | ✓ |
| **W1** | ✗ | — | ✗ error-catalog | ✓ | ✓ |
| **W2** | ✓ | ✗ | — | ✓ | ✗ current-plan |
| **W3** | ✓ | ✓ | ✓ | — | ✓ |
| **W4** | ✓ | ✓ | ✗ | ✓ | — |

## 5. 每波出口判据

### 5.1 W0 出口

| # | 判据 | 命令 | 期望 |
|---|---|---|---|
| V-0.1 | rid 注入生效（写进 `meta`） | `grep -n "ACTIONS\[action\]?.idempotent" client/assets/scripts/services/net/RpcClient.ts` | 命中 |
| V-0.2 | 重试复用同一 rid | `grep -n "invoke<P, D>(action, params, effectiveRid, true)" client/assets/scripts/services/net/RpcClient.ts` | 命中 |
| V-0.3 | `addButton` 已抽出且被 4008 使用 | `grep -c "addButton" client/assets/scripts/app/panel-ui.ts client/assets/scripts/features/inventory/view/InventoryPanel.ts` | 两文件各 ≥1 |
| V-0.4 | 回收带 `merchantId` + `count>0` 守卫 | `grep -n "merchantId\|count <= 0\|count < 1" client/.../InventoryPanel.ts` | 命中 |
| V-0.5 | 测试数从 128 增到 **≥132** 且全绿 | `npm test` | `pass ≥132 / fail 0` |
| V-0.6 | 类型检查零错 | `tsc … \| grep -v "^C:/"` | 输出空 |
| V-0.7 | `npm run verify` 绿 | `npm run verify` | `EXIT=0` |

### 5.2 W1 出口

| # | 判据 | 命令 | 期望 |
|---|---|---|---|
| V-1.1 | `screen-salvage.md` 存在且含 `lock-playing`/`lock-failed` | `grep -c "lock-playing\|lock-failed" docs/03_solution/ui/screen-salvage.md` | ≥2 |
| V-1.2 | 开锁次数单源 | `npm test -- --test-name-pattern="chest"` | 全绿（含"CSV↔FALLBACK 全等"断言） |
| V-1.3 | `chests.csv` 有 `item_id` 且 3 行有效 | `grep -c "item_006" game-data/source/chests.csv` | 3 |
| V-1.4 | `chest.open` 三处登记 | `grep -ln "chest.open" packages/contracts/src/common/actions.ts server/src/gateway/{handlers,payload}.ts` | 3 文件 |
| V-1.5 | 服务端三件套非空壳 | `wc -l server/src/modules/chest/*.ts` | 各 ≥30 |
| V-1.6 | 集成测 6 例（含幂等重放、hitsUsed 不足、保底=item_0020） | `npm test -- --test-name-pattern="chest.open"` | 全绿 |
| V-1.7 | `salvage.claimInfo` 仍 `todo`（未被错用） | `grep -n "salvage.claimInfo" server/src/gateway/handlers.ts` | 命中 `todo` |
| V-1.8 | `probe` 未劣化 | `npm run probe` | 全绿 |
| V-1.9 | `verify` 绿 | `npm run verify` | `EXIT=0` |
| V-1.10 | 真机断言 = UNKNOWN 且写明缺什么 | `grep -c "UNKNOWN" docs/06_validation/evidence/EVD-4009/README.md` | ≥1 且含"缺真机"字样 |

### 5.3 W2 出口

| # | 判据 | 命令 | 期望 |
|---|---|---|---|
| V-2.1 | `DESIGN-0001` 有 2004 | `grep -c "2004" docs/03_solution/design/DESIGN-0001-ux-states.md` | ≥1 |
| V-2.2 | `ADR-0011` 不再指向 `save/service.ts` | `grep -c "save/service.ts" docs/03_solution/decisions/ADR-0011-contract-gaps.md` | **0**（或仅为"更正注记"内引用且带"原文误记"字样） |
| V-2.3 | `error-catalog` 无"建议新增"表述 | `grep -c "建议新增" docs/03_solution/data/error-catalog.md` | **0** |
| V-2.4 | `current-plan` 指向 v007 | `grep -c "plan-v007" docs/04_planning/current-plan.md` | ≥1 |
| V-2.5 | 三份 EVD 五要素齐 | `for d in 4007 4008 4015; do grep -c "## ⑤" docs/06_validation/evidence/EVD-$d/README.md; done` | 各 1 |
| V-2.6 | `guard` 绿 | `npm run guard` | `EXIT=0` |

### 5.4 W3 出口

| # | 判据 | 命令 | 期望 |
|---|---|---|---|
| V-3.1 | 采样脚本可 dry-run | `node tools/sample-hook-hitrate.mjs --dry-run` | `EXIT=0` |
| V-3.2 | 模拟可复现 | 同参跑两次 `--simulate 1000 --seed 42` | 输出 diff 为空 |
| V-3.3 | `hitrate.md` 标 SIMULATED 且无 MEASURED | `grep -c "MEASURED" docs/06_validation/evidence/EVD-4011/hitrate.md` | **0** |
| V-3.4 | 合规清单无空壳 | `grep -c "待编写" docs/07_release/compliance/review-checklist.md` | **0** |
| V-3.5 | 清单可勾选项 ≥20 | `grep -c "^- \[ \]" docs/07_release/compliance/review-checklist.md` | ≥20 |

### 5.5 W4 出口

| # | 判据 | 命令 | 期望 |
|---|---|---|---|
| V-4.1 | 索引收录全部 40xx | `grep -c "TASK-40" docs/05_execution/task-index.md` | ≥13（4007~4020） |
| V-4.2 | `current-plan` 有已知局限 7 条 | `grep -c "^| L[0-9]" docs/04_planning/current-plan.md` | 7 |
| V-4.3 | `roadmap` 指向 v007 | `grep -c "plan-v007" docs/04_planning/roadmap.md` | ≥1 |
| V-4.4 | `glossary` 补 6 术语 | `grep -cE "影子账本\|幂等 rid\|可达性\|EVD 五要素\|MEASURED\|UNKNOWN" docs/00_governance/glossary.md` | ≥6 |
| V-4.5 | `verify` 全绿 | `npm run verify` | `EXIT=0` |

## 6. 卡号映射（v004 → v007 处置）

| 卡 | v007 处置 | 波次 |
|---|---|---|
| 4007 / 4008 / 4015 | 代码完成，**补 EVD**（4008 另加 3 处收尾） | W0 / W2 |
| 4009 | **保留卡号，按 D-37/D-38/D-39 修卡后执行** | W1 |
| 4010 / 4011 | 保留，按 D-41 降级 | W3 |
| 4013 | 保留，补软著时效核对 | W3 |
| 4016 | 保留，增 `gen:docs` + 已知局限 7 条 | W4 |
| 4020 | **保留卡号，修正步骤 2（rid 进 `meta`）** | W0 |
| 4021（v005 提，未建） | 取消：其内容已并入 W0 §2.3（`addButton`） | — |
| 4022（新，v1.1） | 开箱可达性：填 `drops`/`spawns` + 给箱子配锁 | v1.1 |
