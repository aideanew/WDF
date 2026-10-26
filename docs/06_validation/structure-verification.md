---
id: VAL-0003
title: 目录体系多维度验证记录
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 目录体系多维度验证记录（2026-10-23）

## 1. 自动化验证（实际运行结果）
| 验证 | 方法 | 结果 |
|---|---|---|
| 全链路 | `npm run verify`（gen → guard → test） | ✅ 46 张表 / 28 个模块 / 20 个动作 / 51 篇文档；9 项守卫全过；10 个测试全过 |
| 守卫有效性（变异测试） | 人为注入 8 类违规：feature 里写 wx.、game-core 用 Math.random、Bundle 命名 main、Bundle 里放脚本、手改生成文件、孤儿模块目录、根目录垃圾文件、跨模块访问内部文件 | ✅ 8/8 全部被拦截，复原后全绿 |
| 数值校验器有效性 | 坏夹具（主键重复/类型错/外键缺失/概率合计≠10000） | ✅ 4 类全部报错并给出行号；好夹具通过 |
| 类型检查 | TypeScript 5.8 编译 game-core、contracts、server（含 @types/node）、client 脚本（cc 用桩类型） | ✅ 0 错误 |
| 契约完整性 | 删掉一个服务端 handler | ✅ `satisfies Record<ActionName, Handler>` 编译失败 |
| 服务端冒烟 | 启动 server，调用 `/healthz`、未知动作、缺 rid 的写操作 | ✅ ok / 1002 / 1001 |
| 模块新增演练 | catalog 登记 → guard 报缺目录 → `--scaffold` → guard 报未导出 → 补导出 → 全绿 | ✅ 流程闭环 |
| 影响面查询 | `npm run impact raft_tiles` | ✅ 列出模块、数值、规则、客户端、文档命中 |

## 2. 维度核对表
| 维度 | 落点 | 状态 |
|---|---|---|
| 需求 | `02_requirements/functional-analysis.md`（23 个 v1 模块 + 5 个 v2 登记、12 条系统级需求、6 条暂存待澄清） | ✅ |
| 前端 | client 分层 view/model/core/services/platform；构建期选平台；脚本全进主包 | ✅ |
| 后端 | 模块化单体；gateway 统一鉴权/限流/版本/幂等；模块 handlers/service/repo | ✅（部署平台待确认） |
| 数据 | 信任边界表；PostgreSQL 初始迁移；存档 schema + 迁移链 | ✅（数据库选型待确认） |
| 交互 | `/v1/rpc` 封套、错误码分段、服务器时间、发件箱、分叉选择 | ✅ |
| 逻辑 | game-core 确定性规则，前后端共用；determinism 测试 | ✅ |
| 组件 | ui-kit 清单（PowerBar 等）；features 同构模板 | ✅ |
| 复用 | 一份规则/一份契约/一份数值；蓄力组件四处共用；结算页模板 | ✅ |
| 拓展 | 新内容只加配置与资源；新平台只加适配器；新模块按 catalog 生长；第二版只登记 | ✅ |
| 性能 | 主包预算、Bundle 优先级、对象池、固定步长、虚拟列表、构建期裁剪平台代码 | ✅（真机实测待做） |
| 配置 | CSV → 校验 → JSON/类型/configVersion；只热更数据；赛场锁版本 | ✅ |
| 知识库 | 00–09 文档层、术语表、FAQ、AGENTS.md、自动索引 | ✅ |
| 响应 | 100ms 操作反馈、P95<300ms 目标、超时与退避 | ✅（目标值） |
| 存储 | 本地主副两份 + 校验和，≤300KB（微信 10MB 上限）；云端快照 + 修订号 | ✅ |
| 资源 | Bundle 规划、art-source 与版权台账、只在编辑器内移动资源 | ✅ |
| 合规 | compliance 模块；断网不能继续游戏（提示后暂停）；概率公示自动生成 | ✅（文档草稿待写） |
| 安全 | 竞争数据只信服务器；rid 幂等；限流；密钥只在环境变量 | ✅ |
| 可观测/运维 | 结构化日志、降级开关、备份演练、定时任务幂等 | ✅（实现待做） |
| AI 协作 | AGENTS.md 归属速查与硬禁止；守卫把约定变成检查 | ✅ |
| 版本兼容 | 契约两步走、存档迁移、数据库两步删列、minClientVersion | ✅ |

## 3. 已知未覆盖（需要真实环境才能验证）
1. Cocos 编辑器打开工程、配置 Bundle、双平台构建与包体实测（ADR-0001 第 1 天）。
2. 服务端框架（Fastify）、数据库驱动、zod 的安装与接入（待部署平台确认）。
3. 真机性能、断网提示/切后台重连/杀进程、绑定分叉流程。

## 4. 2026-10-23 16:58 现状复核（S0 完成后的重新验证）

> 背景：plan-v001/01 的事实基线写于 10-23 上午（当时 `.meta` 为 0）。S0 完成后本节重新实测，**plan-v001 的"未初始化"结论已过期，以本节为准**。

| 检查项 | 命令 / 依据 | 实测结果 | 判定 |
|---|---|---|---|
| 引擎版本 | `client/package.json` | `creator.version = 3.8.8` | ✅ 已锁定补丁号 |
| 资源导入 | `find client -name '*.meta' \| wc -l` | **350** | ✅ 工程已被编辑器导入 |
| 场景 | `find client/assets -name '*.scene'` | `scenes/Boot.scene`（1 个） | ✅ |
| 预制体 | `find client -name '*.prefab'` | **0** | ⚠ 尚无预制体（S1 用代码建 UI） |
| 脚本 | `find client/assets/scripts -name '*.ts'` | 134（含 generated 42） | ✅ |
| Bundle 标记 | 7 个 `bundles/b-*.meta` 的 `userData` | 均有 `isBundle: true`；**无 `priority` / `compressionType`** | ⚠ 见 E-01 |
| Bundle 内容 | `ls bundles/b-*/` | 仅 `README.md`，无资源 | ⚠ 分包为空 |
| 微信构建 | `client/build/wechatgame/` | 存在，构建于 16:49 | ✅ |
| 主包体积 | `du -sh client/build/wechatgame` | **3.1MB**（`cocos-js` 2.5MB + `assets` 333KB） | ⚠ 距 4MB 余量 0.9MB |
| 分包 | `game.json` | **无 `subpackages` 字段** | ❌ 当前零分包 |
| AppID | `project.config.json` | `wxecb8cb5662e35e0f`（真 AppID） | ✅ |
| 服务端 handler | `server/src/gateway/handlers.ts` | **20/20 = `todo`**（返回 4999） | ❌ S1 链路断在服务端 |
| 数值表 | `npm run gen` | 46 张、0 行、`configVersion=16921d30a67a934f` | ❌ 无数值 |
| 全链路校验 | `npm run verify` | EXIT=0；9 项守卫 + 10 测试通过 | ✅（修复 KB-FIX-20261023-01 之后） |

### 4.1 本轮新增结论

1. **S0 达成**：`.meta`/场景/构建产物三件齐全，`TASK-0101` 标 `done` 属实。
2. **主包余量告急**：3.1MB / 4MB，引擎占 2.5MB。**官方明确"启用引擎插件后引擎代码仍算入首包包体"**（Cocos 文档 Q&A），所以"分离引擎"不能用来减主包；减包必须靠**功能裁剪 + 引擎原生代码分包 + 资源分包**。
3. **分包配置缺三项**：每个 Bundle 需补 `priority`（b-common=6，其余 3–5）与 `compressionType = 小游戏分包`，否则构建不产出 `subpackages`。
4. **`assets/app/` 为空**（仅 README），Boot 场景实际在 `assets/scenes/`。与 `project-structure-spec.md` 写的"`assets/app/` 放 boot/loading 场景"不一致 → 记为文档待裁决项，**不擅自改治理规范**。

## 5. 2026-10-23 18:00 现状复核（服务端 S1 四件打通后）

> 背景：本轮把技术选型落地（Fastify 5 + zod + PGlite + HMAC 令牌）并实现了 5 个真实 handler。**上一节表格里"服务端 handler 20/20 todo"、"10 测试"、"Bundle 未设 priority"三条已过期，以本节为准**；其余行（引擎/资源/场景/构建/主包/分包/AppID/数值表）本轮未变动，仍以第 4 节为准。

| 检查项 | 命令 / 依据 | 实测结果 | 判定 |
|---|---|---|---|
| 服务端 handler | `server/src/gateway/handlers.ts` | **5 个真实实现**（`account.login` / `compliance.check` / `config.manifest` / `save.pull` / `save.push`），**15 个仍 todo** | ⚠ 见 E-05 |
| 服务端框架 | `server/package.json` | `fastify ^5.12.7` / `zod ^4.6.7` / `@electric-sql/pglite ^0.5.11` | ✅ |
| 本地数据库 | `.local/pg/` | PGlite 0.5.11 = **PostgreSQL 18.6 on wasm3**；`0001_init.sql` 已执行（13 张表） | ✅ 零安装 |
| 数据库持久化 | 同 `PROBE_CODE` 重启前后对比 | `isNew` true → **false**（身份与存档跨进程保持） | ✅ |
| 服务端启动 | `npm run dev:server` | 监听 `127.0.0.1:5050`；`GET /healthz` → `{"ok":true}` | ✅ |
| 全链路探针 | `npm run probe` | **30 断言全绿**（可重复跑，非空存档下按 `base+1` 增量断言） | ✅ |
| 鉴权错误码 | `tests/integration/auth.test.mjs` | 缺令牌 `2001`；坏签名/过期 `2002` | ✅（修正见 KB-FIX-20261023-03） |
| 乐观锁与幂等 | 同上 | base 不匹配 → `accepted:false` + `conflict`（`c` 仍 0）；同 `rid` → revision 不递增 | ✅ |
| 版本闸 | 同上 | 未登记发布记录 → 不拦；登记 `min_client=v9.0.0` → `9001`；`config.manifest` 豁免 | ✅（见 KB-FIX-20261023-06） |
| 客户端联网开关 | `client/assets/scripts/services/net/RpcClient.ts` | **`FORCE_OFFLINE = true`**（仍走 mock） | ❌ 端到端断点，见 E-04 |
| Bundle 配置 | `npm run check:bundles` | 项目方案 `builder.json`：`configMode=overwrite`（Independent Config 已落盘）但微信行仍 `merge_dep`；7 个 Bundle 无压缩类型，仅 `b-common` 有 `priority=6` → **0/7 生效**，构建产物无 `subpackages` | ❌ 见 E-01。**位置已纠错**：v3.8 起在「项目设置 → Bundle Config」而非文件夹 Inspector（KB-FIX-20261023-08） |
| 数值表 | `npm run gen` | 46 张、**0 行**、`configVersion=16921d30a67a934f`（未变） | ❌ 无数值 |
| 全链路校验 | `npm run verify` | EXIT=0；**9 项守卫 + 17 测试**（10 原有 + 7 新增集成） | ✅ |

### 5.1 本轮新增结论

1. **S1 的服务端侧已闭环**：`TASK-0104/0105/0107` 全部 `done`，证据见 `evidence/EVD-0104|0105|0107/`。判定标准是"有真实 HTTP 输出"而不是"代码写完了"。
2. **本地开发完全不依赖外部环境**：不装 PostgreSQL、不接真机、不做备案，`npm run dev:server` 即可跑。PGlite 提供的是**真 PostgreSQL 18 方言**（jsonb / bigserial / timestamptz 全可用），所以本地写的 SQL 上生产不用改写。
3. **本轮 4 个坑全部留档**：鉴权错误码语义（03）、PGlite 数据目录（04）、守卫正则误报（05）、版本闸自锁（06）。都是"实现能跑但语义/工程不对"的类型，`verify` 抓不到，必须靠断言抓。
4. **`FORCE_OFFLINE` 现在是全项目唯一的功能断点**：服务端 30 条断言全绿，但只要这一行是 `true`，客户端就永远不会真的发请求。是否切换需用户拍板（E-04）。
5. **Bundle 配置的事实基线被推翻一次**：第 4 节写"7 个全未设 `priority`"，本轮用 `npm run check:bundles` 实测发现 **`b-common` 的 `priority=6` 已经落盘**（用户后来点过绿色 ✓）。教训是"界面没变"不等于"文件没变"，一切以读文件为准。同时把核对方式从 `require('.meta')`（会 `SyntaxError`）改成脚本读 JSON，见 KB-FIX-20261023-07。
