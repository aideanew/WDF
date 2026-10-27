/**
 * 面板通用 UI 小工具（核心 TASK-3101 产出）。
 *
 * 仅含无状态的"造 Label / 造标题 / 造空态提示"的纯构建函数，所有面板桩与后续助手实现共用，
 * 避免每个面板重复数十行 Graphics/Label 样板。位于 `app/`，不依赖任何 feature。
 */
import { Node, UITransform, Label, Color, Vec3, Graphics } from 'cc';

export interface LabelOpts {
  parent: Node;
  name: string;
  text: string;
  pos: Vec3;
  fontSize?: number;
  color?: Color;
  width?: number;
}

/** 在 parent 下建一个居中、可缩放（SHRINK）的文本 Label，返回 Label 组件。 */
export function addLabel(opts: LabelOpts): Label {
  const n = new Node(opts.name);
  const t = n.addComponent(UITransform);
  t.setContentSize(opts.width ?? 700, 44);
  n.setPosition(opts.pos);
  const l = n.addComponent(Label);
  l.string = opts.text;
  l.fontSize = opts.fontSize ?? 22;
  l.color = opts.color ?? new Color(220, 230, 245, 255);
  l.horizontalAlign = Label.HorizontalAlign.CENTER;
  l.verticalAlign = Label.VerticalAlign.CENTER;
  l.overflow = Label.Overflow.SHRINK;
  opts.parent.addChild(n);
  return l;
}

/** 面板标题（顶部）。 */
export function addTitle(parent: Node, text: string): Label {
  return addLabel({
    parent,
    name: 'Title',
    text,
    pos: new Vec3(0, 280, 0),
    fontSize: 30,
    color: new Color(255, 240, 180, 255),
  });
}

/** 统一空态提示（DESIGN-0001 §4：空态必须给"下一步"）。 */
export function addEmptyHint(parent: Node, text: string): Label {
  return addLabel({
    parent,
    name: 'EmptyHint',
    text,
    pos: new Vec3(0, 0, 0),
    fontSize: 22,
    color: new Color(200, 210, 225, 255),
    width: 640,
  });
}

export interface ConfirmDialogOpts {
  parent: Node;
  title?: string;
  text: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function addConfirmDialog(opts: ConfirmDialogOpts): Node {
  const dialog = new Node('ConfirmDialog');
  dialog.addComponent(UITransform).setContentSize(750, 1400);
  dialog.setPosition(new Vec3(0, 0, 100)); // front
  opts.parent.addChild(dialog);

  // overlay bg
  const bg = new Node('Overlay');
  bg.addComponent(UITransform).setContentSize(750, 1400);
  const bgG = bg.addComponent(Graphics);
  bgG.fillColor = new Color(0, 0, 0, 180);
  bgG.fillRect(-375, -700, 750, 1400);
  dialog.addChild(bg);
  
  // swallow touches
  bg.on(Node.EventType.TOUCH_START, (e: any) => e.propagationStopped = true);

  // box
  const box = new Node('Box');
  box.addComponent(UITransform).setContentSize(600, 300);
  box.setPosition(new Vec3(0, 100, 0));
  const boxG = box.addComponent(Graphics);
  boxG.fillColor = new Color(40, 48, 64, 255);
  boxG.roundRect(-300, -150, 600, 300, 24);
  boxG.fill();
  dialog.addChild(box);

  if (opts.title) {
    addLabel({
      parent: box,
      name: 'Title',
      text: opts.title,
      pos: new Vec3(0, 90, 0),
      fontSize: 28,
      color: new Color(255, 240, 180, 255),
    });
  }

  addLabel({
    parent: box,
    name: 'Text',
    text: opts.text,
    pos: new Vec3(0, 20, 0),
    fontSize: 22,
    color: new Color(220, 230, 245, 255),
    width: 500,
  });

  const btnCancel = new Node('BtnCancel');
  btnCancel.addComponent(UITransform).setContentSize(180, 60);
  btnCancel.setPosition(new Vec3(-120, -80, 0));
  const cg = btnCancel.addComponent(Graphics);
  cg.fillColor = new Color(80, 90, 110, 255);
  cg.roundRect(-90, -30, 180, 60, 12);
  cg.fill();
  const cl = btnCancel.addComponent(Label);
  cl.string = '取消';
  cl.fontSize = 24;
  cl.color = new Color(255, 255, 255, 255);
  cl.horizontalAlign = Label.HorizontalAlign.CENTER;
  cl.verticalAlign = Label.VerticalAlign.CENTER;
  box.addChild(btnCancel);
  btnCancel.on(Node.EventType.TOUCH_END, () => {
    dialog.destroy();
    if (opts.onCancel) opts.onCancel();
  });

  const btnConfirm = new Node('BtnConfirm');
  btnConfirm.addComponent(UITransform).setContentSize(180, 60);
  btnConfirm.setPosition(new Vec3(120, -80, 0));
  const cfg = btnConfirm.addComponent(Graphics);
  cfg.fillColor = new Color(200, 80, 80, 255);
  cfg.roundRect(-90, -30, 180, 60, 12);
  cfg.fill();
  const cfl = btnConfirm.addComponent(Label);
  cfl.string = '确认回收';
  cfl.fontSize = 24;
  cfl.color = new Color(255, 255, 255, 255);
  cfl.horizontalAlign = Label.HorizontalAlign.CENTER;
  cfl.verticalAlign = Label.VerticalAlign.CENTER;
  box.addChild(btnConfirm);
  btnConfirm.on(Node.EventType.TOUCH_END, () => {
    dialog.destroy();
    opts.onConfirm();
  });

  return dialog;
}
