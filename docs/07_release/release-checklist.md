---
id: REL-CHK
title: 发布检查清单
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 发布检查清单

- [ ] `npm run verify` 全绿；构建号、configVersion、存档 schema、数据库迁移已记录
- [ ] 主包/总包在预算内（bundle-plan 实测更新）
- [ ] 存档：断网给明确提示且不丢已确认数据、切后台重连、旧档升级、双设备分叉均通过
- [ ] 广告：完成/取消/无填充/网络失败/重复回调
- [ ] 账号：登录过期、换号、绑定、注销、封禁
- [ ] 合规：compliance/ 下各项与实际行为一致
- [ ] 可关闭活动入口、可回滚配置、备份可恢复
