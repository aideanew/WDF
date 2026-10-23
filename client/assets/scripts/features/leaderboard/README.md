# leaderboard · 排行与称号

- 设定：v5.5 10.1/10.3；全服/区服/地域(IP省份)总收益榜、联网实时收获才计榜、赛季、称号加成
- 权威：server；联网：required；资源包：b-social
- 数值表：seasons, titles；存档段：—
- 规则：`generated/game-core/leaderboard`；接口：`generated/contracts/leaderboard`
- 对外只暴露 `index.ts`；其他模块不得 import 本模块内部文件。
