/**
 * 箱子面板（TASK-5007 实现，`ChestView` 之上新增的面板层）。
 *
 * ## 为什么另建 Panel 而不是填 `ChestView`
 * 本项目的 Tab 容器只认 `createXxxPanel(parent) => PanelHandle`（`app/panel-types.ts`）。
 * `ChestView` 是 `@ccclass` 场景挂载组件，生命周期由场景管；两套渲染机制并存会打架。
 * 所以 `ChestView` 保留为空壳（场景里可能已挂），面板职责全在这里。
 *
 * ## v1.0 只做无锁开箱
 * 设计源把「完整开锁矩阵」列为**首版建议延期**（`对话讨论.txt:5117`），且"每级工具能开哪些锁 /
 * 消耗多少耐久 / 各档锁收益"三项至今无定义（`5162`）。因此面板**没有开锁浮层、没有点击 N 次**，
 * 每张卡只有一个「开箱」按钮。若配置里出现 `lock !== 'none'` 的箱子，按钮显示「未开放」并禁用
 * —— 诚实降级，不是隐藏（见 `ChestModel.openable`）。
 *
 * ## 六态（DESIGN-0001 / `generated/contracts/common/ux.ts`）
 * | 态 | 触发 | 表现 |
 * |---|---|---|
 * | loading | 首次读配置/存档、请求在途 | "加载中…"，按钮禁用 |
 * | empty | 背包里没有任何箱子 | `addEmptyHint` + "去打捞" |
 * | success | `c === 0` | toast「获得 X ×1」+ 列表数量刷新 |
 * | error | 其他非 0 码 | 顶部红条；**1001 必须显示"背包里没有这个箱子"** |
 * | noPermission | 2001/2002 | 文案 + "重试"（登录入口在启动流程，不在此伪造） |
 * | conflict | — | 不适用：`chest.open` 不产生 `accepted:false` |
 *
 * ## 三个禁止（plan-v008 §3.5）
 * 1. 不写业务判定：能开不能开由 `ChestModel.openable` 决定，扣箱与发奖由服务端决定；
 * 2. 不传 `rid`：`RpcClient.invoke` 对 `idempotent: true` 的动作自动生成并复用；
 * 3. 不写 `Math.random()`：开箱结果服务端权威。
 */
import { Node, UITransform, Label, Color, Vec3, Graphics } from 'cc';
import { preload, table } from '../../../services/config';
import { LocalSave } from '../../../services/save/LocalSave';
import { invoke } from '../../../services/net/RpcClient';
import { toUxState } from '../../../generated/contracts/common/ux';
import type { ChestOpenReq, ChestOpenRes, ChestReward } from '../../../generated/contracts/chest/index';
import type { ItemsRow } from '../../../generated/game-core/generated/config-types';
import type { PanelHandle } from '../../../app/panel-types';
import {
  addTitle,
  addEmptyHint,
  addLabel,
  addButton,
  setButtonDisabled,
  setButtonText,
} from '../../../app/panel-ui';
import { navigate } from '../../../app/nav';
import { ChestModel, applyOpen, lockText, type ChestRow } from '../model/ChestModel';

const CARD_W = 700;
const CARD_H = 120;
const CARD_GAP = 128;
const FIRST_CARD_Y = 20;
/** 一屏最多几张卡（不引滚动容器：小游戏端滚动兼容性差，超出显示"还有 N 种"）。 */
const MAX_CARDS = 5;

const CARD_BG = new Color(38, 44, 58, 255);
const COLOR_TEXT = new Color(240, 245, 252, 255);
const COLOR_SUB = new Color(178, 190, 208, 255);
const COLOR_GOLD = new Color(255, 226, 140, 255);
const COLOR_OK = new Color(143, 227, 160, 255);
const COLOR_WARN = new Color(255, 128, 128, 255);

/** 材质 → 左侧色块填充（沿用设计源三箱材质色，不引入新色板）。 */
const MATERIAL_FILL: Readonly<Record<string, Color>> = {
  wood: new Color(169, 121, 63, 255),
  copper: new Color(200, 121, 65, 255),
  iron: new Color(138, 144, 153, 255),
};

/** 箱子错误码：1001 需要专门文案（并发被抢的真实场景），不能落进通用错误。 */
const CODE_BAD_PAYLOAD = 1001;

export function createChestPanel(parent: Node): PanelHandle {
  const node = new Node('ChestPanel');
  node.addComponent(UITransform).setContentSize(750, 1400);
  node.active = false;
  parent.addChild(node);

  addTitle(node, '箱子');

  // 状态行（真实可算的信息；不显示"今日已开 N 次"——服务端没有这个字段，编一个就是伪造）
  const statusLabel = addLabel({
    parent: node,
    name: 'Status',
    text: '',
    pos: new Vec3(0, 152, 0),
    fontSize: 20,
    color: COLOR_GOLD,
    width: 700,
  });

  // 顶部错误条（error / noPermission 共用同一块位置，避免两种布局）
  const errorBar = addLabel({
    parent: node,
    name: 'ErrorBar',
    text: '',
    pos: new Vec3(0, 106, 0),
    fontSize: 19,
    color: COLOR_WARN,
    width: 700,
  });

  // toast（成功/提示，2 秒自动消失）
  const toastLabel = addLabel({
    parent: node,
    name: 'Toast',
    text: '',
    pos: new Vec3(0, 212, 0),
    fontSize: 22,
    color: COLOR_OK,
    width: 700,
  });

  // 列表/空态容器：重建时整块清掉
  const body = new Node('Body');
  body.addComponent(UITransform).setContentSize(750, 1400);
  node.addChild(body);

  const model = new ChestModel();

  // —————————————————————————— 配置 ——————————————————————————

  let ready: Promise<void> | null = null;
  let itemIndex: Record<string, ItemsRow> | null = null;

  function ensureConfig(): Promise<void> {
    if (!ready) ready = preload(['chests', 'items']).then(() => undefined);
    return ready;
  }

  /** id→行 索引只构造一次；渲染路径绝不触碰 preload。 */
  function itemsIndex(): Record<string, ItemsRow> {
    if (itemIndex) return itemIndex;
    const map: Record<string, ItemsRow> = {};
    for (const row of table('items')) map[row.id] = row;
    itemIndex = map;
    return map;
  }

  // —————————————————————————— 展示小工具 ——————————————————————————

  let toastToken = 0;
  function showToast(text: string): void {
    const token = (toastToken += 1);
    toastLabel.string = text;
    // 用 token 而不是 clearTimeout：面板销毁后定时器仍会触发，token 天然失效
    setTimeout(() => {
      if (token === toastToken) toastLabel.string = '';
    }, 2000);
  }

  function showError(text: string): void {
    errorBar.string = text;
    errorBar.color = COLOR_WARN;
  }

  /** 只清错误条，不动 toast —— toast 有自己的 2 秒生命周期，被刷新顺手清掉会闪一下就没了。 */
  function clearError(): void {
    errorBar.string = '';
  }

  function clearBody(): void {
    for (const child of body.children.slice()) child.destroy();
    btnOf.clear();
  }

  /** itemId → 开箱按钮（请求在途时统一禁用，重建时清空）。 */
  const btnOf = new Map<string, Node>();

  // —————————————————————————— 六态渲染 ——————————————————————————

  function renderLoading(): void {
    clearBody();
    statusLabel.string = '';
    addEmptyHint(body, '加载中…');
  }

  function renderConfigFailed(): void {
    clearBody();
    statusLabel.string = '';
    addEmptyHint(body, '配置表未就绪，无法读取箱子');
    showError('请重新进入游戏（配置加载失败）');
  }

  function renderEmpty(): void {
    clearBody();
    statusLabel.string = '背包里没有箱子';
    addEmptyHint(body, '还没有箱子，去海里捞一个吧');
    addButton({
      parent: body,
      name: 'GoHookButton',
      text: '去打捞',
      pos: new Vec3(0, -90, 0),
      onClick: () => navigate('hook'),
    });
  }

  function renderNoPermission(): void {
    clearBody();
    statusLabel.string = '';
    addEmptyHint(body, '登录已失效，请重新登录');
    // 登录流程在启动期（GameApp/BootController），面板层没有登录入口 ——
    // 不伪造一个"去登录"假按钮，只给"重试"（契约 next:'login' 的缺口已登记）。
    addButton({
      parent: body,
      name: 'RetryButton',
      text: '重试',
      pos: new Vec3(0, -90, 0),
      onClick: () => void load(),
    });
  }

  function renderCard(row: ChestRow, idx: number): void {
    const y = FIRST_CARD_Y - idx * CARD_GAP;

    const card = new Node(`Card_${idx}`);
    card.addComponent(UITransform).setContentSize(CARD_W, CARD_H);
    card.setPosition(new Vec3(0, y, 0));
    const g = card.addComponent(Graphics);
    g.fillColor = CARD_BG;
    g.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16);
    g.fill();
    body.addChild(card);

    // 左：材质色块 + 材质首字（无图标字体兜底，纹理缺失也能区分三箱）
    const icon = new Node('Icon');
    icon.addComponent(UITransform).setContentSize(96, 96);
    icon.setPosition(new Vec3(-282, 0, 0));
    const ig = icon.addComponent(Graphics);
    ig.fillColor = MATERIAL_FILL[row.material] ?? new Color(120, 128, 140, 255);
    ig.roundRect(-48, -48, 96, 96, 14);
    ig.fill();
    card.addChild(icon);

    addLabel({
      parent: icon,
      name: 'IconText',
      text: row.name.slice(0, 1),
      pos: new Vec3(0, 0, 0),
      fontSize: 40,
      color: new Color(255, 255, 255, 235),
      width: 96,
    });

    // 中：名称 + 数量
    const nameLabel = addLabel({
      parent: card,
      name: 'Name',
      text: row.name,
      pos: new Vec3(-95, 24, 0),
      fontSize: 23,
      color: COLOR_TEXT,
      width: 240,
    });
    nameLabel.horizontalAlign = Label.HorizontalAlign.LEFT;

    const countLabel = addLabel({
      parent: card,
      name: 'Count',
      text: `持有 ×${row.count}`,
      pos: new Vec3(-95, -16, 0),
      fontSize: 18,
      color: COLOR_GOLD,
      width: 240,
    });
    countLabel.horizontalAlign = Label.HorizontalAlign.LEFT;

    // 右中：锁徽标（v1.0 恒"无锁"，有锁则如实标"未开放"）
    addLabel({
      parent: card,
      name: 'Lock',
      text: row.openable ? lockText(row.lock) : `${lockText(row.lock)}·未开放`,
      pos: new Vec3(95, 0, 0),
      fontSize: 18,
      color: row.openable ? COLOR_OK : COLOR_SUB,
      width: 130,
    });

    // 右：开箱按钮
    const btn = addButton({
      parent: card,
      name: 'OpenButton',
      text: row.openable ? '开箱' : '未开放',
      pos: new Vec3(245, 0, 0),
      size: { w: 160, h: 54 },
      fontSize: 22,
      disabled: !row.openable,
      onClick: () => void openOne(row),
    });
    btnOf.set(row.itemId, btn);
  }

  function renderRows(rows: readonly ChestRow[]): void {
    clearBody();
    const limit = Math.min(rows.length, MAX_CARDS);
    for (let i = 0; i < limit; i += 1) renderCard(rows[i]!, i);

    let total = 0;
    for (const r of rows) total += r.count;
    statusLabel.string = `背包里共 ${total} 个箱子`;

    const more = rows.length - limit;
    if (more > 0) {
      addLabel({
        parent: body,
        name: 'More',
        text: `还有 ${more} 种箱子`,
        pos: new Vec3(0, FIRST_CARD_Y - limit * CARD_GAP - 10, 0),
        fontSize: 18,
        color: COLOR_SUB,
      });
    }
  }

  // —————————————————————————— 开箱 ——————————————————————————

  /** 在途的 itemId；非 null 时拒绝第二次点击（按钮禁用之外的第二道闸）。 */
  let opening: string | null = null;

  function disableAllButtons(): void {
    for (const btn of btnOf.values()) setButtonDisabled(btn, true);
  }

  function rewardText(rewards: readonly ChestReward[]): string {
    const idx = itemsIndex();
    const parts: string[] = [];
    for (const r of rewards) {
      const name = idx[r.itemId]?.name ?? r.itemId;
      parts.push(`${name} ×${r.count}`);
    }
    return parts.length > 0 ? `获得 ${parts.join('、')}` : '开箱成功';
  }

  function handleError(code: number): void {
    // 1001 有专门文案：并发下"箱子被别处扣掉"是真实场景，玩家需要知道是"没箱子"而不是"服务器坏了"
    if (code === CODE_BAD_PAYLOAD) {
      showError('背包里没有这个箱子');
      return;
    }
    const ux = toUxState(code);
    if (ux.state === 'noPermission') {
      renderNoPermission();
      return;
    }
    if (ux.state === 'empty') {
      showError('今天开不了了，明天再来');
      return;
    }
    showError(`开箱失败 (${code})`);
  }

  async function openOne(row: ChestRow): Promise<void> {
    if (opening !== null) return;
    // 防御性守卫：按钮本已 disabled，但契约变更/配置热更后可能短暂不一致
    if (!row.openable) return;
    opening = row.itemId;
    clearError();
    disableAllButtons();
    const btn = btnOf.get(row.itemId);
    if (btn) setButtonText(btn, '开箱中…');

    try {
      const payload: ChestOpenReq = { itemId: row.itemId };
      const res = await invoke<ChestOpenReq, ChestOpenRes>('chest.open', payload);

      // 契约里 success 恒 true；若为 false 说明服务端没发奖，不能假装成功
      if (!res.success) {
        showError('开箱未成功，请重试');
        return;
      }

      // 本地投影：扣 1 箱 + 加奖励。必须重新 seal，否则 verifySave 会判存档损坏
      const save = LocalSave.load() ?? LocalSave.init();
      LocalSave.save(applyOpen(save, row.itemId, res.rewards));
      showToast(rewardText(res.rewards));
    } catch (e) {
      handleError((e as { code?: number }).code ?? 4999);
    } finally {
      opening = null;
      // 统一在 finally 重建列表：既刷新数量，也把"开箱中…"与禁用态一起复位，
      // 避免手工回滚按钮状态时漏项（比如中途抛错只恢复了一半）。
      await load();
    }
  }

  // —————————————————————————— 加载 ——————————————————————————

  // 在途去重：MainView.switchTo 会连着调 onShow + refresh，不该起两次加载
  let inFlight: Promise<void> | null = null;

  function load(): Promise<void> {
    if (inFlight) return inFlight;
    // 注：不能用 `.finally()` —— client/tsconfig 的 target 是 ES2015，lib 里没有 finally。
    const job = (async () => {
      try {
        clearError();
        renderLoading();
        await ensureConfig();

        if (table('chests').length === 0 || table('items').length === 0) {
          model.clear();
          renderConfigFailed();
          return;
        }

        const save = LocalSave.load();
        const rows = model.project(save?.modules.inventory, table('chests'), itemsIndex());
        if (rows.length === 0) renderEmpty();
        else renderRows(rows);
      } finally {
        inFlight = null;
      }
    })();
    inFlight = job;
    return job;
  }

  return {
    key: 'chest',
    node,
    onShow() {
      node.active = true;
      void load();
    },
    onHide() {
      node.active = false;
      // 隐藏时清掉定时器语义：让未到期的 toast 不再回写（节点还在，只是 inactive）
      toastToken += 1;
      toastLabel.string = '';
    },
    refresh() {
      void load();
    },
    destroy() {
      toastToken += 1;
      btnOf.clear();
      node.destroy();
    },
  };
}
