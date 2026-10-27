/**
 * 引导覆盖层（TASK-4004）：半透明遮罩 + 一句文案 + 按钮。
 *
 * 数据：`config.table('guide_steps')` 5 行（D-05）。
 * 完成：点"去试试"→ navigate(target_panel) + 标记完成 → 显示下一步或隐藏。
 * 失败不阻塞主界面：整个初始化包 try/catch，出错时 node.active=false。
 *
 * §3.4：`modules.guide.done` 属开放 map 扩展，不递增 SAVE_SCHEMA_VERSION。
 */
import { Node, UITransform, Graphics, Label, Color, Vec3 } from 'cc';
import type { PanelHandle, PanelKey } from '../../../app/panel-types';
import { navigate } from '../../../app/nav';
import { preload, table } from '../../../services/config';
import { LocalSave } from '../../../services/save/LocalSave';
import { GuideModel } from '../model/GuideModel';
import type { GuideStepsRow } from '../../../generated/game-core/generated/config-types';

export interface GuideHandle {
  readonly node: Node;
  destroy(): void;
}

const VALID_PANELS: ReadonlyArray<PanelKey> = ['hook', 'inventory', 'crafting', 'leaderboard'];

function isPanelKey(s: string): s is PanelKey {
  return (VALID_PANELS as ReadonlyArray<string>).indexOf(s) >= 0;
}

export function createGuideOverlay(parent: Node): GuideHandle {
  const node = new Node('GuideOverlay');
  node.addComponent(UITransform).setContentSize(750, 1400);
  node.active = false;
  parent.addChild(node);

  const model = new GuideModel();

  // 半透明遮罩
  const mask = new Node('Mask');
  mask.addComponent(UITransform).setContentSize(750, 1400);
  const maskG = mask.addComponent(Graphics);
  maskG.fillColor = new Color(0, 0, 0, 140);
  maskG.fillRect(-375, -700, 750, 1400);
  node.addChild(mask);

  // 文案
  const textNode = new Node('Text');
  textNode.addComponent(UITransform).setContentSize(640, 80);
  textNode.setPosition(new Vec3(0, 60, 0));
  const textLabel = textNode.addComponent(Label);
  textLabel.fontSize = 26;
  textLabel.color = new Color(255, 240, 180, 255);
  textLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
  textLabel.verticalAlign = Label.VerticalAlign.CENTER;
  textLabel.overflow = Label.Overflow.SHRINK;
  node.addChild(textNode);

  // 按钮（文本重用）
  const btn = new Node('GuideButton');
  btn.addComponent(UITransform).setContentSize(240, 64);
  btn.setPosition(new Vec3(0, -40, 0));
  const btnBg = new Node('Bg');
  btnBg.addComponent(UITransform).setContentSize(220, 56);
  const btnGfx = btnBg.addComponent(Graphics);
  btnGfx.fillColor = new Color(45, 110, 220, 255);
  btnGfx.roundRect(-110, -28, 220, 56, 12);
  btnGfx.fill();
  btn.addChild(btnBg);
  const btnLabelNode = new Node('Label');
  btnLabelNode.addComponent(UITransform).setContentSize(220, 56);
  const btnLabel = btnLabelNode.addComponent(Label);
  btnLabel.fontSize = 24;
  btnLabel.color = new Color(255, 255, 255, 255);
  btnLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
  btnLabel.verticalAlign = Label.VerticalAlign.CENTER;
  btnLabel.overflow = Label.Overflow.SHRINK;
  btn.addChild(btnLabelNode);
  node.addChild(btn);

  function renderStep(): void {
    if (model.isFinished) {
      node.active = false;
      return;
    }
    const rows = table('guide_steps') as GuideStepsRow[];
    const step = rows[model.currentStep];
    if (!step) {
      node.active = false;
      return;
    }
    node.active = true;
    textLabel.string = step.text ?? step.name ?? `步骤 ${model.currentStep + 1}`;
    const target = step.target_panel ?? '';
    btnLabel.string = isPanelKey(target) ? '去试试' : '跳过';
  }

  function onButtonTap(): void {
    try {
      const rows = table('guide_steps') as GuideStepsRow[];
      const step = rows[model.currentStep];
      if (!step) { node.active = false; return; }

      const target = step.target_panel ?? '';
      if (isPanelKey(target)) navigate(target);

      // 标记完成 → 写入存档
      const save = LocalSave.load() ?? LocalSave.init();
      const next = model.applyDone(save);
      if (next !== save) LocalSave.save(next);
      renderStep();
    } catch (e) {
      console.warn('[guide] 步骤完成失败，引导关闭', e);
      node.active = false;
    }
  }

  btn.on(Node.EventType.TOUCH_END, onButtonTap);

  // 异步初始化：加载 guide_steps → 读存档 → 计算当前步骤 → 渲染
  void (async (): Promise<void> => {
    try {
      await preload(['guide_steps']);
      const rows = table('guide_steps') as GuideStepsRow[];
      if (rows.length === 0) { node.active = false; return; }
      const stepIds = rows.map((r) => r.id);
      const done = GuideModel.readDone(LocalSave.load());
      model.hydrate(stepIds, done);
      renderStep();
    } catch (e) {
      console.warn('[guide] 初始化失败，引导不显示', e);
      node.active = false;
    }
  })();

  return {
    node,
    destroy() { node.destroy(); },
  };
}
