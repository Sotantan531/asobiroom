// asobiroom.net の共有ゲーム記録 API (Cloudflare Workers + D1)
// 公開プロフィールは事前に利用者が明示的に有効化した場合のみ送信される。
const SITE_ORIGINS = new Set(['https://asobiroom.net', 'https://www.asobiroom.net']);
const UUID = /^[a-f\d-]{36}$/i;
const NUMERIC = '(?:301|501|701|901|1101|1501)';
const BOARD = new RegExp('^(?:' + NUMERIC + '-(?:open|double|master)-(?:fat|split)|(?:cu|multi|jack|ladder)-(?:fat|split)|eagle|center|cr|cut|cc)$');
const DELTA_KEY = /^(?:plays|finished|wins|answered|correct|best|s[0-9]|q(?:[1-9]|[1-9][0-9]{1,2})\.(?:tries|right))$/;
const QUESTION_COUNT = 152;
const ACTIVITY_KEYS = Object.freeze({ visit: 'site_visit', darts: 'darts_play', 'dobon-quiz': 'dobon_play', 'sector-09': 'sector_play' });
const GAMES = new Set(['zero-dive', 'darts', 'dobon-quiz', 'sector-09']);
const AVATARS = new Set(['🐣', '🐈', '🐳', '🎯', '💣', '🦊', '🤖', '👑', '🐶', '🐰', '🐼', '🐸', '🦋', '🦄', '🐙', '🦈', '🐧', '🦖', '🚀', '🌙', '⭐', '🎮', '👾', '🐲']);
const FRAMES = new Set(['classic', 'sunshine', 'ocean', 'cherry', 'mint', 'cosmic', 'neon', 'royal', 'rainbow', 'pixel']);
const avatarOK = value => {
  if (typeof value !== 'string' || value.length > 32) return false;
  const [avatar, frame, ...unexpected] = value.split('|');
  return !unexpected.length && AVATARS.has(avatar) && (frame === undefined || FRAMES.has(frame));
};
const DAY_MS = 86400000;

function json(value, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
async function payload(request) {
  if (Number(request.headers.get('Content-Length') || 0) > 131072) return null;
  const source = await request.text();
  if (source.length > 131072) return null;
  try { return JSON.parse(source); } catch { return null; }
}
const normalizeName = value => typeof value === 'string' ? value.normalize('NFKC').trim() : '';
// 表示名は API 直叩きでも必ず確認する。既存の不適切な名前も公開時には伏せる。
const prohibitedName = /(?:https?:\/\/|www\.|[^\s@]+@[^\s@]+\.[^\s@]+|(?:\d[\s()-]?){9,}|死\s*ね|し\s*ね|シ\s*ネ|殺\s*す|こ\s*ろ\s*す|コ\s*ロ\s*ス|自殺\s*しろ|kill\s*yourself|\bkys\b|fuck|nigg)/iu;
const nameOK = value => {
  const name = normalizeName(value);
  return name.length > 0 && name.length <= 16 && !/[\p{Cc}\p{Cf}<>]/u.test(name) && !prohibitedName.test(name);
};
const visibleName = value => nameOK(value) ? normalizeName(value) : '非公開ユーザー';
const idOK = value => typeof value === 'string' && UUID.test(value);
const jstDayStart = timestamp => Math.floor((timestamp + 9 * 3600000) / DAY_MS) * DAY_MS - 9 * 3600000;

async function darts(request, env, url) {
  if (request.method === 'GET') {
    const board = url.searchParams.get('board') || '';
    if (!BOARD.test(board)) return json({ error: 'board' }, 400);
    const { results } = await env.DB.prepare('SELECT name,score FROM rankings WHERE board=? ORDER BY score DESC,created,id LIMIT 20').bind(board).all();
    return json(results.map(row => ({ ...row, name: visibleName(row.name) })));
  }
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const data = await payload(request);
  if (!data || !idOK(data.id) || !BOARD.test(data.board || '') || !nameOK(data.name) || !Number.isInteger(data.score)) return json({ error: 'input' }, 400);
  const { id, board, name, score } = data;
  const max = board === 'center' ? 14400 : board === 'eagle' ? 1200 : board.startsWith('multi') ? 2880 : board.startsWith('jack') ? 10000 : 3600;
  if (/^\d/.test(board) ? score >= 0 || score < -60 : board === 'cut' ? score > 0 || score < -3600 : score < 0 || score > max) return json({ error: 'score' }, 400);
  await env.DB.prepare('INSERT OR IGNORE INTO rankings(id,board,name,score,created) VALUES(?,?,?,?,?)').bind(id, board, normalizeName(name), score, Date.now()).run();
  return json({ saved: true });
}
async function dobon(request, env) {
  if (request.method === 'POST') {
    const data = await payload(request);
    if (!data || !idOK(data.id) || !Number.isInteger(data.question) || data.question < 0 || data.question >= QUESTION_COUNT || ![0, 1].includes(data.cleared)) return json({ error: 'input' }, 400);
    await env.DB.prepare('INSERT OR IGNORE INTO rounds(id,question,cleared) VALUES(?,?,?)').bind(data.id, data.question, data.cleared).run();
  } else if (request.method !== 'GET') return json({ error: 'method' }, 405);
  const { results } = await env.DB.prepare('SELECT question,count(*) AS total,sum(cleared) AS wins FROM rounds GROUP BY question').all();
  return json(results);
}
async function zeroRecords(request, env) {
  if (request.method === 'POST') {
    const batch = await payload(request);
    if (!Array.isArray(batch) || batch.length > 40 || batch.some(item => !item || !idOK(item.id) || !item.delta || typeof item.delta !== 'object' || Array.isArray(item.delta) || Object.keys(item.delta).length > 1000 || Object.entries(item.delta).some(([key, n]) => !DELTA_KEY.test(key) || !Number.isSafeInteger(n) || n < 0 || n > 1000000))) return json({ error: 'input' }, 400);
    if (batch.length) await env.DB.batch(batch.map(item => env.DB.prepare('INSERT OR IGNORE INTO zero_events(id,delta_json,created) VALUES(?,?,?)').bind(item.id, JSON.stringify(item.delta), Date.now())));
  } else if (request.method !== 'GET') return json({ error: 'method' }, 405);
  const { results } = await env.DB.prepare("SELECT j.key AS metric, CASE WHEN j.key='best' THEN MAX(CAST(j.value AS INTEGER)) ELSE SUM(CAST(j.value AS INTEGER)) END AS total FROM zero_events AS e, json_each(e.delta_json) AS j GROUP BY j.key").all();
  return json(Object.fromEntries(results.map(row => [row.metric, row.total])));
}
async function zeroRanking(request, env) {
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT name,score,correct FROM zero_scores ORDER BY score DESC,created,id LIMIT 20').all();
    return json(results.map(row => ({ ...row, name: visibleName(row.name) })));
  }
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const data = await payload(request);
  if (!data || !idOK(data.id) || !nameOK(data.name) || !Number.isInteger(data.score) || !Number.isInteger(data.correct) || data.correct < 0 || data.correct > 10 || data.score !== data.correct * 100) return json({ error: 'input' }, 400);
  await env.DB.prepare('INSERT OR IGNORE INTO zero_scores(id,name,score,correct,created) VALUES(?,?,?,?,?)').bind(data.id, normalizeName(data.name), data.score, data.correct, Date.now()).run();
  return json({ saved: true });
}
async function activity(request, env) {
  if (request.method === 'POST') {
    const data = await payload(request);
    if (!data || !idOK(data.id) || !Object.hasOwn(ACTIVITY_KEYS, data.kind) || Object.keys(data).some(key => key !== 'id' && key !== 'kind')) return json({ error: 'input' }, 400);
    await env.DB.prepare('INSERT OR IGNORE INTO zero_events(id,delta_json,created) VALUES(?,?,?)')
      .bind(data.id, JSON.stringify({ [ACTIVITY_KEYS[data.kind]]: 1 }), Date.now()).run();
    return json({ saved: true });
  }
  if (request.method !== 'GET') return json({ error: 'method' }, 405);
  const { results } = await env.DB.prepare("SELECT j.key AS metric,SUM(CAST(j.value AS INTEGER)) AS total FROM zero_events e,json_each(e.delta_json) j WHERE j.key IN ('plays','site_visit','darts_play','dobon_play','sector_play') GROUP BY j.key").all();
  const totals = Object.fromEntries(results.map(row => [row.metric, row.total]));
  return json({ visits: totals.site_visit || 0, games: { 'zero-dive': totals.plays || 0, darts: totals.darts_play || 0, 'dobon-quiz': totals.dobon_play || 0, 'sector-09': totals.sector_play || 0 } });
}

async function community(request, env, url) {
  if (request.method === 'POST') {
    const data = await payload(request);
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).sort().join(',') !== 'action,avatar,game,id,name,playerId'
      || !idOK(data.id) || !idOK(data.playerId) || !nameOK(data.name) || !avatarOK(data.avatar)
      || !GAMES.has(data.game) || !['start', 'clear'].includes(data.action)) return json({ error: 'input' }, 400);
    const now = Date.now();
    const dayStart = jstDayStart(now);
    // 1 IDにつき1日60件まで。XPの値はクライアントから受け取らず固定値を付与する。
    const row = await env.DB.prepare('SELECT count(*) AS total FROM community_events WHERE player_id=? AND created>=?')
      .bind(data.playerId, dayStart).first();
    if ((row?.total || 0) >= 60) return json({ error: 'daily_limit' }, 429);
    await env.DB.prepare('INSERT OR IGNORE INTO community_events(id,player_id,name,avatar,game,action,xp,created) VALUES(?,?,?,?,?,?,?,?)')
      .bind(data.id, data.playerId, normalizeName(data.name), data.avatar, data.game, data.action, data.action === 'start' ? 10 : 25, now).run();
    return json({ saved: true });
  }
  if (request.method !== 'GET') return json({ error: 'method' }, 405);
  const period = url.searchParams.get('period') || 'week';
  if (!['week', 'month', 'all'].includes(period)) return json({ error: 'period' }, 400);
  const now = Date.now();
  const japanNow = new Date(now + 9 * 3600000);
  const jstStart = jstDayStart(now);
  const weekStart = jstStart - ((japanNow.getUTCDay() + 6) % 7) * DAY_MS;
  const monthStart = Date.UTC(japanNow.getUTCFullYear(), japanNow.getUTCMonth(), 1) - 9 * 3600000;
  const since = period === 'all' ? 0 : period === 'month' ? monthStart : weekStart;
  const leaderboardSql = `SELECT SUM(c.xp) AS xp,
    (SELECT e.name FROM community_events e WHERE e.player_id=c.player_id ORDER BY e.created DESC, e.id DESC LIMIT 1) AS name,
    (SELECT e.avatar FROM community_events e WHERE e.player_id=c.player_id ORDER BY e.created DESC, e.id DESC LIMIT 1) AS avatar
    FROM community_events c WHERE c.created>=? GROUP BY c.player_id ORDER BY xp DESC, MIN(c.created) ASC LIMIT 20`;
  const [ranks, feed] = await Promise.all([
    env.DB.prepare(leaderboardSql).bind(since).all(),
    env.DB.prepare('SELECT name,avatar,game,action,created FROM community_events ORDER BY created DESC,id DESC LIMIT 12').all()
  ]);
  return json({ period,
    leaderboard: ranks.results.map(row => ({ ...row, name: visibleName(row.name) })),
    feed: feed.results.map(row => ({ ...row, name: visibleName(row.name) }))
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (origin && !SITE_ORIGINS.has(origin)) return json({ error: 'origin' }, 403);
    if (request.method !== 'GET' && !SITE_ORIGINS.has(origin)) return json({ error: 'origin' }, 403);
    const cors = { 'Access-Control-Allow-Origin': origin || 'https://asobiroom.net', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!env.DB) return new Response('D1 binding is missing', { status: 503, headers: cors });
    const url = new URL(request.url);
    try {
      const response = url.pathname === '/api/ranks' ? await darts(request, env, url)
        : url.pathname === '/api/stats' ? await dobon(request, env)
        : url.pathname === '/api/records' ? await zeroRecords(request, env)
        : url.pathname === '/api/zero-ranking' ? await zeroRanking(request, env)
        : url.pathname === '/api/activity' ? await activity(request, env)
        : url.pathname === '/api/community' ? await community(request, env, url)
        : json({ error: 'not_found' }, 404);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(cors)) headers.set(key, value);
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      console.error(JSON.stringify({ message: 'asobiroom stats request failed', path: url.pathname, error: error instanceof Error ? error.message : String(error) }));
      const response = json({ error: 'server' }, 500);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(cors)) headers.set(key, value);
      return new Response(response.body, { status: 500, headers });
    }
  }
};
