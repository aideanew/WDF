---
id: ADR-0006
title: 脚本全部进主包，Asset Bundle 只装资源
status: accepted
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 脚本全部进主包，Asset Bundle 只装资源

## 背景
Cocos 官方：不同 Bundle 的脚本最好不要互相引用；微信不能远程下载脚本。

## 决定
所有 TS 在 `client/assets/scripts/`（主包）；`bundles/b-*` 只放场景、预制体、贴图、音频。Bundle 名统一 `b-` 前缀。

## 后果
脚本体积计入主包，需在 bundle-plan 中跟踪；预制体引用的组件脚本永远可用。
