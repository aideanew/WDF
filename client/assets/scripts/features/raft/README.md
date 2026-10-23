# raft · 筏体建设

- 设定：v5.5 4.1；地块-房间-用途-设施；统一房间尺寸、搭积木加层；整船浮力>=总重量
- 权威：local；联网：none；资源包：b-common
- 数值表：raft_tiles, rooms, facilities；存档段：raft
- 规则：`generated/game-core/raft`；接口：无
- 对外只暴露 `index.ts`；其他模块不得 import 本模块内部文件。
