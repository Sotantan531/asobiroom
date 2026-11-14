const el=id=>document.getElementById(id);
const ROUND_MS=80000;
const tiers=['簡単','ふつう','難しい'];
const priors=[.38,.74,.86,.43,.92,.45,.62,.34,.7,.56,.82,.9,.39,.65,.46,.78,...extraQuestions.map(q=>q[2]),...addedRatings];
let stats=[],seen=new Set(),level=0,index,round,phase='menu',count,remaining,deadline,interval,audio;
const bgm=new window.AsobiBgm('dobon',()=>audio);
let bgmMuted=false;
try{bgmMuted=localStorage.getItem('asobiroom.dobon.bgm-muted')==='true'}catch{}
bgm.setEnabled(!bgmMuted);
const bgmToggle=document.createElement('button');
bgmToggle.id='bgmToggle';bgmToggle.type='button';bgmToggle.title='BGMを切り替える';
bgmToggle.setAttribute('aria-label','BGMのオン・オフ');
function renderBgmToggle(){bgmToggle.textContent=bgmMuted?'♫ OFF':'♫ ON';bgmToggle.setAttribute('aria-pressed',String(!bgmMuted))}
bgmToggle.onclick=()=>{
 bgmMuted=!bgmMuted;try{localStorage.setItem('asobiroom.dobon.bgm-muted',String(bgmMuted))}catch{}
 bgm.setEnabled(!bgmMuted);renderBgmToggle();
 if(!bgmMuted&&['play','judging','final'].includes(phase)){try{audio?.resume()}catch{}bgm.start();bgm.setUrgent(remaining<=30000)}
};
renderBgmToggle();el('score').before(bgmToggle);
function groups(){
 const pools=[[],[],[]];
 bank.forEach((q,i)=>{
  const row=stats.find(s=>s.question===i&&s.total>0);
  const rate=row?row.wins/row.total:priors[i];
  pools[rate>=.70?0:rate>=.45?1:2].push(i);
 });
 return pools;
}
function updateLevels(){
 const pools=groups();
 [...el('levels').children].forEach((button,i)=>{
  button.disabled=!pools[i].length;
  button.textContent=tiers[i]+'（'+pools[i].length+'問）';
 });
}
function summary(i){const s=stats.find(x=>x.question===i);return s?Math.round(100*s.wins/s.total)+'%（'+s.wins+' / '+s.total+'回）':'未プレイ（推定難易度）'}
let loaded=false;
try{
 const cached=JSON.parse(localStorage.getItem('dobon.rates.v1'));
 if(Array.isArray(cached)){stats=cached;loaded=true}
}catch{}

function displayRate(){
 if(phase==='menu')return;
 el('genre').textContent=tiers[level]+' ｜ '+bank[index][0]+' ｜ クリア率 '+(loaded?summary(index):'未接続（推定難易度）');
}
const prefix='dobon.pending.';
let inFlight=Promise.resolve();
function sync(){inFlight=inFlight.then(refresh);return inFlight}
async function refresh(){
 try{
 const keys=Object.keys(localStorage).filter(k=>k.startsWith(prefix));
 for(const key of keys){const body=localStorage.getItem(key);if(!body)continue;const res=await fetch(asobiApi('/api/stats'),{method:'POST',headers:{'Content-Type':'application/json'},body});if(!res.ok)throw Error();localStorage.removeItem(key)}
 const res=await fetch(asobiApi('/api/stats'));if(!res.ok)throw Error();stats=await res.json();loaded=true;try{localStorage.setItem('dobon.rates.v1',JSON.stringify(stats))}catch{}updateLevels();displayRate();el('status').textContent='';
 }catch{el('status').textContent='記録を同期できません。再接続時に再試行します。';if(!loaded){el('status').append(' ');const retry=document.createElement('button');retry.textContent='再読み込み';retry.onclick=sync;el('status').append(retry)}}
}
addEventListener('online',sync);sync();
function tone(ok){
 if(!audio)return;
 const tones=ok?[[784,0,.12],[1047,.12,.26]]:[[138,0,.23],[98,.2,.4]];
 for(const [freq,delay,duration] of tones){const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+delay;o.type=ok?'sine':'sawtooth';o.frequency.value=freq;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.12,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+duration)}
}
function progress(){el('score').textContent='正解 '+count+' / 10';el('track').innerHTML=Array.from({length:10},(_,i)=>i<count?'<i class="on"></i>':'<i></i>').join('')}
function clock(){el('time').textContent=Math.ceil(remaining/1000);el('shade').style.width=(100*(1-remaining/ROUND_MS))+'%'}
function tick(){if(!['play','judging','final'].includes(phase))return;remaining=Math.max(0,deadline-performance.now());clock();bgm.setUrgent(remaining<=30000);if(!remaining&&phase!=='final')end('時間切れ！',false,'timeout')}
function end(message,won,kind){
 if(phase==='end')return;
 bgm.stop();
 if(won)window.asobiPlayer?.record('dobon-quiz','clear');
 phase='end';el('choices').querySelector('.pending')?.classList.remove('pending');clearInterval(interval);el('choices').querySelectorAll('button').forEach(b=>b.disabled=true);
 const h=document.createElement('h2'),p=document.createElement('p');h.textContent=message;p.textContent='ドボンは「'+bank[index][3]+'」。'+bank[index][4];el('result').replaceChildren(h,p);el('start').hidden=el('home').hidden=false;
 showFinale(kind,audio);
 try{localStorage.setItem(prefix+round,JSON.stringify({id:round,question:index,cleared:Number(won)}));sync()}catch{el('status').textContent='このブラウザで記録を保存できませんでした。'}
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function select(b,j){
 if(phase!=='play'||b.disabled)return;tick();if(phase!=='play')return;
 const token=round;phase=count===9?'final':'judging';b.classList.add('pending');await wait(960);
 if(token!==round)return;tick();if(phase==='end'||phase==='menu')return;
 const q=bank[index],ok=b.dataset.word!==q[3];b.firstChild.textContent=notes[index][j];tone(ok);b.disabled=true;
 if(!ok){phase='final';const mark=document.createElement('strong');mark.className='cross';mark.textContent='×';b.append(mark)}
 else{count++;progress()}
 await wait(1400);if(token!==round)return;tick();if(phase==='end'||phase==='menu')return;b.classList.remove('pending');b.classList.add('dim');
 if(!ok||count===10)return end(ok?'10個正解！ クリア！':'ドボン！ ゲームオーバー',ok,ok?'clear':'bomb');
 phase='play';
}
function start(){
 clearFinale();
 try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{})}catch{}
 const pool=groups()[level];
 if(!pool.length){el('home').onclick();return}
 window.asobiActivity?.play('dobon-quiz');
 const alternatives=pool.filter(i=>i!==index);
 const candidates=alternatives.length?alternatives:pool;
 let available=candidates.filter(i=>!seen.has(i));
 if(!available.length){pool.forEach(i=>seen.delete(i));available=candidates}
 clearInterval(interval);
 index=available[Math.floor(Math.random()*available.length)];seen.add(index);round=crypto.randomUUID();
 const q=bank[index];['menu','intro','hint'].forEach(id=>el(id).hidden=true);el('start').hidden=el('home').hidden=false;
 el('result').replaceChildren();el('genre').textContent=tiers[level]+' ｜ '+q[0];el('prompt').textContent=q[1]+'を選べ。(不正解は1つ)';
 const words=q[2].split(' '),buttons=words.map((word,j)=>{const b=document.createElement('button'),note=document.createElement('span');note.className='note';b.className='tile';b.dataset.word=word;b.append(note,word);b.onclick=()=>select(b,j);return b});
 for(let i=buttons.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[buttons[i],buttons[j]]=[buttons[j],buttons[i]]}
 const logo=document.createElement('div');logo.className='brandcell';logo.innerHTML='<span class="room-brand"><img src="asobiroom.svg" alt="" width="27" height="27"><span>asobiroom</span></span>ドボン！';el('choices').replaceChildren(...buttons,logo);
 count=0;remaining=ROUND_MS;deadline=performance.now()+remaining;phase='play';bgm.setUrgent(false);bgm.start();displayRate();progress();clock();interval=setInterval(tick,80);
}
tiers.forEach((name,i)=>{const b=document.createElement('button');b.textContent=name;b.onclick=()=>{level=i;start()};el('levels').append(b)});
updateLevels();
el('start').onclick=async()=>{if(phase==='end'){const previous=round;await inFlight;if(phase!=='end'||previous!==round)return}start()};el('home').onclick=()=>{clearFinale();bgm.stop();round=null;clearInterval(interval);for(const id of ['result','choices','track','genre','prompt'])el(id).replaceChildren();for(const id of ['menu','intro','hint'])el(id).hidden=false;el('start').hidden=el('home').hidden=true;phase='menu';remaining=ROUND_MS;clock();el('score').textContent='正解 0 / 10';sync()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)bgm.stop();else if(['play','judging','final'].includes(phase))bgm.start()});
window.addEventListener('pagehide',()=>bgm.stop());
