# defense · 野人袭击与塔防

- 设定：v5.5 7；迷宫式多入口一大门、每格只升高一次、9兵种、离线自动结算、无预警、事件回放
- 权威：local；联网：none；资源包：b-defense
- 数值表：units, defenses, waves, throwables；存档段：defense
- 规则：`generated/game-core/defense`；接口：无
- 对外只暴露 `index.ts`；其他模块不得 import 本模块内部文件。
