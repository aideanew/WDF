# event · 每日一海·赶海多捞哦

20:00-21:00每人一次3分钟、单钩/多钩不能用网、自选装备、按总价值排名、所得进船舱

- handlers.ts：动作实现（只做入参校验与调用 service）
- service.ts：业务规则与事务（需要复核的规则调用 @wodefa/game-core）
- repo.ts：SQL 访问
