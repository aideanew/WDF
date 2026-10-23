Cocos 自定义构建模板（官方：`build-templates/<平台扩展名>/` 下的文件构建后会复制到发布包；`game.json` 等 json 会与引擎模板融合）。
- `wechatgame/game.json`：微信小游戏配置（竖屏、网络超时等）
- `bytedance-mini-game/game.json`：抖音小游戏配置
分包配置由 Cocos 按 Bundle 自动生成，不要在这里手写 subpackages。
