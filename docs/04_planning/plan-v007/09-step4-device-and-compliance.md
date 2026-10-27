---
id: PLAN-V007-09
title: 步骤 4 · W3 真机降级（4010/4011）与合规清单（4013）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V007-07, PLAN-V007-03]
---

# 09 · 步骤 4：W3 真机降级与合规清单

> **一句话**：没有真机不是"不做"，而是"把没做记录得无懈可击，并把补做的路径铺好"。
> 本波与 W2 完全并行（不同目录、不同文件类型）。

## 1. 前置与边界

| 项 | 内容 |
|---|---|
| 前置 | 4011 的脚本可与 W0 并行；**采样执行**需 W1 完成（打捞/开箱流程定稿）；4013 随时可做 |
| 允许修改 | `tools/sample-hook-hitrate.mjs`（新建）、`docs/06_validation/templates/device-lab-manual.md`（新建）、`docs/06_validation/evidence/EVD-{4010,4011}/**`（新建）、`docs/07_release/compliance/{review-checklist,copyright-materials}.md` |
| 禁止修改 | 任何业务代码、`packages/**`、`server/**`、`client/**` |
| 出口 | V-3.1 ~ V-3.6 全绿 |
| 规模 | M（约 2 小时） |

## 2. 环境现实的辩证处理

### 2.1 三种敷衍方式（都要避免）

| 敷衍 | 后果 |
|---|---|
| 直接标 UNKNOWN 不做事 | 将来无法区分"环境没有"与"功能没写"，返工成本差一个量级 |
| 用模拟结果冒充实测 | 伪造，`14` 反作弊 #3/#4 直接打死 |
| 反复催真机 | 用户 10-23 已定"先本地开发"，催无效且跑题 |

### 2.2 正确形态：UNKNOWN 必须带三件套

| 件 | 内容 | 证明什么 |
|---|---|---|
| **C1 可执行化** | 采样脚本写好，`--dry-run` 能跑 | "有真机就能立刻用" |
| **C2 可模拟化** | 用 `game-core/hook` 确定性函数做蒙特卡洛，标 `SIMULATED` | 给出理论基线，且**明确不等价于实测** |
| **C3 可交接化** | 8 步真机手册 | "补验证"是 30 分钟的机械动作 |

**核心区分**：
- `MEASURED`（真机实测）= 没有 → `UNKNOWN`
- `SIMULATED`（模型推算）= 可以有 → 记 PASS，**但不得用于满足 v1.0 出口条件"首钩 ≥45%"**

## 3. 原子步骤

### 3.1 【4011-C1】采样脚本 `tools/sample-hook-hitrate.mjs`

#### 3.1.1 三种模式

| 模式 | 输入 | 用途 |
|---|---|---|
| `--dry-run` | 内置合成数据（3 人 × 20 钩） | 验证脚本自身逻辑 |
| `--simulate <n> --seed <s>` | `game-core/hook` 确定性函数 + 带种子 PRNG | 理论基线（可复现） |
| `--from <file.jsonl>` | 真机导出 | 真实采样 |

#### 3.1.2 JSONL 输入契约（**本步定义，未来照此导出**）

```json
{"ts":1761548400000,"player":"p1","session":1,"shotIndex":1,"firstHook":true,
 "pointer":4820,"power":0.62,"angleDeg":12.4,"hit":true,"targetDist":600}
```

#### 3.1.3 输出

- 控制台：总体 / 首钩 / 前 10 钩 / 分玩家；
- 文件：`docs/06_validation/evidence/EVD-4011/hitrate.md`（Markdown 表 + **首行数据来源标签**）。

#### 3.1.4 判定口径（对齐 `roadmap.md` 出口条件）

| 指标 | 阈值 |
|---|---|
| 首钩命中率 | ≥ 45% |
| 前 10 钩 | 40%–60% |

#### 3.1.5 必须打印的尾行

```text
数据来源：SIMULATED（game-core/hook 确定性函数，n=3000）   ← 或 MEASURED（真机 n=60）
判定：首钩 52.3% ≥45% ✅ | 前10钩 48.1% ∈[40,60] ✅ | 证据等级：SIMULATED（不满足出口条件）
```

**最后一句是本步的灵魂**：数值达标 ≠ 出口条件满足。

#### 3.1.6 可复现断言（C2 的守据）

```bash
node tools/sample-hook-hitrate.mjs --simulate 1000 --seed 42 > /tmp/a.txt
node tools/sample-hook-hitrate.mjs --simulate 1000 --seed 42 > /tmp/b.txt
diff /tmp/a.txt /tmp/b.txt    # 必须为空
```

**模拟也必须可复现**，否则它与拍脑袋没区别。PRNG 用 `mulberry32(seed)`，放在脚本侧（不进 `game-core`，那里禁随机）。

### 3.2 【4010-C3】真机手册 `docs/06_validation/templates/device-lab-manual.md`

8 步，每步给"动作 + 产出"：

| 步 | 动作 | 产出 |
|---|---|---|
| ① | `npm run check:bundles` 确认分包 → Cocos 构建微信小游戏 | `client/build/wechatgame/` |
| ② | 微信开发者工具导入 + 真机预览 | 手机可玩 |
| ③ | 进**五个面板**（打捞/背包/合成/榜单/商人），每面板录 10s | 5 段录屏 |
| ④ | 走 6 态（正常/空/加载/错误/冲突/无权限） | 每态 1 截图 |
| ⑤ | 连打 20 钩，导出 `hitrate.jsonl` | 1 个 JSONL |
| ⑥ | **3 人**重复 ③~⑤ | 3×(5+6+1) |
| ⑦ | `node tools/sample-hook-hitrate.mjs --from hitrate.jsonl` | `hitrate.md`（MEASURED） |
| ⑧ | 更新 `EVD-4010/README.md` ⑤ 判定 | UNKNOWN → PASS/FAIL |

> ⑥ 的"3 人"是硬要求：单人采样无法区分"个人手残"与"判定过难"。

### 3.3 【4010/4011】EVD 落盘

#### 3.3.1 `EVD-4010/README.md`

```markdown
## ⑤ 判定
| 验收项 | 判定 | 缺什么 | 何时补 |
|---|---|---|---|
| 五面板可进入 | UNKNOWN | 真机录屏 | 有设备时按 device-lab-manual §③ |
| 六态展示正确 | UNKNOWN | 真机截图 | 同上 §④ |
| 冷启动 ≤5s | UNKNOWN | 真机计时 | 同上 |
| 无崩溃 | UNKNOWN | 真机运行 | 同上 |
替代证据：类型检查零错 + 走查清单（walkthrough.md）
```

#### 3.3.2 `EVD-4011/`

- `README.md` 五要素；
- `hitrate.md` 首行标 `SIMULATED`；
- `hitrate.jsonl` 保留原始数据（`--simulate` 产物）。

判定：`命中率基线 = UNKNOWN（MEASURED 缺失）`；`理论基线 = SIMULATED 通过/不通过`。

### 3.4 【4013】合规清单实体化

#### 3.4.1 `review-checklist.md` 从 12 行空壳到可执行清单

现状：正文"待编写。"。按平台提审实际流程组织 **A~F 六组、≥20 个可勾选项**：

```markdown
## A. 主体与资质
- [ ] A1 营业执照 / 主体信息（与软著著作权人一致）
- [ ] A2 游戏自审自查报告
## B. 软著
- [ ] B1 软著登记证书（名称与游戏名一致）
- [ ] B2 源代码前 30 页 + 后 30 页（≥50 行/页，去注释与空行）
- [ ] B3 用户手册 / 设计说明书（≥30 页）
## C. 隐私与合规
- [ ] C1 隐私政策（与 `telemetry` 实际上报字段逐项核对）
- [ ] C2 用户协议
- [ ] C3 未成年人保护 / 防沉迷接入说明
- [ ] C4 个人信息收集清单
## D. 内容与玩法
- [ ] D1 概率公示（依赖数值表：当前 11/46 有数 → **只能公示已有部分**）
- [ ] D2 版号 / 备案信息
- [ ] D3 广告合规（`ad_placements` 3 处，激励视频不得诱导）
## E. 技术提审
- [ ] E1 主包 ≤ 平台限制（实测 2.913MB，EVD-4012）
- [ ] E2 分包配置（`npm run check:bundles` 三层全绿）
- [ ] E3 无外链、无未备案域名
## F. 版本一致性
- [ ] F1 提审包 commit = 打 tag 的 commit
- [ ] F2 `configVersion` 与 manifest 一致
```

**关键约束**：每项要么能勾，要么写明"为什么现在不能勾"（如 D1 因数值表空）。**不允许留"待编写"**。

#### 3.4.2 `copyright-materials.md` 只做核对（不重写）

现有 53 行有内容。末尾追加 `## 2026-10-27 核对记录`：

| 检查项 | 判据 | 结论 |
|---|---|---|
| 源代码页数要求 | 与当前平台要求一致？ | 一致 / 不一致 + 待办 |
| 用户手册页数 | ≥30 页（现有 GDD 可支撑） | — |
| 著作权人信息 | 与营业执照一致？ | — |
| 提交期限 | 原定"≤10-30"是否仍有效 | — |

## 4. 验收断言

| # | 断言 | 命令 | 期望 |
|---|---|---|---|
| V-3.1 | 脚本可 dry-run | `node tools/sample-hook-hitrate.mjs --dry-run` | `EXIT=0`，输出含三指标 |
| V-3.2 | 模拟可复现 | §3.1.6 的 `diff` | 空 |
| V-3.3 | `hitrate.md` 无 `MEASURED` | `grep -c "MEASURED" docs/06_validation/evidence/EVD-4011/hitrate.md` | **0** |
| V-3.4 | 未伪造实测 | `grep -riE "实测通过\|真机测试通过" docs/06_validation/evidence/EVD-4010 docs/06_validation/evidence/EVD-4011` | **0**（除非附录屏文件名） |
| V-3.5 | 清单无空壳、项数达标 | `grep -c "待编写" …review-checklist.md` → 0；`grep -c "^- \[ \]"` → ≥20 | 双达标 |
| V-3.6 | 手册 ≥8 步 | `grep -c "^| [①②③④⑤⑥⑦⑧]" docs/06_validation/templates/device-lab-manual.md` | ≥8 |

## 5. 提交边界（两次）

| # | 提交 | 内容 |
|---|---|---|
| 1 | `feat(4010,4011): 命中率采样脚本（dry-run/simulate/from）+ 真机交接手册 + UNKNOWN 证据落盘` | `tools/sample-hook-hitrate.mjs`、手册、两份 EVD |
| 2 | `docs(4013): 合规提审清单实体化（A~F 六组 ≥20 项）+ 软著材料时效核对记录` | 两份 compliance 文档 |

## 6. 风险与回退

| 风险 | 概率 | 影响 | 预案 |
|---|---|---|---|
| `SIMULATED` 被当成 `MEASURED` 混进出口条件 | **中** | v1.0 出口判定失真 | V-3.3 + V-3.4 双守卫；`hitrate.md` 首行强制写来源 |
| 脚本依赖 `game-core/hook` 内部实现 | 中 | 后者重构时脚本坏 | 只 import 公开导出 |
| 未来真机导出格式与脚本不匹配 | 中 | 返工 | §3.1.2 的 JSONL 即接口定义 |
| 合规清单写成"通用模板"无项目特征 | 中 | 提审被驳回 | 每项都要能指认本项目的具体文件/数值 |
