import { ok, err, type Result } from '../common/result';

export const MODULE_ID = 'hook';

/** 出钩规则配置：所有数值由调用方 / 数值表注入，规则层不写死。 */
export interface HookConfig {
  /** 力度条往返周期（ms），设计定 1200 */
  cycleMs: number;
  /** 力度下限（万分比刻度） */
  minPowerBp: number;
  /** 力度上限（万分比刻度） */
  maxPowerBp: number;
  /** 钩臂长度（仅影响表现，不参与判定） */
  armLength: number;
  /** 飞行速度（reach → travelMs 的系数） */
  flightSpeed: number;
  /** 命中判定半径 */
  hitRadius: number;
  /** 满力最大触及距离 */
  maxReach: number;
  /** 三档绳索承重上限；承重不足 → err(3101) */
  cables: { thin: number; coarse: number; steel: number };
}

export type CableTier = 'thin' | 'coarse' | 'steel';

/** 单帧采样点（表现层与判定共用）。t 为归一化行程：0=起点，1=去程触及最远，(1,2]=回手。 */
export interface HookPoint {
  t: number;
  /** 沿出钩方向水平位移 */
  x: number;
  /** 垂直位移（弧形下坠，仅表现） */
  y: number;
}

/** 一次出钩的轨迹。 */
export interface HookPath {
  /** 实际触及距离 */
  reach: number;
  points: HookPoint[];
}

/** 目标（漂浮物等）。 */
export interface HookTarget {
  id: string;
  /** 沿出钩方向距离 */
  x: number;
  /** 垂直偏移 */
  y: number;
  /** 目标自身半径 */
  size: number;
}

/** 命中结果。 */
export interface HitResult {
  hitIndex: number;
  dist: number;
}

/**
 * 默认配置：当前 `hooks.csv` 为空（N 表之一），先用常量；
 * 待数值齐备后由 Agent-Data 将 cycleMs / maxReach / hitRadius / cables 迁入 game-data（TASK-0201 已标注）。
 * 规则层只消费配置，不持有数值。
 */
export const DEFAULT_HOOK_CONFIG: HookConfig = {
  cycleMs: 1200,
  minPowerBp: 0,
  maxPowerBp: 10000,
  armLength: 1,
  flightSpeed: 1,
  hitRadius: 60,
  maxReach: 1000,
  cables: { thin: 50, coarse: 200, steel: 1000 },
};

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/**
 * 三角波往返蓄力：holdMs 超过 cycleMs 自动回落（周期重复，绝不无限增长）。
 * holdMs=0 起点；holdMs=cycleMs/2 峰值；holdMs=cycleMs 回起点。
 */
export function powerAt(holdMs: number, cfg: HookConfig): number {
  const span = cfg.maxPowerBp - cfg.minPowerBp;
  const phase = (((holdMs % cfg.cycleMs) + cfg.cycleMs) % cfg.cycleMs);
  const half = cfg.cycleMs / 2;
  const tri = phase < half ? phase / half : 1 - (phase - half) / half;
  return cfg.minPowerBp + tri * span;
}

/**
 * 由力度 + 角度产出轨迹（确定性）。angleDeg：0=水平最远，90=竖直零触及。
 * 去程 0→reach，回手 reach→0；y 仅作弧形表现，不参与命中判定。
 */
export function cast(powerBp: number, angleDeg: number, cfg: HookConfig): HookPath {
  const bp = clamp(powerBp, cfg.minPowerBp, cfg.maxPowerBp);
  const rad = clamp((angleDeg * Math.PI) / 180, 0, Math.PI / 2);
  const reach = (bp / cfg.maxPowerBp) * cfg.maxReach * Math.cos(rad);
  const N = 16;
  const points: HookPoint[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const r = u * reach;
    points.push({ t: u, x: r * Math.cos(rad), y: -Math.sin(u * Math.PI) * cfg.armLength });
  }
  for (let i = 1; i <= N; i++) {
    const u = 1 - i / N;
    const r = u * reach;
    points.push({ t: 2 - i / N, x: r * Math.cos(rad), y: -Math.sin(u * Math.PI) * cfg.armLength });
  }
  return { reach, points };
}

/** 取首个与轨迹相交（命中区内）的目标（最低索引优先）；无则 null。 */
export function resolveHit(path: HookPath, targets: HookTarget[], cfg: HookConfig): HitResult | null {
  for (let idx = 0; idx < targets.length; idx++) {
    const tg = targets[idx];
    if (!tg) continue;
    let minD = Infinity;
    for (const p of path.points) {
      const dx = p.x - tg.x;
      const dy = p.y - tg.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minD) minD = d;
    }
    if (minD <= cfg.hitRadius + tg.size) return { hitIndex: idx, dist: minD };
  }
  return null;
}

/** 承重判定：物品重量超过所选绳索上限 → err(3101)。 */
export function pullBack(itemWeight: number, cable: CableTier, cfg: HookConfig): Result<true> {
  const cap = cfg.cables[cable];
  if (itemWeight > cap) return err(3101, `承重不足：${itemWeight} > ${cap}（${cable}）`);
  return ok(true);
}

/**
 * 便捷入口（plan-v002 AT-2101）：给定已蓄力度 + 角度 + 目标距离，返回确定性判定结果。
 * hit 表示是否命中该距离处的目标；travelMs 为去回总时长（确定性）。
 */
export function chargeAndCast(
  powerBp: number,
  angleDeg: number,
  targetDist: number,
  cfg: HookConfig,
): { hit: boolean; travelMs: number; reach: number; path: HookPath } {
  const path = cast(powerBp, angleDeg, cfg);
  const hit = resolveHit(path, [{ id: 'target', x: targetDist, y: 0, size: 0 }], cfg) !== null;
  const travelMs = Math.round(path.reach * cfg.flightSpeed * 2);
  return { hit, travelMs, reach: path.reach, path };
}
