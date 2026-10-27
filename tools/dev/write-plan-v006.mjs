import fs from 'node:fs';
import path from 'node:path';

const outDir = path.join(process.cwd(), 'docs/04_planning/plan-v006');

const files = {
  '00-snapshot.md': `---
id: PLAN-V006-00
title: 规划快照
status: active
module: planning
owner: hark
created: 2026-10-27
related: [PLAN-V005-00]
---

# 1. 规划快照

- **规划日期**: 2026-10-27
- **git_branch**: master
- **git_commit**: HEAD (已包含 4015, 4007, 4008 收口提交)
- **工作区是否干净**: true
- **代码状态**: \`npm run guard\` 通过，\`npm test\` 128/128 通过。
- **测试命令**: \`npm run guard && npm test\`
`,

  '01-fact-baseline.md': `---
id: PLAN-V006-01
title: 事实基线（含文档与代码不一致清单）
status: active
module: planning
---

# 2. 事实基线

## 2.1 已确认的事实
1. \`TASK-4015\`、\`TASK-4007\`、\`TASK-4008\` 的代码均已合入，且依赖的跨模块引用错误已被修复。
2. \`npm run guard\` 检查全绿（跨模块边界与生成物一致性已达标）。
3. \`npm test\` 128 个测试用例全绿，其中 \`2004\` 相关契约测试均已覆盖。
4. plan-v005 中指出的阻塞项 (F-01 ~ F-12) 绝大部分随着最新提交已不复存在。

## 2.2 文档与代码不一致清单
1. **箱子与物品 id 割裂**：\`chests.csv\` 使用 \`chest_wood\` 等标识，而背包中记录的为 \`item_0065\`，仍需在 \`chests.csv\` 中新增 \`item_id\` 字段。
2. **开锁配置不一致**：\`game-core/chest\` 硬编码了 \`LOCK_HITS\`，而 \`locks.csv\` 中定义了另一套开锁次数。
3. **沉船动作错位**：文档规划使用 \`salvage.claimInfo\` 进行开箱，但该动作语义为获取沉船信息；实际需新增 \`chest.open\` 契约。
4. **客户端幂等性缺失**：客户端写操作未传递 \`rid\` 字段，服务端 \`idempotency\` 防重机制无法在客户端重试时生效。
`,

  '02-requirements.md': `---
id: PLAN-V006-02
title: 需求基线复核
status: active
module: planning
---

# 3. 需求基线复核

## 3.1 复述与拆解
**核心目标**：完成 WDF 微信小程序项目 v1.0 的收口与测试闭环。当前已完成 UI 骨架、基础经济系统（商人与回收）、登录鉴权及存档云端同步。
剩余任务聚焦于：
1. **开锁与结算交互**：完善 \`chest.open\` 逻辑与 UI，提供保底收益。
2. **基础设施加固**：客户端 Rpc 自动补全 \`rid\` 以防止重复扣费。
3. **真机与合规**：真机验证降级处理，以及版号/隐私协议合规材料的归档。

## 3.2 MUST / SHOULD / COULD / MUST NOT
- **MUST**:
  - 新增 \`chest.open\` 动作处理开箱，验证所需连点次数。
  - RpcClient 自动补齐 \`rid\` 保证幂等性。
- **SHOULD**:
  - \`chests.csv\` 增加 \`item_id\`，解决 ID 映射断层。
  - 开箱降级策略：固定掉落 \`item_0020\`。
- **COULD**:
  - 无锁箱子的真实连点测试，通过依赖注入覆盖。
- **MUST NOT**:
  - 本阶段不实现 \`buyQuota\` 和 \`ads.claim\`（移至 v1.1）。
  - 不在客户端侧硬编码数值（坚守权威在服务端的底线）。

## 3.3 冲突清单
- \`LOCK_HITS\` 常量 vs \`locks.csv\`：采用 \`locks.csv\` 为唯一权威。
- \`salvage.claimInfo\` vs \`chest.open\`：废弃复用方案，采用新建动作 \`chest.open\`。

## 3.4 未知登记册
- **NON_BLOCKING**: 真机开锁触感与卡顿，留待真机验证任务评估，如不通过则回退方案。

## 3.5 隐含要求与前置条件
- **前置条件**：需先完成 \`chests.csv\` 的字段扩充与 \`npm run gen\`，再开始 \`chest.open\` 的实现。
`,

  '03-contracts.md': `---
id: PLAN-V006-03
title: 契约冻结包与数据模型
status: active
module: planning
---

# 4. 契约冻结包

1. **API**: 
   - 新增 \`chest.open\` (请求: \`itemId\`, \`hitsUsed\`；响应: \`success\`, \`rewards\`)
   - 保持 \`salvage.claimInfo\` 为 v1.1 预留。
2. **Errors**: 
   - 已冻结 15 个错误码（含 \`2004 BIND_TICKET_INVALID\`）。
3. **Identity**: 
   - 保持现有 JWT 机制，\`rid\` 在 RpcClient 层面统一注入。
4. **Resources**: 无新增。
5. **Events**: 无新增。
6. **UX States**:
   - 新增 \`lock-wait\` 态，用于处理连点等待。

# 5. 数据模型基线

- **chests.csv**: 需增加 \`item_id\` 列，用于与 \`items.csv\` 映射。
- **locks.csv**: 维持现有结构，作为开锁难度的权威源。
- 数据库结构暂无变更，保持 \`0001_init.sql\`。
`,

  '04-slices.md': `---
id: PLAN-V006-04
title: 垂直切片与基线指标
status: active
module: planning
---

# 6. 垂直切片清单

| 切片编号 | 切片名称 | 依赖契约 | 状态 | 理由 |
|---|---|---|---|---|
| S17-1 | RpcClient 幂等增强 | 全局写操作 | 待执行 | 解除双扣费隐患，所有写操作前置 |
| S17-2 | \`chest.open\` 开箱与降级 | \`chest.open\` | 待执行 | 核心交互闭环，解锁箱子机制 |
| S17-3 | 测试与真机收口 | 无 | 待执行 | 质量闸门 |

# 7. 基线指标

- 包体积限制：4MB（当前约 2.9MB，安全）。
- RpcClient 幂等拦截率：要求拦截 100% 的同请求重试。
`,

  '05-tasks-and-dag.md': `---
id: PLAN-V006-05
title: 原子任务卡全集与 DAG
status: active
module: planning
---

# 8. 原子任务卡全集

包含以下卡片（详情落入 \`docs/05_execution/tasks/\`）：
- **TASK-4020**: RpcClient 自动补齐 \`rid\`。
- **TASK-4009**: 开锁交互（chest+locks 接表）+ \`chest.open\` 动作。
- **TASK-4010 & 4011**: 真机验证与命中率采样。
- **TASK-4013**: 合规材料清单。
- **TASK-4016**: 文档对齐与收口。

## 8.1 依赖 DAG

\`\`\`mermaid
graph TD
    T4020[TASK-4020: RpcClient 幂等] --> T4009[TASK-4009: chest.open]
    T4009 --> T4010[TASK-4010 & 4011: 真机验证]
    T4010 --> T4016[TASK-4016: 文档收口]
    T4013[TASK-4013: 合规材料] --> T4016
\`\`\`

- **可并行组**：T4020 与 T4013 可并行。
- **关键路径**：T4020 -> T4009 -> T4010 -> T4016。

## 8.2 所有权矩阵

| Agent | 负责路径 |
|---|---|
| Agent-Contract | \`packages/contracts/**\` |
| Agent-Data | \`game-data/source/*.csv\` |
| Agent-API | \`server/src/modules/chest/**\`, \`server/src/gateway/**\` |
| Agent-App | \`client/assets/scripts/features/salvage/**\`, \`client/assets/scripts/services/net/**\` |

## 8.3 档位分配

- **TASK-4020**: sonnect (明确的工具层修改)
- **TASK-4009**: opus (涉及 UI 与核心机制联调)
- **TASK-4010/4011**: haiku (降级标 UNKNOWN)
- **TASK-4013/4016**: haiku (文档整理)
`,

  '06-summary.md': `---
id: PLAN-V006-06
title: 规划总结
status: active
module: planning
---

# 9. 落盘清单

- \`docs/04_planning/plan-v006/*\`: 规划全套文件。
- \`docs/05_execution/tasks/TASK-4020.md\`: 新增任务卡。
- \`docs/05_execution/tasks/TASK-4009.md\`: 覆盖更新任务卡。

# 10. 自检结果

- [x] 需求复核无遗漏，明确 D-19 ~ D-33 的所有落地项。
- [x] 契约补充 \`chest.open\` 并停用复用方案。
- [x] 任务卡前置条件明确，不存在不可达依赖。
- [x] 依赖图无环。
- [x] 遵循 \`npm run guard\` 的架构边界要求。

# 11. 本次规划的前提与局限
- **前提**：基于 2026-10-27 最新 commit 制定，假设无其他并行写冲突。
- **局限**：真机验证只能暂时降级为 UNKNOWN 待人复检。

# 12. 建议的第一刀与启动顺序
优先执行 **TASK-4020** 确保基础链路不重发，然后执行 **TASK-4009** 补齐最后一块核心玩法拼图。
`
};

for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(outDir, name), content);
}
