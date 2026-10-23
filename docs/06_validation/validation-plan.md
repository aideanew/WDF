---
id: VAL-0001
title: 验证计划
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 验证计划

| 层 | 内容 | 命令/方式 |
|---|---|---|
| 静态 | 类型、依赖边界、根目录、生成物未手改、Bundle 命名 | `npm run guard` |
| 数据 | 主键/外键/概率/区间/解锁无环 | `npm run gen:config` |
| 规则 | 同种子同输入同输出、存档迁移 | `npm test`（tests/determinism） |
| 契约 | 动作表完整、类型一致 | tests/contract |
| 真机 | 帧率、加载、内存、断网、切后台、杀进程 | device-matrix |
| 发布 | 提审清单、回滚演练 | 07_release/release-checklist |
