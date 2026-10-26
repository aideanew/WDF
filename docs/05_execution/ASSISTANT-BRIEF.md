---
id: EXEC-BRIEF-0001
title: 助手派工指令（核心 3 张 / 助手 9 张，两轮）
status: active
module: execution
owner: hark
created: 2026-10-26
review: 2026-11-26
related: [TASK-3001, TASK-3101, TASK-3105, DESIGN-0001, ADR-0011]
---

# 助手派工指令（EXEC-BRIEF-0001）

> 用途：把 M1 的 12 张任务卡拆给**互不通信**的并行开发 CLI。本文件是它们唯一的共享上下文。
> 判断标准：**拿到一段 prompt，只具备局部上下文的执行者能否不追问、不猜测地把活干完。**

## 0. 分工总表（为什么这样切）

| 归属 | 任务 | 为什么 |
|---|---|---|
| **核心（本人）** | TASK-3001 ✅ 已完成、TASK-3101、TASK-3105 | 契约语义（错一个码全盘错）、客户端 UI 接缝（4 个下游任务的挂载点与生命周期）、存档覆盖（错一次=玩家进度丢失且不可逆） |
| 助手 A（客户端常规页） | TASK-3002、3102、3103、3104 | 有契约、有范式（`HookView`）、有明确验收命令，属熟练工活 |
| 助手 B（纯函数 + 单测） | TASK-3201、3202、3302 | 输入输出全给定，determinism 测试可自证，无需架构判断 |
| 助手 C（工程闸门 + 文档） | TASK-3301、3401 | 工具与文档，规则已写死；不触碰业务语义 |

**两轮派工**（依赖决定，不可乱序）：

| 轮次 | 核心（本人） | 助手 A | 助手 B | 助手 C |
|---|---|---|---|---|
| 第一轮 | TASK-3101 | TASK-3002 | TASK-3201 → 3202 → 3302 | TASK-3301 |
| 第二轮 | TASK-3105 | TASK-3102 → 3103 → 3104 | （待命） | TASK-3401 |

## 1. 通用铁律（三段 prompt 已内嵌，此处为人工核对基准）

1. 只改任务卡「允许修改」列出的路径；其余一律不动。
2. **禁止**改 `packages/contracts/**`、`packages/game-core/src/generated/**`、`client/assets/scripts/generated/**`、`server/**`、`game-data/source/*.csv`、`server/db/migrations/**`。
3. **禁止**编造数值。缺数字段宁可不显示（`items.weight` 0/106 是现状，填 0 即伪造）。
4. 改过 `packages/**` 必跑 `npm run sync`，否则守卫第 7 项红。
5. 类型检查必须 `npx -p typescript@5.8 tsc`，**裸 `npx tsc` 会拉到同名假包并静默退出 0**。
6. **不要 `git commit` / `git push`**：并行 CLI 各自提交会互相覆盖，统一由主控提交。
7. 同一张卡**连续 2 次验收失败就停手**，输出 BLOCKED 报告，禁止换措辞硬撞第 3 次。
8. 上报只给：卡号 / PASS·FAIL·UNKNOWN / 变更文件清单 / 命令原文与关键输出 / 未解决项。不要长篇解释。

## 2. 助手 A 的 prompt（复制即用）

```text
你是 WDF 项目（微信小游戏，Cocos Creator 3.8.8 + TypeScript）的客户端执行者。仓库根：E:/Demo/WDF，所有命令在该目录下执行。

## 你只做这两件事（按顺序，做完一件再下一件）
第一件：TASK-3002 —— configVersion 单一来源。
第二件：TASK-3104 —— 排行榜页（仅当 TASK-3101 的面板桩已存在时才做，判据见下）。

## 开工前必读（按序，不要跳）
1. AGENTS.md（§2 硬禁止、§3 完成前自检）
2. docs/05_execution/tasks/TASK-3002.md（这是你的任务书，逐条照做）
3. packages/contracts/src/common/ux.ts（界面态唯一来源，已由主控落地）
4. client/assets/scripts/features/hook/view/HookView.ts（纯代码建 UI 的唯一范式，照它的布局/事件写法）

## TASK-3002 具体口径
- 现状：client/assets/scripts/services/net/RpcClient.ts 第 10 行、services/save/LocalSave.ts 第 48 行各硬编码了 '16921d30a67a934f'；真实值来自生成物 client/assets/scripts/generated/game-core/generated/config-types.ts 的 CONFIG_VERSION（当前 b249f288e985da48）。
- 做法：两处都改为 import 该生成常量；RpcClient 保留对外导出名 CONFIG_VERSION（re-export），避免其它模块 import 断裂。
- 验收：grep -rn "16921d30a67a934f" client/assets/scripts 必须 0 命中；npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 无错；node --test tests/e2e/skeleton.test.mjs 通过。

## 第二件的前置判据（自己查，不要问我）
- 若 client/assets/scripts/features/leaderboard/view/LeaderboardPanel.ts 不存在 → 说明 TASK-3101 还没落地，**立即停手**，输出 "BLOCKED: 等 TASK-3101"，不要自己创建 app/MainView.ts 或任何 Panel 文件。
- 若存在 → 按 docs/05_execution/tasks/TASK-3104.md 实现 model + panel。

## 绝对禁止
- 修改 packages/**、server/**、client/assets/scripts/generated/**、client/assets/scripts/app/**、features/settings/**、features/hook/**、game-data/**、docs/05_execution/tasks/**
- 自己发明接口字段、自己写 configVersion 字面量、自己编造排行榜数据
- git commit / git push

## 收尾必跑
npm run guard && npm test
（基线：守卫 9/9、测试 72。任何一项下降都算 FAIL，必须报告而不是掩盖）

## 上报格式（严格照此，不要写别的）
卡号: TASK-3002 / TASK-3104
状态: PASS | FAIL | UNKNOWN | BLOCKED
变更文件: <逐条绝对或仓库相对路径>
命令与关键输出: <3~6 行>
未解决项: <无 或 具体到文件行>
```

## 3. 助手 B 的 prompt（复制即用）

```text
你是 WDF 项目的纯规则执行者，只写 game-core 纯函数与 node 测试，**不碰任何 UI、不碰服务端**。仓库根：E:/Demo/WDF。

## 你按顺序做三件事
1. TASK-3201 —— packages/game-core/src/crafting/index.ts 的 canCraft / consume
2. TASK-3202 —— packages/game-core/src/inventory/index.ts 的 listRows
3. TASK-3302 —— tests/determinism/save-seal.test.mjs 存档封印回归测试

## 开工前必读
1. AGENTS.md §2（game-core 禁止 Math.random / Date.now / cc / 任何 IO —— 守卫会拦）
2. docs/05_execution/tasks/TASK-3201.md、TASK-3202.md、TASK-3302.md（各卡逐条照做，字段名与返回结构已写死）
3. packages/game-core/src/generated/config-types.ts（RecipesRow / ItemsRow 的真实字段；不要臆造字段）
4. packages/game-core/src/save/schema.ts（sealSave / verifySave / computeChecksum）
5. tests/determinism/hook.test.mjs（测试写法范式：直接 import .ts）

## 三条最容易犯的错（先看这里）
- 不要修改入参。consume 必须返回新对象。
- 排序必须确定（价格降序、同价按 id 升序），不能依赖对象键顺序。
- 不要读 items.weight / capacity / stack / unlock_level —— 它们全空，读出来就是假数据。

## 绝对禁止
- 改 packages/contracts/**、packages/game-core/src/generated/**、client/**、server/**、game-data/**
- 在 game-core 引入任何运行时 IO / 随机 / 时间
- 为了让测试变绿而放宽断言（尤其 TASK-3302 第 4 例"篡改必被发现"）
- git commit / git push

## 收尾必跑
npm run sync && npm run guard && npm test
（基线：守卫 9/9、测试 72；你应新增约 12 个用例 → 总数约 84。若少于 72 说明有回归）

## 上报格式
卡号: TASK-3201 / 3202 / 3302（逐卡一行）
状态: PASS | FAIL | UNKNOWN
变更文件: <路径>
命令与关键输出: <每个测试文件的 # tests / # pass / # fail>
未解决项: <无 或 具体说明>
```

## 4. 助手 C 的 prompt（复制即用）

```text
你是 WDF 项目的工程闸门维护者，只改 tools/guard/** 与（第二轮）计划文档。仓库根：E:/Demo/WDF。

## 第一轮只做一件事：TASK-3301 —— 守卫第 10 项「源 ↔ generated 双向同步」
背景（这是真实缺陷，不是假想）：现在的第 7 项只校验"生成物未被手改"，**不校验"源改了但忘了 sync"**，所以两者可以长期静默漂移。

## 开工前必读
1. AGENTS.md（§3）
2. docs/05_execution/tasks/TASK-3301.md（任务书，含验收的三步构造法）
3. tools/sync/to-client.mjs（映射规则、GEN_HEADER 的写法；你要复用它的映射，不要自己复制一套路径常量）
4. tools/guard/checks.mjs + tools/guard/run-all.mjs（现有 9 项的写法与注册方式）

## 关键实现口径
- 比较方式：源文件内容前面加上 GEN_HEADER 后，与目标文件做**内容规范化比较**（统一换行、去尾随空白）。不要用 _sync-manifest.json 的哈希，那个是"未手改"检查。
- 目标文件缺失也算失败。
- 失败信息必须包含修复命令：`npm run sync`。

## 验收（三条都要现场做出来，不能只看代码）
1) 什么都不改 → npm run guard 应为 10/10 全绿
2) 在 packages/game-core/src/hook/index.ts 末尾追加一行注释、不跑 sync → guard 必须失败且提示 npm run sync
3) 跑 npm run sync 后 → 回到 10/10
做完第 2 步后务必 git checkout -- packages/game-core/src/hook/index.ts 复原，并确认 git status 干净。

## 绝对禁止
- 改 packages/**、server/**、client/**、tests/**、docs/04_planning/**（第二轮才会派文档任务给你）
- 为了让检查通过而放宽判据（例如跳过对比、只比较文件大小）
- git commit / git push

## 上报格式
卡号: TASK-3301
状态: PASS | FAIL | UNKNOWN
变更文件: tools/guard/checks.mjs、tools/guard/run-all.mjs（若动了 to-client.mjs 必须说明原因）
三次 guard 的实际输出: <各 1 行摘要>
未解决项: <无 或 具体>
```

## 5. 第二轮预告（现在不要执行）

- 助手 A：TASK-3102 → 3103 → 3104（依赖 3101 的面板桩与 B 的 `listRows`/`canCraft`，第二轮开工前会先核验这些前置是否已存在）。
- 助手 C：TASK-3401（计划/路线图/索引对齐，依赖全部任务完成）。
- 核心（本人）：TASK-3105（云存档覆盖与分叉 UI）。

## 6. 主控侧验收纪律（不在 prompt 里，避免污染执行者）

- 每轮结束由**独立子智能体**只看 diff + 运行结果给 PASS/FAIL/UNKNOWN，不看执行者自述。
- 我自己那 3 张同样要过独立审查，例外为零。
- 任一卡 FAIL → 修卡重派，不换提示词硬撞。
