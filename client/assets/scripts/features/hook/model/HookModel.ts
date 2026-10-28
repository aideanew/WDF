/**
 * 出钩 · 用例与状态（不依赖 cc 节点）。
 *
 * 消费 generated/game-core/hook 的确定性核心（powerAt / cast / chargeAndCast），
 * 表现层（HookView）每帧驱动 tick/sample，本类只管状态流转与结果沉淀。
 *
 * 状态机：idle --TOUCH_START--> charging --TOUCH_END--> flying --travelMs 到时--> idle。
 * 数值（cycleMs/hitRadius/maxReach 等）全部来自注入的 HookConfig，本类不持有业务数值。
 */
import {
  chargeAndCast,
  powerAt,
  type HookConfig,
  type HookPath,
} from '../../../generated/game-core/hook/index';
import { sealSave, type SaveFile } from '../../../generated/game-core/save/index';

export type HookPhase = 'idle' | 'charging' | 'flying';

/** 演示期固定掉落物（AT-2103：先固定 item_0001 漂流木，数值表就位后接 drops 配置）。 */
export const HOOK_DEMO_ITEM_ID = 'item_0001';

/** 一钩的确定性结果（chargeAndCast 产物 + 溯源参数）。 */
export interface HookOutcome {
  hit: boolean;
  travelMs: number;
  reach: number;
  powerBp: number;
  angleDeg: number;
  targetDist: number;
  /** 蓄力时长（ms），供 4011 命中率采样（W7-1，2026-10-28）。 */
  chargeMs: number;
  /** 表现层结算标记：收回后入包只执行一次（View 写，Model 不读）。 */
  settled?: boolean;
}

export class HookModel {
  private version = 0;
  private _phase: HookPhase = 'idle';
  private chargeStartMs = 0;
  private flyStartMs = 0;
  private flyDurationMs = 0;
  private flyPath: HookPath | null = null;
  private outcome: HookOutcome | null = null;

  get stateVersion(): number { return this.version; }
  get phase(): HookPhase { return this._phase; }
  get lastOutcome(): HookOutcome | null { return this.outcome; }
  /** 飞行中的轨迹（flying 阶段非空）。 */
  get path(): HookPath | null { return this.flyPath; }

  /** 飞行进度：0=出手，1=触及最远，2=收回。flying 阶段有效。 */
  get flyProgress(): number {
    if (this._phase !== 'flying' || this.flyDurationMs <= 0) return 0;
    return Math.min(2, (Date.now() - this.flyStartMs) / this.flyDurationMs * 2);
  }

  private touch(): void { this.version++; }

  /** 开始蓄力（idle → charging）。重复调用无效。 */
  beginCharge(nowMs: number): void {
    if (this._phase !== 'idle') return;
    this._phase = 'charging';
    this.chargeStartMs = nowMs;
    this.touch();
  }

  /** 采样当前力度（万分比）。仅 charging 阶段有意义，其余返回 minPowerBp。 */
  samplePower(nowMs: number, cfg: HookConfig): number {
    if (this._phase !== 'charging') return cfg.minPowerBp;
    return powerAt(nowMs - this.chargeStartMs, cfg);
  }

  /**
   * 松手发射（charging → flying）：以松手时刻的力度走确定性判定。
   * 返回 outcome 并进入飞行；非 charging 状态返回 null。
   */
  release(nowMs: number, angleDeg: number, targetDist: number, cfg: HookConfig): HookOutcome | null {
    if (this._phase !== 'charging') return null;
    const powerBp = this.samplePower(nowMs, cfg);
    const r = chargeAndCast(powerBp, angleDeg, targetDist, cfg);
    this._phase = 'flying';
    this.flyStartMs = nowMs;
    this.flyDurationMs = Math.max(1, r.travelMs);
    this.flyPath = r.path;
    this.outcome = {
      hit: r.hit,
      travelMs: r.travelMs,
      reach: r.reach,
      powerBp,
      angleDeg,
      targetDist,
      chargeMs: nowMs - this.chargeStartMs,
    };
    this.touch();
    return this.outcome;
  }

  /** 每帧驱动：flying 到时自动回到 idle（返回当前 phase 供 View 判断）。 */
  tick(): HookPhase {
    if (this._phase === 'flying' && this.flyProgress >= 2) {
      this._phase = 'idle';
      this.flyPath = null;
      this.touch();
    }
    return this._phase;
  }

  /**
   * 命中入包（AT-2103 接线核心，纯逻辑可测）：命中则物品 +1、revision+1、重新 seal。
   * 未命中原样返回（revision 不动）。入参档损坏/为空时调用方应先给 init() 档。
   * 注意：必须先剥离旧 checksum 再 seal —— 否则旧值混入校验和，verify 永远失配。
   */
  applyToSave(file: SaveFile, outcome: HookOutcome): SaveFile {
    if (!outcome.hit) return file;
    const { checksum: _stale, ...body } = file;
    const modules = { ...body.modules } as Record<string, Record<string, number>>;
    const inv = { ...(modules.inventory ?? {}) };
    inv[HOOK_DEMO_ITEM_ID] = (inv[HOOK_DEMO_ITEM_ID] ?? 0) + 1;
    modules.inventory = inv;
    return sealSave({
      ...body,
      modules,
      revision: body.revision + 1,
      savedAt: Date.now(),
    });
  }
}
