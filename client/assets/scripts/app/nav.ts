/**
 * 面板间导航枢纽（核心 TASK-3101 产出）。
 *
 * 用途：让任意面板（如空背包"去打捞"按钮）能请求 MainView 切到指定 Tab，
 * 而不需要直接依赖或改写 MainView（ASSISTANT-BRIEF §3.1：导航通过 PanelHandle 之外的回调实现）。
 *
 * 用法：
 * - MainView.start() 调 `setNav(this.switchTo)` 注册唯一导航器；
 * - 面板内 `import { navigate } from '../../../app/nav'` 后 `navigate('hook')` 即可切 Tab。
 */
import type { PanelKey } from './panel-types';

type Nav = (key: PanelKey) => void;

let current: Nav | null = null;

/** 由 MainView 注册；重复注册覆盖前一个。 */
export function setNav(n: Nav): void {
  current = n;
}

/** 清空（MainView 销毁时调用，避免悬挂引用）。 */
export function clearNav(): void {
  current = null;
}

/** 请求切到指定 Tab；未注册时静默无操作。 */
export function navigate(key: PanelKey): void {
  current?.(key);
}
