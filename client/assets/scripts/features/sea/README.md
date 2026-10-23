# sea · 海域与潮汐

- 设定：v5.5 2；浅海/深海、每6小时真实时间潮汐(10分钟)、同屏漂浮物<=20、海图导航与挂机导航
- 权威：local；联网：none；资源包：b-shallow
- 数值表：zones, spawns, tides；存档段：voyage
- 规则：`generated/game-core/sea`；接口：无
- 对外只暴露 `index.ts`；其他模块不得 import 本模块内部文件。
