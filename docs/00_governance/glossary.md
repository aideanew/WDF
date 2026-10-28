---
id: GOV-0005
title: 术语表
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 术语表

| 术语 | 定义 |
|---|---|
| 筏 / 船体 | 玩家的移动基地；由地块组成 |
| 地块 | 船体最小网格单元，提供浮力容量 |
| 房间 | 统一尺寸的框架，指定用途后才能摆设施 |
| 浮力 | 全部船体材料容量之和；规则：整船浮力 ≥ 总重量 |
| 出钩 | 长按蓄力、松手发射钩子；力度条约 1.2 秒往返 |
| 潮汐 | 浅海每 6 小时真实时间一次，持续 10 分钟 |
| 锁档 | 不上锁 / 铁 / 铜 / 银 / 金 |
| 赶海（每日一海·赶海多捞哦） | 20:00–21:00 每人一次 3 分钟的排名活动 |
| 联网实时收获 | 在线时产生、可计入总收益榜的收获 |
| 区服 | 相近时间加入的玩家分到同一片海域 |
| 权威 | 某数据以谁的计算为准（本地 / 服务器 / 混合） |
| game-core | 前后端共用的确定性规则包 |
| contracts | 前后端共用的接口契约包 |
| configVersion | 一套数值表的内容哈希 |
| Asset Bundle | Cocos 的资源模块；本项目以 `b-` 前缀命名，只装资源 |
| rid | 请求 ID，写操作幂等去重用 |
| 票据 (ticket) | 绑定/合服流程中签发的一次性、有时效的身份验证凭证 |
| 金币 | v1.0 唯一货币（设计权威 v5.5 L614）；商人只付金币，不做多货币 |
| `modules.wallet` | 存档里的本地金币镜像 `{ gold: number }`；**非权威**，权威在服务端 `ledger_entry`（D-15） |
| `herbDelta` | `economy.sell` 响应里的本次卖出所得金币数（字段名为历史遗留，语义已统一为金币，D-15） |
| 影子账本 | 服务端只追加流水 `ledger_entry`，卖出时校验"卖出 ≤ 累计获得 − 已卖出"，容差 0（ADR-0012） |
| 回收基数 `recycle_bp` | `prices` 表字段，语义是**回收价绝对值**（≈ 原价 50%），不是万分比系数；回收价 = `floor(recycle_bp × region_bp / 10000)`（D-01 2026-10-27 修正） |
| PanelKey | 主界面 Tab 类型：`hook/inventory/crafting/merchant/leaderboard`；设置与引导走浮层不进此类型 |
| UX 态 | 六态契约 `loading/empty/error/noPermission/success/conflict`，由 `toUxState(code)` 统一映射（DESIGN-0001） |
| EVD | Evidence 证据目录（`docs/06_validation/evidence/EVD-*`），每张卡的验收凭据 |
| FEATURE_NOT_AVAILABLE | 未实现动作的固定 `msg`，随 `4999` 返回（D-46） |
| `SAVE_SCHEMA_VERSION` | 存档结构版本；**新增 `modules.<key>` 属开放 map 扩展，不递增**（§3.4 裁定） |
| 五环（v1.0 代码层） | v1.0 的玩法闭环：**捞→包→做→扩→卖**（出钩打捞 → 背包 → 制作 → 扩筏 → 商人回收）；代码层口径（R-6，2026-10-28 用户拍板） |
| v1.0 代码层 | 五环对应的 10 模块（`hook`/`sea`/`chest`/`inventory`/`crafting`/`raft`/`economy`/`account`/`guide`/`settings`）；**其余 13 个 v1 模块进 v1.1** |
| 占位值 | 数值表中"全表同值"的字段（如 `items.stack` 106 行全 99、`items.unlock_level` 全 0）；由 `npm run placeholders` 机检（FIX-8） |
| 机检清单 | 提审清单中本可脚本判定的项（configVersion 一致性 / 主包 ≤4MB / 无锁开箱 / 广告位 ≤9）；由 `npm run release:check` 一键核验（FIX-11），其余项需真机/资质 |
| 激励视频三效果无载体 | `hook_cooldown`/`offline_double`/`shop_refresh` 的奖励载体（冷却字段/离线结算/商店）均未落地，v1.0 不伪造效果，冻结至 v1.1（D-49） |
