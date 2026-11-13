-- 共通ランキングと最近のプレイ速報。既存テーブルは変更しない。
CREATE TABLE IF NOT EXISTS community_events (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  game TEXT NOT NULL,
  action TEXT NOT NULL,
  xp INTEGER NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS community_by_player_time ON community_events (player_id, created);
CREATE INDEX IF NOT EXISTS community_by_time ON community_events (created DESC);
