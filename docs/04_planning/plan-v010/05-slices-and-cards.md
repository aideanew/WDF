---
id: PLAN-V010-05
title: plan-v010 · 垂直切片与原子任务卡（TASK-7001~7051）
status: active
module: planning
owner: hark
created: 2026-10-28
review: 2026-11-11
related: [PLAN-V010-02, PLAN-V010-06, PLAN-V010-07]
---

# 05 · 垂直切片与原子任务卡

## 1. 切片清单与排序理由

排序原则（用户指定）：**先解锁依赖多的，先做不确定性高的，第一刀必须是能独立演示的闭环**。

| 切片 | 名称 | 一句话交付 | 为什么排这个位置 |
|---|---|---|---|
| **S0** | 让代码说实话 | 空壳可被机器识别；注释不再描绘不存在的流程 | **它是后面所有判断的地基**。不先做，每个接手者都要重新人工数行数，且必然误判 |
| **S1** | 登录与合规真接线 | 客户端用平台真实 code 登录；服务端有合规状态可查 | 提审前置；不确定性最高（平台凭据）；且它解锁 M-5/M-9 两条 MUST |
| **S2** | 广告闭环 | 看广告 → 服务端按日限发奖 → 客户端拿到奖励 | 唯一"数值齐 + 契约齐 + 表齐"的未实现动作，性价比最高 |
| **S3** | 数值解锁 | 至少让扩筏（C2）可用 | **BLOCKING**：需 D-42/D-43 裁决，未裁决前只做登记不做实现 |
| **S4** | UI 骨架 | 登录面板、合规拦截页、启动链真实化 | 核心 + 高难度（用户指定我自己做）；依赖 S1 的服务端 |
| **S5** | 体检协议与文档对齐 | `npm run stage` + 指针/措辞修正 | 收口；必须在 S0~S4 之后 |

**切片之间的解耦**：S0 与 S1/S2/S3/S4 **全部可并行**（S0 只改注释与新增工具文件，
与业务文件所有权不重叠）。S1 与 S2 并行但有 §约束（见 `06`）。

## 2. S0 · 让代码说实话

### TASK-7001：空壳清单工具

**归属**
- 所属切片：S0
- 来源需求：I-1（隐含要求）、N-2（v009 收官口径失真）
- 来源方案：本文件 §2

**目标**
一条命令能列出「module-catalog 声明存在、但代码里只有装饰性常量」的模块，输出机器可读 JSON。

**输入**
- 文档：`docs/00_governance/module-catalog.json`、`01-fact-baseline.md`
- 契约：无
- 前置任务：无
- 前置状态：工作树干净（`ea6ad20`）

**输出**
- 新增 `tools/guard/shells.mjs`
- 修改 `package.json`（加 `"shells": "node tools/guard/shells.mjs"`）
- **不修改** `tools/guard/checks.mjs`（第一版只报告，不拦门禁）

**Execution Steps**
1. [ ] 读 `module-catalog.json` 的 28 个模块，按 `client/core/server/contracts` 四个布尔取声明面
2. [ ] 对每个声明面定位对应目录（`features/<id>`、`game-core/src/<id>`、`server/src/modules/<id>`、`contracts/src/<id>`）
3. [ ] 判定"空壳"：目录内**全部** `.ts` 文件的有效行（去注释、去空行）总数 < 15，**或**全部导出符号名 ∈ `{MODULE, MODULE_ID, SERVICE, MODULE_ID 常量}` 集合
4. [ ] 输出 `{ id, layer, files, effectiveLines, verdict: 'shell'|'ok', evidence: [path:line] }`
5. [ ] `--json` 输出到 stdout；无参时输出人类可读表格
6. [ ] 自测：对 `fishing`（应判 shell）、`chest`（应判 ok）各验一次

**验收标准**
- [ ] `npm run shells` 输出中 `features/fishing` 判为 `shell`、`features/chest` 判为 `ok`
- [ ] 输出总数与实测一致：客户端 shell = 15、服务端 = 4（不含 ops）、**game-core 纯空壳 = 7**
      （crew/event/fishing/island/power/progression/salvage；`raft`/`sea`/`defense` 有函数但输入为占位值，
      属 `02 §3` 第三类，**非纯空壳**，由 TASK-7004 与人工复核处理——本卡定义性判断的诚实修正）
- [ ] 退出码恒 0（第一版不拦门禁）

**验证命令**
```bash
node tools/guard/shells.mjs | head -40
node tools/guard/shells.mjs --json | node -e "const a=JSON.parse(require('fs').readFileSync(0));console.log('shell 数:',a.filter(x=>x.verdict==='shell').length)"
```

**证据路径** `docs/06_validation/evidence/EVD-7001/`

**允许修改** `tools/guard/shells.mjs`、`package.json`（仅 scripts 段）
**禁止修改** `tools/guard/checks.mjs`、`tools/guard/run-all.mjs`、任何 `packages/**`、`server/**`、`client/**`

**依赖与阻塞**
- Depends on：无
- Blocks：TASK-7004、TASK-7051
- 阻塞条件：若发现 module-catalog 有模块没有对应目录（即清单与结构不一致），**停下来报告**，不要顺手补目录

**建议执行档位** `opus`　理由：判定规则本身是"什么算空壳"的定义权，错了会污染后续所有判断

**升级条件** 若发现 >3 个模块的"声明面"与"目录"对不上（清单本身失真），升级 `fable`

**预估规模** 中　（约 3~4 小时，**不小于 2 小时**，需要独立成卡）

---

### TASK-7002：注释去假 + 3101 登记

**归属**
- 所属切片：S0
- 来源需求：N-1、D1/D2/D3、`04-data-contract-gaps.md §2 G-1`
- 来源方案：本文件

**目标**
四处描绘了"不存在的东西"的注释改成实话；`3101` 在 `error-catalog.md` 里有登记。

**输入**
- 文档：`01-fact-baseline.md §3`、`04-data-contract-gaps.md §2`
- 契约：`packages/contracts/src/common/errors.ts`（只读，不改）
- 前置任务：TASK-7001（先知道哪些是空壳，才写得准）
- 前置状态：TASK-7001 已产出 shells 清单

**输出**
- 修改 `server/src/gateway/handlers.ts`（`:30-34` 注释区，**只改注释**）
- 修改 `client/assets/scripts/app/MainView.ts`（`:5`、`:57` 注释）
- 修改 `client/assets/scripts/app/GameApp.ts`（`:1-10` 头部注释，**改法见下**）
- 修改 `docs/03_solution/data/error-catalog.md`（新增 `3101` 条目）
- 修改 `packages/game-core/src/hook/index.ts:130`、`packages/game-core/src/raft/index.ts:17`（各加一行注释指向登记）

**Execution Steps**
1. [ ] `handlers.ts` 注释改为实际值：22 个动作、14 实现、8 todo，并逐条列出 8 个 todo
2. [ ] `MainView.ts:5` 改「底部 **6** 个 Tab（打捞/背包/箱子/合成/商人/榜单）」；`:57` 改「挂载 6 个面板」
3. [ ] `GameApp.ts` 头部改为："本类**只做 onHide 注册**。真实启动链在 `BootController`（compliance → login → MainView）。原注释描述的 7 步链（config 装配 / 离线结算 / Bundle 预下载 / save.flush）**均未实现**，已登记为 M-2/S-4 缺口。"
4. [ ] `error-catalog.md` 增行：`3101 | 规则拒绝：承重不足 / 浮力不足 | 未在 ERR 中定义（事实码） | game-core/hook:133, game-core/raft:17`
5. [ ] 两处调用点加注释：`// 3101 是事实码，不在 ERR 中 —— 见 docs/03_solution/data/error-catalog.md`

**验收标准**
- [ ] 全仓 `grep -rn "20 个动作\|12 件\|4 个 Tab\|5 个面板\|load+migrate"` 结果为空
- [ ] `error-catalog.md` 含 `3101`
- [ ] `npm run typecheck` exit 0（只改注释，不应有任何类型变化）
- [ ] **不得**修改任何 `err(3101)` 的值

**验证命令**
```bash
grep -rn "20 个动作\|12 件\|4 个 Tab\|5 个面板\|load+migrate" server/src client/assets/scripts docs/03_solution/data/ || echo "OK: 无残留"
grep -n "3101" docs/03_solution/data/error-catalog.md
npm run typecheck
```

**证据路径** `docs/06_validation/evidence/EVD-7002/`

**允许修改** `server/src/gateway/handlers.ts`、`client/assets/scripts/app/{MainView,GameApp}.ts`、`docs/03_solution/data/error-catalog.md`、`packages/game-core/src/{hook,raft}/index.ts`（仅注释行）
**禁止修改** `packages/contracts/**`、`server/db/migrations/**`、任何逻辑行

**依赖与阻塞**
- Depends on：TASK-7001
- Blocks：无
- 阻塞条件：若要改注释就必须改代码（例如发现注释描述的行为其实是另一处代码在做），**停下来报告**，不要自作主张

**建议执行档位** `sonnect`　理由：纯文本替换，但"改成什么"必须准，需要读懂上下文

**升级条件** 若发现注释与实际代码的差异超过 4 处（本卡只覆盖 4 处），升级 `opus` 并重开卡

**预估规模** 小（约 1 小时，**<2 小时 → 与 TASK-7004 合并执行**）

---

### TASK-7003：未实现动作改返回"明确未开放"

**归属**
- 所属切片：S0
- 来源需求：I-5
- 来源方案：本文件

**目标**
客户端收到 `c=4999 'not implemented'` 时不再当成系统错误重试，而是走"功能未开放"分支。

**输入**
- 文档：`02-requirement-inventory.md §2`（8 个 todo 动作）
- 契约：`ERR`（`errors.ts`）
- 前置任务：无
- 前置状态：**需 D-46 裁决**（用哪个码）

**输出**
- 修改 `server/src/gateway/handlers.ts`（`todo` 实现体）
- 修改 `client/assets/scripts/services/net/RpcClient.ts`（识别该码不重试）
- 修改 `docs/03_solution/data/error-catalog.md`

**Execution Steps**
1. [ ] **等 D-46**：候选码 ① 复用 `4999` 但 `msg` 改为固定 `FEATURE_NOT_AVAILABLE`；② 新增 `4998`（需解冻契约）
2. [ ] 按裁决改 `todo` 返回值
3. [ ] `RpcClient` 遇到该码：不重试、不弹通用错误、走 `ux.ts` 的"未开放"态
4. [ ] 补 1 个集成测试：调 `ads.claim`（若仍 todo）→ 断言码与"不重试"

**验收标准**
- [ ] 8 个 todo 动作中任一个被调用，返回码等于 D-46 裁决值
- [ ] `RpcClient` 对该码的重试次数为 0（可用 mock 断言）
- [ ] 既有 174 用例中**只有** `tests/integration/payload.test.mjs` 可能受影响，定向跑通过

**验证命令**
```bash
node --import ./tools/runtime/register.mjs --test tests/integration/payload.test.mjs
node --import ./tools/runtime/register.mjs --test tests/contract/handlers.test.mjs
```

**证据路径** `docs/06_validation/evidence/EVD-7003/`

**允许修改** `server/src/gateway/handlers.ts`、`client/assets/scripts/services/net/RpcClient.ts`、`docs/03_solution/data/error-catalog.md`、`tests/integration/payload.test.mjs`
**禁止修改** `packages/contracts/**`（除非 D-46 选方案 ②，那需要单独一张解冻卡）

**依赖与阻塞**
- Depends on：**D-46 裁决**
- Blocks：TASK-7020（ads.claim 实现前，客户端必须能区分"未开放"）
- 阻塞条件：D-46 未裁决 → **不开工**

**建议执行档位** `sonnect`
**升级条件** 若 D-46 选方案 ②（解冻契约）→ 升级 `opus`，并补 ADR
**预估规模** 小（约 1 小时，**<2 小时 → 并入 TASK-7020**）

---

### TASK-7004：占位值与真实值可区分

**归属**
- 所属切片：S0
- 来源需求：I-2、N-5
- 来源方案：`04-data-contract-gaps.md §4`

**目标**
`npm run gen` 产出的 config JSON 里，占位字段带可识别标记，任何消费者（人/代码）都能区分"设计源原值"与"裁决占位值"。

**输入**
- 文档：`game-data/UNKNOWN-TABLES.md §3`、`04-data-contract-gaps.md §4`
- 契约：无
- 前置任务：TASK-7001
- 前置状态：shells 清单已产出

**输出**
- 修改 `game-data/UNKNOWN-TABLES.md`（§3 表格加一列「可用性」）
- 修改 `tools/gen/config.mjs`（输出 `_placeholder.json` 旁挂清单：`{table: {field: true}}`）
- 不改任何 `.csv`

**Execution Steps**
1. [ ] 按 `04 §4` 的 10 组字段建占位清单常量
2. [ ] `gen:config` 额外产出 `client/assets/resources/config/_placeholder.json`
3. [ ] `UNKNOWN-TABLES.md §3` 每行加「可用性」列（❌ 影响计算 / ⚠ 仅影响平衡 / ✅ 设计源原值）
4. [ ] 守卫不新增检查（避免立刻红），只在 `docs` 里说明用途

**验收标准**
- [ ] `_placeholder.json` 存在且包含 `items.weight`、`items.capacity`
- [ ] 重跑 `npm run gen` 后 `git status` 只多出该文件（其余 config 不变）
- [ ] `UNKNOWN-TABLES.md` 的 ✅ 标记与「可用性」列不再矛盾

**验证命令**
```bash
npm run gen:config
node -e "const p=require('./client/assets/resources/config/_placeholder.json');console.log(p.items.weight, p.items.capacity)"
git status --porcelain client/assets/resources/config | head
```

**证据路径** `docs/06_validation/evidence/EVD-7004/`

**允许修改** `tools/gen/config.mjs`、`game-data/UNKNOWN-TABLES.md`
**禁止修改** `game-data/source/*.csv`、`packages/game-core/**`

**依赖与阻塞**
- Depends on：TASK-7001
- Blocks：TASK-7031
- 阻塞条件：若 `gen:config` 的产出参与 `configVersion` 计算（`sha(JSON.stringify(clean))`），新增文件会**改变 cfg 版本号** → 必须先确认旁挂文件不进 hash，否则停下来

**建议执行档位** `sonnect`
**升级条件** 若确实会污染 `configVersion`，升级 `opus`（涉及热更语义）
**预估规模** 中（约 2.5 小时）

---

### TASK-7005：5 个空 service 的处置

**归属**
- 所属切片：S0
- 来源需求：F2-2（零引用空壳）、S-1（服务器时间）
- 来源方案：本文件

**目标**
`services/{audio,pool,time,bus,log}` 五个 2 行空壳，各自有明确处置结论（实现 / 标注 / 删除），不再以"存在"冒充"能力"。

**输入**
- 文档：`01-fact-baseline.md F2-2`
- 契约：`IPlatform`（`safeArea`/`vibrateShort`/`lifecycle` 已有真实现）
- 前置任务：无
- 前置状态：无

**输出**
- `services/time/index.ts`：**实现**（SR-06 要求，唯一有明确需求的）
- `services/audio/index.ts`：**标注** `@unimplemented`（v1.1，无音频资源）
- `services/pool/index.ts`：**标注**（无性能基线前不优化，N-6）
- `services/bus/index.ts`：**删除**（无消费者，且 `nav.ts` 已承担事件职责）
- `services/log/index.ts`：**标注**（telemetry 模块未接客户端，见 `02 §2`）

**Execution Steps**
1. [ ] `time`：实现 `syncFromResponse(t)` / `now()` / `offsetMs()` / `resetForTest()`，**纯客户端、不 import cc**
2. [ ] `RpcClient` 每次收到响应调 `syncFromResponse(res.t)`
3. [ ] 其余四个按上表处置，标注统一用 `/** @unimplemented v1.1：<原因> —— 见 plan-v010/02 */` 头注释
4. [ ] `bus` 删除前确认 `grep -rn "services/bus" client/` 为 0（已实测 0）

**验收标准**
- [ ] `services/time` 有 4 个导出且被 `RpcClient` 引用
- [ ] 删除 `bus` 后 `npm run typecheck:client` 仍 0 错
- [ ] 剩余 4 个空壳都有 `@unimplemented` 头注释，且 `npm run shells` 能识别（与 TASK-7001 联动）

**验证命令**
```bash
grep -rn "services/bus" client/ || echo "OK: bus 已无引用"
npm run typecheck:client
npm run shells | grep services
```

**证据路径** `docs/06_validation/evidence/EVD-7005/`

**允许修改** `client/assets/scripts/services/**`、`client/assets/scripts/services/net/RpcClient.ts`
**禁止修改** `platform/**`、`features/**`、`app/**`

**依赖与阻塞**
- Depends on：无（`time` 部分与 TASK-7010 可并行，但都改 `RpcClient` → **实际必须串行**）
- Blocks：TASK-7042（启动链需要时间同步）
- 阻塞条件：若 `RpcResponse` 的 `t` 字段含义与服务端不一致（服务端 `clock.ts` 用 `Date.now()`），先核对再实现

**建议执行档位** `sonnect`
**升级条件** 若时间同步需要改契约（如新增 `serverT` 字段），升级 `opus`
**预估规模** 中（约 3 小时；`time` 部分 2 小时，其余 1 小时）

## 3. S1 · 登录与合规真接线

> **S1 的诚实前提**：`account.login` 服务端在 `WDF_AUTH_MODE=platform` 时**直接抛错**
> （`account/service.ts:41-43`）。真接 `code2session` 需要 `appid` + `secret`。
> **这两样在仓库里没有，我无法验证是否存在** → `B-3` BLOCKING。
> 因此 S1 拆成「不阻塞的前半」与「阻塞的后半」，**不要把后半排进本期**。

### TASK-7010：客户端平台登录接线（不阻塞）

**归属**：S1 / M-9 前半 / 无外部依赖
**目标**：客户端不再硬编码 `code:'mock-code'` 与 `plat:'wechat'`，改为 `getPlatform().login()` + `getPlatform().name`。

**输入**
- 文档：`01-fact-baseline.md F10`、`02 §4.1 M-9`
- 契约：`account` 的 `LoginReq`（`packages/contracts/src/account/index.ts`）
- 前置任务：TASK-7005（都改 RpcClient 周边，串行）
- 前置状态：`IPlatform.login()` 已实现（`WechatPlatform.ts:8`）

**输出**
- 修改 `client/assets/scripts/app/BootController.ts`（`onEnter`）
- 可能修改 `client/assets/scripts/platform/contracts/IPlatform.ts`（若 `name` 需要映射到 `plat` 枚举）

**Execution Steps**
1. [ ] `const { code } = await getPlatform().login();`
2. [ ] `const plat = getPlatform().name;`（`'app'` == 契约里的 `plat` 取值？先核 `LoginReq.plat` 的枚举）
3. [ ] `invoke('account.login', { code, plat })`
4. [ ] `web` 平台 `WebPlatform.login()` 返回什么？若返回假 code，在 dev 下允许（服务端 `dev` 模式不校验 code）

**验收标准**
- [ ] 全仓 `grep -rn "mock-code"` 为空
- [ ] 全仓 `grep -rn "plat: 'wechat'"` 为空
- [ ] `npm run typecheck:client` 0 错
- [ ] 人工：Web 构建下点"进入主界面"能拿到 token（服务端 `dev` 模式）

**验证命令**
```bash
grep -rn "mock-code\|plat: 'wechat'" client/assets/scripts/ || echo "OK"
npm run typecheck:client
```

**证据路径** `docs/06_validation/evidence/EVD-7010/`
**允许修改** `client/assets/scripts/app/BootController.ts`、`client/assets/scripts/platform/**`
**禁止修改** `server/**`、`packages/contracts/**`
**依赖与阻塞**：Depends TASK-7005；Blocks TASK-7014。阻塞条件：若 `LoginReq.plat` 是字面量枚举而 `IPlatform.name` 含 `'web'`，**停下来问**（可能需要契约补 `'web'`）
**档位** `sonnect`　**升级条件** 需改契约 → `opus`
**规模** 小（约 1.5 小时，**<2 小时 → 与 TASK-7014 合并**）

### TASK-7011：服务端 `platform` 模式接 `code2session`（🔴 BLOCKING）

**归属**：S1 / M-9 后半
**目标**：`WDF_AUTH_MODE=platform` 时能拿微信 `openid` 建号。
**输入**：`account/service.ts:41` 现状 + 微信文档（`code2session`）
**输出**：`server/src/modules/account/platform.ts`（新增）+ `service.ts` 改分支
**Execution Steps**
1. [ ] 等 `B-3`：确认 `appid`/`secret` 的注入方式（env）
2. [ ] `POST https://api.weixin.qq.com/sns/jscode2session`（**注意：小游戏用的是这个端点，不是 `code2Session`**——开工前必须核对官方文档，不得凭记忆）
3. [ ] 失败映射：微信 `errcode` → 本项目 `ERR`（2001/2002）
4. [ ] 加集成测试：mock `fetch` 返回固定 `openid` → 断言建号/复登
**验收标准**
- [ ] `WDF_AUTH_MODE=platform` 且 env 齐全时，`account.login` 返回真实 `playerId`
- [ ] env 缺失时**明确报错**，不静默回落 `dev`
**验证命令** `WDF_AUTH_MODE=platform node --import ./tools/runtime/register.mjs --test tests/integration/auth.test.mjs`
**证据路径** `docs/06_validation/evidence/EVD-7011/`
**允许修改** `server/src/modules/account/**`、`server/src/main.ts`
**禁止修改** `client/**`、`packages/contracts/**`
**依赖与阻塞**：**Depends B-3（微信凭据）**。未确认凭据前 **不排期、不开工**
**档位** `opus`　**升级条件** 若需改 `identity` 表结构 → `fable` + ADR
**规模** 中（约 4 小时，但**等待凭据的时间不可预估**）

### TASK-7012：ADR-0015 合规数据模型（决策卡，我做）

**归属**：S1 / M-5
**目标**：把"实名/未成年人状态存哪"从讨论变成可执行的 ADR。
**输入**：`04-data-contract-gaps.md §3.2`、`07_release/compliance/anti-addiction.md`、`REQ-C-0001-platform.md`
**输出**：新增 `docs/03_solution/decisions/ADR-0015-compliance-state.md`（`status: proposed`）
**Execution Steps**
1. [ ] 背景：现状是恒真桩（`compliance/service.ts:13`），逐条带行号
2. [ ] 选项：A 只存 `minor` 布尔 / B 存 `birth_year` + `minor` / C 不存状态，每次向平台查
3. [ ] 每个选项写清：隐私面（是否构成个人信息）、防绕过能力、查询成本
4. [ ] **不写结论**（`proposed` 状态不得动代码）
**验收标准**：[ ] front matter 齐全；[ ] 三个选项各有代价与风险；[ ] 含"到期日/回访条件"
**验证命令** `node tools/gen/docs-index.mjs && grep -n "ADR-0015" docs/00_governance/document-index.md`
**证据路径** `docs/06_validation/evidence/EVD-7012/`
**允许修改** `docs/03_solution/decisions/ADR-0015-compliance-state.md`
**禁止修改** 任何代码、任何迁移
**依赖与阻塞**：Blocks TASK-7013。阻塞条件：需 D-45 同时裁决"v1.0 提审是否必须有真实名"
**档位** `opus`（ADR 起草）　**规模** 中（约 3 小时）

### TASK-7013：`compliance.check` 真实化 + 迁移 0002（派）

**归属**：S1 / M-5
**目标**：`minor` 不再恒 `false`；未成年人在禁玩时段登录返回 `2101`。
**输入**：ADR-0015（accepted）、`0001_init.sql`、`ERR.MINOR_TIME_LIMIT=2101`
**输出**：`server/db/migrations/0002_compliance.sql`、`server/src/modules/compliance/{service,repo}.ts`、`tests/integration/compliance.test.mjs`
**Execution Steps**
1. [ ] 按 ADR-0015 建表
2. [ ] `check()` 读状态；无记录时按 ADR 的默认口径
3. [ ] 时段判定用**服务器时间**（`core/clock.ts`），不信任客户端
4. [ ] 5 个用例：无记录 / 成年 / 未成年时段内 / 未成年时段外 / 跨日边界
**验收标准**
- [ ] 未成年 + 22:00 → `account.login` 返回 `2101`（**注意：这个判断在 login 还是 check？必须先定，见阻塞条件**）
- [ ] 迁移可重入（`IF NOT EXISTS`）
**验证命令** `node --import ./tools/runtime/register.mjs --test tests/integration/compliance.test.mjs`
**证据路径** `docs/06_validation/evidence/EVD-7013/`
**允许修改** `server/db/migrations/0002_*.sql`、`server/src/modules/compliance/**`、`tests/integration/compliance.test.mjs`
**禁止修改** `0001_init.sql`、`packages/contracts/**`、`client/**`
**依赖与阻塞**：Depends ADR-0015 accepted。**阻塞条件：`2101` 现在只在契约里定义、无任何调用点 —— 若裁决要求 login 返回它，则要改 `account/login.handler`，属跨模块改动，必须先报备**
**档位** `sonnect`　**规模** 中（约 5 小时）

### TASK-7014：合规拦截 UI（我做）

**归属**：S1 / M-5
**目标**：`2101` 时玩家看到明确的"今日游玩时长已用完"，而不是一个通用错误弹窗。
**输入**：`ux.ts`（六态 + 码映射）、`panel-ui.ts`（现有 UI 工厂）
**输出**：`client/assets/scripts/features/compliance/view/ComplianceGate.ts`（把 18 行占位替换为真实现）、`MainView` 或 `BootController` 挂载点
**Execution Steps**
1. [ ] 沿用 `panel-ui.ts` 的 `addButton` 等工厂（D-35 已定"只抽 `addButton`"，不得新增工厂）
2. [ ] 三态：加载中 / 可进入 / 被拦截（含剩余时间文案）
3. [ ] 不新建面板 Tab（合规是**拦截层**，不是 Tab）
**验收标准**：[ ] 三态可视化；[ ] 文案与 `ux.ts` 映射一致；[ ] `npm run typecheck:client` 0 错
**验证命令** `npm run typecheck:client`
**证据路径** `docs/06_validation/evidence/EVD-7014/`（含录屏，人工）
**允许修改** `client/assets/scripts/features/compliance/**`、`client/assets/scripts/app/**`
**禁止修改** `panel-ui.ts`（除非只是复用）、`server/**`
**依赖与阻塞**：Depends TASK-7010、TASK-7013
**档位** `opus`（UI 设计）　**规模** 中（约 5 小时）

## 4. S2 · 广告闭环

### TASK-7020：`ads.claim` 服务端实现（派）

**归属**：S2 / M-6
**目标**：看一次激励视频 → 服务端按 `ad_placements.daily_cap=3` 计数 → 发奖；超额返回 `3002`。
**输入**
- 契约：`AdClaimReq{placement}` / `AdClaimRes{granted, remainingToday}`（已冻结）
- 数值：`ad_placements.csv` 3 行（`hook_cooldown`/`offline_double`/`shop_refresh`，各 3 次/日）
- 表：**不需要新表**（按 `ledger_entry` 当日 `reason='ads.claim'` 计数，与 `economy.sell` 同策略）
- 前置任务：TASK-7003（未开放语义）、ADR-0014（防作弊口径）
**输出**：`server/src/modules/ads/{service,repo,handlers}.ts`（替换 6 行空壳）、`handlers.ts` 注册、`tests/integration/ads.test.mjs`
**Execution Steps**
1. [ ] 校验 `placement` ∈ `ad_placements.id`，否则 `1001`
2. [ ] 计数：`SELECT count(*) FROM ledger_entry WHERE player_id=$1 AND reason='ads.claim' AND ref=$2 AND created_at >= 当日零点(Asia/Shanghai)`
3. [ ] 达 `daily_cap` → `3002 QUOTA_EXHAUSTED`，`remainingToday=0`
4. [ ] 未达 → 写 `ledger_entry(asset=<按 placement 决定>, delta=1, reason='ads.claim', ref=placement)`
5. [ ] 5 个用例：正常 / 达上限 / 未知 placement / 跨日重置 / **同 rid 重放只发一次**（幂等由网关管，但要验）
**验收标准**
- [ ] 第 4 次同 placement 返回 `3002`
- [ ] 跨日后 `remainingToday` 恢复 3
- [ ] `remainingToday` 与账本条数互补（`3 - used`）
**验证命令** `node --import ./tools/runtime/register.mjs --test tests/integration/ads.test.mjs`
**证据路径** `docs/06_validation/evidence/EVD-7020/`
**允许修改** `server/src/modules/ads/**`、`server/src/gateway/handlers.ts`（仅 `'ads.claim'` 一行）、`tests/integration/ads.test.mjs`
**禁止修改** `packages/contracts/**`、`server/db/migrations/**`（本卡不建表）、`economy/**`
**依赖与阻塞**：Depends ADR-0014 + TASK-7003。**阻塞条件：`AdClaimRes` 没说"给什么"，若需要发放具体物品而没有 `ad_placements` 的奖励字段 → 停下来，这是数值缺口，不得自编**
**档位** `sonnect`　**升级条件** 若必须建表 → `opus`（数据模型变更）
**规模** 中（约 4 小时）

### TASK-7021：激励视频适配器真实现（派）

**归属**：S2 / M-6
**目标**：`WechatPlatform.showRewardedAd` 不再恒返回 `'no-fill'`。
**输入**：`WechatPlatform.ts:11`（现状 `return 'no-fill'` + TODO）
**输出**：`client/assets/scripts/platform/wechat/WechatPlatform.ts`、`douyin/DouyinPlatform.ts`
**Execution Steps**
1. [ ] 按 placement 缓存 `wx.createRewardedVideoAd({ adUnitId })` 实例（**实例必须复用**，注释里已写明）
2. [ ] 监听 `onClose(res)` → `res.isEnded ? 'completed' : 'closed'`；`onError` → `'error'`
3. [ ] **`adUnitId` 从哪来？** 微信后台配置，仓库存不了 → 走 `config` 或构建期常量 → **需 D-4x 裁决**
4. [ ] 抖音同构
**验收标准**：[ ] 返回四种值都能被构造；[ ] 实例复用（不重复 create）；[ ] 不 import `'cc'`
**验证命令** `npm run typecheck:client`（**Cocos 运行时不可测，只能人工**）
**证据路径** `docs/06_validation/evidence/EVD-7021/`（录屏）
**允许修改** `client/assets/scripts/platform/**`
**禁止修改** `features/**`、`panel-ui.ts`
**依赖与阻塞**：Depends `adUnitId` 来源裁决。**阻塞条件：无 `adUnitId` 不得开工**（写了也跑不起来）
**档位** `sonnect`　**规模** 小~中（约 2 小时）

### TASK-7022：ADR-0014 广告防作弊与发奖口径（决策卡，我做）

**归属**：S2
**目标**：明确"服务端不复核广告是否真看完"这一事实，并写清它带来的风险边界。
**输出**：`docs/03_solution/decisions/ADR-0014-ad-reward-verification.md`（`proposed`）
**Execution Steps**
1. [ ] 事实：微信流量主激励视频**无服务端回调**（需核官方文档，不得凭记忆）
2. [ ] 选项：A 只信客户端 + 日限；B 加时长校验（客户端上报 `startedAt`）；C 不接广告
3. [ ] 每个选项的作弊成本与封号可查性
**验收标准**：[ ] 三选项；[ ] 明确写"这是可被刷的"，不美化
**验证命令** `npm run gen:docs && grep -n "ADR-0014" docs/00_governance/document-index.md`
**证据路径** `docs/06_validation/evidence/EVD-7022/`
**允许修改** 仅 ADR 文件
**禁止修改** 任何代码
**依赖与阻塞**：Blocks TASK-7020
**档位** `opus`　**规模** 小（约 2 小时）

## 5. S3 · 数值解锁（🔴 全部 BLOCKING）

> **本切片现在一张卡都不开工。** 它存在的意义是：把"要做什么"写清楚，
> 让裁决者知道每个裁决解锁了什么。

| 卡 | 内容 | 解锁 | 需要 |
|---|---|---|---|
| TASK-7030 | 35 张空表分批裁决（D-42） | 11 个模块 | **用户逐表拍板** |
| TASK-7031 | `items.weight`/`capacity` 真实值（D-43） | **扩筏 C2** | 设计源或裁决 |
| TASK-7032 | `levels`/`unlocks` 裁决 → progression | 等级 1–49、驶出浅海 | D-42 子项 |
| TASK-7033 | `raft_tiles`/`rooms` 裁决 → raft | 扩筏具体形状 | D-42 子项 |

**共同验收标准**：每张表落地后 `npm run gen:config` 通过 + 该模块的定向测试新增 ≥5 例。
**共同禁止**：不得为了"让它能跑"而填一个看起来合理的数。**宁可这张表继续空着。**

## 6. S4 · UI 骨架（我做）

| 卡 | 内容 | 规模 |
|---|---|---|
| TASK-7040 | 账号面板（登录态、绑定入口、换设备提示） | 大（约 8 小时） |
| TASK-7041 | `panel-ui` 空态/错误态统一（六态落地） | 中（约 4 小时） |
| TASK-7042 | 启动链真实化（把 `GameApp` 的三项承诺做成 `BootController` 的真实步骤） | 中（约 5 小时） |

**TASK-7042 的关键**：它必须**先减后加** —— 先删掉 `GameApp` 的虚构注释（TASK-7002 已做），
再决定"离线结算 / Bundle 预下载 / save.flush"三项**哪一项在 v1.0 真的需要**。
按 `02 §4.2`，只有 `save.flush`（S-4 离线结算）是 SHOULD，其余两项无需求来源 → **不实现，只登记**。

## 7. S5 · 体检协议与文档对齐

### TASK-7050：`npm run stage` 定向体检

**归属**：S5 / I-4
**目标**：`npm run stage chest` 一条命令跑完"影响面 + 该模块所有测试"。
**输出**：`tools/dev/stage.mjs`、`package.json`
**Execution Steps**
1. [ ] 调 `tools/guard/impact.mjs` 的逻辑拿到相关文件
2. [ ] 映射文件 → 测试（`tests/{determinism,integration,contract}/<module>*.test.mjs`）
3. [ ] 串行跑选中的测试文件，输出汇总
4. [ ] 找不到测试时**明确打印"该模块无测试"**，不静默成功
**验收标准**：[ ] `npm run stage chest` 跑 ≥4 个文件；[ ] `npm run stage fishing` 打印"无测试"
**验证命令** `npm run stage chest`
**证据路径** `docs/06_validation/evidence/EVD-7050/`
**允许修改** `tools/dev/stage.mjs`、`package.json`（scripts）
**禁止修改** `tools/guard/*`、`tools/runtime/*`
**依赖与阻塞**：Depends TASK-7001
**档位** `sonnect`　**规模** 中（约 3 小时）

### TASK-7051：文档指针与措辞修正

**归属**：S5 / N-4
**目标**：`current-plan.md` 指针指 v010；"v1.0 仍在收口中"改为实测口径。
**输出**：修改 `docs/04_planning/current-plan.md`、`docs/04_planning/roadmap.md`、`plan-v009/00-README.md`（置 superseded）
**验收标准**：[ ] 指针唯一指向 v010；[ ] v009 状态 `superseded`；[ ] 不含"收口"字样
**验证命令** `npm run gen:docs && grep -n "plan-v010" docs/04_planning/current-plan.md`
**允许修改** 上述三个文件
**禁止修改** 其他
**档位** `haiku`　**规模** 小（约 30 分钟）
