/**
 * chest（箱子）· 用例与状态（TASK-5007 覆写 11 行空桩，**不依赖 cc**，可 Node 直测）。
 *
 * 数据链：`save.modules.inventory`（扁平 `{itemId: count}`）+ `chests` 配置
 *        → `project()` 投影成箱子行 → 面板渲染 → 开箱成功后 `applyOpen()` 落盘。
 *
 * 三条边界：
 * - **本文件不做业务判定**：`chest.open` 的结果以服务端为准，这里只把
 *   "背包里有几个箱子"投影成可展示的行；
 * - **不 import `cc`**：保证能被 Node 单测（`client/**` 依赖 `'cc'` 的部分天然测不到，
 *   所以纯逻辑必须留在 model 层）；
 * - **不做随机**：v1.0 开箱结果是服务端固定的保底物，客户端不应有 `Math.random()`。
 *
 * v1.0 范围（设计源裁决）：只做**无锁开箱**。设计源把「完整开锁矩阵」列为
 * "首版建议延期"（`对话讨论.txt:5117`），且"每级工具能开哪些锁 / 消耗多少耐久 /
 * 各档锁收益"三项至今无定义（`5162`）。因此：
 * - `chests.csv` 三行 `lock` 全为 `none` → `openable` 恒 true；
 * - 若将来出现 `lock !== 'none'` 的行，本函数会如实标 `openable: false`，
 *   面板显示"需开锁工具（未开放）"并禁用按钮 —— **诚实降级，不是隐藏**。
 */
import { sealSave, type SaveFile } from '../../../generated/game-core/save/index';
import type { ChestsRow, ItemsRow } from '../../../generated/game-core/generated/config-types';

/** 材质 → 中文名（`chests.csv` 的 material 列）。 */
const MATERIAL_NAME: Readonly<Record<string, string>> = {
  wood: '木箱',
  copper: '铜箱',
  iron: '铁箱',
};

/** 锁档 → 中文名（`locks.csv` 的 id 列，含 none）。 */
const LOCK_NAME: Readonly<Record<string, string>> = {
  none: '无锁',
  iron: '铁锁',
  copper: '铜锁',
  silver: '银锁',
  gold: '金锁',
};

export function materialText(material: string): string {
  return MATERIAL_NAME[material] ?? material;
}

export function lockText(lock: string): string {
  return LOCK_NAME[lock] ?? lock;
}

/** 面板上的一张箱子卡。 */
export interface ChestRow {
  /** 背包物品 id（`chest.open` 的入参），如 `item_0065`。 */
  itemId: string;
  /** 箱型 id（配置表主键），如 `chest_wood`。 */
  chestId: string;
  /** 显示名（优先 `items.name`，缺失按材质兜底，绝不显示裸 id）。 */
  name: string;
  /** 背包持有数（≥1）。 */
  count: number;
  material: string;
  lock: string;
  /** v1.0 只支持 `lock === 'none'`；其余为 false，面板须禁用按钮。 */
  openable: boolean;
}

/**
 * 把背包段投影成箱子行。
 *
 * @param inventory `save.modules.inventory`（未知类型，内部兜底；脏数据按 0 处理）
 * @param chests    `config.table('chests')`
 * @param items     id→行 索引（调用方构造一次后复用）
 *
 * 顺序 = 配置表原序（木→铜→铁），不排序：开箱是低频操作，稳定顺序比"按数量排"更利于截图比对。
 * 只保留 `count >= 1` 的行；配置里 `item_id` 缺失的行直接跳过（旧产物缺陷，不猜）。
 */
export function projectChests(
  inventory: unknown,
  chests: ReadonlyArray<ChestsRow>,
  items: Record<string, ItemsRow>,
): ChestRow[] {
  const inv = (inventory !== null && typeof inventory === 'object' ? inventory : {}) as Record<string, unknown>;
  const rows: ChestRow[] = [];

  for (const c of chests) {
    const itemId = c.item_id;
    if (typeof itemId !== 'string' || itemId.length === 0) continue;

    const raw = inv[itemId];
    const count = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : 0;
    if (count <= 0) continue;

    rows.push({
      itemId,
      chestId: c.id,
      name: items[itemId]?.name ?? materialText(c.material),
      count,
      material: c.material,
      lock: c.lock,
      openable: c.lock === 'none',
    });
  }
  return rows;
}

/**
 * 开箱成功后把结果投影回本地存档。
 *
 * 口径与 `EconomyModel.applySell` 完全一致（先剥旧 checksum 再 `sealSave`，
 * `revision + 1`，`savedAt = Date.now()`）：不剥离旧 checksum 会导致 `LocalSave.load()`
 * 的 `verifySave` 永远失败 → 玩家开完箱重启就掉档。
 *
 * **只扣 1 个箱**：`chest.open` 一次开一个（服务端就是这么扣的，见 chest/service.ts）。
 */
export function applyOpen(
  save: SaveFile,
  itemId: string,
  rewards: ReadonlyArray<{ itemId: string; count: number }>,
): SaveFile {
  const { checksum: _stale, ...body } = save;
  const modules = { ...body.modules } as Record<string, unknown>;

  const inv = { ...((modules.inventory as Record<string, number> | undefined) ?? {}) };

  const haveRaw = inv[itemId];
  const have = typeof haveRaw === 'number' ? haveRaw : 0;
  const left = have - 1;
  if (left > 0) inv[itemId] = left;
  else delete inv[itemId];

  for (const r of rewards) {
    if (typeof r.itemId !== 'string' || r.itemId.length === 0) continue;
    const n = Math.max(0, Math.floor(r.count));
    if (n === 0) continue;
    // 先取一次再写：`noUncheckedIndexedAccess` 下连续两次索引访问不会共享收窄
    const cur = inv[r.itemId];
    inv[r.itemId] = (typeof cur === 'number' ? cur : 0) + n;
  }

  modules.inventory = inv;

  return sealSave({
    ...body,
    modules,
    revision: body.revision + 1,
    savedAt: Date.now(),
  });
}

/** 箱子面板的状态容器（脏标记惯例与 HookModel / InventoryModel 一致）。 */
export class ChestModel {
  private version = 0;
  private _rows: readonly ChestRow[] = [];

  get stateVersion(): number { return this.version; }
  /** 当前应展示的箱子行（无箱子时为空数组）。 */
  get rows(): readonly ChestRow[] { return this._rows; }

  protected touch(): void { this.version++; }

  project(
    inventory: unknown,
    chests: ReadonlyArray<ChestsRow>,
    items: Record<string, ItemsRow>,
  ): readonly ChestRow[] {
    this._rows = projectChests(inventory, chests, items);
    this.touch();
    return this._rows;
  }

  clear(): void {
    if (this._rows.length === 0) return;
    this._rows = [];
    this.touch();
  }

  /** 指定箱子的当前持有数（并发被抢后刷新用）。 */
  countOf(itemId: string): number {
    const hit = this._rows.find((r) => r.itemId === itemId);
    return hit ? hit.count : 0;
  }
}
