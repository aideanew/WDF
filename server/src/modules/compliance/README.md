# compliance · 合规

隐私同意、实名/防沉迷校验、未成年人时段与离线时长控制

- handlers.ts：动作实现（只做入参校验与调用 service）
- service.ts：业务规则与事务（需要复核的规则调用 @wodefa/game-core）
- repo.ts：SQL 访问
