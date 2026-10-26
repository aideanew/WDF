/**
 * 排行榜面板（TASK-3104 实现，覆写 TASK-3101 桩）。
 *
 * 数据：`LeaderboardModel.fetch()` → `invoke<QueryReq, QueryRes>('leaderboard.query', …)`
 *  → `game-core` 无关的纯榜单快照（服务端读 leaderboard_snapshot，不打实时库）。
 *
 * 表现约束：
 *  - **刷新不清屏**：`loading` 时保留旧榜，只亮顶部进度条（S-08.7）；
 *  - `me` 行高亮；`me` 不在本页时补一行"我的名次"（服务端从全量快照单独返回 me）；
 *  - 空态文案固定"本季还没有人上榜，先去打捞"；
 *  - 界面态全部来自契约 `toUxState()`，本文件不出现错误码分支。
 */
import { Node, UITransform, Label, Color, Vec3, Graphics } from 'cc';
import type { PanelHandle } from '../../../app/panel-types';
import { addTitle, addEmptyHint, addLabel } from '../../../app/panel-ui';
import { navigate } from '../../../app/nav';
import { LeaderboardModel, RATE_LIMIT_COOLDOWN_MS } from '../model/LeaderboardModel';
import { ERR } from '../../../generated/contracts/common/errors';
import type { RankRow } from '../../../generated/contracts/leaderboard/index';

const MAX_ROWS = 20;
const ROW_H = 42;
const FIRST_ROW_Y = 224;
const GOLD = new Color(255, 220, 120, 255);
const NORMAL = new Color(220, 230, 245, 255);

export function createLeaderboardPanel(parent: Node): PanelHandle {
  const node = new Node('LeaderboardPanel');
  node.addComponent(UITransform).setContentSize(750, 1400);
  node.active = false;
  parent.addChild(node);

  addTitle(node, '榜单');

  // 顶部载入条：只在 loading 时 active，静态不闪烁，避免在非 Component 面板里挂定时器
  const loadingBar = new Node('LoadingBar');
  loadingBar.addComponent(UITransform).setContentSize(360, 8);
  loadingBar.setPosition(new Vec3(0, 560, 0));
  const barG = loadingBar.addComponent(Graphics);
  barG.fillColor = new Color(45, 110, 220, 255);
  barG.roundRect(-180, -4, 360, 8, 4);
  barG.fill();
  loadingBar.active = false;
  node.addChild(loadingBar);

  const body = new Node('Body');
  body.addComponent(UITransform).setContentSize(750, 1400);
  node.addChild(body);

  const model = new LeaderboardModel();

  function clearBody(): void {
    for (const child of body.children.slice()) child.destroy();
  }

  function renderRows(rows: readonly RankRow[], meId: string | null): void {
    rows.slice(0, MAX_ROWS).forEach((r, i) => {
      const isMe = meId !== null && r.playerId === meId;
      addLabel({
        parent: body,
        name: `Rank_${i}`,
        text: `#${r.rank}  ${r.name}${isMe ? '（你）' : ''}  ${r.value}`,
        pos: new Vec3(0, FIRST_ROW_Y - i * ROW_H, 0),
        fontSize: 22,
        color: isMe ? GOLD : NORMAL,
      });
    });
  }

  function renderMeFooter(me: RankRow | null): void {
    if (!me) return;
    addLabel({
      parent: body,
      name: 'MyRank',
      text: `我的名次：第 ${me.rank} 名 · ${me.value}`,
      pos: new Vec3(0, FIRST_ROW_Y - MAX_ROWS * ROW_H - 18, 0),
      fontSize: 18,
      color: GOLD,
    });
  }

  function renderEmpty(): void {
    clearBody();
    addEmptyHint(body, '本季还没有人上榜，先去打捞');
    makeButton('GoHookButton', new Vec3(0, -90, 0), '去打捞', () => navigate('hook'));
  }

  function renderError(code: number | undefined, retryable: boolean): void {
    clearBody();
    let text = '榜单暂不可用';
    if (code === ERR.RATE_LIMITED) {
      text = `操作过于频繁，${Math.round(RATE_LIMIT_COOLDOWN_MS / 1000)} 秒后可重试`;
    } else if (code === ERR.NOT_LOGGED_IN) {
      text = '登录已失效，请重新进入';
    } else if (retryable) {
      text = '榜单加载失败，点刷新重试';
    } else {
      text = '榜单暂不可用，请稍后再看';
    }
    addEmptyHint(body, text);
    if (retryable) makeButton('RetryButton', new Vec3(0, -90, 0), '刷新', doRefresh);
  }

  function render(): void {
    const ux = model.ux;
    loadingBar.active = model.loading;

    if (model.items.length > 0) {
      clearBody();
      renderRows(model.items, model.meId);
      if (model.meOffPage) renderMeFooter(model.me);
      return;
    }
    // 无数据：加载中显示"载入中"，其余按界面态
    if (model.loading) { clearBody(); addEmptyHint(body, '载入中…'); return; }
    if (ux.state === 'error' || ux.state === 'noPermission') renderError(ux.code, ux.retryable);
    else renderEmpty();
  }

  function doRefresh(): void {
    if (!model.canFetch(Date.now())) return; // 冷却内忽略点击
    void fetchAndRender();
  }

  let inFlight: Promise<void> | null = null;
  function fetchAndRender(): Promise<void> {
    if (inFlight) return inFlight;
    const job = (async () => {
      // 先画一次，让顶部进度条立刻出现
      render();
      await model.fetch(model.scope);
      render();
    })().catch(() => {
      render();
    });
    inFlight = job;
    // 不能用 `.finally()`：client/tsconfig 的 target 是 ES2015，lib 里没有 finally（见 BASE-32）
    const done = (): Promise<void> => { inFlight = null; return Promise.resolve(); };
    return job.then(done, done);
  }

  function makeButton(name: string, pos: Vec3, label: string, onTap: () => void): void {
    const btn = new Node(name);
    btn.addComponent(UITransform).setContentSize(240, 64);
    btn.setPosition(pos);

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
    l.string = label;
    l.fontSize = 24;
    l.color = new Color(255, 255, 255, 255);
    l.horizontalAlign = Label.HorizontalAlign.CENTER;
    l.verticalAlign = Label.VerticalAlign.CENTER;
    l.overflow = Label.Overflow.SHRINK;
    btn.addChild(lbl);

    btn.on(Node.EventType.TOUCH_END, onTap);
    body.addChild(btn);
  }

  return {
    key: 'leaderboard',
    node,
    onShow() {
      node.active = true;
      doRefresh();
    },
    onHide() {
      node.active = false;
    },
    refresh() {
      doRefresh();
    },
    destroy() {
      node.destroy();
    },
  };
}
