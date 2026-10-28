---
id: EVD-0108
title: Bundle 分包配置生效（E-01 验收）
status: accepted
owner: hark
created: 2026-10-26
review: 2026-11-28
---

# EVD-0108 — Bundle 分包配置生效（E-01 验收）

- **日期**：2026-10-26 10:48
- **对应阻塞**：E-01（Bundle 分包配置 0/7 生效）
- **状态**：✅ 已解除

## 操作记录

1. 用户在 Cocos Creator 3.8.8 `项目设置 → Bundle Config → Default Config` 方案，
   `Mini Game` 页签下将 `WeChat Mini Game` 行的 `Compression Type` 改为 `Subpackage`（Is Remote 不勾）。
   —— 该配置为**方案级**，对全部 7 个 Bundle 同时生效，无需逐 Bundle 改。
2. Agent 直接为其余 6 个 Bundle 文件夹写入 `userData.priority`
   （b-shallow=5；b-deep/b-island/b-defense=4；b-event/b-social=3；b-common 此前已有 6）。
3. 用户执行 `Ctrl+Shift+B` 重新构建微信小游戏包。

## 三层核对（`npm run check:bundles`）

| 层 | 检查项 | 结果 |
|---|---|---|
| ① 方案 | `builder.json` 微信行 `overwriteSettings.wechatgame.compressionType = subpackage` | ✅ |
| ② 文件夹 | 7 个 Bundle priority 全部匹配期望值 | ✅ |
| ③ 构建产物 | `client/build/wechatgame/game.json` 含 `subpackages`，且 `subpackages/` 落本地 | ✅ |

## 分包明细（game.json.subpackages，共 8 个）

- resources → subpackages/resources/
- b-common → subpackages/b-common/
- b-shallow → subpackages/b-shallow/
- b-deep → subpackages/b-deep/
- b-defense → subpackages/b-defense/
- b-island → subpackages/b-island/
- b-event → subpackages/b-event/
- b-social → subpackages/b-social/

## 结论

微信分包已真正生成并输出到本地，主包体积压力解除。E-01 关闭。
