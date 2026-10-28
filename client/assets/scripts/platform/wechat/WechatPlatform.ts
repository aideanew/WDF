import type { IPlatform, AdResult } from '../contracts/IPlatform';
import { RewardedAdController } from '../rewardedAd';
import { AD_UNIT_IDS } from '../ad.config';

declare const wx: any;

/** wechat 适配器：本目录是唯一允许直接调用 `wx.` 的地方。 */
export class WechatPlatform implements IPlatform {
  readonly name = 'wechat' as const;
  /** 激励视频（D-48=B：adUnitId 构建期常量 ad.config.ts；无 ID → no-fill）。 */
  private rewardedAd = new RewardedAdController((adUnitId) => wx.createRewardedVideoAd({ adUnitId }));
  login(): Promise<{ code: string }> {
    return new Promise((resolve, reject) => wx.login({ success: (r: any) => resolve({ code: r.code }), fail: reject }));
  }
  showRewardedAd(placement: string): Promise<AdResult> {
    return this.rewardedAd.show(placement, AD_UNIT_IDS.wechat[placement]);
  }
  share(p: { title: string; imageUrl?: string; query?: string }): void { wx.shareAppMessage(p); }
  storage = {
    get: (k: string): string | null => { try { const v = wx.getStorageSync(k); return v === '' ? null : v; } catch { return null; } },
    set: (k: string, v: string): boolean => { try { wx.setStorageSync(k, v); return true; } catch { return false; } },
    remove: (k: string): void => { try { wx.removeStorageSync(k); } catch { /* ignore */ } },
  };
  request(url: string, body: unknown, timeoutMs: number) {
    return new Promise<{ status: number; data: unknown }>((resolve, reject) =>
      wx.request({ url, method: 'POST', data: body, timeout: timeoutMs, success: (r: any) => resolve({ status: r.statusCode, data: r.data }), fail: reject }));
  }
  onNetworkChange(cb: (online: boolean) => void): void { wx.onNetworkStatusChange((r: any) => cb(!!r.isConnected)); }
  safeArea() { const s = wx.getSystemInfoSync().safeArea ?? { top: 0, bottom: 0, left: 0, right: 0 }; return { top: s.top, bottom: s.bottom, left: s.left, right: s.right }; }
  vibrateShort(): void { wx.vibrateShort?.({ type: 'light' }); }
  lifecycle = { onShow: (cb: () => void) => wx.onShow(cb), onHide: (cb: () => void) => wx.onHide(cb) };
  recorder = null;
}
