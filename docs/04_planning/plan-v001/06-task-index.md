---
id: PLAN-V001-06
title: 任务索引（Work Package → Atomic Task → Execution Step）
status: draft
owner: hark
created: 2026-10-23
review: 2026-10-30
---

# 06 任务索引

> 三级结构：**WP（Work Package，交付什么）→ AT（Atomic Task，最小可独立验证单元）→ ES（Execution Step，怎么做）**。
> 本文件登记全部 WP/AT 与必填字段；**ES 写在 `docs/05_execution/tasks/TASK-*.md` 任务卡里**。
> 任务卡生成规则：**未解除 BLOCKING 的 AT 不生成任务卡**（执行者拿到也无法完成，会造成猜测）。已生成卡片的 AT 在"卡片"列标出。

## 编号规则

- WP：`WP-xx`
- AT：`AT-<WP两位><序号两位>`，如 `AT-0103`
- 卡片文件：`docs/05_execution/tasks/TASK-<AT号>.md`
- 证据目录：`docs/06_validation/evidence/EVD-<AT号>/`

## WP 总览

| WP | 名称 | 切片 | 归属 Agent | AT 数 | 可开工 |
|---|---|---|---|---|---|
| WP-01 | 工程与步行骨架 | S0+S1 | Client/Core/Server/Data | 8 | 是（部分需人工） |
| WP-02 | 出钩手感 | S2 | **Core（我）** | 4 | 是 |
| WP-03 | 捞—装—重 | S3 | Core + Client | 3 | **否**（N-1/N-3） |
| WP-04 | 做—解锁 | S4 | Core + Data | 3 | **否**（N-4） |
| WP-05 | 存档与同步加固 | S5 | Core + Server | 3 | 是（S1 后） |
| WP-06 | 经济闭环 | S6 | Server + Data | 2 | **否**（D-02） |
| WP-07 | 开锁 | S7 | Core + Client | 2 | 是（S1 后） |
| WP-08 | 赶海场次 | S8 | Server + Core | 3 | **否**（U-05/D-03；~~U-03~~ 已于 11:18 关闭） |
| WP-09 | 排行榜 | S9 | Server + Client | 3 | **否**（U-04；~~U-03~~ 已关闭；压测需部署环境） |
| WP-10 | 上线包体与合规 | S10 | Client + Guard | 4 | 部分（U-10/U-11） |
| WP-11 | 岛屿+塔防+回放 | S11 | Core + Client | 2 | **否**（N-5/N-8/U-02） |
| WP-12 | 深海+沉船 | S12 | Core + Client | 1 | **否**（N-7） |
| WP-13 | 社交+称号 | S13 | Server + Client | 1 | **否**（U-07；~~U-01~~ 已于 11:18 关闭，称号回 v1.0） |
| WP-14 | 管理端最小能力 | S14 | Server + Data | 1 | **否**（U-06） |
| WP-15 | 数值转录与补全 | 贯穿 | Data | 3 | 部分（N-1/N-3/N-4 阻塞） |
| WP-16 | 守卫与测试补强 | 贯穿 | Guard | 2 | 是 |
| WP-17 | 文档返工 | 贯穿 | 我 | 2 | 是 |

合计 **47 个 AT**（可开工 19 个；U-01/U-03 关闭后无新增可开工项，因 AT-0802/0803/1301 各仍被另一项阻塞）。

## WP-01 工程与步行骨架（S0+S1）

| AT | 名称 | 来源需求 | 输入 | 输出路径 | 验收标准 | 验证命令 | 档位 | 规模 | 卡片 | 阻塞 |
|---|---|---|---|---|---|---|---|---|---|---|
| AT-0101 | Cocos 工程初始化【人工】 | MUST-17、C11 | Cocos Creator 3.8 | `client/settings/`、`client/assets/**/*.meta`、`client/assets/scenes/Boot.scene` | 编辑器可预览空白场景；`.meta` 数 >0 | `(gci -Recurse client -Filter *.meta).Count` | — | 0.5d | TASK-0101 | 无（需用户操作） |
| AT-0102 | Bundle 目录与配置【人工】 | MUST-17、ADR-0006 | AT-0101 | `client/assets/bundles/{b-common,b-shallow,b-deep,b-island,b-defense,b-event,b-social}/` | 7 个 Bundle 在检查器里显示"配置为 Bundle" | 编辑器截图 → EVD-0102 | — | 0.3d | TASK-0101 | 无 |
| AT-0103 | 契约类型补缺（G-06/G-07 + `compliance.check` 命名核对） | 03 契约 G-06/G-07 | `packages/contracts/src/**` | 同左 | `tsc` 通过；`npm run guard` 通过 | `npm run verify` | sonnect | 0.3d | TASK-0103 | 无 |
| AT-0104 | 服务端鉴权与 `account.login` | MUST-08 | `contracts/account`、`identity` 表 | `server/src/gateway/auth.ts`、`server/src/modules/account/**` | 登录返回 token；无 token 调 `save.pull` 返回 2001 | `node --test tests/integration/auth.test.mjs` | opus | 1d | TASK-0104 | 无 |
| AT-0105 | `compliance.check` + `config.manifest` 真实实现 | MUST-10、MUST-16 | `config_release` 表、`configVersion` | `server/src/modules/{compliance,config}/**` | 返回真实 `configVersion`；版本不符返回 9001 | 同上 | sonnect | 0.5d | TASK-0105 | 无 |
| AT-0106 | 本地存档读写与校验 | MUST-05 | `game-core/save/schema.ts` | `client/assets/scripts/services/save/**` | 杀进程后恢复；篡改 1 位判损坏 | `node --test tests/integration/save-local.test.mjs` | **opus** | 1d | TASK-0106 | 无 |
| AT-0107 | `save.push` / `save.pull` 真实落库 | MUST-05、MUST-07 | `0001_init.sql` 执行完成 | `server/src/modules/save/**` | 写入 `save_snapshot`；重复 rid 返回首次结果 | `node --test tests/integration/save-cloud.test.mjs` | **opus** | 1d | TASK-0107 | 无（需本地 PG） |
| AT-0108 | Boot 场景 + 统一 RPC 客户端 + 错误 toast | MUST-06、03 3.4.2 | AT-0101/0104 | `client/assets/scripts/app/BootController.ts`、`services/net/**` | 6 步演示脚本走通；错误码有中文文案 | 手工录屏 → EVD-0108 | sonnect | 1d | TASK-0108 | 无 |

## WP-02 出钩手感（S2，C1 闸门）

| AT | 名称 | 来源需求 | 输入 | 输出路径 | 验收标准 | 验证命令 | 档位 | 规模 | 卡片 |
|---|---|---|---|---|---|---|---|---|---|
| AT-0201 | `game-core/hook` 蓄力与轨迹规则 | MUST-01 | v5.5 4.3（1.2s 往返） | `packages/game-core/src/hook/**` | 同输入同输出；无 `Math.random`/`Date.now` | `node --test tests/determinism/hook.test.mjs` | **opus** | 1d | TASK-0201 |
| AT-0202 | `HookView` 表现层（力度条/飞行/回手） | MUST-01 | AT-0201、`b-shallow` | `client/assets/scripts/features/hook/view/**` | 长按蓄力、松手发射、可视反馈 | 手工 + 埋点 | **opus** | 1d | TASK-0202 |
| AT-0203 | 命中判定与拾取接线 | MUST-01、MUST-03 | AT-0201/0202、AT-0106 | `features/hook/model/**` | 命中后物品入包并存档 | 集成测试 | opus | 0.5d | TASK-0203 |
| AT-0204 | 手感指标首测 | 09 指标 | AT-0202、埋点 | `docs/06_validation/evidence/EVD-0204/` | 首钩命中率、前 10 钩成功率、耗时三项有数 | 手工 30 钩 + 埋点导出 | sonnect | 0.5d | TASK-0204 |

## WP-03 捞—装—重（S3）**BLOCKED**

| AT | 名称 | 阻塞 | 卡片 |
|---|---|---|---|
| AT-0301 | 背包数据模型与容量 | **N-1**（重量/容量/堆叠无数值） | 未生成 |
| AT-0302 | 超重/超容拒绝与提示 | **N-1** | 未生成 |
| AT-0303 | 浮力实时校验接入 UI | **N-3**（浮力/重量无值） | 未生成 |

## WP-04 做—解锁（S4）**部分 BLOCKED**

| AT | 名称 | 阻塞 | 卡片 |
|---|---|---|---|
| AT-0401 | 配方表结构与合成规则 | 无（配方可从材料表搬） | 可生成（S3 后） |
| AT-0402 | 自动合成（缺中间材料） | AT-0401 | 未生成 |
| AT-0403 | 等级经验与解锁判定 | **N-4**（经验曲线无数值） | 未生成 |

## WP-05 存档与同步加固（S5）

| AT | 名称 | 阻塞 | 卡片 |
|---|---|---|---|
| AT-0501 | 版本冲突与 `resolveFork` | 无 | 可生成（S1 后） |
| AT-0502 | 校验和不符的降级链路 | 无 | 可生成 |
| AT-0503 | 断网只读态（6 态之一） | 无 | 可生成 |

## WP-06 经济闭环（S6）**BLOCKED**

| AT | 名称 | 阻塞 |
|---|---|---|
| AT-0601 | 商人回收与区域浮动 | **N-10**（浮动规则细化） |
| AT-0602 | 每日配额（每人每天 1 把） | **D-02**（`daily_quota` 语义冲突） |

## WP-07 开锁（S7）

| AT | 名称 | 阻塞 |
|---|---|---|
| AT-0701 | 一局开锁状态机（连中/失败不重置/工具消耗） | 无（`chest` 原子规则已有） |
| AT-0702 | 开锁 UI 与交互 | AT-0701 |

## WP-08 赶海（S8）**BLOCKED**

| AT | 名称 | 阻塞 |
|---|---|---|
| AT-0801 | 场次状态机与种子分发 | **D-03**（`event_session` 无 ops 字段） |
| AT-0802 | ops 复算计分 | **U-05**（出箱率适用面）；~~U-03~~ 已关闭（箱子本身计入） |
| AT-0803 | 21:05 结算与发奖 | **U-04**（奖励范围）；~~U-01~~ 已关闭（称号回 v1.0） |

## WP-09 排行榜（S9）**部分 BLOCKED**

| AT | 名称 | 阻塞 |
|---|---|---|
| AT-0901 | 总收益榜计算与快照 | 无（可生成，依赖 S6） |
| AT-0902 | 赶海分组榜 | **U-04** |
| AT-0903 | 排行榜压测（决定是否加 Redis） | **AT-0901 + 部署环境（U-10/U-11）**；卡片 TASK-0903（`proposed`），门槛见 ADR-0004【可调】 |

## WP-10 上线包体与合规（S10）

| AT | 名称 | 阻塞 |
|---|---|---|
| AT-1001 | 微信真机包构建与主包体积 | **U-10/U-11**（AppID/域名） |
| AT-1002 | 断网/切后台/杀进程三态真机验收 | 无（需 AT-1001） |
| AT-1003 | 防沉迷与实名状态接入 | **U-10** |
| AT-1004 | 概率公示内容生成（基于真实数值） | **N-1~N-10**（数值为空则公示为空） |

## WP-11 塔防（S11）**BLOCKED**

| AT | 名称 | 阻塞 |
|---|---|---|
| AT-1101 | 固定步长模拟 + 回放一致性验证（技术验证） | **N-8**（波次数值） |
| AT-1102 | 塔防完整实现 | **N-5/N-8/U-02** |

## WP-12 深海（S12）**BLOCKED** · WP-13 社交称号（S13）**BLOCKED** · WP-14 管理端（S14）**BLOCKED**

| AT | 名称 | 阻塞 |
|---|---|---|
| AT-1201 | 深海解锁 + 沉船 + 潜水员 | **N-7**（岛屿/海域参数） |
| AT-1301 | 预设短语聊天 + 称号展示 | **U-07**（聊天）；~~U-01~~ 已关闭（称号 v1.0 做，展示部分可先开工） |
| AT-1401 | 开新区 + 封号（脚本级） | **U-06**（载体）+ 需 `0002_regions.sql` |

## WP-15 数值转录（贯穿，Agent-Data）

| AT | 名称 | 可搬运范围 | 阻塞 |
|---|---|---|---|
| AT-1501 | `items` / `prices` / `recipes` / `locks` / `chests` 五张核心表填数 | **可从 `材料与工具总表` 十三/二/三/五/六/七/八/九/十章直接搬**（原价、回收、配方、设施） | `weight/capacity/stack/size` 缺（N-1/N-2） |
| AT-1502 | `drops`（箱子内容）填数 | 可从"十四、箱子内容"搬 | 内容物需从 items 挑选 |
| AT-1503 | 34 张占位表补列设计 | 部分可从文档推出 | **N-6** |

## WP-16 守卫与测试补强（Agent-Guard）

| AT | 名称 | 内容 | 档位 |
|---|---|---|---|
| AT-1601 | 契约测试自动生成 | 从 `ACTIONS` 自动生成每个动作的"未登录→2001 / 坏 payload→1001"用例，防止"全占位也全绿"（问题 C10） | opus |
| AT-1602 | 密钥扫描守卫 | 扫描仓库中的 PAT/密钥模式，作为第 10 项守卫 | sonnect |

> 这两项按用户要求**只登记、现在不做**（写成任务卡，不实施）。

## WP-17 文档返工（贯穿）

| AT | 名称 | 内容 | 阻塞 |
|---|---|---|---|
| AT-1701 | 修正 v5.5 11.4 与 mvp-scope 的周次矛盾 | C5/C7 | 无 |
| AT-1702 | 修正 `0001_init.sql` 过期注释 + `module-catalog` 的 `regions` 描述 | C1/C3 | 无 |

## 必填字段对照（所有 AT 均已具备）

| 字段 | 落点 |
|---|---|
| 归属切片 | 本文件 WP 标题 + 05 切片号 |
| 来源需求 | 本表"来源需求"列（MUST-xx / 03 缺口号） |
| 来源方案 | 表内"输入"列 + 05 切片说明 |
| 目标 | AT 名称 + 验收标准 |
| 输入（文档/契约/前置任务/前置状态） | "输入"列 |
| 输出路径 | "输出路径"列 |
| 执行步骤（ES） | 任务卡 `TASK-*.md` |
| 验收标准 | "验收标准"列 |
| 验证命令 | "验证命令"列 |
| 证据路径 | `docs/06_validation/evidence/EVD-<AT号>/` |
| 允许/禁止修改 | 见 08 所有权矩阵 |
| 依赖与阻塞 | "阻塞"列 |
| 建议档位及理由 | "档位"列（理由见 08） |
| 升级条件 | 见 08 第 4 节 |
| 预估规模 | "规模"列 |

## 判定

| 结论 | 状态 |
|---|---|
| 47 个 AT 全覆盖切片 S0–S14 | **已确认** |
| 19 个可开工、28 个被 BLOCKING 阻塞 | **存在缺陷**（需用户裁决 02 的 U 项；U-01/U-03 已于 10-23 11:18 关闭） |
| 任务卡已生成 12 张（含 TASK-0903 压测卡，`proposed`） | **部分确认** |
