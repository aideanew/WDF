---
id: PLAN-V005-11
title: 步骤 6 · W5 真机证据与命中率采样（合法降级路径）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V005-10, PLAN-V005-09]
---

# 11 · 步骤 6：W5 真机证据与命中率采样

> **一句话**：真机大概率没有（用户 10-23 已定"先本地开发，不用真机"）。本步的任务不是"搞到真机"，而是**在没有真机的前提下，把"没验证"这件事记录得无懈可击**，同时把补验证的路径铺好，让未来有真机时零返工。

## 1. 环境现实

| 项 | 状态 | 依据 |
|---|---|---|
| 真机 | **未提供** | 用户 2026-10-23 拍板"先本地开发，不用真机、不做认证备案" |
| 模拟器 | 未确认 | Cocos 模拟器在本沙箱不可跑（需 GUI + 编辑器） |
| 录屏工具 | 未知 | 无真机则无从谈起 |
| 所以 4010/4011 的**执行**部分 | **UNKNOWN** | 符合 G-07，不得记 PASS |

**这条不是"降级"，是"如实"**：G-07 写明"真机缺失时 UI 运行时断言记 UNKNOWN（不得记 PASS）"。

## 2. 辩证：UNKNOWN 是不是"什么都不做"

### 2.1 正题

既然没有真机，4010/4011 应整体跳过，标 UNKNOWN 收工。

### 2.2 反题

跳过等于**把"无证据"和"未测试"混为一谈**。将来有人看到 4010 标 UNKNOWN，无法区分：
- 是"环境没有，代码大概率对"？
- 还是"根本没写，功能不存在"？

这两种情况的返工成本差一个数量级。**UNKNOWN 必须携带上下文，否则等同于垃圾数据。**

### 2.3 合题（本步执行方案）

UNKNOWN 必须满足三个条件才有效：

| 条件 | 内容 |
|---|---|
| **C1 可执行化** | 采样脚本**必须写好**并能 `--dry-run` 跑通（证明"有真机就能立刻用"） |
| **C2 可模拟化** | 用 `game-core/hook` 的确定性函数做**蒙特卡洛**，给出**理论命中率**，明确标注 `SIMULATED` |
| **C3 可交接化** | 写一份**操作手册**（怎么接设备、怎么导出、放在哪、填哪个表），让"补验证"变成 30 分钟的机械动作 |

**核心区分**：
- `MEASURED`（真机实测）——没有，记 UNKNOWN；
- `SIMULATED`（模拟推算）——可以有，记 PASS，但**必须带 `SIMULATED` 标签**，且**不得**替代 `MEASURED` 去满足出口条件。

## 3. 原子步骤

### 3.1 采样脚本 `tools/sample-hook-hitrate.mjs`（TASK-4011 的 C1）

#### 3.1.1 输入契约

| 模式 | 输入 | 用途 |
|---|---|---|
| `--dry-run` | 内置合成数据（3 人 × 20 钩） | 验证脚本自身逻辑 |
| `--from <file.jsonl>` | 真机导出的 JSONL | 真实采样 |
| `--simulate <n>` | 用 `game-core/hook` 确定性函数生成 n 次 | 理论基线 |

JSONL 每行（真机导出格式，**本步定义，未来照此导出**）：

```json
{"ts":1761548400000,"player":"p1","session":1,"shotIndex":1,"firstHook":true,
 "pointer":4820,"power":0.62,"angleDeg":12.4,"hit":true,"targetDist":600}
```

#### 3.1.2 输出契约

- 控制台：命中率汇总表（总体 / 首钩 / 前 10 钩 / 分玩家）；
- 文件：`docs/06_validation/evidence/EVD-4011/hitrate.md`（Markdown 表 + 数据来源标签）。

#### 3.1.3 判定口径（对齐 roadmap 出口条件）

| 指标 | 阈值 | 来源 |
|---|---|---|
| 首钩命中率 | **≥ 45%** | `roadmap.md` 阶段出口"核心原型" |
| 前 10 钩命中率 | 40%–60% | 同上 |
| 冷启动 | ≤ 5s | 同上（本脚本不测，归 4010） |

#### 3.1.4 必须打印的标签

```text
数据来源：SIMULATED（game-core/hook 确定性函数，n=3000）   ← 或 MEASURED（真机 n=60）
判定：首钩 52.3% ≥ 45% ✅  |  前 10 钩 48.1% ∈ [40,60] ✅  |  证据等级：SIMULATED（不满足出口条件）
```

**最后一句是关键**：`SIMULATED` 即使数值达标，也**不得**用来满足 v1.0 出口条件。

### 3.2 用模拟替代实测（TASK-4011 的 C2）

#### 3.2.1 做法

`game-core/hook` 是确定性纯函数（`E-11` 同源约束：无 `Math.random`）。模拟需要"人为的随机输入"，做法：

```js
// 在脚本侧（不在 game-core 内）用带种子的伪随机生成玩家操作，
// 再喂给 game-core 的确定性判定函数。
function mulberry32(seed) { /* 32 位 PRNG，可复现 */ }
```

- 种子固定（如 `--seed 42`）→ **结果可复现**，同一个种子跑两次输出逐字节一致；
- 断言：`node tools/sample-hook-hitrate.mjs --simulate 1000 --seed 42` 两次输出相同。

这条断言的意义：**"模拟"也必须是可复现的**，否则它和拍脑袋没区别。

#### 3.2.2 局限声明（写进 EVD）

| 模拟能证 | 模拟不能证 |
|---|---|
| 判定函数在给定输入分布下的命中比例 | 真实玩家的操作分布（手抖、延迟、屏幕尺寸） |
| 参数改动对命中率的方向性影响 | 低端机帧率对连点/蓄力的影响 |
| 规则是否自相矛盾 | 触屏手势与视觉反馈的匹配度 |

### 3.3 真机操作手册（TASK-4010 的 C3）

新建 `docs/06_validation/templates/device-lab-manual.md`，把"补验证"变成机械动作：

| 步骤 | 动作 | 产出 |
|---|---|---|
| ① | 打开 Cocos Creator，构建微信小游戏包（`npm run check:bundles` 先确认分包） | `client/build/wechatgame/` |
| ② | 微信开发者工具导入，真机预览 | 手机上的游戏 |
| ③ | 依次进入**五个面板**（打捞/背包/合成/榜单/商人），每面板录 10s | 5 段录屏 |
| ④ | 走 6 态：正常 / 空 / 加载 / 错误 / 冲突 / 无权限（`DESIGN-0001`） | 每态一张截图 |
| ⑤ | 连打 20 钩，把 `hitrate.jsonl` 导出（调试面板或 `console.log` 转存） | 1 个 JSONL |
| ⑥ | 3 人重复 ③-⑤ | 3 × (5 录屏 + 6 截图 + 1 JSONL) |
| ⑦ | 跑 `node tools/sample-hook-hitrate.mjs --from hitrate.jsonl` | `EVD-4011/hitrate.md`（MEASURED） |
| ⑧ | 更新 `EVD-4010/README.md` 五要素 | 判定从 UNKNOWN → PASS/FAIL |

**⑥ 的"3 人"是硬要求**：单人采样无法区分"个人手残"与"判定过难"。

### 3.4 EVD-4010 / EVD-4011 落盘（本步实际交付）

#### 3.4.1 `EVD-4010/README.md`

```markdown
## ① 命令
（无真机 → 本项无命令；替代命令：npm run check:types + npm test）

## ② 输出
（替代证据输出原文）

## ③ 时间
2026-10-27

## ④ commit
（W3 三个提交的 hash）

## ⑤ 判定
| 验收项 | 判定 | 缺什么 | 何时补 |
|---|---|---|---|
| 四/五面板可进入 | UNKNOWN | 真机录屏 | 有设备时按 device-lab-manual §③ |
| 六态展示正确 | UNKNOWN | 真机截图 | 同上 §④ |
| 冷启动 ≤5s | UNKNOWN | 真机计时 | 同上 |
| 无崩溃 | UNKNOWN | 真机运行 | 同上 |
替代证据：类型检查零错 + 走查清单（见 walkthrough.md）
```

#### 3.4.2 `EVD-4011/README.md` + `hitrate.md`

- `README.md` 五要素；
- `hitrate.md` 由脚本生成，**必须带 `SIMULATED` 标签**；
- 判定：`命中率基线 = UNKNOWN（MEASURED 缺失）`，`理论基线 = SIMULATED 通过/不通过`。

#### 3.4.3 `EVD-4011/hitrate.jsonl`（dry-run 或 simulate 的产物）

保留原始数据，供将来对比。

## 4. 验收断言

| # | 断言 | 命令 | 期望 |
|---|---|---|---|
| V-5.1 | 脚本可 dry-run | `node tools/sample-hook-hitrate.mjs --dry-run` | `EXIT=0`，输出含三指标 |
| V-5.2 | 模拟可复现 | 同参数跑两次 `--simulate 1000 --seed 42` | 两次输出 diff 为空 |
| V-5.3 | 标签正确 | `grep -c "SIMULATED" docs/06_validation/evidence/EVD-4011/hitrate.md` | ≥1，且**不含** `MEASURED` |
| V-5.4 | EVD-4010 五要素齐 | `ls docs/06_validation/evidence/EVD-4010/` | `README.md` + `walkthrough.md` |
| V-5.5 | 手册可交接 | `ls docs/06_validation/templates/device-lab-manual.md` | 存在且 ≥8 步 |
| V-5.6 | 未伪造数据 | `grep -riE "实测|真机测试通过" docs/06_validation/evidence/EVD-4010 docs/06_validation/evidence/EVD-4011` | **0 命中**（除非附真机录屏文件名） |

> **V-5.6 是本步的红线守卫**：任何"实测"字样若没有对应录屏文件，即为伪造。

## 5. 提交边界（一次提交）

```text
feat(4010,4011): 命中率采样脚本（dry-run/simulate/from）+ 真机交接手册 + UNKNOWN 证据落盘

- tools/sample-hook-hitrate.mjs：三模式（--dry-run / --simulate <n> --seed <s> / --from <jsonl>）
- docs/06_validation/templates/device-lab-manual.md：8 步真机操作手册
- docs/06_validation/evidence/EVD-4010/：五要素 + UNKNOWN 逐项缺项说明 + 走查清单
- docs/06_validation/evidence/EVD-4011/：五要素 + hitrate.md（SIMULATED 标签）+ hitrate.jsonl
```

## 6. 风险与回退

| 风险 | 概率 | 影响 | 预案 |
|---|---|---|---|
| `SIMULATED` 被当成 `MEASURED` 混进出口条件 | **中** | v1.0 出口判定失真 | V-5.3 + V-5.6 双守卫；`hitrate.md` 首行强制写数据来源 |
| 脚本依赖 `game-core/hook` 的内部实现细节 | 中 | 后者重构时脚本坏 | 只 import 公开导出（`isHit`/配置常量），不 import 内部函数 |
| 未来真机导出格式与脚本不匹配 | 中 | 返工 | §3.1.1 的 JSONL 契约即接口定义，导出时必须照此 |
| 无真机但用户要求"必须验证" | 低 | 冲突 | 引用 G-07 与用户 10-23 的决定，不改判定 |
