---
id: DATA-0004
title: 接口目录（生成）
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 接口目录（由 contracts/common/actions.ts 生成，勿手改）

传输：`POST /v1/rpc`，封套见 `packages/contracts/src/common/envelope.ts`。

| 动作 | 模块 | 需登录 | 写操作（需 rid） | 说明 |
|---|---|---|---|---|
| `account.login` | account | — | ✔ | 平台 code 换会话；返回内部玩家ID、区服、是否新号 |
| `account.refresh` | account | — | — | 刷新会话（令牌过期也可用，handler 自校验签名后重签发） |
| `account.bindStart` | account | ✔ | ✔ | 发起绑定，返回一次性绑定票据 |
| `account.bindConfirm` | account | ✔ | ✔ | 在另一平台确认绑定，进入存档分叉选择 |
| `compliance.check` | compliance | ✔ | — | 实名/防沉迷状态与今日可玩时长 |
| `save.pull` | save | ✔ | — | 拉取云存档摘要/快照 |
| `save.push` | save | ✔ | ✔ | 提交存档（带修订号） |
| `save.resolveFork` | save | ✔ | ✔ | 玩家选择保留哪份存档 |
| `salvage.claimInfo` | salvage | ✔ | ✔ | 领取沉船信息份数 |
| `chest.open` | chest | ✔ | ✔ | 开启带锁或无锁箱子并领取保底奖励 |
| `economy.buyQuota` | economy | ✔ | ✔ | 购买区服每日限量物品（如高级开锁工具） |
| `economy.sell` | economy | ✔ | ✔ | 商人回收物品（影子账本校验，容差=0，ADR-0012） |
| `leaderboard.report` | leaderboard | ✔ | ✔ | 批量上报联网实时收获 |
| `leaderboard.query` | leaderboard | ✔ | — | 查询榜单快照 |
| `event.start` | event | ✔ | ✔ | 开赶海场次：服务器生成种子与装备快照 |
| `event.submit` | event | ✔ | ✔ | 提交操作事件，服务器复算计分 |
| `event.result` | event | ✔ | — | 查询本场结果与排名 |
| `social.send` | social | ✔ | ✔ | 发送快捷短语 |
| `social.pull` | social | ✔ | — | 拉取频道消息 |
| `ads.claim` | ads | ✔ | ✔ | 激励视频完成后领取奖励（幂等） |
| `telemetry.track` | telemetry | — | — | 批量埋点/错误上报 |
| `config.manifest` | config | — | — | 获取当前 configVersion 与数值热更包地址 |
