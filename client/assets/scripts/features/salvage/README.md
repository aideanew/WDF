# salvage · 沉船·潜水·石油·探索

- 设定：v5.5 3.3-3.5；沉船信息供给(份数由服务器发放)、潜水员派遣、石油、探索
- 权威：hybrid；联网：optional；资源包：b-deep
- 数值表：shipwrecks, oil, explore；存档段：salvage
- 规则：`generated/game-core/salvage`；接口：`generated/contracts/salvage`
- 对外只暴露 `index.ts`；其他模块不得 import 本模块内部文件。
