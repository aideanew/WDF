/**
 * economy（金币与商人）· 用例与状态（TASK-4007 覆写空桩，不依赖 cc）。
 *
 * 数据链：`config.table('merchants'/'prices'/'items')` + 扁平 `modules.inventory`
 *        → `sellableRows()` → 面板渲染 → 卖出成功后 `applySell()` 落盘。
 *
 * 裁决依据：
 * - D-15：货币 = **金币**（`modules.wallet = { gold: number }`，键名服从 module-catalog
 *   `save:["wallet"]` 既有声明），是**本地展示镜像**，
 *   权威在服务端 `ledger_entry`；镜像只做累加，禁用于扣费判定。
 * - D-16：单价必须复用 `game-core/economy` 的 `sellValue()`，本文件不重写公式。
 * - D-17：额度是"每商人每日"统一计数，行不参与额度状态。
 */
import { sellValue } from '../../../generated/game-core/economy/index';
import { sealSave, type SaveFile } from '../../../generated/game-core/save/index';
import type { ItemsRow, MerchantsRow, PricesRow } from '../../../generated/game-core/generated/config-types';

/** 商人一览（3 行，D-01）。缺表时返回空数组，面板走空态。 */
export function merchantOptions(rows: readonly MerchantsRow[]): MerchantsRow[] {
  return rows.slice();
}

/** 单价：D-16 规定只准走 game-core 纯函数（公式单点）。 */
export function unitPrice(basePrice: number, recycleBp: number, regionBp: number): number {
  return sellValue(basePrice, recycleBp, regionBp);
}

/** 一行可卖物（背包 ∩ 有回收价）。 */
export interface SellableRow {
  itemId: string;
  name: string;
  count: number;
  /** 单价（金币）。 */
  unit: number;
}

/**
 * 组装可卖列表：只保留 `recycle_bp > 0` 且背包持有 > 0 的物品；
 * 按单价降序、同价按 id 升序（确定性，便于测试与截图比对）。
 */
export function sellableRows(
  inventory: Record<string, unknown> | undefined,
  items: readonly ItemsRow[],
  prices: readonly PricesRow[],
  regionBp: number,
): SellableRow[] {
  const inv = inventory ?? {};
  const priceOf = new Map<string, PricesRow>();
  for (const p of prices) priceOf.set(p.id, p);
  const nameOf = new Map<string, string>();
  for (const it of items) nameOf.set(it.id, it.name);

  const out: SellableRow[] = [];
  for (const key of Object.keys(inv)) {
    const raw = inv[key];
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) continue;
    const p = priceOf.get(key);
    if (!p) continue;
    const recycleBp = typeof p.recycle_bp === 'number' ? p.recycle_bp : 0;
    if (recycleBp <= 0) continue;
    out.push({
      itemId: key,
      name: nameOf.get(key) ?? key,
      count: Math.floor(raw),
      unit: unitPrice(p.base_price, recycleBp, regionBp),
    });
  }
  out.sort((a, b) => (b.unit - a.unit) || (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0));
  return out;
}

/** 读金币镜像（容错：缺键/类型错 → 0）。 */
export function goldOf(save: SaveFile | null): number {
  if (!save) return 0;
  const cur = (save.modules as Record<string, unknown>).wallet;
  if (typeof cur !== 'object' || cur === null) return 0;
  const gold = (cur as { gold?: unknown }).gold;
  return typeof gold === 'number' && Number.isFinite(gold) && gold > 0 ? Math.floor(gold) : 0;
}

/**
 * 卖出成功后的本地落盘：背包 −count（扣到 0 删键）、金币 +herbDelta、revision+1 再 seal。
 *
 * 与 HookModel.settle 同构（剥离旧 checksum → 改 modules → sealSave），
 * 保证 LocalSave.load 的 verify 不会因旧校验和而失败。
 */
export function applySell(save: SaveFile, itemId: string, count: number, herbDelta: number): SaveFile {
  const { checksum: _stale, ...body } = save;
  const modules = { ...body.modules } as Record<string, unknown>;

  const inv = { ...((modules.inventory as Record<string, number> | undefined) ?? {}) };
  const have = typeof inv[itemId] === 'number' ? inv[itemId] : 0;
  const left = have - Math.max(0, Math.floor(count));
  if (left > 0) inv[itemId] = left;
  else delete inv[itemId];
  modules.inventory = inv;

  const prev = goldOf(save);
  modules.wallet = { gold: prev + Math.max(0, Math.floor(herbDelta)) };

  return sealSave({
    ...body,
    modules,
    revision: body.revision + 1,
    savedAt: Date.now(),
  });
}

/** 额度文案（D-17：面板顶部唯一额度入口）。 */
export function quotaText(quotaLeft: number, dailyLimit: number): string {
  const left = Math.max(0, Math.floor(quotaLeft));
  return `今日剩余额度 ${left} / ${Math.floor(dailyLimit)}`;
}

/**
 * 模块出口契约（`features/economy/index.ts` 导出此项）：保持既有"脏标记"惯例。
 * 商人页当前用上面的纯函数式 API；此类留给后续需要缓存投影的视图复用。
 */
export class EconomyModel {
  private version = 0;
  get stateVersion(): number { return this.version; }
  touch(): void { this.version++; }
}
