/**
 * 图纸与制作 · 用例与状态（TASK-3103，不依赖 cc）。
 *
 * 与 HookModel 同构：**IO 在 View**（`LocalSave` / 配置表），本类只吃数据出结果。
 * 判定与迁移全部委托 `game-core/crafting`（C-03）的纯函数，本类不重写规则。
 *
 * 边界（S-10.3 / S-10.4）：
 *  - `inputs` 串解析出 `invalid` 的配方**不展示**（数据源 `UNKNOWN-TABLES.md` §4 的设施/建筑类）；
 *  - `station` / `job` / `unlock_level` **完全不读**：job 与 unlock_level 当前 0/80 填充，
 *    假装有等级/职业门槛等于伪造数据（面板顶部固定一行文案说明）。
 */
import {
  canCraft,
  consume,
  parseInputs,
  type InventoryShape,
  type RecipeInput,
  type RecipeShape,
} from '../../../generated/game-core/crafting/index';
import { sealSave, type SaveFile } from '../../../generated/game-core/save/index';
import type { ItemsRow, RecipesRow } from '../../../generated/game-core/generated/config-types';

/** 一行配方的可展示形态。 */
export interface PlanRow {
  id: string;
  out: string;
  outName: string;
  outCount: number;
  /** 材料串，如 `漂流木 ×1 | 铁锭 ×2` */
  inputsText: string;
  ok: boolean;
  /** 缺料文案，如 `缺 铁锭 ×1`；ok 时为空数组 */
  missing: string[];
}

export interface RecipeSet {
  shapes: RecipeShape[];
  /** 输入串无法解析而跳过的配方数（不展示） */
  skippedInvalid: number;
}

export interface CraftPlan {
  craftable: PlanRow[];
  lacking: PlanRow[];
  /** 参与分组的配方总数（已剔除 invalid 与未知产物） */
  total: number;
  /** 产物 id 在 items 表里查不到而跳过的配方数（不展示） */
  skippedUnknown: number;
}

const EMPTY: PlanRow[] = [];

export class CraftingModel {
  private version = 0;
  private _plan: CraftPlan = { craftable: EMPTY, lacking: EMPTY, total: 0, skippedUnknown: 0 };

  get stateVersion(): number { return this.version; }
  get plan(): CraftPlan { return this._plan; }

  protected touch(): void { this.version++; }

  /** 配置行 → 结构化配方；`invalid` 非空的直接剔除（S-10.3）。 */
  toShapes(rows: readonly RecipesRow[]): RecipeSet {
    const shapes: RecipeShape[] = [];
    let skippedInvalid = 0;
    for (const row of rows) {
      const parsed = parseInputs(row.inputs);
      if (parsed.invalid.length > 0) {
        skippedInvalid++;
        continue;
      }
      shapes.push({
        id: row.id,
        out: row.output,
        outCount: Number.isInteger(row.output_count) && row.output_count > 0 ? row.output_count : 1,
        inputs: parsed.inputs,
        rawInputs: row.inputs,
      });
    }
    return { shapes, skippedInvalid };
  }

  /** 分组：可制作 / 材料不足。产物查不到名字的配方跳过（不显示空名字）。 */
  project(shapes: readonly RecipeShape[], section: unknown, items: Record<string, ItemsRow>): CraftPlan {
    const inv: InventoryShape = isRecord(section) ? (section as InventoryShape) : {};
    const craftable: PlanRow[] = [];
    const lacking: PlanRow[] = [];
    let skippedUnknown = 0;

    for (const shape of shapes) {
      const outRow = items[shape.out];
      if (!outRow) {
        skippedUnknown++;
        continue;
      }
      const check = canCraft(shape, inv);
      const row: PlanRow = {
        id: shape.id,
        out: shape.out,
        outName: outRow.name,
        outCount: shape.outCount,
        inputsText: inputsText(shape.inputs, items),
        ok: check.ok,
        missing: check.missing.map((m) => `缺 ${nameOf(items, m.id)} ×${m.need - m.have}`),
      };
      (check.ok ? craftable : lacking).push(row);
    }

    const sortRows = (a: PlanRow, b: PlanRow): number =>
      (a.outName < b.outName ? -1 : a.outName > b.outName ? 1 : cmp(a.id, b.id));
    craftable.sort(sortRows);
    lacking.sort(sortRows);

    this._plan = { craftable, lacking, total: craftable.length + lacking.length, skippedUnknown };
    this.touch();
    return this._plan;
  }

  /**
   * 一次合成（纯函数，**写盘由调用方做**）。
   * 材料不足 → **原样返回入参**（同一引用），库存与 revision 均不变，不产生任何写盘。
   */
  applyToSave(file: SaveFile, recipe: RecipeShape): SaveFile {
    const section = file.modules.inventory;
    const inv: InventoryShape = isRecord(section) ? (section as InventoryShape) : {};
    if (!canCraft(recipe, inv).ok) return file;

    const next = consume(recipe, inv);
    const { checksum: _stale, ...body } = file;
    const modules = { ...body.modules };
    modules.inventory = next;
    return sealSave({
      ...body,
      modules,
      revision: body.revision + 1,
      savedAt: Date.now(),
    });
  }
}

function inputsText(inputs: readonly RecipeInput[], items: Record<string, ItemsRow>): string {
  return inputs.map((i) => `${nameOf(items, i.id)} ×${i.count}`).join(' | ');
}

function nameOf(items: Record<string, ItemsRow>, id: string): string {
  return items[id]?.name ?? id;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** 码元比较，避开 localeCompare 的 ICU 差异，保证跨环境确定性。 */
function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
