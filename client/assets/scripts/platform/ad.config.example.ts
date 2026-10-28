/**
 * 激励视频广告位 ID 模板（D-48=B：真实 adUnitId 构建期常量，**不入库**）。
 *
 * 用法：复制本文件为同目录 `ad.config.ts`（已被 .gitignore 忽略），在对应平台下填入
 * 微信/抖音后台的激励视频广告位 ID。例：
 *   wechat: { hook_cooldown: 'adunit-xxxxxxxxxxxxxxxx' }
 * 未填写的位面 → 平台 `showRewardedAd` 返回 'no-fill'（不假装有广告）。
 */
export const AD_UNIT_IDS: { wechat: Record<string, string>; douyin: Record<string, string> } = {
  wechat: {},
  douyin: {},
};
