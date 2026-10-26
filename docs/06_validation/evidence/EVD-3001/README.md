---
id: EVD-3001
title: 证据 — UX 态契约落地（common/ux.ts）
status: active
owner: hark
created: 2026-10-26
review: 2026-11-26
related: [TASK-3001, DESIGN-0001]
---

# EVD-3001 · UX 态契约落地

执行者：**核心（本人）**　完成时间：2026-10-26 17:0x

## 交付物

| 文件 | 说明 |
|---|---|
| `packages/contracts/src/common/ux.ts` | `UxState`/`UxView`/`UX_BY_ERROR_NAME`/`toUxState`/`conflictOf` |
| `packages/contracts/src/common/index.ts` | 追加 `export * from './ux'` |
| `tests/contract/ux.test.mjs` | 7 个契约用例（映射逐行 + 幂等语义 + 未知码兜底 + conflict 来源） |
| `client/assets/scripts/generated/contracts/common/ux.ts` | 由 `npm run sync` 生成（含 GEN_HEADER） |

## 实跑结果（原样摘录）

```
$ node --import ./tools/runtime/register.mjs --test tests/contract/ux.test.mjs
ok 1 - 14 个错误码全覆盖，且逐行与 DESIGN-0001 §2 一致
ok 2 - code===0 → success，不携带出口
ok 3 - 幂等回放 3001 是 success（绝不可当冲突/错误）
ok 4 - 三类典型态：售罄=empty、封禁=noPermission、超频=可重试
ok 5 - noPermission 一律不可重试，且必须给出下一步出口
ok 6 - 未知错误码 → error 可重试，绝不静默当成功
ok 7 - 只有 accepted:false 算冲突，accepted:true 不算
# tests 7 / # pass 7 / # fail 0

$ npx -p typescript@5.8 tsc -p packages/contracts/tsconfig.json --noEmit
（无输出，退出码 0）

$ npm run sync
✅ 已同步 43 个文件到 client/assets/scripts/generated/（清理 0 个失效产物；.meta 未触碰）

$ npm run guard
全部守卫通过（9/9）

$ npm test
# tests 72 / # pass 72 / # fail 0
```

## 关键设计判断（供后续任务参照）

1. **用 `satisfies Record<keyof typeof ERR, ...>` 锁死 14 码**：新增码而未更新映射时是**编译错误**，不是运行时漏判。
2. **`conflict` 不出现在码映射里**：它只能来自 `SavePushRes.accepted === false`；类型上直接禁止（`CodeDrivenRule` 排除了 `'conflict'`）。
3. **未知码 → `error` 可重试**，绝不返回 `success`：宁可多一次重试，不可把失败当成功静默吞掉。
4. **`3001` 映射 `success`**：幂等回放对玩家就是"已成功"，弹错会造成重复点击；这条被测试第 3 例钉死。

## 未覆盖 / 局限

- 本任务只产契约，**没有任何界面消费它**——消费方是 TASK-3101~3105（助手与本人分工执行）。
- `loading` 态无法由码推导，只能由客户端本地产生，故映射表里没有它（文档 §1 已说明）。
