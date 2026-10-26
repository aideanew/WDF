# EVD-0107 —— save.pull / save.push 乐观锁与幂等

- **对应任务**：[TASK-0107](../../../05_execution/tasks/TASK-0107.md)（AT-0107）
- **采集时间**：2026-10-23 17:4x
- **环境**：Windows 10 / Node v24.12.0 / PGlite 0.5.11
- **判定**：**PASS**

## 1. 语义约定（本次实现固定下来的口径）

| 情况 | 服务端行为 | 理由 |
|---|---|---|
| 首次上传 `baseRevision=0`，云端无存档 | `{accepted:true, revision:1}` | 正常落库 |
| `baseRevision` == 云端 `revision` | `{accepted:true, revision:n+1}` | 正常落库 |
| `baseRevision` ≠ 云端 `revision` | `{accepted:false, conflict:{revision,savedAt,...}}`，**`c` 仍为 `0`** | 冲突是**正常业务分支**，不是错误；交给 S5 的 `save.resolveFork` 让玩家选 |
| 同 `(playerId, rid)` 重放 | 回放**首次**响应，`revision` 不递增 | 幂等表只缓存 `c===0` 的成功响应；失败允许同 rid 重试 |
| `snapshot` 内容 | **不透明负载**，服务端原样存，只校验 `checksum` 字段类型 | 服务端不理解存档内部结构，结构演进由 `schemaVersion` 管 |

## 2. 集成测试输出

```text
$ node --import ./tools/runtime/register.mjs --test tests/integration/auth.test.mjs
✔ AT-0107 save.push 乐观锁与幂等
ℹ tests 7   pass 7   fail 0
```

断言序列（同一玩家）：

```text
pull  → summary === null                 （新号云端无存档）
push  baseRevision=0   rid=r1  → accepted, revision=1
push  baseRevision=0   rid=r1  → revision 仍为 1（同 rid 幂等，未二次递增）
push  baseRevision=0   rid=r2  → accepted:false, conflict.revision=1（旧 base，冲突不报错）
push  baseRevision=1   rid=r3  → accepted, revision=2
pull  → summary.revision=2, snapshot.checksum=22（拿到最后一次上传的那份）
```

## 3. 真实 HTTP 探针（30 断言全绿）

```text
$ node tools/dev/probe-s1.mjs

== 4. save.pull（读当前云端基线） ==
  ✅ c === 0
  ℹ️  当前云端 revision = 0（空存档，首次上传）

== 5. save.push（以当前 revision 为 base 上传） ==
  ✅ c === 0
  ✅ accepted === true
  ✅ revision === 1

== 6. 幂等：同 rid 重放，必须拿到同一份响应 ==
  ✅ revision 仍为 1（未二次递增）
  ✅ accepted 仍为 true

== 7. 冲突：旧 baseRevision + 新 rid ==
  ✅ c === 0（冲突不是错误）
  ✅ accepted === false
  ✅ conflict.revision === 1

== 8. 正确 baseRevision：再推一次，revision 继续 +1 ==
  ✅ accepted === true
  ✅ revision === 2

== 9. save.pull（拿到云端最新） ==
  ✅ summary.revision === 2
  ✅ 快照内层 checksum 为 777（确认是第二次上传的那份）

[probe] 通过 30，失败 0
```

**探针必须可重复跑**：老玩家云端已有存档，所以断言不硬编码 `revision===1/2`，而是先从 `save.pull` 读基线 `base`，再断言 `base+1` / `base+2`。同一条命令连跑两次都全绿（已实测）。

## 4. 全量闸门

```text
$ npm run verify
全部守卫通过
ℹ tests 17   pass 17   fail 0
EXIT=0
```

## 5. 已知缺口

- `save.resolveFork` 仍是 `todo`。**冲突发生后客户端没有任何解决入口**，只能丢弃本地覆盖或丢弃云端重下——S5 之前不要让真实玩家进入冲突分支（当前客户端 `FORCE_OFFLINE=true`，还走不到这里）。
- `snapshot` 只校验 `checksum` 字段**类型**，**没有校验 checksum 与内容是否匹配**（服务端不认识内部结构）。防篡改靠客户端的 `verifySave()`（`packages/game-core/src/save/schema.ts`，已有单测），服务端这一层只防"结构坏掉"。做排行榜/交易前需要补服务端复核。
- `idempotency` 表目前**没有清理策略**，会随请求量单调增长。上线前必须加 TTL 清理（表里已有 `created_at`，建议保留 7 天）。
- `save_snapshot` 是 `player_id` 主键 —— **每人只存最新一份**，没有历史版本。冲突发生后云端旧快照已被覆盖的路径不存在（冲突时根本不写），但"玩家想回退到 3 分钟前"这种需求现在做不到。表 `save_fork` 已建但**一行未用**，那是 S5 `resolveFork` 的落点，届时不要另建表。
