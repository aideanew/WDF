---
id: EVD-FIX-01
title: W1~W4 缺陷收口 验收证据（FIX-1~FIX-13，2026-10-28）
status: active
module: validation
owner: hark
created: 2026-10-28
related: [PLAN-V010-00, EXEC-BRIEF-0003, EVD-LEDGER]
---

# EVD-FIX-01 · W1~W4 缺陷收口验收证据

## 目标

规划者（用户）对全仓实证盘查发现的 FIX-1~FIX-13 缺陷，按 W1~W4 派工单逐卡收口；
本证据记录收口后的三项全量机检复跑数字与各卡提交号。

## 卡 → 提交对照（单卡一提交）

| 卡 | 内容 | 提交 |
|---|---|---|
| W1-1 | GameApp 接线（FIX-1，切后台保存生效） | `2a9f064` |
| W1-2 | 广告三效果冻结（FIX-2/R-1，D-49） | `a6f4a87` |
| W1-3 | 数字订正（FIX-3/FIX-4） | `61a2be5` |
| W1-4 | 过期注释订正（FIX-7） | `eb16ddd` |
| W2-1 | 文档索引规则收窄（FIX-5/R-5） | `0c96ec5` |
| W2-2 | 网络失败本地合成码 -1（FIX-6/R-3） | `8791ea4` |
| W2-3 | 占位值机检闸门（FIX-8/R-2） | `f436049` |
| W3-1 | 提审可机检项脚本化（FIX-11/R-2） | `8009cc4` |
| W3-2 | 口径登记 R-1~R-6（FIX 台账同步） | `17e2cb0` |
| W4 | 收尾：verify + placeholders + release:check 复跑 + 本证据 | 本提交 |

> FIX-13（启动页标题串项目，`5a2ff83`）在本批派工前已修；FIX-9（4 零引用服务）未派工，FIX-10（compliance 恒真桩）外部依赖不做。

## 三项机检复跑（2026-10-28，全量）

| 机检 | 结果 | 关键数字 |
|---|---|---|
| `npm run verify` | ✅ 0 退出 | 守卫 9/9；测试 **223/223**（219+4，docs-index 新增）；typecheck 双 0；configVersion `20a313a478737571` |
| `npm run placeholders` | ✅ 0 退出（report-only） | 占位值嫌疑 5 项：items.stack=99 / items.unlock_level=0 / recipes.unlock_level=0 / facilities.effect_bp=10000 / locks.zone_bp=0 |
| `npm run release:check` | ✅ 0 退出 | 4 项全过：configVersion 一致 / 主包 2.913MB≤4MB / chests 3 行全无锁 / 广告位合计 9≤9 |

## 结论

- v1.0 五环口径确立（R-6）：代码层 v1.0 = 捞→包→做→扩→卖，其余 13 个 v1 模块进 v1.1。
- FIX-1~FIX-8、FIX-11、FIX-13 已收口（10 项）；FIX-9 未派工、FIX-10 外部依赖不做、FIX-12（31 空表）仍登记。
- 全部复跑数字来自当场命令输出（`verify.txt` / `placeholders.txt` / `release-check.txt` 随附）。
