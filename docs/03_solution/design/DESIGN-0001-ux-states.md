---
id: DESIGN-0001
title: UX 态契约（六份契约之⑥：空/加载/错误/无权限/成功/冲突）
status: active
module: contracts
owner: hark
created: 2026-10-26
review: 2026-11-26
related: [MUST-02, MUST-04, MUST-14, ADR-0011, PLAN-V002-03]
---

# UX 态契约（DESIGN-0001）

> 本文件是**契约冻结的第⑥份**。此前 5 份（API / Errors / Identity / Resources / Events）已散落在
> `packages/contracts/src/**` 与 `docs/03_solution/data/api-catalog.md`、`error-catalog.md`，**唯独界面五态没有唯一源**，
> 导致每个开发者各自发明"加载中/失败/空"的判定 → 并行开发必然在融合阶段打架。
>
> 本契约的判定依据**全部来自真实代码**（`common/envelope.ts`、`common/errors.ts`、`server/src/modules/save/service.ts`），
> 不含推测。实现落点：`packages/contracts/src/common/ux.ts`（TASK-3001）。

## 1. 六态定义（枚举值即契约，不得增减）

| 态 | 含义 | 判定来源 |
|---|---|---|
| `loading` | 请求在途，界面只显示骨架/进度，禁止显示"空"文案 | 客户端本地状态，非服务端 |
| `empty` | 请求**成功**但业务结果为空（列表 0 条 / 今日额度已用尽） | `c === 0` 且业务字段为空 |
| `error` | 请求失败，可按 `retryable` 决定是否给"重试"按钮 | `c !== 0` 或网络异常 |
| `noPermission` | 请求被拒，但**重试不会成功**，必须换动作（登录/更新/等待/联系客服） | 见 §2 映射 |
| `success` | 请求成功且有内容 | `c === 0` 且业务字段非空 |
| `conflict` | 请求成功但业务判定为"需用户二选一"（存档分叉） | `c === 0` 且响应体 `accepted === false` |

**关键区分（防误实现）**：

- `empty` 与 `error` 不得混用：今日配额用尽（3002）是**业务正常结果**，不是崩溃。
- `noPermission` 与 `error` 不得混用：`2003 BANNED` 给"重试"按钮是欺骗用户。
- `conflict` **不是错误码**——`save.push` 冲突时 `c === 0`，见 `save/index.ts:4` 的
  `SavePushRes = { accepted: true; revision } | { accepted: false; conflict: SaveSummary }`。

## 2. 错误码 → UX 态（14 码全覆盖，唯一映射）

来源 `packages/contracts/src/common/errors.ts`（14 个码，见 `docs/03_solution/data/error-catalog.md`）。

| 码 | 名称 | UX 态 | retryable | 客户端动作 |
|---|---|---|---|---|
| 0 | OK | `success` / `empty` | — | 由业务字段决定，不由码决定 |
| 1001 | BAD_PAYLOAD | `error` | false | 提示"请求格式有误"；属客户端 bug，上报 telemetry（`a:update` 不作为用户动作） |
| 1002 | UNKNOWN_ACTION | `error` | false | 同上；客户端版本与服务端不匹配 |
| 2001 | NOT_LOGGED_IN | `noPermission` | false | `login`：拉起平台登录 |
| 2002 | SESSION_EXPIRED | `noPermission` | false | `login`：网关已静默刷新一次（`RpcClient` 已实现），到此即刷新失败 |
| 2003 | BANNED | `noPermission` | false | `contact`：展示封禁到期时间（`player.banned_until`） |
| 2101 | MINOR_TIME_LIMIT | `noPermission` | false | `wait`：提示可玩时段，不给重试 |
| 3001 | DUPLICATE_REQUEST | `success` | — | **等同成功**，不弹错；写动作幂等回放（同 `rid`） |
| 3002 | QUOTA_EXHAUSTED | `empty` | false | `tomorrow`：售罄，展示明日重置 |
| 3201 | EVENT_CLOSED | `noPermission` | false | `wait`：场次未开 |
| 3202 | EVENT_ALREADY_PLAYED | `success` | — | 今日已参与，直接展示已有结果 |
| 4001 | RATE_LIMITED | `error` | true | 退避重试：1s → 2s → 4s，最多 3 次，仍失败提示"稍后再试" |
| 4999 | INTERNAL | `error` | true | 重试 1 次；仍失败展示"服务暂时不可用"，并上报 telemetry |
| 5001 | REVIEW_PENDING | `error` | false | `wait`：提示审核中，禁止连续点击 |
| 9001 | CLIENT_TOO_OLD | `noPermission` | false | `update`：强制更新弹窗，阻断进入主界面 |

> 该表是 UI 层唯一依据。新增错误码必须先更新本表（`npm run guard` 会校验 contracts 的 `ERR` 键与本表一一对应）。

## 3. 每动作的 UX 契约（仅 12 个已实现动作；8 个 todo 不定义，避免为未实现功能编造界面）

| 动作 | loading 时 | empty 条件 | success 内容 | conflict 可能 |
|---|---|---|---|---|
| `account.login` | 全屏加载（无骨架） | 不适用 | 进入主界面；`isNew` 为真时播引导 | 否 |
| `account.refresh` | 静默，不显示 | 不适用 | 仅更新令牌 | 否 |
| `account.bindStart` | 按钮 loading | 不适用 | 展示 10 分钟倒计时票据（剩余时间由客户端计时） | 否 |
| `account.bindConfirm` | 按钮 loading | 不适用 | 合并成功 → 刷新本地存档摘要 | **是**（`forkPending=true`，源=`bind`） |
| `compliance.check` | 全屏加载（启动链） | 不适用 | 通过则进主界面 | 否 |
| `save.pull` | 列表骨架 | `summary === null` → 新号，走 `LocalSave.init()` | 展示最新 revision | 否 |
| `save.push` | 顶部细进度条（不遮罩） | 不适用 | 静默成功 | **是**（`accepted:false` → 二选一弹窗） |
| `save.resolveFork` | 弹窗按钮 loading | 不适用 | 弹窗关闭，存档收敛 | 否 |
| `leaderboard.report` | 无（后台批量） | 不适用 | 无 | 否 |
| `leaderboard.query` | 榜单骨架 10 行 | `rows.length === 0` → "本季暂无数据" | 榜单 + 我的名次条 | 否 |
| `telemetry.track` | 无（fire-and-forget） | 不适用 | 无（失败不上屏） | 否 |
| `config.manifest` | 启动页进度 | 不适用 | 校验 `configVersion` | 否 |

## 4. 跨态通用规则

1. **loading 不得替换已有内容**：刷新榜单时保留旧榜 + 顶部细进度条，避免闪白。
2. **错误必须可归因**：`error` 态文案分三类（网络 / 服务 / 客户端 bug），不得统一"操作失败"。
3. **noPermission 必须给出口**：`login` / `update` / `wait` / `contact` 四选一，不得只显示红字。
4. **empty 必须给下一步**：空背包 → 提示"去出钩"；空榜 → 提示"先上榜"。
5. **telemetry 埋点由态转移触发**：`loading → error` 记 `ui.error{action,code}`，`→ empty` 记 `ui.empty{action}`（埋点规范见 `features/telemetry`）。

## 5. 与存档分叉的接线（唯一允许出现 conflict 的路径）

```
save.push(baseRevision) ── c=0, accepted:true  → success（静默）
                       └─ c=0, accepted:false → conflict
                                                 → 弹窗二选一
                                                 → save.resolveFork{keep:'local'|'cloud', localSnapshot?}
                                                 → success
account.bindConfirm ── forkPending=true → 同一 conflict 弹窗（源=bind）
```

**禁止**：把 `accepted:false` 当失败重推（会覆盖对方存档）；把 `3001 DUPLICATE_REQUEST` 当 conflict。

## 6. 自检

- [x] 6 态齐全，且每态有机器可判定的来源（`c`、业务字段）
- [x] 14 个错误码全部有唯一映射，无遗漏、无"其它"
- [x] `conflict` 明确不是错误码，避免与 `3001` 混淆
- [x] 未为 8 个 todo 动作编造界面（它们还没有实现，谈不上 UX）
- [x] 所有判定依据可反向追溯到 `envelope.ts` / `errors.ts` / `save/service.ts`
