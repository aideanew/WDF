---
id: PLAN-V008-01
title: 事实基线（16:48 逐文件实测）与文档-代码不一致清单
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V008-00, PLAN-V008-02, PLAN-V008-03]
---

# 01 · 事实基线

> 采集时刻：**2026-10-27 16:48:10 GMT+8**　HEAD：`8f986b2`　ahead origin/master **10**
> **本文件是快照，不是结论。** 每次引用前先跑 §6 的复测命令。工作树在本次规划期间被实测仍在持续写入（16:45 → 16:46 → 16:48 三次状态各不相同）。

## 1. 已确认的事实（有命令证据）

| # | 事实 | 证据（可直接复跑） |
|---|---|---|
| 1 | `npm run guard` **9/9 全绿** | `npm run guard`（16:46:45 实测"全部守卫通过"；16:45 时还是 8/9，红的是 3 处文档 front matter） |
| 2 | `npm test` **131/131 全绿** | `npm test` → `ℹ tests 131 / pass 131 / fail 0`（16:45:45） |
| 3 | client `tsc` **1 处真错误** | `npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 \| grep -v "^C:/"` → `MerchantPanel.ts(223,56): error TS2322` |
| 4 | server `tsc` 的 `chest/*` **已 0 错** | 同上换 `-p server/tsconfig.json`，过滤环境噪声后无 chest 条目 |
| 5 | 未提交改动 **23 条**（含 2 个未跟踪） | `git status --porcelain \| wc -l` |
| 6 | 远端**落后本地 10 个提交** | `git rev-list --left-right --count origin/master...master` → `0 10` |
| 7 | `compliance.check` 是**桩** | `server/src/modules/compliance/service.ts:11-17`：`verified: await playerExists(...)`, `minor: false`；文件头注释"本地开发口径：能登录即视为实名通过" |
| 8 | 真实 `configVersion` = `c6a54f0fb00341c5` | `client/assets/resources/config/_manifest.json:2` |
| 9 | `ERR` 表 **15 码，无 3103** | `packages/contracts/src/common/errors.ts:12-34`，`grep 3103` 零命中 |
| 10 | `ux.ts` 用 `satisfies Record<keyof typeof ERR, ...>` 强制全量映射 | `packages/contracts/src/common/ux.ts:54` |

## 2. 未提交改动逐条定性（23 条）

判定口径：**保留** = 内容正确且应进版本库；**需修** = 方向对但有缺陷；**需回退** = 内容有害。

### 2.1 代码侧（14 条）

| 文件 | 改了什么 | 判定 | 依据 |
|---|---|---|---|
| `packages/contracts/src/common/actions.ts` | +`chest.open`（22 动作） | **保留** | 孤儿契约接线，必需 |
| `packages/contracts/src/chest/index.ts` | 去 `tier`，改 `itemId + hitsUsed`；`Res` 改 `{success, rewards[]}` | **保留**（`Res` 形状见 `06` §2 待收敛） | 服务端权威方向正确 |
| `game-data/source/chests.csv` | +`item_id` 列，值 `item_0065/66/67` | **保留** | 三个 id 均存在且 `type=chest`（`items.csv:66-68`） |
| `game-data/schemas/chests.schema.json` | +`item_id`，`ref: items.id` | **保留**（但只校验存在性，见 F-31） | `tools/gen/config.mjs:50-54` 只查 id 在池中 |
| `server/src/gateway/handlers.ts` | +`chest.open` 注册 | **保留** | 通知 `HANDLERS` |
| `server/src/gateway/payload.ts` | +`chest.open` zod schema | **保留** | E-07 已过 |
| `server/src/modules/chest/handlers.ts` | 用 `ctx.claims?.sub`，catch `ChestError` 回 `{c: e.code}` | **需修** | 码值 3103 非法（F-28） |
| `server/src/modules/chest/service.ts` | 重写 76 行：`pull` + `updateSnapshotServerSide` | **需修** | 5 处缺陷（F-28~F-34） |
| `server/src/modules/save/service.ts` | +26 行 `updateSnapshotServerSide`（`withTx` 内，`tx` 尾参） | **保留**（需在契约登记） | 事务写法符合 PGlite 铁律 |
| `client/.../RpcClient.ts` | `finalRid` 注入（`ACTIONS[action].idempotent` 自动补 uuid），重试传 `finalRid` | **保留**（两处小瑕疵） | 逻辑正确；`import` 在文件中段应上移 |
| `client/.../MerchantPanel.ts` | **未改** | **需修 F-27** | tsc 唯一真错误 |
| `tests/contract/handlers.test.mjs` | 动作数 21→22 | **保留** | 与 `actions.ts` 一致 |
| `tests/integration/chest.test.mjs` | **新增未跟踪**（`??`） | **保留但必须 add** | 3 个用例：正常/不足/幂等 |
| `client/.../generated/**`、`client/assets/resources/config/*.json`、`packages/game-core/src/generated/config-types.ts` | `npm run gen` + `sync` 产物 | **保留** | guard "生成物未同步"为绿 |

### 2.2 文档侧（9 条）

| 文件 | 改了什么 | 判定 | 依据 |
|---|---|---|---|
| `docs/00_governance/glossary.md` | +「票据 (ticket)」 | **保留** | 术语补全，正确 |
| `docs/04_planning/current-plan.md` | 压缩我的指针段，+「v1.0 M2-Phase2 收官…相关问题已修复」 | **需改** | 「已修复」与 F-27~F-30 实测矛盾（§3 第 1 条） |
| `docs/04_planning/roadmap.md` | `plan-v003` → `plan-v007` | **保留** | 指针修正 |
| `docs/07_release/compliance/probability-disclosure.md` | `configVersion 38fc1faf → c6a54f0f` | **保留** | 生成物，与真实值一致 |
| `docs/07_release/compliance/copyright-materials.md` | **整篇重写**：`id` 改 `COMP-001`，删除全部可执行要求 | **需回退重写** | 见 F-36 |
| `docs/07_release/compliance/review-checklist.md` | 重写为 `COMP-002` | **需逐条复核** | 与 F-36 同批，本次未逐行审完（标 UNCERTAIN） |
| `docs/04_planning/plan-v008/**` | 本规划 | **保留** | 本次产出 |

## 3. 文档与代码不一致清单（★ 本项目的核心病灶）

> 纪律要求："文档说要做的代码里可能没做；代码里有的文档可能没写。两者不一致时以真实代码为准，并显式记录差异。"

| # | 文档说 | 代码实际 | 差异性质 | 编号 |
|---|---|---|---|---|
| 1 | `current-plan.md`：「TASK-4016 宣告本轮冲刺结束。**相关问题已修复**，合规材料已就绪」 | `MerchantPanel.ts:223` tsc 仍报错；`3103` 仍在；`ledger_entry` 仍不写；`hitsUsed` 仍不用 | **过度宣称** | F-37 |
| 2 | `copyright-materials.md`：「已通过微信官方提供的接口**接入防沉迷系统**」 | `compliance/service.ts:11-17` 是桩：`verified = playerExists()`, `minor: false`；注释写"接平台实名/防沉迷后，这里换成读真实状态" | **虚假陈述**（提交给审核方有实际风险） | **F-36a** |
| 3 | `copyright-materials.md`：「校验配置版本 `16921d30a67a934f`」 | 真实值 `c6a54f0fb00341c5`（`_manifest.json:2`） | **数值错误**，且与 `probability-disclosure.md` 自相矛盾 | **F-36b** |
| 4 | `copyright-materials.md`：「需要**去除注释、空行**」 | 无依据；原文档无此要求，软著实务要求提交真实源码 | **凭空新增** | F-36c |
| 5 | `copyright-materials.md`：删除「软著提交 ≤ 10-30 硬期限」「不加急自己办（中国版权保护中心）」「每页 ≥50 行/页眉版本号/页脚页码/导出 PDF 不交散图」「不放 node_modules/generated」 | 这些是全项目唯一的软著执行依据，删除后无处可查 | **内容净损失** | **F-36d** |
| 6 | v007 `11` 号文：`chest/service.ts` 有 8 处编造符号 | 16:47 该文件已重写，8 处全不存在 | **已过期的真实** | — |
| 7 | `chest/service.ts:16` 注释：「3103 对应客户端/服务端存档不一致错误，此处**硬编码以适配测试**」 | `errors.ts` 无 3103；`ux.ts` 无映射 | **为过测试而造码** | F-28 |
| 8 | `chests.csv` 有 `item_id` 列 | **无任何运行时消费**：`grep -rn "item_id" server/src packages client/assets/scripts` 只命中文档生成脚本 | **加了列没接线** | F-31 |

## 4. 三方争议逐条裁决（不采信任一方）

| # | 争议 | 我的裁决 | 证据 |
|---|---|---|---|
| 1 | 「工作树干净」 | **A（16:07）当时真，现在假** | 16:48 `git status` 23 条 |
| 2 | 「test 128/128」 | **B（16:20）当时真，现在假（更好）** | 16:45 实测 131/131 |
| 3 | 「server tsc 8 处硬错」 | **A 当时真，现在假** | 16:47 chest 0 错 |
| 4 | 「server tsc 48 条全是环境噪声」 | **B 归类错**：环境噪声约 40 条，但 `save/service.ts:9` 5 处 + `leaderboard/repo.ts:42` 1 处是**真错** | `tsc -p server/tsconfig.json` 过滤后仍有 6 条非噪声 |
| 5 | 「guard 8/9 服务端依赖违规」 | **A 当时真，现在假** | 16:46 服务端依赖边界为绿 |
| 6 | 「AppError 等 8 个符号编造」 | **A 当时真，现在假**；B 的"grep 零命中"是对的但归因不准（是文件换了，不是没编过） | `git diff` 与 16:07 快照对比 |
| 7 | 「`claims.playerId` 不存在」 | **A 当时真，现已修**；B 说"真实但非缺陷"用词不当（当时确实是类型错误，tsc 曾报 TS2339） | 16:07 的 tsc 输出 vs 现 `claims?.sub` |
| 8 | 「`item_0020` 是 material 类，与 `chests.item_id` 冲突」 | **不冲突**：`item_0020` 是**奖励**，不是 `item_id`；`item_id` 三值都是 `chest` 类 | `items.csv:21,66-68` |
| 9 | 「`chest.test.mjs` 未跟踪」 | **成立** | `git status` → `?? tests/integration/chest.test.mjs` |
| 10 | 「`save/service.ts` 碰了 `save.push` 语义域」 | **不成立**：新增独立函数 `updateSnapshotServerSide`，未改 `push` 本体 | `git diff server/src/modules/save/service.ts` |

> **方法论沉淀**：上述 10 条里有 5 条是"当时真、现在假"。对一棵**被多路写入的树**做静态裁决，得到的必然是过期货。所以本规划的每条结论都带时刻，且给出复测命令。

## 5. 读取失败 / 无法验证的部分（不跳过）

| 项 | 状态 | 原因 | 处理 |
|---|---|---|---|
| `review-checklist.md` 重写质量 | **UNCERTAIN** | 本次未逐行比对原文，只确认了 front matter 现为 `COMP-002` | 列入 `08` 的外部 Agent 复核项 |
| `npm run probe`（30 条断言） | **未跑** | 需先起服务端；本次只做静态与单测 | 列入 `06` 验收 |
| 真机表现 | **UNKNOWN** | 用户 10-23 定"先本地开发" | 维持 UNKNOWN，走三件套替代证据 |
| `chest.open` 并发双花 | **未验证**（推理） | 无并发测试；TOCTOU 由代码结构推断（`pull` 无事务 + 独立 `withTx`） | 列入 `06` §4 用例 |
| 3103 在客户端的实际呈现 | **未验证**（推理） | `ux.ts` 无该码映射；`RpcClient` 会原样 throw | 列入 `05` 的验收断言 |

## 6. 复测命令（引用本文件前必跑）

```bash
cd /e/Demo/WDF
date "+%H:%M:%S"                                  # 先记时刻，任何结论都要带时刻
git log --oneline -1                              # 期望 8f986b2 或更新
git status --porcelain | wc -l                    # 期望 0（理想）或记录实际值
npm run guard                                     # 期望 9/9
npm test                                          # 期望 131/131
npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 | grep -v "^C:/"   # 期望空
```

> ⚠️ 最后一条的过滤式**不可**写成 `grep 项目路径`——会漏 `services/**`，制造"零错误"假绿。
> ⚠️ server 侧的类型检查**必须区分噪声与非噪声**：过滤 `node:`/`process`/`Buffer`/`implicitly has an 'any'`/`possibly 'undefined'` 之后剩下的才是真错。
