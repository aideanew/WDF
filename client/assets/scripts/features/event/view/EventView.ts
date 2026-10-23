import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

/** 每日一海·赶海多捞哦 表现层：只读 model 状态、把输入转成用例调用；脏标记在 lateUpdate 统一刷新。 */
@ccclass('EventView')
export class EventView extends Component {
  private seenVersion = -1;
  lateUpdate(): void {
    // if (model.stateVersion !== this.seenVersion) { this.seenVersion = model.stateVersion; this.render(); }
  }
}
