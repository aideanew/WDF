// 配置表注册与读取引擎（TASK-3100）。
// **46 张表全部可读**；`_manifest` / `_placeholder` 不是表，不在此列。
// **不 import cc**：行类型取自生成物，I/O 走可注入 loader —— 这样缓存、在途去重、
// 行只读三件事能在 Node 下直接测。Cocos 侧的 loader 由 ./index.ts 注入。
import type {
  AdPlacementsRow,
  BaitRow,
  BlueprintsRow,
  BuildingsRow,
  ChestsRow,
  ConsumersRow,
  CrewTraitsRow,
  DefensesRow,
  DropsRow,
  EventDropsRow,
  EventsRow,
  ExploreRow,
  FacilitiesRow,
  FishRow,
  FoodsRow,
  GeneratorsRow,
  GuideStepsRow,
  HooksRow,
  IslandsRow,
  ItemsRow,
  JobsRow,
  LevelsRow,
  LimitsRow,
  LinesRow,
  LockpickToolsRow,
  LocksRow,
  MerchantsRow,
  OilRow,
  PhrasesRow,
  PricesRow,
  ProtectionCardsRow,
  QualityRow,
  RaftTilesRow,
  RecipesRow,
  RegionsRow,
  RoomsRow,
  SeasonsRow,
  ShipwrecksRow,
  SpawnsRow,
  ThrowablesRow,
  TidesRow,
  TitlesRow,
  UnitsRow,
  UnlocksRow,
  WavesRow,
  ZonesRow,
} from '../../generated/game-core/generated/config-types';

export type TableName =
  | 'ad_placements' | 'bait' | 'blueprints' | 'buildings' | 'chests' | 'consumers'
  | 'crew_traits' | 'defenses' | 'drops' | 'event_drops' | 'events' | 'explore'
  | 'facilities' | 'fish' | 'foods' | 'generators' | 'guide_steps' | 'hooks'
  | 'islands' | 'items' | 'jobs' | 'levels' | 'limits' | 'lines' | 'lockpick_tools'
  | 'locks' | 'merchants' | 'oil' | 'phrases' | 'prices' | 'protection_cards'
  | 'quality' | 'raft_tiles' | 'recipes' | 'regions' | 'rooms' | 'seasons'
  | 'shipwrecks' | 'spawns' | 'throwables' | 'tides' | 'titles' | 'units'
  | 'unlocks' | 'waves' | 'zones';

/**
 * 全部 46 张表名（供批量预加载/测试逐表断言用）。
 * 46 = 40 张非空表 + 6 张设计语义空表（drops/explore/limits/phrases/regions/waves）。
 * `_manifest` / `_placeholder` 不是表，不在此列。
 */
export const TABLE_NAMES = [
  'ad_placements', 'bait', 'blueprints', 'buildings', 'chests', 'consumers',
  'crew_traits', 'defenses', 'drops', 'event_drops', 'events', 'explore',
  'facilities', 'fish', 'foods', 'generators', 'guide_steps', 'hooks',
  'islands', 'items', 'jobs', 'levels', 'limits', 'lines', 'lockpick_tools',
  'locks', 'merchants', 'oil', 'phrases', 'prices', 'protection_cards',
  'quality', 'raft_tiles', 'recipes', 'regions', 'rooms', 'seasons',
  'shipwrecks', 'spawns', 'throwables', 'tides', 'titles', 'units',
  'unlocks', 'waves', 'zones',
] as const satisfies readonly TableName[];

/** 表名 → 行类型。行类型从生成物取，禁止在此复制字段定义。 */
export interface TableRowMap {
  ad_placements: AdPlacementsRow;
  bait: BaitRow;
  blueprints: BlueprintsRow;
  buildings: BuildingsRow;
  chests: ChestsRow;
  consumers: ConsumersRow;
  crew_traits: CrewTraitsRow;
  defenses: DefensesRow;
  drops: DropsRow;
  event_drops: EventDropsRow;
  events: EventsRow;
  explore: ExploreRow;
  facilities: FacilitiesRow;
  fish: FishRow;
  foods: FoodsRow;
  generators: GeneratorsRow;
  guide_steps: GuideStepsRow;
  hooks: HooksRow;
  islands: IslandsRow;
  items: ItemsRow;
  jobs: JobsRow;
  levels: LevelsRow;
  limits: LimitsRow;
  lines: LinesRow;
  lockpick_tools: LockpickToolsRow;
  locks: LocksRow;
  merchants: MerchantsRow;
  oil: OilRow;
  phrases: PhrasesRow;
  prices: PricesRow;
  protection_cards: ProtectionCardsRow;
  quality: QualityRow;
  raft_tiles: RaftTilesRow;
  recipes: RecipesRow;
  regions: RegionsRow;
  rooms: RoomsRow;
  seasons: SeasonsRow;
  shipwrecks: ShipwrecksRow;
  spawns: SpawnsRow;
  throwables: ThrowablesRow;
  tides: TidesRow;
  titles: TitlesRow;
  units: UnitsRow;
  unlocks: UnlocksRow;
  waves: WavesRow;
  zones: ZonesRow;
}

export type TableRow<K extends TableName> = TableRowMap[K];

export interface PreloadResult {
  loaded: TableName[];
  failed: TableName[];
}

type LoadJson = (path: string) => Promise<unknown>;
const MANIFEST_PATH = 'config/_manifest';

let loadJson: LoadJson = async () => {
  throw new Error('[config] 未注入 loader：Cocos 端请从 services/config/index.ts 引入；Node 端用 setLoader() 注入');
};

/** 注入底层 loader（Node 测试用；Cocos 端由 ./index.ts 注入）。 */
export function setLoader(fn: LoadJson): void {
  loadJson = fn;
}

const cache = new Map<TableName, readonly unknown[]>();
const inflight = new Map<TableName, Promise<readonly unknown[]>>();
let manifestVersion: string | undefined;
let manifestPromise: Promise<void> | undefined;

/**
 * 同步读缓存。未预加载返回空数组 + warn（不抛，避免首次渲染崩）。
 * 返回行浅拷贝：只拷数组不够，`table('items')[0].name = x` 仍能改到缓存。
 */
export function table<K extends TableName>(name: K): ReadonlyArray<TableRowMap[K]> {
  const rows = cache.get(name);
  if (!rows) {
    console.warn(`[config] 未预加载: ${name}`);
    return [];
  }
  // 双重断言：行是集体 load 进来的 unknown[]，逐表行类型无法静态证明；
  // 这里只保证"拷贝 + 只读契约"，形状由配置生成器负责。
  return rows.map((r) => ({ ...(r as Record<string, unknown>) })) as unknown as ReadonlyArray<TableRowMap[K]>;
}

/** 并行预加载；已缓存/在途的跳过（幂等）；单项失败记入 failed 并 warn，不抛。 */
export async function preload(names: TableName[]): Promise<PreloadResult> {
  const loaded: TableName[] = [];
  const failed: TableName[] = [];
  const tableJobs = names.map(async (name) => {
    try {
      if (!cache.has(name)) await loadOne(name);
      loaded.push(name);
    } catch {
      inflight.delete(name);
      failed.push(name);
      console.warn(`[config] 加载失败: ${name}`);
    }
  });
  // manifest 与表并行读；失败不记入 failed（它不是表名），configVersion() 会继续抛
  const manifestJob = manifestReady().catch(() => undefined);
  await Promise.all([...tableJobs, manifestJob]);
  return { loaded, failed };
}

/** 同步读配置版本。必须先 preload；禁止回落硬编码字面量。 */
export function configVersion(): string {
  if (manifestVersion === undefined) {
    throw new Error('[config] 未加载 _manifest.json：先 await preload(...)（禁止回落字面量）');
  }
  return manifestVersion;
}

/** 测试与热更用：清缓存、在途表与 manifest 版本。 */
export function clearCache(): void {
  cache.clear();
  inflight.clear();
  manifestVersion = undefined;
  manifestPromise = undefined;
}

function loadOne(name: TableName): Promise<readonly unknown[]> {
  const pending = inflight.get(name);
  if (pending) return pending;
  const p = Promise.resolve(loadJson(`config/${name}`)).then((raw) => {
    const rows = Array.isArray(raw) ? (raw as readonly unknown[]) : [];
    const copy = [...rows];
    cache.set(name, copy);
    inflight.delete(name);
    return copy;
  });
  inflight.set(name, p);
  return p;
}

async function manifestReady(): Promise<void> {
  if (manifestVersion !== undefined) return;
  if (manifestPromise) return manifestPromise;
  manifestPromise = (async () => {
    const raw = await loadJson(MANIFEST_PATH);
    const version = (raw ?? {}) as { configVersion?: unknown };
    if (typeof version.configVersion !== 'string' || version.configVersion === '') {
      throw new Error('[config] _manifest.json 缺 configVersion');
    }
    manifestVersion = version.configVersion;
  })().catch((err) => {
    manifestPromise = undefined;
    throw err;
  });
  return manifestPromise;
}
