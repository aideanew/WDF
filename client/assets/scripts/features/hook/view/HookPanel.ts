/**
 * 打捞面板（核心 TASK-3101 产出）：把已验收的 `HookView` 包成 `PanelHandle`，
 * 挂到 MainView 的"打捞"Tab。不改动 `HookView` 内部逻辑（只负责生命周期与显隐）。
 */
import { Node, UITransform } from 'cc';
import { HookView } from './HookView';
import type { PanelHandle } from '../../../app/panel-types';

export function createHookPanel(parent: Node): PanelHandle {
  const node = new Node('HookPanel');
  node.addComponent(UITransform).setContentSize(750, 1400);
  node.addComponent(HookView); // HookView.start() 自行 buildUI + 输入绑定
  parent.addChild(node);

  return {
    key: 'hook',
    node,
    onShow() {
      node.active = true;
    },
    onHide() {
      node.active = false;
    },
    // HookView 自行驱动 update/表现；切回时无需重绘。
    refresh() {
      /* noop */
    },
    destroy() {
      node.destroy();
    },
  };
}
