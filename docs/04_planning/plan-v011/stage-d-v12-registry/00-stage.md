---
id: PLAN-V011-D
title: plan-v011 · 阶段 D（v1.2 运营）· 1 张原子任务卡 + 二版登记
status: active
module: planning
owner: hark
created: 2026-10-29
review: 2026-11-12
related: [PLAN-V011-C, PLAN-V011-10]
---

# 阶段 D · v1.2 运营（只有一张卡，因为其余全是外部条件）

## 1. 本阶段为什么只有一张卡

| 想做的事 | 为什么现在不能排成任务卡 |
|---|---|
| 合规去桩（实名/防沉迷真实化） | 需要微信 **appid + appsecret + 主体资质**（`D-51`），代码侧只剩"接线"（`server/src/modules/compliance/service.ts:41-43` 已明确 `platform` 模式抛错不伪装） |
| 真机 6 态验收（EVD-4010） | 需真机 + 人工录屏 4 个 MP4，**不是代码任务** |
| 首钩命中率真人采样（EVD-4011） | 需真机累计 20 钩（D-52 `human`） |
| 抖音提审 | 软著下证后才提（`mvp-scope.md:74`） |
| v2.0（PVP/交易/远洋） | **只登记，不建表不建目录**（N-3） |

> 把以上四项写成"任务卡"就是**伪造任务**（§13.3）。所以本阶段只保留一张真正有代码活的卡（PD7-17），
> 其余四项以"解除条件"的形式登记在 `§3`。

---

# PD7-17 合规去桩与提审门禁收口（**条件卡 / BLOCKED**）

- 阶段 / 角色 / 规划版本：D / planner+executor / PLAN-R4
- 来源（E1）：D-45=B（推迟 v1.1）+ D-51（`BLOCKED-HUMAN` 口径）+ `mvp-scope.md:57`（实名、防沉迷、隐私协议）

## 归属
- 所属切片：SD-1
- 来源需求：mvp-scope §5 v1.0 第 8 条（:57）→ 设计源 v5.5 §11 → ADR-0015
- 来源方案：`ADR-0015-compliance-state.md`

## 目标
`compliance.check` 在 `WDF_AUTH_MODE=platform` 下返回**真实**实名状态与未成年人时段限制，而不是 `verified = playerExists()`。

## 输入
- 文档：`server/src/modules/compliance/service.ts:13-16`（恒真桩）、`:41-43`（platform 模式抛错）
- 契约：`ComplianceRes { verified, minor, playableUntil?, offlineAllowanceMs }`（已冻结）
- 前置任务：无代码前置
- **前置状态：微信 appid + appsecret + 主体资质（缺失 → 本卡 `BLOCKED`）**

## 输出
- `server/src/modules/compliance/service.ts`（接真实 code2session + 实名查询）
- `client/assets/scripts/services/net/RpcClient.ts`（删除或收紧 `MOCK_HANDLERS.compliance.check`，`02 §1.6` R-5）
- `client/assets/scripts/features/compliance/**`（18 行空壳 → 真实：时段外拦截 UI）
- `docs/07_release/compliance/` 材料补齐（4013）

## Execution Steps
1. [ ] 拿到 appid/secret/资质 → 置 `WDF_AUTH_MODE=platform`
2. [ ] `service.ts`：`code2session` 换 openid → 查实名状态 → 返回真实 `minor` 与 `playableUntil`
3. [ ] 未成年人时段判定（22:00–08:00 → `2101`）
4. [ ] 客户端：删除 `MOCK_HANDLERS.compliance.check`（或加 `if (import.meta.env?.DEV)` 守卫）
5. [ ] 客户端：`noPermission + next:'wait'` 态落地（`ux.ts:20` 已定映射）
6. [ ] `npm run release:check` 机检项全绿

## 验收标准
- [ ] A1 `command`：`npm run release:check` → 机检项全 PASS
- [ ] A2 `assert`：`grep -c "verified = playerExists" server/src/modules/compliance/service.ts` → 0
- [ ] A3 `assert`：`MOCK_HANDLERS` 里不再有 `compliance.check`（或仅在 dev 分支）
- [ ] A4 `manual`：真机未成年账号在 22:30 登录 → 收到 `2101` 且 UI 显示"未成年人当前时段不可游玩"

## 验证命令
```bash
npm run release:check
grep -n "playerExists" server/src/modules/compliance/service.ts
```

## 证据路径 `docs/06_validation/evidence/EVD-7117/`
## 允许修改
- `server/src/modules/compliance/**`、`client/assets/scripts/features/compliance/**`
- `client/assets/scripts/services/net/RpcClient.ts`（**仅 MOCK_HANDLERS 段**）
- `docs/07_release/compliance/**`

## 禁止修改
- `packages/contracts/src/compliance/**`（`ComplianceRes` 已冻结）
- `packages/contracts/src/common/errors.ts`（`2101` 已存在）

## 依赖与阻塞
- Depends on：**微信 appid + appsecret + 主体资质**（外部）
- Blocks：微信提审
- 阻塞条件：资质未到位 → 保持 `BLOCKED`，**不得用 mock 冒充**（D-51 红线）

## 建议执行档位 `opus`　理由：合规/安全边界 + 提审强相关。
## 升级条件 若需新增错误码（如专门的实名失败码）→ 升 `fable`（要动冻结契约）。
## 预估规模 中（1–2 天，不含等资质的时间）

---

## 3. 本阶段不以任务卡形式登记的四件事（附解除条件）

| # | 事项 | 解除条件（逐字可执行） | 登记位置 |
|---|---|---|---|
| D-1 | 真机四面板六态录屏（EVD-4010） | 用户真机跑通 → 4 个 MP4 落 `docs/06_validation/evidence/EVD-4010/` | D-51 `recover_when.PD2-02` |
| D-2 | 首钩命中率真人采样（EVD-4011） | 用户真机累计 20 钩 → `node tools/sample/hook-hitrate.mjs --db <.local/pg 绝对路径>` → 三表入 EVD-4011 | D-51 `recover_when.PD2-01` |
| D-3 | 合规材料清单（4013） | 资质到位后随 PD7-17 一起交 | D-51 `recover_when.PD2-03` |
| D-4 | v2.0 范围（PVP/交易/远洋/AI 玩家） | **不解除**（v2.0 立项时才讨论） | `mvp-scope.md:68` |

**这四项的共同点**：没有一项是"代码待写"。把它们写成卡会制造"看起来在等代码"的假阻塞（D-51 原文）。
