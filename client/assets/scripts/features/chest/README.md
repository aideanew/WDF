# chest · 箱子与开锁

- 设定：v5.5 3.6/8.4；木/铜/铁箱x锁档、木箱可砸(损坏)、开锁连续命中失误归零、工具用一次断一根；赶海时服务器复核
- 权威：hybrid；联网：optional；资源包：app
- 数值表：chests, locks, drops, lockpick_tools；存档段：—
- 规则：`generated/game-core/chest`；接口：`generated/contracts/chest`
- 对外只暴露 `index.ts`；其他模块不得 import 本模块内部文件。
