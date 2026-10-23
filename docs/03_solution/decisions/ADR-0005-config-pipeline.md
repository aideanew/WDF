---
id: ADR-0005
title: 数值管线：CSV → 校验 → JSON/类型/版本
status: accepted
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 数值管线：CSV → 校验 → JSON/类型/版本

## 决定
`game-data/source/*.csv` 为唯一数值源；生成客户端默认 JSON、服务端 JSON、TS 类型与 configVersion。线上只热更数据，不热更代码；赶海场次锁定配置版本。
