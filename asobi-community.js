/* ホームの共通プロフィール / ミッション / 実績 / 総合ランキング / 速報 / ルーレット */
(() => {
  'use strict';
  const player = window.asobiPlayer;
  const main = document.querySelector('main');
  if (!player || !main) return;
  const hub = document.createElement('section');
  hub.id = 'asobiCommunity';
  hub.className = 'arcade-hub';
  hub.setAttribute('aria-label', 'asobiroom プレイヤーズラウンジ');
  hub.innerHTML = `
    <div class="arcade-heading"><div><span class="arcade-kicker">ASOBIROOM / PLAYERS LOUNGE</span><h2>遊ぶほど、ひろがる。</h2><p>4つのゲームがつながる、あなただけのゲーム記録。</p></div><button class="arcade-random" type="button" id="arcadeRandom">🎲 なにして遊ぶ？</button></div>
    <div class="arcade-grid">
      <article class="arcade-card arcade-profile" id="arcadeProfile"><div class="arcade-card-top"><h3>🪪 マイプロフィール</h3><span class="arcade-chip">この端末に保存</span></div>
        <div class="arcade-identity"><span class="arcade-avatar" id="arcadeAvatar">🐣</span><div class="arcade-identity-meta"><span class="arcade-level" id="arcadeLevel">LEVEL 1</span><strong id="arcadeDisplayName">ゲスト</strong><span id="arcadeXp">0 XP</span></div></div>
        <div class="arcade-xpbar" role="progressbar" aria-label="次のレベルまでの経験値" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="arcadeXpBar"><span id="arcadeXpFill"></span></div><p class="arcade-small" id="arcadeNextLevel">次のレベルまで 50 XP</p>
        <form id="arcadeProfileForm"><label class="arcade-label" for="arcadeName">ニックネーム</label><div class="arcade-name-row"><input id="arcadeName" maxlength="16" autocomplete="nickname" placeholder="16文字以内"><button type="submit">保存</button></div><p class="arcade-small" id="arcadeNameStatus" role="status" aria-live="polite">公開する場合は個人情報や不適切な言葉を使わないでね。</p></form>
        <div class="arcade-label">アバター（レベルで解放）</div><div class="arcade-avatars" id="arcadeAvatars"></div>
        <div class="arcade-label">アイコンのフレーム</div><p class="arcade-small arcade-frame-hint">好きな組み合わせを選んで、自分だけのアイコンにしよう。</p><div class="arcade-frames" id="arcadeFrames" role="group" aria-label="アイコンのフレームを選択"></div>
        <label class="arcade-optin"><input type="checkbox" id="arcadePublic"><span>総合ランキングとプレイ速報に参加する<small>オンにするとニックネーム・アバター・これからのプレイ記録が公開されます。</small></span></label>
        <p class="arcade-small">ログイン不要・端末ごとに保存。端末を変えると記録は引き継がれません。</p>
      </article>
      <article class="arcade-card"><div class="arcade-card-top"><h3>📅 今日のミッション</h3><span class="arcade-chip" id="arcadeMissionDate"></span></div><p class="arcade-muted">毎日0時（日本時間）に新しいミッション！ 達成したら受け取ろう。</p><div id="arcadeMissions" class="arcade-missions"></div></article>
      <article class="arcade-card"><div class="arcade-card-top"><h3>🏆 実績コレクション</h3><span class="arcade-chip" id="arcadeAchievementCount">0 / 7</span></div><p class="arcade-muted">遊びながらトロフィーを集めよう。未獲得の実績もチェック！</p><div class="arcade-achievements" id="arcadeAchievements"></div></article>
      <article class="arcade-card" id="arcadeRankings"><div class="arcade-card-top"><h3>🥇 みんなの総合ランキング</h3><button type="button" class="arcade-reload" id="arcadeReload">↻ 更新</button></div><div class="arcade-periods" role="group" aria-label="ランキング期間"><button type="button" data-period="week" aria-pressed="true">今週</button><button type="button" data-period="month" aria-pressed="false">今月</button><button type="button" data-period="all" aria-pressed="false">累計</button></div><div id="arcadeLeaderboard" class="arcade-leaderboard" aria-live="polite">読み込み中…</div><p class="arcade-small">4ゲーム共通のXP順位。公開参加者のみ、集計開始後の記録が対象です。</p><p class="arcade-small"><a href="/contact.html">不適切な名前の通報・削除依頼はこちら</a></p></article>
      <article class="arcade-card"><div class="arcade-card-top"><h3>📡 みんなのプレイ速報</h3><span class="arcade-live">● LIVE</span></div><div class="arcade-feed" id="arcadeFeed" aria-live="polite">読み込み中…</div><p class="arcade-small">公開に同意した人の最近のプレイのみ表示します。</p><p class="arcade-small"><a href="/contact.html">表示内容を通報する</a></p></article>
      <article class="arcade-card arcade-pwa"><div class="arcade-card-top"><h3>📱 ホーム画面から遊ぼう</h3><span class="arcade-chip">APP MODE</span></div><div class="arcade-app-mark">🚪</div><p>asobiroomをホーム画面に追加すると、アプリのようにすぐ開けるよ。</p><button type="button" class="arcade-install" id="arcadeInstall">ホーム画面に追加する方法</button><p class="arcade-small" id="arcadeInstallHelp">iPhoneはSafariの「共有」→「ホーム画面に追加」。Androidはブラウザのメニューから追加できます。</p><p class="arcade-small">ゲームの利用にはインターネット接続が必要な場合があります。</p></article>
    </div><p class="arcade-disclaimer">※ XPと実績はブラウザに保存されます。ランキングは自己申告のプレイイベントによるカジュアルな集計で、厳密な競技記録ではありません。</p>`;
  // ゲーム一覧を主役に。プレイヤー機能は作品棚の下にまとめる。
  main.append(hub);
  const $ = selector => hub.querySelector(selector);
  const number = value => Number(value || 0).toLocaleString('ja-JP');
  const node = (tag, className, value) => { const el = document.createElement(tag); if (className) el.className = className; if (value !== undefined) el.textContent = value; return el; };
  const gameIcons = player.GAMES;
  let period = 'week', lastFeed = [], lastRanks = [], loading = false, pendingRefresh = false;

  function render() {
    const me = player.get();
    $('#arcadeAvatar').textContent = me.avatar;
    $('#arcadeAvatar').dataset.frame = me.frame;
    $('#arcadeDisplayName').textContent = me.name;
    $('#arcadeLevel').textContent = 'LEVEL ' + me.level;
    $('#arcadeXp').textContent = number(me.xp) + ' XP · ' + number(me.starts) + ' プレイ';
    const width = 100 * (me.xp - me.currentLevelXp) / (me.nextLevelXp - me.currentLevelXp);
    $('#arcadeXpFill').style.width = Math.max(0, Math.min(width, 100)) + '%';
    $('#arcadeXpBar').setAttribute('aria-valuenow', String(Math.round(width)));
    $('#arcadeNextLevel').textContent = 'レベル ' + (me.level + 1) + ' まで ' + number(me.nextLevelXp - me.xp) + ' XP';
    if (document.activeElement !== $('#arcadeName')) $('#arcadeName').value = me.name;
    $('#arcadePublic').checked = !!me.public;
    $('#arcadeAvatars').replaceChildren();
    player.AVATARS.forEach((emoji, index) => {
      const locked = me.level < player.LEVELS[index];
      const button = node('button', 'arcade-avatar-option', emoji);
      button.type = 'button'; button.disabled = locked;
      button.title = locked ? 'レベル ' + player.LEVELS[index] + ' で解放' : 'このアバターを選択';
      button.setAttribute('aria-label', locked ? emoji + '（レベル' + player.LEVELS[index] + 'で解放）' : emoji + 'を選択');
      button.setAttribute('aria-pressed', String(emoji === me.avatar));
      button.addEventListener('click', () => player.update({ avatar: emoji }));
      $('#arcadeAvatars').append(button);
    });
    $('#arcadeFrames').replaceChildren();
    player.FRAMES.forEach(frame => {
      const button = node('button', 'arcade-frame-option');
      button.type = 'button';
      button.setAttribute('aria-pressed', String(frame.id === me.frame));
      button.setAttribute('aria-label', frame.name + 'のフレームを選択');
      const preview = node('span', 'arcade-frame-preview', me.avatar);
      preview.dataset.frame = frame.id;
      button.append(preview, node('small', '', frame.name));
      button.addEventListener('click', () => player.update({ frame: frame.id }));
      $('#arcadeFrames').append(button);
    });
    $('#arcadeMissionDate').textContent = player.day().replaceAll('-', '/');
    $('#arcadeMissions').replaceChildren();
    player.missions().forEach(mission => {
      const item = node('div', 'arcade-mission');
      const top = node('div', 'arcade-mission-top');
      const icon = node('span', 'arcade-mission-icon', mission.icon);
      const details = node('div', 'arcade-mission-copy');
      details.append(node('strong', '', mission.title), node('small', '', mission.description));
      const action = node('button', 'arcade-claim', mission.claimed ? '受取済' : mission.current >= mission.target ? '+' + mission.bonus + ' XP' : mission.current + ' / ' + mission.target);
      action.type = 'button'; action.disabled = mission.claimed || mission.current < mission.target;
      action.addEventListener('click', () => player.claim(mission.id));
      top.append(icon, details, action);
      const track = node('div', 'arcade-mission-track'); const fill = node('span', '');
      fill.style.width = 100 * mission.current / mission.target + '%'; track.append(fill);
      item.append(top, track); $('#arcadeMissions').append(item);
    });
    const badges = player.achievements();
    $('#arcadeAchievementCount').textContent = badges.filter(x => x.earned).length + ' / ' + badges.length;
    $('#arcadeAchievements').replaceChildren();
    badges.forEach(badge => {
      const item = node('div', 'arcade-badge' + (badge.earned ? ' earned' : ''));
      item.append(node('span', 'arcade-badge-icon', badge.earned ? badge.icon : '🔒'), node('strong', '', badge.title), node('small', '', badge.hint));
      $('#arcadeAchievements').append(item);
    });
  }
  function rankView() {
    const area = $('#arcadeLeaderboard'); area.replaceChildren();
    if (!lastRanks.length) { area.append(node('p', 'arcade-empty', 'まだランクインした人はいません。最初の挑戦者になろう！')); return; }
    lastRanks.forEach((r, i) => {
      const row = node('div', 'arcade-rank');
      row.append(node('span', 'arcade-rank-pos', i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1)), node('span', 'arcade-rank-avatar', r.avatar), node('strong', 'arcade-rank-name', player.publicName(r.name)), node('b', 'arcade-rank-xp', number(r.xp) + ' XP'));
      area.append(row);
    });
  }
  function feedView() {
    const area = $('#arcadeFeed'); area.replaceChildren();
    if (!lastFeed.length) { area.append(node('p', 'arcade-empty', '公開プレイの速報はまだありません。')); return; }
    for (const item of lastFeed) {
      const game = gameIcons[item.game]; if (!game) continue;
      const row = node('div', 'arcade-feed-item');
      row.append(node('span', 'arcade-feed-icon', item.avatar || '🎮'));
      const copy = node('div', 'arcade-feed-copy');
      copy.append(node('strong', '', player.publicName(item.name)), node('span', '', game.icon + ' ' + game.name + (item.action === 'clear' ? 'をクリア！' : 'をプレイ！')));
      row.append(copy, node('time', '', new Date(item.created).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })));
      area.append(row);
    }
  }
  async function refresh() {
    if (loading) { pendingRefresh = true; return; }
    loading = true;
    const requestedPeriod = period;
    $('#arcadeLeaderboard').textContent = 'ランキングを取得中…';
    try {
      await player.flush();
      const data = await player.community(requestedPeriod);
      lastRanks = Array.isArray(data.leaderboard) ? data.leaderboard : [];
      lastFeed = Array.isArray(data.feed) ? data.feed : [];
      rankView(); feedView();
    } catch {
      $('#arcadeLeaderboard').textContent = 'いまはランキングに接続できません。後で更新してね。';
      if (!lastFeed.length) $('#arcadeFeed').textContent = '速報を取得できませんでした。';
    } finally {
      loading = false;
      if (pendingRefresh || period !== requestedPeriod) { pendingRefresh = false; void refresh(); }
    }
  }
  $('#arcadeProfileForm').addEventListener('submit', event => {
    event.preventDefault();
    const saved = player.update({ name: $('#arcadeName').value });
    $('#arcadeNameStatus').textContent = saved ? 'ニックネームを保存しました。' : '16文字以内で、URL・連絡先・不適切な言葉を含まない名前にしてね。';
    if (saved) $('#arcadeName').blur();
  });
  $('#arcadePublic').addEventListener('change', event => player.update({ public: event.target.checked }));
  hub.querySelectorAll('[data-period]').forEach(button => button.addEventListener('click', () => {
    period = button.dataset.period;
    hub.querySelectorAll('[data-period]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    void refresh();
  }));
  $('#arcadeReload').addEventListener('click', refresh);
  $('#arcadeRandom').addEventListener('click', () => {
    const button = $('#arcadeRandom'); button.disabled = true;
    const games = Object.values(gameIcons); let spins = 0;
    const timer = setInterval(() => {
      const chosen = games[Math.floor(Math.random() * games.length)];
      button.textContent = chosen.icon + ' ' + chosen.name;
      if (++spins >= 10) { clearInterval(timer); setTimeout(() => { location.href = chosen.href; }, 420); }
    }, 110);
  });
  let installPrompt;
  addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('#arcadeInstall').textContent = '📲 asobiroom をインストール'; });
  $('#arcadeInstall').addEventListener('click', async () => {
    if (installPrompt) { const prompt = installPrompt; installPrompt = null; await prompt.prompt(); }
    else { $('#arcadeInstallHelp').classList.toggle('arcade-highlight'); $('#arcadeInstallHelp').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  });
  addEventListener('asobi:player-updated', render);
  addEventListener('storage', event => { if (event.key === 'asobiroom-player-v1') location.reload(); });
  render(); void refresh();
  setInterval(() => { render(); if (!document.hidden) void refresh(); }, 60000);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/service-worker.js').catch(() => {});
})();
