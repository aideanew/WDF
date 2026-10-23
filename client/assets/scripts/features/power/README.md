# power · 电力

- 设定：v5.5 6；发电/耗电结算(标称出力1:3:10)
- 权威：local；联网：none；资源包：b-common
- 数值表：generators, consumers；存档段：power
- 规则：`generated/game-core/power`；接口：无
- 对外只暴露 `index.ts`；其他模块不得 import 本模块内部文件。
