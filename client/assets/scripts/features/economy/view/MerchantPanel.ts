/**
 * 商人面板（TASK-4007 实现，覆写 TASK-3101 的桩）。
 *
 * 数据链：`preload(['merchants','prices','items'])` → `LocalSave.load()`
 *        → `MerchantModel.sellableRows()` → 渲染；点击行卖 1 个 → `invoke('economy.sell')`
 *        → 成功 `MerchantModel.applySell()` 落盘 → 重渲染。
 *
 * 裁决：
 * - D-15 金币：卖出成功 `modules.currency.gold += herbDelta`（本地镜像，权威在服务端 ledger）。
 * - D-16 单价：只经 `MerchantModel.unitPrice()`（内部走 game-core `sellValue`）。
 * - D-17 额度：**仅面板顶部**显示"今日剩余 X / N"，行只显示单价与持有数。
 * - 空额度（3002）→ empty 态"今日额度已用完，明天再来"；影子不一致（1001）→ error 态（toUxState）。
 *
 * 布局：面板 750×1400、原点居中；标题在 y=280，可用纵向 [-640, 640]。
 */
import { Node, UITransform, Label, Color, Vec3, Graphics } from 'cc';
import { preload, table } from '../../../services/config';
import { LocalSave } from '../../../services/save/LocalSave';
import { invoke } from '../../../services/net/RpcClient';
import { toUxState } from '../../../generated/contracts/common/ux';
import type { SellRes } from '../../../generated/contracts/economy/index';
import type { SellReq } from '../../../generated/contracts/economy/index';
import type { PanelHandle } from '../../../app/panel-types';
import { addTitle, addEmptyHint, addLabel } from '../../../app/panel-ui';
import { goldOf, merchantOptions, quotaText, sellableRows, applySell, type SellableRow } from '../model/EconomyModel';

const MAX_ROWS = 12;
const ROW_H = 46;
const FIRST_ROW_Y = 60;
const BTN_W = 196;
const BTN_H = 58;

/**
 * 契约 `SellReq.merchantId` 是字面量联合，而配置表 `merchants.id` 是普通 string。
 * 收窄只在此一处发生，**用三次 `===` 让 TS 自己收窄，不写 `as`**。
 */
type MerchantId = NonNullable<SellReq['merchantId']>;

function toMerchantId(v: string): MerchantId | null {
  if (v === 'merchant_village' || v === 'merchant_wander' || v === 'merchant_black') return v;
  return null;
}

export function createMerchantPanel(parent: Node): PanelHandle {
  const node = new Node('MerchantPanel');
  node.addComponent(UITransform).setContentSize(750, 1400);
  node.active = false;
  parent.addChild(node);

  addTitle(node, '商人');

  // 商人切换按钮行
  const switcher = new Node('Switcher');
  switcher.addComponent(UITransform).setContentSize(750, BTN_H);
  switcher.setPosition(new Vec3(0, 210, 0));
  node.addChild(switcher);

  // 状态行（额度 + 金币 + 提示）
  const statusLabel = addLabel({
    parent: node,
    name: 'Status',
    text: '',
    pos: new Vec3(0, 152, 0),
    fontSize: 20,
    color: new Color(255, 226, 140, 255),
    width: 700,
  });

  // 表头
  const header = addLabel({
    parent: node,
    name: 'Header',
    text: '物品                    单价        持有',
    pos: new Vec3(0, 110, 0),
    fontSize: 18,
    color: new Color(150, 165, 185, 255),
    width: 700,
  });

  // 列表体
  const body = new Node('Body');
  body.addComponent(UITransform).setContentSize(750, 1200);
  node.addChild(body);

  let merchants: ReturnType<typeof merchantOptions> = [];
  let activeMerchantIdx = 0;
  /** 当前商人剩余额度（首进=满额；卖出后取服务端 quotaLeft）。 */
  let quotaLeft = 0;
  let busy = false;
  let inflight: Promise<void> | null = null;
  let configReady: Promise<void> | null = null;

  function ensureConfig(): Promise<void> {
    if (!configReady) configReady = preload(['merchants', 'prices', 'items']).then(() => undefined);
    return configReady;
  }

  function activeMerchant() {
    return merchants[activeMerchantIdx] ?? null;
  }

  function clearChildren(n: Node): void {
    for (const c of n.children.slice()) c.destroy();
  }

  function repaintStatus(extra?: string): void {
    const m = activeMerchant();
    const save = LocalSave.load();
    const gold = goldOf(save);
    const quota = m ? quotaText(quotaLeft, m.daily_limit) : '商人数据未就绪';
    statusLabel.string = `${quota}    ·    金币 ${gold}${extra ? `    ·    ${extra}` : ''}`;
  }

  function makeButton(parentNode: Node, text: string, y: number, onTap: () => void, highlight = false): Node {
    const btn = new Node('Btn_' + text);
    btn.addComponent(UITransform).setContentSize(BTN_W, BTN_H);
    btn.setPosition(new Vec3(0, y, 0));
    const bg = new Node('Bg');
    bg.addComponent(UITransform).setContentSize(BTN_W - 8, BTN_H - 8);
    const g = bg.addComponent(Graphics);
    g.fillColor = highlight ? new Color(60, 130, 70, 255) : new Color(52, 62, 82, 255);
    g.roundRect(-(BTN_W - 8) / 2, -(BTN_H - 8) / 2, BTN_W - 8, BTN_H - 8, 12);
    g.fill();
    btn.addChild(bg);
    const lbl = new Node('Label');
    lbl.addComponent(UITransform).setContentSize(BTN_W - 8, BTN_H - 8);
    const l = lbl.addComponent(Label);
    l.string = text;
    l.fontSize = 20;
    l.color = new Color(235, 242, 252, 255);
    l.horizontalAlign = Label.HorizontalAlign.CENTER;
    l.verticalAlign = Label.VerticalAlign.CENTER;
    l.overflow = Label.Overflow.SHRINK;
    btn.addChild(lbl);
    btn.on(Node.EventType.TOUCH_END, onTap);
    parentNode.addChild(btn);
    return btn;
  }

  function renderSwitcher(): void {
    clearChildren(switcher);
    const n = Math.max(1, merchants.length);
    const gap = Math.min(BTN_W + 12, 720 / n);
    merchants.forEach((m, i) => {
      const btn = makeButton(switcher, m.name ?? m.id, 0, () => {
        if (busy || i === activeMerchantIdx) return;
        activeMerchantIdx = i;
        quotaLeft = m.daily_limit;
        renderSwitcher();
        repaintStatus();
        void load();
      }, i === activeMerchantIdx);
      btn.setPosition(new Vec3((i - (n - 1) / 2) * gap, 0, 0));
    });
  }

  function renderRows(rows: readonly SellableRow[]): void {
    clearChildren(body);
    rows.slice(0, MAX_ROWS).forEach((r, i) => {
      const y = FIRST_ROW_Y - i * ROW_H;
      addLabel({
        parent: body,
        name: `Row_${i}`,
        text: `${r.name}`,
        pos: new Vec3(-250, y, 0),
        fontSize: 20,
        width: 300,
      });
      addLabel({
        parent: body,
        name: `Price_${i}`,
        text: `${r.unit}`,
        pos: new Vec3(60, y, 0),
        fontSize: 20,
        color: new Color(255, 226, 140, 255),
        width: 120,
      });
      addLabel({
        parent: body,
        name: `Count_${i}`,
        text: `×${r.count}`,
        pos: new Vec3(190, y, 0),
        fontSize: 20,
        width: 100,
      });
      // 行尾"卖 1"按钮
      const sellBtn = new Node(`Sell_${i}`);
      sellBtn.addComponent(UITransform).setContentSize(96, 38);
      sellBtn.setPosition(new Vec3(300, y, 0));
      const g = sellBtn.addComponent(Graphics);
      g.fillColor = new Color(45, 110, 220, 255);
      g.roundRect(-44, -16, 88, 32, 10);
      g.fill();
      const sl = sellBtn.addComponent(Label);
      sl.string = '卖 1';
      sl.fontSize = 18;
      sl.color = new Color(255, 255, 255, 255);
      sl.horizontalAlign = Label.HorizontalAlign.CENTER;
      sl.verticalAlign = Label.VerticalAlign.CENTER;
      body.addChild(sellBtn);
      sellBtn.on(Node.EventType.TOUCH_END, () => void sellOne(r.itemId));
    });
    const more = rows.length - MAX_ROWS;
    if (more > 0) {
      addLabel({
        parent: body,
        name: 'More',
        text: `还有 ${more} 项`,
        pos: new Vec3(0, FIRST_ROW_Y - MAX_ROWS * ROW_H - 18, 0),
        fontSize: 18,
        color: new Color(170, 185, 205, 255),
      });
    }
  }

  function renderEmpty(text: string): void {
    clearChildren(body);
    addEmptyHint(body, text);
  }

  async function sellOne(itemId: string): Promise<void> {
    if (busy) return;
    const m = activeMerchant();
    if (!m) {
      repaintStatus('商人数据未就绪');
      return;
    }
    // 配置里的商人 id 不在契约允许的三个值内 → 中止。
    // 不能回落到 undefined：缺省 merchantId 等于"渔村"，而流浪/黑市 ±30% 不同价，
    // 静默回落会按错价成交（比报错更糟）。
    const merchantId = toMerchantId(m.id);
    if (!merchantId) {
      repaintStatus('商人数据异常，已中止出售');
      return;
    }
    busy = true;
    repaintStatus('卖出中…');
    try {
      const payload: SellReq = { itemId, count: 1, merchantId };
      const res = await invoke<SellReq, SellRes>('economy.sell', payload);
      const save = LocalSave.load() ?? LocalSave.init();
      LocalSave.save(applySell(save, itemId, 1, res.herbDelta));
      quotaLeft = typeof res.quotaLeft === 'number' ? res.quotaLeft : Math.max(0, quotaLeft - 1);
      repaintStatus(`+${res.herbDelta} 金币`);
      await load();
    } catch (e) {
      const code = (e as { code?: number }).code ?? 4999;
      if (code === 3002) {
        quotaLeft = 0;
        repaintStatus();
        renderEmpty('今日额度已用完，明天再来');
      } else {
        const ux = toUxState(code);
        repaintStatus(uxText(code));
        if (ux.state === 'noPermission') renderEmpty('登录已失效，请重启游戏重新登录');
      }
    } finally {
      busy = false;
    }
  }

  function uxText(code: number): string {
    const ux = toUxState(code);
    if (ux.state === 'noPermission') return '登录状态异常';
    if (ux.state === 'empty') return '条件不足';
    return `操作失败（${code}）`;
  }

  function load(): Promise<void> {
    if (inflight) return inflight;
    const job = (async () => {
      try {
        await ensureConfig();
        const rows = table('merchants');
        if (rows.length === 0) {
          merchants = [];
          clearChildren(switcher);
          statusLabel.string = '商人数据未就绪（merchants 表为空）';
          renderEmpty('商人数据未就绪，请重新进入游戏');
          return;
        }
        merchants = merchantOptions(rows);
        if (activeMerchantIdx >= merchants.length) activeMerchantIdx = 0;
        const m = activeMerchant();
        if (!m) return;
        // 首进或切商人后，额度以表值初始化（服务端 quotaLeft 在卖出后覆盖）
        if (quotaLeft <= 0) quotaLeft = m.daily_limit;
        if (quotaLeft > m.daily_limit) quotaLeft = m.daily_limit;
        renderSwitcher();
        repaintStatus();

        const save = LocalSave.load();
        const inv = save?.modules.inventory as Record<string, unknown> | undefined;
        const list = sellableRows(inv, table('items'), table('prices'), m.region_bp);
        if (list.length === 0) renderEmpty('背包里没有可回收的东西，去打捞吧');
        else renderRows(list);
      } finally {
        inflight = null;
      }
    })();
    inflight = job;
    return job;
  }

  return {
    key: 'merchant',
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
