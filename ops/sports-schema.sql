CREATE TABLE IF NOT EXISTS sports_attempts(id TEXT PRIMARY KEY,player_id TEXT NOT NULL,board TEXT NOT NULL,data_json TEXT NOT NULL,created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sports_attempts_player_time ON sports_attempts(player_id,created);
CREATE TABLE IF NOT EXISTS sports_bests(board TEXT NOT NULL,player_id TEXT NOT NULL,name TEXT NOT NULL,score INTEGER NOT NULL,hrs INTEGER NOT NULL DEFAULT 0,max_distance INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,PRIMARY KEY(board,player_id));
CREATE INDEX IF NOT EXISTS sports_bests_order ON sports_bests(board,score DESC,hrs DESC,max_distance DESC,created);
