# scripts/（全部脚本，主包）

| 目录 | 职责 | 可以依赖 |
|---|---|---|
| `app/` | 启动、依赖装配、场景路由、生命周期 | 全部 |
| `platform/` | 平台适配（唯一允许 wx./tt.） | 仅 `platform/contracts` |
| `services/` | save net config time bus pool audio log | `platform/contracts`、`generated` |
| `ui-kit/` | 通用组件，零业务 | `services` |
| `features/<m>/model` | 用例与状态 | `generated`、`services`、其他模块的 `index.ts` |
| `features/<m>/view` | Cocos 组件 | 本模块 model、`ui-kit`、`services` |
| `generated/` | game-core、contracts、配置类型的副本（`npm run sync`） | — |
