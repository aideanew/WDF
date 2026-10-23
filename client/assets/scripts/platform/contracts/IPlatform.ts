export type AdResult = 'completed' | 'closed' | 'no-fill' | 'error';

export interface IPlatform {
  readonly name: 'wechat' | 'douyin' | 'app' | 'web';
  login(): Promise<{ code: string }>;
  showRewardedAd(placement: string): Promise<AdResult>;
  share(payload: { title: string; imageUrl?: string; query?: string }): void;
  storage: {
    get(key: string): string | null;
    /** 返回 false 表示容量不足或写入失败 */
    set(key: string, value: string): boolean;
    remove(key: string): void;
  };
  request(url: string, body: unknown, timeoutMs: number): Promise<{ status: number; data: unknown }>;
  onNetworkChange(cb: (online: boolean) => void): void;
  safeArea(): { top: number; bottom: number; left: number; right: number };
  vibrateShort(): void;
  lifecycle: { onShow(cb: () => void): void; onHide(cb: () => void): void };
  /** 抖音录屏；不支持的平台返回 null */
  recorder: { start(): void; stop(): void } | null;
}
