---
id: PLAN-V008-07
title: 步骤 3 · UI 收口（开箱面板 + addButton 抽取 + 六态走查）
status: active
module: planning
owner: hark
created: 2026-10-27
review: 2026-11-10
related: [PLAN-V008-06, PLAN-V008-08]
---

# 07 · 步骤 3：UI 收口

> ## ⚠️ 2026-10-27 17:35 修订（读设计源后）
>
> 设计源把「完整开锁矩阵」列为**首版建议延期**（`对话讨论.txt:5117`），且"每级工具能开哪些锁/耐久/各档收益"三项至今无定义（`5162`）。详见 `10-design-source-answers.md`。
>
> **本步范围因此缩为：无锁开箱 UI + `addButton` 抽取 + 六态走查。**
>
> 具体删除：
> - §3.1 的"锁档徽标"（改为只显示"可开"）
> - §3.2 的"开始开锁 → 开锁浮层 → 点 N 次"整条分支
> - `ChestOpenReq.hitsUsed` 参数（契约同步删，见 `06` §5）
>
> 保留：箱子卡列表、数量、开箱按钮、toast、六态、空态。
>
> 这意味着 **v1.0 的箱子页只有一件事可做：点一下就开**。这是设计源支持的最小实现，不是偷工。

> 执行者：**我本人**（用户 16:44 明确"尤其是UI设计和实现"）。
> **本步的特殊困难**：`client/**` 依赖 `'cc'`，Node 单测**天然测不到**。所以"测试绿"在本步**不构成任何证据**，只能靠 ① tsc 过滤式 ② 结构走查 ③ 人工录屏。

## 1. 现状盘点（实测）

| 项 | 状态 | 证据 |
|---|---|---|
| `app/panel-ui.ts` | 5 个导出：`addLabel` / `addTitle` / `addEmptyHint` / `addConfirmDialog`；**无 `addButton`** | `grep "^export function"` |
| `features/chest/view/ChestView.ts` | **11 行空壳**（只有 `@ccclass` + 空 `lateUpdate`） | `wc -l` → 11 |
| `features/inventory/view/InventoryPanel.ts` | 247 行，`:97-109` **手写按钮**（`new Node` + `Graphics.roundRect` + `Label`，13 行/个） | `grep -n "new Node"` |
| `features/economy/view/MerchantPanel.ts` | 已实现 3 商人切换 + 卖出，但 `:223` 类型错误（F-27，`05` 修） | tsc |
| 面板统一规格 | `contentSize(750, 1400)`，按钮 `196×58`，行高 `46`，首行 `y=60` | `MerchantPanel.ts:30-35` |

**结论**：开箱面板要从零写；顺带把 `InventoryPanel` 里重复两次的手写按钮抽成 `addButton`（4008 遗留收尾）。

## 2. TASK-5007a：抽 `addButton` 到 `panel-ui.ts`（去重复用）

**为什么先做**：`InventoryPanel:97-109` 与将要写的开箱面板会有 3+ 处同样的按钮绘制。现在抽，后面省 40 行重复代码；不抽，则同一段 `Graphics.roundRect` 被抄第 4 遍。

```ts
// client/assets/scripts/app/panel-ui.ts 追加
export interface ButtonOpts {
  parent: Node;
  name: string;
  text: string;
  pos: Vec3;
  size?: { w: number; h: number };            // 默认 196×58（与 MerchantPanel 一致）
  fill?: Color;                                // 默认金色系
  textColor?: Color;
  fontSize?: number;                           // 默认 22
  disabled?: boolean;
  onClick: () => void;
}

/** 统一按钮：圆角矩形底 + 居中文字 + 点击回调。所有面板必须用这个，禁止再手写 Graphics。 */
export function addButton(opts: ButtonOpts): Node { /* ... */ }
```

**验收**：
- [ ] `InventoryPanel.ts` 里 `new Node(\`Recycle_${i}\`)` 那段 13 行替换为 `addButton({...})`
- [ ] `grep -c "roundRect" client/assets/scripts/features/*/view/*.ts` 的结果里，除 `panel-ui.ts` 外**不得再有**（否则说明还有手写）
- [ ] 回收按钮的视觉与改动前**逐像素一致**（人工对比截图）

## 3. TASK-5007b：开箱面板设计（核心交付）

### 3.1 视觉规格（沿用现有面板语言，不引入新风格）

| 元素 | 规格 |
|---|---|
| 面板 | `contentSize(750, 1400)`，标题"箱子"（`addTitle`，y≈280） |
| 状态行 | y=152，字号 20，色 `#FFE28C`：显示"背包里共 N 个箱子" |
| 错误条 | y=106，字号 19，红 `#FF8080`（error / noPermission 共用同一位置） |
| toast | y=212，字号 22，绿 `#8FE3A0`，2 秒自动消失 |
| 箱子卡 | 每张 `700×120`，纵向间距 `128`，首张 y=**20** |
| 卡内左侧 | `96×96` 圆角方块（x=-282），填充色按材质：木 `#A9793F` / 铜 `#C87941` / 铁 `#8A9099`，块内显示材质首字 |
| 卡内中部 | 名称（字号 23，左对齐，x=-95 宽 240）+ 数量「持有 ×N」（字号 18，`#FFE28C`） |
| 卡内右侧 | 锁徽标（x=95，宽 130）：`无锁` 绿 / 有锁则 `铁锁·未开放` 灰 |
| 交互按钮 | `addButton`，`160×54`（x=245），文案随状态变：`开箱` / `开箱中…` / `未开放`（disabled） |

> **2026-10-27 实施偏差**（见 `00` §10 D-1~D-3）：
> - 原写"首张 y=60"→ 实测 y=60 时卡片顶到 120，与错误条（y=106）重叠，下移为 **y=20**；
> - 原写"状态行：今日已开 N 次 / 工具剩余 M"→ **改为"背包里共 N 个箱子"**。
>   服务端没有"今日已开次数"字段，v1.0 也没有开锁工具；编一个就是伪造数据
>   （同 `InventoryPanel` 不显示 weight 的理由：items 表 weight 0 填充）。
>   **`noPermission` 态同理**：原写"跳登录"，但登录入口在启动流程（`GameApp`/`BootController`），
>   面板层没有登录面板 → 实现为"文案 + 重试按钮"，不造假按钮；缺口已登记。

### 3.2 交互流

> **2026-10-27 修订**：`lock !== 'none'` 的整条分支（开锁浮层、点 N 次、`hitsUsed`）**已删**，
> 理由见本文顶部修订注记与 `10-design-source-answers.md`。以下为 v1.0 实际实现。

```
进入面板（onShow → load）
  → loading（preload(['chests','items']) + LocalSave.load()）
  → 配置表为空 → error（"配置表未就绪"）
  → empty（无任何箱子）| 列表（有箱子）
       ↓ 点「开箱」
       invoke('chest.open', { itemId })          ← 无 hitsUsed，无 rid
       ↓
  → success：toast「获得 木棍 ×1」+ applyOpen 落盘 + 列表重建（数量 −1）
  → error：1001 → "背包里没有这个箱子"；其他 → toUxState 文案 + 红条
  → noPermission：清列表 + "登录已失效" + 重试按钮
```

按钮状态机（三道闸，防止连点发两次请求）：

1. `opening !== null` → `openOne` 直接 return；
2. 请求发出前 `disableAllButtons()`（`setButtonDisabled`，只挡点击不改 `active`，避免布局跳动）；
3. 请求结束统一在 `finally` 里 `await load()` 重建列表 —— 数量刷新与按钮复位一次完成，
   不做手工回滚（中途抛错时手工回滚容易只恢复一半）。

### 3.3 六态映射（契约要求，逐态必查）

| 态 | 触发条件 | 界面表现（已实现） | 走查要点 |
|---|---|---|---|
| `loading` | 首次读配置/存档、请求在途 | 列表区"加载中…"；请求中按钮文字变"开箱中…"且 `disabled` | 连点不得发第二个请求（三道闸，见 §3.2） |
| `empty` | 背包内无任何箱子 | `addEmptyHint('还没有箱子，去海里捞一个吧')` + "去打捞"按钮 | 与"有箱子但都是其他物品"区分 |
| `success` | `c === 0` | toast「获得 X ×1」+ `applyOpen` 落盘 + 列表重建 | toast 不遮挡按钮（y=212，卡首 y=20） |
| `error` | 其他非 0 码 | `toUxState(c)` 文案 + 红条（y=106） | **1001 必须显示"背包里没有这个箱子"**（并发被抢的真实场景） |
| `noPermission` | `2001`/`2002` | 清列表 + "登录已失效，请重新登录" + **重试**按钮 | 不得显示成通用错误；登录入口不在面板层（缺口已登记） |
| `conflict` | — | **不适用**（`chest.open` 不产生 `accepted:false`） | 代码里无 `conflictOf` 调用 |

### 3.4 文件落点

| 文件 | 动作 |
|---|---|
| `client/assets/scripts/features/chest/view/ChestPanel.ts` | ✅ **新建**（导出 `createChestPanel(parent): PanelHandle`，key=`'chest'`） |
| `client/assets/scripts/features/chest/model/ChestModel.ts` | ✅ **重写**（原 11 行空桩 → `projectChests` / `applyOpen` / `ChestModel`，无 `cc`，Node 可测） |
| `client/assets/scripts/features/chest/view/ChestView.ts` | ✅ 保留空壳（场景挂载用） |
| `client/assets/scripts/app/panel-ui.ts` | ✅ 追加 `addButton` + `setButtonDisabled` + `setButtonText` + `BTN_W`/`BTN_H` |
| `client/assets/scripts/app/panel-types.ts` | ✅ `PanelKey` 加 `'chest'` |
| `client/assets/scripts/app/MainView.ts` | ✅ `TABS` 第 3 位加"箱子"、`factories` 加 `chest: createChestPanel` |
| `client/assets/scripts/features/inventory/view/InventoryPanel.ts` | ✅ 两处手写按钮（回收 / 去打捞）改走 `addButton`，清理 `Label`/`Graphics` 导入；补 `count <= 0` 守卫 |
| `tests/determinism/chest-flow.test.mjs` | ✅ **新建**（15 例，唯一能自动验证本步的测试） |

### 3.5 关键实现约束

1. **禁止在 view 里写业务判定**。`openable` 由 `ChestModel`（纯函数）决定，扣箱与发奖由服务端决定；view 只读结果。
2. ~~`hitsUsed` 上报值 = 玩家实际点击数~~ —— **该参数已从契约删除**（v1.0 不做开锁）。
   v1.1 恢复开锁时必须先在服务端按 `locks.csv` 复算，不得信任客户端上报。
3. **`invoke` 自动补 `rid`**（`RpcClient` 对 `idempotent:true` 自动生成并复用），所以**不要**自己传 `rid`，也不要在 `params` 里塞。
4. **禁止 `Math.random()`**：开箱结果是服务端权威，客户端不应有随机。
5. **`applyOpen` 必须先剥旧 checksum 再 `sealSave`**：漏了这一步 `LocalSave.load()` 的 `verifySave` 会永久失败 → 玩家开完箱重启就掉档（这是服务端 F-39 的客户端镜像，同一类错误）。

## 4. 验收（tsc 必跑，单测无效）

### 4.1 类型检查（唯一可自动化的一关）

```bash
npx -p typescript@5.8 tsc -p client/tsconfig.json --noEmit 2>&1 | grep -v "^C:/"
# 期望：空输出
```

- [ ] 零输出
- [ ] **含新增的 3 个文件**（`ChestPanel.ts` / `ChestModel.ts` / `panel-ui.ts` 改动）

### 4.2 结构走查（人工，逐条勾）

- [ ] `grep -n "new Node" client/assets/scripts/features/chest/view/ChestPanel.ts` —— 只允许面板根节点与容器节点，**不得有手写按钮**
- [ ] **按钮零手写**：`chest/` 下 `roundRect` 只允许出现在"卡片底板 / 材质色块"，**不得用于按钮**（`addButton` 已覆盖按钮）
  > 2026-10-27 修订：原写"`roundRect` 零命中"过严。`addButton` 只管按钮，卡片底与色块必须自绘。
  > 实测 2 处命中：`ChestPanel.ts:221`（卡片底）、`:231`（材质色块），均非按钮。
- [ ] `grep -n "rid" client/assets/scripts/features/chest/` —— **只允许出现在注释**（rid 由 `RpcClient` 补）
- [ ] `ChestModel.ts` 无 `import ... from 'cc'`（保证它能被 Node 直接单测）
- [ ] 六态分支在 `ChestPanel.ts` 里各有显式代码路径（`grep -c "renderLoading\|renderEmpty\|renderRows\|renderError\|renderNoPermission"`）

### 4.3 人工验证（录屏，不可省略）

| # | 步骤 | 期望 |
|---|---|---|
| 1 | 背包有木箱 → 打开箱子页 | 显示"木箱 ×N"，徽标"无锁"，按钮"开箱" |
| 2 | 点"开箱" | toast 显示奖励，数量 −1 |
| 3 | 连点两次"开箱"（第二次在请求返回前） | **只发一次请求**（按钮 disabled 生效） |
| 4 | 断网后点"开箱" | 显示网络错误（非崩溃、非无限转圈） |
| 5 | `rig` 成无箱子状态进页面 | 显示空态文案 |
| 6 | 强制造 `c=1001`（如并发把箱子扣掉） | 显示"背包里没有这个箱子"，**不是**通用错误 |

> 第 6 条是 F-28 修复的**用户可感知证据**：3103 时代这里会显示兜底文案。

### 4.4 证据

`docs/06_validation/evidence/EVD-5007/`：tsc 输出 + 6 段录屏（或 6 张关键帧截图）+ 结构走查命令输出。

## 5. 顺带修：4008 的三处收尾（`05` 之后的残留）

| # | 项 | 状态 |
|---|---|---|
| 1 | 抽 `addButton` | `05-5007a` 做 |
| 2 | 显式 `merchantId`（不再靠服务端兜底） | `05-5001` 修（`toMerchantId`） |
| 3 | `count <= 0` 守卫 | **待确认**：`grep -n "count" InventoryPanel.ts` 看是否已有 |

- [ ] 第 3 项：卖出前若 `count <= 0` 直接 return 并提示，不发请求
- [ ] 三项全绿后，4008 可标 `done`

## 6. 本步出口断言

| # | 断言 | 期望 |
|---|---|---|
| 1 | client `tsc` 零输出 | 空 |
| 2 | `chest/` 下无手写 `roundRect` | 零命中 |
| 3 | 六态各有代码路径 | 6/6 |
| 4 | 6 条人工验证全过 | 有录屏 |
| 5 | `npm run guard` 仍 9/9 | 通过 |

## 7. 本步不做

| 不做 | 原因 |
|---|---|
| 开锁动画序列帧 / 音效 | 无美术资源，`client/assets/` 下 7 个 Bundle 只有 README |
| 箱子 3D 或预制体 | 项目 0 个 `.prefab`，全部代码建节点 |
| `ChestView` 的 `lateUpdate` 脏标记渲染 | 面板生命周期由 Tab 容器管理，不引两套渲染机制 |
| 真机适配（刘海/安全区） | 用户 10-23 定"先本地开发"，走 UNKNOWN |
