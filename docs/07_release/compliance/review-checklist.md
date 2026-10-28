---
id: COMP-002
title: 提审核对清单
status: active
owner: hark
created: 2026-10-23
review: 2026-11-23
---

# 提审核对清单

> 依据：`docs/01_product/design-source/立项评审-Hark回答.md`（合规相关章节）。
> **纪律**：勾选前必须有可复现的证据（命令输出 / 录屏 / 截图路径）。勾不出来的项留 `[ ]` 并在备注写清卡在哪。
> **W3-1（2026-10-28，FIX-11）**：17 项中 **4 项可机检**（标注【机检：npm run release:check】，见 §8），
> 由 `npm run release:check` 脚本判定；其余 13 项需真机 / 资质 / 人工，仍留 `[ ]`，待提交时验证。

## 1. 功能测试

- [ ] **v1.0 范围内**的核心流程正常、无阻断性 Bug：
      启动 → 登录 → 出钩打捞 → 背包 → 制作 → 扩筏 → 商人回收 → 开箱 → 每日一海 / 排行榜。
- [ ] **开箱≠开锁**：v1.0 **只做无锁开箱**（`chests.csv` 三行 `lock` 全为 `none`）【机检：npm run release:check】；
      完整开锁矩阵（3 箱 × 5 锁 = 15 组合）按设计源「第三层：首版建议延期」，**不在本版范围**。
      提审材料与截图**不得出现开锁界面**（此句为内容约束，需人工核提审材料，非机检）。

> 依据：`对话讨论.txt:5117`「第三层：首版建议延期 —— 所有材质箱子与五类锁组合形成的完整开锁矩阵」。

## 2. 异常与断网处理

- [ ] 弱网 / 断网：给出明确提示，可重试或返回主界面，无无响应卡死。
- [ ] 服务端错误码六态（`success`/`empty`/`loading`/`error`/`noPermission`/`conflict`）在关键面板可见。

## 3. 权限与隐私合规

- [ ] 无非必要权限请求（麦克风 / 摄像头 / 通讯录等）。
- [ ] **未接入项如实声明**：实名、防沉迷、隐私协议弹窗当前均为**桩 / 未实现**，
      见 [copyright-materials.md](copyright-materials.md) §6。**不得在提审材料中宣称已接入。**

## 4. 包体大小

- [ ] 微信小游戏主包 ≤ 4MB【机检：npm run release:check】；分包策略无误，不导致长时间黑屏（分包需真机）。
- [ ] 用 `npm run check:bundles` 复核 Asset Bundle 结果。

## 5. 广告组件

- [ ] 广告（Banner / 激励视频 / 插屏）调用逻辑正确，未遮挡核心 UI。
- [ ] 广告位数量**不超过 9**（三币制设计的硬上限，见 `docs/01_product/mvp-scope.md`）【机检：npm run release:check】。

## 6. UI 适配

- [ ] 主流机型（刘海屏 / 挖孔屏 / Pad）适配，核心操作区不被遮挡。
- [ ] **微信 PC 端优先**（本项目明确优先保证微信 PC 兼容）。

## 7. 配置与版本一致性

- [ ] 提审材料里写的 `configVersion` 与 `client/assets/resources/config/_manifest.json` **一致**【机检：npm run release:check】。
      当前值：`20a313a478737571`（**不要手写，改配置就会变；抄之前先 `cat` 一遍**）。
- [ ] `npm run verify` 全绿（含类型检查 —— 2026-10-27 起才真正包含，见 `plan-v009` F-43）。

## 8. 机检项（W3-1，2026-10-28，FIX-11）

> 本节 4 项由 `npm run release:check` 一键判定（脚本 `tools/release/check.mjs`），
> 无需人工勾选；提交时跑一次并把输出存档为证据即可。**注意**：勾选规则仍以 §1~§7 的 `[ ]`
> 为准（机检通过≠已勾选，勾选动作留给提交人确认）。当前 17 项全部未勾选（勾选方框计数 = 0）。

| # | 机检项 | 判定 | 证据命令 |
|---|---|---|---|
| 1 | configVersion 与两份提审文档一致 | manifest 实测值 = 文档所写值 | `npm run release:check` |
| 2 | 微信小游戏主包 ≤ 4MB | 原始字节和 ≤ 4MB | `npm run release:check` |
| 3 | chests.csv 3 行且 lock 全 `none` | v1.0 只做无锁开箱 | `npm run release:check` |
| 4 | 广告位每日上限合计 ≤ 9 | ∑ daily_cap ≤ 9 | `npm run release:check` |
