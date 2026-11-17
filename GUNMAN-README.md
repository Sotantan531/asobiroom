# 早撃ちガンマン / Homerun Impact effects

Static frontend: gunman.html, gunman.css, gunman.js. GitHub Pages serves these files alongside the existing site. The frontend API URL is defined at the top of gunman.js. No external image/audio files are used for scenery or sounds; the shared local asobiroom icon is retained.

Backend: gunman-worker.mjs, gunman-schema.sql, gunman.wrangler.json. From this directory:

```sh
npx wrangler d1 execute asobiroom-gunman --remote --file=gunman-schema.sql --config=gunman.wrangler.json
npx wrangler deploy --config=gunman.wrangler.json
```

For a different Cloudflare account, create a D1 database, replace its ID in the config, and adjust ALLOWED_ORIGINS and the client API URL. For local simulation use `npx wrangler dev --config=gunman.wrangler.json`; static hosting can use port 4173. Online screen also has a clearly labelled mock/Bot option, independent of the backend.

API: GET /health, GET /rankings?mode=reaction|survival, POST /runs, POST /records, POST /match, POST /cancel, WebSocket /ws?room=1234&name=Name. Random rooms use an opaque UUID identifier. WebSocket messages: ready, shot {id,ms,falseStart}, rematch. Server broadcasts hello, lobby, round, result, rematch and forfeit. BO3; ties replay. Disconnection forfeits active matches. Rooms and matchmaking queues use SQLite-backed Durable Objects; socket attachments retain identity across hibernation. Alarms handle missing shots and room expiry.

Reaction ranking: five valid practice samples, fastest sample submitted. Survival ranking: one sample per defeated opponent. Both require a server-issued expiring single-use run token, plausible duration, finite values, >=100ms, name validation and request-rate checks. Records upsert personal best per browser ID and category. API parameters use prepared SQL. Daily salted hashes of request IP are retained only on short-lived run rows for rate limiting. These are casual client-timed records, not cheat-proof competitive verification. Client display/input latency and malicious modified clients cannot be fully eliminated by this protocol.

Frontend: relative cue timing starts on the frame displaying FIRE, pointerdown fires, repeat keys are ignored, backgrounding invalidates active rounds, and Bot/mock is always labelled and excluded from rankings. Shared XP is local-only until the existing community service explicitly supports this game.

Homerun effects: homerun-fx.js provides generated Canvas hologram textures, additive shader particles, shockwave, swipe ribbon and fading billboard trail. Pools are capped at 160 particles and 40 trail segments. Existing scoring and flight physics are retained; relative drag sensitivity is 1.35. DPR remains capped at 1.5 with the existing adaptive downgrade. Actual 60fps must be measured on target devices.
