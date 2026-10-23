import { _decorator, Component, Label, Button, Color, Vec3, Node, UITransform, Widget, Canvas, Sprite, SpriteFrame, Texture2D, ImageAsset, UIOpacity, Size } from 'cc';
const { ccclass } = _decorator;

import { invoke, setToken } from '../services/net/RpcClient';
import { LocalSave } from '../services/save/LocalSave';

/**
 * Boot 场景控制器：
 * - 启动时调 compliance.check，显示合规状态；
 * - 提供"出钩"按钮：登录 → 捞一件 mock 物品 → 存本地 → 云端 push（mock）→ 显示 revision；
 * - 三行日志 Label（不依赖 prefab）。
 */
@ccclass('BootController')
export class BootController extends Component {
  private line1!: Label;
  private line2!: Label;
  private line3!: Label;
  private hookBtn!: Button;
  private revision = -1;

  async start(): Promise<void> {
    const uiRoot = this.buildUI();
    this.node.addChild(uiRoot);
    this.revision = LocalSave.load()?.revision ?? -1;
    this.setLine1(`Boot 启动…（本地 revision=${this.revision}）`);

    try {
      const c = await invoke('compliance.check', undefined);
      this.setLine1(`合规状态 verified=${c.verified} minor=${c.minor}`);
    } catch (e: any) {
      this.setLine1(`合规查询失败：${e?.msg ?? e}`);
    }
  }

  private setLine1(t: string): void { this.line1.string = t; }
  private setLine2(t: string): void { this.line2.string = t; }
  private setLine3(t: string): void { this.line3.string = t; }

  private buildUI(): Node {
    // 用 Widget 锚定到 Canvas 顶部，兼容横竖屏
    const ui = new Node('BootUI');
    const uiTrans = ui.addComponent(UITransform);
    uiTrans.setContentSize(1, 1); // 容器本身不需要尺寸
    const uiWidget = ui.addComponent(Widget);
    uiWidget.isAlignTop = true;
    uiWidget.top = 40;
    uiWidget.isAlignLeft = true;
    uiWidget.left = 24;
    uiWidget.isAlignRight = true;
    uiWidget.right = 24;

    // 三行文字（Widget 会把它们相对 ui 容器定位，容器已锚定顶部）
    this.line1 = this.makeLabel('line1', new Vec3(0, 0, 0), new Color(200, 220, 255));
    this.line2 = this.makeLabel('line2', new Vec3(0, -60, 0), new Color(255, 240, 180));
    this.line3 = this.makeLabel('line3', new Vec3(0, -120, 0), new Color(200, 255, 200));
    ui.addChild(this.line1.node, this.line2.node, this.line3.node);

    // 黑色按钮（相对容器定位）
    const btnNode = new Node('HookButton');
    const btnTrans = btnNode.addComponent(UITransform);
    btnTrans.setContentSize(220, 72);
    btnNode.setPosition(new Vec3(0, -220, 0));

    // 按钮底图：纯色 Sprite
    const bgNode = new Node('Bg');
    const bgTrans = bgNode.addComponent(UITransform);
    bgTrans.setContentSize(200, 60);
    const sprite = bgNode.addComponent(Sprite);
    sprite.color = new Color(30, 30, 30);
    // 让 Sprite 自动填充 UITransform 尺寸
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    bgNode.setSiblingIndex(-1);
    btnNode.addChild(bgNode);

    const btnLabel = btnNode.addComponent(Label);
    btnLabel.string = '出一钩 (S1)';
    btnLabel.fontSize = 24;
    btnLabel.color = new Color(255, 255, 255);
    btnLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
    btnLabel.overflow = Label.Overflow.SHRINK;

    this.hookBtn = btnNode.addComponent(Button);
    btnNode.on(Node.EventType.TOUCH_END, this.onHook, this);
    ui.addChild(btnNode);

    return ui;
  }

  private makeLabel(name: string, pos: Vec3, color: Color): Label {
    const n = new Node(name);
    const t = n.addComponent(UITransform);
    t.setContentSize(700, 40);
    n.setPosition(pos);
    const l = n.addComponent(Label);
    l.fontSize = 22;
    l.color = color;
    l.string = '';
    l.horizontalAlign = Label.HorizontalAlign.LEFT;
    l.overflow = Label.Overflow.SHRINK;
    return l;
  }

  private async onHook(): Promise<void> {
    if (this.hookBtn.interactable === false) return;
    this.hookBtn.interactable = false;
    try {
      this.setLine2('登录…');
      const l = await invoke('account.login', { code: 'mock-code', plat: 'wechat' });
      setToken(l.token);
      this.setLine2(`登录 OK player=${l.playerId} isNew=${l.isNew}`);

      // 出钩（临时实现）：mock 捞一件漂流木
      this.setLine3('出钩 → 漂流木 ×1');

      const existing = LocalSave.load();
      const next = existing ?? LocalSave.init();
      const modules = next.modules as Record<string, any>;
      const inv = modules.inventory ?? {};
      inv['driftwood'] = (inv['driftwood'] ?? 0) + 1;
      modules.inventory = inv;

      const saved = LocalSave.save({ ...next, modules, revision: next.revision + 1 });
      if (!saved) { this.setLine3('本地存档写入失败'); return; }
      const updated = LocalSave.load();
      this.revision = updated?.revision ?? -1;
      this.setLine3(`本地 ok，revision=${this.revision} 漂移木=${inv['driftwood']}`);

      // 云端 push
      try {
        const res = await invoke('save.push', { baseRevision: this.revision - 1, snapshot: updated, checksum: updated!.checksum }, 'hook-' + Date.now());
        if (res.accepted) {
          this.setLine3(`push OK → revision=${res.revision}`);
        } else {
          this.setLine3(`push 冲突：${JSON.stringify(res.conflict)}`);
        }
      } catch (e: any) {
        this.setLine3(`push 失败：${e?.msg ?? e}`);
      }
    } finally {
      this.hookBtn.interactable = true;
    }
  }
}
