/**
 * 设置面板（TASK-3105 实现，覆写 TASK-3101 桩）—— 云存档同步与分叉裁决。
 *
 * 仍是"独立浮层"（不进 `PanelKey`，由 MainView 开关），沿用 `SettingsHandle`。
 *
 * 交互：
 *  1. 「检查同步」→ `save.pull`，显示"本地 rev N / 云端 rev M"；
 *  2. 「上传本地存档」→ `save.push`；只有 `accepted:false` 才进分叉态（`conflictOf()`，契约唯一权威）；
 *  3. 分叉两按钮**都写明后果**：保留本地＝覆盖云端；保留云端＝丢弃本地进度。
 *
 * 界面态全部来自契约 `toUxState()` / `UxView`，本文件不出现错误码分支。
 */
import { Node, UITransform, Label, Color, Vec3, Graphics } from 'cc';
import { addTitle, addEmptyHint, addLabel } from '../../../app/panel-ui';
import { SaveSyncModel, type SyncStatus } from '../model/SaveSyncModel';

export interface SettingsHandle {
  readonly node: Node;
  onShow(): void;
  onHide(): void;
  destroy(): void;
}

const DIM = new Color(170, 185, 205, 255);
const GOLD = new Color(255, 220, 120, 255);
const ALERT = new Color(255, 170, 150, 255);

export function createSettingsPanel(parent: Node): SettingsHandle {
  const node = new Node('SettingsPanel');
  node.addComponent(UITransform).setContentSize(750, 1400);
  node.active = false;
  parent.addChild(node);

  addTitle(node, '设置');

  const body = new Node('Body');
  body.addComponent(UITransform).setContentSize(750, 1400);
  node.addChild(body);

  const model = new SaveSyncModel();

  function clearBody(): void {
    for (const child of body.children.slice()) child.destroy();
  }

  function revText(s: SyncStatus): string {
    const local = s.localRevision < 0 ? '无档' : `rev ${s.localRevision}`;
    const cloud = s.checked ? `rev ${s.cloudRevision}` : '未检查';
    return `本地 ${local}  /  云端 ${cloud}`;
  }

  function render(): void {
    clearBody();
    const s = model.lastStatus;
    const ux = s.ux;

    if (model.loading) {
      addLabel({ parent: body, name: 'Busy', text: '同步中…', pos: new Vec3(0, 180, 0), fontSize: 22 });
      return;
    }
    if (ux.state === 'conflict') {
      renderFork(s, '云端与本地修订号不一致，请选择保留哪一边');
      return;
    }
    if (ux.state === 'error' || ux.state === 'noPermission') {
      addLabel({
        parent: body, name: 'Error',
        text: ux.state === 'noPermission' ? '登录已失效，请重新进入' : '同步失败，请重试',
        pos: new Vec3(0, 180, 0), fontSize: 22, color: ALERT,
      });
      if (ux.retryable) makeButton('RetryButton', new Vec3(0, 60, 0), '重试', () => void check());
      return;
    }
    if (ux.state === 'empty') {
      addEmptyHint(body, '本地还没有存档');
      return;
    }

    // success（含首次进入的未检查态）
    addLabel({ parent: body, name: 'Rev', text: revText(s), pos: new Vec3(0, 180, 0), fontSize: 22 });

    if (!s.checked) {
      addLabel({ parent: body, name: 'Hint', text: '点「检查同步」查看云端存档', pos: new Vec3(0, 120, 0), fontSize: 20, color: DIM });
      makeButton('CheckButton', new Vec3(0, 40, 0), '检查同步', () => void check());
      return;
    }
    if (s.forkRisk) {
      renderFork(s, '两边都有改动，直接上传会覆盖云端进度');
      return;
    }
    const hint = s.cloudRevision === 0
      ? '云端还没有存档，上传后建立云端档'
      : '本地与云端一致，可直接上传最新进度';
    addLabel({ parent: body, name: 'Hint', text: hint, pos: new Vec3(0, 120, 0), fontSize: 20, color: DIM });
    makeButton('PushButton', new Vec3(0, 40, 0), '上传本地存档', () => void push());
  }

  function renderFork(s: SyncStatus, title: string): void {
    addLabel({
      parent: body, name: 'ForkTitle',
      text: title,
      pos: new Vec3(0, 180, 0), fontSize: 22, width: 640, color: GOLD,
    });
    addLabel({ parent: body, name: 'ForkRev', text: revText(s), pos: new Vec3(0, 120, 0), fontSize: 20 });
    makeButton('KeepLocalButton', new Vec3(0, 20, 0), '保留本地（覆盖云端）', () => void decide('local'));
    makeButton('KeepCloudButton', new Vec3(0, -60, 0), '保留云端（丢弃本地）', () => void decide('cloud'));
  }

  /** 拉一次云端状态并刷新。 */
  async function recheck(): Promise<void> {
    await model.status();
    render();
  }

  async function check(): Promise<void> {
    render();
    await recheck();
  }

  async function push(): Promise<void> {
    render();
    await model.push();
    await recheck();
  }

  async function decide(keep: 'local' | 'cloud'): Promise<void> {
    render();
    await model.resolve(keep);
    await recheck();
  }

  function makeButton(name: string, pos: Vec3, text: string, onTap: () => void): void {
    const btn = new Node(name);
    btn.addComponent(UITransform).setContentSize(420, 64);
    btn.setPosition(pos);

    const bg = new Node('Bg');
    bg.addComponent(UITransform).setContentSize(400, 56);
    const g = bg.addComponent(Graphics);
    g.fillColor = new Color(45, 110, 220, 255);
    g.roundRect(-200, -28, 400, 56, 12);
    g.fill();
    btn.addChild(bg);

    const lbl = new Node('Label');
    lbl.addComponent(UITransform).setContentSize(400, 56);
    const l = lbl.addComponent(Label);
    l.string = text;
    l.fontSize = 22;
    l.color = new Color(255, 255, 255, 255);
    l.horizontalAlign = Label.HorizontalAlign.CENTER;
    l.verticalAlign = Label.VerticalAlign.CENTER;
    l.overflow = Label.Overflow.SHRINK;
    btn.addChild(lbl);

    btn.on(Node.EventType.TOUCH_END, onTap);
    body.addChild(btn);
  }

  return {
    node,
    onShow() {
      node.active = true;
      void check();
    },
    onHide() {
      node.active = false;
    },
    destroy() {
      node.destroy();
    },
  };
}
