---
id: KB-FIX-20261023-01
title: 同步脚本整目录删除导致 Cocos .meta 丢失与 verify 中断
status: active
date: 2026-10-23
kind: bug
severity: P0
module: cross
owner: hark
related: [TASK-0106, TASK-0108, ADR-0006]
---

# 同步脚本整目录删除导致 Cocos .meta 丢失与 verify 中断

## 1. 现象

在仓库根执行 `npm run verify`，在 `gen` 阶段的 `sync` 步骤直接中断：

```text
✅ 数值生成完成：46 张表，0 行，configVersion=16921d30a67a934f
Error: [safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED]
{"count":69,"threshold":50,"scope":"turn",
 "targets":["E:\\Demo\\WDF\\client\\assets\\scripts\\generated\\game-core"]}
    at file:///E:/Demo/WDF/tools/sync/to-client.mjs:11:21
EXIT=1
```

同一时刻 `client/assets/scripts/generated/` 下存在 **78 个 `.meta`**（Cocos 为该目录及 42 个脚本生成的资源描述文件）。

## 2. 影响

- **P0**：`verify` 是提交前唯一硬闸门（`gen && guard && test`）。它一挂，等于没有任何自动校验能跑，后续所有改动的"已验证"都失去依据。
- **更严重的是数据风险**：`.meta` 记录资源 uuid。整目录删除后 Cocos 重新导入会分配**新 uuid**，场景 / 预制体里对这些脚本的引用全部变成丢失引用（表现为组件显示 `Missing Script`）。
- 该目录是 `tools/sync` 的产出目录，**每次 `npm run gen` 都会执行**，所以这不是偶发，而是每次都会发生/潜在地发生。

## 3. 根因

`tools/sync/to-client.mjs` 原实现：

```js
const dest = join(outRoot, name);
if (exists(dest)) rmSync(dest, { recursive: true, force: true });  // ← 第 11 行
```

两个问题叠加：

1. **逻辑错误**：`generated/` 同时存放"工具生成的 `.ts`"和"Cocos 生成的 `.meta`"，属于两种所有权。整目录 `rm -rf` 把不属于自己的 `.meta` 一起删了。违反 `AGENTS.md`「不手改生成物」之外的隐含边界：**生成器只能管自己产出的文件**。
2. **执行环境**：本机沙箱/CI 对单批次删除 >50 个文件有保护，`recursive` 删除一次命中 69 个文件即被拦截并抛错，`verify` 失败。

## 4. 修复

文件：`tools/sync/to-client.mjs`（整体重写，语义从"清空重建"改为"覆盖写 + 增量清理"）。

| 改动 | 原来 | 现在 |
|---|---|---|
| 写入方式 | 删目录后全量重写 | 逐文件覆盖写（`write` 自带 `mkdir -p`） |
| 清理陈旧产物 | `rmSync(dir, {recursive:true})` | 读上次 `_sync-manifest.json`，只 `unlinkSync` **本次不再生成、且后缀为 `.ts`** 的文件 |
| `.meta` | 会被删除 | **永不触碰**（后缀过滤，任何非 `.ts` 不删） |
| 批量删除 | 一次 60+ 文件 | 单文件逐个删除，不再触发批量保护 |

关键代码（现行版本）：

```js
const prefix = `client/assets/scripts/generated/${name}/`;
for (const oldKey of Object.keys(prev)) {
  if (!oldKey.startsWith(prefix) || written.has(oldKey) || !oldKey.endsWith('.ts')) continue;
  const abs = p(oldKey);
  if (!exists(abs)) continue;
  unlinkSync(abs);
  removed += 1;
}
```

**放弃的方案**：在 `rmSync` 前加 `dangerouslyDisableSandbox` 或提高阈值——那只是绕过拦截，`.meta` 照样被删，属于治标不治本。

## 5. 验证

```bash
$ npm run verify
EXIT=0
✅ 服务端依赖边界
✅ 模块清单与目录一致
✅ Asset Bundle 规则
✅ 生成物未手改且已同步
✅ 文档 front matter
✅ 无空目录
全部守卫通过
ℹ tests 10  pass 10  fail 0
```

```bash
$ find client/assets/scripts/generated -name '*.meta' | wc -l
78                      # 修复前后一致，未被删除

$ npm run sync
✅ 已同步 42 个文件到 client/assets/scripts/generated/（清理 0 个失效产物；.meta 未触碰）
```

**判定**：PASS。幂等（连跑两次结果一致）、`.meta` 零损失、`verify` 全绿。

## 6. 回归与遗留

- **受影响的调用方**：`npm run gen`（直接）、`npm run verify`（间接）、任何依赖 `sync` 的脚本。语义未变（输出路径、文件内容、manifest 格式都不变），`guard` 的"生成物未手改"检查照常通过。
- **遗留**：首次同步（旧 manifest 不存在）时无法识别历史残留文件；当前不存在该情况，若将来需要可加一次性清理脚本。
- **给下次的提醒**：
  1. 任何"生成物目录"里只要混有编辑器产出的 `.meta`，就**禁止整目录删除**。
  2. 生成器的清理逻辑必须按"自己上次产出的清单"删，不能按目录删。
  3. 验证修复时要同时看三件事：命令退出码、`.meta` 数量、是否幂等。
