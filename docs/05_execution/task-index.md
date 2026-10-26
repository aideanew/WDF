---
id: TASK-INDEX
title: 任务索引（生成）
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 任务索引（生成，勿手改）

| ID | 标题 | 状态 | 路径 |
|---|---|---|---|
| TASK-0101 | Cocos 工程初始化与 Bundle 配置（【人工】） | done | `docs/05_execution/tasks/TASK-0101.md` |
| TASK-0103 | 契约类型补缺（G-06 / G-07 / 命名核对） | active | `docs/05_execution/tasks/TASK-0103.md` |
| TASK-0104 | 服务端鉴权与 account.login 真实实现 | done | `docs/05_execution/tasks/TASK-0104.md` |
| TASK-0105 | compliance.check 与 config.manifest 真实实现 | done | `docs/05_execution/tasks/TASK-0105.md` |
| TASK-0106 | 本地存档读写与校验（杀进程可恢复） | active | `docs/05_execution/tasks/TASK-0106.md` |
| TASK-0107 | save.push / save.pull 真实落库（含幂等与版本冲突返回） | done | `docs/05_execution/tasks/TASK-0107.md` |
| TASK-0108 | Boot 场景控制器 + 统一 RPC 客户端 + 错误展示 | active | `docs/05_execution/tasks/TASK-0108.md` |
| TASK-0201 | game-core/hook 蓄力与轨迹规则（确定性） | done | `docs/05_execution/tasks/TASK-0201.md` |
| TASK-0202 | HookView 表现层（力度条 / 飞行 / 回手 / 命中反馈） | active | `docs/05_execution/tasks/TASK-0202.md` |
| TASK-0802 | 赶海 ops 复算计分（v1.1） | proposed | `docs/05_execution/tasks/TASK-0802.md` |
| TASK-0803 | 赶海 21:05 结算与发奖（v1.1） | proposed | `docs/05_execution/tasks/TASK-0803.md` |
| TASK-0902 | 赶海分组榜（v1.1） | proposed | `docs/05_execution/tasks/TASK-0902.md` |
| TASK-0903 | 排行榜压测（决定是否引入 Redis） | proposed | `docs/05_execution/tasks/TASK-0903.md` |
| TASK-1301 | 称号展示（榜单位 + 个人信息区） | active | `docs/05_execution/tasks/TASK-1301.md` |
| TASK-1401 | 开新区 + 封号（脚本 / SQL 级，不做后台） | active | `docs/05_execution/tasks/TASK-1401.md` |
| TASK-1502 | drops（箱子内容）填数——只转录，不设计 | active | `docs/05_execution/tasks/TASK-1502.md` |
| TASK-1503 | 34 张占位表补列结构（列由设计文档推导，数字不编） | active | `docs/05_execution/tasks/TASK-1503.md` |
| TASK-1601 | 契约测试自动生成 + 数值表非空断言（登记，暂不实施） | proposed | `docs/05_execution/tasks/TASK-1601.md` |
| TASK-1602 | 密钥扫描守卫（第 10 项 guard，登记，暂不实施） | proposed | `docs/05_execution/tasks/TASK-1602.md` |
| TASK-2001 | 契约补缺（chest 业务类型 + 错误路径对照表） | done | `docs/05_execution/tasks/TASK-2001.md` |
| TASK-2101 | game-core/hook 蓄力+轨迹+命中（确定性） | done | `docs/05_execution/tasks/TASK-2101.md` |
| TASK-2102 | HookView 程序化表现（力度条/飞行/回手） | done | `docs/05_execution/tasks/TASK-2102.md` |
| TASK-2103 | 出钩接线（命中→入包→存档） | done | `docs/05_execution/tasks/TASK-2103.md` |
| TASK-2201 | account.bindStart / bindConfirm（账号合并） | done | `docs/05_execution/tasks/TASK-2201.md` |
| TASK-2202 | save.resolveFork（存档分叉裁决） | done | `docs/05_execution/tasks/TASK-2202.md` |
| TASK-2203 | leaderboard.report / query（总收益榜） | done | `docs/05_execution/tasks/TASK-2203.md` |
| TASK-2204 | telemetry.track（批量埋点） | done | `docs/05_execution/tasks/TASK-2204.md` |
| TASK-2401 | handler 契约测试补强 | done | `docs/05_execution/tasks/TASK-2401.md` |
| TASK-2402 | e2e 骨架 1 条 | done | `docs/05_execution/tasks/TASK-2402.md` |
| TASK-2501 | 文档一致性返工 | done | `docs/05_execution/tasks/TASK-2501.md` |
| TASK-3001 | UX 态契约落地（common/ux.ts + 契约测试） | done | `docs/05_execution/tasks/TASK-3001.md` |
| TASK-3002 | configVersion 单一来源（消除客户端两处硬编码） | done | `docs/05_execution/tasks/TASK-3002.md` |
| TASK-3100 | 客户端配置表读取服务（services/config 实现 + 面板接口对齐） | done | `docs/05_execution/tasks/TASK-3100.md` |
| TASK-3101 | 主界面 Tab 导航 + 四个面板桩（纯代码 UI） | done | `docs/05_execution/tasks/TASK-3101.md` |
| TASK-3102 | 背包列表页（读 106 行真实物品） | done | `docs/05_execution/tasks/TASK-3102.md` |
| TASK-3103 | 合成面板（80 条真实配方 + 材料判定） | done | `docs/05_execution/tasks/TASK-3103.md` |
| TASK-3104 | 排行榜页（接已实现的 leaderboard.query） | done | `docs/05_execution/tasks/TASK-3104.md` |
| TASK-3105 | 云存档同步与分叉裁决 UI（conflict 态唯一出口） | done | `docs/05_execution/tasks/TASK-3105.md` |
| TASK-3201 | game-core/crafting 可制作判定（canCraft / consume） | done | `docs/05_execution/tasks/TASK-3201.md` |
| TASK-3202 | game-core/inventory 存档段投影（listRows） | done | `docs/05_execution/tasks/TASK-3202.md` |
| TASK-3301 | 守卫第 10 项：源 ↔ generated 双向同步校验 | done | `docs/05_execution/tasks/TASK-3301.md` |
| TASK-3302 | game-core/save 封印回归测试（覆盖旧 checksum 混入缺陷） | done | `docs/05_execution/tasks/TASK-3302.md` |
| TASK-3401 | 计划 / 路线图 / 任务索引对齐（本轮收口） | done | `docs/05_execution/tasks/TASK-3401.md` |
