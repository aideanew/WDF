import type { IPlatform, AdResult } from '../contracts/IPlatform';

/** 编辑器预览与浏览器调试用。 */
export class WebPlatform implements IPlatform {
  readonly name = 'web' as const;
  async login() { return { code: 'dev' }; }
  async showRewardedAd(): Promise<AdResult> { return 'completed'; }
  share(): void {}
  storage = {
    get: (k: string) => localStorage.getItem(k),
    set: (k: string, v: string) => { try { localStorage.setItem(k, v); return true; } catch { return false; } },
    remove: (k: string) => localStorage.removeItem(k),
  };
  async request(url: string, body: unknown, timeoutMs: number) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs);
    try { const r = await fetch(url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' }, signal: ctl.signal }); return { status: r.status, data: await r.json() }; }
    finally { clearTimeout(t); }
  }
  onNetworkChange(cb: (online: boolean) => void) { addEventListener('online', () => cb(true)); addEventListener('offline', () => cb(false)); }
  safeArea() { return { top: 0, bottom: 0, left: 0, right: 0 }; }
  vibrateShort() {}
  lifecycle = { onShow: (cb: () => void) => addEventListener('focus', cb), onHide: (cb: () => void) => addEventListener('blur', cb) };
  recorder = null;
}
