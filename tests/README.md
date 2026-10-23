# tests/

| 目录 | 内容 |
|---|---|
| `determinism/` | game-core：同种子同输入必同输出；存档校验与迁移；关键规则（浮力、开锁期望、潮汐、寻路） |
| `contract/` | 契约动作表 ↔ 服务端 handlers 一一对应；数值校验器对坏数据能报错 |
| `e2e/` | 端到端（接入真机/开发服后补） |
| `fixtures/` | 测试夹具（含故意写错的数值表） |

运行：`npm test`（Node 22 内置 test runner，零依赖）。
