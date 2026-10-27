/**
 * 新手引导 · 用例与状态（TASK-4004，不依赖 cc）。
 *
 * 数据：`config.table('guide_steps')` 5 行（D-05）；完成态写 `modules.guide.done: string[]`。
 *
 * §3.4 裁定：新增 `modules.guide` 属开放 map 扩展，不递增 SAVE_SCHEMA_VERSION。
 * 写入走"剥离旧 checksum → seal → revision+1"（与 HookModel 同构）。
 */
import { sealSave, type SaveFile } from '../../../generated/game-core/save/index';

export class GuideModel {
  private version = 0;
  private _currentStep = 0;
  private _done: string[] = [];
  private _stepIds: string[] = [];

  get stateVersion(): number { return this.version; }
  get currentStep(): number { return this._currentStep; }
  get done(): string[] { return this._done; }
  get totalSteps(): number { return this._stepIds.length; }
  get isFinished(): boolean { return this._currentStep >= this._stepIds.length; }

  protected touch(): void { this.version++; }

  /** 从存档读已完成的步骤 id 列表（容错：缺键/类型错 → 空数组）。 */
  static readDone(save: SaveFile | null): string[] {
    if (!save) return [];
    const guide = (save.modules as Record<string, unknown>).guide;
    if (typeof guide !== 'object' || guide === null) return [];
    const done = (guide as { done?: unknown }).done;
    return Array.isArray(done) ? done.filter((s): s is string => typeof s === 'string') : [];
  }

  /** 设置步骤 id 列表 + 已完成列表，计算当前步骤索引。 */
  hydrate(stepIds: string[], done: string[]): void {
    this._stepIds = stepIds;
    this._done = done;
    const idx = stepIds.findIndex((id) => done.indexOf(id) < 0);
    this._currentStep = idx < 0 ? stepIds.length : idx;
    this.touch();
  }

  /** 当前步骤的 id（无则 null）。 */
  currentStepId(): string | null {
    return this._stepIds[this._currentStep] ?? null;
  }

  /**
   * 标记当前步骤完成，返回新存档（剥离旧 checksum → seal → revision+1）。
   * 如果步骤已完成或无更多步骤，原样返回（零副作用）。
   */
  applyDone(file: SaveFile): SaveFile {
    const stepId = this.currentStepId();
    if (!stepId) return file;

    const { checksum: _stale, ...body } = file;
    const modules = { ...body.modules };
    const guide = { ...((modules.guide as Record<string, unknown>) ?? {}) };
    const done = Array.isArray(guide.done) ? [...(guide.done as string[])] : [];
    if (done.indexOf(stepId) < 0) done.push(stepId);
    guide.done = done;
    modules.guide = guide;

    this._done = done;
    this._currentStep++;
    this.touch();
    return sealSave({ ...body, modules, revision: body.revision + 1, savedAt: Date.now() });
  }
}
