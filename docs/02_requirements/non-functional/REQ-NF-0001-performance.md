---
id: REQ-NF-0001
title: 性能与包体
status: active
module: client
owner: hark
created: 2026-10-23
review: 2026-11-23
---
- 低端安卓（4GB）稳定 30 帧；打捞时避免反复出现 >100ms 卡顿。
- 首次可操作：普通网络 P90 ≤5 秒；低端或弱网 ≤8 秒。
- 内存：以平台工具测量，先争取 180–250MB。
- 主包 ≤3.5MB（官方上限 4MB）；双平台总包 ≤20MB（抖音上限）。
- 本地存档 ≤300KB（微信 storage 上限 10MB/用户/小游戏）。
- 验收：`06_validation/device-matrix.md` 所列真机实测，结果存 `06_validation/evidence/`。
