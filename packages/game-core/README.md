# @wodefa/game-core

前后端共用的**确定性**规则。服务端直接引用；客户端由 `npm run sync` 复制到 `client/assets/scripts/generated/game-core/`。

## 铁律（guard 检查）
- 不 import `cc`、不 import 任何 Node/平台模块、不做 IO。
- 不用 `Math.random`（用 `common/rng`）、不用 `Date.now` / `new Date()`（时间由调用方传入）。
- 只用可擦除的 TS 语法：不用 `enum`、`namespace`、构造函数参数属性（便于 Node 直接运行测试、便于 Cocos/esbuild 编译）。
- 金币、重量、数量用整数；概率用万分比（0–10000）。
- 相对导入不写扩展名（Cocos 兼容）。

## 目录
`common/`（rng、result、time、math）· `save/`（存档 schema 与迁移链）· `generated/`（配置表类型，生成物）· `<module>/`（与 module-catalog 同名）
