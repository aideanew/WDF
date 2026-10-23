---
id: OPS-0003
title: 客服常见问题
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 客服常见问题

| 问题 | 先查 | 处理 |
|---|---|---|
| 丢档 | save_snapshot / save_fork | 引导选择分叉存档；必要时从备份恢复 |
| 赶海扣票未进场 | event_session、idempotency | 未创建场次则退票 |
| 广告奖励未到账 | idempotency、ads 记录 | 按 rid 补发一次 |
| 误封 | ban、audit_log | 复核后解封并记录 |
| 隐私/注销请求 | player、identity | 按隐私政策时限处理 |
