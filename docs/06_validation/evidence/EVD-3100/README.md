---
id: EVD-3100
title: TASK-3100 客户端配置读取服务 验收证据
status: active
module: config
owner: agent-client-a
created: 2026-10-26
related: [TASK-3100, TASK-3002, ADR-0005, MUST-07]
---

# EVD-3100 · 客户端配置读取服务验收证据

## 改动文件

| 文件 | 类型 | 说明 |
|---|---|---|
| `client/assets/scripts/services/config/tables.ts` | 新增 | 表名/行类型登记 + 缓存 + 在途去重 + 行只读。**零 cc 依赖**，Node 可直接测 |
| `client/assets/scripts/services/config/index.ts` | 修改（原 2 行空壳） | 只注入 Cocos 的 `resources.load` 并转出 API |

## 架构决策：引擎与适配器分离

原计划把缓存写进 `index.ts`，但那会强制 `index.ts` import `cc`（`resources.load`）——
一旦顶部 import `cc`，整个模块在 Node 里就不可 import，V-02 的去重/缓存/只读语义无法自动化。

解法：**引擎放 `tables.ts`（cc-free，I/O 走可注入 loader）**，`index.ts` 只做两件事——
注入 Cocos loader、转出 API。生产路径不需要任何 bootstrap 接线，测试路径直接 `setLoader()`。

## 机器可验证项（V-02，10 项全部实跑通过）

验证脚本（不进仓库，`/tmp/wdf-v02/verify.mjs`，用真实 `resources/config/*.json` 驱动）：

```bash
node --import ./tools/runtime/register.mjs /tmp/wdf-v02/verify.mjs
```

| id | 断言 | 实测 |
|---|---|---|
| V-02.a | `preload(['items','recipes'])` 后行数 | `items=106` / `recipes=80` ✅ |
| V-02.a | `preload` 返回 | `{loaded:['items','recipes'], failed:[]}` ✅ |
| V-02.b | 并发两次 `preload(['items'])` → loader 调用数 | `1` ✅ |
| V-02.c | `table('items')[0].name='X'` 后再读 | 仍为 `漂流木` ✅ |
| V-02.d | `configVersion()` | `'b249f288e985da48'`（与生成物一致）✅ |
| V-02.e-1 | 未预加载 `table('items')` | `[]` + warn，不抛 ✅ |
| V-02.e-2 | 未 preload 时 `configVersion()` | 抛错（**不回落字面量**）✅ |
| V-02.e-3 | 单项失败 | `{loaded:['items'], failed:['prices']}`，不抛 ✅ |
| V-02.e-4 | 并发 preload 时 manifest 读取次数 | `1` ✅ |
| V-02.e-5 | `grep -c "from 'cc'" tables.ts` | `0` ✅ |
| V-02.e-6 | §5.1 类型检查 + `npm run guard` | 零项目错误 / 9-9 ✅ |

结果汇总：`10 pass / 0 fail`

## 关键发现

1. **行浅拷贝不能省**：只返回 `[...arr]` 防不住 `arr[0].name='X'` 改到缓存——brief V-02.c 明确断言这点，
   故实现为 `arr.map(r => ({...r}))`。
2. **manifest 需要自己的去重**：首版把 manifest 读取放在 `preload` 内每次执行，
   并发 preload 会读两次（loader 计数变 3 而非 1）。已加 promise 记忆化。
3. **loader 必须容忍同步实现**：`loadJson(...).then(...)` 对同步返回值会炸；改为 `Promise.resolve(loadJson(...)).then(...)`。

## 已知偏差

| 与任务卡的差异 | 理由 |
|---|---|
| 缓存引擎在 `tables.ts` 而非 `index.ts` | `index.ts` 必须 import `cc` 才能接 `resources.load`，会使其在 Node 不可 import（见上） |
| `configVersion()` 是同步但**需先 `await preload(...)`** | 与 `table()` 的同步风格一致；未加载时抛错而非回落字面量，满足"禁回落"要求 |
| `consume`/`manifest` 等额外去重点 | 由测试实测暴露（V-02.b 计数 3≠1），非原设计 |

## 回滚命令

```bash
git checkout -- client/assets/scripts/services/config/index.ts
rm client/assets/scripts/services/config/tables.ts
```

> 注：`tables.ts.meta` 尚不存在（由 Cocos 编辑器首次打开工程时生成）。回滚时无需删除；
> 若要彻底还原，在编辑器内删除该脚本后再关开工程。
