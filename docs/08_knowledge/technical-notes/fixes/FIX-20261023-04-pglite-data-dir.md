---
id: KB-FIX-20261023-04
title: PGlite 数据目录落在 server/ 下，14 个空子目录打挂「无空目录」守卫
status: active
date: 2026-10-23
kind: env
severity: P1
module: cross
owner: hark
related: [KB-FIX-20261023-02, ADR-0004]
---

# PGlite 数据目录落在 `server/` 下，打挂「无空目录」守卫

## 1. 现象

接入 PGlite（本地零安装 PostgreSQL）后，`npm run verify` 变红：

```text
$ npm run verify
✅ 根目录白名单
...
✅ 文档 front matter
❌ 无空目录（14）
   - 空目录：server/.data/pg/pg_commit_ts
   - 空目录：server/.data/pg/pg_dynshmem
   - 空目录：server/.data/pg/pg_logical/mappings
   - 空目录：server/.data/pg/pg_logical/snapshots
   - 空目录：server/.data/pg/pg_notify
   - 空目录：server/.data/pg/pg_replslot
   - 空目录：server/.data/pg/pg_serial
   - 空目录：server/.data/pg/pg_snapshots
   - 空目录：server/.data/pg/pg_stat
   - 空目录：server/.data/pg/pg_stat_tmp
   - 空目录：server/.data/pg/pg_tblspc
   - 空目录：server/.data/pg/pg_twophase
   - 空目录：server/.data/pg/pg_wal/archive_status
   - 空目录：server/.data/pg/pg_wal/summaries
守卫未通过：18 处（含跨模块 4 处，见 KB-FIX-20261023-05）
EXIT=1
```

## 2. 影响

- `verify` 是提交前唯一硬闸门，**只要本地起过一次服务端就红**，等于把"跑一次服务端"变成"必须手工删数据再提交"。
- 更隐蔽的坑：这些目录是 PostgreSQL 数据目录结构（`pg_wal`、`pg_replslot`…），**手工删/补文件会直接损坏本地库**，不能靠"往空目录里塞 README"糊过去。
- 如果当时把 `server/.data/` 提交进 Git，会把几百 MB 的 WASM 数据库文件带进版本库。

## 3. 根因

两件事叠加：

1. `server/src/core/db.ts` 把数据目录默认值设成了 `join(SERVER_ROOT, '.data', 'pg')` —— 我第一次落 PGlite 时随手放在 `server/` 下（直觉上"服务端的数据归服务端"）。
2. `tools/guard/checks.mjs` 的 `everyDirExplained()` 递归扫描全仓，只跳过 `['node_modules','.git','.local','.creator','library','temp','local','build','profiles','default-profiles']`。`.data` 不在其中，于是 PGlite 建的 14 个空目录被逐个报出来。

`.gitignore` 里也没有 `.data`（根目录白名单同样没有它），所以这是个**三不管目录**：不在白名单、不在忽略、不在扫描豁免。

## 4. 修复

把数据目录挪进仓库本来就有的 `.local/`：

```ts
// server/src/core/db.ts
// 数据目录放仓库根的 `.local/`：已在 .gitignore 里，也不会污染 workspace 目录树
// （PGlite 会建一堆空子目录，落在 server/ 下会触发 guard 的「无空目录」规则）。
const DEFAULT_DATA_DIR = join(SERVER_ROOT, '..', '.local', 'pg');
```

`.local/` 同时满足三件事：已在 `.gitignore`（`\.local/`）、已在根目录白名单、已被 `everyDirExplained` 跳过。**一个改动同时满足三个约束，且不新增任何规则例外**。

**放弃的方案**：
- 给 `everyDirExplained` 的豁免列表加 `'.data'` —— 否决。这等于为"某个模块想放私有数据"开一个通用口子，以后每个模块都会建自己的 `.data`，守卫形同虚设。
- 往 14 个空目录塞 `.gitkeep` —— 否决。污染 PostgreSQL 数据目录结构，且每次重建库都要重塞。
- 用 `:memory:` 替代落盘 —— 否决。落盘持久化是刚需：要能验证"重启服务端后身份还在"（已实测 `isNew` 从 true 变 false）。

## 5. 验证

```text
$ rm -rf server/.data && npm run verify
✅ 根目录白名单
✅ game-core/contracts 纯度
✅ 客户端依赖边界
✅ 服务端依赖边界
✅ 模块清单与目录一致
✅ Asset Bundle 规则
✅ 生成物未手改且已同步
✅ 文档 front matter
✅ 无空目录
ℹ tests 17  pass 17  fail 0
EXIT=0
```

持久化亲测（同一 `PROBE_CODE` 跑两次，中间重启进程）：

```text
$ PROBE_CODE=persist-check node tools/dev/probe-s1.mjs
  ℹ️  固定 code=persist-check，isNew=true（首次跑应为 true）
$ # 重启服务端
$ PROBE_CODE=persist-check node tools/dev/probe-s1.mjs
  ℹ️  固定 code=persist-check，isNew=false（重启后应保持旧号）
```

数据实际落点：`.local/pg/`（PGlite 目录存在且被 Git 忽略）。判定 **PASS**。

## 6. 回归与遗留

- **规则**：任何"会在仓库里自动生成文件树"的工具（数据库、缓存、模拟器、IDE 索引）**都必须把根目录设在 `.local/` 下**，不要放在模块目录里。模块目录里只放源码与迁移脚本。
- `WDF_DB_DIR` 仍可用环境变量覆盖（测试用 `:memory:`），覆盖成仓库内路径会重新触发本问题——写测试时别改成 `server/xxx`。
- 生产换真 PostgreSQL 时这条约束不适用（数据在 DB 里，不在仓库里），但 `server/db/migrations/` 必须保持进 Git。
- **教训**：`.gitignore`、根目录白名单、空目录豁免是**三套独立清单**。新增一个"会自动生成的目录"前，先确认它在三套清单里的位置，否则必有人踩。
