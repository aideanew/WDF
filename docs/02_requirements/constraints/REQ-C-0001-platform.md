---
id: REQ-C-0001
title: 平台与引擎约束
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---
- 引擎：Cocos Creator 3.8 系列 LTS 稳定补丁版；第 1 天双平台样包验证后锁定补丁号（写入 `03_solution/decisions/ADR-0001`）。
- 微信：主包 ≤4MB；主包+分包 ≤30MB；普通分包不限大小；独立分包 ≤4MB；不能远程下载脚本；storage 10MB。
- 抖音：主包 ≤4MB；整体 ≤20MB；单分包 ≤20MB；所有小游戏需 ICP 备案与小游戏备案（以官方为准）。
- 合规：防沉迷、隐私、IP 省份说明；概率公示由配置表生成。
