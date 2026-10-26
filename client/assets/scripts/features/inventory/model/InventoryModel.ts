/**
 * 物品与仓储 · 用例与状态（TASK-3102，不依赖 cc）。
 *
 * 职责边界（与 HookModel 同构）：
 * - **IO 在 View**（`LocalSave.load()` / `services/config` 的表索引），本类只吃数据、出结果；
 * - 判定与排序全部委托 `game-core/inventory` 的纯函数 `listRows`，本类不重写规则；
 * - 本类持有的只是"当前可展示的行"这一份状态，供 View 与面板复用。
 *
 * 存档段是**扁平** `modules.inventory = { itemId: count }`（见 HookModel.applyToSave），
 * 不是 `modules.inventory.items`。
 */
import {
  listRows,
  type ItemRow,
  type ListRowsResult,
} from '../../../generated/game-core/inventory/index';
import type { ItemsRow } from '../../../generated/game-core/generated/config-types';

const EMPTY: readonly ItemRow[] = [];
const EMPTY_IDS: readonly string[] = [];

export class InventoryModel {
  private version = 0;
  private _rows: readonly ItemRow[] = EMPTY;
  private _unknownIds: readonly string[] = EMPTY_IDS;
  /** 上一次告警过的未知 id 签名；避免每次 refresh 重复刷日志。 */
  private _warnedUnknown = '';

  get stateVersion(): number { return this.version; }
  /** 可展示行：基准价降序、同价按 id 升序（由 listRows 保证确定性）。 */
  get rows(): readonly ItemRow[] { return this._rows; }
  /** 存档里有、配置表里查不到的 id（旧档脏数据）。只进日志，不上屏。 */
  get unknownIds(): readonly string[] { return this._unknownIds; }

  protected touch(): void { this.version++; }

  /**
   * 把存档背包段投影成展示行。
   * `section` = `save.modules.inventory`（可能为 undefined，非法值由 listRows 兜底为空）；
   * `items` = 配置表的 id→行索引，由调用方**构造一次**后复用。
   */
  project(section: unknown, items: Record<string, ItemsRow>): ListRowsResult {
    const r = listRows(section, items);
    this._rows = r.known;
    this._unknownIds = r.unknownIds;
    this.touch();

    const sig = r.unknownIds.join(',');
    if (sig !== this._warnedUnknown) {
      this._warnedUnknown = sig;
      if (r.unknownIds.length > 0) {
        console.warn(`[inventory] 存档里有 ${r.unknownIds.length} 个配置表中不存在的物品 id：${sig}`);
      }
    }
    return r;
  }

  /** 清空展示状态（不接触存档）。 */
  clear(): void {
    if (this._rows === EMPTY && this._unknownIds === EMPTY_IDS) return;
    this._rows = EMPTY;
    this._unknownIds = EMPTY_IDS;
    this.touch();
  }
}
