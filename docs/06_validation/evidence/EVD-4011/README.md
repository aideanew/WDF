---
id: EVD-4011
title: 4011 首钩命中率采样（工具就绪，等人打 20 钩）
status: active
owner: hark
created: 2026-10-28
review: 2026-11-28
---

# EVD-4011 · 首钩命中率采样（W7-2）

## 状态

**BLOCKED-HUMAN**：工具与埋点已就绪（`chargeMs` 已补，`tools/sample/hook-hitrate.mjs` 已建），
**等真人打 20 钩**。本轮只提供**方向性基线**（单机单人），非 C1 达标口径。

**工具链复验（2026-10-29，PD2-01 待办确认）**：`node tools/sample/hook-hitrate.mjs --db .local/pg` 实测 **EXIT=0**，
输出「样本 0，无法计算——audit_log 无 telemetry 埋点（先跑 npm run dev:server + Cocos 预览打 20 钩，再跑本脚本）」。
**结论：工具本身无缺陷、工作正常，唯一阻塞是 `audit_log` 无真人埋点数据**——非代码待写，等真机打钩。
（`tools/sample/hook-hitrate.mjs` 已支持 `--db`/`--from`/`--help`，绝对路径修复见 FIX-19，`--from E:/tmp/x.jsonl` 亦 EXIT=0。）

## 目标（4011 要的三项指标）

| 指标 | 说明 | 工具 |
|---|---|---|
| 首钩命中率 | 每人第 1 钩是否命中 | `hook-hitrate.mjs` |
| 前 10 钩命中率 | 每人前 10 钩命中占比 | `hook-hitrate.mjs` |
| 平均/中位蓄力时长 | `chargeMs`（W7-1 已补进埋点 props） | `hook-hitrate.mjs` |

## 人工步骤（1~6，全部需要真手）

1. `npm run dev:server`（起本地服务端，占 `.local/pg` 单写锁）
2. Cocos Creator 打开工程 → **Web 预览**（`FORCE_OFFLINE=false` 已真联网）
3. 打 **20 钩**（记录：命中与否、蓄力时长由 `chargeMs` 自动采）
4. 停服务（Ctrl+C，释放单写锁——脚本会检测占用并提示"先停 dev:server"）
5. `node tools/sample/hook-hitrate.mjs`（默认读 `.local/pg`；或用 `--from <jsonl>` 读导出）
6. 把输出的 Markdown 表 + 采样口径粘贴到 `docs/06_validation/metrics.md`（**只在真有数据后生成该文件**）

## 口径如实标注

- 本证据为 **MEASURED-SINGLE（单机单人）**，**不等于** C1 的
  「30 秒学会 ≥70% / 首钩 ≥45% / 前 10 钩 40–60%」——后者需 **≥3 名真人**。
- 禁止把单机结果当作 C1 达标数据；**禁止编造任何采样数字**。
- `metrics.md` 只在真实采样后有数据时创建。

## 交付物

- `tools/sample/hook-hitrate.mjs`：聚合脚本（`--db`/`--from`/`--help`，PGlite 单写锁检测）
- 埋点 `chargeMs`（`HookModel.ts`/`HookView.ts`，W7-1）

## 机制侧分析（2026-10-29，D-52）——SIMULATED，不是真人数据

主控裁决（D-52）：4011 拆成**可自动回答的机制问题**与**只能真人回答的手感问题**两半。
机制侧已用 `tools/sample/hook-window.mjs`（复用 `packages/game-core/src/hook` 的
`powerAt` / `chargeAndCast`，**不重写公式**）跑完，结果如下。

**① 命中蓄力窗口（逐毫秒扫描，`hooks.json` 表值 `target_dist=600`、`angle_deg=15°`）**

| 项 | 值 |
|---|---|
| 蓄力周期 `cycleMs` | 1200 ms（三角波，峰值 600 ms） |
| 命中窗口 | **348–852 ms**（单段连续） |
| 窗口宽度 | 505 / 1200 = **42.1%** |
| 窗口下沿力度 | **5800 bp（58.0% 满力）** |

**② 20 钩模拟（SIMULATED，种子 20261029）**：命中 **12/20 = 60.0%**，首钩命中
（蓄力 536 ms → 8933 bp → 水平触及 862.9）。逐钩明细见工具输出，可原位复跑：

```bash
node --import ./tools/runtime/register.mjs tools/sample/hook-window.mjs
```

**③ 这两组数字能说明什么 / 不能说明什么**

- 能说明（可复跑的机制事实）：默认配置下**命中只取决于蓄力时长**落在 348–852 ms 内；
  角度按 `cos` 缩放触及距离，15° 时垂直偏移仅 ±1（`armLength=1`），对 60 的命中半径无实质影响。
  **42.1% 的窗口宽度意味着"完全不看力度条、随手一按"也有约四成命中**——这是机制上限，不是玩家表现。
- **不能**说明：真人首钩命中率。真人会盯力度条，命中率取决于观察精度与提示是否清楚，
  必须真机实测。上面的 60% 来自**均匀分布零假设**，**禁止**当作 4011 的验收数据。
- 口径：`SIMULATED`（固定种子可复跑）。**不得**引用为 `MEASURED-SINGLE` 或 C1
  （C1 的「首钩 ≥45% / 前 10 钩 40–60%」仍需 ≥3 名真人真机）。

**结论**：C1 的「首钩 ≥45%」若只看机制是**可达的**（窗口 42.1%、均匀零假设 60%），
剩下的不确定项完全落在**提示与手感**上——这正是必须真人实测的部分，工具无法替代。
