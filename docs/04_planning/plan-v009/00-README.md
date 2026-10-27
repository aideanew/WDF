---
id: PLAN-V009-00
title: plan-v009 · 闸门可信化与并行写入治理（导航与快照）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V008-00, PLAN-V007-00]
---

# 00 · plan-v009 总导航

> **本目录自 2026-10-27 20:46 起是本项目唯一现行执行规划。**
> 取代 `plan-v008`（v008 保留，其缺陷编号 **F-01 ~ F-42 全部继承**；其中 **F-42 在本版被更正**，见 `02-fact-corrections.md`）。
>
> **v009 与 v008 的唯一区别：**
> v008 回答「**你测的是几点**」——把基线从"结论"改成"带时间戳的快照"。
> v009 回答「**这道闸门到底检了什么**」——因为实测发现：**项目最权威的那道闸门 `npm run verify` 里根本没有类型检查**。
> 「156/156 全绿 + 守卫 9/9」与「client 1 个类型错、server 11 个类型错」可以同时为真，且已经同时为真了很久。

## 1. 规划快照

```yaml
snapshot:
  规划日期: 2026-10-27
  规划时刻: "20:46:08 GMT+8"
  git_branch: master
  git_commit: 1bc9bbf
  双端一致性: 0 / 0          # origin/master 与本地一致（fetch 已核）
  工作区是否干净: false       # 6 条改动，全部来自并行助手线

  # —— 闸门实测（本次全部亲自跑过，命令见 01 文件）——
  npm test:            "156 tests / 156 pass / 0 fail（5.2s）"
  npm run guard:       "9/9 全通过"
  client tsc:          "1 错（MerchantPanel.ts:223）"
  server tsc:          "11 条真错 + 约 30 条环境噪声（@types/node 未安装）"
  npm run verify:      "gen + guard + test —— 不含任何类型检查"

  # —— 服务 ——
  端口5050: "/healthz → {\"ok\":true}"
```

## 2. 本版的核心命题：「全绿」是假的，因为闸门没接电

实测 `package.json`：

```json
"verify": "npm run gen && npm run guard && npm run test"
```

**这条命令里没有 `tsc`。** 于是发生了一件很自然的事：

| 闸门 | 覆盖什么 | 不覆盖什么 |
|---|---|---|
| `npm run gen` | 配置产物与客户端同步 | — |
| `npm run guard` | 9 条结构性约束（目录/纯度/边界/生成物/文档） | **类型** |
| `npm test` | 运行时行为（156 例） | **类型**（Node TS strip-only，类型在运行时被抹掉） |
| ~~tsc~~ | — | **从未进入 verify** |

**后果**：`client/.../MerchantPanel.ts:223` 这一个类型错、`server/.../save/service.ts:9` 这五个类型错，**在"全绿"里躺了至少两代规划**。它们不会让任何测试变红，因为它们根本不参与测试。

**更深一层**：即便把 tsc 加进 verify，server 侧现在也**没法当闸门用**——因为根 `package.json` **没有任何 devDependencies**，`@types/node` 未安装，`tsc -p server` 恒产约 30 条 `Cannot find module 'node:fs'` / `Cannot find name 'process'` / `Cannot find name 'Buffer'` 噪声。过去两代规划对此的处理办法是「**人工过滤，只看 `模块名/` 前缀那几条**」——而这个过滤式**曾经吞掉 7 个真错**（客户端那次，见记忆与 `plan-v008` §13）。

> **所以 v009 的顺序是：先让闸门接电（F-43），再让闸门有电可检（F-46/F-27），最后才谈新增能力（F-42）。**
> 反过来做（先修错、不接电）的结局是：修完还会再坏，且下一轮同样看不见。

## 3. 缺陷台账（本版新增/更正）

编号接续 F-42。完整证据见 `02-fact-corrections.md`。

| 编号 | 缺陷 | 一句话后果 | 等级 | 归属 |
|---|---|---|---|---|
| **F-43** | `npm run verify` **不含类型检查**；根 `package.json` 零 devDependencies，`@types/node` 未装 → server tsc 恒产 ~30 条噪声 | **闸门看起来全绿，是因为闸门没接电**。真错可以无限期潜伏 | **P0** | 我 |
| **F-44** | `docs/07_release/compliance/copyright-materials.md` 由并行线写入**虚假陈述**：「已通过微信官方提供的接口接入防沉迷系统」，而 `server/src/modules/compliance/service.ts:4` 自承「能登录即视为实名通过；未成年标志固定 false；离线额度 0」 | 这是**将要提交给平台的法律文件里的假话**。且该文件被我方 `1bc9bbf` 清掉的过期 `configVersion 16921d30a67a934f` 又回来了 | **P0** | 我 |
| **F-45** | `docs/04_planning/current-plan.md` 现行规划指针被**回滚**：v008 指针被删、v007 重新标为"唯一现行"，并新增「相关问题已修复，合规材料已就绪」 | 接手者按指针读会读到两代前的规划；「已就绪」是 F-44 同源的过度宣称 | **P0** | 我 |
| **F-46** | `server/src/modules/save/service.ts:9` 是全仓**唯一**用扁平 barrel `from '@wodefa/contracts'` 导入子模块类型的文件；其余 6 个模块全用 `@wodefa/contracts/src/<m>/index.ts`。`contracts/index.ts` 把子模块都 `export * as X`（**命名空间**），扁平导入必然 TS2305 | 5 条类型错、**零运行时影响**（Node 类型剥离）→ 所以躺了最久没人管 | **P0** | 我 |
| **F-42（更正）** | 原登记「`gateway/version.ts` 只有一行常量、服务端根本不校验 `cfg`/`sv`」——**表述错误**。实测：版本闸 `cv → 9001` **已实现**（`gateway/rpc.ts:36-41`），有测试（`auth.test.mjs:211`），且 `config.manifest` 有豁免防死锁。真问题拆成三条：**F-42a** `version.ts` 是死文件（导出 `MIDDLEWARE` 全仓零引用）+ 注释承诺的「cfg 不一致 → 附最新 cfg」未实现（`RpcResponse.cfg?` 从未被赋值）；**F-42b** `ratelimit.ts` 同为死文件 → **限流零实现**（`telemetry.track` 是 `auth:false`，无限流即可刷）；**F-42c** `m.sv` 服务端从未读取 | 真正未做的是**限流**与 **cfg 回传**，不是版本闸 | P1 | **a/b 已落地**（6008/6007）；**c 仍待口径**（需先定存档兼容策略，属行为变更，要 ADR） |
| **F-27（重述）** | 根因不是"缺类型收窄"，是 `SellPayload = SellReq & { merchantId: string }` 为 **4015 前的遗留**——`SellReq` 现在**已有** `merchantId?: 'merchant_village'\|'merchant_wander'\|'merchant_black'`，整个交叉类型别名可删 | client tsc 唯一真错 | **P0** | 我（原派助手线 A，收回） |

## 4. 并行写入的实际裁决（不是"全对"也不是"全错"）

本版规划之前，工作区有 6 条改动全部来自并行助手线。逐条实测裁决：

| 文件 | 助手写了什么 | 裁决 | 依据 |
|---|---|---|---|
| `docs/00_governance/glossary.md` | 补「票据 (ticket)」定义 | ✅ **保留** | 术语表缺这一条，补得对 |
| `docs/07_release/compliance/probability-disclosure.md` | `configVersion: 38fc1faf915f8bbf → c6a54f0fb00341c5` | ✅ **保留** | `client/assets/resources/config/_manifest.json` 现值即 `c6a54f0fb00341c5`，**改对了** |
| `docs/07_release/compliance/review-checklist.md` | 把"待编写"写成 6 组自查项 | ⚠️ **保留但改一处** | 方向对（原文件是空壳）。但把「开锁」列为"核心玩法流程"——**v1.0 明确不做开锁**（设计源「首版建议延期」，`chests.lock` 全 `none`） |
| `docs/04_planning/roadmap.md` | 指针 v003 → v007 | ⚠️ **过期两代** | 当前是 v008（本版之后是 v009）。助手写时 v008 已存在 |
| `docs/07_release/compliance/copyright-materials.md` | 删掉全部具体规格（60 页/每页 ≥50 行/页眉页脚/PDF），换成泛泛清单，**写入"已接入防沉迷"**，并带回过期 configVersion | ❌ **驳回** | F-44 |
| `docs/04_planning/current-plan.md` | 删 v008 指针、v007 标唯一现行、新增"问题已修复" | ❌ **驳回** | F-45 |

> **这不是"助手错了"的指控，是一个结构问题**：并行写入者没有被交付「事实基线」，于是它无法判断自己写的是真是假。
> v008 解决了"我这一侧的基线要带时间戳"；**v009 要补另一半：把事实基线做成可交付物**（见 `04-guard-hardening.md` §4 的"事实卡"）。

## 5. 卡片（本版要做的事）

| 卡 | 标题 | 缺陷 | 归属 | 状态 |
|---|---|---|---|---|
| **TASK-6001** | 闸门接电：`typecheck` 脚本 + 并入 `verify` | F-43 | 我 | TODO |
| **TASK-6002** | 装 `typescript` + `@types/node`（dev-only），消 ~30 条噪声 | F-43 | 我 | TODO |
| **TASK-6003** | server tsc 11 条真错归零 | F-46 + 4 处 | 我 | TODO |
| **TASK-6004** | client tsc 归零（F-27 收回自做） | F-27 | 我 | TODO |
| **TASK-6005** | 合规材料去假 + 指针修复 | F-44 / F-45 | 我 | TODO |
| **TASK-6006** | F-42a/b/c 归档与裁决 | F-42 | 我 + 裁决 | ✅ done |
| **TASK-6007** | 限流落地（裁决 1：IP 固定窗口，覆盖全部 `auth:false` 动作） | F-42b | 我 | ✅ done |
| **TASK-6008** | `cfg` 版本提示落地（裁决 2：只回 string，只提示不拒请求） | F-42a | 我 | ✅ done |

**为什么 F-27 收回自己做**：用户既定纪律是「中低难度派外部 Agent」，但 F-27 已经被派出去**至少两代规划**而至今未修（`plan-v008` §10「仍未做」表里就写着它）。派出去不落地 = 没派。且它是 client tsc 归零的**唯一**障碍，挡在闸门接电的必经路上 —— 属于关键路径，收回。

## 6. 验收（本版的"完成"定义）

本版**只有一个总验收**，可一条命令复现：

```bash
npm run verify
```

要求同时满足：

| # | 判据 | 命令 | 期望 |
|---|---|---|---|
| 1 | 配置产物同步 | `npm run gen` | 无 diff |
| 2 | 结构守卫 | `npm run guard` | 9/9 |
| 3 | 运行时行为 | `npm test` | ≥156 pass / 0 fail |
| 4 | **类型检查** | 由 `verify` 内含 | **0 错** |
| 5 | 双端一致 | `git status -sb` | `0 / 0` |
| 6 | 合规无假话 | 人工复核 + `grep "已接入"` | 零命中 |

> 判据 4 是本版存在的理由。**在 TASK-6001 之前，判据 4 根本不存在。**

## 7. 阶段体检纪律（延续 v008）

- **按阶段体检，不全程全量回归**。单张卡只跑它改到的测试 + 它改到的那个 tsc。
- 全量 `npm run verify` 只在**本版收口时跑一次**。
- 每条论据三层凭证：**命令 + 输出原文 + commit hash**。无凭证不写结论。
- 优先自我否定：本版已自我否定一条（F-42）。

## 8. 实施进度

> 只记已验证的事实。每条带 commit 或命令输出。

**全部 8 张卡完成。总验收 `npm run verify` → `exit=0`（本项目史上第一次包含类型检查且通过）。**

| 卡 | 内容 | 状态 | 证据 |
|---|---|---|---|
| **TASK-6001** | `typecheck:client` / `typecheck:server` / `typecheck` 三个脚本 + 并入 `verify` | ✅ done | 接电验收 = **闸门变红**：`npm run typecheck` → `exit=2`（若一加就绿，说明它没接上） |
| **TASK-6002** | 装 `typescript@5.8.3` + `@types/node@22.20.5`（dev-only） | ✅ done | server tsc 输出 **42 行 → 11 行**，`Cannot find module 'node:*'` / `process` / `Buffer` 全消；`core/db.ts(51,14)` 的 `TS7006` **如期消失**（证实它是级联噪声） |
| **TASK-6003** | server tsc 11 条真错归零（5 处改动） | ✅ done | `tsc -p server` → `exit=0`；`npm test` 156/156（重点验 `economy` 额度组，因 6003-d 改了事务分支返回形状） |
| **TASK-6004** | F-27：删 `SellPayload` 陈留别名 + `toMerchantId` 谓词 | ✅ done | `tsc -p client` → **`exit=0`，零输出**；`grep SellPayload` 零命中；`git diff` 新增行**零 `as`** |
| **TASK-6005** | 合规材料去假 + 指针修复 | ✅ done | `copyright-materials.md` 从 `HEAD` 恢复（取回 60 页/≥50 行/页眉页脚/PDF 等规格）+ 新增 §6「未接入项」（5 项，每项带代码行号）；`review-checklist.md` 修正"开锁"误述；`current-plan.md` → v009；`roadmap.md` → v009 |
| **TASK-6006** | 两个死文件处理 + F-42 归档 | ✅ done | `version.ts`/`ratelimit.ts` 的 `export const MIDDLEWARE` 已移除（改为显式"未实现"注释块）；新增 `docs/03_solution/data/gateway-gaps.md` 登记 F-42a/b/c |
| **TASK-6007** | 网关限流落地（裁决 1） | ✅ done | `gateway/ratelimit.ts`：IP 维度固定窗口，覆盖**全部 4 个 `auth:false` 动作**；默认 600/min、`config.manifest` 内置 1200/min；env 可调可关。`tests/integration/ratelimit.test.mjs` **8 例全绿** |
| **TASK-6008** | `cfg` 版本提示落地（裁决 2） | ✅ done | `gateway/version.ts` 的 `attachCfgHint` + `config/service.ts` 的 `activeConfigVersion`（60s 缓存）；`rpc.ts` 的 `withCfgHint()` 覆盖**两条**返回路径。`tests/integration/cfg-hint.test.mjs` **5 例全绿** |

**门禁终值**：

```
npm run verify  →  exit=0
  配置生成     ：46 张表 / 327 行 / configVersion=c6a54f0fb00341c5
  客户端同步   ：43 个文件，清理 0 个失效产物
  守卫         ：9/9 全部通过
  运行时测试   ：169/169 pass / 0 fail   ← 156（原）+ 8（限流）+ 5（cfg 提示）
  类型检查     ：client 0 错 / server 0 错   ← 本次新增，此前从未入门禁
  文档索引     ：227 篇（v008 时 221 篇）
```

## 9. 对计划的偏差

| # | 计划写的 | 实际做的 | 原因 |
|---|---|---|---|
| **D-1** | （计划外发现）`03-cards.md` TASK-6002 假设 client 侧「引擎噪声 102 行」是环境问题，只能靠 `grep -v "^C:/"` 过滤 | **根因是 `client/tsconfig.json` 没设 `skipLibCheck`**——它 `extends "./temp/tsconfig.cocos.json"`（Cocos 生成、被 gitignore），**不走 `tsconfig.base.json`**，而 base 里早已有 `skipLibCheck: true`。加上之后 **103 行 → 1 行** | **这条是本版最重要的计划外收益**：它让「唯一正确过滤式」这条旧教条**整体作废**。现在裸跑 `tsc -p client --noEmit` 就是正确姿势，退出码可信。此前那条 `grep -v "^C:/"` 的规矩本身就是"3 次假绿"里的第 1 次（过滤式吞掉真错），现在终于不用了 |
| D-2 | `03-cards.md` TASK-6006 验收：「`grep -rn MIDDLEWARE server/src` 不再让人误以为中间件已存在」 | 注释块里**仍保留** `MIDDLEWARE` 字样（用于说明"该常量已移除、为何移除"）。**零 `export`** 已达成 | 完全抹掉字样会丢失"这里曾经有个假中间件"这条信息，反而更容易被下一个人重新加回来。验收口径改为「**零导出**」而非「零命中」 |
| D-3 | 计划没写要动 `docs/03_solution/` | 新增 `data/gateway-gaps.md` | F-42a/b/c 需要一个"未实现能力"的归属地；`error-catalog.md` 管错误码，`api-catalog.md` 是生成物不可手改 |
| **D-4** | `05` 裁决 1「建议只对 `account.login` / `telemetry.track` 两个动作限流」 | **扩到全部 4 个 `auth:false` 动作** | 实测 `account.refresh`（HMAC 验签/签发）与 `config.manifest`（查 `config_release`）同样是 `auth:false`。只堵两个等于留两个后门 |
| **D-5** | `05` 裁决 1 建议阈值「60/min」 | **改为 600/min（10 QPS）**，`config.manifest` 内置 1200 | 国内 CGNAT 下一个公网 IP 可能承载成百上千玩家，60/min 会让 NAT 后的正常玩家**进不去游戏**。误杀正常玩家的代价远大于多放几个脚本请求；运维可用 `WDF_RL_DEFAULT_PER_MIN` 随时收紧，不必改代码 |
| **D-6** | 计划没写要动 `error-catalog.md` | 更新 4001 的触发面 | 4001 此前只登记为"榜单超频 / 埋点批量超限"，现在网关层也会返回它（覆盖全部 `auth:false` 动作）。不写清楚，客户端会把"限流"误判成"业务规则拒绝" |

### 执行中修掉的两个自身缺陷（测试抓到，不是设计时想到的）

| # | 缺陷 | 发现方式 | 修法 |
|---|---|---|---|
| **E-1** | `limitPerMinFor` 对空白 env 值用 `Number('   ')` → **0** → 等于**静默关掉限流** | `ratelimit.test.mjs` 限流 6 用例 | 先 `trim()` 再判空；只有显式 `0` 才是关闭 |
| **E-2** | 幂等命中是 `return hit` **提前返回**，绕过末尾统一加 cfg 提示的那段 → 重放时 `cfg === undefined` | `cfg-hint.test.mjs` 第 5 用例（决定性那条） | 把提示抽成 `withCfgHint()`，**两条返回路径都经过它**；缓存里只存业务结果 |

> **E-1 与 E-2 都是"我写的、我以为对、测试一跑就红"的形态。**
> 值得一提的是 E-1 正好就是我写测试时想钉死的那个陷阱（`Number('abc')=NaN`），
> 结果只防了 NaN，没防空白 —— **只想到一半的防御等于没防**。

