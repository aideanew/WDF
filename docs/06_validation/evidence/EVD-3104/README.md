---
id: EVD-3104
title: TASK-3104 排行榜页 验收证据
status: active
module: leaderboard
owner: agent-client-a
created: 2026-10-26
related: [TASK-3104, TASK-3001, DESIGN-0001, AT-2203]
---

# EVD-3104 · 排行榜页验收证据

## 改动文件

| 文件 | 类型 | 说明 |
|---|---|---|
| `client/assets/scripts/features/leaderboard/model/LeaderboardModel.ts` | 修改（原 6 行占位） | `fetch(scope, limit)` + 9 个只读 getter + `canFetch()` / `clear()` |
| `client/assets/scripts/features/leaderboard/view/LeaderboardPanel.ts` | 修改（原 36 行桩） | 覆写 `createLeaderboardPanel`：榜单行 + me 高亮 + 页外名次补行 + 顶部载入条 + 空态/错误/限流三态 |

**服务端零改动**（只读核对 `server/src/modules/leaderboard/service.ts`、`handlers.ts`）。

## 前置核对（只读）

| 项 | 结论 |
|---|---|
| `CURRENT_SEASON` | `'S1'`（模块常量，无 season 表） |
| 名称兜底 | `玩家${playerId.slice(-4)}`（player 表无昵称列） |
| `flagged` 玩家 | 不入榜（风控上限默认 `Infinity`，env 注入后启用） |
| `scope='province'` | 返回空 `items`（无 province 快照，契约合法） |
| `'leaderboard.query'` | `handlers.ts:44` 已接 `leaderboardHandlers`，**非 todo** |
| `query` 可能的返回码 | **只有 `0` 与 `2001`**（NOT_LOGGED_IN）。`4001` 只来自 `leaderboard.report` |

## 机器可验证项（V-08，现场实跑）

| id | 命令 | 结果 |
|---|---|---|
| V-08.a | `node --import ./tools/runtime/register.mjs --test tests/integration/leaderboard.test.mjs` | ✅ `tests 5` / `pass 5` / `fail 0` |
| V-08.b | `npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit \| grep "error TS" \| grep -v "^C:/"` | ✅ **7 个，与 BASE-34 基线逐行一致，未新增** |
| V-08.c | `npm run guard` | ✅ 9/9 |
| V-08.d | **人工**：`npm run dev:server` + 造 3 条收益 → 3 行降序；空库 → 空态；me 高亮；刷新不闪白 | ⚠ **UNKNOWN**（替代证据 = V-08.a 的内存 PGlite 集成测试；本机无法驱动 Cocos UI） |

## 关键设计

- **失败不清榜**：`_items` 只在 `invoke` 成功时替换；`loading` / 错误期间旧榜保留，只亮顶部载入条（S-08.7）。
- **界面态全走契约**：`toUxState(code)`，本文件不出现 `if (code === 2001)` 这类分支；
  `4001` 按契约通用处理（冷却 3s），但**服务端 `query` 目前不会返回它**——留着是防契约演进。
- **`me` 可能不在本页**：服务端从全量快照单独 `find`，limit=20 时名次 95 的玩家 `me` 不在 `items` 里，
  故单列 `meOffPage` getter，界面补一行"我的名次：第 N 名 · value"，而不是让用户以为没上榜。
- **冷却是点击时守卫，不是视觉置灰**：面板是工厂函数不是 `Component`，不挂定时器；
  `doRefresh()` 先查 `model.canFetch(Date.now())`，冷却内直接忽略点击（等价于禁用 3s）。

## 已知偏差与跳过项

| 项 | 说明 |
|---|---|
| 未给 `LeaderboardModel` 加 `invoke` 注入点 | 与 C-05 对 `LocalSave` 的裁决一致：注入点属基础设施改动，未获授权。代价是 S-08.4 的态映射**无法自动化**，只能靠录屏。解除条件：给 `services/net/RpcClient` 加 `setInvoker()`（一处改动可同时解锁 C-08 / C-09 / C-10 三条路径的单测） |
| 埋点跳过 | `features/telemetry/model/TelemetryModel.ts` 仍是 6 行桩，**不得自建 API**（S-08.8） |
| 无限流倒计时文本 | 冷却文案写死"3 秒后可重试"（与 `RATE_LIMIT_COOLDOWN_MS` 同源常量），不做逐秒跳动 |

## 顺带发现（不在本卡范围）

修 §5.1 过滤器后暴露 **7 个既存类型错误**（BASE-34），其中 `services/net/RpcClient.ts:99` 的
`ERR.SYSTEM` **不存在于 `ERR`**，网络不可达时 `makeError(undefined, …)` →
`RpcError.code === undefined`。这直接影响本卡的错误分支，故在 `LeaderboardModel.fetch` 里兜成
`ERR.INTERNAL`（可重试）。根因在 `RpcClient`（C-01 的所有物，已交付），本卡未改动它。

## 回滚命令

```bash
git checkout -- client/assets/scripts/features/leaderboard/
```
