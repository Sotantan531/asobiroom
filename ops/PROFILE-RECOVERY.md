# Shared profiles and recovery

Apply `identity-schema.sql` to the existing stats D1 database before deploying the updated stats Worker. Keep the existing tables and records. Provision administrator roles only in `player_profiles`; submitted nicknames never grant a role. `player_aliases` may link previously verified owner devices to one canonical profile.

Both `ops/stats-worker.mjs` and the Gunman Worker import the identity module. Gunman retains its game D1 and Durable Object bindings and additionally binds the stats D1 as `PROFILE_DB` (see `gunman.wrangler.json`). The root identity module and ops copy must remain identical.

The browser creates a cryptographically random session token; D1 stores its SHA-256 digest. Existing opaque browser IDs are upgraded on first authenticated sync. Once a session exists, all profile writes, community events and new ranking submissions must authenticate it. Public responses never expose player IDs, session tokens, recovery hashes or saved progress.

Recovery keys contain 256 random bits, are displayed once and are stored only as SHA-256 hashes. Issuing a new key replaces the previous key. Recovery atomically consumes the key and rotates the active session, retaining the same profile ID, name, role, XP, play/clear counts, missions, recent activity and equipped avatar/frame. The old device is rejected immediately by the server and detects logout on its next action, focus or visible-page 30-second poll. A restored device must issue a new key for future recovery. Individual games' in-progress saves/settings are not included.

The frontend always queues community records and eligible game results. Only `start` events appear in the live feed; `clear` events still contribute XP. Offline retries retain IDs, preventing duplicate scoring. Names are reserved with a normalized unique key (NFKC, case-insensitive, whitespace-insensitive). Anonymous users receive a unique `ゲスト` plus four alphanumeric characters.

Secret equipment unlocks at levels 12, 15, 20, 25, 30 and 40. Operator-only equipment is separately gated by a server-confirmed role. Level/XP scoring remains a casual self-reported system, not competitive anti-cheat authentication.

Verification: `node test-runtime/identity-update-test.mjs`, `identity-client-test.mjs`, `identity-sports-client.mjs`, and `kyudo-v7-test.mjs`. SQL tests exercise concurrent name reservations, role spoof rejection, recovery-key consumption/rotation, two independent browser clients, old-session revocation, historical name joins and game-score validation.
