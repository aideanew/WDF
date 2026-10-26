---
id: EVD-3105
title: TASK-3105 云存档分叉 UI 验收证据
status: active
module: save
owner: agent-core
created: 2026-10-26
related: [TASK-3105, TASK-3302, DESIGN-0001, MUST-05, MUST-06, AT-2202]
---

# EVD-3105 · 云存档分叉 UI 验收证据

## 阻塞点核验（S-09.2，先于实现）

**结论：不阻塞，正常执行。**

```ts
// server/src/modules/save/service.ts:37-41
export async function pull(playerId: string): Promise<SavePullRes> {
  const row = await findSnapshot(playerId);
  if (!row) return { summary: null };
  return { summary: summaryOf(row), snapshot: row.body };   // ← snapshot 是完整存档体
}
```

契约 `SavePullRes { summary: SaveSummary | null; snapshot?: unknown }` 与之吻合。
**云端快照可整档替换本地**，无需本地"拼"存档。

## 改动文件

| 文件 | 类型 | 说明 |
|---|---|---|
| `client/assets/scripts/features/settings/model/SaveSyncModel.ts` | **新增** | `status()` / `push()` / `resolve(keep)` + `SyncStatus` |
| `client/assets/scripts/features/settings/view/SettingsPanel.ts` | 修改（原 44 行桩） | 云存档区：本地/云端 rev 显示、检查同步、上传、分叉双按钮 |

**服务端零改动**（只读核对 `server/src/modules/save/service.ts`、`handlers.ts`）。

## 服务端语义（只读核对，决定客户端行为）

| 动作 | 成功 | 失败 |
|---|---|---|
| `save.pull` | `{ summary, snapshot }` | 无档 → `{ summary: null }` |
| `save.push` | `{ accepted:true, revision }` | `{ accepted:false, conflict: SaveSummary }`，**不报错** |
| `save.resolveFork` keep='cloud' | `{ revision }`，**无副作用**（云端原样保留，仅清 fork 行 + audit） | — |
| `save.resolveFork` keep='local' | `{ revision }`，`localSnapshot` 必填（缺 → 1001） | `ForkError` |

## 机器可验证项（V-09，现场实跑）

| id | 命令 | 结果 |
|---|---|---|
| V-09.a | `node --import ./tools/runtime/register.mjs --test tests/integration/fork.test.mjs` | ✅ `tests 5` / `pass 5` / `fail 0` |
| V-09.b | `node --import ./tools/runtime/register.mjs --test tests/e2e/skeleton.test.mjs` | ✅ `pass 1` / `fail 0` |
| V-09.c | `node --import ./tools/runtime/register.mjs --test tests/determinism/save-seal.test.mjs` | ✅ `pass 6` / `fail 0`（C-05 产物无回归） |
| V-09.d | §5.1 类型检查（新式） | ✅ 7 个，与 BASE-34 基线逐行一致，**未新增** |
| V-09.e | `npm run guard` | ✅ 9/9 |
| V-09.f | **人工**：制造分叉 → 弹窗文案明确；保留本地 → 云端 rev = 本地+1；保留云端 → 本地整档覆盖且 `verifySave` 通过；同 `rid` 重发不产生第二次冲突 | ⚠ **UNKNOWN**（替代证据 = V-09.a 的 PGlite 集成测试覆盖同一条服务端路径；本机无法驱动 Cocos UI） |

## 关键设计

1. **冲突的唯一权威是 `conflictOf()`**（契约铁律 1）。`SaveSyncModel.status().forkRisk`
   只是"两边 revision 不等"的**预告**，用于在推送前给出可读提示，**不参与冲突判定**——
   否则会出现"客户端先判冲突，服务端其实没冲突"的假弹窗。
2. **`3001 DUPLICATE_REQUEST` 不当冲突**：它经 `toUxState` 得 `success`，而 `invoke()` 只在
   `c !== 0` 时抛错，所以 3001 根本走不到客户端分支；这里也不为它写特判（S-09.7）。
3. **写入一律剥离旧 checksum 再 seal**：`alignLocalRevision()` 与 `resolve('cloud')`
   两处都先 `const { checksum: _stale, ...body } = file` 再 `sealSave(...)`。
   C-05 用例 2 已证明不剥离会让 `verifySave` 永假。
4. **keep='cloud' 的执行顺序：先落裁决，再整档替换本地**。裁决失败则本地一字不动（玩家选择未生效）；
   替换失败只 `console.warn`，因为下次 pull 会拿到同一份云端快照，幂等可重做。
5. **云端快照的 schemaVersion 先校验再写**：不符则不写本地（返回 `BAD_PAYLOAD` 态），
   避免把未知结构的档写进本地导致 `LocalSave.load()` 永久返回 null。
6. **推送成功后对齐本地 revision** 到服务端返回值，否则下次 pull 又显示"两边不等"，
   玩家会被同一个分叉弹窗反复骚扰。
7. **面板是工厂函数不是 Component**，不挂定时器：加载态只显示静态"同步中…"，
   不用逐帧进度条（与 C-07 / C-08 的处理一致）。

## 已知偏差与跳过项

| 项 | 说明 |
|---|---|
| 新增文件无 `.meta` | `SaveSyncModel.ts` 是手写新建，未生成 `.meta`（同 BASE-33 的 `InventoryPanel.ts` / `tables.ts`）。编辑器下次打开自动补齐；未手工伪造 UUID |
| `makeButton` 第三次复制 | 按钮构建样板已复制 3 份（C-07 背包 / C-08 榜单 / 本卡设置）。正确归宿是 `app/panel-ui.ts` 加一个 `makeButton`，但 `app/**` 归核心且 C-07/C-08 已交付，本卡不回头改。记为 C-11 或后续重构项 |
| 埋点跳过 | `features/telemetry` 仍是桩，不得自建 API |
| 态映射无自动化测试 | 与 C-08 同一根因：`RpcClient.invoke` 无注入点。解除条件同 EVD-3104（给 `RpcClient` 加 `setInvoker()`，一处改动解锁 C-08/C-09/C-10 三条路径） |

## 回滚命令

```bash
git checkout -- client/assets/scripts/features/settings/
rm client/assets/scripts/features/settings/model/SaveSyncModel.ts
```
