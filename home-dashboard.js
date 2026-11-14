/* asobiroom のサイトメニュー。訪問数やプレイ数を壊さず、右ドロワーへ統合。 */
(() => {
  'use strict';
  const activity = window.asobiActivity;
  const player = window.asobiPlayer;
  if (!activity) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'asobi-menu-backdrop';
  backdrop.hidden = true;
  const drawer = document.createElement('aside');
  drawer.className = 'asobi-site-drawer';
  drawer.id = 'asobiSiteDrawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-label', 'サイトメニュー');
  drawer.setAttribute('aria-hidden', 'true');
  drawer.inert = true;
  drawer.innerHTML = `
    <div class="asobi-menu-head">
      <div><span class="asobi-menu-kicker">YOUR PLAYROOM</span><h2>あそびのメニュー</h2></div>
      <button type="button" id="asobiMenuClose" class="asobi-menu-close" aria-label="メニューを閉じる">×</button>
    </div>
    <a class="asobi-menu-profile" href="/#arcadeProfile">
      <span class="asobi-menu-profile-avatar" data-frame="classic" id="asobiMenuAvatar" aria-hidden="true">🐣</span>
      <span class="asobi-menu-profile-copy"><small>マイプロフィール <span aria-hidden="true">✎</span></small><strong id="asobiMenuName">ゲスト</strong><span id="asobiMenuLevel">LEVEL 1 · 0 XP</span></span>
      <span class="asobi-menu-arrow" aria-hidden="true">›</span>
    </a>
    <div class="asobi-menu-section-label">PLAY</div>
    <nav class="asobi-menu-nav" aria-label="ゲームとランキング">
      <a class="asobi-menu-main-link" href="/#shelf"><span>▦</span> すべてのゲーム <b aria-hidden="true">›</b></a>
      <a class="asobi-menu-main-link" href="/games.html"><span>📖</span> ゲームの遊び方 <b aria-hidden="true">›</b></a>
      <div class="asobi-menu-games" aria-label="各ゲーム">
        <a href="/zero-dive/">🌊 深海ゼロダイブ</a>
        <a href="/darts/">🎯 FLIGHTLINE DARTS</a>
        <a href="/dobon-quiz/">💣 ドボンクイズ</a>
        <a href="/sector-09/">👁️ 隔離区画09</a>
      </div>
      <a class="asobi-menu-main-link" href="/#arcadeRankings"><span>🏆</span> みんなのランキング <b aria-hidden="true">›</b></a>
      <a class="asobi-menu-main-link" href="/#arcadeMissions"><span>✨</span> 今日のミッション <b aria-hidden="true">›</b></a>
      <button type="button" class="asobi-menu-main-link asobi-menu-random" id="asobiMenuRandom"><span>🎲</span> おまかせで遊ぶ <b aria-hidden="true">↗</b></button>
    </nav>
    <div class="asobi-menu-section-label">RECORD</div>
    <details class="asobi-menu-stats" id="asobiMenuStats">
      <summary><span>▥</span><span>サイトの記録<small>訪問回数・みんなのプレイ数</small></span><b aria-hidden="true">⌄</b></summary>
      <div class="asobi-menu-stats-body">
        <div class="asobi-dashboard-total"><span>🏠 サイト訪問回数</span><strong data-count="visits">—</strong></div>
        <div class="asobi-dashboard-heading"><span>ゲーム別プレイ回数</span><button type="button" class="asobi-dashboard-refresh" id="asobiStatsRefresh">↻ 更新</button></div>
        <ul class="asobi-dashboard-list">
          <li><a href="/zero-dive/"><span class="game-name">🌊 深海ゼロダイブ</span><span data-count="zero-dive">—</span></a></li>
          <li><a href="/darts/"><span class="game-name">🎯 FLIGHTLINE DARTS</span><span data-count="darts">—</span></a></li>
          <li><a href="/dobon-quiz/"><span class="game-name">💣 ドボンクイズ</span><span data-count="dobon-quiz">—</span></a></li>
          <li><a href="/sector-09/"><span class="game-name">👁️ 隔離区画09</span><span data-count="sector-09">—</span></a></li>
        </ul>
        <p class="asobi-dashboard-status" role="status" aria-live="polite">開くと最新の記録を取得します。</p>
        <p class="asobi-dashboard-note">訪問はタブごとに1回、プレイはゲーム開始時に加算。集計開始前の履歴は含みません。</p>
      </div>
    </details>
    <div class="asobi-menu-footer">
      <a href="/about.html">サイトについて</a><a href="/privacy-policy.html">プライバシー</a><a href="/contact.html">お問い合わせ</a>
    </div>`;
  document.body.append(backdrop, drawer);

  const trigger = () => document.querySelector('#asobiMenuTrigger');
  const closeButton = drawer.querySelector('#asobiMenuClose');
  const stats = drawer.querySelector('#asobiMenuStats');
  const status = drawer.querySelector('.asobi-dashboard-status');
  const number = n => Number.isFinite(n) && n >= 0 ? n.toLocaleString('ja-JP') : '—';
  let lastLoaded = 0, loading = false, opened = false;

  function syncProfile() {
    if (!player) return;
    const me = player.get();
    const avatar = drawer.querySelector('#asobiMenuAvatar');
    avatar.textContent = me.avatar;
    avatar.dataset.frame = me.frame || 'classic';
    drawer.querySelector('#asobiMenuName').textContent = me.name;
    drawer.querySelector('#asobiMenuLevel').textContent = 'LEVEL ' + me.level + ' · ' + number(me.xp) + ' XP';
  }
  async function refresh() {
    if (loading) return;
    loading = true;
    status.textContent = '最新の記録を取得中…';
    try {
      await activity.flush();
      const data = await activity.summary();
      drawer.querySelector('[data-count="visits"]').textContent = number(data.visits);
      for (const key of ['zero-dive', 'darts', 'dobon-quiz', 'sector-09'])
        drawer.querySelector(`[data-count="${key}"]`).textContent = number(data.games?.[key]);
      lastLoaded = Date.now();
      status.textContent = '集計更新：' + new Date(lastLoaded).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } catch {
      status.textContent = '記録を取得できませんでした。少し待ってから更新してね。';
    } finally { loading = false; }
  }
  function setOpen(next) {
    opened = next;
    drawer.classList.toggle('is-open', next);
    document.body.classList.toggle('asobi-menu-open', next);
    backdrop.hidden = !next;
    drawer.inert = !next;
    drawer.setAttribute('aria-hidden', String(!next));
    trigger()?.setAttribute('aria-expanded', String(next));
    if (next) { syncProfile(); closeButton.focus(); }
  }
  function close(restoreFocus = false) {
    if (!opened) return;
    setOpen(false);
    if (restoreFocus) trigger()?.focus();
  }
  document.addEventListener('click', event => {
    if (event.target.closest('#asobiMenuTrigger')) setOpen(!opened);
  });
  closeButton.addEventListener('click', () => close(true));
  backdrop.addEventListener('click', () => close(true));
  drawer.addEventListener('click', event => { if (event.target.closest('a[href]')) close(); });
  document.addEventListener('keydown', event => {
    if (!opened) return;
    if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
    if (event.key !== 'Tab') return;
    const focusables = [...drawer.querySelectorAll('a[href],button:not(:disabled),summary,input,select')].filter(el => el.getClientRects().length);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  stats.addEventListener('toggle', () => { if (stats.open && Date.now() - lastLoaded > 30000) void refresh(); });
  drawer.querySelector('#asobiStatsRefresh').addEventListener('click', refresh);
  drawer.querySelector('#asobiMenuRandom').addEventListener('click', () => {
    const games = player ? Object.values(player.GAMES) : [
      { href: '/zero-dive/' }, { href: '/darts/' }, { href: '/dobon-quiz/' }, { href: '/sector-09/' }
    ];
    location.href = games[Math.floor(Math.random() * games.length)].href;
  });
  addEventListener('asobi:player-updated', syncProfile);
  syncProfile();
  activity.visit();
})();
