/* asobiroom 共通プロフィール。進行状況・固有の名前・自動記録の公開コミュニティ。 */
(() => {
  'use strict';
  const KEY = 'asobiroom-player-v1';
  const QUEUE = 'asobiroom-community-pending-v1';
  const API = window.asobiApi ? window.asobiApi('/api/community') : '/api/community';
  const GAMES = Object.freeze({
    kyudo: { name: '弓道 — 一射の間', icon: '🏹', href: '/kyudo.html' },
    'sector-02': { name: '隔離区画02｜呪われた屋敷', icon: '🕯️', href: '/sector-02/' },
    gunman: { name: '早撃ちガンマン', icon: '🤠', href: '/gunman.html' },
    'homerun-impact': { name: 'ホームラン・インパクト', icon: '⚾', href: '/homerun-impact.html' },
    'zero-dive': { name: '深海ゼロダイブ', icon: '🌊', href: '/zero-dive/' },
    darts: { name: 'FLIGHTLINE DARTS', icon: '🎯', href: '/darts/' },
    'dobon-quiz': { name: 'ドボンクイズ', icon: '💣', href: '/dobon-quiz/' },
    'sector-09': { name: '隔離区画01', icon: '👁️', href: '/sector-01/' },
    billiards: { name: 'BILLIARDS CLUB', icon: '🎱', href: '/billiards/' },
    bowling: { name: 'ポケット・ボウリング', icon: '🎳', href: '/bowling/' },
    'crystal-pop': { name: 'クリスタル・ポップ', icon: '💎', href: '/crystal-pop/' }
  });
  const AVATARS = ['🐣', '🐈', '🐳', '🎯', '💣', '🦊', '🤖', '👑', '🐶', '🐰', '🐼', '🐸', '🦋', '🦄', '🐙', '🦈', '🐧', '🦖', '🚀', '🌙', '⭐', '🎮', '👾', '🐲', '🦅', '🦁', '🪐', '🦚', '🔮', '🌌', '🛡️', '🗝️'];
  const LEVELS = [1, 1, 1, 2, 3, 4, 6, 10, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 4, 5, 5, 6, 8, 12, 15, 20, 25, 30, 40, 0, 0];
  const FRAMES = Object.freeze([
    { id: 'classic', name: 'ベーシック' }, { id: 'sunshine', name: 'サンシャイン' },
    { id: 'ocean', name: 'オーシャン' }, { id: 'cherry', name: 'チェリー' },
    { id: 'mint', name: 'ミント' }, { id: 'cosmic', name: 'コスモ' },
    { id: 'neon', name: 'ネオン' }, { id: 'royal', name: 'ロイヤル' },
    { id: 'rainbow', name: 'レインボー' }, { id: 'pixel', name: 'ピクセル' },
    {id:'aurora',name:'オーロラ',level:12,secret:true},{id:'obsidian',name:'黒曜',level:15,secret:true},
    {id:'starlight',name:'星冠',level:20,secret:true},{id:'phoenix',name:'不死鳥',level:25,secret:true},
    {id:'diamond',name:'ダイヤ',level:30,secret:true},{id:'infinity',name:'無限星',level:40,secret:true},
    {id:'admin-gold',name:'運営者・金章',admin:true},{id:'admin-eclipse',name:'運営者・月章',admin:true}
  ]);
  const ADMIN_AVATARS=new Set(['🛡️','🗝️']);
  const guestName=()=>{const chars='abcdefghijklmnopqrstuvwxyz0123456789',b=crypto.getRandomValues(new Uint8Array(4));let t=Array.from(b,x=>chars[x%36]).join('');if(!/[a-z]/.test(t))t='a'+t.slice(1);if(!/\d/.test(t))t=t.slice(0,3)+(b[3]%10);return 'ゲスト'+t;};
  const blank = () => ({ id: crypto.randomUUID(), name: guestName(), avatar: '🐣', frame: 'classic', public: true, role:'player', xp: 0, starts: 0, clears: 0, games: {}, recent: [], claimed: {} });
  let state;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    state = saved && typeof saved.id === 'string' && /^[a-f\d-]{36}$/i.test(saved.id) ? { ...blank(), ...saved } : blank();
    if (!Array.isArray(state.recent)) state.recent = [];
    if (!state.games || typeof state.games !== 'object') state.games = {};
    if (!state.claimed || typeof state.claimed !== 'object') state.claimed = {};
    if (!AVATARS.includes(state.avatar)) state.avatar = '🐣';
    if (!FRAMES.some(frame => frame.id === state.frame)) state.frame = 'classic';
  } catch { state = blank(); }
  state.public=true;state.role='player';if(state.name==='ゲスト')state.name=guestName();
  const SESSION=KEY+'-session';const freshToken=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');let sessionToken;try{sessionToken=localStorage.getItem(SESSION);}catch{}if(!/^[a-f0-9]{64}$/.test(sessionToken||'')){sessionToken=freshToken();try{localStorage.setItem(SESSION,sessionToken);}catch{}}let identityVersion=0;
  let pending = [];
  try {
    const saved = JSON.parse(localStorage.getItem(QUEUE) || '[]');
    if (Array.isArray(saved)) pending = saved.filter(x => x && typeof x.id === 'string').slice(-120);
  } catch { /* storage unavailable */ }
  let flushing = false;

  const day = (timestamp = Date.now()) => new Date(timestamp + 9 * 3600000).toISOString().slice(0, 10);
  const level = () => Math.floor(Math.sqrt(Math.max(0, Number(state.xp) || 0) / 50)) + 1;
  const threshold = n => 50 * (n - 1) ** 2;
  const normalizeName = value => typeof value === 'string' ? value.normalize('NFKC').trim() : '';
  // 公開される表示名には、連絡先・URL・脅迫表現などを登録させない。
  // フロント側だけでなく Worker も同じ条件で検査する。
  const prohibitedName = /(?:https?:\/\/|www\.|[^\s@]+@[^\s@]+\.[^\s@]+|(?:\d[\s()-]?){9,}|死\s*ね|し\s*ね|シ\s*ネ|殺\s*す|こ\s*ろ\s*す|コ\s*ロ\s*ス|自殺\s*しろ|kill\s*yourself|\bkys\b|fuck|nigg)/iu;
  const isPublicNameAllowed = value => {
    const name = normalizeName(value);
    return name.length > 0 && name.length <= 16 && !/[\p{Cc}\p{Cf}<>]/u.test(name) && !prohibitedName.test(name);
  };
  const publicName = value => isPublicNameAllowed(value) ? normalizeName(value) : '非公開ユーザー';
  state.name = publicName(state.name);
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); localStorage.setItem(QUEUE, JSON.stringify(pending)); } catch { /* memory-only */ }
    dispatchEvent(new CustomEvent('asobi:player-updated'));
  }
  const snapshot = () => ({ ...state, games: { ...state.games }, recent: [...state.recent], claimed: { ...state.claimed }, level: level(), nextLevelXp: threshold(level() + 1), currentLevelXp: threshold(level()) });

  function missions(today = day()) {
    const dailyGame = Object.keys(GAMES)[Number(today.replaceAll('-', '')) % Object.keys(GAMES).length];
    const events = state.recent.filter(event => day(event.time) === today && event.action === 'start');
    const defs = [
      { id: 'first', icon: '✨', title: '今日の初プレイ', description: 'ゲームを1回遊ぶ', target: 1, current: events.length, bonus: 15 },
      { id: 'three', icon: '⚡', title: '3回チャレンジ', description: 'どれかのゲームを合計3回遊ぶ', target: 3, current: events.length, bonus: 30 },
      { id: 'pick', icon: GAMES[dailyGame].icon, title: '今日のおすすめ', description: GAMES[dailyGame].name + 'を遊ぶ', target: 1, current: events.filter(x => x.game === dailyGame).length, bonus: 25 }
    ];
    return defs.map(x => ({ ...x, current: Math.min(x.current, x.target), claimed: !!state.claimed[today + ':' + x.id] }));
  }
  function claim(id) {
    if(state.loggedOut)return false;
    const task = missions().find(x => x.id === id);
    if (!task || task.claimed || task.current < task.target) return false;
    state.claimed[day() + ':' + id] = true;
    state.xp += task.bonus;
    setInterval(()=>{if(!document.hidden&&!state.loggedOut)void syncIdentity().catch(()=>{});},30000);
  save();void syncIdentity().catch(()=>{});
    return true;
  }
  function achievements() {
    const distinct = Object.values(state.games).filter(n => n > 0).length;
    const count = Object.values(state.claimed).filter(Boolean).length;
    return [
      { icon: '🌱', title: 'はじめの一歩', hint: '初めて遊ぶ', earned: state.starts >= 1 },
      { icon: '🎮', title: 'ゲーム探検家', hint: '異なる4作品を遊ぶ', earned: distinct >= 4 },
      { icon: '🔥', title: '常連さん', hint: '合計10回遊ぶ', earned: state.starts >= 10 },
      { icon: '🏆', title: 'クリア名人', hint: '5回クリアする', earned: state.clears >= 5 },
      { icon: '🌟', title: '100回の挑戦', hint: '合計100回遊ぶ', earned: state.starts >= 100 },
      { icon: '📅', title: 'ミッション上手', hint: 'ミッションを10個達成', earned: count >= 10 },
      { icon: '💎', title: 'レベル10', hint: 'レベル10に到達', earned: level() >= 10 }
    ];
  }
  let identityFlight=null;
  const identityAPI=window.asobiApi?window.asobiApi('/api/player'):'/api/player';
  const credentials=()=>({playerId:state.id,sessionToken});
  const progress=()=>({xp:state.xp,starts:state.starts,clears:state.clears,games:state.games,claimed:state.claimed,recent:state.recent});
  function revokeSession(){identityVersion++;state.loggedOut=true;state.public=false;state.role='player';pending=[];save();dispatchEvent(new CustomEvent('asobi:session-revoked'));}
  async function syncIdentity(){
    if(state.loggedOut)throw Error('ほかの端末へ引き継がれたためログアウトしました。キーで復元するか、ゲストで始めてください。');
    if(identityFlight)return identityFlight;
    const version=identityVersion;identityFlight=(async()=>{
      const response=await fetch(identityAPI,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...credentials(),action:'sync',name:state.name,avatar:state.avatar,frame:state.frame,progress:progress()}),credentials:'omit',cache:'no-store'});
      if(version!==identityVersion)return snapshot();if(response.status===401){revokeSession();throw Error('ほかの端末へ引き継がれたためログアウトしました。');}if(!response.ok)throw Error('プロフィールに接続できません。接続後に再試行します。');
      const row=await response.json();if(row.progress){for(const k of ['xp','starts','clears'])state[k]=Math.max(state[k]||0,row.progress[k]||0);for(const [k,v]of Object.entries(row.progress.games||{}))state.games[k]=Math.max(state.games[k]||0,v);state.claimed={...row.progress.claimed,...state.claimed};}state.name=publicName(row.name);state.role=row.role==='admin'?'admin':'player';state.avatar=AVATARS.includes(row.avatar)?row.avatar:'🐣';state.frame=FRAMES.some(f=>f.id===row.frame)?row.frame:'classic';state.public=true;state.loggedOut=false;save();return snapshot();
    })().finally(()=>identityFlight=null);return identityFlight;
  }
  async function updateName(name){
    if(!isPublicNameAllowed(name))throw Error('16文字以内で、URL・連絡先・不適切な言葉を含まない名前にしてね。');
    await syncIdentity();
    const response=await fetch(identityAPI,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...credentials(),action:'rename',name:normalizeName(name)}),credentials:'omit',cache:'no-store'});
    if(response.status===401){revokeSession();throw Error('ほかの端末へ引き継がれたためログアウトしました。');}if(response.status===409)throw Error('その名前は使われています。別の名前にしてね。');if(!response.ok)throw Error('名前を保存できませんでした。接続を確認してね。');
    const row=await response.json();state.name=publicName(row.name);state.role=row.role==='admin'?'admin':'player';save();return true;
  }
  const canAvatar=emoji=>AVATARS.includes(emoji)&&(ADMIN_AVATARS.has(emoji)?state.role==='admin':level()>=LEVELS[AVATARS.indexOf(emoji)]);
  const canFrame=id=>{const f=FRAMES.find(f=>f.id===id);return !!f&&(f.admin?state.role==='admin':level()>=(f.level||1));};
  async function flush(){
    if(flushing||!pending.length||navigator.onLine===false||state.loggedOut)return;flushing=true;
    try{
      await syncIdentity();
      while(pending.length){
        const event={...pending[0],...credentials(),name:state.name,avatar:state.avatar+'|'+state.frame};
        const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(event),credentials:'omit',cache:'no-store',keepalive:true});
        if(response.status===401){revokeSession();break;}if(!response.ok){if(response.status===400){pending.shift();save();continue;}break;}
        pending.shift();save();
      }
    }catch{/* Retry on the next connection or play. */}finally{flushing=false;}
  }
  function record(game, action = 'start', localOnly = false) {
    if(state.loggedOut)return;
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
    if (!localOnly) {
      // Store avatar and frame in one validated string for the existing D1 schema.
      pending.push({ id: crypto.randomUUID(), playerId: state.id, name: publicName(state.name), avatar: state.avatar + '|' + state.frame, game, action });
      pending = pending.slice(-120);
    }
    save();
    void flush();
  }
  function update(values){if(state.loggedOut)return false;
    if('name'in values){void updateName(values.name).catch(()=>{});return false;}
    const apply=()=>{if('avatar'in values&&canAvatar(values.avatar))state.avatar=values.avatar;if('frame'in values&&canFrame(values.frame))state.frame=values.frame;state.public=true;save();};
    apply();void(async()=>{try{if(identityFlight)await identityFlight;apply();await syncIdentity();}catch{}})();return true;
  }
  async function createBackup(){await syncIdentity();const response=await fetch(identityAPI,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...credentials(),action:'backup',progress:progress()})});if(response.status===401){revokeSession();throw Error('ログアウトしています。');}if(!response.ok)throw Error('キーを発行できませんでした。');return response.json();}
  async function restoreBackup(key){const token=freshToken(),response=await fetch(identityAPI,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'restore',key:String(key).trim().toUpperCase(),sessionToken:token})});if(!response.ok)throw Error('キーが正しくないか、使用済みです。');const row=await response.json();identityVersion++;identityFlight=null;state={...blank(),...row.progress,id:row.id,name:row.name,avatar:row.avatar,frame:row.frame,role:row.role,public:true,loggedOut:false};sessionToken=token;pending=[];try{localStorage.setItem(SESSION,token);}catch{}save();dispatchEvent(new CustomEvent('asobi:session-restored'));return snapshot();}
  function startGuest(){identityVersion++;identityFlight=null;state=blank();sessionToken=freshToken();pending=[];try{localStorage.setItem(SESSION,sessionToken);}catch{}save();dispatchEvent(new CustomEvent('asobi:session-restored'));void syncIdentity().catch(()=>{});return snapshot();}
  async function community(period = 'week') {
    const url = API + '?period=' + encodeURIComponent(period);
    const response = await fetch(url, { credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw Error('community API failed');
    return response.json();
  }
  window.asobiPlayer = { GAMES, AVATARS, LEVELS, FRAMES, get: snapshot, level, missions, claim, achievements, record, update, community, flush, day, isPublicNameAllowed, publicName, updateName, ready:syncIdentity, canAvatar, canFrame, ADMIN_AVATARS, credentials, createBackup, restoreBackup, startGuest };
  addEventListener('online',flush);addEventListener('focus',()=>{if(!state.loggedOut)void syncIdentity().catch(()=>{});});document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!state.loggedOut)void syncIdentity().catch(()=>{});});addEventListener('storage',event=>{if(![KEY,SESSION].includes(event.key))return;try{const saved=JSON.parse(localStorage.getItem(KEY)||'null'),token=localStorage.getItem(SESSION);if(saved?.id!==state.id||token!==sessionToken){location.reload();return;}if(saved){state={...saved,role:state.role};dispatchEvent(new CustomEvent('asobi:player-updated'));}}catch{}});
  setInterval(()=>{if(!document.hidden&&!state.loggedOut)void syncIdentity().catch(()=>{});},30000);
  save();void syncIdentity().then(()=>flush()).catch(()=>{});
  if(pending.length)void flush();
})();




