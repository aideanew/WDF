---
id: ADR-0010
title: 技术选型复核——对三份外部结构提案的辩证结论
status: accepted
owner: hark
created: 2026-10-23
review: 2026-11-23
related: [ADR-0003, ADR-0004, ADR-0009]
---

# ADR-0010 技术选型复核——对三份外部结构提案的辩证结论

## 背景

用户提供了三份外部 AI 生成的结构/选型提案，要求**依次阅读、辩证分析**，并对照仓库现状裁决：

| 文件 | 主张要点 |
|---|---|
| `1.txt` | `apps/{game-client,api,ops-admin}` + `database/` + `scripts/` + `infra/`；后端每模块 DDD 五层（domain/application/presentation/data/types）；OpenAPI 单一真源；按修改规模 S/M/L 裁剪流程；警惕过度设计 |
| `2.txt` | `client/_bundles` 分包治理；后端**腾讯云 SCF 云函数 + MongoDB**（Serverless）；`shared/contracts` 前后端共享；Makefile；开放数据域（好友排行榜）；`make check-bundle` 包体守卫 |
| `3.txt` | `client/`（Cocos 工程根）+ `server/`（云开发）+ `packages/contracts`（**zod 为唯一真源**）+ `tools/{gen,guard}` + docs 00–09 + front matter `module` 字段 + 影响面清单 + 六类变更 SOP |

**先说一个事实**：仓库现状与 `3.txt` 的骨架高度一致（client/server/packages/tools/tests、docs 00–09、`tools/guard/*`、自动生成的 document-index/task-index、front matter 校验、`npm run impact`、module-catalog）——因为它的设计在立项阶段已被采纳并落地。本次复核的对象是**三份提案里尚未落地或与现状冲突的部分**。

## 逐项辩证

### 1. 后端形态：云函数（2.txt/3.txt）vs Fastify 单体（现状 ADR-0003/0004）

**云函数的钢人论证（最强理由）**：零运维、按量付费（DAU 低时月费几十元）、openid 直取不用自己维护鉴权、突发流量免扩容。对单人开发者，"不用管服务器"是真实的生产力。

**HTTP 单体的钢人论证（最强理由）**：
1. **抖音端是硬约束**：抖音小游戏不能调微信云开发 → 无论选什么，都必须有一套平台无关的 **HTTP API**。云函数形态反而要做双份接入。
2. **本地优先是用户明令**（"先本地开发，不用真机和各种认证备案"）：PGlite 让本地/CI 零依赖跑真 PostgreSQL 方言；云函数本地调试必须挂开发者工具，链路长、断点难。
3. **本项目第一波服务端动作是强一致的**：云存档乐观锁、幂等表、后续经济流水/账本，在 SQL 里是一行约束的事，在文档库里要靠应用层自己保证。
4. **部署形态可后置**：同一份 Fastify 代码可以原样进微信云托管（容器）或自建，HTTP 入口不变；云函数形态一旦写死，迁移是重写。

**裁决：维持 Fastify 5 + PGlite（ADR-0003/0004 不变）**，但吸收两点：① 部署目标明确为"**微信云托管容器**优先、自建兜底"，写入 07_release 的发布预案；② 平台隔离已由 `WDF_AUTH_MODE` + `modules/platform` 占位承担，真机阶段接 code2session 时不改网关。

### 2. 契约真源：zod 单一真源（3.txt）vs 类型为真源 + 服务端 zod 分批（现状 ADR-0009）

**zod 真源的钢人论证**：一份 schema 三用（TS 类型 / 运行时校验 / 文档），改字段只动一处，两端编译期报错。
**现状的钢人论证**：`packages/contracts` 会被 Cocos 客户端引用，**纯度守卫**禁止它携带运行时依赖；zod 进 contracts = 客户端包体增加 + 纯度规则作废。且 20 个动作一次性改 schema 会大范围回归。

**裁决：维持现状**（类型为真源，服务端 `gateway/payload.ts` 分批补 zod），但补一条硬要求（新增 **E-07**）：payload schema 必须**覆盖全部 20 个动作**，并加契约测试遍历 `ACTIONS` 断言"每个 action 有 schema 或在显式豁免清单"。zod 与 TS 类型之间的漂移靠这条测试兜住，而不是靠自觉。

### 3. 模块内部分层粒度：DDD 五层（1.txt）/ 四件套（3.txt）vs features/{model,view,index}（现状）

**五层的钢人论证**：职责最清晰，复杂模块（经济/塔防）值得。
**现状的钢人论证**：1.txt 自己也警告"简单功能不必硬凑五层"；单人 + AI 协作下，层越多 AI 越容易把文件放错层，守卫要管的规则数翻倍。

**裁决：维持 `features/<mod>/{model,view,index}`**（守卫已有 model 不依赖 view、跨模块只走 index 的规则）。若某个模块（如 defense 战斗复算）复杂到 model 内部混乱，**在模块内部**再加 `domain/`，不全局改结构。

### 4. 包体治理与平台隔离（2.txt 的核心贡献）——已落地，确认采纳

`wx.*/tt.*` 只准出现在 `platform/<impl>/`（守卫已实现且通过）；数值唯一真源走 `game-data → npm run gen`（含坏数据测试）；存档迁移在 `game-core/save`（已有单测）；包体守卫对应 `check:bundles` + 构建产物 `game.json` 校验。**全部采纳，无需变更。**

### 5. 两个暂不采纳、必须留痕的点

| 提案 | 不采纳理由 | 留痕去向 |
|---|---|---|
| 开放数据域（好友排行榜，2.txt） | MVP 榜单用服务端 `leaderboard.*`（区服榜）。微信好友榜**只能**走开放数据域（独立 JS 沙箱、非 Cocos），是独立工作量 | 记入 `02_requirements/backlog`，触发条件：产品确认要好友榜（v1.1 候选） |
| Makefile（2.txt） | 本机无 make（Git/PortableGit 均无，已实测），Windows 下 npm scripts 等价且可调试 | 教训已在 lessons-learned，不再重复 |

## 结论

1. **技术选型不改**：Fastify 5 + zod + PGlite + HMAC 令牌（ADR-0003/0004/0009 维持有效），本 ADR 记录的是"为什么外部提案的云函数方案不替换它"。
2. **吸收四条**：部署预案指向云托管容器；E-07（payload schema 全覆盖 + 契约测试）；模块内局部加层的原则；开放数据域入 backlog。
3. **三份提案与现状的最大公约数**是"单一真源 + 依赖方向 + 自动守卫"，仓库已具备；后续差的是**数据（46 表 0 行）与动作（15 个 todo）**，不是结构。

## 影响与遗留

- `current-plan.md` 阻塞清单新增 **E-07**（payload 全覆盖）。
- `02_requirements/backlog.md` 若存在则登记开放数据域条目；不存在则在 plan-v001/06 的待定清单补一行。
- 复核触发条件：接入抖音端联调、或日活进入付费区间时，重开"部署形态"一节。
