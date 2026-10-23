---
id: ARCH-0003
title: 分包与包体预算
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 分包与包体预算

预算见 `architecture-overview.md` 第 4.4 节。实测结果按版本追加：

| 版本 | 平台 | 主包 | 总包 | 最大分包 | 备注 |
|---|---|---|---|---|---|
| — | — | — | — | — | 尚未构建 |

规则：Bundle 名 `b-` 前缀；不嵌套；共享资源放高优先级（b-common=6）；自定义优先级不高于内置（main=7）；图集不直接放 Bundle 目录；Bundle 压缩类型在小游戏平台选“小游戏分包”。
