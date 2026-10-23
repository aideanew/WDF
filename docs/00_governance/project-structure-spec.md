---
id: GOV-0002
title: 工程目录与依赖规范
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 工程目录与依赖规范

## 1. 五条总原则
1. **按发布边界分包**（Asset Bundle 只装资源），**按业务边界分模块**（features / modules / game-core 同名），**按职责分层**（view / model / core / services / platform）。
2. **一种事实只有一个权威来源**：数值在 `game-data`，规则在 `game-core`，接口在 `contracts`，模块清单在 `module-catalog.json`，玩法设定在 v5.5 与设计要点记录。
3. **能生成的不手写**：配置 JSON、配置类型、客户端里的 game-core/contracts 副本、模块总览、文档索引。
4. **依赖只能单向**，并由 `npm run guard` 自动检查，不靠自觉。
5. **生命周期隔离**：源码 / 生成物 / 构建产物 / 临时物分开；临时物一律进 `.local/`。

## 2. 三份方案的裁决（取精华、弃糟粕）

| # | 争议点 | 方案1 | 方案2 | 方案3 | 裁决 | 理由（性能/拓展/官方依据） |
|---|---|---|---|---|---|---|
| 1 | 顶层命名 | apps/ packages/ game-data/ database/ infra/ | client/ server/ shared/ tools/ database/ | client/ server/ packages/ tools/ tests/ | **client/ server/ packages/ game-data/ tools/ tests/ docs/ art-source/** | Cocos 工程根必须是 `assets` 的父目录，`client/` 直观；方案1 的 `game-data/` 独立成顶层（数值是最高频变更，值得一等公民）；`art-source/` 依据 Cocos 官方“设计源文件放 assets 外” |
| 2 | 客户端脚本放哪 | assets/scripts/ 统一 | assets/_shared/scripts 统一 | 逻辑放 `bundles/main`，各分包放自己的 view 脚本 | **脚本全部在主包 `assets/scripts/`，Bundle 只放资源** | Cocos 官方：不同 Bundle 的脚本最好不要互相引用；微信不能远程加载脚本。方案3 把文件夹命名为 `main` 还会与内置 Bundle 重名 |
| 3 | 模块内部分层 | domain/application/presentation/data/types | components/systems | domain/application/index | **features/<m>/{model, view, index.ts} + 纯规则在 game-core/<m>** | 方案1 五层对一人项目太碎；方案2 规则混在组件里无法单测、无法给服务端复用；规则抽出后客户端只剩两层 |
| 4 | 前后端共享 | api-contracts（OpenAPI）+ config-schema | shared/contracts + types（TS 接口） | packages/contracts（zod） | **packages/contracts（TS 类型 + 服务端 zod 校验）+ packages/game-core（确定性规则）** | 三份都只共享“接口格式”；本项目离线主线 + 服务器复核 + 塔防回放，必须共享**规则**才能不漂移 |
| 5 | 共享代码怎么进 Cocos | 生成到 client generated/ | tsconfig paths | tsconfig paths | **`tools/sync` 复制到 `client/assets/scripts/generated/`** | Cocos 只编译 assets 内脚本，paths 指向工程外的源码在编辑器与构建中都不可靠 |
| 6 | 后端形态 | 模块化单体 | 腾讯云 SCF，每域一个云函数 + Redis | 微信云开发，单 api 云函数 | **模块化单体 HTTP 服务，容器部署（ADR-0003）** | 抖音必须调同一后端；单入口降低冷启动与维护；保留“以后按模块拆”的可能 |
| 7 | 传输形态 | REST 路径 | REST 路径 | 单入口 action | **`POST /v1/rpc` action 封套 + `/v1/batch`** | 一个合法域名、统一鉴权/幂等/版本；游戏操作是“命令”不是“资源” |
| 8 | 数据库 | 迁移目录 | Mongo + Redis | 云数据库 | **PostgreSQL + SQL 迁移；Redis 推迟（ADR-0004）** | 流水、幂等、赛季结算需要事务和唯一约束；`jsonb` 存档足够 |
| 9 | 数值表 | Excel→JSON | Excel→JSON + HotUpdateManager | Excel→JSON+TS | **CSV 源 → 校验 → 客户端/服务端 JSON + 类型 + configVersion；只热更数据** | CSV 可 diff 可审阅；热更新不得绕过提审（不热更代码） |
| 10 | 开放数据域 | — | 建 open-data-domain | — | **不建**（第二版有好友榜再加） | 已定的是省份/区服榜，服务端算，不需要关系链 |
| 11 | 客户端反作弊 | — | Checksum + 时间检测 + MemoryWatcher | — | **只保留存档校验和与服务器时间**；内存监控不做 | 客户端无法自证清白，信任边界在服务端 |
| 12 | 命令入口 | package.json | Makefile | npm scripts | **npm scripts + Node `.mjs` 工具** | 用户在 Windows 上开发，make 体验差 |
| 13 | 文档目录 | 00–09 生命周期 | 00–07 按主题（产品/UI/合规/技术/运营/证据/模板） | 00–09 + 触发式生长 | **00–09 生命周期为骨架，主题放在层内**：合规 → `07_release/compliance/`，UI → `03_solution/ui/`，模板 → `00_governance/templates/` | 生命周期骨架保证追溯链；方案2 的主题全面性吸收进层内 |
| 14 | 何时建目录 | 先骨架后填充 | 一次建全 | 触发式生长 | **骨架一次建好但每个目录必须有 README 说明用途；第二版模块只登记不建目录** | 空目录会腐烂；README 让目录“自解释” |
| 15 | 模块清单 | module-catalog.md 手写 | — | modules.manifest.json 生成 | **`module-catalog.json` 为唯一登记处，md 由它生成，守卫按它校验目录** | 改模块只改一处；目录与清单不一致直接报错 |
| 16 | Cocos 文件 | — | — | profiles 忽略 | **只提交 assets / extensions / settings / package.json / build-templates / tsconfig；.meta 必须提交** | Cocos 官方版本控制建议；资源移动必须在编辑器内完成 |

**纠正三份方案里过时或错误的点**：方案2“单个分包 ≤20MB、总包 30MB”混用了两个平台的口径（微信普通分包不限大小、总 30MB；抖音单分包 ≤20MB、总 20MB）；方案3“打捞每钩服务端复算、离线袭击三限”与已定设计冲突（主线可断网、离线袭击规则已定）；方案2 把好友排行做进开放数据域与已定的省份榜不符。

## 3. 完整目录树

```text
wodefa/
├── AGENTS.md  README.md  CHANGELOG.md  package.json  tsconfig.base.json
├── .gitignore .editorconfig .env.example
│
├── docs/                                  # 文档（00–09，见 docs/00_governance/README.md）
│   ├── 01_product/design-source/          # 设计原文（玩法权威，免 front matter）
│   ├── 07_release/{compliance,operations}/ # 合规资料、运营手册
│   ├── 08_knowledge/sources/              # 对话记录、原始需求、外部评审原文
│   └── 09_archive/superseded/design-history/
│
├── game-data/                             # 数值唯一权威
│   ├── source/*.csv                       # 每张表一个 CSV（第一行字段名）
│   ├── schemas/*.schema.json              # 字段类型、主键、外键、区间、枚举
│   └── out/                               # 生成物（不进 Git）
│
├── packages/
│   ├── contracts/src/
│   │   ├── common/{envelope,errors,actions}.ts
│   │   └── <module>/index.ts              # 该模块的请求/响应类型
│   └── game-core/src/
│       ├── common/{rng,fixed,result,time}.ts
│       ├── save/{schema,migrations}.ts
│       ├── generated/config-types.ts      # 生成物
│       └── <module>/index.ts              # 纯规则
│
├── client/                                # Cocos Creator 3.8 工程根
│   ├── package.json  tsconfig.json
│   ├── settings/ extensions/              # 进 Git
│   ├── build-templates/{wechatgame,bytedance-mini-game}/   # game.json 等平台模板（json 会与引擎模板融合）
│   └── assets/
│       ├── app/                           # 主包资源（非 Bundle）：boot/loading 场景、最小 UI 图集、位图数字字体
│       ├── resources/config/              # 随包默认数值 JSON（生成物）
│       ├── bundles/                       # 只放资源；每个子目录在编辑器里“配置为 Bundle”
│       │   ├── b-common/ b-shallow/ b-deep/ b-island/ b-defense/ b-event/ b-social/
│       └── scripts/                       # 全部脚本（主包）
│           ├── app/                       # 启动、生命周期、场景路由、依赖装配
│           ├── platform/                  # 适配器：contracts/ wechat/ douyin/ app/
│           ├── services/                  # save net config time bus pool audio log
│           ├── ui-kit/                    # 通用组件（零业务）
│           ├── features/<module>/{model,view}/ + index.ts
│           └── generated/                 # tools/sync 生成：game-core、contracts、config 类型（禁止手改）
│
├── server/
│   ├── src/
│   │   ├── main.ts  app.ts
│   │   ├── gateway/                       # rpc 路由、鉴权、限流、幂等、版本协商
│   │   ├── core/                          # db、errors、logger、config、clock、ids
│   │   ├── integrations/{wechat,douyin}/  # code2session、内容安全等平台服务端接口
│   │   ├── modules/<module>/{handlers,service,repo}.ts
│   │   └── jobs/                          # 定时任务（幂等）
│   ├── db/{migrations,seeds}/
│   ├── generated/                         # 服务端配置 JSON（生成物）
│   └── deploy/                            # Dockerfile、环境说明
│
├── tools/
│   ├── gen/{config,catalog,docs-index}.mjs
│   ├── sync/to-client.mjs
│   ├── guard/{run-all,boundaries,root-whitelist,catalog,bundles,generated,docs,impact}.mjs
│   └── setup.mjs
│
├── tests/{contract,determinism,e2e}/
└── art-source/                            # 美术源文件 + licenses.csv（版权台账）
```

## 4. 依赖规则（guard 自动检查）

```text
客户端：
  features/*/view   → features/*/model, ui-kit, services, generated
  features/*/model  → generated(game-core/contracts), services          （不碰 view、不碰 platform 实现）
  services          → platform/contracts, generated
  platform/<impl>   → platform/contracts                                 （唯一允许 wx. / tt. 的地方）
  features/A        ↛ features/B 的内部文件（只能 import B/index.ts）
  ui-kit            ↛ features
共享包：
  game-core         ↛ cc / 任何 IO / Math.random / Date.now
  contracts         ↛ game-core 以外的任何包（只放类型与常量）
服务端：
  gateway → modules/*/handlers → service → repo → core/db
  modules/A ↛ modules/B 的 repo（跨模块只调对方 service 的导出）
```

## 5. 命名
- 目录与文件：kebab-case；Cocos 组件类名 PascalCase 且与文件同名（`HookView.ts`）。
- 模块 ID 全局统一：catalog、features、game-core、contracts、server/modules、文档 front matter 的 `module` 字段使用同一个 id。
- 数值表名：snake_case 复数（`raft_tiles`）；字段 snake_case；ID 用字符串前缀（`item_wood_plank`）。
- Bundle：`b-` 前缀，避免与内置 Bundle 重名。
- 错误码：按段；动作名 `<module>.<verb>`（如 `event.start`）。

## 6. 根目录白名单
文件：`AGENTS.md README.md CHANGELOG.md package.json package-lock.json tsconfig.base.json .gitignore .editorconfig .env.example`
目录：`docs game-data packages client server tools tests art-source .local .git .github node_modules`
其余一律被 `guard:root` 拒绝。
