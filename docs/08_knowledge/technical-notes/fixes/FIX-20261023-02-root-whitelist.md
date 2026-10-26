---
id: KB-FIX-20261023-02
title: 根目录白名单缺 .workbuddy 导致 verify 报错
status: active
date: 2026-10-23
kind: env
severity: P0
module: cross
owner: hark
related: [KB-FIX-20261023-01, GOV-0002]
---

# 根目录白名单缺 `.workbuddy` 导致 `verify` 报错

## 1. 现象

```text
$ npm run verify
❌ 根目录白名单（1）
   - 根目录不在白名单：.workbuddy
守卫未通过：1 处
EXIT=1
```

## 2. 影响

- **P0**：`verify` 是提交前唯一硬闸门，白名单一条就把整条链打断。
- 触发条件是"仓库根出现 `.workbuddy/`"——本机 AI 协作工具（工作记忆日志）**每次工作都会创建/写入**该目录，所以这不是偶发，而是**必然复现**：只要用 AI 协作，`verify` 就永远红。
- 反过来，如果为了过守卫去删 `.workbuddy/`，会丢掉项目工作记忆（该目录明确不是临时缓存）。

## 3. 根因

`tools/guard/checks.mjs` 的 `rootWhitelist()` 里维护了一份根目录白名单（与 `GOV-0002` 第 6 节同源），其中只有 `docs / game-data / packages / client / server / tools / tests / art-source / .local / .git / .github / node_modules`。

`.workbuddy/` 是后加入的本地工具目录，**代码白名单与文档白名单都没同步**——典型的"新增工具目录未走治理流程"。

## 4. 修复

| 文件 | 改动 |
|---|---|
| `tools/guard/checks.mjs` | `rootWhitelist()` 的 `dirs` 集合加入 `'.workbuddy'` |
| `docs/00_governance/project-structure-spec.md` | 第 6 节白名单同步加入 `.workbuddy`，并说明其性质（本地状态、不进 Git、不得手改机器生成内容） |

**为什不选另外两种做法**：
- 删目录 → 丢工作记忆，且下次运行又出现，治不了根。
- 把 `.workbuddy` 挪到仓库外 → 违反工具约定路径，记忆体系失效。

## 5. 验证

```text
$ npm run verify
✅ 根目录白名单
✅ game-core/contracts 纯度
✅ 客户端依赖边界
...
✅ 文档 front matter
✅ 无空目录
全部守卫通过
ℹ tests 10  pass 10  fail 0
EXIT=0
```

## 6. 回归与遗留

- **注意**：白名单放宽只针对"目录存在"，并不豁免其内容的任何规则。
- **勘误（2026-10-23 18:0x 补）**：本条原先写"`.workbuddy/` 仍未进 Git（`.gitignore` 已覆盖）"——**这句是错的**，当时 `.gitignore` 里并没有 `.workbuddy/`，`git status` 把它当未跟踪目录。已在 `.gitignore` 补上 `.workbuddy/` 与 `.local/` 的说明注释，`git check-ignore -v` 复核生效。教训：**"我记得它被忽略了"不算证据，要跑 `git status` / `git check-ignore` 确认**。
- **遗留的同类风险**：以后任何新工具目录（如 `.vscode`、`.idea`）都会以同样方式打挂守卫。建议在 `AGENTS.md` 的"归属速查"里补一行"新增根级目录必须先登记白名单"，已在本条记录中提示，尚未落到 AGENTS.md。
- **教训**：**"新增一个目录"也是变更**，必须同时改 `GOV-0002` 与 `checks.mjs` 两处，否则 CI 立刻红。另外 `.gitignore` **不支持行尾注释**（`*.log  # 说明` 会让整行失效），注释必须单独成行。
