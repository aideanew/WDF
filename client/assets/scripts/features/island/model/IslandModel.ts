/** 岛屿与基地 的用例与状态（不依赖 cc 节点）。一次操作 = 校验 → 扣 → 加 → 写本地存档。 */
export class IslandModel {
  private version = 0;
  get stateVersion(): number { return this.version; }
  protected touch(): void { this.version++; }
}
