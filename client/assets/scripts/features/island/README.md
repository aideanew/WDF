# island · 岛屿与基地

- 设定：v5.5 4.2-4.5；自己的岛/无主岛/野人岛、占岛、搬家、保护卡、岛上建筑(熔炉窑只在岛上)
- 权威：local；联网：none；资源包：b-island
- 数值表：islands, buildings, protection_cards；存档段：islands
- 规则：`generated/game-core/island`；接口：无
- 对外只暴露 `index.ts`；其他模块不得 import 本模块内部文件。
