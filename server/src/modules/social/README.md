# social · 聊天

区服聊天、世界频道(实现建议：快捷短语+表情)

- handlers.ts：动作实现（只做入参校验与调用 service）
- service.ts：业务规则与事务（需要复核的规则调用 @wodefa/game-core）
- repo.ts：SQL 访问
