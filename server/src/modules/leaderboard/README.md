# leaderboard · 排行与称号

全服/区服/地域(IP省份)总收益榜、联网实时收获才计榜、赛季、称号加成

- handlers.ts：动作实现（只做入参校验与调用 service）
- service.ts：业务规则与事务（需要复核的规则调用 @wodefa/game-core）
- repo.ts：SQL 访问
