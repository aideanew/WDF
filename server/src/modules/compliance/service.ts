/**
 * compliance · 业务
 *
 * 本地开发口径：能登录即视为实名通过；未成年标志固定 false；离线额度 0（ADR-0008 必须联网）。
 * 接平台实名/防沉迷后，这里换成读 `compliance` 模块的真实状态，接口不变。
 *
 * 依赖纪律（GOV serverBoundaries）：跨模块只调对方 **service**，不碰对方 repo。
 */
import type { ComplianceRes } from '@wodefa/contracts/src/compliance/index.ts';
import { playerExists } from '../account/service.ts';

export async function check(playerId: string): Promise<ComplianceRes> {
  return {
    verified: await playerExists(playerId),
    minor: false,
    offlineAllowanceMs: 0,
  };
}
