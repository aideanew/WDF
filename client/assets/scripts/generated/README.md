由 `npm run sync` 从 packages/game-core 与 packages/contracts 复制而来，**禁止手改**（guard 校验哈希）。
同步采用「覆盖写 + 增量清理」，不会删除本目录下由 Cocos 生成的 `.meta`。
