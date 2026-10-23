---
id: PRD-0000
title: 立项书（Project Charter）
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 立项书（Project Charter）

> 立项阶段的总入口。细节权威：玩法 `docs/01_product/design-source/我的筏-深度设计方案-v5.5.md`，决定 `docs/01_product/design-source/设计要点记录.md`（冲突取最新时间），评审 `docs/01_product/design-source/立项评审-Hark回答.md`（v5）。标【已定】=用户决定；【建议】=Hark 建议，用户未定。

| 项 | 内容 |
|---|---|
| 项目名 | 《我的筏不可能这么大》（简称“我的筏”） |
| 定位【已定】 | 轻量漂流生存小游戏：简单上手、核心循环耐玩、低配、~~断网可玩~~（10-23 10:40 改为**必须联网**，ADR-0008）、省份排名、上头 |
| 入口【已定】 | 微信小游戏、抖音小游戏、未来 APP；共用一套前后端；绑定微信+抖音后为同一账号 |
| 团队【已定】 | 一人开发；Cocos Creator |
| 排期【已定】 | **v1.0** 5 周（微信首发）；**v1.1** v1.0 上线后 2–4 周（先微信）；抖音**软著下证后**再上，预计比微信晚 1–3 个月（Hark 代定 10-23 10:45） |
| 首版范围【已定】 | 见 `mvp-scope.md` |
| 变现【已定】 | 激励视频（微信流量主），只做主动激励；内购等版号 |
| 合规【已定】 | **个人主体**（10-23 10:23 拍板 1）；~~版号~~（纯广告游戏不需要）；主体认证、ICP 备案（个人主体立即办）、软著（不加急、自办、立即申请，名字=我的筏不可能这么大）、防沉迷、概率公示、聊天审核（以平台最新规则为准） |
| 技术方案【已定】 | `docs/03_solution/architecture/architecture-overview.md`；后端 = 腾讯云轻量 2C4G（广州/上海）+ Docker Compose（ADR-0003 accepted）；数据库 = PostgreSQL 单库、Redis 暂不上（ADR-0004 accepted） |
| 成功指标【建议】 | `success-metrics.md` |
| 主要风险 | `docs/00_governance/risks.md` + 立项评审第五点五节 |
| 待拍板 | **无**。8 问已于 10-23 10:23 拍板；Hark 代定 10-23 10:45 落实：ADR-0003（腾讯云轻量 2C4G + Docker Compose）、ADR-0004（PostgreSQL 单库，Redis 暂不上）、软著与首发顺序、v1.0/v1.1 分期（`mvp-scope.md` 第 5 节）、functional-analysis 第 5 节 6 条。记录见 `设计要点记录.md` 末节 |
| 暂存待澄清 | `docs/02_requirements/functional-analysis.md` 第 5 节已由 Hark 代定澄清 6 条；剩余待澄清见该节末"仍待澄清"（赶海计分是否含箱子本身） |

## 立项阶段的退出条件（进入开发前必须满足）
- [x] 首版范围冻结（v1.0/v1.1 分期已定，mvp-scope 第 5 节，10-23 10:45）
- [x] 8 个拍板问题有结论或明确默认（2026-10-23 全部拍板）
- [x] 主体与资质路线确定（个人主体；软著立即申请、不加急；ICP 备案立即办）
- [ ] 引擎补丁版本锁定（ADR-0001）
- [x] 工程骨架 `npm run verify` 全绿（已完成，2026-10-23）
