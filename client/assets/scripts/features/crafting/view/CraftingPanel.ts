/**
 * 合成面板（TASK-3103 实现，覆写 TASK-3101 桩）。
 *
 * 数据链：`table('recipes')` → `CraftingModel.toShapes()`（剔除 invalid 输入串）
 *  → `LocalSave.load()` 的扁平 `modules.inventory` → `model.project()` 分组。
 *
 * 制作流程（S-10.6 / S-10.7）：
 *  `canCraft` → `consume` → 写回扁平 `modules.inventory` → 剥离旧 checksum → `sealSave` → `revision+1`
 *  → `LocalSave.save()` → 重算计划。材料不足时 `applyToSave` **返回原引用**，本文件据此判定零副作用。
 *
 * 不显示：重量/容量/`station`/`job`/`unlock_level`（G-03，数值未定）。
 */
import { Node, UITransform, Color, Vec3, Graphics } from 'cc';
import { preload, table } from '../../../services/config';
import { LocalSave } from '../../../services/save/LocalSave';
import type { ItemsRow } from '../../../generated/game-core/generated/config-types';
import type { RecipeShape } from '../../../generated/game-core/crafting/index';
import type { PanelHandle } from '../../../app/panel-types';
import { addTitle, addLabel } from '../../../app/panel-ui';
import { CraftingModel, type PlanRow } from '../model/CraftingModel';

const MAX_ROWS = 16;
const ROW_H = 40;
const HEAD_H = 34;
const FIRST_Y = 188;
const NOTICE = '当前版本不校验等级与职业（数值未定）';

const GOLD = new Color(255, 220, 120, 255);
const NORMAL = new Color(220, 230, 245, 255);
const DIM = new Color(160, 175, 195, 255);

export function createCraftingPanel(parent: Node): PanelHandle {
  const node = new Node('CraftingPanel');
  node.addComponent(UITransform).setContentSize(750, 1400);
  node.active = false;
  parent.addChild(node);

  addTitle(node, '合成');
  addLabel({
    parent: node, name: 'Notice', text: NOTICE,
    pos: new Vec3(0, 232, 0), fontSize: 16, width: 660, color: DIM,
  });

  const body = new Node('Body');
  body.addComponent(UITransform).setContentSize(750, 1400);
  node.addChild(body);

  const model = new CraftingModel();

  let ready: Promise<void> | null = null;
  let itemIndex: Record<string, ItemsRow> | null = null;
  let shapeById: Map<string, RecipeShape> | null = null;

  function ensureConfig(): Promise<void> {
    if (!ready) ready = preload(['items', 'recipes']).then(() => undefined);
    return ready;
  }

  /** 两个索引都只构造一次（G-15），渲染路径绝不触碰 preload。 */
  function ensureIndex(): Record<string, ItemsRow> {
    if (itemIndex) return itemIndex;
    const map: Record<string, ItemsRow> = {};
    for (const row of table('items')) map[row.id] = row;
    itemIndex = map;
    return map;
  }

  function clearBody(): void {
    for (const child of body.children.slice()) child.destroy();
  }

  function render(): void {
    clearBody();
    const plan = model.plan;
    if (plan.total === 0) {
      addLabel({ parent: body, name: 'Empty', text: '没有可展示的配方', pos: new Vec3(0, 120, 0), fontSize: 22, color: DIM });
      return;
    }

    const budget = MAX_ROWS;
    let used = 0;
    let y = FIRST_Y;

    if (plan.craftable.length > 0) {
      addLabel({ parent: body, name: 'HeadCraftable', text: `可制作（${plan.craftable.length}）`, pos: new Vec3(0, y, 0), fontSize: 20, color: GOLD });
      y -= HEAD_H;
      const shown = plan.craftable.slice(0, Math.max(0, budget - used));
      used += shown.length;
      for (const row of shown) {
        addRow(row, y);
        y -= ROW_H;
      }
    }
    if (plan.lacking.length > 0) {
      addLabel({ parent: body, name: 'HeadLacking', text: `材料不足（${plan.lacking.length}）`, pos: new Vec3(0, y, 0), fontSize: 20, color: DIM });
      y -= HEAD_H;
      const shown = plan.lacking.slice(0, Math.max(0, budget - used));
      used += shown.length;
      for (const row of shown) {
        addRow(row, y);
        y -= ROW_H;
      }
    }
    const more = plan.total - used;
    if (more > 0) {
      addLabel({ parent: body, name: 'More', text: `还有 ${more} 条配方未显示`, pos: new Vec3(0, y + 4, 0), fontSize: 18, color: DIM });
    }
  }

  function addRow(row: PlanRow, y: number): void {
    const box = new Node(`Recipe_${row.id}`);
    box.addComponent(UITransform).setContentSize(660, ROW_H - 6);
    box.setPosition(new Vec3(0, y, 0));

    const bg = new Node('Bg');
    bg.addComponent(UITransform).setContentSize(660, ROW_H - 6);
    const g = bg.addComponent(Graphics);
    g.fillColor = row.ok ? new Color(38, 52, 72, 255) : new Color(30, 34, 44, 255);
    g.roundRect(-330, -(ROW_H - 6) / 2, 660, ROW_H - 6, 8);
    g.fill();
    box.addChild(bg);

    const line1 = `→ ${row.outName}${row.outCount > 1 ? ` ×${row.outCount}` : ''}`;
    const line2 = row.missing.length > 0 ? row.missing.join('、') : row.inputsText;
    addLabel({
      parent: box, name: 'Text',
      text: `${line1}   ${line2}`,
      pos: new Vec3(0, 0, 0), fontSize: 17, width: 640,
      color: row.ok ? GOLD : NORMAL,
    });

    box.on(Node.EventType.TOUCH_END, () => void craft(row.id));
    body.addChild(box);
  }

  async function craft(recipeId: string): Promise<void> {
    const shape = shapeById?.get(recipeId);
    if (!shape) return;

    const file = LocalSave.load();
    if (!file) return;
    const next = model.applyToSave(file, shape);
    // 同一引用 = 材料不足，零副作用：不落盘、revision 不动
    if (next === file) {
      render();
      return;
    }
    LocalSave.save(next);
    await reload();
  }

  async function reload(): Promise<void> {
    await ensureConfig();
    if (table('items').length === 0 || table('recipes').length === 0) {
      clearBody();
      addLabel({ parent: body, name: 'Fail', text: '配方表读取失败，请重新进入游戏', pos: new Vec3(0, 120, 0), fontSize: 22, color: DIM });
      return;
    }
    const items = ensureIndex();
    const { shapes } = model.toShapes(table('recipes'));
    shapeById = new Map(shapes.map((s) => [s.id, s] as const));
    const save = LocalSave.load();
    model.project(shapes, save?.modules.inventory, items);
    render();
  }

  let inFlight: Promise<void> | null = null;
  function load(): Promise<void> {
    if (inFlight) return inFlight;
    const pending = reload().catch(() => {
      render();
    });
    inFlight = pending;
    return pending.then(
      () => { inFlight = null; },
      () => { inFlight = null; },
    );
  }

  return {
    key: 'crafting',
    node,
    onShow() {
      node.active = true;
      void load();
    },
    onHide() {
      node.active = false;
    },
    refresh() {
      void load();
    },
    destroy() {
      node.destroy();
    },
  };
}
