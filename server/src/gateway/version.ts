/**
 * 版本相关的响应修饰：`m.cfg`（客户端 configVersion）与服务端当前值不一致时，
 * 在**成功响应**上补 `cfg: <最新版本>` 作为提示（F-42a，2026-10-27 裁决 2 的实现）。
 *
 * ## 为什么放在这里，而不是做成"中间件"
 *
 * 本文件此前只导出一个无人引用的 `MIDDLEWARE = 'version'` 常量，看起来"有这个中间件"，
 * 实际零实现 —— 属误导性代码，已移除（见 commit `13fac21`）。
 * 现在它只做一件具体的事：**修饰响应**。真正的版本闸（`cv` 低于下限 → 9001）在
 * `rpc.ts` 的 `VERSION_GATE_EXEMPT` 那一段（按符号找，别按行号找 —— 行号会腐烂），
 * 两者职责分开，避免再次出现"两个地方都像在做版本，但只有一个在动"。
 *
 * ## 口径（裁决 2）
 *
 * 1. **只做提示，不拒请求。** 客户端 configVersion 旧了，但旧配置算出的结果**未必错**
 *    （可能只是少了一件物品）。拒绝会让未及时更新的玩家直接无法游戏，
 *    代价远大于收益。真正的硬约束应由**存档 schema 版本**（`m.sv`，F-42c）承担。
 * 2. **只修饰 `c === 0` 的响应。** 失败响应要优先暴露真实错误，
 *    混一个版本提示进去会让排查时以为是版本问题。
 * 3. **字段类型保持 `string`**（契约 `RpcResponse.cfg?: string` 原样），
 *    不改成整个 manifest —— 那要动契约，而契约在冻结期。
 *    客户端拿到不一致信号后自己去拉 `config.manifest`，那里才有 `packUrl` 能做热更。
 * 4. **客户端完全不认这个字段也不会坏。** 它是纯增量提示，老客户端忽略即可。
 */
import type { RpcResponse } from '@wodefa/contracts';

/**
 * 给成功响应补 `cfg` 提示。
 *
 * @param res        handler 的原始响应
 * @param clientCfg  客户端上报的 `m.cfg`（可能缺省）
 * @param latest     服务端当前生效的 configVersion
 */
export function attachCfgHint<D>(res: RpcResponse<D>, clientCfg: string | undefined, latest: string): RpcResponse<D> {
  if ('msg' in res) return res; // 失败分支：不修饰
  if (clientCfg === latest) return res; // 一致：字段不出现（避免噪声）
  if (!latest) return res; // 服务端没拿到版本：宁可不说
  return { ...res, cfg: latest };
}
