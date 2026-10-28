/**
 * UX 态 → 面板提示的纯映射（TASK-7041 六态落地；DESIGN-0001 §2/§4）。
 *
 * 与 `panel-ui.ts`（Cocos 渲染层）分离：本文件**不 import cc**，Node 下可直载做确定性测试，
 * 只算「该显示什么文案、要不要下一步/重试按钮」，具体按钮行为由调用方接。
 *
 * 依据（DESIGN-0001 §4）：
 *  - `empty` 必须给下一步（§4.4）：空背包→去出钩；空榜→先上榜。
 *  - `error` 必须可归因（§4.2）：文案分网络/服务/客户端 bug 三类，由调用方按场景提供，不统一"操作失败"。
 *  - `noPermission` 必须给出口（§4.3）：login/update/wait/contact/tomorrow/retry 选一，不得只显红字。
 *  - `loading`/`success`/`conflict` 由调用方处理（骨架/成功内容/二选一弹窗），不在此给出提示。
 */
import type { UxView, UxNext } from '../generated/contracts/common/ux';

/** 每种「下一步」出口的按钮文案。 */
export const UX_NEXT_LABEL: Record<UxNext, string> = {
  login: '去登录',
  update: '去更新',
  wait: '稍后再试',
  contact: '联系客服',
  tomorrow: '明日再来',
  retry: '重试',
};

/** 各态提示文案（调用方可按场景覆盖；缺省给兜底文案）。 */
export interface UxHintTexts {
  empty?: string;
  error?: string;
  noPermission?: string;
}

export interface UxHintPlan {
  /** 主提示文案。 */
  text: string;
  /** 需要"下一步/重试"按钮时给出（button 文案见 UX_NEXT_LABEL）。 */
  next?: UxNext;
  /** 是否可重试（仅 error 态由 `view.retryable` 决定；empty/noPermission 不可重试）。 */
  retryable: boolean;
}

const FALLBACK_TEXT: Record<'empty' | 'error' | 'noPermission', string> = {
  empty: '暂无数据',
  error: '操作失败',
  noPermission: '无权进行此操作',
};

/**
 * 由 UxView 推导面板提示计划；`loading`/`success`/`conflict` 返回 null（由调用方处理）。
 * `error` 的可归因文案由 `texts.error` 提供（§4.2 网络/服务/客户端 bug 三类，调用方负责归因）。
 */
export function uxHintPlan(view: UxView, texts: UxHintTexts = {}): UxHintPlan | null {
  switch (view.state) {
    case 'empty':
      return { text: texts.empty ?? FALLBACK_TEXT.empty, next: view.next, retryable: false };
    case 'error':
      return { text: texts.error ?? FALLBACK_TEXT.error, next: view.next, retryable: view.retryable };
    case 'noPermission':
      return { text: texts.noPermission ?? FALLBACK_TEXT.noPermission, next: view.next, retryable: false };
    default:
      return null; // loading / success / conflict
  }
}
