---
id: OPS-RUNBOOK
title: 运维操作卡（开区 / 封号 / 回滚）
status: active
owner: hark
created: 2026-10-29
review: 2026-11-29
---

# 运维操作卡 · 开区 / 封号 / 回滚（TASK-1401）

> 本卡是给**运维（当前就是用户本人）**看的大白话操作手册，三条命令各一段。
> 所有命令都在仓库根目录跑，需要本地/线上 PostgreSQL 或 PGlite（`.local/pg`）。
> **区名由运营给定，不要自编**（D-53 约束③）。

## 一、怎么开一个新区

把老区之外再开一个区，并让**新注册玩家自动落在这个新开的区**。

```powershell
# 开一个叫「二服」的区，id 用 s2（区 id 和区名都由运营给定，别自己拍脑袋）
node --import ./tools/runtime/register.mjs server/src/modules/ops/open-region.mjs s2 二服
```

跑完会打印「✅ 已开新区 s2（二服），并置为当前开放区」。做的事：

1. 在 `regions` 表插入一行 `s2`，并把它的 `is_current` 置为 `true`；
2. **自动把原来那个「当前区」的 `is_current` 置回 `false`**（保证全表**至多一行**是当前区）；
3. 在 `audit_log` 里写一条 `actor=ops, action=open_region` 留痕。

**注意**：开新区**不会**搬老玩家——老玩家还留在老区（`player.region` 不变）。只有**之后新注册**的玩家会落到新区。

## 二、怎么封号

让某个玩家从某个时间点起登录不了（封到截止时间，到时自动解封）。

```powershell
# 封玩家 p_abc123 到 2026-12-31 24 点（UTC）。截止时间是 ISO 格式，别写错。
node --import ./tools/runtime/register.mjs server/src/modules/ops/ban-player.mjs p_abc123 2026-12-31T00:00:00.000Z
```

跑完打印「✅ 已封禁玩家 p_abc123 至 2026-12-31T00:00:00.000Z」。做的事：

1. 把 `player.banned_until` 设为这个时间；
2. 写一条 `audit_log(actor=ops, action=ban_player)` 留痕。

封号后，该玩家 `account.login` 会被拒，返回错误码 **2003 BANNED**，消息带截止时间，并额外写一条 `audit_log(actor=<平台>, action=login_banned)`。**玩家令牌不得调用任何管理动作**（本卡不新增管理接口）。

**注意**：玩家不存在时，命令会打印「❌ 玩家不存在」并以退出码 1 结束，**不会**写审计——避免误封了个不存在的号。

**实话三句（别把「封号」想成立刻踢下线，FIX-27 已修，但要清楚边界）**：

1. 封号对**已经在线的玩家**，不是立刻生效——他手上的旧令牌还能用，要等**下次 refresh 或重新登录**才会被拦。`account.refresh` 现在也会查 `banned_until`（被封 → 2003），所以「不停刷新令牌」这条路也被堵上了（FIX-27），**不会永远玩下去**。
2. 令牌默认有效期 **2 小时**（`WDF_TOKEN_TTL_MS` 可调）。也就是说，封号后最迟约 2 小时，被封玩家就会因令牌到期、刷新被拒而真正无法继续。
3. 如果运营要求「**立刻**踢下线」（不等这 2 小时），需要另做会话黑名单或调小 `WDF_TOKEN_TTL_MS`——**这事登记 v1.1，本卡不实现**，现在只保证「封号最终必然生效、且无法靠刷新规避」。

## 三、怎么回滚（解封 / 撤销开区）

### 解封（提前解禁）

把某玩家的 `banned_until` 清掉（改成 `NULL`），立刻能登录。没有专门 CLI，直接对库执行：

```powershell
# 解封：把 banned_until 清成 NULL
node --import ./tools/runtime/register.mjs -e "
import { initDb, closeDb, q } from './server/src/core/db.ts';
await initDb();
await q('UPDATE player SET banned_until = NULL WHERE id = \$1', ['p_abc123']);
await closeDb();
"
```

### 撤销开区（把当前区退回去）

开错区想回退：把当前区的 `is_current` 置回 `false`，另一个区置回 `true`。没有专门 CLI，直接对库执行（把 `s1` 换回你想当当前区的那个 id）：

```powershell
node --import ./tools/runtime/register.mjs -e "
import { initDb, closeDb, q } from './server/src/core/db.ts';
await initDb();
await q('UPDATE regions SET is_current = false WHERE is_current');       # 清掉现在的
await q(\"UPDATE regions SET is_current = true WHERE id = 's1'\");          # 把 s1 设回当前
await closeDb();
"
```

### 为什么回滚是「直接 SQL」而不是新命令

本卡**不做管理后台**（U-06 选 A）。开区/封号是高频且明确的动作，配了 CLI；回滚是低频、需要看清楚现状才动手的，所以给的是 SQL 操作，不给命令。**动之前先 `SELECT id, name, is_current FROM regions;` 看一眼现状**，别凭记忆改。
