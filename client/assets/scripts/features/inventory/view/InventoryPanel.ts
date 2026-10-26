/**
 * 背包面板（核心 TASK-3101 桩；TASK-3102/A-3 将覆写为真实列表）。
 *
 * 当前仅渲染标题 + 统一空态文案，暴露 `createInventoryPanel(parent): PanelHandle`。
 * 后续助手实现要点（见 ASSISTANT-BRIEF A-3）：空态文案保持"还没有捞到东西，去打捞吧"，
 * 并提供切到 hook 的回调（经 `app/nav.navigate`）。不得显示重量/容量（G-03）。
 */
import { Node, UITransform } from 'cc';
import type { PanelHandle } from '../../../app/panel-types';
import { addTitle, addEmptyHint } from '../../../app/panel-ui';

export function createInventoryPanel(parent: Node): PanelHandle {
  const node = new Node('InventoryPanel');
  node.addComponent(UITransform).setContentSize(750, 1400);
  node.active = false;
  parent.addChild(node);

  addTitle(node, '背包');
  addEmptyHint(node, '还没有捞到东西，去打捞吧');

  let active = false;

  const handle: PanelHandle = {
    key: 'inventory',
    node,
    onShow() {
      active = true;
      node.active = true;
      this.refresh();
    },
    onHide() {
      active = false;
      node.active = false;
    },
    refresh() {
      // 桩阶段：空态由静态节点呈现。A-3 将在此据 LocalSave/modules.inventory.items 重渲染列表。
      void active;
    },
    destroy() {
      node.destroy();
    },
  };
  return handle;
}
