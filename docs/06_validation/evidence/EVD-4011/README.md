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
