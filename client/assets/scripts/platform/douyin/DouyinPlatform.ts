import type { IPlatform, AdResult } from '../contracts/IPlatform';

declare const tt: any;

/** douyin 适配器：本目录是唯一允许直接调用 `tt.` 的地方。 */
export class DouyinPlatform implements IPlatform {
  readonly name = 'douyin' as const;
  login(): Promise<{ code: string }> {
    return new Promise((resolve, reject) => tt.login({ success: (r: any) => resolve({ code: r.code }), fail: reject }));
  }
  async showRewardedAd(_placement: string): Promise<AdResult> { return 'no-fill'; /* TODO: createRewardedVideoAd 复用实例 */ }
  share(p: { title: string; imageUrl?: string; query?: string }): void { tt.shareAppMessage(p); }
  storage = {
    get: (k: string): string | null => { try { const v = tt.getStorageSync(k); return v === '' ? null : v; } catch { return null; } },
    set: (k: string, v: string): boolean => { try { tt.setStorageSync(k, v); return true; } catch { return false; } },
    remove: (k: string): void => { try { tt.removeStorageSync(k); } catch { /* ignore */ } },
  };
  request(url: string, body: unknown, timeoutMs: number) {
    return new Promise<{ status: number; data: unknown }>((resolve, reject) =>
      tt.request({ url, method: 'POST', data: body, timeout: timeoutMs, success: (r: any) => resolve({ status: r.statusCode, data: r.data }), fail: reject }));
  }
  onNetworkChange(cb: (online: boolean) => void): void { tt.onNetworkStatusChange((r: any) => cb(!!r.isConnected)); }
  safeArea() { const s = tt.getSystemInfoSync().safeArea ?? { top: 0, bottom: 0, left: 0, right: 0 }; return { top: s.top, bottom: s.bottom, left: s.left, right: s.right }; }
  vibrateShort(): void { tt.vibrateShort?.({ type: 'light' }); }
  lifecycle = { onShow: (cb: () => void) => tt.onShow(cb), onHide: (cb: () => void) => tt.onHide(cb) };
  recorder = { start: () => tt.getGameRecorderManager().start({ duration: 30 }), stop: () => tt.getGameRecorderManager().stop() };
}
