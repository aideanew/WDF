---
id: EVD-3002
title: TASK-3002 configVersion 单一来源 验收证据
status: active
module: config
owner: agent-client-a
created: 2026-10-26
related: [TASK-3002, ADR-0005, MUST-06]
---

# EVD-3002 · configVersion 单一来源验收证据

## 改动文件

| 文件 | 类型 | 说明 |
|---|---|---|
| `client/assets/scripts/services/net/RpcClient.ts` | 修改 | `:10` 字面量 → `import` + `export { CONFIG_VERSION }`（导出名不变，`invoke()` 的 `cfg` 无需改） |
| `client/assets/scripts/services/save/LocalSave.ts` | 修改 | `:48` `configVersion: '16921d30a67a934f'` → `CONFIG_VERSION` |

唯一来源：`client/assets/scripts/generated/game-core/generated/config-types.ts:3` 的 `CONFIG_VERSION = 'b249f288e985da48'`。

## 机器可验证项（V-01.a~d，全部现场实跑）

| id | 场景 | 结果 |
|---|---|---|
| V-01.a | `grep -rn "16921d30a67a934f" client/assets/scripts` | ✅ 无输出（exit 1） |
| V-01.b | `npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit \| grep "error TS" \| grep "E:/Demo/WDF/"` | ✅ 无输出（项目源码零类型错误） |
| V-01.c | `node --import ./tools/runtime/register.mjs --test tests/e2e/skeleton.test.mjs` | ✅ pass 1 / fail 0 |
| V-01.d | `npm run guard` | ✅ 9/9 通过 |

## 已知偏差

| 与任务卡的差异 | 理由 |
|---|---|
| V-01.c 的命令加了 `--import ./tools/runtime/register.mjs` | **卡与 brief 原文写裸 `node --test` 必失败**：`ERR_UNSUPPORTED_DIR_IMPORT`（`packages/*/src` 用无扩展名目录导入，须自定义 loader）。已回灌 brief（新增 G-16 / BASE-31，全篇 13 处命令一并修正） |

## 回滚命令

```bash
git checkout -- client/assets/scripts/services/net/RpcClient.ts client/assets/scripts/services/save/LocalSave.ts
```
