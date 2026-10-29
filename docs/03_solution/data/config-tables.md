---
id: DATA-0001
title: 数值表说明
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 数值表说明

表结构以 `game-data/schemas/*.schema.json` 为准（本文件不复制字段）。表清单与所属模块由 `module-catalog.json` 的 `tables` 字段给出；`npm run gen:config` 会校验每张登记的表都有 schema。

## 口径（D-54，2026-10-29 裁决，原文照录不改措辞）

> 浮力 = Σ raft_tiles.capacity − (Σ 船体地块自重 + 货重)；items.capacity 一律归 0，语义改为「保留列位、不参与浮力计算」。

（以上为 `decision-index.json` 的 `D-54.detail.q2` 原文。`raft_tiles.capacity` 是浮力贡献；`items.capacity` 不参与浮力，仅保留列位。来源：D-54，2026-10-29 用户裁决。）
