/* 右上の「サイトの記録」メニュー。既存ホーム画面を変更せずに追加する。 */
(() => {
  'use strict';
  const activity = window.asobiActivity;
  if (!activity) return;
  const dashboard = document.createElement('div');
  dashboard.className = 'asobi-dashboard';
  dashboard.innerHTML = `
    <button type="button" class="asobi-dashboard-toggle" id="asobiStatsToggle" aria-expanded="false" aria-controls="asobiStatsPanel">
      <span class="icon" aria-hidden="true">☷</span> サイトの記録 <span class="chevron" aria-hidden="true">⌄</span>
    </button>
    <section id="asobiStatsPanel" class="asobi-dashboard-panel" aria-label="サイトの記録" hidden>
      <div class="asobi-dashboard-eyebrow">ASOBIROOM / LIVE STATS</div>
      <h2 class="asobi-dashboard-title">みんなのプレイ記録</h2>
      <p class="asobi-dashboard-sub">asobiroomで遊んだ回数を、みんなの分まとめて表示！</p>
      <div class="asobi-dashboard-total"><span>🏠 サイト訪問回数</span><strong data-count="visits">—</strong></div>
      <div class="asobi-dashboard-heading"><span>ゲーム別のプレイ回数</span><button class="asobi-dashboard-refresh" type="button" id="asobiStatsRefresh">↻ 更新</button></div>
      <ul class="asobi-dashboard-list">
        <li><a href="/zero-dive/"><span class="game-name">🌊 深海ゼロダイブ</span><span data-count="zero-dive">—</span></a></li>
        <li><a href="/darts/"><span class="game-name">🎯 FLIGHTLINE DARTS</span><span data-count="darts">—</span></a></li>
        <li><a href="/dobon-quiz/"><span class="game-name">💣 ドボンクイズ</span><span data-count="dobon-quiz">—</span></a></li>
        <li><a href="/sector-09/"><span class="game-name">👁️ 隔離区画09</span><span data-count="sector-09">—</span></a></li>
      </ul>
      <p class="asobi-dashboard-status" role="status" aria-live="polite">読み込み中…</p>
      <p class="asobi-dashboard-note">訪問回数はタブごとに1回、プレイ回数はゲーム開始時に加算。集計開始前の履歴は含みません（深海ゼロダイブの既存データを除く）。</p>
    </section>`;
  document.body.append(dashboard);

  const toggle = dashboard.querySelector('#asobiStatsToggle');
  const panel = dashboard.querySelector('#asobiStatsPanel');
  const status = dashboard.querySelector('.asobi-dashboard-status');
  const number = n => Number.isFinite(n) && n >= 0 ? n.toLocaleString('ja-JP') : '—';
  let lastLoaded = 0;
  let loading = false;

  async function refresh() {
    if (loading) return;
    loading = true;
    status.textContent = '最新の記録を取得中…';
    try {
      await activity.flush();
      const data = await activity.summary();
      dashboard.querySelector('[data-count="visits"]').textContent = number(data.visits);
      for (const key of ['zero-dive', 'darts', 'dobon-quiz', 'sector-09'])
        dashboard.querySelector(`[data-count="${key}"]`).textContent = number(data.games[key]);
      lastLoaded = Date.now();
      status.textContent = '集計更新：' + new Date(lastLoaded).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } catch {
      status.textContent = '集計サーバーの準備中、または通信できません。しばらくしてから更新してください。';
    } finally { loading = false; }
  }

  function close() { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
  function open() { panel.hidden = false; toggle.setAttribute('aria-expanded', 'true'); if (Date.now() - lastLoaded > 30000) void refresh(); }
  toggle.addEventListener('click', () => panel.hidden ? open() : close());
  dashboard.querySelector('#asobiStatsRefresh').addEventListener('click', refresh);
  document.addEventListener('pointerdown', e => { if (!dashboard.contains(e.target)) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { close(); toggle.focus(); } });
  activity.visit();
})();
