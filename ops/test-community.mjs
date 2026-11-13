/* node ops/test-community.mjs — 既存データを壊さないコミュニティ API の基本動作テスト */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { randomUUID, webcrypto } from 'node:crypto';

const path = resolve(import.meta.dirname, 'stats-worker.js');
const source = await readFile(path, 'utf8');
const worker = (await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))).default;
const origin = 'https://asobiroom.net';
const playerId = randomUUID();
const rows = [];
const db = {
  prepare(sql) {
    let args = [];
    return {
      bind(...parameters) { args = parameters; return this; },
      async first() {
        assert.match(sql, /count\(\*\)/i);
        return { total: rows.filter(row => row.player_id === args[0] && row.created >= args[1]).length };
      },
      async run() {
        assert.match(sql, /INSERT OR IGNORE INTO community_events/i);
        if (!rows.some(row => row.id === args[0])) rows.push(Object.fromEntries(['id', 'player_id', 'name', 'avatar', 'game', 'action', 'xp', 'created'].map((key, i) => [key, args[i]])));
        return { success: true };
      },
      async all() {
        if (/SUM\(c.xp\)/i.test(sql)) {
          const since = args[0];
          const groups = new Map();
          for (const row of rows.filter(row => row.created >= since)) {
            const summary = groups.get(row.player_id) || { name: row.name, avatar: row.avatar, xp: 0 };
            summary.xp += row.xp;
            groups.set(row.player_id, summary);
          }
          return { results: [...groups.values()].sort((a, b) => b.xp - a.xp) };
        }
        if (/FROM community_events ORDER BY/i.test(sql)) return { results: rows.slice().reverse().map(({ name, avatar, game, action, created }) => ({ name, avatar, game, action, created })) };
        if (/FROM zero_events/i.test(sql)) return { results: [] };
        throw Error('unexpected SQL: ' + sql);
      }
    };
  }
};
const endpoint = 'https://asobiroom-stats.example/api/community';
const post = payload => worker.fetch(new Request(endpoint, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }), { DB: db });
const event = { id: randomUUID(), playerId, name: 'そうた', avatar: '🐳', game: 'darts', action: 'start' };
let response = await post(event);
assert.equal(response.status, 200);
assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
assert.equal(rows.length, 1);
assert.equal(rows[0].xp, 10);
await post(event);
assert.equal(rows.length, 1, 'retransmitted UUID must not duplicate');
await post({ ...event, id: randomUUID(), action: 'clear' });
assert.equal(rows[1].xp, 25, 'server calculates fixed XP');
response = await post({ ...event, id: randomUUID(), name: '<script>' });
assert.equal(response.status, 400, 'unsafe nickname is rejected');
response = await worker.fetch(new Request(endpoint, { method: 'POST', headers: { Origin: 'https://not-allowed.example' }, body: '{}' }), { DB: db });
assert.equal(response.status, 403, 'untrusted Origin is rejected');
response = await worker.fetch(new Request(endpoint + '?period=week', { headers: { Origin: origin } }), { DB: db });
const results = await response.json();
assert.equal(results.leaderboard[0].xp, 35);
assert.equal(results.leaderboard[0].name, 'そうた');
assert.equal(results.feed.length, 2);
response = await worker.fetch(new Request(endpoint + '?period=bad'), { DB: db });
assert.equal(response.status, 400);
response = await worker.fetch(new Request(endpoint.replace('/api/community', '/api/activity')), { DB: db });
assert.equal(response.status, 200, 'existing activity endpoint stays available');

const store = new Map(), listeners = new Map();
const localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)) };
const sandbox = { crypto: webcrypto, localStorage, navigator: { onLine: false }, CustomEvent: class { constructor(type) { this.type = type; } }, addEventListener: (type, fn) => listeners.set(type, fn), dispatchEvent: () => {}, fetch: async () => { throw Error('offline'); }, Date, Math, JSON, Set, Object, Array, String, Number, Promise };
sandbox.window = sandbox;
runInNewContext(await readFile(resolve(import.meta.dirname, '../asobi-player.js'), 'utf8'), sandbox);
const p = sandbox.asobiPlayer;
assert.equal(p.get().public, false, 'public sharing is opt-in');
p.record('darts', 'start');
assert.equal(p.get().xp, 10);
assert.equal(p.missions()[0].current, 1);
assert.equal(p.claim('first'), true);
assert.equal(p.get().xp, 25, 'mission bonus is local');
assert.equal(p.claim('first'), false, 'cannot claim mission twice');
assert.equal(p.achievements()[0].earned, true);
assert.equal(store.get('asobiroom-community-pending-v1'), '[]', 'no online profile event until consent');
p.update({ name: 'そうた', public: true });
p.record('zero-dive', 'start');
assert.equal(JSON.parse(store.get('asobiroom-community-pending-v1')).length, 1);
p.update({ public: false });
assert.equal(store.get('asobiroom-community-pending-v1'), '[]', 'turning off sharing discards unsent events');
console.log('Community Worker and local player tests passed');
