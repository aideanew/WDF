---
id: OPS-0001
title: 核心指标
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 核心指标

| 指标 | 定义 | 来源 |
|---|---|---|
| D1 / D7 留存 | 新增次日/七日回访 | 平台数据 + telemetry |
| 首钩命中率 | 教学后第一钩命中比例 | telemetry `hook_first_cast` |
| 首局时长 | 首次会话时长 | telemetry |
| 首日扩建次数 | 首日 raft 扩建次数 | telemetry |
| 赶海参与率 | 当日活跃中参加赶海比例 | event 表 |
| 广告完成率 / 人均次数 | 激励视频完成/展示 | ads 表 |
埋点名称登记在 `client/assets/scripts/features/telemetry/README.md`（开发时补）。初始目标见 `01_product/success-metrics.md`。
