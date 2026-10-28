import { _decorator, Component, Label, Button, Color, Vec3, Node, UITransform, Graphics } from 'cc';
const { ccclass } = _decorator;

import { invoke, setToken } from '../services/net/RpcClient';
import { getPlatform } from '../platform';
import { MainView } from './MainView';

/**
 * Boot 场景控制器（核心 TASK-3101 改写）：
 * - 启动链：compliance.check（合规通过才可进入）；
 * - 进入主界面：点击"进入主界面" → account.login（mock）→ setToken → 挂载 MainView；
 * - 打捞/存档等真实闭环由 MainView 的"打捞"Tab（HookView）承载，Boot 只负责登录与进场。
 *
 * 移除了历史 drifwood 直接写包逻辑的临时 Demo（已由 HookView 的命中→存档闭环覆盖），
 * 避免脏数据键 `driftwood` 再被写入。
 */
@ccclass('BootController')
export class BootController extends Component {
  private title!: Label;
  private status!: Label;
  private enterBtn!: Node;
  private ready = false;

  async start(): Promise<void> {
    this.buildUI();
    this.setTitle('奖励一颗麻籽');
    this.setStatus('启动中…');

    try {
      const c = await invoke<unknown, { verified: boolean; minor: boolean }>('compliance.check', undefined);
      if (c.verified) {
        this.setStatus('合规通过，点击进入');
        this.ready = true;
        this.setButtonEnabled(true);
      } else {
        this.setStatus(`合规未通过（minor=${c.minor}），无法进入`);
      }
    } catch (e: any) {
      this.setStatus(`合规查询失败：${e?.msg ?? e}`);
    }
  }

  private setButtonEnabled(on: boolean): void {
    const btn = this.enterBtn.getComponent(Button);
    if (btn) btn.interactable = on;
  }

  private async onEnter(): Promise<void> {
    if (!this.ready) return;
    this.setButtonEnabled(false);
    this.setStatus('登录中…');
    try {
      // TASK-7010：不再硬编码假 code/wechat，改用平台真实 code（D-44=2 无 secret，服务端 dev 模式不校验 code）。
      // web 平台返回假 code 'dev'（编辑器预览），dev 模式下服务端放行；plat 的 web→app 映射与 RpcClient.platOf 一致。
      const { code } = await getPlatform().login();
      const p = getPlatform();
      const plat = p.name === 'web' ? 'app' : p.name;
      const l = await invoke<unknown, { token: string; playerId: string; isNew: boolean }>('account.login', { code, plat });
      setToken(l.token);
      this.setStatus(`登录 OK player=${l.playerId} isNew=${l.isNew}`);
      this.enterMain();
    } catch (e: any) {
      this.setStatus(`登录失败：${e?.msg ?? e}`);
      this.setButtonEnabled(true);
    }
  }

  private enterMain(): void {
    // 隐藏启动 UI
    this.title.node.active = false;
    this.status.node.active = false;
    this.enterBtn.active = false;
    // 挂载主界面（MainView.start 内自行建 Tab 与面板）
    const main = new Node('MainView');
    main.addComponent(MainView);
    this.node.addChild(main);
  }

  private setTitle(t: string): void {
    if (this.title) this.title.string = t;
  }
  private setStatus(t: string): void {
    if (this.status) this.status.string = t;
  }

  private buildUI(): void {
    const title = this.makeLabel('Title', new Vec3(0, 240, 0), new Color(255, 240, 180, 255), 30);
    const status = this.makeLabel('Status', new Vec3(0, 120, 0), new Color(220, 230, 245, 255), 22);
    this.title = title;
    this.status = status;

    const btnNode = new Node('EnterButton');
    btnNode.addComponent(UITransform).setContentSize(240, 76);
    btnNode.setPosition(new Vec3(0, -20, 0));

    const bgNode = new Node('Bg');
    bgNode.addComponent(UITransform).setContentSize(220, 64);
    const g = bgNode.addComponent(Graphics);
    g.fillColor = new Color(45, 110, 220, 255);
    g.roundRect(-110, -32, 220, 64, 12);
    g.fill();
    btnNode.addChild(bgNode);

    const lblNode = new Node('Label');
    lblNode.addComponent(UITransform).setContentSize(220, 64);
    const btnLabel = lblNode.addComponent(Label);
    btnLabel.string = '进入主界面';
    btnLabel.fontSize = 24;
    btnLabel.color = new Color(255, 255, 255, 255);
    btnLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
    btnLabel.verticalAlign = Label.VerticalAlign.CENTER;
    btnLabel.overflow = Label.Overflow.SHRINK;
    btnNode.addChild(lblNode);

    const btn = btnNode.addComponent(Button);
    btn.interactable = false;
    btnNode.on(Node.EventType.TOUCH_END, this.onEnter, this);
    this.enterBtn = btnNode;

    this.node.addChild(title.node);
    this.node.addChild(status.node);
    this.node.addChild(btnNode);
  }

  private makeLabel(name: string, pos: Vec3, color: Color, fontSize: number): Label {
    const n = new Node(name);
    const t = n.addComponent(UITransform);
    t.setContentSize(700, 44);
    n.setPosition(pos);
    const l = n.addComponent(Label);
    l.fontSize = fontSize;
    l.color = color;
    l.string = '';
    l.horizontalAlign = Label.HorizontalAlign.CENTER;
    l.verticalAlign = Label.VerticalAlign.CENTER;
    l.overflow = Label.Overflow.SHRINK;
    return l;
  }
}
