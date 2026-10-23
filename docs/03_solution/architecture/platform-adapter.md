---
id: ARCH-0002
title: 平台适配层
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 平台适配层

## 统一接口（`client/assets/scripts/platform/contracts/`）
| 能力 | 接口 | 微信 | 抖音 | APP（预留） |
|---|---|---|---|---|
| 登录 | `login(): Promise<{code}>` | wx.login | tt.login | 原生 SDK |
| 激励视频 | `showRewardedAd(placement)` → completed/closed/error/no-fill | createRewardedVideoAd | createRewardedVideoAd | 原生广告 |
| 分享 | `share(payload)` | shareAppMessage | shareAppMessage | 原生 |
| 录屏 | `recorder.start/stop` | 不支持（返回 unsupported） | getGameRecorderManager | — |
| 存储 | `storage.get/set/remove`（含容量失败） | wx.*Storage | tt.*Storage | 文件 |
| 网络 | `request`、`onNetworkStatusChange` | wx.request | tt.request | fetch |
| 系统 | `safeArea`、`menuButtonRect`、`vibrate` | | | |
| 生命周期 | `onShow/onHide` | wx.onShow/onHide | tt.onShow/onHide | |
| 隐私 | `privacy.requireAuthorize` | 隐私协议接口 | 对应接口 | |

## 选择方式
构建期常量：`import { WECHAT, BYTEDANCE } from 'cc/env'`，在 `platform/index.ts` 中按常量返回实现，未命中平台的代码被裁剪。

## 规则
- 只有 `platform/<impl>/` 可以出现 `wx.` / `tt.`（guard 检查）。
- 广告“完成”回调不作为高价值奖励的唯一依据；奖励由服务器 `ads.claim` 发放并幂等。
