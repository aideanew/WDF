---
id: PLAN-V012-D
title: plan-v012 · 阶段 D（运营收口）· 1 张卡，BLOCKED-HUMAN
status: active
module: planning
owner: hark
created: 2026-10-30
review: 2026-11-13
related: [PLAN-V012-02, PLAN-V012-10]
---

# 阶段 D · 运营收口（本版不执行）

## 1. 为什么单独列一阶段而不是塞进 C 段

因为它的阻塞原因**不在代码里**：

| 阻塞项 | 事实 | 证据 |
|---|---|---|
| 实名/防沉迷真实链路 | 需要微信小程序 **appid** 与主体资质，仓库里没有 | `RpcClient.ts:177-190` 的 `MOCK_HANDLERS` 是唯一的合规实现 |
| 3 个 `BLOCKED-HUMAN` 遗留项 | 4010 录屏 / 4011 命中率 / 4013 资质 | `docs/06_validation/execution-ledger.md` 的 EVD-LEDGER 索引 |
| 软著提交 | `lifecycle.md:33` 的硬期限（2026-10-30） | 代码不可验证，只能用户侧确认 |

把它们放进 C 段会让 C 段的"出口条件"永远达不成 —— 这是**故意隔离**，不是遗漏。

## 2. 阶段出口条件

- [ ] appid 与主体资质到位（用户侧交付）
- [ ] `compliance.check` 走真实服务端判定，`MOCK_HANDLERS` 里该条被删除或加 `仅 dev 构建` 守卫
- [ ] 3 个 `BLOCKED-HUMAN` 项各有 EVD 证据
- [ ] 软著受理凭证归档

---

# PD8-17 合规去桩（真实实名 / 防沉迷链路）

- 阶段 / 角色 / 规划版本：D / executor / PLAN-R5
- 来源（E1）：`RpcClient.ts:177-190`（`compliance.check` 返回 `{verified: true}`）+ `server/src/modules/compliance/service.ts`（33 行）+ `R-6`

## 归属
- 所属切片：SD-1
- 来源需求：M-12
- 来源方案：`R-6` 的缓解方案原文「本版不改（属业务代码）；登记为独立缺陷，建议下一版第一张卡删掉或加"仅 dev 构建"守卫」

## 目标
`compliance.check` 在生产构建里**不再恒真**；未实名/未成年时长限制由服务端真实判定。

## 输入
- 文档：`R-6`、`compliance/service.ts` 33 行
- 契约：`compliance` 3 个动作（`packages/contracts`，**本卡允许改**——这是唯一解冻契约的卡）
- 前置任务：**无（但外部阻塞）**
- 前置状态：`MOCK_HANDLERS.compliance.check` 恒返回 `{verified:true}`；服务端有 33 行骨架

## 输出
- `server/src/modules/compliance/**`（真实判定）
- `client/assets/scripts/services/net/RpcClient.ts`（删 `MOCK_HANDLERS` 里的 compliance 条目，或加 `__DEV__` 守卫）
- `client/assets/scripts/features/compliance/**`（真实状态展示）
- `tests/determinism/compliance.test.mjs`（新建）

## Execution Steps
1. [ ] **[阻塞] 等 appid 与主体资质**：没有 appid 时**任何一步都不做**（做了也是桩换桩）
2. [ ] 服务端接微信实名接口（或平台方要求的等效接口），失败态必须可区分（未实名 / 接口故障 / 未成年限时）
3. [ ] 删掉 `RpcClient.ts` 的 compliance mock 条目（**这是 R-6 的正面修法**）
4. [ ] 客户端：未实名时拦截进游戏；未成年按平台要求限时
5. [ ] 写测试：`compliance.check` 在 mock 被删后，网络失败必须走"未验证"而非"已验证"

## 验收标准
- [ ] A1 `command`：`grep -c "verified: true" client/assets/scripts/services/net/RpcClient.ts` → **0**
- [ ] A2 `review`：`compliance/service.ts` 三条失败路径都有独立错误码（用已有 14 码，不自造）
- [ ] A3 `manual`：未实名账号进游戏被拦（真机截图）
- [ ] A4 `command`：`node --test tests/determinism/compliance.test.mjs` → PASS

## 验证命令
```bash
grep -rn "verified: true" client/assets/scripts/ || echo "OK: mock 已移除"
node --import ./tools/runtime/register.mjs --test tests/determinism/compliance.test.mjs
```

## 证据路径
`docs/06_validation/evidence/EVD-8117/`

## 允许修改
- `server/src/modules/compliance/**`、`client/assets/scripts/features/compliance/**`
- `client/assets/scripts/services/net/RpcClient.ts`
- `packages/contracts/**`（**唯一允许解冻契约的卡**，需先提交 ADR）
- `tests/determinism/compliance.test.mjs`

## 禁止修改
- 其他任何 feature
- `MOCK_HANDLERS` 里**除 compliance 外的条目**（其他 mock 有自己的卡）

## 依赖与阻塞
- Depends on：无（代码侧）
- Blocks：v1.0 上线（合规是上线前置）
- **阻塞条件：appid + 主体资质未到位 → `BLOCKED-HUMAN`，本版不执行**

## 建议执行档位
`fable`（若解除阻塞）　理由：涉及主体资质与真实身份链路验收，需逐字段裁决。

## 升级条件
不升级（已是最高档）。

## 预估规模
中（1~2 天，**不含**等资质的时间）
