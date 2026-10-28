# EVD-7021 —— 激励视频适配器真实现（D-48=B：adUnitId 构建期常量）

- **对应任务**：plan-v010 TASK-7021（`05-slices-and-cards.md`）
- **执行者**：主控
- **独立验收者**：子智能体（防自证循环，结论 **PASS**，完成度 100%）
- **采集时间**：2026-10-28
- **前置裁决**：D-48 = **B**（adUnitId 构建期常量，gitignore，不入库）

## 处置结论（实现，非占位）

`WechatPlatform.showRewardedAd` / `DouyinPlatform.showRewardedAd` 不再恒返回 `'no-fill'`：
经共享 `RewardedAdController`（`platform/rewardedAd.ts`）按位面缓存 `wx./tt.createRewardedVideoAd({adUnitId})` 实例，
`onClose(res)→res.isEnded?'completed':'closed'`、`onError→'error'`、无 adUnitId 或 `show()` 失败 → `'no-fill'`。

## D-48=B 落地

- `client/assets/scripts/platform/ad.config.ts`（**gitignored，不入库**）导出 `AD_UNIT_IDS`（wechat/douyin 各一映射）。
- 本地开发：复制 `ad.config.example.ts`（**committed 模板**）为 `ad.config.ts` 填入微信/抖音后台广告位 ID。
- 未填写的位面 → `'no-fill'`（不假装有广告，诚实边界）。
- `.gitignore` 增 `ad.config.ts` + `ad.config.ts.meta`；两新 `.ts` 文件带 `.meta`（Cocos typescript importer，uuid 新生成）。

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | 四种返回值可被构造（completed/closed/error/no-fill） | **PASS** | `rewardedAd.ts`：onClose isEnded→completed / !isEnded→closed；onError→error；无 adUnitId 或 show 失败→no-fill |
| 2 | 实例复用（不重复 create） | **PASS** | `rewardedAd.ts`：`entries.get(placement)` 命中直接复用；仅首次 `create()` |
| 3 | 不 import `'cc'` | **PASS** | 四个改动文件 grep `from 'cc'`/`import 'cc'` 无命中（仅注释提及） |
| 4 | 抖音同构 | **PASS** | `DouyinPlatform` 同 `WechatPlatform`，仅 `tt.` 注入 |
| 5 | D-48=B 一致性：ad.config.ts gitignored 不入库 | **PASS** | `git check-ignore` 命中；`git ls-files` 无 ad.config.ts |
| 6 | typecheck:client | **PASS** | exit 0，0 错 |

## 反证（独立验收者）

- **Cocos 运行时不可测**（沙箱无编辑器，`01 §5`）→ 验收为类型检查 + 代码审查；新 `.ts` 的 `.meta` 由编辑器打开时生成（已手工补 committed 新文件 `.meta`，uuid 唯一）。
- 无真实 adUnitId（微信/抖音后台，仓库不可得）→ `ad.config.ts` 为空映射，实际 `showRewardedAd` 暂返回 `'no-fill'`；机制已就绪，填入 ID 即生效。非缺陷（D-48=B 诚实边界）。
- `showRewardedAd` 当前**无调用点**（features/services 未接广告位）→ 本卡只做适配器，消费方在 v1.1 效果模块。

## 变更清单（单卡）

- `client/assets/scripts/platform/{rewardedAd.ts, ad.config.example.ts}`（新增）+ `.meta`
- `client/assets/scripts/platform/wechat/WechatPlatform.ts`、`douyin/DouyinPlatform.ts`（showRewardedAd 实现）
- `.gitignore`（ad.config.ts + ad.config.ts.meta）

原始输出：`typecheck-client.txt`。
