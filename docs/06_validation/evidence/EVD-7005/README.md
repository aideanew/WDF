---
id: EVD-7005
title: 5 个空 service 的处置
status: accepted
owner: hark
created: 2026-10-28
review: 2026-11-28
---

# EVD-7005 —— 5 个空 service 的处置

- **对应任务**：plan-v010 TASK-7005（`05-slices-and-cards.md`）
- **执行者**：主控
- **独立验收者**：子智能体（防自证循环，结论 **PASS**，完成度 100%）
- **采集时间**：2026-10-28
- **基线**：`31c2c9e`（7004 后）

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | `services/time` 有 4 个导出且被 `RpcClient` 引用 | **PASS** | `syncFromResponse/now/offsetMs/resetForTest`；RpcClient.ts:2 import + :96 `syncFromResponse(resp.t)` |
| 2 | 删除 `bus` 后 `npm run typecheck:client` 0 错 | **PASS** | bus 目录+全部 .meta 已删；源码 0 引用；tsc --noEmit exit 0 |
| 3 | 剩余空壳都有 `@unimplemented` 头注释 | **PASS** | audio/pool/log 头注释逐字核验（**注：services 不在 module-catalog，`npm run shells` 只扫 features/game-core/server-modules，故"shells 识别"对本卡 N/A；真正标记载体是 @unimplemented**） |

## 处置结果

| 模块 | 处置 | 结论 |
|---|---|---|
| `services/time` | **实现**（SR-06） | 4 导出，RpcClient 每次真实响应 `syncFromResponse(resp.t)` |
| `services/bus` | **删除** | 目录+5 个 .meta 全删；源码 0 引用 |
| `services/audio` | **标注** `@unimplemented v1.1` | 无音频资源，v1.0 不做 |
| `services/pool` | **标注** `@unimplemented v1.1` | 无性能基线前不优化（N-6） |
| `services/log` | **标注** `@unimplemented v1.1` | telemetry 未接客户端 |

## 反证（独立验收者）

- `time/index.ts` 无任何 Cocos import（纯客户端）；`now()=Date.now()+offset`、`syncFromResponse(t)=offset=t-Date.now()`。
- `platform/**`、`features/**`、`app/**` 零改动（全部改动限于 `services/**`）。
- 阻塞条件核对：`RpcResponse.t` 两分支均 `t:number`，服务端 `clock.ts` 用 `Date.now()` → 语义一致，无阻塞。
- 非阻断备注：mock 路径不 sync，但 mock 返回客户端本机时间，offset 保持 0 语义自洽，无需改。

## 变更清单（单卡）

- `client/assets/scripts/services/time/index.ts`（重写为 4 导出）
- `client/assets/scripts/services/net/RpcClient.ts`（import + 每次真实响应 sync）
- `client/assets/scripts/services/{audio,pool,log}/index.ts`（@unimplemented 头注释）
- `client/assets/scripts/services/bus/`（整目录删除）

原始输出：`acceptance.txt`。
