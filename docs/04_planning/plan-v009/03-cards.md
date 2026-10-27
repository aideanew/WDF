---
id: PLAN-V009-03
title: plan-v009 · 卡片明细（逐卡的改法与验收）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
---

# 03 · 卡片明细

> **顺序不可调换**：6001 → 6002 → 6003 → 6004 → 6005 → 6006。
> 理由：6001/6002 是**让闸门能报警**；6003/6004 是**报警后修错**；6005 是**修被改坏的文档**。
> 先修错后接电，等于把修好的东西放回一个不报警的环境里。

---

## TASK-6001 · 闸门接电

**缺陷**：F-43　`npm run verify` 不含类型检查。

**改法**（`package.json`）：

```json
"typecheck:client": "tsc -p client/tsconfig.json --noEmit",
"typecheck:server": "tsc -p server/tsconfig.json --noEmit",
"typecheck": "npm run typecheck:client && npm run typecheck:server",
"verify": "npm run gen && npm run guard && npm run test && npm run typecheck"
```

**关键细节（否则这道闸门会假绿）**：

1. **不能用 `| grep -v "^C:/"` 的方式接进 verify**。管道 + grep 会把 `tsc` 的退出码吞掉（`grep` 的退出码才是管道的退出码，`grep` 找到/没找到都会影响结果），
   `grep -v` 恒返回 0 → **永远绿**。这正是「过滤式陷阱」的第二次出现。
   **必须**在 `tsconfig` 层面解决噪声（→ TASK-6002），让 `tsc` 自身退出码有意义。
2. `client` 不是 npm workspace 成员（由 Cocos 自管），所以 `typecheck:client` 在根跑，`-p client/tsconfig.json` 指路径。
3. 顺序放**最后**：类型错误不该阻止 `gen`/`guard`/`test` 的诊断输出。

**验收**：
```bash
npm run typecheck; echo "exit=$?"     # 期望：能报出当前 12 个错，exit=1
npm run verify; echo "exit=$?"        # 期望：当前 exit=1（因为 6003/6004 还没做）
```
> **这一步的"成功"是"闸门变红"**，不是变绿。变红才证明它接上电了。

**不做的事**：不修改任何 tsconfig 的 `strict` 相关开关。**不许为了让闸门变绿而放松检查**。

---

## TASK-6002 · 装工具链，消噪声

**缺陷**：F-43　根 `package.json` 无 `devDependencies`，`@types/node` 未装。

**改法**：

```bash
npm install -D --prefer-offline typescript@5.8 @types/node@22
```

装完给 `server/tsconfig.json` 与 `client/tsconfig.json` 都补上 types 解析（`@types/node` 在根 `node_modules/@types`，TS 默认向上查找，通常**不需要**额外配置；若 `node:fs` 仍报错，再在 `server/tsconfig.json` 加 `"types": ["node"]`）。

**为什么必须是 `@types/node@22`**：`engines.node: ">=22"`，本机 managed node 为 22.22.2。装 26.x 会用未来 API 声明去校验当前运行时。

**预期效果**（逐条对照 `01` §5 的 12 行）：

| 位置 | 装之前 | 装之后 |
|---|---|---|
| `core/db.ts(51,14)` TS7006 | 假（级联） | **消失** |
| 约 30 条 `Cannot find module 'node:*'` / `process` / `Buffer` | 噪声 | **消失** |
| 其余 11 条真错 | 真 | **仍在**（交给 6003/6004） |

**验收**：
```bash
npx tsc -p server/tsconfig.json --noEmit 2>&1 | wc -l    # 期望：从 ~42 行降到 11 行
npx tsc -p client/tsconfig.json --noEmit 2>&1 | wc -l    # 期望：只剩引擎侧 C:/ 噪音 + 1 行真错
```
> 若安装失败（离线/沙箱拦截），**降级方案**：保留现有过滤式，但必须在 `verify` 里用
> `bash -c 'npx tsc -p server ... | grep -E "^(server|packages)/" | grep -v <噪声式> ; test ${PIPESTATUS[0]} -eq 0'`
> 显式保留 `PIPESTATUS`，并在文档里把「server tsc 需人工过滤」标为**已知债**。

---

## TASK-6003 · server tsc 11 条真错归零

### 6003-a　F-46 · `save/service.ts:9` 导入路径（5 条）

```diff
-import type { SavePullRes, SavePushReq, SavePushRes, SaveSummary, ResolveForkReq } from '@wodefa/contracts';
+import type { SavePullRes, SavePushReq, SavePushRes, SaveSummary, ResolveForkReq } from '@wodefa/contracts/src/save/index.ts';
```

与其余 6 个模块一致。**不动 `contracts/index.ts`**——改成扁平 `export *` 会和 `chest`/`economy` 等**同名类型**（如各模块都有 `Res`）冲突。

### 6003-b　`gateway/idempotency.ts(18,37) / (20,10)`（2 条）

```diff
   if (rows.length === 0) return null;
-  const age = Date.now() - new Date(rows[0].created_at).getTime();
-  if (age > TTL_MS) return null;
-  return rows[0].response;
+  const first = rows[0];
+  if (!first) return null;
+  const age = Date.now() - new Date(first.created_at).getTime();
+  if (age > TTL_MS) return null;
+  return first.response;
```

### 6003-c　`modules/config/service.ts(78,31/38)`（2 条）

`noUncheckedIndexedAccess` 下 `a[i]` 是 `number | undefined`，循环里不共享收窄。

```diff
-  for (let i = 0; i < 3; i += 1) {
-    if (a[i] !== b[i]) return a[i] < b[i];
-  }
-  return false;
+  // 元组定长 3，解构后每项都是 number（noUncheckedIndexedAccess 下下标访问收窄不了）
+  const [a0, a1, a2] = a;
+  const [b0, b1, b2] = b;
+  if (a0 !== b0) return a0 < b0;
+  if (a1 !== b1) return a1 < b1;
+  return a2 < b2;
```

> **注意语义**：原实现相等时返回 `false`（循环走完）。新版 `return a2 < b2` 在 `a2 === b2` 时也是 `false`，**语义等价**，`auth.test.mjs:211` 会验证。

### 6003-d　`modules/economy/repo.ts(81,17)`（1 条）

`exec` 两条分支返回形状不同（`tx` 分支 `{rows}`，非 `tx` 分支直接数组）→ 联合类型无法索引。

```diff
   const exec = tx
-    ? (sql: string, params: unknown[]) => (tx as { query: (s: string, p: unknown[]) => Promise<{ rows: { used: string }[] }> }).query(sql, params)
+    ? async (sql: string, params: unknown[]) =>
+        (await (tx as { query: (s: string, p: unknown[]) => Promise<{ rows: { used: string }[] }> }).query(sql, params)).rows
     : (sql: string, params: unknown[]) => q<{ used: string }>(sql, params);
```

两条分支统一为 `Promise<{ used: string }[]>`。

> **这处改动的风险点**：把 `tx` 分支从"返回 `{rows}` wrapper"改成"返回 `.rows`"，**语义等价但少一层**。
> 验收必须跑 `tests/integration/economy` 全组（额度相关），不能只看 tsc。

### 6003-e　`modules/leaderboard/repo.ts(42,3)`（1 条）

```diff
-  return rows[0];
+  const row = rows[0];
+  if (!row) throw new Error(`income_daily upsert 未返回行：player=${playerId} day=${day}`);
+  return row;
```

`INSERT ... RETURNING` 必然返回一行，`throw` 是**不可达防御**——但它把「契约被破」从"返回 undefined"变成"显式崩"，比静默坏掉好。

**验收**：
```bash
npx tsc -p server/tsconfig.json --noEmit 2>&1 | grep -E "^(server|packages)/"    # 期望：零输出
npm test -- 2>/dev/null | tail -5                                                  # 期望：156 pass
npm test 2>&1 | grep -E "^(✖|ℹ (pass|fail))"                                       # economy/leaderboard 组不得红
```

---

## TASK-6004 · client tsc 归零（F-27，收回自做）

**缺陷**：F-27　`MerchantPanel.ts:223` TS2322。
**根因**：`SellPayload = SellReq & { merchantId: string }` 是 **4015 前的遗留**；`SellReq` 现在已有 `merchantId?` 字面量联合。

**改法**（`client/assets/scripts/features/economy/view/MerchantPanel.ts`）：

1. **删掉别名**（第 33-34 行整段）：

```diff
-/** 卖出请求（D-18：SellReq 尚无 merchantId 字段，此处局部交叉类型，4015 后收敛）。 */
-type SellPayload = SellReq & { merchantId: string };
```

2. **加类型谓词（零 `as`）**：

```ts
/** 契约 `SellReq.merchantId` 是字面量联合；数据表 `merchants.id` 是 string，收紧点只此一处。 */
type MerchantId = NonNullable<SellReq['merchantId']>;

function toMerchantId(v: string): MerchantId | null {
  if (v === 'merchant_village' || v === 'merchant_wander' || v === 'merchant_black') return v;
  return null;
}
```

> 用三次 `===` 字面量比较让 TS **自己**收窄，不需要 `as`。这是本卡最关键的一点：
> `MerchantPanel` 里原本有 `as` 的传统，**本卡不许新增 `as`**。

3. **调用点改为先收窄再发请求**：

```diff
-      const payload: SellPayload = { itemId, count: 1, merchantId: m.id };
-      const res = await invoke<SellPayload, SellRes>('economy.sell', payload);
+      const merchantId = toMerchantId(m.id);
+      if (!merchantId) {
+        // 配置里的商人 id 不在契约允许的三个值内 —— 不能静默回落到渔村（会按错价成交）
+        repaintStatus('商人数据异常，已中止出售');
+        return;
+      }
+      const payload: SellReq = { itemId, count: 1, merchantId };
+      const res = await invoke<SellReq, SellRes>('economy.sell', payload);
```

**为什么不能回落到 `undefined`**：`SellReq.merchantId` 缺省 = 渔村（服务端兜底）。若玩家选的是"流浪商人"（±30% 不同价），静默回落会**按错价成交**。宁可中止。

**验收**：
```bash
npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 | grep -v "^C:/"   # 期望：零输出
grep -n "as SellPayload\|SellPayload" client/assets/scripts -r                     # 期望：零命中
```
**不做的事**：不改 `EconomyModel.merchantOptions` 的返回类型（它返回 `MerchantsRow[]` 是对的，收窄属于 view 层职责）。

---

## TASK-6005 · 合规材料去假 + 指针修复（F-44 / F-45）

### 6005-a　`copyright-materials.md` 恢复可执行规格，删掉假话

**删**（4 条，逐条给出为什么）：
| 删掉的表述 | 理由 |
|---|---|
| 「已通过微信官方提供的接口接入防沉迷系统」 | `compliance/service.ts:4` 自承是桩（能登录即视为实名通过） |
| 「用户隐私协议：已展示并获得授权」 | 全仓零实现 |
| 「校验配置版本 `16921d30a67a934f`」 | 过期值，现为 `c6a54f0fb00341c5` |
| 「至少包含 15 页以上的游戏内画面」 | 编造的要求，原文件无此条 |

**恢复**（被删掉的可执行规格，从 `git show HEAD:docs/07_release/compliance/copyright-materials.md` 取回）：
- 源程序：前 30 页 + 后 30 页共 60 页；每页 ≥50 行；页眉写软件名 + 版本号；页脚连续页码；导出 PDF。
- 只放自己写的代码：`client/assets/scripts/**`、`packages/**`、`server/src/**`、`tools/**`；**排除**第三方库、Cocos 引擎源码、`node_modules`、`generated/**`。
- 操作说明书：图文对照，每步一张截图 + 一句说明；覆盖启动→出钩→制作→扩筏→上岛 → 榜单；**不写未上线功能**（远洋/PVP/交易）。
- 时间：软著提交 **≤ 2026-10-30**；不加急、自办（中国版权保护中心）。

**新增**（把"未接入"写成"未接入"，而不是不写）：
```
## 未接入项（提审前必须处理或如实声明）
| 项 | 当前状态 | 代码依据 |
|---|---|---|
| 实名认证 | 桩：能登录即视为通过 | server/src/modules/compliance/service.ts:4 |
| 防沉迷（未成年人时段/时长） | 桩：未成年标志固定 false，离线额度 0 | 同上 |
| 隐私协议弹窗 | **未实现** | 全仓 grep "隐私|privacy" 仅命中设计文档 |
```

### 6005-b　`current-plan.md` 指针修复

```diff
-> **v1.0 M2-Phase2 收官**：TASK-4016 宣告本轮冲刺结束。相关问题已修复，合规材料已就绪。
+> **v1.0 收口中**：合规材料存在虚假陈述待修（F-44），类型检查未入门禁（F-43）。**不得对外宣称"已就绪"**。
```
指针：`plan-v008` → **`plan-v009`**（本版），并恢复 v004/v005/v006 的分级语义（那句「废止/冻结归档」的区分是有信息量的，不该合并成"历史，只读"）。

### 6005-c　`roadmap.md` 指针修复（顺带）

`plan-v003` → `plan-v009`。

### 6005-d　`review-checklist.md` 一处事实修正

把「所有核心玩法流程（**开锁**、钓鱼、合成等）」改为「（打捞、制作、扩筏、商人回收、开箱等）」。

依据：设计源「第三层：首版建议延期 —— 所有材质箱子与五类锁组合形成的完整开锁矩阵」（`对话讨论.txt:5117`）；`chests.csv` 三行 `lock` 全 `none`。**v1.0 不做开锁。**

**验收**：
```bash
grep -rn "已接入\|已就绪\|16921d30a67a934f" docs/07_release/compliance/ docs/04_planning/current-plan.md   # 期望：零命中
grep -n "c6a54f0fb00341c5" docs/07_release/compliance/copyright-materials.md                               # 期望：命中
```

---

## TASK-6006 · F-42a/b/c 归档与裁决

本卡**先不做实现**，只做归档 + 提交裁决项。因为：
- **F-42b（限流）** 是新增能力，涉及配额口径（"赶海开场单独配额"这句话在设计源里没有数值），不裁决不能做。
- **F-42a（cfg 回传）** 需要先定 `RpcResponse.cfg` 的语义（是"最新 configVersion 字符串"还是"整个 manifest"），否则实现出来的东西客户端不知道怎么用。

**本卡要做的最小动作**：
1. `version.ts` / `ratelimit.ts` 两个死文件加显式标注，或删除 `MIDDLEWARE` 常量（它们唯一的作用是让 `grep MIDDLEWARE` 看起来"有这个中间件"——这是**误导性代码**）。
2. 在 `docs/03_solution/` 下登记 F-42a/b/c 的契约行为待定项。
3. 提交 `05-pending-decisions.md` 的两个问题。

**验收**：`grep -rn "MIDDLEWARE" server/src` 的结果不再让人误以为中间件已存在。
