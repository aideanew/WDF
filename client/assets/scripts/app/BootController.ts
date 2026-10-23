import { _decorator, Component, Label, Button, Color, Vec3, Node, UITransform, Widget, Canvas, WidgetAlignFlags } from 'cc';
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
    const ui = new Node('UI');
    ui.addComponent(Canvas);
    const w = ui.addComponent(Widget);
    w.isAlignTop = w.isAlignBottom = w.isAlignLeft = w.isAlignRight = true;
    w.top = w.bottom = w.left = w.right = 0;

    this.line1 = this.makeLabel('line1', new Vec3(-320, 400, 0), new Color(200, 220, 255));
    this.line2 = this.makeLabel('line2', new Vec3(-320, 340, 0), new Color(255, 240, 180));
    this.line3 = this.makeLabel('line3', new Vec3(-320, 280, 0), new Color(200, 255, 200));
    ui.addChild(this.line1.node, this.line2.node, this.line3.node);

    const btnNode = new Node('HookButton');
    const btnTrans = btnNode.addComponent(UITransform);
    btnTrans.setContentSize(200, 60);
    btnNode.setPosition(new Vec3(0, 0, 0));
    const btnLabel = btnNode.addComponent(Label);
    btnLabel.string = '出一钩 (S1)';
    btnLabel.fontSize = 22;
    btnLabel.color = new Color(20, 20, 20);
    this.hookBtn = btnNode.addComponent(Button);
    btnNode.on(Node.EventType.TOUCH_END, this.onHook, this);
    ui.addChild(btnNode);

    return ui;
  }

  private makeLabel(name: string, pos: Vec3, color: Color): Label {
    const n = new Node(name);
    const t = n.addComponent(UITransform);
    t.setContentSize(640, 40);
    n.setPosition(pos);
    const l = n.addComponent(Label);
    l.fontSize = 20;
    l.color = color;
    l.string = '';
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

      const saved: ReturnType<typeof LocalSave.save> = LocalSave.save({ ...next, modules, revision: next.revision + 1 });
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
