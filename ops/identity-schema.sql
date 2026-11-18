CREATE TABLE IF NOT EXISTS player_profiles(player_id TEXT PRIMARY KEY,name TEXT NOT NULL,name_key TEXT NOT NULL UNIQUE,avatar TEXT NOT NULL DEFAULT '🐣',frame TEXT NOT NULL DEFAULT 'classic',role TEXT NOT NULL DEFAULT 'player' CHECK(role IN ('player','admin')),created INTEGER NOT NULL,updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS player_aliases(alias_id TEXT PRIMARY KEY,player_id TEXT NOT NULL REFERENCES player_profiles(player_id));
CREATE INDEX IF NOT EXISTS community_start_feed ON community_events(action,created DESC,id DESC);
CREATE TABLE IF NOT EXISTS ranking_owners(record_id TEXT PRIMARY KEY,player_id TEXT NOT NULL,kind TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS player_sessions(player_id TEXT PRIMARY KEY REFERENCES player_profiles(player_id),session_hash TEXT NOT NULL,recovery_hash TEXT UNIQUE,profile_json TEXT NOT NULL DEFAULT '{}',updated INTEGER NOT NULL);
