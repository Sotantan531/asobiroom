/* asobiroom game catalog. Dates are confirmed publication dates, never import dates.
 * Weight and play time are editorial guides, not device benchmark results.
 * Add future games here; their existing .card thumbnail is retained by href.
 */
(function (root) {
  'use strict';
  const GENRES = ['すべて', 'パズル・脳トレ', 'アクション・反射神経', 'スポーツ・体感', 'シミュレーション・その他'];
  const WEIGHTS = ['⚡ 超軽量', '⚙️ 標準', '🔥 3D・リッチ'];
  const SORTS = { recommended: 'おすすめ順', newest: '新着順', light: '動作が軽い順', rich: 'リッチ・3D順', quick: 'サクッと遊べる順' };
  const games = [
    { id: 'homerun-impact', title: 'ホームラン・インパクト', href: '/homerun-impact.html', genre: 'スポーツ・体感', description: '狙って、離して、かっ飛ばす。4つの球種に挑む10球のホームラン競争。', weight: 2, oneHand: true, minutes: 3, timeLabel: '約3分', publishedAt: '2026-11-17T15:40:00+09:00' },
    { id: 'zero-dive', title: '深海ゼロダイブ', href: '/zero-dive/', genre: 'パズル・脳トレ', description: '0の数を見極めて潜航。10問のクイズで深海の奥へ。', weight: 1, oneHand: true, minutes: 3, timeLabel: '約3〜5分', publishedAt: null },
    { id: 'darts', title: 'FLIGHTLINE DARTS', href: '/darts/', genre: 'スポーツ・体感', description: '狙いを定めてスワイプ。多彩なルールでダーツ対戦。', weight: 1, oneHand: true, minutes: 5, timeLabel: '約5〜10分', publishedAt: null },
    { id: 'dobon-quiz', title: 'ドボンクイズ', href: '/dobon-quiz/', genre: 'パズル・脳トレ', description: '制限時間は80秒。たった1つのドボンを避けよう。', weight: 0, oneHand: true, minutes: 80 / 60, timeLabel: '約80秒', publishedAt: null },
    { id: 'sector-01', title: '隔離区画 01｜石像の庭園', href: '/sector-01/', genre: 'アクション・反射神経', description: '振り返れば、石像は止まる。夜の庭園から脱出せよ。', weight: 2, oneHand: false, minutes: 5, timeLabel: '約5〜10分', publishedAt: null },
    { id: 'billiards', title: 'BILLIARDS CLUB', href: '/billiards/', genre: 'スポーツ・体感', description: '3Dの台で8ボールと9ボール。CPU・2人対戦に挑戦。', weight: 2, oneHand: false, minutes: 10, timeLabel: '約10〜15分', publishedAt: null },
    { id: 'bowling', title: 'ポケット・ボウリング', href: '/bowling/', genre: 'スポーツ・体感', description: '重さと曲がりを操って投球。10フレームでストライクを狙おう。', weight: 2, oneHand: false, minutes: 5, timeLabel: '約5〜10分', publishedAt: null },
    { id: 'crystal-pop', title: 'クリスタル・ポップ', href: '/crystal-pop/', genre: 'パズル・脳トレ', description: '宝石を3つつなぐパズル。ボムをミックスして大連鎖！', weight: 1, oneHand: true, minutes: 2, timeLabel: '約2〜5分', publishedAt: '2026-11-17T01:39:00+09:00' }
  ].map((game, recommended) => Object.freeze({ ...game, recommended }));
  function publishedTime(game) {
    const time = Date.parse(game.publishedAt);
    return Number.isFinite(time) ? time : -Infinity;
  }
  function isNew(game, now = Date.now()) {
    const age = now - publishedTime(game);
    return age >= 0 && age < 14 * 86400000;
  }
  function selectGames(items, state) {
    const tags = state.tags instanceof Set ? state.tags : new Set(state.tags || []);
    const filtered = items.filter(game =>
      (!state.genre || state.genre === 'すべて' || state.genre === game.genre) &&
      (!tags.has('light') || game.weight === 0) &&
      (!tags.has('oneHand') || game.oneHand) &&
      (!tags.has('rich') || game.weight === 2)
    );
    return filtered.sort((a, b) => {
      let order = 0;
      switch (state.sort) {
        case 'newest': order = publishedTime(b) - publishedTime(a); break;
        case 'light': order = a.weight - b.weight; break;
        case 'rich': order = b.weight - a.weight; break;
        case 'quick': order = a.minutes - b.minutes; break;
      }
      return (Number.isNaN(order) ? 0 : order) || a.recommended - b.recommended;
    });
  }
  const api = { games, GENRES, SORTS, WEIGHTS, isNew, selectGames };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root.document) return;
  const document = root.document, shelf = document.querySelector('#shelf');
  if (!shelf) return;
  const state = { genre: 'すべて', sort: 'recommended', tags: new Set() };
  const cards = new Map();
  for (const card of shelf.querySelectorAll(':scope > .card')) {
    const link = card.querySelector('.play');
    if (!link) continue;
    let path;
    try { path = new URL(link.getAttribute('href'), root.location.href).pathname.replace(/\/?$/, '/'); } catch { continue; }
    const game = games.find(game => game.href.replace(/\/$/, '') === path.replace(/\/$/, ''));
    if (!game) continue;
    cards.set(game.id, card);
    card.dataset.game = game.id;
    card.dataset.genre = game.genre;
    card.classList.add('catalog-card');
    const details = card.querySelector('.details');
    if (!details) continue;
    details.querySelector('h3').textContent = game.title;
    details.querySelector('p').textContent = game.description;
    const tags = details.querySelector('.tags');
    tags.replaceChildren();
    const genre = document.createElement('small');
    genre.textContent = game.genre;
    tags.append(genre);
    const meta = document.createElement('div');
    meta.className = 'catalog-card-meta';
    const weight = document.createElement('span'), time = document.createElement('span');
    weight.className = 'catalog-weight';
    weight.dataset.weight = game.weight;
    weight.textContent = WEIGHTS[game.weight];
    time.textContent = '◷ ' + game.timeLabel;
    meta.append(weight, time);
    link.before(meta);
    const badge = document.createElement('span');
    badge.className = 'catalog-new';
    badge.textContent = 'NEW!';
    badge.hidden = !isNew(game);
    card.append(badge);
  }
  // Unknown or local legacy entries are kept, separately from the managed catalog.
  const legacy = [...shelf.children].filter(card => !card.dataset.game);
  const oldFilters = document.querySelector('.filters');
  const controls = document.createElement('section');
  controls.className = 'catalog-controls';
  controls.setAttribute('aria-label', 'ゲームの絞り込みと並び替え');
  controls.innerHTML = `
    <div class="filters catalog-genres" role="group" aria-label="ジャンル"></div>
    <div class="catalog-toolbar">
      <div class="catalog-quick" role="group" aria-label="クイックタグ">
        <button type="button" data-quick="light" aria-pressed="false">⚡ サクサク超軽量のみ</button>
        <button type="button" data-quick="oneHand" aria-pressed="false">📱 スマホ片手OK</button>
        <button type="button" data-quick="rich" aria-pressed="false">🔥 3D・リッチ</button>
      </div>
      <label class="catalog-sort-label">並び替え <select id="catalogSort" aria-label="ゲームの並び替え"></select></label>
    </div>
    <div class="catalog-bottom">
      <p class="catalog-count" id="catalogCount" role="status" aria-live="polite" aria-atomic="true"></p>
      <button type="button" id="catalogReset" hidden>条件をリセット</button>
      <button type="button" id="catalogRandom">🎲 この中からおまかせ</button>
    </div>
    <p class="catalog-note">重さ・プレイ時間は目安です。端末やモードで変わります。</p>`;
  if (oldFilters) oldFilters.replaceWith(controls); else shelf.before(controls);
  for (const name of GENRES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    button.setAttribute('aria-pressed', String(name === state.genre));
    button.setAttribute('aria-controls', 'shelf');
    button.addEventListener('click', () => { state.genre = name; render(); });
    controls.querySelector('.catalog-genres').append(button);
  }
  const sort = controls.querySelector('#catalogSort');
  for (const [value, label] of Object.entries(SORTS)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    sort.append(option);
  }
  sort.addEventListener('change', () => { state.sort = sort.value; render(); });
  for (const button of controls.querySelectorAll('[data-quick]')) {
    button.setAttribute('aria-controls', 'shelf');
    button.addEventListener('click', () => {
      const tag = button.dataset.quick;
      state.tags.has(tag) ? state.tags.delete(tag) : state.tags.add(tag);
      render();
    });
  }
  const empty = document.querySelector('#empty') || document.createElement('p');
  empty.id = 'empty';
  empty.textContent = '条件に合うゲームがありません。タグを外すか「条件をリセット」を押してね。';
  if (!empty.isConnected) shelf.after(empty);
  let visible = [];
  function render() {
    visible = selectGames(games.filter(game => cards.has(game.id)), state);
    const ids = new Set(visible.map(game => game.id));
    for (const [id, card] of cards) {
      card.hidden = !ids.has(id);
      card.classList.remove('catalog-picked');
      card.querySelector('.catalog-new').hidden = !isNew(games.find(game => game.id === id));
    }
    for (const game of visible) shelf.append(cards.get(game.id));
    for (const card of legacy) {
      card.hidden = state.genre !== 'すべて' || state.tags.size > 0;
      shelf.append(card);
    }
    for (const button of controls.querySelectorAll('.catalog-genres button')) button.setAttribute('aria-pressed', String(button.textContent === state.genre));
    for (const button of controls.querySelectorAll('[data-quick]')) button.setAttribute('aria-pressed', String(state.tags.has(button.dataset.quick)));
    controls.querySelector('#catalogCount').textContent = visible.length + ' / ' + cards.size + '作品を表示';
    controls.querySelector('#catalogReset').hidden = state.genre === 'すべて' && !state.tags.size && state.sort === 'recommended';
    controls.querySelector('#catalogRandom').disabled = !visible.length;
    empty.hidden = !!visible.length;
  }
  controls.querySelector('#catalogReset').addEventListener('click', () => {
    state.genre = 'すべて'; state.sort = 'recommended'; state.tags.clear(); sort.value = state.sort; render();
  });
  function pick() {
    if (!visible.length) {
      controls.querySelector('#catalogCount').textContent = '条件に合うゲームがありません。条件をリセットしてね。';
      controls.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return null;
    }
    for (const card of cards.values()) card.classList.remove('catalog-picked');
    const game = visible[Math.floor(Math.random() * visible.length)], card = cards.get(game.id);
    card.classList.add('catalog-picked');
    card.scrollIntoView({ behavior: root.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    card.querySelector('.play').focus({ preventScroll: true });
    controls.querySelector('#catalogCount').textContent = '🎲 ' + game.title + ' を選びました！';
    return game;
  }
  controls.querySelector('#catalogRandom').addEventListener('click', pick);
  root.asobiCatalog = { ...api, pick, getVisible: () => [...visible] };
  const headingCount = document.querySelector('.asobi-games-heading small');
  if (headingCount) headingCount.textContent = cards.size + 'つのゲームから、お気に入りを見つけよう。';
  render();
})(typeof window === 'undefined' ? globalThis : window);

