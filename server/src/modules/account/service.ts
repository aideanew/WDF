/**
 * account · 业务
 *
 * 本地开发不依赖微信服务器：把 `code` 哈希成稳定的伪 openid，
 * 同一 plat + 同一 code 永远落到同一个 player —— 反复重启联调不会换号、不会丢存档。
 *
 * 接真机/生产时只改 resolveOpenId()：换 `integrations/wechat/code2session`（已留目录）。
 */
import { createHash, randomUUID } from 'node:crypto';
import type { Platform } from '@wodefa/contracts';
import { currentRegion, findIdentity, findPlayer, insertIdentity, insertPlayer } from './repo.ts';

export interface LoginInput {
  code: string;
  plat: Platform;
  anonymousSaveId?: string;
}

export interface LoginOutput {
  playerId: string;
  region: string;
  isNew: boolean;
}

/** 生产：调平台 code2session 换 openid。本地：按 code 派生稳定伪 openid。 */
function resolveOpenId(plat: Platform, code: string): string {
  if (process.env.WDF_AUTH_MODE === 'platform') {
    // TODO(G-04 真机阶段)：微信 code2session / 抖音 code2session
    throw new Error('platform auth mode 尚未接入，设置 WDF_AUTH_MODE=dev 使用本地登录');
  }
  const h = createHash('sha256').update(`${plat}:${code}`).digest('hex').slice(0, 24);
  return `dev_${h}`;
}

export async function login(input: LoginInput): Promise<LoginOutput> {
  const openId = resolveOpenId(input.plat, input.code);

  const identity = await findIdentity(input.plat, openId);
  if (identity) {
    const player = await findPlayer(identity.player_id);
    if (player) return { playerId: player.id, region: player.region, isNew: false };
  }

  const region = await currentRegion();
  const playerId = `p_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
  await insertPlayer(playerId, region);
  await insertIdentity(input.plat, openId, playerId);
  return { playerId, region, isNew: true };
}

/**
 * 玩家是否真实存在（令牌里的 sub 有可能指向已注销的号）。
 * 供其他模块调用的出口 —— 跨模块只允许依赖 service，不允许直接读别的模块 repo。
 */
export async function playerExists(playerId: string): Promise<boolean> {
  const player = await findPlayer(playerId);
  return Boolean(player);
}
