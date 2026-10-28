---
id: EVD-4016
title: TASK-4016 四文档对齐（error-catalog / glossary / current-plan / roadmap）
status: accepted
module: validation
owner: hark
created: 2026-10-28
review: 2026-11-28
related: [TASK-4016, PLAN-V004-06, TASK-4015, EVD-LEDGER]
---

# EVD-4016 · 四文档对齐（v1.0 收官）

## 1. 进入时的实际状态（先查再改）

| 文档 | 进入状态 | 结论 |
|---|---|---|
| `error-catalog.md` | 15 码齐全、2004 已登记、3101 事实码已登记、4015 缺口解冻记录在案 | **仅缺 2 条** → 本次补 |
| `glossary.md` | 13 条业务术语，**无 v1.0 新增技术术语** | 本次追加 10 条 |
| `current-plan.md` | 指针已指向 plan-v010（09:30 更新），但**无 v1.0 收官结论**；测试数仍写 107 | 本次补收官段 + 修正数字 |
| `roadmap.md` | 已有 v1.0 半程补齐行，但仍标"现在" | 本次改"✅ 已完成 2026-10-28" |

> 说明：4016 的"未做"不是四份都空——其中两份（current-plan 指针、roadmap 行）已在 7051 与 v010 建版时被顺带更新，本次是**补齐剩余四处**并统一口径。

## 2. 本次改动（逐项）

1. **error-catalog.md**
   - 4999 行补充：未实现动作固定返回 `4999` + `msg=FEATURE_NOT_AVAILABLE`（D-46 / TASK-7003），客户端据此区分"功能暂未开放"与"服务器故障"。
   - 新登记**仍解冻的缺口（D-14）**：无专用网络错误码，客户端网络失败回落 4999，与内部错误共码；建议下次解冻新增 `4002 NETWORK`。
2. **glossary.md** 追加 10 条：金币 / `modules.wallet` / `herbDelta` / 影子账本 / 回收基数 `recycle_bp` / PanelKey / UX 态 / EVD / FEATURE_NOT_AVAILABLE / `SAVE_SCHEMA_VERSION`。
   - 其中两条是**踩过坑的定义**：`recycle_bp` 是绝对值非万分比（D-01 修正）；`SAVE_SCHEMA_VERSION` 对开放 map 扩展不递增（§3.4）。
3. **current-plan.md**
   - 新增「v1.0 收官状态」段：plan-v003（16 卡）+ plan-v010（20 卡）并集交付与状态；明确列出**仍不在 v1.0 的四项**（开锁/salvage、防沉迷真实化与合规 UI、账号面板、真机采证），避免"收官"被读成"全功能齐备"。
   - 修正过期数字：`9 项守卫 + 107 个测试` → **`219 个测试`（determinism 128 / 契约 27 / 集成 63 / e2e 1，2026-10-28 当场复跑）**。初稿曾按"174+8=182"推算填写，实跑后更正——**文档里的数字必须来自当场复跑，不能由前值推算**（已记入台账 §8）。
4. **roadmap.md**：v1.0 半程补齐行改 ✅ 已完成 2026-10-28，注明 20 卡落账 hash `9da93b7` 与 7013/7014 推迟依据（D-45=B）。
5. **plan 谱系 status**：`plan-v003/00-snapshot.md` 与 `plan-v004/00-snapshot.md` 的 `status: active` → `superseded`（与 current-plan 谱系表口径一致，避免三份同时自称 active）。

## 3. VERIFY

| 断言 | 结果 | 命令 |
|---|---|---|
| a) 四份文档与代码事实一致 | PASS | 15 码与 `errors.ts` 一一对应；`glossary` 新条目全部指向真实符号（`modules.wallet`/`toUxState`/`sellValue` 均在仓内可查） |
| b) guard 通过 | **9/9 PASS** | `npm run guard` |
| c) 文档索引同步 | PASS | `npm run gen:docs` 后 `document-index.md` 无未同步项 |
| d) 谱系唯一现行 | PASS | `plan-v003/v004` = superseded；`plan-v010` 仍 active |

## 4. 局限

- glossary 是**手维护**文件，无自动化校验"术语是否被代码使用"；本次靠人工对照 `git grep` 确认每个新条目至少有一个真实符号锚点。
- current-plan 的"收官"只表达**规划口径完成**，不代表 24 个模块全实现（实测仍 7 完成 / 3 部分 / 13 未实现，见 `plan-v010/02-requirement-inventory.md`）。
- **本文件自身不在文档索引里**：`tools/gen/docs-index.mjs:7` 跳过所有 `README.md`，而 plan-v005 §10.5 要求 EVD 证据必须命名 `README.md` —— 两条规则冲突，`EVD-4003/4004/4006/4007/4016` 五份证据均受影响。已在台账 §8.5 登记，本次不改名（会违反命名规范），留作工具侧单独修复。
