---
id: GOV-0009
title: 模块总览（生成）
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 模块总览（由 module-catalog.json 生成，勿手改）

| 模块 | 名称 | 阶段 | 客户端 | 规则包 | 服务端 | 契约 | 资源包 | 权威 | 联网 | 数值表 | 存档段 | v5.5 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| account | 账号与身份 | v1 | ✔ | — | ✔ | ✔ | app | server | required | regions | — | 11.5/账号设计 |
| compliance | 合规 | v1 | ✔ | — | ✔ | ✔ | app | server | required | — | consent | 11.5 |
| progression | 等级与解锁 | v1 | ✔ | ✔ | — | — | app | local | none | levels, unlocks | progression | 1.4 |
| hook | 出钩 | v1 | ✔ | ✔ | — | — | b-shallow | local | none | hooks, lines | hookLoadout | 1.2/3.1 |
| sea | 海域与潮汐 | v1 | ✔ | ✔ | — | — | b-shallow | local | none | zones, spawns, tides | voyage | 2 |
| salvage | 沉船·潜水·石油·探索 | v1 | ✔ | ✔ | ✔ | ✔ | b-deep | hybrid | optional | shipwrecks, oil, explore | salvage | 3.3-3.5 |
| fishing | 钓鱼 | v1 | ✔ | ✔ | — | — | b-shallow | local | none | fish, bait | — | 3.2 |
| chest | 箱子与开锁 | v1 | ✔ | ✔ | ✔ | ✔ | app | hybrid | optional | chests, locks, drops, lockpick_tools | — | 3.6/8.4 |
| inventory | 物品与仓储 | v1 | ✔ | ✔ | — | — | app | local | none | items | inventory, storage | 4.5/13 |
| raft | 筏体建设 | v1 | ✔ | ✔ | — | — | b-common | local | none | raft_tiles, rooms, facilities | raft | 4.1 |
| crafting | 图纸与制作 | v1 | ✔ | ✔ | — | — | b-common | local | none | recipes, blueprints, quality | blueprints | 5.4/5.5 |
| crew | 员工与食物 | v1 | ✔ | ✔ | — | — | b-common | local | none | jobs, foods, crew_traits | crew | 5.1-5.3 |
| power | 电力 | v1 | ✔ | ✔ | — | — | b-common | local | none | generators, consumers | power | 6 |
| island | 岛屿与基地 | v1 | ✔ | ✔ | — | — | b-island | local | none | islands, buildings, protection_cards | islands | 4.2-4.5 |
| defense | 野人袭击与塔防 | v1 | ✔ | ✔ | — | — | b-defense | local | none | units, defenses, waves, throwables | defense | 7 |
| economy | 金币与商人 | v1 | ✔ | ✔ | ✔ | ✔ | app | hybrid | optional | prices, merchants, limits | wallet | 9.1/9.2 |
| leaderboard | 排行与称号 | v1 | ✔ | ✔ | ✔ | ✔ | b-social | server | required | seasons, titles | — | 10.1/10.3 |
| event | 每日一海·赶海多捞哦 | v1 | ✔ | ✔ | ✔ | ✔ | b-event | server | required | events, event_drops | — | 10.2 |
| social | 聊天 | v1 | ✔ | — | ✔ | ✔ | b-social | server | required | phrases | — | 9.4 |
| ads | 激励视频 | v1 | ✔ | — | ✔ | ✔ | app | server | required | ad_placements | — | 11.5 |
| guide | 新手引导 | v1 | ✔ | — | — | — | app | local | none | guide_steps | guide | 1.3 |
| settings | 设置 | v1 | ✔ | — | — | — | app | local | none | — | settings | 11.3 |
| telemetry | 埋点与错误上报 | v1 | ✔ | — | ✔ | ✔ | app | server | optional | — | — | 评审11.17 |
| pvp | PVP掠夺 | v2 | — | — | — | — | - | server | required | — | — | 8.1-8.3 |
| trade | 玩家交易 | v2 | — | — | — | — | - | server | required | — | — | 9.3 |
| recruit | 招揽工匠 | v2 | — | — | — | — | - | server | required | — | — | 8.5 |
| burial | 埋藏 | v2 | — | — | — | — | - | server | required | — | — | 4.6 |
| ocean | 远洋 | v2 | — | — | — | — | - | local | none | — | — | 2.1 |

路径约定：客户端 `client/assets/scripts/features/<id>/`；规则 `packages/game-core/src/<id>/`；契约 `packages/contracts/src/<id>/`；服务端 `server/src/modules/<id>/`。
