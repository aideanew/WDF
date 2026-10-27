---
id: PLAN-V008-00
title: plan-v008 · v1.0 收口与并行契约规划（导航与快照）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V007-00, PLAN-V006-00, PLAN-V005-00]
---

# 00 · plan-v008 总导航

> **本目录自 2026-10-27 16:47 起是本项目唯一现行执行规划。**
> 取代 `plan-v007`（v007 保留，其缺陷编号 F-01~F-26 全部继承）。
> **v008 与 v007 的唯一区别：v007 假设"工作树静止"，v008 承认"工作树被多路实时写入"并据此设计。**

## 1. 规划快照（§2.4 要求）

```yaml
snapshot:
  规划日期: 2026-10-27
  规划时刻: 16:47:02 GMT+8
  git_branch: master
  git_commit: 8f986b2
  git_ahead: 10            # 本地领先 origin/master 10 个提交
  origin_master: 0         # 远端无本地没有的提交（fetch 成功，匿名可读）
  工作区是否干净: false     # 23 条改动（含 1 个未跟踪测试文件）
  未提交改动数: 23
  测试命令: npm test
  守卫命令: npm run guard
  类型检查: npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 | grep -v "^C:/"
```

## 2. 三方实测对照（本节是本规划的地基）

同一棵工作树，三个观测者在 40 分钟内得出三套**互相矛盾**的结论。这不是谁撒谎，是**树在动**。

| 项 | 观测者 A（我，16:07） | 观测者 B（核对者，约 16:20） | 观测者 C（我，16:47） |
|---|---|---|---|
| 未提交改动 | 16 条 | 20 条 | **23 条** |
| `npm run guard` | 8/9（服务端依赖边界） | 9/9 | **9/9**（16:45 时还是 8/9，红的是文档 front matter） |
| `npm test` | 9 个文件整体崩 | 131 tests / 128 pass / 3 fail | **131/131 全绿** |
| server `tsc` chest | 8 处硬错 | 0（且称 48 条全是环境噪声） | **0**（chest 已无错，但 `save/service.ts` 有 5 处既存错误） |
| client `tsc` | 未测 | 1 错（`MerchantPanel.ts:223`） | **1 错（已复现，确认）** |

**判定**：三套结论**在各自时刻都是真的**，但**没有任何一套能作为"当前事实"**。因此本规划把基线定义为「**带时间戳的快照 + 复测命令**」，而不是「结论」。

**净影响**：v007 的 `11-drift-audit-w0w1.md` 里对 `chest/service.ts` 的 8 条指控（`tx`/`AppError`/`latestSnapshot`/`appendDelta`/`checkIdempotency`/`claims.playerId`/`SHADOW_STATE_MISMATCH`/`idempotency` 表结构），**在 16:47 的树上已全部不成立**——该文件被重写了。观测者 B 说"grep 零命中"是对的；但它没说明"零命中是因为文件已经换了"，而不是"我从头到尾都在编"。

> **这是本次最重要的方法论修正：对一棵活的树，任何"你错了"的指控都要先问"你测的是几点"。**

## 3. 仍然成立的缺陷（跨三个时刻都不变）

以下 9 条在 16:07 / 16:20 / 16:47 三个时刻**全部成立**，是本规划要解决的问题。编号接续 v007 的 F-26。

| 编号 | 缺陷 | 一句话后果 | 等级 |
|---|---|---|---|
| **F-27** | `client/.../MerchantPanel.ts:223` `merchantId: m.id`，`m.id` 是 `string`，而 `SellPayload.merchantId` 是字面量联合 | 客户端类型检查**唯一真错误**；G-06 要求 fail | **P0** |
| **F-28** | `server/.../chest/service.ts:17` `const ERR_SHADOW_STATE_MISMATCH = 3103`，15 码表无 3103；注释写"硬编码以适配测试" | 自造错误码，绕过 `ux.ts` 的 `satisfies` 硬约束；客户端拿不到映射 | **P0** |
| **F-29** | `openChest` 只改存档 `inventory`，**不写 `ledger_entry`** | 违反 ADR-0012；玩家拿奖励去 `economy.sell` 必判 1001 | **P0** |
| **F-30** | `chest.open` 的 `hitsUsed` 形参**传入后无引用** | 无开锁校验，"客户端说开成功就发奖"；锁机制形同虚设 | **P0** |
| **F-31** | `chests.csv.item_id` **无任何运行时消费**（grep 只命中文档生成脚本） | 服务端不查 `chests` 表验证"这个 item 是不是箱子"，任意 `itemId` 都能开 | P1 |
| **F-32** | `updateSnapshotServerSide` 里 `if (!current) return;` | 无存档时**静默成功**：返回 `success: true` 但什么都没发生 | P1 |
| **F-33** | `openChest` = `pull()`（无事务）+ `updateSnapshotServerSide()`（独立 `withTx`） | 两次读之间可被改 → TOCTOU 竞态；并发开箱可双花 | P1 |
| **F-34** | `chest/service.ts:1` `import { withTx }` **未使用** | 死导入；若开 `noUnusedLocals` 即报错 | P2 |
| **F-35** | 工作树被**多路实时写入**，无归属声明 | 任何基线结论秒级失效；并行改同一文件必冲突 | **P0（流程）** |

## 4. 三方争议项的技术裁决

| 争议 | 观测者 B 的主张 | 实测 | 裁决 |
|---|---|---|---|
| "server tsc 48 条全是环境噪声，不是 chest 的错" | 对一半 | 16:47 实测 chest 确实 0 错；但 `save/service.ts:9` 有 5 处 `has no exported member`、`leaderboard/repo.ts:42` 有 1 处，**这些是真错不是噪声** | **B 的结论方向对，归类错**。噪声（`node:fs`/`process`）与非噪声必须分开统计 |
| "`claims.playerId` 该字段不存在" | 说这是"真实但非缺陷，playerId 只是参数名" | 16:47 的 `handlers.ts` 用 `ctx.claims?.sub`，**已正确** | **我的 v007 指控已过期**（当时那版确实写错），现不成立 |
| "`item_0020` 是 material 类，`chests.schema.json` 的 `item_id` 是否校验必须指向 chest 行" | 标为"未验完，保持未知" | 已验：`tools/gen/config.mjs:50-54` 只校验 **id 存在性**，**不校验类型** | **B 的疑虑成立**；但 `item_0020` 是**奖励**不是 `item_id`，两者不冲突——`item_id` 的三个值都是 `chest` 类，正确 |
| "`chest.test.mjs` 未跟踪，主控'已提交测试'不成立" | 成立 | 16:47 仍 `??` | **成立**，本规划要求补提交 |
| "`save/service.ts` +26 行碰了 4006 卡禁止的 `save.push` 语义域" | 部分成立 | 新增的是 `updateSnapshotServerSide`（新函数），**未改 `push` 本体** | **不成立**。新增函数 ≠ 改语义；但它确实在 `save` 模块内，需在契约层登记 |

## 5. 文件清单（10 份）

| # | 文件 | 作用 | 产出方 |
|---|---|---|---|
| 00 | `00-README.md` | 快照、三方对照、缺陷总表、导航 | 本规划 |
| 01 | `01-fact-baseline.md` | 逐文件实测基线 + 文档与代码不一致清单 | 本规划 |
| 02 | `02-requirements.md` | 需求复核：MUST/SHOULD/COULD/MUST NOT + 冲突 + 未知登记册 | 本规划 |
| 03 | `03-contract-freeze.md` | 六份契约冻结（API/Errors/Identity/Resources/Events/UX）+ 唯一源声明 | 本规划 |
| 04 | `04-ownership-dag.md` | 所有权矩阵 + DAG + 并行机械判定 + 档位预算 | 本规划 |
| 05 | `05-step1-p0-defects.md` | **步骤 1**：修 F-27/F-28/F-34（3 处，均可单行级） | **我本人** |
| 06 | `06-step2-chest-authority.md` | **步骤 2**：F-29/F-30/F-31/F-32/F-33 开箱权威化（高难度） | **我本人** |
| 07 | `07-step3-ui-close.md` | **步骤 3**：UI 收口（4009b 开箱 UI + 4008 收尾 + 六态走查） | **我本人** |
| 08 | `08-step4-evidence-release.md` | **步骤 4**：证据补录 + 文档对齐 + 打包/推送 | 外部 Agent |
| 09 | `09-self-check.md` | 自检 12 项 + 前提与局限 + 第一刀 | 本规划 |

## 6. 任务归属（按用户 16:44 指令）

> 用户原话：「核心任务+高难度任务你自己完成（尤其是UI设计和实现），中等及简单任务发布规划后等待另外Agent完成。」

| 档 | 任务 | 谁做 | 理由 |
|---|---|---|---|
| **核心 + 高难度** | `05` 全部（P0 缺陷修复）、`06` 全部（开箱权威化）、`07` 全部（UI 设计与实现） | **我** | 涉及契约语义、事务边界、UI 设计，错一次要返工一片 |
| 中等 | `08` 的证据补录、文档对齐、索引更新 | 外部 Agent | 有明确模板，产出可机械校验 |
| 简单 | `08` 的打包、推送、状态勾选 | 外部 Agent | 纯执行 |

## 7. 执行纪律（违反任一即 FAIL）

| # | 纪律 | 来源 |
|---|---|---|
| R-1 | **按阶段体检，不全量回归**：单卡只跑它改到的测试；每阶段结束只对该阶段动过的模块体检一次；全量回归留到发版前 | 用户 16:44 |
| R-2 | **闸门不过不许写下一行**。本项目历史失败模式是"想到了但没验"，不是"想不到" | v007 教训 |
| R-3 | **改前必读被引用的真实签名**（`grep "^export"`），禁止凭印象调用 | 16:07 事故 |
| R-4 | **禁止自造错误码**。需要新码 → 先改 `DESIGN-0001 §2` → 再加 `ERR` → `ux.ts` 自动要求映射 | F-28 |
| R-5 | **改背包必须同时落 `ledger_entry`**（ADR-0012，容差 0） | F-29 |
| R-6 | **服务端不信客户端上报**：开箱成功与否由服务端判定，不由 `hitsUsed` 宣告 | F-30 |
| R-7 | **未提交的改动不算交付**。所有产出必须 `git add` 进版本库 | F-35 |
| R-8 | **client 侧必须跑 tsc**：`npm test` 对 `'cc'` 代码天然无效 | F-27 |
| R-9 | **一卡一提交**，commit message 含卡号 | v007 R-9 |
| R-10 | **完成即写 EVD**（命令/输出/时间/commit/判定），无 EVD 不划 done | v007 R-10 |

## 8. 怎么开始

1. 读 `01`（逐文件实测基线）→ `02`（需求复核）→ `03`（契约）。
2. 从 `05-step1-p0-defects.md` 开工：3 处 P0，预计改动 4 行。
3. 再进 `06`（开箱权威化，这是本规划的主体工作量）。
4. `07`（UI）由我做，`08` 派给外部 Agent。

## 9. 本规划不做

- 不填任何无设计源的数值（35 张空表 → v007 `10` §5 的 v1.1 种子）。
- 不做真机/备案（用户 10-23 已定"先本地开发"）。
- 不做全量回归（用户 16:44 明确要求按阶段体检）。
- 不为"未来可能需要"建表或建目录。

## 10. 实施进度（滚动更新，最后更新 2026-10-27）

> 只记**已验证**的事实。每条带 commit 或命令，无证据的不写进来。

### 步骤 1 + 2：已完成（`1fd7364`）

| 卡 | 缺陷 | 状态 | 证据 |
|---|---|---|---|
| 5002 | F-28 自造码 3103 | ✅ done | `grep 3103` 源码零命中，仅注释留痕；改用 `ERR.BAD_PAYLOAD` |
| 5002 | F-34 `withTx` 死导入 | ✅ done | 重写 `chest/service.ts` 时删除 |
| 5004 | F-31 箱型无校验 | ✅ done | `chest/repo.ts` 新增 `findChestByItemId`；测试"四种锁当箱子 → 1001" |
| 5004 | F-33 事务 TOCTOU | ✅ done | 校验/扣箱/发奖/记账全在 `updateSnapshotServerSide` 单事务内 |
| 5004 | F-29 开箱不写账本 | ✅ done | `economy` 新增 `recordLoss` + `grantItem`/`consumeItem`；测试"开箱后立刻 sell → 0" |
| 5004 | F-32 无档静默成功 | ✅ done | `updateSnapshotServerSide` 返回 boolean；无档 → 2001 |
| 5005 | 测试覆盖 | ✅ done | `tests/integration/chest.test.mjs` 3 例 → **7 例全绿** |
| — | **F-39（新发现）** | ✅ done | 服务端改 body 却沿用旧 checksum → 客户端 `verifySave` 判损坏。已按 `computeChecksum` 重算 |
| — | 契约删 `hitsUsed` | ✅ done | 设计源「首版建议延期」；源码零残留，仅历史规划文档留字 |
| 5003 | 测试文件入版本库 | ✅ done | `tests/integration/chest.test.mjs` 已随 `1fd7364` 入库 |

### 步骤 3：已完成（本次）

| 卡 | 项 | 状态 | 证据 |
|---|---|---|---|
| 5007a | 抽 `addButton` + `setButtonDisabled`/`setButtonText` 到 `panel-ui.ts` | ✅ done | `InventoryPanel` 两处手写按钮（回收 / 去打捞）已替换，该文件 `Graphics`/`Label` 导入已删 |
| 5007b | `ChestModel.ts`（纯函数投影，无 `cc`） | ✅ done | `tests/determinism/chest-flow.test.mjs` **15 例全绿** |
| 5007b | `ChestPanel.ts`（六态面板） | ✅ done | tsc 零错；六态各有显式代码路径（见 `07` §4.2 走查） |
| 5007b | 主界面 Tab 加"箱子" | ✅ done | `panel-types.ts` 的 `PanelKey` + `MainView.ts` 的 `TABS`/`factories`（第 3 位，6 个 Tab） |

**门禁结果**：`npm run guard` 9/9；`tests/determinism` 82/82；`tests/integration/chest` 7/7；client tsc 仅剩 F-27（`MerchantPanel.ts:223`，助手线任务 A）。

### 对原计划的偏差（必须记下来）

| # | 计划写的 | 实际做的 | 原因 |
|---|---|---|---|
| D-1 | `07` §4.2「`chest/` 下 `roundRect` 零命中」 | **2 处命中**：卡片底 + 材质色块 | 该条本意是"按钮不得手写"。`addButton` 只管按钮，卡片底板必须自绘。验收口径已改为"按钮零手写" |
| D-2 | `07` §3.1「箱子卡 700×120，首张 y=60」 | 首张 y=**20** | y=60 时卡片顶到 120，与错误条（y=106）重叠。下移 40 让出红条位置 |
| D-3 | `07` §3.1「状态行：今日已开 N 次 / 工具剩余 M」 | 改为「背包里共 N 个箱子」 | 服务端**没有**"今日已开次数"字段，v1.0 也没有开锁工具。编一个就是伪造数据（同 `InventoryPanel` 不显示 weight 的理由） |
| D-4 | `07` §3.3 `noPermission` → "跳登录" | 文案 + 「重试」按钮 | 登录入口在启动流程（`GameApp`/`BootController`），面板层没有登录面板；不造假按钮。契约 `next:'login'` 的落地缺口已登记 |
| D-5 | `07` §3.4「`ChestView` 保留空壳」 | 照做 | ✅ 无偏差 |

### 仍未做（不属本步）

| 项 | 归属 | 说明 |
|---|---|---|
| F-27 `MerchantPanel.ts:223` | 助手线 A | client tsc 唯一真错 |
| 合规材料重写（F-36） | 助手线 C | — |
| 文档收口（`current-plan.md` 的"已修复"等） | 助手线 D | — |
| `MerchantPanel`/`LeaderboardPanel`/`SettingsPanel`/`GuideOverlay` 剩余手写按钮 | 后续 | 属各 feature 自己的重构，不在 5007a 范围（该卡只要求 `InventoryPanel`） |
| 6 段人工录屏 | 待做 | 需要 Cocos 运行时，沙箱内无法执行；走 UNKNOWN |
| `next:'login'` 的落地出口 | v1.1 | 需先有独立登录面板 |
