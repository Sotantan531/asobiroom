/* Local party rules share the existing flight, scoring screen, sound and turn flow. */
const BOARD_THEMES={
 classic:{name:'クラシック / 赤 × ミント',red:'#ff6855',green:'#53dfb8',light:'#a9bdc0',dark:'#30414b'},
 tournament:{name:'トーナメント / 赤 × 緑',red:'#cf3547',green:'#23886a',light:'#e6deca',dark:'#252b32'},
 ocean:{name:'オーシャン / 青 × 水色',red:'#297cf0',green:'#52d9e8',light:'#d5e4ee',dark:'#203c60'},
 sunset:{name:'サンセット / 橙 × 紫',red:'#ff9d45',green:'#ac7af2',light:'#f0d8cb',dark:'#463549'},
 candy:{name:'キャンディ / 桃 × 藤',red:'#ee84b6',green:'#a99aef',light:'#f8e5f0',dark:'#544768'},
 mono:{name:'モノクロ / 白 × 灰',red:'#eef1f4',green:'#8e9eae',light:'#c5cdd5',dark:'#28323f'}
};
let boardTheme='classic';try{const v=localStorage.getItem('fl-board-theme-v1');if(BOARD_THEMES[v])boardTheme=v;}catch{}
function boardThemeField(){return '<label for="boardColor">ボードの色<select id="boardColor">'+Object.entries(BOARD_THEMES).map(([k,v])=>'<option value="'+k+'" '+(k===boardTheme?'selected':'')+'>'+v.name+'</option>').join('')+'</select></label><div id="boardColorSample" aria-hidden="true"></div>';}
function wireBoardTheme(){const field=$('boardColor');function swatch(){const t=BOARD_THEMES[boardTheme];$('boardColorSample').style.background='linear-gradient(90deg,'+[t.dark,t.light,t.red,t.green].map((c,i)=>c+' '+i*25+'%,'+c+' '+(i+1)*25+'%').join(',')+')';}swatch();field.onchange=()=>{if(!BOARD_THEMES[field.value])return;boardTheme=field.value;try{localStorage.setItem('fl-board-theme-v1',boardTheme);}catch{}const pins=$('pins')?.innerHTML||'',moving=$('moving')?.innerHTML||'';drawBoard();$('pins').innerHTML=pins;$('moving').innerHTML=moving;render();swatch();};}
const PARTY_KEYS=['balloon','treasure','territory','exact'];
const isPartyEntry=m=>PARTY_KEYS.includes(m);
function partyMode(){return isPartyEntry(mode);}
let party=null;
function shuffled(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function partyBegin(){
 party={pressure:0,limit:80+Math.floor(Math.random()*31),popped:false,message:'',owners:{},round:0,maps:[],goals:[],turnTotals:[0,0]};
 for(let i=0;i<8;i++){const order=shuffled(nums),map={};order.forEach((n,j)=>map[n]=j<3?'trap':j<5?'steal':j<11?'gold':'coin');party.maps.push(map);party.goals.push(45+Math.floor(Math.random()*96));}
 if(partyMode())scores=[0,0];
}
function partyNodes(){
 if(!$('partyHUD')){const hud=document.createElement('div');hud.id='partyHUD';hud.setAttribute('aria-live','polite');$('stage').before(hud);const bg=document.createElement('div');bg.id='partyBackdrop';bg.setAttribute('aria-hidden','true');$('stage').prepend(bg);}
}
function partyRender(){
 partyNodes();const on=partyMode();$('partyHUD').hidden=!on;$('partyBackdrop').hidden=!on;$('stage').closest('.arena').classList.toggle('partyArena',on);
 document.querySelectorAll('#board [data-party-owner]').forEach(el=>delete el.dataset.partyOwner);
 if(!on)return;
 const name=names[mode],r=Math.min(7,round-1),status=party.message;
 let info='',art='';
 if(mode==='balloon'){
  const size=Math.min(1,party.pressure/100),risk=size<.4?'まだ余裕？':size<.7?'ふくらんできた！':'一触即発！';
  info='<b>風船 '+party.pressure+'</b><span>'+risk+' · 1人1投で交代 / MISS +14</span><div class="balloonMeter"><i style="width:'+Math.min(100,party.pressure)+'%"></i></div>';
  art='<svg viewBox="0 0 600 440"><path d="M485 285q-55 40-5 85t-30 65" fill="none" stroke="#ffb5cd" stroke-width="3"/><g class="balloonArt" style="transform:translate('+(485-(65+size*70))+'px,'+(245-(85+size*90))+'px) scale('+(1+size)+')"><ellipse cx="65" cy="85" rx="65" ry="85" fill="'+(party.popped?'#ffcf6b':'#ee719b')+'"/><ellipse cx="43" cy="48" rx="13" ry="23" fill="#fff" opacity=".6"/><path d="M65 170l-9 11h18Z" fill="#e65488"/></g></svg>';
  $('ammo').textContent=(darts.length?'●':'○')+'　1 DART';
 }else if(mode==='treasure'){
  party.turnTotals=[0,0];info='<b>宝の地図 · ROUND '+round+'</b><span>金貨 +80 / コイン +20 / 鍵 最大30点奪取 / 罠 −40</span>';
  art='<svg viewBox="0 0 600 440"><path d="M25 370Q220 40 565 285" stroke="#ffd47c" stroke-width="4" stroke-dasharray="12 14" fill="none"/><circle cx="545" cy="280" r="48" fill="#ffcb64"/><path d="M525 280h40m-20-20v40" stroke="#87552a" stroke-width="6"/></svg>';
 }else if(mode==='territory'){
  const counts=[0,0];Object.values(party.owners).forEach(v=>counts[v.owner]++);
  info='<b>陣地 P1 '+counts[0]+' / '+(solo()?'—':'P2 '+counts[1])+'</b><span>数字を所有して得点 · D=2 / T=3の攻撃力 · 盾は最大3</span>';
  for(const [n,v] of Object.entries(party.owners))document.querySelectorAll('#board [data-n="'+n+'"]').forEach(el=>el.dataset.partyOwner=String(v.owner));
  art='<svg viewBox="0 0 600 440"><path d="M70 360V90l100 35-100 35m460 200V90l-100 35 100 35" stroke="#88b9ff" fill="#ed936a" stroke-width="5"/></svg>';
 }else{
  if(party.round!==round){party.round=round;party.turnTotals=[0,0];}
  const total=party.turnTotals[player];info='<b>お題 '+party.goals[r]+' / 合計 '+total+'</b><span>残り '+Math.max(0,3-darts.length)+'投 · あと '+(party.goals[r]-total)+'点 · ぴったり150pt</span>';
  art='<div class="exactGhost">'+party.goals[r]+'</div>';
 }
 $('partyHUD').innerHTML='<div class="partyHeading">'+name+'</div><div class="partyInfo">'+info+'</div><div class="partyMessage">'+(status||'狙いを決めて、スワイプ！')+'</div>';
 $('partyBackdrop').innerHTML=art;
 // Treasure markers and territory shields sit on the outer single ring, away from the numbers.
 $('partyMarks')?.remove();let icons='';
 if(mode==='treasure'||mode==='territory')for(const n of nums){const [x,y]=targetCenter(n,1).map(v=>v*.95);let text='',color='#ffe19c';if(mode==='treasure'){const type=party.maps[r][n];text={trap:'×',steal:'鍵',gold:'80',coin:'20'}[type];color=type==='trap'?'#ff9c9c':type==='steal'?'#b5e7ff':'#ffe19c';}else{const v=party.owners[n];if(v){text='盾'+v.shield;color=v.owner?'#a7dbff':'#ffce9f';}}if(text)icons+='<g transform="translate('+x+','+y+')"><circle r="12" fill="#102535" opacity=".85"/><text y="3" text-anchor="middle" font-size="10" font-weight="800" fill="'+color+'">'+text+'</text></g>';}
 if(icons)$('pins').insertAdjacentHTML('beforebegin','<g id="partyMarks" pointer-events="none">'+icons+'</g>');
}
function partyThrow(h,x,y){
 let label=h.label,loser=false,award=false;
 if(mode==='balloon'){
  const pump=h.n?2+Math.ceil(h.v/7):14;party.pressure+=pump;loser=party.pressure>=party.limit;party.popped=loser;
  if(!loser)scores[player]++;party.message=loser?'パーン！ '+labelFor(player)+'が割ってしまった！':'+'+pump+'！ 次の人に風船を渡そう。';label+=' / ふくらみ +'+pump;
 }else if(mode==='treasure'){
  const type=h.n===25?'bull':party.maps[Math.min(7,round-1)][h.n];let gain=0;
  if(type==='trap')gain=-Math.min(40,scores[player]);else if(type==='steal'){gain=solo()?30:Math.min(30,scores[1-player]);if(!solo())scores[1-player]-=gain;}else gain=type==='gold'?80:type==='coin'?20:type==='bull'?30:0;
  scores[player]+=gain;party.message=({trap:'罠！',steal:solo()?'鍵ボーナス！':'お宝を奪取！',gold:'大当たり！',coin:'コイン発見！',bull:'ブルのお宝！'}[type]||'宝は見つからなかった。')+' '+(gain>=0?'+':'')+gain+'pt';label+=' / '+party.message;award=type==='gold';
 }else if(mode==='territory'){
  if(h.n){const own=party.owners[h.n],attack=h.n===25?h.m:h.m;if(!own)party.owners[h.n]={owner:player,shield:Math.min(3,attack)};else if(own.owner===player)own.shield=Math.min(3,own.shield+attack);else{own.shield-=attack;if(own.shield<=0)party.owners[h.n]={owner:player,shield:1};}scores=[0,0];for(const [n,v] of Object.entries(party.owners))scores[v.owner]+=Number(n);party.message=(h.n===25?'BULL':h.n)+'の陣地を攻撃！';}else party.message='MISS · 陣地はそのまま';label+=' / '+party.message;
 }else{
  if(party.round!==round){party.round=round;party.turnTotals=[0,0];}party.turnTotals[player]+=h.v;const diff=Math.abs(party.goals[Math.min(7,round-1)]-party.turnTotals[player]);party.message='合計 '+party.turnTotals[player]+' / お題 '+party.goals[Math.min(7,round-1)];
  if(darts.length===3){const gain=diff===0?150:Math.max(0,100-diff*4);scores[player]+=gain;party.message=(diff===0?'ぴったり！':'ずれ '+diff+'点')+' +'+gain+'pt';award=diff===0;}label+=' / '+party.message;
 }
 lightHit(h);impactSound(h);if(loser){note(110,30,0,.22,'sawtooth',.18);note(360,70,.015,.12,'triangle',.1);}if(award){celebrate('NICE ONE');awardSound('NICE ONE');}
 log.push(['R'+round+' · '+labelFor(player)+' · '+darts.length,label]);$('flash').textContent=party.message;render();
 const done=mode==='balloon'||darts.length===3;
 if(loser){busy=true;timer=setTimeout(()=>end(solo()?0:1-player),1100);}
 else if(done){busy=true;timer=setTimeout(advance,award?1800:1100);}else if(aiTurn())timer=setTimeout(cpu,720);
}
function partyAim(){
 if(mode==='balloon')return [party.pressure>55?1:party.pressure>25?5:20,1];
 if(mode==='treasure'){const map=party.maps[Math.min(7,round-1)];return [nums.find(n=>map[n]==='gold'),1];}
 if(mode==='territory'){const n=[25,20,19,18,17,16,...nums].find(n=>party.owners[n]?.owner!==player)||20;return [n,n===25?2:3];}
 const remaining=party.goals[Math.min(7,round-1)]-party.turnTotals[player],left=3-darts.length,candidates=[[0,0],[25,2]];for(let n=1;n<=20;n++)for(let m=1;m<=3;m++)candidates.push([n,m]);let best=[1,1],gap=Infinity;for(const t of candidates){if(!t[0])continue;const value=t[0]===25?50:t[0]*t[1],d=Math.abs(value-remaining/left);if(d<gap){gap=d;best=t;}}return best;
}
function partyTitle(w){if(mode==='balloon'&&party.popped)return solo()?'風船が割れた！':labelFor(w)+'、ギリギリ勝利！';return solo()?'チャレンジ終了':w<0?'引き分け！':labelFor(w)+'の勝利！';}
function partyResult(){if(mode==='balloon')return '割らずに成功した投数：'+scores[0]+(solo()?'回':'回 / '+scores[1]+'回');return labelFor(0)+' '+scores[0]+'pt'+(solo()?'':' ／ '+labelFor(1)+' '+scores[1]+'pt');}
function partyRecords(){try{const raw=JSON.parse(localStorage.getItem('fl-party-records-v1')||'{}'),clean={};if(!raw||typeof raw!=='object')return clean;for(const k of PARTY_KEYS)clean[k]=Array.isArray(raw[k])?raw[k].filter(x=>x&&typeof x.name==='string'&&Number.isFinite(x.score)&&x.score>=0).slice(0,10):[];return clean;}catch{return {};}}
function partySaveRecord(){try{const all=partyRecords(),rows=Array.isArray(all[mode])?all[mode]:[],profile=window.asobiPlayer?.get?.();for(let p=0;p<(rules.opponent==='local'?2:1);p++)rows.push({name:p?'P2':profile?.name||'あなた',score:scores[p],date:new Date().toISOString()});all[mode]=rows.sort((a,b)=>b.score-a.score).slice(0,10);localStorage.setItem('fl-party-records-v1',JSON.stringify(all));}catch{}}
function partyRanking(){show('<h2>パーティの記録</h2><p id="partyRankTitle"></p><div id="partyRanks"></div><p>この端末のTOP10。パーティゲームはオンラインランキングの対象外です。</p><div class="buttons"><button onclick="closeModal()">ゲームに戻る</button></div>');$('partyRankTitle').textContent=names[mode];const rows=partyRecords()[mode]||[];if(!rows.length)$('partyRanks').textContent='まだ記録がありません。';for(const [i,row] of rows.entries()){const el=document.createElement('div');el.className='rankRow';for(const txt of [i+1,row.name,row.score+(mode==='balloon'?'回':'pt')]){const span=document.createElement('span');span.textContent=String(txt);el.append(span);}$('partyRanks').append(el);}}
