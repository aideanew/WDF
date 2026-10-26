/**
 * 排行榜面板（核心 TASK-3101 桩；TASK-3104/A-5 将覆写为真实榜单）。
 *
 * 当前仅渲染标题 + 统一空态文案，暴露 `createLeaderboardPanel(parent): PanelHandle`。
 * 后续要点（见 ASSISTANT-BRIEF A-5）：`leaderboard.query` 返回 0 行 → 空态"本季还没有人上榜，先去打捞"；
 * `4001` 限流时禁用刷新 3s。
 */
import { Node, UITransform } from 'cc';
import type { PanelHandle } from '../../../app/panel-types';
import { addTitle, addEmptyHint } from '../../../app/panel-ui';

export function createLeaderboardPanel(parent: Node): PanelHandle {
  const node = new Node('LeaderboardPanel');
  node.addComponent(UITransform).setContentSize(750, 1400);
  node.active = false;
  parent.addChild(node);

  addTitle(node, '榜单');
  addEmptyHint(node, '本季还没有人上榜，先去打捞');

  const handle: PanelHandle = {
    key: 'leaderboard',
    node,
    onShow() {
      node.active = true;
      this.refresh();
    },
    onHide() {
      node.active = false;
    },
    refresh() {
      // 桩阶段：空态由静态节点呈现。A-5 将在此拉取并渲染榜单。
    },
    destroy() {
      node.destroy();
    },
  };
  return handle;
}
