---
id: EVD-7002
title: 注释去假 + 3101 登记
status: accepted
owner: hark
created: 2026-10-28
review: 2026-11-28
---

# EVD-7002 —— 注释去假 + 3101 登记

- **对应任务**：plan-v010 TASK-7002（`05-slices-and-cards.md`）
- **执行者**：主控
- **独立验收者**：子智能体（防自证循环，结论 **PASS**）
- **采集时间**：2026-10-28
- **基线**：`f7f0248`（7001 后）

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | 全仓 grep 旧措辞结果为空 | **PASS** | `grep -rn "20 个动作\|12 件\|4 个 Tab\|5 个面板\|load+migrate"` 无命中 |
| 2 | error-catalog.md 含 3101 | **PASS** | L13/L34/L47-48；L34 标注「事实码，不在 ERR」；hook:134、raft:18 各有 `err(3101)` 调用点 |
| 3 | `npm run typecheck` exit 0 | **PASS** | client + server 双 tsc --noEmit 均 0 |
| 4 | 不改 `err(3101)` 值、不动冻结契约 | **PASS** | diff 无逻辑行；`packages/contracts/`、`server/db/migrations/` 零改动 |

## 修正清单（本卡覆盖 5 处，原卡列 4 处 + 1 处同类）

| # | 文件 | 修正 |
|---|---|---|
| 1 | `server/src/gateway/handlers.ts` 顶注 | 「12 件/20 动作」→「14 件/22 动作」+ 逐列 8 个 todo（原注释漏列 `chest.open`、`economy.sell`） |
| 2 | `client/assets/scripts/app/MainView.ts` :5 | 「4 个 Tab」→「6 个 Tab」（打捞/背包/箱子/合成/商人/榜单） |
| 3 | `client/assets/scripts/app/MainView.ts` :57 | 「挂载 5 个面板」→「6 个面板」 |
| 4 | `client/assets/scripts/app/GameApp.ts` 头部 | 「7 步启动链」→「只做 onHide 注册；真实启动链在 BootController；7 步链未实现，登记为 M-2/S-4 缺口」 |
| 5 | `server/src/gateway/payload.ts:100` | 「20 个动作」→「22 个动作」（本卡验收 #1 要求全仓 grep 为空，属同一「动作数量」家族，注释非逻辑行） |

**3101 登记**：`error-catalog.md` 增「事实码 3101 = 规则拒绝：承重/浮力不足（不在 ERR）」行 + 说明；
`hook/index.ts`、`raft/index.ts` 各加一行注释指向该登记。按 G-1 处置：**只登记不改契约**
（3101 无客户端消费者，两处都在 game-core 本地判定，收益为零代价为正）。

## 反证（独立验收者）

- HANDLERS 实测 22 键 / 8 个 todo（与注释一致）/ 14 实现。
- TABS 实测 6 元素、factories 6 个；GameApp.start() 仅 getPlatform + onHide 两行。
- ACTIONS 实测 22 个合法值（contracts/common/actions.ts）。
- diff 过滤非注释行输出为空（零逻辑改动）；generated 副本已 sync（首行 AUTO-GENERATED 横幅为正常差异）。
- `npm run guard` 9/9。

## 变更清单（单卡）

- 注释修正：handlers.ts、payload.ts、MainView.ts、GameApp.ts、game-core/{hook,raft}/index.ts
- 3101 登记：error-catalog.md
- 同步产物：`client/assets/scripts/generated/game-core/{hook,raft}/index.ts`、`_sync-manifest.json`（由 `npm run sync` 覆盖，非手改）
- 索引再生：`docs/00_governance/document-index.md`（gen:docs，补 PLAN-V010-09）

原始输出：`acceptance-greps.txt`、`guard.txt`（9/9）、`typecheck-server.txt`、`typecheck-client.txt`。
