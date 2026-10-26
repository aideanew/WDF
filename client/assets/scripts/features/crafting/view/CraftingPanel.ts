/**
 * 合成面板（核心 TASK-3101 桩；TASK-3103/A-4 将覆写为真实制作）。
 *
 * 当前仅渲染标题 + 统一空态文案，暴露 `createCraftingPanel(parent): PanelHandle`。
 * 后续要点（见 ASSISTANT-BRIEF A-4）：用 `config.table('recipes')` + `parseInputs` 分组可制作/材料不足，
 * 顶部固定"不校验等级与职业"说明。
 */
import { Node, UITransform } from 'cc';
import type { PanelHandle } from '../../../app/panel-types';
import { addTitle, addEmptyHint } from '../../../app/panel-ui';

export function createCraftingPanel(parent: Node): PanelHandle {
  const node = new Node('CraftingPanel');
  node.addComponent(UITransform).setContentSize(750, 1400);
  node.active = false;
  parent.addChild(node);

  addTitle(node, '合成');
  addEmptyHint(node, '暂无可用图纸，先去打捞收集材料');

  const handle: PanelHandle = {
    key: 'crafting',
    node,
    onShow() {
      node.active = true;
      this.refresh();
    },
    onHide() {
      node.active = false;
    },
    refresh() {
      // 桩阶段：空态由静态节点呈现。A-4 将在此渲染图纸列表。
    },
    destroy() {
      node.destroy();
    },
  };
  return handle;
}
