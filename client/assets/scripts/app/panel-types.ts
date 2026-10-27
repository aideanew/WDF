/**
 * 面板接口契约（核心 TASK-3101 产出，助手 A 照此实现）。
 *
 * 这是 MainView 与各 features 面板之间**唯一共享面**：
 * - `PanelKey` 锁定 4 个主 Tab（打捞/背包/合成/榜单）；设置不在其中（按 ASSISTANT-BRIEF §3.1，设置是独立入口/浮层）。
 * - 每个 `features/<module>/view/<X>Panel.ts` 必须导出 `createXxxPanel(parent: Node): PanelHandle`。
 * - MainView 由核心维护，助手不得编辑；助手只实现工厂函数与内部渲染。
 *
 * 导航（如空背包"去打捞"按钮）经由 `app/nav.ts` 的 `navigate()`，面板不得直接改 MainView。
 */
import type { Node } from 'cc';

export type PanelKey = 'hook' | 'inventory' | 'crafting' | 'leaderboard' | 'merchant';

export interface PanelHandle {
  /** 该面板对应的 Tab 键（与 PanelKey 一一对应）。 */
  readonly key: PanelKey;
  /** 面板的根节点（由工厂创建并挂到 parent 下）。 */
  readonly node: Node;
  /** 首次显示 / 再次切回时调用；实现方负责按需刷新。 */
  onShow(): void;
  /** 切走时调用；必须停掉定时器与监听，不得销毁节点。 */
  onHide(): void;
  /** 显式刷新数据（下拉/按钮触发）。 */
  refresh(): void;
  /** 仅销毁自身节点与监听。 */
  destroy(): void;
}

/** 面板工厂签名（锁死，不得改）。MainView 按 PanelKey 分发调用。 */
export type PanelFactory = (parent: Node) => PanelHandle;
