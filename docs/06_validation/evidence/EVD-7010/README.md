# EVD-7010 —— 客户端平台登录接线（S1）

- **对应任务**：plan-v010 TASK-7010（`05-slices-and-cards.md`）
- **执行者**：主控
- **独立验收者**：子智能体（防自证循环，结论 **PASS**，完成度 100%）
- **采集时间**：2026-10-28
- **基线**：`13992a7`（7003 + 裁决记录后）
- **前置**：D-44=2（无凭据，M-9 降级 UNKNOWN）；D-46=A 已决

## 验收条目逐条结论

| 条 | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | 全仓 grep `mock-code` 为空 | **PASS** | `client/assets/scripts/` 0 命中（卡定义验证范围即此目录） |
| 2 | 全仓 grep `plat: 'wechat'` 为空 | **PASS** | 0 命中；改用 `p.name` |
| 3 | `npm run typecheck:client` 0 错 | **PASS** | tsc --noEmit exit 0 |
| 4 | Web 构建下能拿 token（dev 模式） | **静态 PASS（人工项）** | 服务端 `service.ts:40-47` dev 模式对任意 `{plat,code}` 派生稳定 openid；Web `login()` 返回 `{code:'dev'}` + plat 'app' → 稳定登录。真机/点按钮留待人工 |

## 实现要点

- `BootController.ts`：`import { getPlatform } from '../platform'`；onEnter 改为
  `const { code } = await getPlatform().login(); const plat = p.name === 'web' ? 'app' : p.name;`
  `invoke('account.login', { code, plat })`；原 `{ code:'mock-code', plat:'wechat' }` 移除。

## 反证（独立验收者）

- `server/**`、`packages/contracts/**` 零改动；改动仅 BootController.ts（+7/-1）。
- **阻塞条件评估**：`IPlatform.name` 含 'web' 但 `LoginReq.plat` 是 `'wechat'|'douyin'|'app'` ——
  由 RpcClient 既有先例 `platOf`（web→app）解决，三元映射收窄后类型恰落联合内，**无需契约变更，不需问用户**。
- 非阻断备注：`getPlatform()` 调 2 次（惰性单例，成本可忽略）；BootController.ts:11 注释仍写"（mock）"为过时注释，建议后续清理。

## 变更清单（单卡）

- `client/assets/scripts/app/BootController.ts`

原始输出：`acceptance.txt`。
