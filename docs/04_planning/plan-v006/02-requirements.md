---
id: PLAN-V006-02
title: 需求基线复核
status: active
module: planning
---

# 3. 需求基线复核

## 3.1 复述与拆解
**核心目标**：完成 WDF 微信小程序项目 v1.0 的收口与测试闭环。当前已完成 UI 骨架、基础经济系统（商人与回收）、登录鉴权及存档云端同步。
剩余任务聚焦于：
1. **开锁与结算交互**：完善 `chest.open` 逻辑与 UI，提供保底收益。
2. **基础设施加固**：客户端 Rpc 自动补全 `rid` 以防止重复扣费。
3. **真机与合规**：真机验证降级处理，以及版号/隐私协议合规材料的归档。

## 3.2 MUST / SHOULD / COULD / MUST NOT
- **MUST**:
  - 新增 `chest.open` 动作处理开箱，验证所需连点次数。
  - RpcClient 自动补齐 `rid` 保证幂等性。
- **SHOULD**:
  - `chests.csv` 增加 `item_id`，解决 ID 映射断层。
  - 开箱降级策略：固定掉落 `item_0020`。
- **COULD**:
  - 无锁箱子的真实连点测试，通过依赖注入覆盖。
- **MUST NOT**:
  - 本阶段不实现 `buyQuota` 和 `ads.claim`（移至 v1.1）。
  - 不在客户端侧硬编码数值（坚守权威在服务端的底线）。

## 3.3 冲突清单
- `LOCK_HITS` 常量 vs `locks.csv`：采用 `locks.csv` 为唯一权威。
- `salvage.claimInfo` vs `chest.open`：废弃复用方案，采用新建动作 `chest.open`。

## 3.4 未知登记册
- **NON_BLOCKING**: 真机开锁触感与卡顿，留待真机验证任务评估，如不通过则回退方案。

## 3.5 隐含要求与前置条件
- **前置条件**：需先完成 `chests.csv` 的字段扩充与 `npm run gen`，再开始 `chest.open` 的实现。
