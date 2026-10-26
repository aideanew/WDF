# CHANGELOG

格式：日期 · 版本 · 类型（新增/变更/修复/移除）· 一句话 · 关联 ID

## 未发布
- 2026-10-23 · 0.0.0 · 新增 · 建立工程目录与文档体系骨架 · ADR-0001~0006
- 2026-10-23 · 0.0.0 · 修复 · `tools/sync` 整目录删除改为覆盖写 + 增量清理，不再删 Cocos `.meta`，`verify` 恢复全绿 · KB-FIX-20261023-01
- 2026-10-23 · 0.0.0 · 新增 · 修复记录制度与索引（`08_knowledge/technical-notes/fix-log.md`）· KB-0003
- 2026-10-23 · 0.0.0 · 变更 · 现状复核：S0 已完成、S1 进行中，更新 `current-plan.md` 与 `structure-verification.md` · VAL-0003
- 2026-10-23 · 0.0.0 · 修复 · 根目录白名单补 `.workbuddy`（guard 与 GOV-0002 同步），`verify` 恢复全绿 · KB-FIX-20261023-02
- 2026-10-23 · 0.0.0 · 新增 · Cocos 英文界面中英对照（Bundle/功能裁剪/构建面板）· UI-0003
- 2026-10-23 · 0.0.0 · 新增 · 服务端技术选型落地：Fastify 5 + zod + PGlite（PostgreSQL 18.6 WASM，零安装本地开发）· ADR-0003/0004/0009
- 2026-10-23 · 0.0.0 · 新增 · 服务端 S1 四件打通：`account.login` / `compliance.check` / `config.manifest` / `save.pull` / `save.push`，含 HMAC 令牌、乐观锁、幂等表 · TASK-0104/0105/0107
- 2026-10-23 · 0.0.0 · 新增 · 客户端版本闸 `9001`（登记过 `config_release` 才生效，`config.manifest` 豁免）· MUST-09
- 2026-10-23 · 0.0.0 · 新增 · `tools/dev/probe-s1.mjs` 本地 HTTP 全链路探针（30 断言，可重复跑）与 `tests/integration/auth.test.mjs`（7 用例，内存库）· EVD-0104/0105/0107
- 2026-10-23 · 0.0.0 · 修复 · 坏签名/畸形令牌改回 `2002 SESSION_EXPIRED`，与冻结契约错误码语义一致 · KB-FIX-20261023-03
- 2026-10-23 · 0.0.0 · 修复 · PGlite 数据目录从 `server/.data` 迁到 `.local/pg`，不再打挂「无空目录」守卫 · KB-FIX-20261023-04
- 2026-10-23 · 0.0.0 · 修复 · 服务端依赖边界正则加起始锚点，不再误判 `gateway`/`core` 基础设施引用；`compliance` 改调 `account.service` · KB-FIX-20261023-05
- 2026-10-23 · 0.0.0 · 修复 · 版本闸豁免 `config.manifest`，消除旧客户端永久无法更新的自锁 · KB-FIX-20261023-06
- 2026-10-23 · 0.0.0 · 新增 · `tools/dev/check-bundles.mjs` + `npm run check:bundles`：逐项核对 7 个 Bundle 的 `isBundle`/`priority`/`compressionType`（带退出码）· KB-FIX-20261023-07
- 2026-10-23 · 0.0.0 · 修复 · Bundle 配置核对改用 `JSON.parse(fs.readFileSync())`，清除会 `SyntaxError` 的 `require('.meta')` 写法并校正事实基线 · KB-FIX-20261023-07
- 2026-10-23 · 0.0.0 · 修复 · Bundle 压缩类型配置位置纠错：v3.8 起在「项目设置 → Bundle Config」（官方变更），术语表 §1 拆分重写并给出 WeChat Mini Game 行需滚动的提示 · KB-FIX-20261023-08
- 2026-10-23 · 0.0.0 · 新增 · `check-bundles` 升级为三层核对（项目方案 builder.json / Bundle 级 .meta 覆盖 / 构建产物 game.json 的 subpackages）· KB-FIX-20261023-08
- 2026-10-23 · 0.0.0 · 变更 · ADR-0010：对三份外部结构/选型提案的辩证复核，维持 Fastify+PGlite，新增 E-07（payload schema 全覆盖）与开放数据域 backlog 条目 · ADR-0010
