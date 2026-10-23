---
id: ARCH-0001
title: 总体架构方案（集大成版）
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
related: [ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0005, ADR-0006]
---

# 总体架构方案

> 依据：用户已定设计（v5.5 + 设计要点记录，冲突取最新）、四份外部评审取舍（立项评审-Hark回答 v5）、三份目录规划方案的裁决（见 `project-structure-spec.md` 第二节），以及官方文档（2026-10-23 核对，见文末）。
> 两条主线：**高性能**（主包小、帧稳、请求少、热路径零分配）与 **高拓展**（新内容只加配置和资源、新平台只加适配器、新模块只按模板长出来）。

## 1. 先定的四条官方硬约束

| 约束 | 官方事实 | 对架构的影响 |
|---|---|---|
| 微信包体 | 主包 ≤4MB；主包+分包 ≤30MB；普通分包不限大小；独立分包 ≤4MB；不能从远程下载脚本 | 首屏只放引擎+启动+核心脚本；内容按 Asset Bundle 拆分包；脚本全部随包 |
| 抖音包体 | 主包 ≤4MB；整体 ≤20MB；单分包 ≤20MB（开虚拟支付后可到 30MB） | **以抖音 20MB 作为双平台共同预算上限**，超出部分走远程资源（仅资源，不含脚本） |
| Cocos Asset Bundle | 内置 `main/resources/start-scene/internal` 不可重名；不支持嵌套；**不同 Bundle 的脚本最好不要互相引用**；共享资源放高优先级 Bundle；图集不建议直接放 Bundle 目录 | 脚本统一进主包；Bundle 只装资源；用优先级管理共享资源 |
| 本地存储 | 微信：同一用户同一小游戏 storage 上限 10MB | 存档目标 ≤300KB，主副两份 + 校验；回放只留最近几场 |

## 2. 运行时全景

```text
┌──────────── 微信 / 抖音 / 未来 APP（入口）────────────┐
│  client（Cocos 3.8，一份代码，构建时按平台注入适配器）     │
│   view(cc组件) → model(用例+状态) → game-core(纯规则)      │
│                 ↘ services(save/net/config/time) → platform│
└──────────────────────┬────────────────────────────────┘
                       │ HTTPS  POST /v1/rpc  (action 封套)
┌──────────────────────▼────────────────────────────────┐
│ server（Node 22 + TS，模块化单体，容器部署，可横向扩容）    │
│  gateway(鉴权/限流/幂等/版本) → modules/* → repo → DB     │
│  同一份 game-core 用于复核（赶海、开锁、收益合理性）       │
└───────────────┬───────────────────────┬───────────────┘
           PostgreSQL（事务/流水/赛季）     对象存储/CDN（远程资源、数值热更包）
```

## 3. 三大支柱

### 3.1 一份规则，两端执行：`packages/game-core`
- **为什么**（三份方案都没有，但对本项目是决定性的）：必须联网（10-23 10:40 拍板 4 选 B）→ 写操作由服务器确认；赶海/排行/开锁要服务器复核 → 同一规则必须在服务端再跑一次；塔防结算与回放 → 必须**确定性**。写两份必然漂移。旧说法：~~主线断网可玩 → 规则必须在客户端跑~~
- **规则**：纯 TypeScript；禁止 `cc`、`Math.random`、`Date.now`、IO；随机用种子 PRNG（`rng.ts`）；时间由调用方传入；尽量整数运算（金币、重量用整数，概率用万分比）。
- **交付**：服务端直接 import；客户端由 `tools/sync/to-client.mjs` 复制到 `client/assets/scripts/generated/game-core/`（Cocos 只编译 assets 内脚本，复制是最稳的方式）。

### 3.2 一份契约：`packages/contracts`
- 动作目录（action catalog）+ 请求/响应类型 + 错误码 + 封套。客户端只用类型（`import type`，零运行时体积）；服务端用 zod 做运行时校验（Node 端体积无所谓）。
- 改字段 → 两端编译报错 → 不可能漏。

### 3.3 一份数值：`game-data/`
- CSV 为源（Git 可 diff；Excel 编辑后另存 CSV，或直接用表格工具编辑 CSV）。`tools/gen/config.mjs` 校验（主键唯一、外键存在、概率合计=10000、解锁无环、数值区间）→ 输出：
  - `client/assets/resources/config/*.json`（随包默认值）
  - `server/generated/config/*.json`（服务端权威值）
  - `packages/game-core/src/generated/config-types.ts`（表结构类型）
  - `configVersion`（内容哈希）
- 线上调数值：服务端下发 `configVersion`，客户端拉取“数值热更包”覆盖默认值；**只热更数据，不热更代码**；每场赶海锁定一个 configVersion。

## 4. 客户端设计

### 4.1 分层（每个 feature 内部同构）
| 层 | 位置 | 职责 | 禁止 |
|---|---|---|---|
| view | `features/<m>/view/` | Cocos 组件、动画、输入转命令 | 算规则、改存档、调平台 API |
| model | `features/<m>/model/` | 用例（一次完整操作）、模块状态 store、订阅事件 | 依赖 `cc` 节点（可用 `cc` 的纯类型以外的东西一律不碰） |
| game-core | `generated/game-core/<m>/` | 纯规则 | 一切副作用 |
| services | `services/` | save、net、config、time、audio、pool、bus、log | 业务规则 |
| platform | `platform/<wechat|douyin|app>/` | 登录、广告、分享、存储、网络状态、安全区、录屏、隐私授权 | 业务规则 |

- **事务化用例**：一次制作/建造/开箱 = 校验 → 扣 → 加 → 写本地存档（同一帧内完成，失败整体回滚到快照）。
- **平台选择在构建期**：`import { WECHAT, BYTEDANCE } from 'cc/env'`，常量分支被裁剪，另一个平台的适配器代码不进包（比运行时 `typeof wx` 判断更省包体）。

### 4.2 状态与事件
- 每个模块一个 store（普通对象 + 版本号），view 订阅 store 的 `changed` 事件做**脏标记**，在 `lateUpdate` 统一刷新一次（避免一帧多次重绘）。
- 全局事件总线只传“发生了什么”（领域事件），不传“去做什么”；事件名集中在 `services/bus/events.ts`。

### 4.3 性能策略（热路径）
- 对象池：漂浮物、钩子、飘字、敌人、投射物、背包格子。
- 同屏漂浮物 ≤20（已定）；敌人/投射物/UI 节点另设预算（`performance-budget.md`）。
- 帧循环：出钩与塔防用固定逻辑步长（塔防 10Hz 逻辑 + 插值渲染），与渲染帧解耦，低端机降帧不降判定。
- 力度条按真实经过时间计算（约 1.2 秒往返），不按帧数。
- 列表虚拟化：背包/仓库/商人只渲染可见格。
- 图集按“同时出现的界面”组织；数字用位图字体，中文用系统字体，不打包整套中文字体。
- 低配三档：只降背景、波纹、粒子；界面与必要反馈不降。
- 资源释放：离开场景时按 Bundle `release`；进入赶海前预下载 b-event，避免扣票后才下载。

### 4.4 包体规划（初始预算，真机实测后更新 `bundle-plan.md`）
| 包 | 内容 | 目标 |
|---|---|---|
| 主包 | 引擎（启用引擎插件/原生代码分包）、boot/loading、全部脚本、ui-kit 最小图集、`resources/config` | ≤3.5MB |
| `b-common`（优先级 6，小游戏分包） | 物品图标、筏体模块、通用面板预制体 | ≤3MB |
| `b-shallow`（5） | 浅海场景、漂浮物、钩子表现、钓鱼 | ≤4MB |
| `b-deep`（4） | 深海、野人船、沉船、石油 | ≤4MB |
| `b-island`（4） | 岛屿模板、岛上建筑 | ≤3MB |
| `b-defense`（4） | 9 兵种、防御塔、投掷物、特效 | ≤3MB |
| `b-event`（3） | 赶海场景与结算 | ≤1.5MB |
| `b-social`（3） | 排行、称号、聊天界面 | ≤1MB |
| 合计 | | ≤20MB（抖音上限） |

## 5. 服务端设计

### 5.1 形态（ADR-0003，accepted）
- **模块化单体**：一个 Node 22 + TypeScript 服务（Fastify），内部按模块划分；无状态，容器化部署。
- **部署**：腾讯云轻量应用服务器（2 核 4G，广州或上海）+ Docker Compose，单机同时服务微信与抖音；合法域名必须是已备案的国内域名，域名以个人主体立即办 ICP 备案。
- **为什么不是云函数**：抖音也要调同一后端（微信云开发 callFunction 只服务微信）；几十个函数的冷启动与重复依赖不适合一人维护。
- **为什么不是多服务**：日活 1 千～1 万阶段没有必要；模块边界清晰即可，将来按模块拆。

### 5.2 模块与权威
| 服务端模块 | 负责 | 是否用 game-core 复核 |
|---|---|---|
| account | 登录换会话、内部玩家 ID、绑定合并、区服、IP 省份 | — |
| compliance | 实名/防沉迷、未成年人时段 | — |
| save | 云存档（快照 + 修订号）、分叉保留 | 读档时全量重算浮力/重量做健全性检查 |
| economy | 竞争资产流水、按区服每日限量物品发放 | ✔ 价格规则 |
| leaderboard | 联网收益上报、合理性上限、赛季快照、称号 | ✔ 收益计分与每小时上限 |
| event | 赶海场次、装备快照、种子、结算 | ✔ 开锁/掉落/计分 |
| salvage | 沉船信息份数发放 | ✔ 掉落 |
| ads | 激励视频发奖、防重复 | — |
| social | 快捷短语聊天、举报 | — |
| telemetry | 批量埋点、错误日志 | — |
| ops（内部） | 开关、配置发布、封禁、回滚 | — |

### 5.3 数据库（ADR-0004，accepted：PostgreSQL 单库，Redis 暂不上）
- 事务、唯一约束、行锁天然适合“物资流水 + 幂等 + 赛季结算”；`jsonb` 存存档快照；分区表存收益事件。
- 主要表：`player`、`identity`、`bind_ticket`、`save_snapshot`、`save_fork`、`ledger_entry`、`idempotency`、`income_event`（按日分区）、`income_daily`、`season`、`leaderboard_snapshot`、`title_award`、`event_session`、`event_result`、`daily_quota`、`chat_message`（TTL）、`report`、`ban`、`config_release`、`audit_log`。
- 排行读快照表（定时生成），不在线排序；Redis 暂不上（ADR-0004），压测不达标再加 ZSET，不改接口。

### 5.4 定时任务
`jobs/`：赛季结算、排行快照（每 5–10 分钟）、赶海开场/关场、每日限量重置、过期数据清理。任务必须幂等（以“任务名+时间窗”为锁）。

## 6. 前后端数据交互

### 6.1 传输
- `POST /v1/rpc`：`{ a: "event.start", p: {...}, m: {...} }`；`POST /v1/batch` 用于埋点和收益上报的批量提交。
- 单一域名、单一入口：两平台只需配置一个合法域名；网关统一做鉴权、限流、幂等、版本协商、日志。

### 6.2 封套（`packages/contracts/src/common/envelope.ts`）
- 请求 meta：`rid`（请求 ID，写操作必带，用于幂等）、`cv`（客户端版本）、`cfg`（configVersion）、`sv`（存档 schema 版本）、`plat`（wechat/douyin/app）。
- 响应：`{ c: 0, d, t, cfg? }`；失败 `{ c, msg }`。`t` 为服务器时间（毫秒），客户端维护时间偏移。

### 6.3 错误码分段
`0` 成功 · `1xxx` 契约/参数 · `2xxx` 登录/权限 · `3xxx` 业务规则拒绝 · `4xxx` 系统依赖 · `5xxx` 风控/复核不一致 · `9xxx` 版本过低需更新。客户端按段处理，不逐个硬编码。

### 6.4 信任边界（谁说了算）
| 数据 | 权威 | 计榜/发奖 |
|---|---|---|
| 主线打捞、建造、制作、员工、塔防 | 服务器（客户端只读缓存） | 全部经服务器确认后才计榜（10-23 10:40 起，ADR-0008） |
| 联网实时收获 | 客户端上报事件 + 服务器合理性校验 | 计总收益榜（已定），超上限标记复核 |
| 赶海场次/装备快照/成绩/奖励 | 服务器 | 是 |
| 广告奖励、竞争资产、区服限量物品 | 服务器（rid 幂等） | 是 |

### 6.5 存档同步
- 本地：关键操作后立即写本地（主副两份 + 校验和）；切后台尽力保存；不依赖退出事件。
- 云端：已定“上线和下线时同步”保留；另加节流同步（关键操作后 ≥60 秒合并一次）。
- 冲突：带修订号提交；不匹配则返回云端摘要；**两份都保留，让玩家选一份继续，绝不相加**。
- 格式：`schemaVersion` + 迁移链（任意旧版本一次升到当前）；旧客户端读到新格式提示更新，绝不覆盖成空档。

### 6.6 绑定合并（已定：绑定后即同一账号）
`identity(platform, openid, unionid?) → player_id`；绑定流程：A 平台发起 → 生成一次性 `bind_ticket` → B 平台确认 → 两份存档进入分叉选择（不相加）→ 合并身份到一个 `player_id`。

## 7. 拓展点（高拓展的具体落点）
| 想加的东西 | 改哪里 | 不需要改 |
|---|---|---|
| 新物品/配方/价格/概率 | `game-data` | 代码 |
| 新海域（如远洋） | 新 Bundle + zones/spawns 表 + `sea` 模块配置 | 其他模块 |
| 新兵种 | units 表 + b-defense 资源 | 塔防模拟核心 |
| 新活动 | `event` 模块新增活动类型处理器 + events 表 | 网关、存档 |
| 新平台（APP） | `client/platform/app/` + 构建模板 | 业务代码 |
| PVP/交易（第二版） | 新增服务器权威模块；竞争资产走 `ledger_entry` | 主线模块 |

## 8. 可观测与运维
- 每个请求带 `rid`，日志结构化；错误码分段统计；费用告警与并发上限。
- 降级开关（`ops`）：关聊天、停赶海入场、降排行刷新频率、关某活动入口。
- 备份：数据库每日自动备份 + 每月一次恢复演练（记录到 `06_validation/evidence`）。

## 9. 维度覆盖索引（每个维度去哪里找）
| 维度 | 设计位置 | 落地位置 |
|---|---|---|
| 需求 | `02_requirements/functional-analysis.md`、`01_product/mvp-scope.md` | `module-catalog.json` |
| 前端 | 本文第 4 节 | `client/assets/scripts/` |
| 后端 | 本文第 5 节、ADR-0003 | `server/src/` |
| 数据 | 本文 5.3、6.4；`03_solution/data/` | `server/db/migrations/`、`game-core/save/` |
| 交互（前后端） | 本文第 6 节 | `packages/contracts/` |
| 交互（玩家） | `03_solution/ui/`、立项评审 11.5 | `ui-kit/`、各 feature `view/` |
| 逻辑 | 本文 3.1、ADR-0002 | `packages/game-core/` |
| 组件 | `client/assets/scripts/ui-kit/README.md` | `ui-kit/` |
| 复用 | 本文第 3、7 节 | game-core / contracts / game-data / ui-kit |
| 拓展 | 本文第 7 节 | catalog + `tools/gen/catalog.mjs --scaffold` |
| 性能 | 本文 4.3–4.4、`performance-budget.md`、REQ-NF-0001 | 对象池、Bundle、构建期裁剪 |
| 配置 | 本文 3.3、ADR-0005 | `game-data/`、`tools/gen/config.mjs` |
| 知识库 | `00_governance/README.md`、`08_knowledge/` | AGENTS.md、术语表、对话记录、自动索引 |
| 响应 | 本文 6.2–6.3、REQ-NF-0002 | `services/net`、`server/src/gateway/` |
| 存储 | 本文 6.5、`save-schema.md` | `game-core/save/`、`services/save` |
| 资源 | 本文 4.4、`bundle-plan.md` | `client/assets/bundles/`、`art-source/` |
| 合规/安全 | 本文 6.4、`07_release/compliance/` | `compliance`、`account` 模块 |
| 运维/运营 | 本文第 8 节、`07_release/operations/` | `server/src/jobs/`、ops 模块 |

## 10. 官方依据（2026-10-23 核对）
- 微信分包限制：https://developers.weixin.qq.com/minigame/dev/guide/base-ability/subPackage/useSubPackage.html
- 微信本地缓存 10MB：https://developers.weixin.qq.com/minigame/dev/guide/base-ability/storage.html
- 抖音分包限制：https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/basic-function/subpackages/introduction
- Cocos Asset Bundle：https://docs.cocos.com/creator/3.8/manual/zh/asset/bundle.html
- Cocos 发布微信小游戏：https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-wechatgame.html
- Cocos 自定义构建模板：https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/custom-project-build-template.html
- Cocos 构建时常量 cc/env：https://docs.cocos.com/creator/3.8/manual/zh/scripting/modules/engine.html
- Cocos 项目结构与版本控制：https://docs.cocos.com/creator/3.8/manual/zh/getting-started/project-structure/index.html
