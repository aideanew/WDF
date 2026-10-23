-- 0001 初始结构（建议稿，ADR-0004 确认后执行）。已执行过的迁移文件永不修改。
CREATE TABLE player (
  id            text PRIMARY KEY,
  region        text NOT NULL,
  province      text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  banned_until  timestamptz
);
CREATE TABLE identity (
  platform   text NOT NULL,            -- wechat | douyin | app
  open_id    text NOT NULL,
  union_id   text,
  player_id  text NOT NULL REFERENCES player(id),
  PRIMARY KEY (platform, open_id)
);
CREATE TABLE bind_ticket (
  ticket      text PRIMARY KEY,
  player_id   text NOT NULL REFERENCES player(id),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz
);
CREATE TABLE save_snapshot (
  player_id      text PRIMARY KEY REFERENCES player(id),
  revision       bigint NOT NULL,
  schema_version int NOT NULL,
  config_version text NOT NULL,
  checksum       bigint NOT NULL,
  body           jsonb NOT NULL,
  saved_at       timestamptz NOT NULL
);
CREATE TABLE save_fork (
  player_id  text NOT NULL REFERENCES player(id),
  source     text NOT NULL,            -- local | cloud | bind
  body       jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE idempotency (
  player_id  text NOT NULL,
  rid        text NOT NULL,
  response   jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, rid)
);
CREATE TABLE ledger_entry (            -- 竞争资产流水（只追加）
  id         bigserial PRIMARY KEY,
  player_id  text NOT NULL REFERENCES player(id),
  asset      text NOT NULL,
  delta      bigint NOT NULL,
  reason     text NOT NULL,
  ref        text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE daily_quota (             -- 区服每日限量（如高级开锁工具、沉船信息）
  region   text NOT NULL,
  day      date NOT NULL,
  key      text NOT NULL,
  used     int  NOT NULL DEFAULT 0,
  cap      int  NOT NULL,
  PRIMARY KEY (region, day, key)
);
CREATE TABLE income_daily (
  player_id text NOT NULL REFERENCES player(id),
  season    text NOT NULL,
  day       date NOT NULL,
  value     bigint NOT NULL DEFAULT 0,
  flagged   boolean NOT NULL DEFAULT false,
  PRIMARY KEY (player_id, season, day)
);
CREATE TABLE leaderboard_snapshot (
  season   text NOT NULL,
  scope    text NOT NULL,              -- global | region:<id> | province:<code>
  taken_at timestamptz NOT NULL,
  rows     jsonb NOT NULL,
  PRIMARY KEY (season, scope, taken_at)
);
CREATE TABLE event_session (
  id             text PRIMARY KEY,
  player_id      text NOT NULL REFERENCES player(id),
  day            date NOT NULL,
  seed           bigint NOT NULL,
  config_version text NOT NULL,
  loadout        jsonb NOT NULL,
  total_value    bigint,
  settled_at     timestamptz,
  UNIQUE (player_id, day)              -- 每人每天一次（已定）
);
CREATE TABLE config_release (
  version    text PRIMARY KEY,
  min_client text NOT NULL,
  pack_url   text,
  released_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_log (
  id bigserial PRIMARY KEY, actor text NOT NULL, action text NOT NULL, detail jsonb, at timestamptz NOT NULL DEFAULT now()
);
