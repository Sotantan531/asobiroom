# Shared sports rankings

Production uses the existing `asobiroom-stats` Worker and its existing `DB` D1 binding.

- Entrypoint: `stats-worker.mjs` (uploaded as `worker.js`).
- Additional ES module: `sports-ranks.mjs`.
- Apply `sports-schema.sql` once before deploying; it only creates new tables/indexes.
- Retain all existing bindings, routes and compatibility settings. The deployed compatibility date is `2026-11-13`.
- `GET /api/sports-ranks?board=...` returns the top 20 personal bests.
- `POST /api/sports-ranks` validates and recomputes results before saving.
- Boards: `impact-normal-v1`, `impact-hard-v1`, `bowling-standard-v1`.
- Baseball accepts only ten shots, the exact ball distribution and fixed S/S or E/E capabilities. Raw distances preserve the 130m scoring boundary.
- Bowling accepts only completed ten-frame ranked games with house oil, 13lb, no extended assist and no bumpers. Both swipe and button input are supported.
- IDs deduplicate deliveries; one personal best is retained per browser profile and board. Up to 100 submissions per profile in 24 hours.
- Names and results are uploaded only with the game's online-publishing control enabled. Its initial value follows the existing profile public flag. Opting out clears unsent results.
- Local rankings are not imported into the online tables. The previous `homerun-records.js` remains for local data compatibility.
- This is a casual leaderboard, not server-authoritative gameplay or proof of identity. Validation rejects inconsistent scores and conditions but does not establish that a client played honestly.

Tests: `online-ranks-test.mjs` exercises real SQLite queries and server validation; `online-impact-test.mjs` exercises full baseball gameplay and validates generated submissions; `online-client-test.mjs` covers queue/privacy and the real bowling controller. These tests send no scores to production.
