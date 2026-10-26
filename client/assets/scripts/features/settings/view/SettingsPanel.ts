/**
 * 设置面板（核心 TASK-3101 桩）。
 *
 * 注意：`PanelKey` 契约（ASSISTANT-BRIEF §3.1）只锁定 4 个主 Tab，**不含 settings**——
 * 设置是"独立入口/浮层"，因此本面板返回独立的 `SettingsHandle`（结构上类似 PanelHandle，但不进 PanelKey 联合），
 * 由 MainView 以浮层方式开关，不进入 Tab 切换循环。
 *
 * 后续（TASK-3401/C-2 或后续设计）可在此放入账号、音效、合规等信息。
 */
import { Node, UITransform } from 'cc';
import { addTitle, addEmptyHint } from '../../../app/panel-ui';

/** 设置浮层句柄：结构上等于 PanelHandle，但刻意不进 PanelKey 联合。 */
export interface SettingsHandle {
  readonly node: Node;
  onShow(): void;
  onHide(): void;
  destroy(): void;
}

export function createSettingsPanel(parent: Node): SettingsHandle {
  const node = new Node('SettingsPanel');
  node.addComponent(UITransform).setContentSize(750, 1400);
  node.active = false;
  parent.addChild(node);

  addTitle(node, '设置');
  addEmptyHint(node, '设置项将在此陆续开放');

  return {
    node,
    onShow() {
      node.active = true;
    },
    onHide() {
      node.active = false;
    },
    destroy() {
      node.destroy();
    },
  };
}
