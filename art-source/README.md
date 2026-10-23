# art-source/ 美术源文件

Cocos 官方建议：psd、tps 等设计源文件放在 `assets` 外管理。本目录只放源文件与导出脚本，**导出产物才进 `client/assets`**。

```
art-source/
├── ui/            # psd/fig 界面源文件
├── items/         # 物品图标源（导出到 client/assets/app/textures/items 或 b-common）
├── raft/          # 船体模块源
├── characters/    # 员工、野人、兵种
├── vfx/           # 特效序列
├── audio/         # 音效原始工程
└── licenses.csv   # 每个素材的来源、作者、订单、授权范围、是否署名（版权台账唯一权威）
```

大文件建议用 Git LFS。
