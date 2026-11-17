CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,client TEXT NOT NULL,mode TEXT NOT NULL,created INTEGER NOT NULL,ip TEXT NOT NULL,used INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS runs_rate ON runs(ip,created);
CREATE INDEX IF NOT EXISTS runs_expiry ON runs(created);
CREATE TABLE IF NOT EXISTS records(client TEXT NOT NULL,mode TEXT NOT NULL CHECK(mode IN ('reaction','survival')),name TEXT NOT NULL,value REAL NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(client,mode));
CREATE INDEX IF NOT EXISTS records_board ON records(mode,value,created);
