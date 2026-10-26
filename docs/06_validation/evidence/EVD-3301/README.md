---
id: EVD-3301
title: TASK-3301 守卫同步校验（范围重定：换行规范化）验收证据
status: active
module: guard
owner: agent-guard
created: 2026-10-26
related: [TASK-3301, EXEC-BRIEF-0002, ADR-0005]
---

# EVD-3301 · 守卫同步校验验收证据

> **范围重定**：原卡要求新增第 10 项 `sourceSync()`。实测 `generatedUntouched()`（第 7 项）**已实现**源↔生成物比对，
> 新增第 10 项 = 重复覆盖、零收益。本卡改为修两个真实缺口：① 比对未做换行规范化；② autocrlf 假红陷阱。
> 依据见 `docs/05_execution/ASSISTANT-BRIEF.md` §8 C-06。

## 改动文件

| 文件 | 类型 | 说明 |
|---|---|---|
| `tools/lib/sync-targets.mjs` | 新增 | `SYNC_TARGETS` 唯一来源（此前在 sync 与 guard 各写一份） |
| `tools/sync/to-client.mjs` | 修改 | 改用共享常量；**生成行为未变** |
| `tools/guard/checks.mjs` | 修改 | 加 `norm()`；源↔副本比对改为规范化 + 换行差异单独上报 |

## 机器可验证项（V-06.a~h，全部现场实跑）

| id | 场景 | 结果 |
|---|---|---|
| V-06.a | 无改动基线 `npm run guard` | ✅ **9/9 全绿**（非 10/10——未新增检查项） |
| V-06.b | `echo "// probe" >> packages/game-core/src/hook/index.ts` 不 sync | ✅ 失败：`客户端副本过期：packages/game-core/src/hook/index.ts（npm run sync）` |
| V-06.c | 上面之后 `git checkout --` 还原 | ✅ **9/9 全绿**（陷阱已从根源关闭——见下） |
| V-06.d | `sed -i 's/\r$//'` 把源文件统一为 LF | ✅ **9/9 全绿**（规范化生效；加 `.gitattributes` 后此步已非必要） |
| V-06.e | 手改 `generated/**` | ✅ 仍失败：`生成文件被手改`（+ 内容比对，共 2 处）——哈希检查未退化 |
| V-06.f | 全量复原 `npm run sync && npm run guard` | ✅ 9/9 全绿 |
| V-06.g | `npm run sync` 输出 | ✅ `已同步 43 个文件`（重构未改变行为） |
| V-06.h | `npm test` | ✅ 72 pass / 0 fail（与基线 BASE-02 一致，本卡不新增用例） |

## 关键发现：autocrlf 假红陷阱

本仓 `core.autocrlf=true` 且原**无 `.gitattributes`**，而 `.editorconfig` 声明 `end_of_line=lf`。
`git checkout` 会按 autocrlf 把源文件**还原成 CRLF**，而 `generated/` 副本是 LF → 守卫报"副本过期"，
但 `git status` 显示干净。执行者会误以为守卫坏了。

**修复前**的现场记录（首次发现时）：

```
$ git checkout -- packages/game-core/src/hook/index.ts
$ file packages/game-core/src/hook/index.ts
...: JavaScript source, Unicode text, UTF-8 text, with CRLF line terminators
$ git status --porcelain -- packages/game-core/src/hook/index.ts
(空 —— 看起来完全干净)
$ npm run guard
   - 客户端副本换行不一致：packages/game-core/src/hook/index.ts（core.autocrlf=true 把源文件还原成 CRLF；…）
守卫未通过：1 处
```

修复前同场景报的是 `客户端副本过期` —— 会让人去改 `packages` 源码，方向完全错误。

**根因量化**：CRLF 源文件 5348 字节 vs LF 副本 5274 字节，差 151 字节 = 换行差。

**修复后**（加 `.gitattributes` 后重跑同一探针）：

```
$ git checkout -- packages/game-core/src/hook/index.ts
$ file packages/game-core/src/hook/index.ts
...: JavaScript source, Unicode text, UTF-8 text        ← 已是 LF
$ git status --porcelain -- packages/game-core/src/hook/index.ts
(空 —— 且是真干净，无 stale stat 噪声)
$ npm run guard
全部守卫通过                                              ← V-06.c 由"仍失败"转为"全绿"
```

## `.gitattributes`：范围刻意最小化（已执行，主控裁决）

原方案是全仓 `* text=auto eol=lf`，实测影响面后改为只覆盖代码目录：

```
packages/** text eol=lf
tools/** text eol=lf
server/** text eol=lf
```

**理由**：全仓扫描出 **135 个既存 CRLF 文件**（120 个在 `client/assets`、10 个在 `docs/08_knowledge`、
其余零散），而 `packages/` 下 **0 个**。全仓 `eol=lf` 会为一个当前影响 0 个文件的问题扰动 135 个文件，
其中含约定"保持原文"的 RAW 原始资料目录（`docs/08_knowledge/sources/`）。

**范围验证**（`git check-attr -z eol`）：

| 文件 | eol |
|---|---|
| `packages/game-core/src/hook/index.ts` | `lf` |
| `tools/guard/checks.mjs` | `lf` |
| `server/src/core/db.ts` | `lf` |
| `client/assets/scripts/app/MainView.ts` | `unspecified`（未触碰） |
| `docs/08_knowledge/sources/README.md` | `unspecified`（RAW 未触碰） |

属性覆盖 143 个文件；`git ls-files -c` 显示 **0 个既存文件需重规范化**，故无一次性 churn。

**连带改动**：`.gitattributes` 不在 `rootWhitelist` 的根目录白名单里，已补入（`checks.mjs`），
否则守卫第 1 项会直接红。

## 两层防护的现状

1. **`.gitattributes eol=lf`** —— 让 checkout 直接产出 LF，陷阱不再发生（主防线）；
2. **`norm()` 规范化比对 + 换行专项报错** —— 属性覆盖不到的场景（属性外的目录、克隆时被剥离 `.gitattributes`）
   仍不会假红，且报错会指向正确修法而非让人去改 `packages` 源码（纵深防线）。

## 已知偏差

| 与任务卡的差异 | 理由 |
|---|---|
| 未新增第 10 项守卫 | 第 7 项已覆盖，重复覆盖无收益（现场探针确认） |
| 验收从"10/10 全绿"改为"9/9 全绿 + 规范化生效" | 同上 |
| V-06.c 从"仍失败"改为"全绿" | `.gitattributes` 让陷阱不再发生，该断言的前提已不成立 |
| `.gitattributes` 不在任务卡「允许修改」清单内 | 已就范围与主控确认：只覆盖代码目录，零既存文件 churn |
| 连带改了 `rootWhitelist` | `.gitattributes` 未被白名单收录，不改会让守卫第 1 项红 |
| `run-all.mjs` 未改 | 无需注册新 label（未新增检查项） |

## 回滚命令

```bash
git checkout -- tools/guard/checks.mjs tools/sync/to-client.mjs
rm .gitattributes tools/lib/sync-targets.mjs
rm -rf docs/06_validation/evidence/EVD-3301
```
