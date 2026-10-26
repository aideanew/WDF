/**
 * config · 业务
 *
 * `config.manifest` 是启动链第 2 步（MUST-10）：返回当前 configVersion、热更包地址、最低客户端版本。
 *
 * 数据来源两层：
 *  1. `server/generated/config/_manifest.json` —— `npm run gen` 从 game-data/source 产出的真值，
 *     未发布任何 `config_release` 记录时就用它（本地开发常态）。
 *  2. `config_release` 表 —— 一旦登记过发布记录，就以表里的为准（运维可热更 / 抬门槛）。
 *
 * 版本闸：**只有登记过发布记录才生效**。本地开发没有发布记录 → 不拦任何请求，
 * 避免自己把本地联调锁死（这也是"先本地开发"的直接体现）。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ConfigManifestRes } from '@wodefa/contracts/src/config/index.ts';
import { latestRelease } from './repo.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const GENERATED_MANIFEST = join(HERE, '..', '..', '..', 'generated', 'config', '_manifest.json');

/** 没有 config_release 记录时的兜底最低版本：等于当前客户端版本，等于不拦。 */
const DEFAULT_MIN_CLIENT = process.env.WDF_MIN_CLIENT_VERSION ?? 'v0.1.0-s1';

let generatedCache: { configVersion: string } | null = null;

/** 读 `npm run gen` 的产物。读不到就报错，不猜一个假的 configVersion。 */
function generatedConfigVersion(): string {
  if (generatedCache) return generatedCache.configVersion;
  const raw = JSON.parse(readFileSync(GENERATED_MANIFEST, 'utf8')) as { configVersion?: string };
  if (!raw.configVersion) throw new Error(`generated 配置缺少 configVersion：${GENERATED_MANIFEST}（先跑 npm run gen）`);
  generatedCache = { configVersion: raw.configVersion };
  return raw.configVersion;
}

// 版本闸每个请求都要判断，但发布记录极少变 —— 缓存 60s，避免每请求一次 SQL
const GATE_TTL_MS = 60_000;
let gateCache: { at: number; minClient: string | null } | null = null;

/** 当前生效的最低客户端版本；null = 未登记发布记录，不启用版本闸。 */
export async function activeMinClient(): Promise<string | null> {
  const at = Date.now();
  if (gateCache && at - gateCache.at < GATE_TTL_MS) return gateCache.minClient;
  const row = await latestRelease();
  const minClient = row?.min_client ?? null;
  gateCache = { at, minClient };
  return minClient;
}

/** 测试/运维改过 config_release 后手动失效缓存。 */
export function invalidateConfigCache(): void {
  gateCache = null;
}

export async function manifest(): Promise<ConfigManifestRes> {
  const row = await latestRelease();
  const res: ConfigManifestRes = {
    // 验收标准 1：未发布时返回值必须与 `npm run gen` 输出完全一致
    configVersion: row?.version ?? generatedConfigVersion(),
    minClientVersion: row?.min_client ?? DEFAULT_MIN_CLIENT,
  };
  // 验收标准 2：packUrl 为空时不报错、字段不出现
  if (row?.pack_url) res.packUrl = row.pack_url;
  return res;
}

/**
 * 客户端版本是否低于下限。
 * 只解析 `vMAJOR.MINOR.PATCH`（本项目约定 fmt），解析不出来一律**放行**：
 * 版本串写错不该把玩家挡在门外，宁可放过也不误杀。
 */
export function isOlderThan(cv: string | undefined, min: string): boolean {
  const a = parse(cv);
  const b = parse(min);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

function parse(v?: string): [number, number, number] | null {
  if (!v) return null;
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
