/**
 * 出钩 表现层：程序化 UI（无 prefab/美术资源，参照 BootController 范式）。
 *
 * - 力度条：Graphics 底条 + 动态填充，1.2s 三角波往返，颜色 蓝(低)→绿(中)→红(高)；
 * - 输入：TOUCH_START 蓄力 / TOUCH_END·TOUCH_CANCEL 松手（接 HookModel 状态机）；
 * - 飞行：钩点沿确定性轨迹（path.points 按 t 插值）去回；
 * - 命中反馈：vibrateShort + 轻微震屏；埋点 hook.hit / hook.miss（telemetry.track，失败静默）。
 *
 * 只读 model 状态、把输入转成用例调用；每帧 update 驱动。
 */
import { _decorator, Component, Node, UITransform, Graphics, Label, Color, Vec3 } from 'cc';
const { ccclass } = _decorator;

import { HookModel, HOOK_DEMO_ITEM_ID, type HookOutcome } from '../model/HookModel';
import { DEFAULT_HOOK_CONFIG, type HookConfig, type HookPoint } from '../../../generated/game-core/hook/index';
import { invoke } from '../../../services/net/RpcClient';
import { LocalSave } from '../../../services/save/LocalSave';
import { getPlatform } from '../../../platform';

/** 演示用固定入参：目标距离与出钩角度（确定性核心要求同输入同输出，手感来自蓄力时机）。 */
const DEMO_TARGET_DIST = 600;
const DEMO_ANGLE_DEG = 15;

const BAR_W = 420;
const BAR_H = 26;
const BAR_POS = new Vec3(0, -180, 0);

@ccclass('HookView')
export class HookView extends Component {
  private model = new HookModel();
  private cfg: HookConfig = DEFAULT_HOOK_CONFIG;

  private barFill!: Graphics;
  private barFillTrans!: UITransform;
  private hookDot!: Node;
  private hookDotGfx!: Graphics;
  private status!: Label;

  private shakeUntil = 0;
  private shaking = false;

  start(): void {
    this.buildUI();
    this.bindInput();
  }

  update(dt: number): void {
    void dt;
    const phase = this.model.tick();
    if (phase === 'charging') {
      const p = this.model.samplePower(Date.now(), this.cfg);
      this.drawPowerFill(p);
      this.status.string = `蓄力中 ${(p / 100).toFixed(0)}%`;
    } else if (phase === 'flying') {
      this.moveHookDot(this.model.flyProgress);
      this.status.string = '出钩…';
    } else {
      this.hideHookDot();
      this.settleIfLanded();
    }
    if (Date.now() < this.shakeUntil) {
      this.shaking = true;
      this.shakeStep();
    } else if (this.shaking) {
      this.shaking = false;
      this.node.setPosition(new Vec3(0, 0, 0)); // 震屏结束必须归位
    }
  }

  /** 飞行收回（phase 回 idle）后结算一次：命中 → 入包 → 本地存档；失败走统一错误提示。 */
  private settleIfLanded(): void {
    const outcome = this.model.lastOutcome;
    if (!outcome || outcome.settled) return;
    outcome.settled = true;
    if (!outcome.hit) return;

    const existing = LocalSave.load() ?? LocalSave.init();
    const next = this.model.applyToSave(existing, outcome);
    const ok = LocalSave.save(next);
    if (!ok) {
      // 统一错误提示（MVP：状态行即 toast 位；正式 toast 组件落地后替换）
      this.status.string = '存档写入失败，本次收获未保存';
      return;
    }
    const inv = (next.modules as Record<string, Record<string, number>>).inventory ?? {};
    this.status.string = `命中！漂流木 ×${inv[HOOK_DEMO_ITEM_ID] ?? 0}（revision=${next.revision}）`;
  }

  // ---------- UI 构建 ----------

  private buildUI(): void {
    const self = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    self.setContentSize(750, 1400); // 触摸区铺满手机竖屏（iPhone 12 逻辑分辨率）

    // 力度条底
    const bgNode = new Node('PowerBarBg');
    const bgTrans = bgNode.addComponent(UITransform);
    bgTrans.setContentSize(BAR_W, BAR_H);
    bgNode.setPosition(BAR_POS);
    const bg = bgNode.addComponent(Graphics);
    bg.fillColor = new Color(60, 60, 70, 255);
    bg.roundRect(-BAR_W / 2, -BAR_H / 2, BAR_W, BAR_H, 8);
    bg.fill();
    this.node.addChild(bgNode);

    // 力度条填充（每帧重绘）
    const fillNode = new Node('PowerBarFill');
    this.barFillTrans = fillNode.addComponent(UITransform);
    this.barFillTrans.setContentSize(0, BAR_H);
    fillNode.setPosition(BAR_POS);
    this.barFill = fillNode.addComponent(Graphics);
    this.node.addChild(fillNode);

    // 飞行钩点（默认隐藏）
    this.hookDot = new Node('HookDot');
    this.hookDot.addComponent(UITransform).setContentSize(16, 16);
    this.hookDotGfx = this.hookDot.addComponent(Graphics);
    this.hookDotGfx.fillColor = new Color(255, 220, 90, 255);
    this.hookDotGfx.circle(0, 0, 8);
    this.hookDotGfx.fill();
    this.hookDot.active = false;
    this.node.addChild(this.hookDot);

    // 状态行
    const statusNode = new Node('HookStatus');
    statusNode.addComponent(UITransform).setContentSize(700, 36);
    statusNode.setPosition(new Vec3(0, -120, 0));
    this.status = statusNode.addComponent(Label);
    this.status.fontSize = 24;
    this.status.color = new Color(220, 230, 245, 255);
    this.status.string = '按住屏幕蓄力，松手出钩';
    this.node.addChild(statusNode);
  }

  private bindInput(): void {
    this.node.on(Node.EventType.TOUCH_START, () => {
      this.model.beginCharge(Date.now());
    }, this);
    this.node.on(Node.EventType.TOUCH_END, () => this.releaseNow(), this);
    this.node.on(Node.EventType.TOUCH_CANCEL, () => this.releaseNow(), this);
  }

  private releaseNow(): void {
    const outcome = this.model.release(Date.now(), DEMO_ANGLE_DEG, DEMO_TARGET_DIST, this.cfg);
    if (!outcome) return;
    this.showHookDot();
    this.report(outcome);
  }

  // ---------- 力度条绘制 ----------

  /** 蓝(0)→绿(0.5)→红(1) 三段插值。 */
  private powerColor(ratio: number): Color {
    const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
    if (ratio < 0.5) {
      const t = ratio / 0.5;
      return new Color(lerp(50, 80, t), lerp(120, 220, t), lerp(235, 90, t), 255);
    }
    const t = (ratio - 0.5) / 0.5;
    return new Color(lerp(80, 240, t), lerp(220, 70, t), lerp(90, 60, t), 255);
  }

  private drawPowerFill(powerBp: number): void {
    const ratio = Math.max(0, Math.min(1, powerBp / this.cfg.maxPowerBp));
    const w = BAR_W * ratio;
    this.barFillTrans.setContentSize(w, BAR_H);
    const g = this.barFill;
    g.clear();
    if (w <= 0) return;
    g.fillColor = this.powerColor(ratio);
    g.roundRect(-BAR_W / 2, -BAR_H / 2, w, BAR_H, 8);
    g.fill();
  }

  // ---------- 飞行表现 ----------

  private showHookDot(): void { this.hookDot.active = true; }
  private hideHookDot(): void { this.hookDot.active = false; }

  /** 按 t（0..2 归一化行程）在轨迹点间线性插值定位钩点。 */
  private moveHookDot(progress: number): void {
    const path = this.model.path;
    if (!path || path.points.length === 0) return;
    const pt = this.samplePathPoint(path.points, Math.max(0, Math.min(2, progress)));
    this.hookDot.setPosition(new Vec3(pt.x, pt.y, 0));
  }

  private samplePathPoint(points: HookPoint[], t: number): HookPoint {
    // points 顺序为 0→1 去程、(1,2] 回手（t 值非单调），按 |t-p| 取最近点
    let best: HookPoint = points[0] ?? { t: 0, x: 0, y: 0 };
    let bestD = Math.abs(best.t - t);
    for (const p of points) {
      const d = Math.abs(p.t - t);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  // ---------- 命中反馈与埋点 ----------

  private report(outcome: HookOutcome): void {
    // 震屏反馈（命中强、脱钩弱）
    this.shakeUntil = Date.now() + (outcome.hit ? 260 : 120);

    // 平台震动（不支持的平台内部静默）
    try { getPlatform().vibrateShort(); } catch { /* noop */ }

    // 埋点：hook.hit / hook.miss（可导出首钩命中率）；埋点失败绝不影响主流程
    void invoke('telemetry.track', {
      events: [{
        name: outcome.hit ? 'hook.hit' : 'hook.miss',
        at: Date.now(),
        props: { powerBp: outcome.powerBp, targetDist: outcome.targetDist, angleDeg: outcome.angleDeg },
      }],
    }).catch(() => { /* 埋点可丢 */ });
  }

  private shakeStep(): void {
    const amp = 6;
    this.node.setPosition(new Vec3(
      (Math.random() * 2 - 1) * amp,
      (Math.random() * 2 - 1) * amp,
      0,
    ));
    if (Date.now() >= this.shakeUntil) this.node.setPosition(new Vec3(0, 0, 0));
  }
}
