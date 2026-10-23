---
id: GOV-0003
title: 增删改查变更作业单
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 增删改查变更作业单

## 1. 先判定变更类型（一次只做一类，混在一起最容易出事）

| 类型 | 判定 | 唯一改动点 | 自动联动 | 必跑 |
|---|---|---|---|---|
| A 数值 | 只是数字/概率/文案 ID 变了 | `game-data/source/*.csv` | gen → 客户端 JSON、服务端 JSON、configVersion | `npm run verify` |
| B 规则 | 计算方式变了（浮力、判定、掉落、结算） | `packages/game-core/src/<m>/` | sync → client generated | determinism 测试 |
| C 接口 | 前后端交换的字段/动作变了 | `packages/contracts/src/<m>/` | 两端类型报错即落点 | contract 测试 |
| D 本地存档结构 | 存档里多/少/改字段 | `game-core/src/save/schema.ts` + 迁移函数 | 迁移链 | 旧档迁移测试 |
| E 数据库结构 | 服务端表结构变了 | `server/db/migrations/NNNN_*.sql`（只新增，不改旧） | — | 迁移在测试库执行 |
| F 表现/资源 | 场景、预制体、图片、音频、UI | `client/assets/**`（在 Cocos 编辑器里操作） | — | 包体检查 + 真机看一眼 |
| G 模块级 | 新增/删除/改名一个模块 | `module-catalog.json` 先改 | guard 校验目录与清单一致 | `npm run verify` |

> 判定原则：**数值走配置流程，规则走代码流程，持久化结构走迁移流程。**

## 2. 七个标准作业单

### A. 调数值（最高频）
1. 改 `game-data/source/<表>.csv`。
2. `npm run gen:config`（校验主键/外键/概率合计/区间/解锁无环，失败直接报行号）。
3. 本地跑一局验证；提交信息写 `balance: <表>.<字段> 旧值→新值`。
4. 上线：发布 `config_release`（服务端记录 configVersion），客户端下次启动拉取数值热更包。进行中的赶海场次仍用开场时锁定的版本。

### B. 改规则
1. `npm run impact <关键词>` 看影响面。
2. 改 `packages/game-core/src/<m>/`，补 `tests/determinism` 用例（同种子同输入必须同输出）。
3. `npm run sync`；客户端、服务端各自编译。
4. 若改变已存档数据的含义 → 同时走 D。

### C. 新增/修改接口
1. 需求编号（REQ-F）先有。
2. `packages/contracts/src/<m>/index.ts` 增加动作与类型，并在 `common/actions.ts` 登记动作名。
3. 服务端 `server/src/modules/<m>/handlers.ts` 实现；网关的动作表用 `satisfies Record<ActionName, Handler>`，**漏实现就编译失败**。
4. 客户端 `features/<m>/model/` 通过 `services/net` 调用。
5. 写操作必须带 `rid`；服务端在 `idempotency` 表去重。
6. 改字段时：新增字段可选 → 两端发布 → 下一版本再改为必填；删除字段先在服务端停止使用，再从契约移除（两步走，兼容旧客户端）。

### D. 本地存档结构变更（最高风险）
1. `SAVE_SCHEMA_VERSION` +1。
2. 在 `save/migrations.ts` 增加 `vN → vN+1` 纯函数（不删旧字段，先标 deprecated，保留两个版本）。
3. 用 `tests/determinism/fixtures/saves/` 里的真实旧档跑迁移测试。
4. 旧客户端读到新版本存档：提示更新，**绝不覆盖**。

### E. 数据库结构变更
1. 新建 `server/db/migrations/NNNN_描述.sql`，编号递增；**已执行过的迁移文件永不修改**。
2. 加列先给默认值；删列分两步（先停用、下个版本再删）；大表加索引用并发方式。
3. 生产执行前：备份 → 测试库演练 → 记录到 `07_release/release-records/`。

### F. 改表现/资源
1. 在 Cocos 编辑器内新建/移动/重命名（保持 `.meta` uuid）；源文件放 `art-source/`。
2. 新资源登记 `art-source/licenses.csv`。
3. 放进正确 Bundle；共享资源放高优先级 Bundle（b-common）；不要把图集直接塞进 Bundle 目录。
4. 构建后看包体（`bundle-plan.md` 预算）。

### G. 新增 / 删除 / 改名模块
**新增**：
1. `module-catalog.json` 登记（id、phase、client/core/server/contracts、bundle、authority、tables、save）。
2. `npm run gen:catalog` → 生成 `module-catalog.md`，并按模板创建 `features/<id>/`、`game-core/src/<id>/`、`contracts/src/<id>/`、`server/src/modules/<id>/` 骨架（只建 catalog 中为 true 的）。
3. 写 `docs/01_product/game-design/<id>.md`（或在 v5.5 中定位章节），挂 REQ-F。
4. `npm run guard`。

**删除**（先断引用，后删实现）：
1. 相关 REQ 标 `cancelled` 并移入 `docs/09_archive/cancelled/`（正文保留）。
2. 删 UI 入口与路由 → 删 contracts 动作（服务端先停用一个版本）→ 删 server 模块 → 删 game-core 规则 → 删数值表。
3. 存档字段不删，标 deprecated；数据库列按 E 两步走。
4. catalog 中移除或改 `phase:"removed"`；`npm run verify`（guard 会报残留引用和孤儿目录）。

**改名**：等同“新增新 id + 迁移 + 删除旧 id”，不要原地 sed。

## 3. 查（新增查询/列表/统计）
- 服务端：只读查询放 `service` 的 `query*` 函数，**先建索引再上线**（迁移里加）；排行等重查询读快照表。
- 客户端：查询结果进模块 store，带 TTL 缓存；列表虚拟化。
- 契约加分页：`{ cursor?, limit }` → `{ items, next? }`（游标分页，不用 offset）。

## 4. 变更联动表（改了左边，必须检查右边）

| 改动 | 必须同步 |
|---|---|
| 数值表结构（加列/改类型） | `game-data/schemas/*.schema.json`、`game-core` 读取代码、`docs/03_solution/data/config-tables.md` |
| 契约 | 服务端 handler、客户端调用、`docs/03_solution/data/api-catalog.md`（由 actions.ts 生成） |
| 存档结构 | 迁移函数、迁移测试、`docs/03_solution/data/save-schema.md` |
| 数据库 | 迁移、备份记录、`docs/03_solution/data/db-schema.md` |
| Bundle 内容 | `docs/03_solution/architecture/bundle-plan.md` |
| 平台适配 | `docs/03_solution/architecture/platform-adapter.md`、提审清单 |
| 模块增删 | `module-catalog.json` → 生成物；`project-map.md` |
| 推翻已定设计 | 必须先有用户确认；记入 `docs/01_product/design-source/设计要点记录.md`（带时间）+ ADR 标 superseded |

## 5. 变更规模与文档量

| 规模 | 例子 | 需要 |
|---|---|---|
| S | 文案、间距、单个数值 | 改 + verify + 提交信息 |
| M | 新配方类、拆除地块、背包筛选 | REQ/TASK + 影响分析 + 测试 + 证据 |
| L | 新模块、存档格式、服务器权威规则、新平台 | REQ + SOL + ADR + 迁移/兼容 + 完整测试 + 发布与回滚方案 |
