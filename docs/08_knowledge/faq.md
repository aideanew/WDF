---
id: KB-0001
title: 常见问题
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 常见问题

- **为什么脚本不放进各 Bundle？** Cocos 官方建议不同 Bundle 脚本不要互相引用，微信不能远程下载脚本（ADR-0006）。
- **为什么不直接 import packages？** Cocos 只编译 assets 内脚本，用 tools/sync 复制最稳（ADR-0002）。
- **改了数值线上多久生效？** 发布 config_release 后，客户端下次启动拉取；进行中的赶海不受影响。
