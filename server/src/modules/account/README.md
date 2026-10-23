# account · 账号与身份

平台登录、内部玩家ID、微信/抖音绑定合并、区服分配、IP省份

- handlers.ts：动作实现（只做入参校验与调用 service）
- service.ts：业务规则与事务（需要复核的规则调用 @wodefa/game-core）
- repo.ts：SQL 访问
