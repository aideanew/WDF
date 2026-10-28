# EVD-7022 —— ADR-0014：广告奖励的防作弊与发奖口径（D-48=B）

- **对应任务**：plan-v010 TASK-7022（`05-slices-and-cards.md`）
- **执行者**：主控
- **独立验收者**：子智能体（防自证循环，结论 **PASS**，完成度 100%）
- **采集时间**：2026-10-28
- **前置裁决**：D-48 = **B**（adUnitId 构建期常量，gitignore）

## 处置结论（按 D-48=B，**决策记录卡**）

本卡**不开工写服务端回调**，只产出 ADR-0014 记录防作弊与发奖口径。
ADR-0014 状态 `accepted`（用户 2026-10-28 批量拍板），选 A（只信客户端完成 + 日限），
**诚实声明"可被刷"**，服务端不复核广告是否真看完（无此回调机制）。

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | front matter 齐全 + 三选项各带代价 | **PASS** | ADR-0014 第 1-9 行；§2 表 A/B/C（作弊成本/封号可查性/代价） |
| 2 | 明确"可被刷"不美化（3 处直陈） | **PASS** | 第 13/20/45 行 |
| 3 | 事实基线可核（F-2 桩 / F-3 无 adUnitId / F-4 todo） | **PASS** | `WechatPlatform.ts:11`、`ad_placements.csv` 表头、`handlers.ts:64` |
| 4 | 到期/回访条件（触发 + 回访动作） | **PASS** | §4：微信提供服务端回调或大规模刷奖 → 重开 ADR |
| 5 | 边界：零代码改动 | **PASS** | `server/src`、`client/assets/scripts`、`packages/contracts`、`tools/gen` 零改动；仅 docs |

## 反证（独立验收者）

- F-1（无服务端回调）归因诚实：来源标为 SDK API 面 + 桩 TODO，未谎称已核官方文档（主控 WebFetch 被网络限制，按规程记为备注而非否决）。
- 非阻断备注：
  1. F-1 未核官方文档，归因诚实、无过度声明；可回访时补官方文档链接。
  2. ADR-0014 状态 `accepted` 与本仓 ADR 惯例一致（ADR-0012/0013/0015 同）。
  3. F-3 措辞微瑕：CSV 实为 4 列（含 `note`），"只有"二字略省了 `note` 列；材料事实"无 `adUnitId` 列"准确。

## 变更清单（单卡）

- `docs/03_solution/decisions/ADR-0014-ad-reward-verification.md`（新增）
- `docs/00_governance/document-index.md`（gen:docs，ADR-0014 行）

原始输出：`acceptance.txt`。
