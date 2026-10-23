/** 埋点与错误上报 的用例与状态（不依赖 cc 节点）。一次操作 = 校验 → 扣 → 加 → 写本地存档。 */
export class TelemetryModel {
  private version = 0;
  get stateVersion(): number { return this.version; }
  protected touch(): void { this.version++; }
}
