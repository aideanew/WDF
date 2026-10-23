# economy · 金币与商人

- 设定：v5.5 9.1/9.2；原价/回收价50%/各地±30%、商人限购(高级开锁工具按区服每日限量由服务器发放)、竞争资产流水
- 权威：hybrid；联网：optional；资源包：app
- 数值表：prices, merchants, limits；存档段：wallet
- 规则：`generated/game-core/economy`；接口：`generated/contracts/economy`
- 对外只暴露 `index.ts`；其他模块不得 import 本模块内部文件。
