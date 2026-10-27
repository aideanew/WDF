---
id: PLAN-V009-02
title: plan-v009 · 事实更正台账（我自己错在哪）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
---

# 02 · 事实更正台账

> 本文件只做一件事：**把上一版规划（以及我自己的记忆）里被实测推翻的表述，逐条更正**。
> 排序按"错得最贵"到"错得最轻"。每条给：**原表述 → 实测 → 错因 → 判据（以后怎么不再错）**。

---

## 更正 1：F-42「服务端根本不校验 cfg」→ 校验器在工作，死的是另外两个文件

**原表述**（`plan-v008` §3.1 缺陷表 + 我的工作记忆）：
> `F-42`：`gateway/version.ts` 只有一行常量、**零实现**，服务端根本不校验 `cfg` / `sv`。

**实测**：
- 版本闸（`cv`）**已实现且在工作**：`server/src/gateway/rpc.ts:36-41`，调 `activeMinClient()` + `isOlderThan()`，返回 `9001`。
- **有测试**：`tests/integration/auth.test.mjs:211`。
- **设计上还做对了两处**：闸在鉴权之前；`config.manifest` 豁免防死锁。
- `version.ts` 是**死文件**（只导出 `MIDDLEWARE`，全仓零引用），但**它不是实现缺失的证据**——实现搬到了 `rpc.ts`。

**错因（三层）**：
1. **把"文件内容是空的"等同于"功能没有"**。功能可以实现在别处。我只 `cat` 了 `version.ts` 就下结论。
2. **没有反向搜引用**。如果当时跑一次 `grep -rn "activeMinClient\|CLIENT_TOO_OLD" server/src`，一眼就能看到 `rpc.ts` 和测试。
3. **把"我推测的架构"当成"文档的事实"**。`version.ts` 的注释写着"configVersion 不一致 → 响应附带最新 cfg"，我读到注释就断定整个中间件都是桩——实际上注释描述的是**两部分**，前半部分（cv 闸）实现了，后半部分（cfg 回传）没实现。

**更正后的事实（拆三条）**：

| 编号 | 内容 | 证据 | 等级 |
|---|---|---|---|
| F-42a | `gateway/version.ts` 是死文件；其注释承诺的「cfg 不一致 → 响应附最新 cfg」未实现——`RpcResponse.cfg?: string` 字段存在但 `grep -rn "cfg:" server/src` **零命中**，从未被任何 handler 赋值 | `01` §8 | P1 |
| F-42b | `gateway/ratelimit.ts` 同为死文件 → **限流完全没实现**。`telemetry.track` 是 `auth: false`，无限流即可无限刷 | `grep -rn MIDDLEWARE` 只命中常量自身 | **P1** |
| F-42c | `m.sv`（存档 schema 版本）服务端从未读取；`save/service.ts` 只看 `body.schemaVersion` | `01` §8 | P2 |

**判据（以后不再错）**：
> 判定"某功能没实现"之前，**必须先 `grep` 该功能的关键符号全仓，不能只看它"应该在"的那个文件**。
> 文件内容为空 ≠ 功能为空。功能可能搬家了。

---

## 更正 2：F-27「缺类型收窄」→ 是一个 4015 前的陈旧 workaround

**原表述**：
> `MerchantPanel.ts:223` `merchantId: m.id`，`m.id` 是 `string`，而 `SellPayload.merchantId` 是字面量联合 → client tsc 唯一真错。修法是"加类型收窄"。

**实测**（`packages/contracts/src/economy/index.ts`）：

```ts
/** 商人回收请求（ADR-0012）。rid 必带（幂等）。D-18：merchantId 缺省 = 渔村（服务端兜底）。 */
export interface SellReq {
  itemId: string;
  count: number;
  merchantId?: 'merchant_village' | 'merchant_wander' | 'merchant_black';
}
```

`SellReq` **现在已经有** `merchantId` 字段了。而 `MerchantPanel.ts:33-34` 还写着：

```ts
/** 卖出请求（D-18：SellReq 尚无 merchantId 字段，此处局部交叉类型，4015 后收敛）。 */
type SellPayload = SellReq & { merchantId: string };
```

注释自己写着「**4015 后收敛**」——4015 早就落库了，收敛没做。

**错因**：我把这个错**当成"类型系统不够聪明"派给外部 Agent**（`plan-v008` §10「仍未做」表：`F-27 | 助手线 A`），而不是先读一遍它要修的那 3 行。如果当时读了，会立刻发现**修法不是"收窄"，是"删掉整个别名"**。

**更正后的改法**：删 `SellPayload`，直接用 `SellReq`，加一个**零 `as`** 的类型谓词把 `MerchantsRow.id: string` 收窄到契约允许的三个值。

**判据**：
> 派活之前先读**待改的那 3 行**。派出去两代规划都没落地的任务，要怀疑的不是对方，是**任务描述本身不成立**。

---

## 更正 3（新增 F-43）：「全绿」是假的——`verify` 里根本没有类型检查

**原表述**（`plan-v008` §11、§12 以及此后每一轮我为"完成"给出的证据）：
> 「门禁：`npm test` 156/156、`npm run guard` 9/9、client tsc 只剩 1 个错、server tsc 只剩 3 处既存真错」

**实测**：

```json
"verify": "npm run gen && npm run guard && npm run test"
```

**没有 `tsc`。** 而且根 `package.json` **连 `devDependencies` 键都不存在**（`@types/node` 未装，`node_modules/@types/` 目录不存在）。

**这意味着**：
- 我把 tsc 跑出来了，也念了它的结果，但**它不在任何闸门里**。下一轮、下下轮，它照样可以红着，而 `npm run verify` 照样绿。
- 我一直在做「人工过滤 30 条噪声」这件事，并把这个 workaround 写进了工作记忆（「看 server 侧类型错误只筛 `模块名/` 前缀那几条」）。**这是把环境的病当成流程的常态**。

**错因**：
> 我把「门禁」定义成了**我口头汇报的那几条命令**，而不是 `package.json` 里那条真正会被人执行、被 CI 执行、被下一个接手者执行的 `verify`。
> **只要一个检查不在 `verify` 里，它就不是闸门，只是我的个人习惯。个人习惯会在传接中消失。**

**判据**：
> 说"全绿"之前，先 `cat package.json | grep verify`，逐项核对**你念的数字是否真的来自这条命令的输出**。
> 不来自 → 不能说"全绿"，只能说"我手动跑过 X"。

---

## 更正 4（新增 F-44）：合规材料里有假话，而且它是我方"修好了"的那份文件被改坏的

**原表述**（`plan-v008` §12）：
> 「F-36 合规材料虚假陈述 → 助手线 C 负责」

**实测**：并行线确实动了 `docs/07_release/compliance/copyright-materials.md`，结果**换了一批假话，并带回了一个我刚清掉的过期值**：

| 新写入的表述 | 实际 |
|---|---|
| 「**已通过微信官方提供的接口接入防沉迷系统**」 | `server/src/modules/compliance/service.ts:4` 自承：「本地开发口径：**能登录即视为实名通过；未成年标志固定 false；离线额度 0**」。**没有任何真实接入** |
| 「**用户隐私协议**：在游戏启动及收集信息时展示并获得授权」 | 全仓 `grep "隐私\|privacy"` 只命中两个 README 的**设计描述**，零实现 |
| 「校验配置版本：`16921d30a67a934f`」 | 当前值 **`c6a54f0fb00341c5`**（`client/assets/resources/config/_manifest.json`）。`16921d30a67a934f` 是 `1448b88` 时代的值，已由我方 `1bc9bbf` 从 12 个测试文件与文档中清除 |
| 「至少包含 15 页以上的游戏内画面」 | 编造的要求。原文件写的是「图文对照，每步一张截图 + 一句说明」，无页码下限 |

同时**删掉了原文件的全部可执行规格**：源程序 60 页（前 30 + 后 30）、每页 ≥50 行、页眉写软件名 + 版本号、页脚连续页码、导出 PDF、只放自己写的代码（排除 `node_modules`/引擎源码/`generated`）。

**为什么这条是 P0**：
> 《软著提交材料清单》与《提审自查清单》是**要提交给中国版权保护中心 / 微信平台的法律文件**。
> 在其中的虚假陈述不是"文档不准确"，是**申报材料造假**，后果包括驳回、补正、乃至账号处罚。
> 而这份材料**本来是对的**——是我方先修准了，再被改坏的。

**判据**：
> 合规类文档的任何改动，必须能回答「**这句话对应哪一行代码 / 哪一条命令输出**」。
> 答不出来 → 只能写"未接入"，不能写"已接入"。

---

## 更正 5（新增 F-45）：现行规划指针被回滚两代

**实测 diff**（`docs/04_planning/current-plan.md`）：

```diff
-## ⚑ 现行规划指针（2026-10-27 16:10 更新）
+## ⚑ 现行规划指针（2026-10-27 更新）
+
+> **v1.0 M2-Phase2 收官**：TASK-4016 宣告本轮冲刺结束。相关问题已修复，合规材料已就绪。
 
-> | `plan-v001` ~ `plan-v003` | 历史，只读 |
-> | `plan-v004` | **废止**（路径假设与所有权矩阵有 4 处失真） |
-> | `plan-v005` | **冻结归档**（事实基线与 F-01~F-18 缺陷编号仍有效并被继承，步骤编号失效） |
-> | `plan-v006` | **冻结归档**（v005 瘦身版，丢失 4 项关键判据） |
+> | `plan-v001` ~ `plan-v006` | 历史，只读/废止/冻结归档 |
 > | **`plan-v007`** | **唯一现行** |
```

两处问题：
1. **指针指向 v007**，而 `plan-v008` 早就是唯一现行（本版之后是 v009）。
2. **新增「相关问题已修复，合规材料已就绪」**——这句话在 `1bc9bbf` 时刻**已知为假**（F-44 就是证据：合规材料里有假话；F-36 从未修）。

**错因（结构性的，不是个人疏忽）**：
> 并行写入者拿到的是「**要做合规材料**」这个任务，没拿到「**当前事实基线**」。
> 它没有 `plan-v008`，不知道 v008 存在；它没有 `1bc9bbf` 的 diff，不知道 configVersion 已被更正。
> **在缺事实基线的状态下写"事实类文档"，产出必然是编的。**
> 这不能靠"叮嘱助手要严谨"解决，只能靠**把事实基线做成可交付物**（见 `04-guard-hardening.md` §4）。

---

## 更正 6（新增 F-46）：5 条"契约不存在"其实是导入范式不一致

**原表述**（`plan-v008` §2 表格）：
> 「`save/service.ts` 有 5 处既存错误」「契约缺口」

**实测**：5 个类型**都在** `packages/contracts/src/save/index.ts` 里。错在 `contracts/index.ts` 把子模块做成了**命名空间导出**（`export * as save`），只有 `common` 是扁平 `export *`。全仓 7 个 service 里只有 `save/service.ts:9` 用了扁平 barrel。

**为什么能躺这么久**：Node 类型剥离让它在**运行时完全无害**——`import type` 整段被删掉，`SavePullRes` 是什么根本不影响执行。它只影响 tsc，而 tsc 不在 `verify` 里（更正 3）。

**判据（这条最有用）**：
> **一个错误如果"零运行时影响 + 不在闸门里"，它就能无限期存活。**
> 反过来：**找出所有这类错误的方法，就是把闸门补齐**——不是靠人更努力地看。

---

## 更正 7：「client tsc 唯一正确过滤式」这条教条作废

**原表述**（我的工作记忆，写于 2026-10-27 更早）：
> **★客户端类型检查唯一正确过滤式**：`npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 | grep -v "^C:/"`
> （引擎错误是 `C:/` 开头绝对路径）。**禁止**用 `grep 项目路径` 过滤——会漏掉 `services/**`，造成"零错误"假绿。

**实测**：client tsc 的 102 行 `C:/` 输出**不是"环境噪声"**，是 **Cocos 引擎自带 `.d.ts` 内部的真实类型问题**：

```
C:/ProgramData/cocos/.../3d/engine/@types/jsb.d.ts(30,25): error TS7010: 'setAccelerometerEnabled',
  which lacks return-type annotation, implicitly has an 'any' return type.
```

错误码分布：`TS7010`×39 / `TS2304`×29 / `TS2307`×15 / `TS2503`×6 / `TS2833`×5 / `TS7008`×4 / `TS2314`×3 / `TS2552`×1。

**根因**：`client/tsconfig.json` 写的是

```json
{ "extends": "./temp/tsconfig.cocos.json" }
```

它 **`extends` 的是 Cocos 编辑器生成的 `temp/tsconfig.cocos.json`（被 gitignore），不是根的 `tsconfig.base.json`**。
而 `skipLibCheck: true` 只写在 `tsconfig.base.json:11` 里 —— **client 根本继承不到**。默认 `skipLibCheck: false` 意味着 `.d.ts` 也要检查。

**修法**：在 `client/tsconfig.json` 的自定义段补 `"skipLibCheck": true`。

**效果（一条命令，无任何过滤）**：

```
$ ./node_modules/.bin/tsc -p client/tsconfig.json --noEmit
client/assets/scripts/features/economy/view/MerchantPanel.ts(223,56): error TS2322: ...
--- 共 1 行 ---   exit=2
```

**103 行 → 1 行。** 而修掉 F-27 之后：

```
$ ./node_modules/.bin/tsc -p client/tsconfig.json --noEmit
exit=0
```

**为什么这条更正比 F-27 本身更重要**：
> 那条"唯一正确过滤式"的教条，本身**就是本项目 3 次假绿的同一形态**（见 `04-guard-hardening.md` §1 第 1 次）。
> 我把它写进记忆，当作"正确做法"，于是它从一个临时 workaround 变成了**制度**。
> 现在它作废了 —— 而且不是被更好的过滤式作废，是**被"根本不需要过滤"作废**。

**判据（替换旧教条）**：
> **门禁里不许出现管道。** 需要过滤 = 上游配置错。`skipLibCheck` 管库，`@types/node` 管环境，
> 两条配齐之后，`tsc` 的输出**只剩你自己的错**，退出码可信，可以直接进 `verify`。
> 任何"先 grep 再看结果"的类型检查，都不是闸门。

---

## 汇总：本版要修什么、为什么

| 更正 | 缺陷编号 | 性质 | 归属 |
|---|---|---|---|
| 1 | F-42a / F-42b / F-42c | 我把"死文件"当成了"功能缺失"；真缺的是**限流**与 **cfg 回传** | 需裁决（`05`） |
| 2 | F-27 | 陈旧 workaround 冒充类型问题 | TASK-6004（收回自做） |
| 3 | **F-43** | **闸门没接电**——`verify` 无 tsc、无 devDeps | TASK-6001 + 6002 |
| 4 | **F-44** | 合规材料假话（法律风险） | TASK-6005 |
| 5 | **F-45** | 规划指针回滚 + 过度宣称 | TASK-6005 |
| 6 | **F-46** | 导入范式不一致（零运行时影响，故长寿） | TASK-6003 |
| 7 | — | **「唯一正确过滤式」教条作废**：client tsc 的 102 行不是环境噪声，是 `skipLibCheck` 没继承到 | TASK-6002 |
