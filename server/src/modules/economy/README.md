# economy · 金币与商人

原价/回收价50%/各地±30%、商人限购(高级开锁工具按区服每日限量由服务器发放)、竞争资产流水

- handlers.ts：动作实现（只做入参校验与调用 service）
- service.ts：业务规则与事务（需要复核的规则调用 @wodefa/game-core）
- repo.ts：SQL 访问
