import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

/** 沉船·潜水·石油·探索 表现层：只读 model 状态、把输入转成用例调用；脏标记在 lateUpdate 统一刷新。 */
@ccclass('SalvageView')
export class SalvageView extends Component {
  private seenVersion = -1;
  lateUpdate(): void {
    // if (model.stateVersion !== this.seenVersion) { this.seenVersion = model.stateVersion; this.render(); }
  }
}
