/**
 * 面板通用 UI 小工具（核心 TASK-3101 产出）。
 *
 * 仅含无状态的"造 Label / 造标题 / 造空态提示"的纯构建函数，所有面板桩与后续助手实现共用，
 * 避免每个面板重复数十行 Graphics/Label 样板。位于 `app/`，不依赖任何 feature。
 */
import { Node, UITransform, Label, Color, Vec3 } from 'cc';

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
