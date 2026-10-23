# game-data/ 数值唯一权威

- `source/<表>.csv`：第一行为字段名；UTF-8；一行一条。可用表格软件编辑后保存为 CSV（UTF-8）。
- `schemas/<表>.schema.json`：字段类型（string/int/bool/enum）、必填、区间、正则、外键 `ref: "表.字段"`、分组合计 `sumTo`（概率万分比合计 = 10000）。
- `out/`：生成物（不进 Git）。

## 流程
`npm run gen:config` → 校验 → 输出：
1. `client/assets/resources/config/<表>.json` + `_manifest.json`（随包默认值）
2. `server/generated/config/`（服务端权威值）
3. `packages/game-core/src/generated/config-types.ts`（表结构类型）
4. `configVersion`（全部表内容的哈希）

## 当前状态
表结构骨架已按 `module-catalog.json` 的 tables 建好（`status: draft` 的表字段待从 v5.5 抽取）。
**数值迁移来源**：`docs/01_product/design-source/材料与工具总表.md`（物品/配方/价格唯一总账）、`docs/01_product/design-source/等级解锁表-草案.md`、`docs/01_product/design-source/箱子与沉船概率-草案.md`。迁移前它们仍是权威；迁移后以本目录为准，并在原文件头部标注“已迁移”。
