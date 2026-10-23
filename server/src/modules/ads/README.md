# ads · 激励视频

激励视频挂靠点、服务器发奖与防重复领取

- handlers.ts：动作实现（只做入参校验与调用 service）
- service.ts：业务规则与事务（需要复核的规则调用 @wodefa/game-core）
- repo.ts：SQL 访问
