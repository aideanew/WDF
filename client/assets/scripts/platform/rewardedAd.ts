import type { AdResult } from './contracts/IPlatform';

/**
 * 激励视频控制器（wechat/douyin 同构，实例复用 + 单次监听）。
 *
 * - `create(adUnitId)` 创建平台广告实例（wx./tt. 由调用方注入，本文件不 import 'cc'）。
 * - 每个 placement 的实例**只 create 一次并复用**（卡内要求：不重复 create）。
 * - onClose/onError 在创建时注册**一次**，用可清空的 resolve 槽位避免监听器堆叠。
 * - 返回四种值：completed（看完）/ closed（提前关）/ error（onError）/ no-fill（无 adUnitId 或 show 失败）。
 */
export type CreateRewardedAd = (adUnitId: string) => any;

export class RewardedAdController {
  private entries = new Map<string, { ad: any; resolve: ((r: AdResult) => void) | null }>();

  constructor(private readonly create: CreateRewardedAd) {}

  /** 展示一个位面的激励视频。adUnitId 为空/undefined → no-fill（未配置真实广告位，D-48=B）。 */
  show(placement: string, adUnitId: string | undefined): Promise<AdResult> {
    if (!adUnitId) return Promise.resolve('no-fill');

    let e = this.entries.get(placement);
    if (!e) {
      const ad = this.create(adUnitId);
      e = { ad, resolve: null };
      ad.onClose((res: any) => {
        const r = res && res.isEnded ? 'completed' : 'closed';
        if (e!.resolve) { e!.resolve(r); e!.resolve = null; }
      });
      ad.onError(() => {
        if (e!.resolve) { e!.resolve('error'); e!.resolve = null; }
      });
      this.entries.set(placement, e);
    }

    return new Promise<AdResult>((resolve) => {
      e!.resolve = resolve;
      Promise.resolve(e!.ad.show()).catch(() => {
        if (e!.resolve) { e!.resolve('no-fill'); e!.resolve = null; }
      });
    });
  }
}
