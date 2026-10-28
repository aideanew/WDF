---
id: EVD-7001
title: 空壳清单工具（`npm run shells`）
status: accepted
owner: hark
created: 2026-10-28
review: 2026-11-28
---

# EVD-7001 —— 空壳清单工具（`npm run shells`）

- **对应任务**：plan-v010 TASK-7001（`05-slices-and-cards.md`）
- **执行者**：主控（工具作者）
- **独立验收者**：子智能体（防自证循环，结论 **PASS**）
- **采集时间**：2026-10-28
- **基线**：`61f5017`（双端一致）

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | `features/fishing` 判 shell、`features/chest` 判 ok | **PASS** | fishing：client 层 shell，有效行 14<15；chest：client 层 ok，有效行 443。见 `shells-json.txt` |
| 2 | 计数：client=15、server=4（不含 ops）、core 纯空壳=7、contracts=0 | **PASS** | client shell 集合精确 == {account,compliance,progression,sea,salvage,fishing,raft,crew,power,island,defense,event,social,ads,telemetry}（15）；server == {salvage,event,social,ads}（4，ops 不在 catalog 自然排除）；core == {progression,salvage,fishing,crew,power,island,event}（7）；contracts == 空（10 全 ok）。raft/sea/defense 判 ok（第三类：有函数但输入占位，非纯空壳） |
| 3 | 退出码恒 0（第一版不拦门禁） | **PASS** | 两种模式均 exit=0；实现末行 `process.exit(0)` |

## 判据说明（定义性卡，按实测修正验收）

纯空壳 = 该层无**可执行行为**。逐层判据：

- **client**：有效行 < 15。全部 15 个占位 feature 恰为 14 有效行（同一份脚手架模板）；真实 feature 均 >100 行。
- **core / server**：全部导出符号 ∈ `{MODULE, MODULE_ID, SERVICE}`（只有模块标识常量，无行为）。
- **contracts**：类型/请求响应定义即契约本体，永不判空壳。

**第三类（raft/sea/defense：写了代码但输入是占位值）不是纯空壳**，本工具不判它为 shell；
由 `02-requirement-inventory.md §3` 与 TASK-7004（占位值可区分）处理。

> 验收原稿写「core=8」，实测纯空壳为 **7**（crew/event/fishing/island/power/progression/salvage）。
> 原稿数字来自 `01-fact-baseline.md F2-4` 的「空壳」列（把 defense 计入，但该文件自身注释已承认
> defense 是第三类而非纯空壳），属自相矛盾，已修正为诚实口径。见 `05-slices-and-cards.md` 验收标准注。

## 命令复现

```bash
npm run shells            # 人类可读表，exit 0
npm run shells -- --json  # 机器可读 JSON，exit 0
```

原始输出：`shells-table.txt`（38 行）、`shells-json.txt`（59 条记录）、`guard.txt`（9/9 全绿）。

## 独立验收者结论（子智能体）

```
结论：PASS
完成度：100%（3/3 验收条目 PASS）
发现的问题：无阻断项。非阻断备注——contracts 层目前靠「必然导出类型」结构性质判 ok，
  建议 v2 拦门禁版加显式 `layer==='contracts'` 豁免（今日实测 contracts=0 已满足，不阻塞）。
```

## 变更清单（单卡）

- 新增 `tools/guard/shells.mjs`（空壳检测工具）
- 修改 `package.json`（scripts 加 `"shells"`）
- 修改 `docs/04_planning/plan-v010/05-slices-and-cards.md`（TASK-7001 验收数字修正为诚实口径）
- 未改 `tools/guard/checks.mjs`、`tools/guard/run-all.mjs`（第一版只报告不拦门禁）
