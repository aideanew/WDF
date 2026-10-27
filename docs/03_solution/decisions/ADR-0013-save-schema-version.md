---
id: ADR-0013
title: 存档 schema 版本（m.sv）由谁负责——服务端校验范围与客户端迁移接线
status: accepted
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [ADR-0012, ADR-0008, ADR-0011, F-42c]
---

# ADR-0013：存档 schema 版本由谁负责

> **状态 `accepted`（2026-10-27 21:12 裁决）。裁决结论见 §7。**
> **代码未做任何改动** —— 本 ADR 的裁决结果就是「维持现状 + 登记风险 + 装到期提醒」。

## 0. 先更正一条我自己的错误表述

我在 `plan-v009` 里写过：

> 「让 `sv` 生效等于先定一套存档兼容策略（**拒 / 迁移 / 降级**），属行为变更，需要 ADR。」

**这句话是错的。** 实测：这套策略**已经写好并且三态齐全**，在 `packages/game-core/src/save/migrations.ts`：

```ts
export type MigrateResult =
  | { status: 'ok'; save: SaveFile }   // 迁移成功（逐版本跑 MIGRATIONS 链）
  | { status: 'too-new' }              // 存档比客户端新 → 提示更新，绝不覆盖
  | { status: 'broken'; from: number } // 某一步缺迁移函数 → 降级/放弃

export function migrate(save: SaveFile): MigrateResult
```

所以「拒 / 迁移 / 降级」不是**三选一**，是**同一个函数的三个返回值**。
我把"已实现的三态"误读成了"待设计的三种方案"——这正是 `plan-v009` 里记的那条教训的第二次犯：
**没 `grep` 关键符号全仓，只看它"应该在"的地方。**

## 1. 真实缺口（三条，逐条可核）

| # | 事实 | 证据 |
|---|---|---|
| **G-1** | **`migrate()` 全仓零调用点。** 唯一出现 "migrate" 的业务代码是 `GameApp.ts:4` 的**启动链注释**「5 save(load+migrate)」——注释承诺了，代码没做 | `grep -rn "migrate" client/assets/scripts/{app,services,features}` 排除 `generated/` → 只命中一行注释 |
| **G-2** | **云档版本不符时直接报错，不走 `migrate()`**。云端 `schemaVersion` ≠ 本地 `SAVE_SCHEMA_VERSION` → `console.warn` + 返回 `ERR.BAD_PAYLOAD`，**本地档不替换** | `client/.../settings/model/SaveSyncModel.ts:185-188` |
| **G-3** | **服务端从不读 `m.sv`**，只信 `body.schemaVersion`；且**缺失时静默默认 1** | `server/src/modules/save/service.ts:46 / 123 / 172`：`typeof body.schemaVersion === 'number' ? body.schemaVersion : 1` |

**三条都是同一类病：能力存在，没人接。** 这是本项目第三次：
- F-29 开箱不写 `ledger_entry`（`recordGain` 早就写好，没人接）
- F-42a `cfg` 回传（客户端在发、契约声明、注释承诺，没人实现）
- **本 ADR：`migrate()`（写好三态，零调用）**

> 附带说明 G-3 的危害：静态默认 `1` 意味着**一个完全不带 `schemaVersion` 的存档会被当成 v1 静默接受**。
> 这与 F-39（改 body 不重算 checksum 导致掉档）是同一类"静默容错掩盖真问题"。

**已确认不是缺口的**：客户端**确实在发** `m.sv` —— `RpcClient.ts:79` `sv: SAVE_SCHEMA_VERSION`。所以服务端想读就有得读，不需要改契约。

## 2. 要裁决的问题：服务端要不要管 `sv`？

> 注意这不是"选策略"，是"**选责任边界**"。策略（`migrate()`）已经有了。

| 选项 | 内容 | 代价 | 风险 |
|---|---|---|---|
| **A** | **服务端不管**。`m.sv` 与 `body.schemaVersion` 都只当元数据存进 `save_snapshot`，不解析、不校验。客户端负责迁移。同时把 G-3 的"缺省成 1"改成**显式拒绝**（缺 `schemaVersion` → `1001`） | 最小：`save/service.ts` 去掉 3 处默认值 | 客户端被改坏 / 被篡改时不设防；一台旧客户端把 v1 档推上去会**覆盖**云端 v2 档（虽然当前只有 v1，但 v2 那天就成立） |
| **B** | **服务端只校验范围**：持有 `MIN_SV` / `MAX_SV` 两个数字（当前都是 `1`），`m.sv` 落在范围外 → `9001`（语义同"你需要更新"）。**不解析 `modules`**，不跑迁移 | 小：`save.push` / `save.pull` 入口加一次整数范围判断 + 1 个错误分支 + 3 条测试 | 服务端要多知道一个数字；改存档结构时**服务端要跟着发版**（否则 `MAX_SV` 落后，新客户端被自己的服务端拦下） |
| **C** | **服务端全链迁移**：服务端也 import `migrate()`（`game-core` 是共享包，技术上可行），pull 时把旧档迁到当前版本再返回 | 大：服务端要理解存档结构；每次改存档都要同步两端 `MIGRATIONS` 链 | 服务端从此**绑定存档结构细节**，违背「存档是客户端产物、服务端只做权威存储」的既有分工；且服务端跑迁移后 checksum 会变，与 ADR-0012 的影子账本口径要重新对齐 |

### 我的倾向（非结论）：**B**

三条理由：

1. **A 的"不管"在 v2 落地那天就会变成事故**。旧客户端把 v1 档推上去 → 云端的 v2 档被覆盖 → 玩家进度丢失。
   `migrate()` 返回 `too-new` 时客户端"绝不覆盖"是对的，但**服务端没有这道闸**，只要有一个绕过客户端逻辑的请求就能写进去。
2. **C 代价与收益不匹配**。服务端迁移要重新对 checksum / 影子账本口径，而收益只是"省掉客户端一次迁移"——客户端本来就要会迁移（它得处理本地档）。
3. **B 只多两个整数**。它守住的是"**新档不能写进旧服务端、旧档不能悄悄覆盖新档**"这条底线，而不需要服务端理解 `modules` 里任何一个字段。
   代价（改存档结构时服务端要跟着发版）可以通过 `MAX_SV` 走 env 缓解：`WDF_SAVE_MAX_SV`，不确定时先放开，确定后收紧 —— 与本次限流用 env 的思路一致。

## 3. 附带问题：G-2「云档比本地旧」怎么处理？

**裁决结果：保持报错（不迁移）。** 理由未附，不代为推测。

裁决前我的倾向是"走 `migrate()` 迁移后替换"，依据是 `GameApp.ts:4` 的启动链注释
「5 save(load+migrate)」已经承诺过这个行为。**这个倾向被否决了**——记录在此，不为裁决翻案，
只为了让下一个接手的人知道：**那行注释是空头承诺，不是需求描述。**

## 4. 不裁决、仅登记：`m.sv` 与 `body.schemaVersion` 的双源

两处都有版本号，服务端目前只信 `body.schemaVersion`。若选 B，则两处都要看，**不一致时以谁为准需要定**：

| 可能口径 | 说明 |
|---|---|
| 以 `body.schemaVersion` 为准（倾向） | body 是权威数据；`m.sv` 只做"客户端声称"，两者不一致 → 视为异常请求（`1001`），不猜 |
| 以 `m.sv` 为准 | 违背"body 是权威"的既有口径，且 `m` 是请求元数据、可能被中间层改写 |

这条实现时按「不一致 → `1001`」做，**不静默取其一**（静默取其一就是 F-39 那类问题的入口）。

## 5. 影响面（若选 B + §3 迁移）

| 文件 | 改动 |
|---|---|
| `server/src/modules/save/service.ts` | `push` / `pull` 入口校验 `m.sv` 范围；去掉 3 处"缺省成 1" |
| `server/src/modules/save/handlers.ts` | 把 `req.m.sv` 传进 service（当前 service 拿不到 `m`） |
| `client/.../settings/model/SaveSyncModel.ts` | 云端版本不符 → 调 `migrate()` 而非直接报错 |
| `client/.../services/save/LocalSave.ts` 或启动链 | 本地档载入时调 `migrate()`（G-1，把 `GameApp.ts:4` 的注释变成代码） |
| `tests/integration/save-sv.test.mjs`（新建） | 范围内外、缺省、双源不一致、云档旧版本迁移、`too-new` / `broken` 不覆盖 |
| `docs/03_solution/data/gateway-gaps.md` | F-42c 结案 |
| `docs/03_solution/data/save-schema.md` | 补 `sv` 的权威口径 |

## 6. 验收标准

> **本节不适用** —— 以下验收对应「选 B + §3 迁移」的方案，该方案未获采纳（裁决为 A + 保持报错）。
> 保留原文，供将来改选 B 时直接照用。

- `npm run verify` → exit=0（含类型检查）
- 新增测试覆盖：`sv` 范围内放行 / 超范围 `9001` / 缺 `schemaVersion` `1001` / `m.sv` 与 body 不一致 `1001` / 云档 v1→v2 迁移成功 / `too-new` 不覆盖
- 端到端：构造一份 v1 云档，用 v2 客户端拉取 → 迁移到 v2 并落盘，checksum 重算通过

**本裁决实际交付的验收**（见 §7.3）：到期提醒测试 `tests/contract/save-schema-gate.test.mjs` 全绿，
且它把三条已接受的行为**锁成断言**（服务端不校验 `sv`、缺 `schemaVersion` 按 1 存、`SAVE_SCHEMA_VERSION` 必须为 1）。

## 7. 决策（2026-10-27 21:12 裁决）

| 问题 | 裁决 | 含义 |
|---|---|---|
| §2 服务端要不要管 `sv` | **A · 完全不管** | 服务端只把 `m.sv` / `body.schemaVersion` 当元数据存进 `save_snapshot`，不解析、不校验、不跑迁移。**客户端单方负责迁移**。 |
| §3 云档比本地旧 | **保持报错** | 维持 `SaveSyncModel.ts:185` 现状（`console.warn` + `ERR.BAD_PAYLOAD`，不替换本地档）。**不接 `migrate()`**。 |

**裁决未附理由，本 ADR 不代为推测。** 仅登记裁决所接受的后果与回访条件。
**代码改动量 = 0**（只加了注释与一个到期提醒测试）。

### 7.1 这个裁决在当前版本安全，但有**到期日**

`SAVE_SCHEMA_VERSION` 当前是 `1`，且 `MIGRATIONS` 链是**空的** ——
根本不存在 v1→v2 的迁移，`migrate()` 的 `too-new` / `broken` 两态在 `sv === 1` 的世界里不会被触发。
所以 G-1 / G-2 / G-3 三条缺口**今天不产生任何实际影响**。

> **到期日 = `SAVE_SCHEMA_VERSION` 从 `1` 变成 `2` 的那一刻。**
> 那一刻起：
> - 旧客户端可以把 v1 档推上云端**覆盖** v2 档（服务端无闸，G-3）；
> - `migrate()` 依然零调用（G-1），云档旧版本依然载入失败（G-2）；
> - 玩家进度丢失，且**无法从服务端恢复**（云端已被覆盖）。

### 7.2 已接受的后果（登记，不算缺陷修复）

| # | 后果 | 处理 |
|---|---|---|
| G-1 | `migrate()` 零调用；`GameApp.ts` 启动链注释原写「5 save(load+migrate)」是**空头承诺** | 保留缺口；**注释已改为诚实描述**（写 `load`，并注明 migrate 缺失 + 到期日），不再让注释许诺代码没做的事 |
| G-2 | 云档版本不符 → 载入失败，不迁移 | 保留 |
| G-3 | 服务端不校验 `sv`；`body.schemaVersion` 缺失时**静默默认 1** | 保留，已在 3 处加标记 |

### 7.3 回访条件（满足任一，必须重开本 ADR）

1. **硬触发：`SAVE_SCHEMA_VERSION` 要改成 ≥ 2。**
   已装**到期提醒** `tests/contract/save-schema-gate.test.mjs`：
   一旦该常量 ≠ 1，测试立刻红灯并指向本 ADR §7。**改常量的人必须先把 §7 处理掉，才能改绿。**
2. 出现真实的跨版本云档场景：玩家换设备、版本回滚、灰度期间新旧客户端并存。
3. 用户反馈「存档没了 / 进度回到很早以前」—— 优先怀疑 G-3 的旧档覆盖新档。

### 7.4 如果将来改选 B

需要动的文件见 §5。**额外提醒**：B 的 `MAX_SV` 若走 env（`WDF_SAVE_MAX_SV`），
必须与 `SAVE_SCHEMA_VERSION` 同源生成，不能手写 —— 否则又是一处"配置与代码双源"
（同 `economy/service.ts` 的 `MERCHANTS` 硬编码、同 F-38）。

