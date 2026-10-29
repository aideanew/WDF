-- 0002 区服（D-53，2026-10-29，TASK-1401）。已执行过的迁移文件永不修改。
-- 只建表，**不种任何区数据**：区名由政府/运营给定，测试库用 region_test
-- （D-53 约束③）。表为空时 account.currentRegion() 回落到本地默认区并打告警。
CREATE TABLE regions (
  id         text PRIMARY KEY,                      -- 区服 id（如 's1'，由运营给定）
  name       text NOT NULL,                         -- 区服显示名（运营给定）
  status     text NOT NULL DEFAULT 'open',          -- open | closed（关闭后保留历史，不删行）
  opened_at  timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT false         -- 是否当前开放区
);

-- 保证全表**至多一行** is_current=true：用**部分唯一索引**而非触发器。
-- 理由（TASK-1401 / P5-02，写进卡面）：PGlite 是 WASM 单进程，触发器调试成本高于收益；
-- 且部分唯一索引把「至多一个 current」变成数据库约束——若某实现误把两区都置 current，
-- 第二笔直接违反唯一约束报错，是**被约束住的**，不是靠代码自觉（突变验证即为此）。
CREATE UNIQUE INDEX regions_current_idx ON regions (is_current) WHERE is_current;

-- player.region 建索引：登录/按区查询常用，避免全表扫。
CREATE INDEX player_region_idx ON player (region);
