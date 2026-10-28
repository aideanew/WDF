/**
 * 主界面（核心 TASK-3101 产出，由核心维护，助手不得编辑）。
 *
 * 职责：
 * - 底部 6 个 Tab（打捞/背包/箱子/合成/商人/榜单）用 Graphics 画底栏 + Label，固定尺寸按 `view.getVisibleSize()` 计算；
 * - 切换只 `active` 对应面板节点，不销毁重建（避免重复请求与重建开销）；
 * - 通过 `createXxxPanel` 工厂挂载各 features 面板（助手实现内容）；
 * - 右上角"设"按钮开关设置浮层（不在 PanelKey 内）；
 * - 注册 `setNav` 让面板能请求切 Tab。
 *
 * 布局：内容容器占满可视区并上移留出底栏高度；Tab 栏固定底部；设置按钮固定右上角。
 */
import { _decorator, Component, Node, UITransform, Graphics, Label, Color, Vec3, view } from 'cc';
const { ccclass } = _decorator;

import type { PanelHandle, PanelKey } from './panel-types';
import { setNav, clearNav } from './nav';
import { createHookPanel } from '../features/hook/view/HookPanel';
import { createInventoryPanel } from '../features/inventory/view/InventoryPanel';
import { createChestPanel } from '../features/chest/view/ChestPanel';
import { createCraftingPanel } from '../features/crafting/view/CraftingPanel';
import { createLeaderboardPanel } from '../features/leaderboard/view/LeaderboardPanel';
import { createSettingsPanel, type SettingsHandle } from '../features/settings/view/SettingsPanel';
import { createGuideOverlay, type GuideHandle } from '../features/guide/view/GuideOverlay';
import { createMerchantPanel } from '../features/economy/view/MerchantPanel';

const TABS: ReadonlyArray<{ key: PanelKey; label: string }> = [
  { key: 'hook', label: '打捞' },
  { key: 'inventory', label: '背包' },
  { key: 'chest', label: '箱子' },
  { key: 'crafting', label: '合成' },
  { key: 'merchant', label: '商人' },
  { key: 'leaderboard', label: '榜单' },
];

const TAB_H = 96;

@ccclass('MainView')
export class MainView extends Component {
  private handles: PanelHandle[] = [];
  private settings: SettingsHandle | null = null;
  private guide: GuideHandle | null = null;
  private activeKey: PanelKey = 'hook';
  private tabButtons: Node[] = [];

  start(): void {
    const size = view.getVisibleSize();
    const w = size.width > 0 ? size.width : 750;
    const h = size.height > 0 ? size.height : 1400;

    // 内容容器：占满可视区，底部留给 Tab 栏（不裁剪，仅作定位参考）
    const content = new Node('Content');
    content.addComponent(UITransform).setContentSize(w, h - TAB_H);
    content.setPosition(new Vec3(0, -TAB_H / 2, 0));
    this.node.addChild(content);

    // 按 PanelKey 分发工厂，挂载 6 个面板
    const factories: Record<PanelKey, (p: Node) => PanelHandle> = {
      hook: createHookPanel,
      inventory: createInventoryPanel,
      chest: createChestPanel,
      crafting: createCraftingPanel,
      merchant: createMerchantPanel,
      leaderboard: createLeaderboardPanel,
    };
    for (const t of TABS) {
      this.handles.push(factories[t.key](content));
    }

    // 设置浮层（不在 PanelKey 切换循环内）
    this.settings = createSettingsPanel(this.node);
    // 新手引导覆盖层（TASK-4004）
    this.guide = createGuideOverlay(this.node);

    // 底部 Tab 栏 + 右上角设置入口
    this.buildTabBar(w, h);

    // 注册导航器，供面板"去打捞"等按钮使用
    setNav((key) => this.switchTo(key));

    // 默认进入打捞 Tab
    this.switchTo('hook');
  }

  private buildTabBar(w: number, h: number): void {
    const bar = new Node('TabBar');
    bar.addComponent(UITransform).setContentSize(w, TAB_H);
    bar.setPosition(new Vec3(0, -h / 2 + TAB_H / 2, 0));
    const bg = bar.addComponent(Graphics);
    bg.fillColor = new Color(28, 32, 44, 255);
    bg.fillRect(-w / 2, -TAB_H / 2, w, TAB_H);
    this.node.addChild(bar);

    const tabW = w / TABS.length;
    TABS.forEach((t, i) => {
      const btn = new Node('Tab_' + t.key);
      btn.addComponent(UITransform).setContentSize(tabW, TAB_H);
      btn.setPosition(new Vec3(-w / 2 + tabW * (i + 0.5), 0, 0));
      const lbl = btn.addComponent(Label);
      lbl.string = t.label;
      lbl.fontSize = 22;
      lbl.color = new Color(180, 190, 205, 255);
      lbl.horizontalAlign = Label.HorizontalAlign.CENTER;
      lbl.verticalAlign = Label.VerticalAlign.CENTER;
      bar.addChild(btn);
      this.tabButtons.push(btn);
      btn.on(Node.EventType.TOUCH_END, () => this.switchTo(t.key), this);
    });

    // 设置入口（右上角圆形按钮，单字"设"，规避图标字体缺失风险）
    const gear = new Node('SettingsEntry');
    gear.addComponent(UITransform).setContentSize(72, 72);
    gear.setPosition(new Vec3(w / 2 - 48, h / 2 - 48, 0));
    const gbg = gear.addComponent(Graphics);
    gbg.fillColor = new Color(60, 70, 90, 255);
    gbg.circle(0, 0, 30);
    gbg.fill();
    const gl = gear.addComponent(Label);
    gl.string = '设';
    gl.fontSize = 34;
    gl.color = new Color(220, 230, 245, 255);
    gl.horizontalAlign = Label.HorizontalAlign.CENTER;
    gl.verticalAlign = Label.VerticalAlign.CENTER;
    this.node.addChild(gear);
    gear.on(Node.EventType.TOUCH_END, () => this.toggleSettings(), this);
  }

  private switchTo(key: PanelKey): void {
    // 设置浮层打开时切 Tab 先收起设置
    if (this.settings && this.settings.node.active) this.settings.onHide();

    if (key === this.activeKey) {
      this.find(key)?.onShow();
      return;
    }
    this.find(this.activeKey)?.onHide();
    this.activeKey = key;
    const cur = this.find(key);
    cur?.onShow();
    cur?.refresh();
    this.highlight(key);
  }

  private toggleSettings(): void {
    if (!this.settings) return;
    if (this.settings.node.active) this.settings.onHide();
    else this.settings.onShow();
  }

  private find(key: PanelKey): PanelHandle | undefined {
    return this.handles.find((h) => h.key === key);
  }

  private highlight(key: PanelKey): void {
    this.tabButtons.forEach((btn, i) => {
      const lbl = btn.getComponent(Label);
      if (lbl) {
        const on = TABS[i]!.key === key;
        lbl.color = on ? new Color(255, 220, 120, 255) : new Color(180, 190, 205, 255);
      }
    });
  }

  onDestroy(): void {
    setNav(() => {}); // 清空导航器，避免悬挂引用（实际由 clearNav 更彻底）
    clearNav();
  }
}
