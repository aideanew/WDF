/**
 * 背包面板（TASK-3102 实现，覆写 TASK-3101 桩）。
 *
 * 数据链：`LocalSave.load()` → 扁平 `modules.inventory` + 配置表 items 索引
 *  → `InventoryModel.project()` → `game-core/inventory.listRows`。
 *
 * 表现约束：
 * - 列表最多 {@link MAX_ROWS} 行，超出显示"还有 N 项"（不滚动容器，规避小游戏端滚动兼容性）；
 * - 空态文案固定"还没有捞到东西，去打捞吧" + 按钮走 `app/nav.navigate('hook')`（不自造回调）；
 * - **不显示重量/容量**（G-03：items 表 weight/capacity 当前 0/106 填充，显示 0 等于伪造数据）。
 *
 * 布局坐标系：面板 750×1400、原点居中；MainView 把内容容器下移 48，
 * 故可用纵向范围约 panel-local [-640, +640]。
 */
import { Node, UITransform, Label, Color, Vec3, Graphics } from 'cc';
import { preload, table } from '../../../services/config';
import { LocalSave } from '../../../services/save/LocalSave';
import { invoke } from '../../../services/net/RpcClient';
import { toUxState } from '../../../generated/contracts/common/ux';
import type { SellReq, SellRes } from '../../../generated/contracts/economy/index';
import type { ItemsRow } from '../../../generated/game-core/generated/config-types';
import type { PanelHandle } from '../../../app/panel-types';
import { addTitle, addEmptyHint, addLabel, addConfirmDialog } from '../../../app/panel-ui';
import { navigate } from '../../../app/nav';
import { InventoryModel } from '../model/InventoryModel';
import { applySell } from '../../economy/index';
import type { ItemRow } from '../../../generated/game-core/inventory/index';

const MAX_ROWS = 20;
const ROW_H = 40;
const FIRST_ROW_Y = 214;

/** 类别显示文案（items.category 枚举 → 中文）。缺省回落原值，避免丢信息。 */
const CATEGORY_LABEL: Readonly<Record<string, string>> = {
  raw: '原材料',
  material: '材料',
  tool: '工具',
  food: '食物',
  facility: '设施',
  building: '建筑',
  chest: '宝箱',
  lock: '锁定',
  equipment: '装备',
  misc: '其他',
};

export function createInventoryPanel(parent: Node): PanelHandle {
  const node = new Node('InventoryPanel');
  node.addComponent(UITransform).setContentSize(750, 1400);
  node.active = false;
  parent.addChild(node);

  addTitle(node, '背包');
  // 列表/空态统一挂在这个容器下，重建时整块清掉
  const body = new Node('Body');
  body.addComponent(UITransform).setContentSize(750, 1400);
  node.addChild(body);

  const model = new InventoryModel();

  // 配置表：preload 幂等（在途去重），这里再包一层记忆化，避免每次 refresh 都走一遍
  let ready: Promise<void> | null = null;
  let index: Record<string, ItemsRow> | null = null;

  function ensureConfig(): Promise<void> {
    if (!ready) ready = preload(['items']).then(() => undefined);
    return ready;
  }

  /** id→行索引只构造一次（G-15）；渲染路径绝不触碰 preload。 */
  function itemsIndex(): Record<string, ItemsRow> {
    if (index) return index;
    const map: Record<string, ItemsRow> = {};
    for (const row of table('items')) map[row.id] = row;
    index = map;
    return map;
  }

  function clearBody(): void {
    for (const child of body.children.slice()) child.destroy();
  }

  function renderRows(rows: readonly ItemRow[]): void {
    clearBody();
    rows.slice(0, MAX_ROWS).forEach((r, i) => {
      const y = FIRST_ROW_Y - i * ROW_H;
      addLabel({
        parent: body,
        name: `Row_${i}`,
        text: `${r.name} ×${r.count} | ${categoryLabel(r.category)} | 基准价 ${r.basePrice}`,
        pos: new Vec3(-80, y, 0),
        fontSize: 20,
        width: 480,
      });

      // 回收按钮
      const btn = new Node(`Recycle_${i}`);
      btn.addComponent(UITransform).setContentSize(96, 34);
      btn.setPosition(new Vec3(260, y, 0));
      const g = btn.addComponent(Graphics);
      g.fillColor = new Color(200, 80, 80, 255);
      g.roundRect(-48, -17, 96, 34, 8);
      g.fill();
      const l = btn.addComponent(Label);
      l.string = '回收';
      l.fontSize = 18;
      l.color = new Color(255, 255, 255, 255);
      l.horizontalAlign = Label.HorizontalAlign.CENTER;
      l.verticalAlign = Label.VerticalAlign.CENTER;
      body.addChild(btn);

      btn.on(Node.EventType.TOUCH_END, () => {
        addConfirmDialog({
          parent: node,
          title: '确认回收',
          text: `确认以基准价回收 1 个 ${r.name} 吗？\n(受当前区域物价影响)`,
          onConfirm: () => void sellOne(r),
        });
      });
    });
    const more = rows.length - MAX_ROWS;
    if (more > 0) {
      addLabel({
        parent: body,
        name: 'More',
        text: `还有 ${more} 项`,
        pos: new Vec3(0, FIRST_ROW_Y - MAX_ROWS * ROW_H - 16, 0),
        fontSize: 18,
        color: new Color(170, 185, 205, 255),
      });
    }
  }

  let busy = false;
  async function sellOne(r: ItemRow): Promise<void> {
    if (busy) return;
    busy = true;
    try {
      const payload: SellReq = { itemId: r.id, count: 1 };
      const res = await invoke<SellReq, SellRes>('economy.sell', payload);
      const save = LocalSave.load() ?? LocalSave.init();
      LocalSave.save(applySell(save, r.id, 1, res.herbDelta));
      void load();
    } catch (e) {
      const code = (e as { code?: number }).code ?? 4999;
      const ux = toUxState(code);
      let text = `回收失败 (${code})`;
      if (ux.state === 'noPermission') text = '登录已失效，请重新登录';
      else if (ux.state === 'empty') text = '限购额度已用完';
      
      addConfirmDialog({
        parent: node,
        text,
        onConfirm: () => {},
      });
    } finally {
      busy = false;
    }
  }

  function renderEmpty(): void {
    clearBody();
    addEmptyHint(body, '还没有捞到东西，去打捞吧');
    makeGoHookButton();
  }

  function renderLoadFailed(): void {
    clearBody();
    addEmptyHint(body, '背包读取失败：配置表未就绪，请重新进入游戏');
  }

  function makeGoHookButton(): void {
    const btn = new Node('GoHookButton');
    btn.addComponent(UITransform).setContentSize(240, 64);
    btn.setPosition(new Vec3(0, -90, 0));

    const bg = new Node('Bg');
    bg.addComponent(UITransform).setContentSize(220, 56);
    const g = bg.addComponent(Graphics);
    g.fillColor = new Color(45, 110, 220, 255);
    g.roundRect(-110, -28, 220, 56, 12);
    g.fill();
    btn.addChild(bg);

    const lbl = new Node('Label');
    lbl.addComponent(UITransform).setContentSize(220, 56);
    const l = lbl.addComponent(Label);
    l.string = '去打捞';
    l.fontSize = 24;
    l.color = new Color(255, 255, 255, 255);
    l.horizontalAlign = Label.HorizontalAlign.CENTER;
    l.verticalAlign = Label.VerticalAlign.CENTER;
    l.overflow = Label.Overflow.SHRINK;
    btn.addChild(lbl);

    btn.on(Node.EventType.TOUCH_END, () => navigate('hook'));
    body.addChild(btn);
  }

  // 在途去重：MainView.switchTo 会连着调 onShow + refresh，不该起两次加载
  let inFlight: Promise<void> | null = null;

  function load(): Promise<void> {
    if (inFlight) return inFlight;
    // 注：不能用 `.finally()`——client/tsconfig 的 target 是 ES2015，lib 里没有 finally。
    const job = (async () => {
      try {
        await ensureConfig();
        if (table('items').length === 0) {
          model.clear();
          renderLoadFailed();
          return;
        }
        const save = LocalSave.load();
        const r = model.project(save?.modules.inventory, itemsIndex());
        if (r.known.length === 0) renderEmpty();
        else renderRows(r.known);
      } finally {
        inFlight = null;
      }
    })();
    inFlight = job;
    return job;
  }

  return {
    key: 'inventory',
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

function categoryLabel(c: ItemRow['category']): string {
  return CATEGORY_LABEL[c] ?? c;
}
