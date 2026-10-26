---
id: PLAN-V002-03
title: 契约冻结包（六份，含唯一源与缺口）
status: active
owner: hark
created: 2026-10-26
---

# 03 契约冻结包

> **唯一源**：`packages/contracts/src/**`（TypeScript 类型 + `server/src/gateway/payload.ts` 的 zod schema）。客户端副本由 `npm run sync` 生成到 `client/assets/scripts/generated/`，**禁止手改**。本包描述"现状 + 缺口"，不新造第二源。

## ① API 契约（RPC 动作）

- 形态：单入口 `POST /v1/rpc`，封套 `RpcRequest{action,payload,rid?,meta}` → `RpcResponse{c,msg?,d?,t}`（`common/envelope.ts`）。
- 20 动作见 `common/actions.ts`，每项含 `auth`/`idempotent` 元数据。
- payload 校验：`server/src/gateway/payload.ts` 覆盖 **20/20**（E-07）。
- **缺口**：`chest` 无业务类型（`contracts/src/chest/index.ts` 仅 `MODULE_ID`）；`ops` 无契约目录。

## ② Errors 契约

- `common/errors.ts`：错误段 7 段（OK/CONTRACT/AUTH/RULE/SYSTEM/RISK/UPGRADE）+ **14 具体码**：1001/1002/2001/2002/2003/2101/3001/3002/3201/3202/4001/4999/5001/9001。
- 映射：`c!=0` 即业务失败，`msg` 给中文；HTTP 恒 200（封套内判）。
- **缺口**：无"每个失败路径 → 码"的完整对照表（`03_solution/data/api-catalog.md` 部分覆盖），需在实现 14 个 handler 时逐条登记。

## ③ Identity 契约

- 令牌：HMAC-SHA256 自签（`gateway/auth.ts`），claims=`{sub,region,plat}`；`issueToken` 签发、`verifyToken` 验签+过期、`refreshClaims` 只验签不验过期。
- 角色：当前**仅玩家**，无管理端角色（U-06：管理端=脚本+SQL）。
- **越权边界**：所有写动作 `auth:true` 走鉴权；`server` 不信任客户端分数/资源（AGENTS §2）。
- **缺口**：`identity`/`bind_ticket` 表存在但 `bindStart/bindConfirm` 未实现（合并流程未闭环）。

## ④ Resources 契约

- 当前**无文件上传/图片 URL 需求**（无 UGC）。头像/分享图走平台默认，不入库。
- **缺口**：无。维持"无"。

## ⑤ Events 契约（异步/幂等）

- 幂等：写动作带 `rid` → `idempotency` 表（`0001_init.sql:37`）首次结果复用。
- 幂等键：`action + rid`（`save/service.ts` 已用）。
- **缺口**：赶海 `ops` 载体缺失（D-03，`event_session` 无 ops 字段）→ 复算契约无法冻结。

## ⑥ UX States 契约（核心界面六态）

| 界面 | 空态 | 加载态 | 错误态 | 无权限 | 成功 | 现状 |
|---|---|---|---|---|---|---|
| Boot/启动 | — | "Boot 启动…" | "查询失败：msg" | — | 显示按钮 | 有（今日修复崩溃） |
| 出钩 | — | 蓄力条 | 脱钩提示 | — | 入包+存档 | **缺（HookView 空壳）** |
| 背包 | "背包为空" | — | 超重提示 | — | 物品网格 | **缺** |
| 合成 | "无可合成" | — | 缺料置灰 | 等级不足置灰 | 产物入包 | **缺** |
| 开锁 | — | — | 连中中断 | — | 开箱结算 | **缺** |
| 排行榜 | "暂无数据" | 拉取中 | 拉取失败 | — | 榜单 | **缺** |

## 契约自检（任一为否 → 契约不完备 → 不得并行）

| 检查 | 结果 | 说明 |
|---|---|---|
| 前端能否只凭契约写完整 API 层？ | **部分** | 20 动作类型齐，但 chest/ops 缺类型、UX 态未定义 |
| 后端能否只凭契约实现接口？ | **部分** | 14 个 todo 的 payload 有 schema，但业务字段/错误路径未逐一登记 |
| 数据端能否只凭契约建表？ | **是** | 13 表已建；缺 regions/ops 字段（D-03） |
| 错误码覆盖所有失败路径？ | **否** | 无逐路径对照表 |
| 管理端越权被明确禁止？ | **是** | 无管理端角色；写动作全鉴权 |

**结论**：契约**尚未完全冻结**——缺口集中在 ①（chest/ops 类型）、②（错误路径表）、⑤（赶海 ops）、⑥（UX 态）。因此**暂不允许"前端/后端/数据三线并行"**；本轮只允许"契约补缺（串行）→ 再并行"。
