/**
 * 测试用的配置版本号 —— 唯一来源。
 *
 * **禁止在测试里硬编码 `configVersion`**。它是 `npm run gen` 的产物
 * （`tools/gen/config.mjs:73` 的 `sha(JSON.stringify(clean))`），改任何数值行都会变。
 *
 * ## 为什么要有这个文件
 *
 * 2026-10-27 实测：`tests/` 下 **8 个文件**都写死 `'16921d30a67a934f'`，
 * 那是 `1448b88`（10-23 前）时代的值。而 `_manifest.json` 当前是 `c6a54f0fb00341c5`
 * —— 也就是说这些测试的封套里装的是**假版本号**。
 *
 * 它们一直绿着，因为 `server/src/gateway/version.ts` 当时只有一行常量、**什么都不校验**
 * （已登记为 F-42）。这是"测试在说谎"的典型：**校验缺失让错误数据无害化**。
 *
 * 2026-10-27 更新：F-42 的两个子项已落地 ——
 *   - `version.ts` 现在有 `attachCfgHint()`（不一致时在成功响应补 `cfg`，只提示不拒）；
 *   - 版本闸（`cv` 低于下限 → 9001）在 `rpc.ts` 的 `VERSION_GATE_EXEMPT` 段，早已生效。
 * 所以本文件仍是必需的：`cfg` 一旦真的会触发提示，写死旧版本号就会让 e2e 到处带 hint。
 *
 * 现在统一从 `_manifest.json` 读；服务端校验 `cfg` 时这些测试也不会集体变红。
 */
import { readFileSync } from 'node:fs';

const MANIFEST = 'client/assets/resources/config/_manifest.json';

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));

if (typeof manifest.configVersion !== 'string' || manifest.configVersion === '') {
  throw new Error(`${MANIFEST} 缺 configVersion —— 先跑 npm run gen`);
}

/** 与 `CONFIG_VERSION`（client/assets/scripts/generated/.../config-types.ts）同值。 */
export const CONFIG_VERSION = manifest.configVersion;

/**
 * 客户端协议版本。它**不是** gen 产物，是手工跟着契约走的（`RpcClient` 的 `CLIENT_VERSION`）。
 * 放在这里只是为了让测试有个单一出处，改契约时才改。
 */
export const CLIENT_VERSION = 'v0.1.0-s1';
