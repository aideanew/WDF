---
id: OPS-0004
title: 故障处理卡
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 故障处理卡

1. 判断范围：错误码分段统计（4xxx 系统 / 5xxx 风控）与费用告警。
2. 止血：ops 开关——停赶海入场、关聊天、降排行刷新频率、关闭某活动入口。
3. 回滚：config_release 回到上一个 configVersion；客户端版本问题提高 minClientVersion 或回退服务端。
4. 数据：从每日备份恢复到临时库核对后再修正，修正走只追加的 ledger_entry。
5. 公告与补偿：模板见本目录（开发时补），补偿走 ads/economy 的幂等发奖。
6. 复盘：写入 `08_knowledge/retrospectives/`。
