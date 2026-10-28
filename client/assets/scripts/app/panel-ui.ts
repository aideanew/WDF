/**
 * 面板通用 UI 小工具（核心 TASK-3101 产出）。
 *
 * 仅含无状态的"造 Label / 造标题 / 造空态提示"的纯构建函数，所有面板桩与后续助手实现共用，
 * 避免每个面板重复数十行 Graphics/Label 样板。位于 `app/`，不依赖任何 feature。
 */
import { Node, UITransform, Label, Color, Vec3, Graphics } from 'cc';
import type { UxView } from '../generated/contracts/common/ux';
import { uxHintPlan, UX_NEXT_LABEL, type UxHintTexts } from './ux-hint';

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

export interface RenderUxStateOpts {
  /** 各态文案覆盖（error 态可归因，§4.2：网络/服务/客户端 bug 由调用方提供类别文案）。 */
  texts?: UxHintTexts;
  /** 点"下一步/重试"按钮的回调；省略时按钮显示但无动作（仅提示）。 */
  onNext?: (next: NonNullable<UxView['next']>) => void;
  /** 提示垂直位置（默认 0，覆盖 addEmptyHint 的默认）。 */
  y?: number;
}

/**
 * 统一六态中的 empty/error/noPermission 提示（TASK-7041 六态落地）。
 * 依据 `ux-hint.uxHintPlan`（DESIGN-0001 §4）：
 *  - empty：提示 + 下一步（若有 next）；
 *  - error：可归因文案 + 重试按钮（若 retryable）；
 *  - noPermission：提示 + 出口按钮（next 必带，§4.3）。
 * `loading`/`success`/`conflict` 返回 null（由调用方处理骨架/成功内容/二选一弹窗）。
 */
export function renderUxState(parent: Node, view: UxView, opts: RenderUxStateOpts = {}): Label | null {
  const plan = uxHintPlan(view, opts.texts);
  if (!plan) return null;
  const label = addLabel({
    parent,
    name: 'UxHint',
    text: plan.text,
    pos: new Vec3(0, opts.y ?? 0, 0),
    fontSize: 22,
    color: new Color(200, 210, 225, 255),
    width: 640,
  });
  if (plan.next) {
    addButton({
      parent,
      name: 'UxNext',
      text: UX_NEXT_LABEL[plan.next],
      pos: new Vec3(0, (opts.y ?? 0) - 90, 0),
      disabled: !opts.onNext,
      onClick: () => { if (opts.onNext && plan.next) opts.onNext(plan.next); },
    });
  }
  return label;
}

// ——————————————————————————————————————————————————————————
// 按钮（TASK-5007a：抽出来，禁止各面板再手写 Graphics.roundRect）
// ——————————————————————————————————————————————————————————

/** 按钮标准尺寸（与 MerchantPanel 既有 196×58 一致，抽成常量避免各处抄数字）。 */
export const BTN_W = 196;
export const BTN_H = 58;

const BTN_DEFAULT_FILL = new Color(45, 110, 220, 255);
const BTN_DISABLED_FILL = new Color(88, 96, 112, 255);
const BTN_DEFAULT_TEXT = new Color(255, 255, 255, 255);
const BTN_DISABLED_TEXT = new Color(168, 178, 195, 255);

export interface ButtonOpts {
  parent: Node;
  name: string;
  text: string;
  pos: Vec3;
  /** 默认 196×58。 */
  size?: { w: number; h: number };
  fill?: Color;
  textColor?: Color;
  fontSize?: number;
  disabled?: boolean;
  onClick: () => void;
}

interface ButtonMeta {
  w: number;
  h: number;
  fill: Color;
  textColor: Color;
  fontSize: number;
  /** 可变：`setButtonDisabled` 改它，点击回调读它。 */
  disabled: boolean;
}

/** 按钮元数据挂在 WeakMap 上，不往 Node 上塞自定义字段（否则要改 cocos 类型）。 */
const BUTTON_META = new WeakMap<Node, ButtonMeta>();

/** 圆角半径按高度自适应：34 高的行内小按钮配 10 半径会看起来像胶囊。 */
function radiusOf(h: number): number {
  return Math.min(10, Math.floor(h / 4));
}

function paintBg(node: Node, meta: ButtonMeta): void {
  const g = node.getChildByName('Bg')?.getComponent(Graphics);
  if (!g) return;
  g.clear();
  g.fillColor = meta.disabled ? BTN_DISABLED_FILL : meta.fill;
  g.roundRect(-meta.w / 2, -meta.h / 2, meta.w, meta.h, radiusOf(meta.h));
  g.fill();
}

function paintText(node: Node, meta: ButtonMeta): void {
  const l = node.getChildByName('Text')?.getComponent(Label);
  if (l) l.color = meta.disabled ? BTN_DISABLED_TEXT : meta.textColor;
}

/**
 * 统一按钮：圆角矩形底 + 居中文字 + 点击回调。
 *
 * 结构用「底/字各一个子节点」而不是把 `Graphics` 与 `Label` 挂在同一节点上：
 * 两者都是 UIRenderer，同节点双渲染组件在部分 Cocos 版本会被 `addComponent` 拒掉，
 * 表现是"按钮只剩文字没背景"。分成子节点是行为确定的写法。
 *
 * `disabled` 只挡点击、不改 `active`，避免节点消失导致布局跳动。
 */
export function addButton(opts: ButtonOpts): Node {
  const w = opts.size?.w ?? BTN_W;
  const h = opts.size?.h ?? BTN_H;
  const meta: ButtonMeta = {
    w,
    h,
    fill: opts.fill ?? BTN_DEFAULT_FILL,
    textColor: opts.textColor ?? BTN_DEFAULT_TEXT,
    fontSize: opts.fontSize ?? 22,
    disabled: opts.disabled === true,
  };
  const node = new Node(opts.name);
  node.addComponent(UITransform).setContentSize(w, h);
  node.setPosition(opts.pos);

  const bg = new Node('Bg');
  bg.addComponent(UITransform).setContentSize(w, h);
  bg.addComponent(Graphics);
  node.addChild(bg);

  const text = new Node('Text');
  text.addComponent(UITransform).setContentSize(w, h);
  const l = text.addComponent(Label);
  l.string = opts.text;
  l.fontSize = meta.fontSize;
  l.horizontalAlign = Label.HorizontalAlign.CENTER;
  l.verticalAlign = Label.VerticalAlign.CENTER;
  l.overflow = Label.Overflow.SHRINK;
  node.addChild(text);

  BUTTON_META.set(node, meta);
  paintBg(node, meta);
  paintText(node, meta);

  // 监听常驻，用 meta.disabled 挡：这样 setButtonDisabled(false) 能立刻恢复可点
  node.on(Node.EventType.TOUCH_END, () => {
    if (meta.disabled) return;
    opts.onClick();
  });

  opts.parent.addChild(node);
  return node;
}

/** 改按钮可用态（重绘底色与字色）。 */
export function setButtonDisabled(node: Node, disabled: boolean): void {
  const meta = BUTTON_META.get(node);
  if (!meta || meta.disabled === disabled) return;
  meta.disabled = disabled;
  paintBg(node, meta);
  paintText(node, meta);
}

/** 改按钮文案（开箱中…／开箱）。 */
export function setButtonText(node: Node, s: string): void {
  const l = node.getChildByName('Text')?.getComponent(Label);
  if (l) l.string = s;
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
