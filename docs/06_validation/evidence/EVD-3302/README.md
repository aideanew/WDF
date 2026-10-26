---
id: EVD-3302
title: TASK-3302 存档封印回归测试 验收证据
status: active
module: save
owner: agent-guard
created: 2026-10-26
related: [TASK-3302, MUST-03, MUST-04, DESIGN-0001]
---

# EVD-3302 · 存档封印回归验收证据

## 改动文件

| 文件 | 类型 | 说明 |
|---|---|---|
| `tests/determinism/save-seal.test.mjs` | 新增 | 6 用例。**未改任何业务源码** |

## 机器可验证项（V-05，全部实跑通过）

| id | 场景 | 结果 |
|---|---|---|
| V-05.a | `node --import ./tools/runtime/register.mjs --test tests/determinism/save-seal.test.mjs` | ✅ `tests 6` / `pass 6` / `fail 0` |
| V-05.b | 突变验证后 `git diff --quiet -- packages/game-core/src/save/schema.ts` | ✅ exit 0（已复原，字节一致） |
| V-05.c | PF-04 换行探测（sync 源目录） | ✅ 无输出（0 个 CRLF） |
| V-05.d | `npm test` | ✅ `tests 97` / `pass 97` / `fail 0` |

## 突变验证（本卡的核心价值：证明测试真的会红）

把 `computeChecksum` 临时改为忽略 body（`return 0; // MUTATION`）后：

```
✖ 封印 2（反例）：把已封印对象直接再 sealSave → verifySave 为 false
✖ 封印 4：改 modules 任一字段而不重封印 → verifySave 为 false
ℹ tests 6 / pass 4 / fail 2
```

复原后 `6 pass / 0 fail`，且 `git diff --quiet` 退出 0。

**意义**：用例 2 与 4 构成一对"红绿闭环"——任何未来把 `sealSave({...带 checksum 的对象})` 写回去的改动，
或任何让校验和退化为常量的改动，都会立刻被发现。这正是 plan-v002 终审 NOTE-4 登记的缺口。

## 用例清单

| 用例 | 内容 | 断言 |
|---|---|---|
| 1 | `sealSave` → JSON 往返（模拟落盘/读盘） | `verifySave === true` |
| 2 | **反例**：`sealSave({...sealed})` 不剥离旧 checksum | `verifySave === false` 且 checksum 必然改变 |
| 3 | **正解**：解构剥离后再 seal | `verifySave === true` 且 checksum 不变 |
| 4 | 篡改 5 种字段（modules 值 / 增模块 / revision / savedAt / saveId） | 全部 `false`；重封印后恢复 `true` |
| 5 | checksum 为 `['123','abc',1.5,null,undefined,[],{},true,-1]` | 全部 `false` 且**不抛** |
| 6 | 负数 checksum / 合法整数 checksum | `false` / `true` |

## 已知局限（已写入测试文件头）

> 本文件不覆盖 `client/assets/scripts/services/save/LocalSave.ts` 本体：
> `getPlatform()` 是模块级单例且**无注入点**（`client/assets/scripts/platform/index.ts`），
> Node 环境下也无法 import `cc/env`。故这里测的是**同一条规则的纯函数层**
> （`packages/game-core/src/save/schema.ts`），不是客户端接线。
> 要覆盖接线需先给 platform 增加测试注入点 —— 属业务代码变更，未获授权。
