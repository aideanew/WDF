---
id: GOV-0004
title: 文档编号与格式标准
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 文档编号与格式标准

## front matter（必填）
```yaml
---
id: REQ-F-0012          # 全局唯一
title: 一句话标题
status: draft|active|done|superseded|cancelled|obsolete
module: raft            # 可选；与 module-catalog.json 的 id 一致
owner: hark
created: 2026-10-23
review: 2026-11-23      # 活跃文档必填
related: [SOL-0003, ADR-0004]
---
```

## 编号前缀
| 前缀 | 含义 | 目录 |
|---|---|---|
| GOV | 治理规范 | 00_governance |
| PRD | 产品定义 | 01_product |
| REQ-INBOX / REQ-F / REQ-NF / REQ-C | 原始想法 / 功能 / 非功能 / 约束 | 02_requirements |
| ARCH / SOL / ADR / DATA / UI | 架构 / 方案 / 决策 / 数据 / 界面 | 03_solution |
| PLAN / MS | 计划 / 里程碑 | 04_planning |
| TASK | 任务 | 05_execution |
| VAL / EVD | 验证 / 证据 | 06_validation |
| REL / CMP | 发布 / 合规 | 07_release |
| KB | 知识 | 08_knowledge |

## 写作规则
- 文件名：`<ID>-<短名>.md`（如 `REQ-F-0012-raft-demolish.md`）。
- 大白话；表格优先；不复制代码事实（字段结构以 schema/迁移为准，文档只解释为什么）。
- 每条决定带时间；推翻旧决定时旧文档改 `superseded` 并指向新文档。
