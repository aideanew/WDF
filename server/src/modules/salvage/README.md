# salvage · 沉船·潜水·石油·探索

沉船信息供给(份数由服务器发放)、潜水员派遣、石油、探索

- handlers.ts：动作实现（只做入参校验与调用 service）
- service.ts：业务规则与事务（需要复核的规则调用 @wodefa/game-core）
- repo.ts：SQL 访问
