import { WECHAT, BYTEDANCE } from 'cc/env';
import type { IPlatform } from './contracts/IPlatform';
import { WechatPlatform } from './wechat/WechatPlatform';
import { DouyinPlatform } from './douyin/DouyinPlatform';
import { WebPlatform } from './web/WebPlatform';

let instance: IPlatform | null = null;

/** 构建期常量选择适配器：未命中的平台分支在构建时被裁剪。 */
export function getPlatform(): IPlatform {
  if (instance) return instance;
  if (WECHAT) instance = new WechatPlatform();
  else if (BYTEDANCE) instance = new DouyinPlatform();
  else instance = new WebPlatform();
  return instance;
}
export type { IPlatform } from './contracts/IPlatform';
