# compliance · 合规

- 设定：v5.5 11.5；隐私同意、实名/防沉迷校验、未成年人时段与离线时长控制
- 权威：server；联网：required；资源包：app
- 数值表：—；存档段：consent
- 规则：无独立规则包；接口：`generated/contracts/compliance`
- 对外只暴露 `index.ts`；其他模块不得 import 本模块内部文件。
