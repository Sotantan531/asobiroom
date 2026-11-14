/* asobiroom 共通プロフィール。ローカルの進行状況と任意参加の公開コミュニティ。 */
(() => {
  'use strict';
  const KEY = 'asobiroom-player-v1';
  const QUEUE = 'asobiroom-community-pending-v1';
  const API = window.asobiApi ? window.asobiApi('/api/community') : '/api/community';
  const GAMES = Object.freeze({
    'zero-dive': { name: '深海ゼロダイブ', icon: '🌊', href: '/zero-dive/' },
    darts: { name: 'FLIGHTLINE DARTS', icon: '🎯', href: '/darts/' },
    'dobon-quiz': { name: 'ドボンクイズ', icon: '💣', href: '/dobon-quiz/' },
    'sector-09': { name: '隔離区画09', icon: '👁️', href: '/sector-09/' }
  });
  const AVATARS = ['🐣', '🐈', '🐳', '🎯', '💣', '🦊', '🤖', '👑', '🐶', '🐰', '🐼', '🐸', '🦋', '🦄', '🐙', '🦈', '🐧', '🦖', '🚀', '🌙', '⭐', '🎮', '👾', '🐲'];
  const LEVELS = [1, 1, 1, 2, 3, 4, 6, 10, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 4, 5, 5, 6, 8];
  const FRAMES = Object.freeze([
    { id: 'classic', name: 'ベーシック' }, { id: 'sunshine', name: 'サンシャイン' },
    { id: 'ocean', name: 'オーシャン' }, { id: 'cherry', name: 'チェリー' },
    { id: 'mint', name: 'ミント' }, { id: 'cosmic', name: 'コスモ' },
    { id: 'neon', name: 'ネオン' }, { id: 'royal', name: 'ロイヤル' },
    { id: 'rainbow', name: 'レインボー' }, { id: 'pixel', name: 'ピクセル' }
  ]);
  // Workerが受け取れるアバターは旧8種。新しいアイコンでもオンラインの記録送信は続ける。
  const SERVER_AVATARS = new Set(AVATARS.slice(0, 8));
  const blank = () => ({ id: crypto.randomUUID(), name: 'ゲスト', avatar: '🐣', frame: 'classic', public: false, xp: 0, starts: 0, clears: 0, games: {}, recent: [], claimed: {} });
  let state;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    state = saved && typeof saved.id === 'string' && /^[a-f\d-]{36}$/i.test(saved.id) ? { ...blank(), ...saved } : blank();
    if (!Array.isArray(state.recent)) state.recent = [];
    if (!state.games || typeof state.games !== 'object') state.games = {};
    if (!state.claimed || typeof state.claimed !== 'object') state.claimed = {};
    if (!FRAMES.some(frame => frame.id === state.frame)) state.frame = 'classic';
  } catch { state = blank(); }
  let pending = [];
  try {
    const saved = JSON.parse(localStorage.getItem(QUEUE) || '[]');
    if (Array.isArray(saved)) pending = saved.filter(x => x && typeof x.id === 'string').slice(-120);
  } catch { /* storage unavailable */ }
  let flushing = false;

  const day = (timestamp = Date.now()) => new Date(timestamp + 9 * 3600000).toISOString().slice(0, 10);
  const level = () => Math.floor(Math.sqrt(Math.max(0, Number(state.xp) || 0) / 50)) + 1;
  const threshold = n => 50 * (n - 1) ** 2;
  const sanitize = value => String(value || '').trim().replace(/[<>\u0000-\u001f\u007f]/g, '').slice(0, 16) || 'ゲスト';
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); localStorage.setItem(QUEUE, JSON.stringify(pending)); } catch { /* memory-only */ }
    dispatchEvent(new CustomEvent('asobi:player-updated'));
  }
  const snapshot = () => ({ ...state, games: { ...state.games }, recent: [...state.recent], claimed: { ...state.claimed }, level: level(), nextLevelXp: threshold(level() + 1), currentLevelXp: threshold(level()) });

  function missions(today = day()) {
    const dailyGame = Object.keys(GAMES)[Number(today.replaceAll('-', '')) % 4];
    const events = state.recent.filter(event => day(event.time) === today && event.action === 'start');
    const defs = [
      { id: 'first', icon: '✨', title: '今日の初プレイ', description: 'ゲームを1回遊ぶ', target: 1, current: events.length, bonus: 15 },
      { id: 'three', icon: '⚡', title: '3回チャレンジ', description: 'どれかのゲームを合計3回遊ぶ', target: 3, current: events.length, bonus: 30 },
      { id: 'pick', icon: GAMES[dailyGame].icon, title: '今日のおすすめ', description: GAMES[dailyGame].name + 'を遊ぶ', target: 1, current: events.filter(x => x.game === dailyGame).length, bonus: 25 }
    ];
    return defs.map(x => ({ ...x, current: Math.min(x.current, x.target), claimed: !!state.claimed[today + ':' + x.id] }));
  }
  function claim(id) {
    const task = missions().find(x => x.id === id);
    if (!task || task.claimed || task.current < task.target) return false;
    state.claimed[day() + ':' + id] = true;
    state.xp += task.bonus;
    save();
    return true;
  }
  function achievements() {
    const distinct = Object.values(state.games).filter(n => n > 0).length;
    const count = Object.values(state.claimed).filter(Boolean).length;
    return [
      { icon: '🌱', title: 'はじめの一歩', hint: '初めて遊ぶ', earned: state.starts >= 1 },
      { icon: '🎮', title: 'ゲーム探検家', hint: '4作品すべて遊ぶ', earned: distinct >= 4 },
      { icon: '🔥', title: '常連さん', hint: '合計10回遊ぶ', earned: state.starts >= 10 },
      { icon: '🏆', title: 'クリア名人', hint: '5回クリアする', earned: state.clears >= 5 },
      { icon: '🌟', title: '100回の挑戦', hint: '合計100回遊ぶ', earned: state.starts >= 100 },
      { icon: '📅', title: 'ミッション上手', hint: 'ミッションを10個達成', earned: count >= 10 },
      { icon: '💎', title: 'レベル10', hint: 'レベル10に到達', earned: level() >= 10 }
    ];
  }
  async function flush() {
    if (flushing || !pending.length || !state.public || navigator.onLine === false) return;
    flushing = true;
    try {
      while (pending.length && state.public) {
        const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending[0]), credentials: 'omit', cache: 'no-store', keepalive: true });
        if (!response.ok) {
          if (response.status === 400 || response.status === 429) { pending.shift(); save(); continue; }
          break;
        }
        pending.shift(); save();
      }
    } catch { /* retry next time online */ }
    finally { flushing = false; }
  }
  function record(game, action = 'start') {
    if (!GAMES[game] || !['start', 'clear'].includes(action)) return;
    const time = Date.now();
    state.recent.push({ game, action, time });
    // Older events are needed only for daily missions; permanent totals are separate.
    state.recent = state.recent.filter(x => time - x.time < 8 * 86400000).slice(-800);
    if (action === 'start') {
      state.starts++;
      state.games[game] = (state.games[game] || 0) + 1;
      state.xp += 10;
    } else { state.clears++; state.xp += 25; }
    if (state.public) {
      pending.push({ id: crypto.randomUUID(), playerId: state.id, name: sanitize(state.name), avatar: SERVER_AVATARS.has(state.avatar) ? state.avatar : '🐣', game, action });
      pending = pending.slice(-120);
    }
    save();
    void flush();
  }
  function update(values) {
    if ('name' in values) state.name = sanitize(values.name);
    if ('avatar' in values && AVATARS.includes(values.avatar) && level() >= LEVELS[AVATARS.indexOf(values.avatar)]) state.avatar = values.avatar;
    if ('frame' in values && FRAMES.some(frame => frame.id === values.frame)) state.frame = values.frame;
    if ('public' in values) {
      state.public = !!values.public;
      if (!state.public) pending = [];
    }
    save();
    if (state.public) void flush();
  }
  async function community(period = 'week') {
    const url = API + '?period=' + encodeURIComponent(period);
    const response = await fetch(url, { credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw Error('community API failed');
    return response.json();
  }
  window.asobiPlayer = { GAMES, AVATARS, LEVELS, FRAMES, get: snapshot, level, missions, claim, achievements, record, update, community, flush, day };
  addEventListener('online', flush);
  if (pending.length) void flush();
})();
