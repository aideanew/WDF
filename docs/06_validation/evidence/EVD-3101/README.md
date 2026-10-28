---
id: EVD-3101
title: TASK-3101 主界面 Tab 导航 + 四面板桩 验收证据
status: active
module: app
owner: hark
created: 2026-10-26
related: [TASK-3101, DESIGN-0001]
---

# EVD-3101 · 主界面闭环验收证据

## 机器可验证项（已通过）
| 项 | 命令 / 路径 | 结果 |
|---|---|---|
| 客户端类型检查 | `npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit` | 本项目源码**零错误**（仅 Cocos 引擎自带 `.d.ts` 的严格模式噪声，与本项目无关） |
| 依赖边界 / 纯度 / 生成物 守卫 | `npm run guard` | 9/9 通过 |
| 全量测试 | `npm test` | 72/72 pass，0 fail |
| 未手改 generated | guard `生成物未手改且已同步` | 通过（本次未改 packages/*） |

## 人工验收项（headless 不可自动化，需录屏）
> 客户端 UI 依赖 `cc/env` 与渲染，无法在 Node/CI 跑通；按项目纪律由人工在 Cocos 编辑器或真机验收。

**步骤（预期）**
1. 打开 Boot 场景 → 出现标题"我的筏不可能这么大" + 状态行 + "进入主界面"按钮（初始置灰）。
   > 2026-10-28 更正：本行原写"奖励一颗麻籽"——那是**另一个项目的名字**，`BootController.ts:30` 的文案 bug 曾把预期写进本证据，已随代码一并修正（见执行台账 FIX-13）。
2. 启动链 `compliance.check` 通过 → 状态显示"合规通过，点击进入"，按钮可点。
3. 点击"进入主界面" → `account.login` mock 成功 → Boot UI 隐藏，进入主界面。
4. 主界面底部 4 个 Tab（打捞/背包/合成/榜单），右上角"设"按钮。
5. 默认在"打捞"Tab，内嵌 HookView，可蓄力出钩、命中入包（走 LocalSave；与历史 driftwood 脏写无关）。
6. 连点 打捞→背包→合成→榜单→打捞 往返 10 次：无报错、无白屏、无重复挂载（切换只 active 对应节点，不销毁重建）。
7. 背包/合成/榜单 首进显示统一空态文案：
   - 背包："还没有捞到东西，去打捞吧"
   - 合成："暂无可用图纸，先去打捞收集材料"
   - 榜单："本季还没有人上榜，先去打捞"
8. 点右上角"设" → 浮层"设置 / 设置项将在此陆续开放"；再点收起。
9. 出钩后回"背包"Tab → 仍为空态（桩体未接真实列表，A-3 负责覆写），不崩。

**录屏落点**：本目录 `EVD-3101-*.mp4`（人工补充）。

## 落地产物
- `client/assets/scripts/app/panel-types.ts`（PanelKey / PanelHandle / PanelFactory 契约）
- `client/assets/scripts/app/nav.ts`（navigate 枢纽）
- `client/assets/scripts/app/panel-ui.ts`（标题/空态构建工具）
- `client/assets/scripts/app/MainView.ts`（Tab 容器 + 切换 + 设置浮层）
- `client/assets/scripts/app/BootController.ts`（改写：合规→登录→进场）
- `client/assets/scripts/features/hook/view/HookPanel.ts`（HookView 包装）
- `client/assets/scripts/features/{inventory,crafting,leaderboard}/view/*Panel.ts`（空态桩）
- `client/assets/scripts/features/settings/view/SettingsPanel.ts`（设置浮层桩）
