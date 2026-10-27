/**
 * chest · 数据访问
 *
 * 只读 `server/generated/config/{chests,locks}.json` —— 这是 `npm run gen` 从
 * `game-data/source/*.csv` 产出的真值，与客户端 `resources/config/*.json` 同源。
 *
 * 为什么不查 DB：`chest.open` 需要判断"这个 itemId 是不是箱子"，这是**静态配置事实**，
 * 不随玩家变化。查 DB 既慢又没有意义。
 *
 * 为什么不放 `game-core`：这是服务端 IO（读文件），game-core 纯度约束禁止 IO。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(HERE, '..', '..', '..', 'generated', 'config');

/** `chests.csv` 的一行。`item_id` 是 D-19 加的列，把箱型对齐到背包物品 id。 */
export interface ChestsRow {
  id: string;
  material: string;
  lock: string;
  smashable: boolean;
  size: number;
  item_id: string;
}

let chestsCache: ChestsRow[] | null = null;

function loadChests(): ChestsRow[] {
  if (chestsCache) return chestsCache;
  const raw = JSON.parse(readFileSync(join(CONFIG_DIR, 'chests.json'), 'utf8')) as ChestsRow[];
  // 读不到 item_id 说明是旧产物：宁可启动即报错，也不要让所有开箱静默失败
  if (!raw.some((c) => typeof c.item_id === 'string' && c.item_id.length > 0)) {
    throw new Error(
      `server/generated/config/chests.json 缺少 item_id 列（${join(CONFIG_DIR, 'chests.json')}）；先跑 npm run gen`,
    );
  }
  chestsCache = raw;
  return raw;
}

/**
 * 用背包里的物品 id 反查箱子配置。
 *
 * 返回 `undefined` = 该物品不是箱子。这包括：
 *  - 四种锁 `item_0068`~`item_0071`（`type=lock`，是挂在箱子上的物品，不是箱子本身）
 *  - 木棍 `item_0020`、材料、工具等
 *
 * 调用方必须把 `undefined` 当作"非法请求"拒绝，不能当作"无锁箱子"放行。
 */
export function findChestByItemId(itemId: string): ChestsRow | undefined {
  return loadChests().find((c) => c.item_id === itemId);
}

/** 所有箱型（仅供测试与运维排查）。 */
export function allChests(): readonly ChestsRow[] {
  return loadChests();
}

/** 测试用：清缓存（配置热更或换目录后重新读取）。 */
export function invalidateChestCache(): void {
  chestsCache = null;
}
