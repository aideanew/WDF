# tools/

| 命令 | 脚本 | 作用 |
|---|---|---|
| `npm run gen:config` | gen/config.mjs | CSV → 校验 → 客户端/服务端 JSON + 类型 + configVersion + 概率公示 |
| `npm run sync` | sync/to-client.mjs | game-core、contracts → client/assets/scripts/generated（带哈希清单） |
| `npm run gen:catalog` | gen/catalog.mjs | module-catalog.json → module-catalog.md、api-catalog.md；`--scaffold` 为新模块建骨架 |
| `npm run gen:docs` | gen/docs-index.mjs | 扫 front matter → document-index.md、task-index.md |
| `node tools/gen/conversation-log.mjs <日志目录>` | gen/conversation-log.mjs | 对话日志逐字导出到 docs/08_knowledge/sources/conversation-log |
| `npm run guard` | guard/run-all.mjs | 根目录白名单、依赖边界、game-core 纯度、模块目录一致、Bundle 规则、生成物未手改、文档 front matter |
| `npm run impact <词>` | guard/impact.mjs | 列出某个关键词（表名/字段/模块/动作）影响到的模块与文件 |

全部零依赖（只用 Node 22 内置模块），Windows/macOS/Linux 通用。
