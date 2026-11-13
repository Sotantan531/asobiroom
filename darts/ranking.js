let rankedThrows=[0,0], sending=null, rankMessage='';
function readPref(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function savePref(key,val){try{localStorage.setItem(key,JSON.stringify(val))}catch{}}
let nicknames=readPref('fl-names',null)||[1,2].map(()=> 'ダーツ'+crypto.randomUUID().slice(0,5));
savePref('fl-names',nicknames);
let pending=readPref('fl-pending',[]);
function rankKey(){
  if(is01())return [mode,rules.out,rules.bull].join('-');
  return ['cu','multi','jack','ladder'].includes(mode)?mode+'-'+rules.bull:mode;
}
function updateRankStatus(){if($('rankStatus'))$('rankStatus').textContent=rankMessage}
async function syncRanks(){
  if(sending)return sending;
  sending=(async()=>{
    while(pending.length){
      const record=pending[0];let response;
      try{response=await fetch(asobiApi('/api/ranks'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(record)})}catch{break}
      if(!response.ok)break;
      pending.shift();savePref('fl-pending',pending);
    }
    if(rankMessage==='ランキングへ送信中…'||rankMessage.startsWith('記録は送信待ち'))rankMessage=pending.length?'記録は送信待ちです。接続後に再送します。':'オンラインランキングに登録しました。';
    updateRankStatus();
  })().finally(()=>sending=null);
  return sending;
}
function recordResults(w){
  if(rules.bonus.some((v,i)=>v&&(!i||!solo()))){rankMessage='ハンデ戦はランキングの対象外です。';return}
  const board=rankKey();let added=false;
  for(let p=0;p<2;p++){
    if(p&&rules.opponent!=='local')continue;
    if(is01()&&(p!==w||scores[p]!==0))continue;
    const score=is01()?-rankedThrows[p]:mode==='cut'?-scores[p]:scores[p];
    pending.push({id:crypto.randomUUID(),board,name:nicknames[p],score});added=true;
  }
  rankMessage=added?'ランキングへ送信中…':'01は上がったプレイヤーの投数を記録します。';
  if(added){savePref('fl-pending',pending);syncRanks()}
}
function showRanking(){
 const key=rankKey(),numeric=is01(),reverse=numeric||mode==='cut';
 show('<h2>オンラインランキング</h2><p id="boardLabel"></p><div id="rankList" aria-live="polite">読み込み中…</div><p>ハンデなしの人間プレイヤーが対象です。</p><div class="chooser"><label>P1 の登録名<input id="rankName0" maxlength="16"></label><label>P2 の登録名<input id="rankName1" maxlength="16"></label></div><div class="buttons"><button id="rankClose">ゲームに戻る</button></div>');
 $('boardLabel').textContent=names[mode]+' ／ '+(numeric?({open:'オープンアウト',master:'マスターアウト',double:'ダブルアウト'}[rules.out]+' ／ 上がりまでの投数'):mode==='cut'?'失点が少ない順':'得点が高い順')+(key.endsWith('-split')?' ／ セパレートブル':key.endsWith('-fat')?' ／ ブル50点':'');
 for(let i=0;i<2;i++){const input=$('rankName'+i);input.value=nicknames[i];input.onchange=()=>{nicknames[i]=input.value.trim().slice(0,16)||nicknames[i];input.value=nicknames[i];savePref('fl-names',nicknames)}}
 $('rankClose').onclick=closeModal;
 const list=$('rankList');
 async function load(){
  try{
    await syncRanks();const res=await fetch(asobiApi('/api/ranks?board='+encodeURIComponent(key)));if(!res.ok)throw Error();
    const rows=await res.json();list.replaceChildren();if(!rows.length)list.textContent='まだ記録がありません。';
    rows.forEach((r,i)=>{const row=document.createElement('div');row.className='rankRow';for(const val of [i+1,r.name,(reverse?-r.score:r.score)+(numeric?' 投':' 点')]){const col=document.createElement('span');col.textContent=val;row.append(col)}list.append(row)});
  }catch{list.textContent='順位を取得できませんでした。';const retry=document.createElement('button');retry.textContent='再読み込み';retry.onclick=load;list.append(retry)}
 }
 load();
}
document.getElementById('ranking').onclick=showRanking;
window.addEventListener('online',syncRanks);
if(pending.length)syncRanks();
