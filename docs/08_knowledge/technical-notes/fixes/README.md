# fixes/ —— 问题修复记录（一条一个问题）

**用途**：所有"发现的问题 → 定位根因 → 修复 → 验证 → 回归风险"的过程留存。目的不是写日志，而是**一周后的人能照着复现并判断是否真的修好了**。

## 文件命名
`FIX-YYYYMMDD-NN-短横线英文描述.md`，NN 当天递增（`01`、`02`…）。

## front matter（必填）
```yaml
---
id: KB-FIX-YYYYMMDD-NN
title: 一句话说清修了什么
status: active          # active=已修复并验证；draft=未验证；superseded=方案被后来取代
date: YYYY-MM-DD
kind: bug | env | doc | perf | security
severity: P0 | P1 | P2 | P3
module: 受影响模块 id（见 module-catalog.json）；跨模块写 cross
owner: hark
related: [TASK-xxxx, ADR-xxxx, REQ-xxx]
---
```

## 正文必须有的六节
1. **现象**：看到什么（命令输出/报错原文/截图路径）。
2. **影响**：谁被卡住、卡多严重（能不能上线、会不会丢数据）。
3. **根因**：为什么会这样，指到文件与行号。
4. **修复**：改了哪些文件、改成什么样、为什么这样改（含放弃的方案）。
5. **验证**：跑过的命令 + 关键输出 + 判定 PASS/FAIL。**没有验证输出的不算修好。**
6. **回归与遗留**：可能影响谁、还有什么没做、下次谁该注意。

## 索引
每条写完必须登记到 [`../fix-log.md`](../fix-log.md)。
