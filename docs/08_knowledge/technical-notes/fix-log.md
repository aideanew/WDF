---
id: KB-0003
title: 修复记录索引（所有问题修复的唯一入口）
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
related: [KB-0002]
---

# 修复记录索引

> 规则：**发现问题就建一条记录，没有记录等于没修。**
> 单条记录放在 [`technical-notes/fixes/`](fixes/)，命名 `FIX-YYYYMMDD-NN-描述.md`；本文件只做索引与统计。
> 记录模板与六节要求见 [`fixes/README.md`](fixes/README.md)。

## 与既有文档的分工（避免重复记两遍）

| 文档 | 记什么 | 不记什么 |
|---|---|---|
| 本索引 + `fixes/FIX-*` | **一个问题从发现到验证的完整过程**（含报错原文、根因行号、放弃的方案） | 需求变更、设计决策 |
| `08_knowledge/lessons-learned.md` | 从修复里提炼出的**通用教训**（一句话） | 单次问题细节 |
| `06_validation/evidence/EVD-*/` | 任务验收证据（截图、录屏、测试输出） | 排查过程 |
| `03_solution/decisions/ADR-*` | 方案层面的分叉决策 | 实现 bug |
| `CHANGELOG.md` | 对外可见的变更一句话 | 细节 |

## 索引

| 编号 | 日期 | 类型 | 严重度 | 标题 | 状态 |
|---|---|---|---|---|---|
| [KB-FIX-20261023-01](fixes/FIX-20261023-01-generated-sync.md) | 2026-10-23 | bug | P0 | 同步脚本整目录删除导致 Cocos `.meta` 丢失与 `verify` 中断 | 已修复并验证 |
| [KB-FIX-20261023-02](fixes/FIX-20261023-02-root-whitelist.md) | 2026-10-23 | env | P0 | 根目录白名单缺 `.workbuddy` 导致 `verify` 报错 | 已修复并验证 |
| [KB-FIX-20261023-03](fixes/FIX-20261023-03-session-expired-semantics.md) | 2026-10-23 | bug | P1 | 坏 token 返回 2001 而非 2002，与冻结契约的鉴权错误码语义不一致 | 已修复并验证 |
| [KB-FIX-20261023-04](fixes/FIX-20261023-04-pglite-data-dir.md) | 2026-10-23 | env | P1 | PGlite 数据目录落在 `server/` 下，14 个空子目录打挂「无空目录」守卫 | 已修复并验证 |
| [KB-FIX-20261023-05](fixes/FIX-20261023-05-server-boundary-regex.md) | 2026-10-23 | env | P1 | 服务端依赖边界正则过宽，把 gateway/core 基础设施引用误判为跨模块违规 | 已修复并验证 |
| [KB-FIX-20261023-06](fixes/FIX-20261023-06-version-gate-deadlock.md) | 2026-10-23 | bug | P1 | 客户端版本闸把 `config.manifest` 自己也拦了，导致旧客户端永久无法更新 | 已修复并验证 |
| [KB-FIX-20261023-07](fixes/FIX-20261023-07-meta-read-method.md) | 2026-10-23 | doc | P2 | Bundle 配置核对方法错误（`require` 读 `.meta`）导致误判，并校正事实基线 | 已修复并验证 |
| [KB-FIX-20261023-08](fixes/FIX-20261023-08-bundle-config-location.md) | 2026-10-23 | doc | P1 | Bundle 压缩类型的配置位置写错（指向文件夹 Inspector），用户在真实界面上找不到选项 | 已修复并验证（操作闭环待用户在编辑器完成） |

## 统计

| 类型 | 数量 |
|---|---|
| bug | 3 |
| env（环境/工具链） | 3 |
| doc（文档与事实不一致） | 2 |
| perf | 0 |
| security | 0 |
| **合计** | **8** |
