# account · 账号与身份

- 设定：v5.5 11.5/账号设计；平台登录、内部玩家ID、微信/抖音绑定合并、区服分配、IP省份
- 权威：server；联网：required；资源包：app
- 数值表：regions；存档段：—
- 规则：无独立规则包；接口：`generated/contracts/account`
- 对外只暴露 `index.ts`；其他模块不得 import 本模块内部文件。
