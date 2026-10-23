# chest · 箱子与开锁

木/铜/铁箱x锁档、木箱可砸(损坏)、开锁连续命中失误归零、工具用一次断一根；赶海时服务器复核

- handlers.ts：动作实现（只做入参校验与调用 service）
- service.ts：业务规则与事务（需要复核的规则调用 @wodefa/game-core）
- repo.ts：SQL 访问
