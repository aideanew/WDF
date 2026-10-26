import { _decorator, Component, Label, Button, Color, Vec3, Node, UITransform, Widget, Canvas, Sprite, SpriteFrame, Texture2D, ImageAsset, UIOpacity, Size, Graphics } from 'cc';
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
    this.buildUI(); // 内部直接挂到 this.node
    this.revision = LocalSave.load()?.revision ?? -1;
    this.setLine1(`Boot 启动…（本地 revision=${this.revision}）`);

    try {
      const c = await invoke('compliance.check', undefined);
      this.setLine1(`合规状态 verified=${c.verified} minor=${c.minor}`);
    } catch (e: any) {
      this.setLine1(`合规查询失败：${e?.msg ?? e}`);
    }
  }

  private setLine1(t: string): void { if (this.line1) this.line1.string = t; else console.warn('[Boot] line1 未初始化:', t); }
  private setLine2(t: string): void { if (this.line2) this.line2.string = t; else console.warn('[Boot] line2 未初始化:', t); }
  private setLine3(t: string): void { if (this.line3) this.line3.string = t; else console.warn('[Boot] line3 未初始化:', t); }

  private buildUI(): Node {
    // 全部直接相对 Canvas 中心定位（iPhone 12 Canvas 可见区域约 ±422）
    const line1 = this.makeLabel('line1', new Vec3(0, 200, 0), new Color(200, 220, 255));
    const line2 = this.makeLabel('line2', new Vec3(0, 140, 0), new Color(255, 240, 180));
    const line3 = this.makeLabel('line3', new Vec3(0, 80, 0),  new Color(200, 255, 200));

    // ★ 关键修复：把运行时创建的 Label 赋回成员变量，否则 setLine* 里 this.lineX 为 undefined 会崩
    this.line1 = line1;
    this.line2 = line2;
    this.line3 = line3;

    // 按钮：btnNode 只做命中区(Button+UITransform)，底图与文字都放子节点，靠子节点顺序保证"底图在下、文字在上"
    const btnNode = new Node('HookButton');
    const btnTrans = btnNode.addComponent(UITransform);
    btnTrans.setContentSize(220, 72);
    btnNode.setPosition(new Vec3(0, -20, 0));

    // 1) 底图：Graphics 画蓝色圆角矩形（Sprite 无贴图不渲染，用 Graphics 保证可见）
    const bgNode = new Node('Bg');
    const bgTrans = bgNode.addComponent(UITransform);
    bgTrans.setContentSize(200, 60);
    const g = bgNode.addComponent(Graphics);
    g.fillColor = new Color(45, 110, 220, 255);
    g.roundRect(-100, -30, 200, 60, 12);
    g.fill();
    btnNode.addChild(bgNode);

    // 2) 文字：独立子节点，排在底图后 → 绘制在最上层
    const lblNode = new Node('Label');
    const lblTrans = lblNode.addComponent(UITransform);
    lblTrans.setContentSize(200, 60);
    const btnLabel = lblNode.addComponent(Label);
    btnLabel.string = '出一钩 (S1)';
    btnLabel.fontSize = 24;
    btnLabel.color = new Color(255, 255, 255);
    btnLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
    btnLabel.verticalAlign = Label.VerticalAlign.CENTER;
    btnLabel.overflow = Label.Overflow.SHRINK;
    btnNode.addChild(lblNode);

    this.hookBtn = btnNode.addComponent(Button);
    btnNode.on(Node.EventType.TOUCH_END, this.onHook, this);

    // 全部直接挂到 Canvas
    this.node.addChild(line1.node);
    this.node.addChild(line2.node);
    this.node.addChild(line3.node);
    this.node.addChild(btnNode);

    return btnNode; // 随便返回一个，start() 里没用
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
