/**
 * ⛔ 未实现：客户端版本/configVersion 中间件 —— 见 docs/03_solution/data/gateway-gaps.md
 *
 * 本文件曾导出 `MIDDLEWARE = 'version'`，但**全仓零引用**，加根目录守卫也查不出来。
 * 它唯一的作用是让 `grep MIDDLEWARE` 命中，从而让人误以为中间件存在 —— 属于误导性代码，已移除。
 *
 * 真实情况（2026-10-27 实测，别再搞错）：
 *  1. 版本闸（cv < minClientVersion → 9001）**已实现**，但实现在 `rpc.ts:36-41`，**不在本文件**。
 *     有测试：`tests/integration/auth.test.mjs:211`。`config.manifest` 豁免防死锁（`rpc.ts:19`）。
 *  2. 本文件注释原本承诺的另一半「configVersion 不一致 → 响应附带最新 cfg」**确实未实现**：
 *     契约 `RpcResponse.cfg?: string` 存在，客户端 `RpcClient.ts:81` 也在发 `cfg`，
 *     但 `grep -rn "cfg:" server/src` 零命中 —— 从未被赋值。编号 F-42a。
 *  3. `m.sv`（存档 schema 版本）服务端从未读取（只信 `body.schemaVersion`）。编号 F-42c。
 *
 * 实现前须先裁决语义（`docs/04_planning/plan-v009/05-pending-decisions.md` 裁决 2）。
 */

export {};
