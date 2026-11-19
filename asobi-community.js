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
    <div class="arcade-heading"><div><span class="arcade-kicker">ASOBIROOM / PLAYERS LOUNGE</span><h2>遊ぶほど、ひろがる。</h2><p>ゲームがつながる、あなただけのゲーム記録。</p></div><button class="arcade-random" type="button" id="arcadeRandom">🎲 なにして遊ぶ？</button></div>
    <div class="arcade-grid">
      <article class="arcade-card arcade-profile" id="arcadeProfile"><div class="arcade-card-top"><h3>🪪 マイプロフィール</h3><span class="arcade-chip">この端末に保存</span></div>
        <div class="arcade-identity"><span class="arcade-avatar" id="arcadeAvatar">🐣</span><div class="arcade-identity-meta"><span class="arcade-level" id="arcadeLevel">LEVEL 1</span><strong id="arcadeDisplayName">ゲスト</strong><span id="arcadeXp">0 XP</span></div></div>
        <div class="arcade-xpbar" role="progressbar" aria-label="次のレベルまでの経験値" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="arcadeXpBar"><span id="arcadeXpFill"></span></div><p class="arcade-small" id="arcadeNextLevel">次のレベルまで 50 XP</p>
        <form id="arcadeProfileForm"><label class="arcade-label" for="arcadeName">ニックネーム</label><div class="arcade-name-row"><input id="arcadeName" maxlength="16" autocomplete="nickname" placeholder="16文字以内"><button type="submit">保存</button></div><p class="arcade-small" id="arcadeNameStatus" role="status" aria-live="polite">名前は全プレイヤー共通で重複できません。個人情報を使わないでね。</p></form>
        <div class="arcade-label">アバター（レベルで解放）</div><div class="arcade-avatars" id="arcadeAvatars"></div>
        <div class="arcade-label">アイコンのフレーム</div><p class="arcade-small arcade-frame-hint">好きな組み合わせを選んで、自分だけのアイコンにしよう。</p><div class="arcade-frames" id="arcadeFrames" role="group" aria-label="アイコンのフレームを選択"></div>
        <p class="arcade-auto-note">● ランキングとプレイ速報は自動記録<small>ニックネーム・アイコン・成績を公開します。速報はプレイ開始のみ。ゲスト名も自動で割り当てられます。</small></p>
        <p id="arcadeSessionStatus" class="arcade-small" role="status"></p>
        <details class="arcade-backup"><summary>🔑 プロフィールのバックアップ・引き継ぎ</summary><p class="arcade-small">名前・XP・プレイ数・実績・装備を保存。キーは他人に渡さず、端末の外へ控えてください。ゲーム個別の途中セーブは含みません。</p><button type="button" id="arcadeBackupCreate">バックアップキーを発行</button><div id="arcadeBackupResult" hidden><label for="arcadeBackupKey" class="arcade-label">今回のキー（この画面で控えてください）</label><textarea id="arcadeBackupKey" readonly rows="3" spellcheck="false"></textarea><div class="arcade-backup-actions"><button type="button" id="arcadeBackupCopy">コピー</button><a id="arcadeBackupDownload" download="asobiroom-profile-backup.txt">テキストで保存</a></div></div><p class="arcade-small">新しく発行すると以前のキーは無効になります。発行後のプロフィールも接続中に自動保存。復元は一度限りで、以前の端末はログアウトします。復元後に新しいキーを発行してください。</p><form id="arcadeRestoreForm"><label for="arcadeRestoreKey" class="arcade-label">別の端末・消去前のプロフィールを復元</label><textarea id="arcadeRestoreKey" rows="3" placeholder="ASOBI-…" autocomplete="off" spellcheck="false" required></textarea><button type="submit">この端末に引き継ぐ</button></form><button id="arcadeStartGuest" type="button" hidden>新しいゲストで遊ぶ</button><p id="arcadeBackupStatus" class="arcade-small" role="status" aria-live="polite"></p></details>
      </article>
      <article class="arcade-card"><div class="arcade-card-top"><h3>📅 今日のミッション</h3><span class="arcade-chip" id="arcadeMissionDate"></span></div><p class="arcade-muted">毎日0時（日本時間）に新しいミッション！ 達成したら受け取ろう。</p><div id="arcadeMissions" class="arcade-missions"></div></article>
      <article class="arcade-card"><div class="arcade-card-top"><h3>🏆 実績コレクション</h3><span class="arcade-chip" id="arcadeAchievementCount">0 / 7</span></div><p class="arcade-muted">遊びながらトロフィーを集めよう。未獲得の実績もチェック！</p><div class="arcade-achievements" id="arcadeAchievements"></div></article>
      <article class="arcade-card" id="arcadeRankings"><div class="arcade-card-top"><h3>🥇 みんなの総合ランキング</h3><button type="button" class="arcade-reload" id="arcadeReload">↻ 更新</button></div><div class="arcade-periods" role="group" aria-label="ランキング期間"><button type="button" data-period="week" aria-pressed="true">今週</button><button type="button" data-period="month" aria-pressed="false">今月</button><button type="button" data-period="all" aria-pressed="false">累計</button></div><div id="arcadeLeaderboard" class="arcade-leaderboard" aria-live="polite">読み込み中…</div><p class="arcade-small">対応ゲームのXP順位。集計開始後の記録が対象です。チェック操作なしで自動参加します。</p><p class="arcade-small"><a href="/contact.html">不適切な名前の通報・削除依頼はこちら</a></p></article>
      <article class="arcade-card"><div class="arcade-card-top"><h3>📡 みんなのプレイ速報</h3><span class="arcade-live">● LIVE</span></div><div class="arcade-feed" id="arcadeFeed" aria-live="polite">読み込み中…</div><p class="arcade-small">最近のプレイ開始を表示します。クリアの速報は表示しません。</p><p class="arcade-small"><a href="/contact.html">表示内容を通報する</a></p></article>
      <article class="arcade-card arcade-pwa"><div class="arcade-card-top"><h3>📱 ホーム画面から遊ぼう</h3><span class="arcade-chip">APP MODE</span></div><div class="arcade-app-mark">🚪</div><p>asobiroomをホーム画面に追加すると、アプリのようにすぐ開けるよ。</p><button type="button" class="arcade-install" id="arcadeInstall">ホーム画面に追加する方法</button><p class="arcade-small" id="arcadeInstallHelp">iPhoneはSafariの「共有」→「ホーム画面に追加」。Androidはブラウザのメニューから追加できます。</p><p class="arcade-small">ゲームの利用にはインターネット接続が必要な場合があります。</p></article>
    </div><p class="arcade-disclaimer">※ XPと実績はブラウザに保存されます。ランキングは自己申告のプレイイベントによるカジュアルな集計で、厳密な競技記録ではありません。</p>`;
  // ゲーム一覧を主役に。プレイヤー機能は作品棚の下にまとめる。
  main.append(hub);
  const $ = selector => hub.querySelector(selector);
  const number = value => Number(value || 0).toLocaleString('ja-JP');
  const node = (tag, className, value) => { const el = document.createElement(tag); if (className) el.className = className; if (value !== undefined) el.textContent = value; return el; };
  const publicAvatar = (className, value) => {
    const [emoji, frame] = typeof value === 'string' ? value.split('|') : [];
    const icon = node('span', className, player.AVATARS.includes(emoji) ? emoji : '🐣');
    icon.dataset.frame = player.FRAMES.some(item => item.id === frame) ? frame : 'classic';
    return icon;
  };
  const gameIcons = player.GAMES;
  let period = 'week', lastFeed = [], lastRanks = [], loading = false, pendingRefresh = false, lastRefresh = 0;

  function render() {
    const me=player.get();$('#arcadeSessionStatus').textContent=me.loggedOut?'ほかの端末へ引き継がれたためログアウトしました。キーで復元するか、新しいゲストで始めてください。':'この端末で接続中 · プロフィールは自動保存';$('#arcadeBackupCreate').disabled=!!me.loggedOut;$('#arcadeStartGuest').hidden=!me.loggedOut;$('#arcadeProfileForm button').disabled=!!me.loggedOut;
    $('#arcadeAvatar').textContent = me.avatar;
    $('#arcadeAvatar').dataset.frame = me.frame;
    $('#arcadeDisplayName').textContent = me.name; if(me.role==='admin')$('#arcadeDisplayName').append(adminBadge());
    $('#arcadeLevel').textContent = 'LEVEL ' + me.level;
    $('#arcadeXp').textContent = number(me.xp) + ' XP · ' + number(me.starts) + ' プレイ';
    const width = 100 * (me.xp - me.currentLevelXp) / (me.nextLevelXp - me.currentLevelXp);
    $('#arcadeXpFill').style.width = Math.max(0, Math.min(width, 100)) + '%';
    $('#arcadeXpBar').setAttribute('aria-valuenow', String(Math.round(width)));
    $('#arcadeNextLevel').textContent = 'レベル ' + (me.level + 1) + ' まで ' + number(me.nextLevelXp - me.xp) + ' XP';
    if (document.activeElement !== $('#arcadeName')) $('#arcadeName').value = me.name;
    $('#arcadeAvatars').replaceChildren();
    player.AVATARS.forEach((emoji, index) => {
      const admin=player.ADMIN_AVATARS.has(emoji),locked=!!me.loggedOut||!player.canAvatar(emoji),secret=index>=24&&!admin;
      const button = node('button', 'arcade-avatar-option', locked&&(secret||admin)?'🔒':emoji);
      button.type = 'button'; button.disabled = locked;
      button.title=locked?(admin?'運営者限定':(secret?'シークレット / ':'')+'レベル '+player.LEVELS[index]+' で解放'):(admin?'運営者限定アイコン':'このアバターを選択');
      button.setAttribute('aria-label',locked?button.title:emoji+'を選択');
      button.setAttribute('aria-pressed', String(emoji === me.avatar));
      button.addEventListener('click', () => player.update({ avatar: emoji }));
      $('#arcadeAvatars').append(button);
    });
    $('#arcadeFrames').replaceChildren();
    player.FRAMES.forEach(frame => {
      const button = node('button', 'arcade-frame-option');
      const locked=!!me.loggedOut||!player.canFrame(frame.id);button.type='button';button.disabled=locked;button.title=locked?(frame.admin?'運営者限定':'シークレット / レベル '+frame.level+'で解放'):frame.name;
      button.setAttribute('aria-pressed', String(frame.id === me.frame));
      button.setAttribute('aria-label',locked?button.title:frame.name+'のフレームを選択');
      const preview = node('span','arcade-frame-preview',locked?'🔒':me.avatar);preview.dataset.frame=locked?'classic':frame.id;button.append(preview,node('small','',locked?(frame.admin?'運営者限定':'??? / Lv.'+frame.level):frame.name));
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
  const adminBadge=()=>node('small','asobi-admin-badge','運営者 · ADMIN');
  function rankView() {
    const area = $('#arcadeLeaderboard'); area.replaceChildren();
    if (!lastRanks.length) { area.append(node('p', 'arcade-empty', 'まだランクインした人はいません。最初の挑戦者になろう！')); return; }
    lastRanks.forEach((r, i) => {
      const row = node('div', 'arcade-rank');
      row.append(node('span', 'arcade-rank-pos', i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1)), publicAvatar('arcade-rank-avatar', r.avatar), node('strong', 'arcade-rank-name', player.publicName(r.name)), node('b', 'arcade-rank-xp', number(r.xp) + ' XP'));
      if(r.role==='admin')row.querySelector('.arcade-rank-name').append(adminBadge());area.append(row);
    });
  }
  function feedView() {
    const area = $('#arcadeFeed'); area.replaceChildren();
    if (!lastFeed.length) { area.append(node('p', 'arcade-empty', '公開プレイの速報はまだありません。')); return; }
    for(const item of lastFeed.filter(item=>item.action==='start')){
      const game = gameIcons[item.game]; if (!game) continue;
      const row = node('div', 'arcade-feed-item');
      row.append(publicAvatar('arcade-feed-icon', item.avatar));
      const copy = node('div', 'arcade-feed-copy');
      copy.append(node('strong', '', player.publicName(item.name)), node('span', '', game.icon + ' ' + game.name + 'をプレイ！'));
      if(item.role==='admin')copy.querySelector('strong').append(adminBadge());
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
      rankView(); feedView(); lastRefresh=Date.now();
    } catch {
      $('#arcadeLeaderboard').textContent = 'いまはランキングに接続できません。後で更新してね。';
      if (!lastFeed.length) $('#arcadeFeed').textContent = '速報を取得できませんでした。';
    } finally {
      loading = false;
      if (pendingRefresh || period !== requestedPeriod) { pendingRefresh = false; void refresh(); }
    }
  }
  let backupURL=null;
  $('#arcadeBackupCreate').onclick=async()=>{const button=$('#arcadeBackupCreate');button.disabled=true;$('#arcadeBackupStatus').textContent='プロフィールを保存してキーを発行中…';try{const result=await player.createBackup();$('#arcadeBackupKey').value=result.key;$('#arcadeBackupResult').hidden=false;if(backupURL)URL.revokeObjectURL(backupURL);backupURL=URL.createObjectURL(new Blob(['asobiroom プロフィール引き継ぎキー\n'+result.name+'\n'+result.key+'\n\n他人に渡さないでください。一度復元すると無効になります。復元後は新しいキーを発行してください。'],{type:'text/plain;charset=utf-8'}));$('#arcadeBackupDownload').href=backupURL;$('#arcadeBackupStatus').textContent='キーを端末の外へ保管してください。以前のキーは無効になりました。';}catch(error){$('#arcadeBackupStatus').textContent=error.message;}finally{button.disabled=!!player.get().loggedOut;}};
  $('#arcadeBackupCopy').onclick=async()=>{try{await navigator.clipboard.writeText($('#arcadeBackupKey').value);$('#arcadeBackupStatus').textContent='コピーしました。安全な場所へ保管してください。';}catch{$('#arcadeBackupKey').focus();$('#arcadeBackupKey').select();$('#arcadeBackupStatus').textContent='キーを選択しました。コピーするかテキストで保存してください。';}};
  $('#arcadeRestoreForm').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter||$('#arcadeRestoreForm button');button.disabled=true;$('#arcadeBackupStatus').textContent='プロフィールを復元中…';try{await player.restoreBackup($('#arcadeRestoreKey').value);$('#arcadeRestoreKey').value='';$('#arcadeBackupKey').value='';$('#arcadeBackupResult').hidden=true;$('#arcadeBackupStatus').textContent='引き継ぎました。前の端末はログアウトし、このキーは使用済みになりました。新しいキーを発行してください。';render();void refresh();}catch(error){$('#arcadeBackupStatus').textContent=error.message;}finally{button.disabled=false;}});
  $('#arcadeStartGuest').onclick=()=>{player.startGuest();$('#arcadeBackupKey').value='';$('#arcadeBackupResult').hidden=true;render();};
  $('#arcadeProfileForm').addEventListener('submit',async event=>{
    event.preventDefault();const button=event.submitter||$('#arcadeProfileForm button');button.disabled=true;$('#arcadeNameStatus').textContent='名前の重複を確認中…';
    try{await player.updateName($('#arcadeName').value);$('#arcadeNameStatus').textContent='ニックネームを保存しました。';$('#arcadeName').blur();render();void refresh();}catch(error){$('#arcadeNameStatus').textContent=error.message;}finally{button.disabled=false;}
  });
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
  addEventListener('storage',event=>{if(event.key==='asobiroom-player-v1')render();});
  render(); void refresh();
  setInterval(()=>{render();},60000);
  setInterval(()=>{if(!document.hidden)void refresh();},20000);
  const refreshOnReturn=()=>{if(!document.hidden&&Date.now()-lastRefresh>3000)void refresh();};
  addEventListener('focus',refreshOnReturn);document.addEventListener('visibilitychange',refreshOnReturn);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/service-worker.js').catch(() => {});
})();
