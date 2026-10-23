# telemetry · 埋点与错误上报

- 设定：v5.5 评审11.17；约15个事件、批量上报、错误日志
- 权威：server；联网：optional；资源包：app
- 数值表：—；存档段：—
- 规则：无独立规则包；接口：`generated/contracts/telemetry`
- 对外只暴露 `index.ts`；其他模块不得 import 本模块内部文件。
