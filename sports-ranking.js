// Shared, opt-in online records. A queued record keeps its original profile and ID.
const KEY='asobiroom-sports-pending-v1',PREF='asobiroom-sports-publish-v1';let pending=[],sending=null;
try{pending=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(pending))pending=[];}catch{}
const api=path=>window.asobiApi?window.asobiApi(path):'https://asobiroom-stats.aza106302.workers.dev'+path;
export function publishEnabled(){try{const p=localStorage.getItem(PREF);return p===null?window.asobiPlayer?.get?.().public===true:p==='true';}catch{return false;}}
export function setPublish(value){try{localStorage.setItem(PREF,String(value));}catch{}if(!value){pending=[];persist();}window.dispatchEvent(new CustomEvent('sports-rank-status'));}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(pending));}catch{}}
function notify(detail={}){window.dispatchEvent(new CustomEvent('sports-rank-status',{detail}));}
export function isSportsPending(id){return pending.some(x=>x.id===id);}
export function pendingCount(){return pending.length;}
export async function flushSports(){if(sending)return sending;if(!navigator.onLine)return; sending=(async()=>{for(const entry of [...pending]){let r;try{r=await fetch(api('/api/sports-ranks'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(entry)});}catch{break;}if(r.ok){pending=pending.filter(x=>x.id!==entry.id);persist();notify();}else if(r.status>=400&&r.status<500&&r.status!==429){pending=pending.filter(x=>x.id!==entry.id);persist();notify({id:entry.id,error:true});throw Error('記録を登録できませんでした。名前やプレイ条件をご確認ください。');}else break;}})().finally(()=>{sending=null;});return sending;}
export async function submitSports(record,name){if(!publishEnabled())return {skipped:true};const profile=window.asobiPlayer?.get?.(),playerId=profile?.id;if(!playerId)throw Error('プロフィールを設定してください。');const nickname=String(name||profile.name||'').trim();if(!nickname||nickname==='ゲスト'||window.asobiPlayer?.isPublicNameAllowed&&!window.asobiPlayer.isPublicNameAllowed(nickname))throw Error('公開できるプロフィール名を設定してください。');if(pending.length>=50)throw Error('未送信の記録が多いため、接続後に再試行してください。');if(!pending.some(x=>x.id===record.id)){pending.push({...record,name:nickname,playerId,publish:true});persist();}await flushSports();return {queued:pending.some(x=>x.id===record.id)};}
export async function getSportsRankings(board){const r=await fetch(api('/api/sports-ranks?board='+encodeURIComponent(board)),{cache:'no-store'});if(!r.ok)throw Error('ランキングを取得できませんでした。');const rows=await r.json();if(!Array.isArray(rows))throw Error('ランキングの応答が不正です。');return rows;}
export function addPublishControl(input){input.checked=publishEnabled();input.onchange=()=>setPublish(input.checked);}
window.addEventListener('online',()=>flushSports().catch(()=>{}));if(pending.length&&publishEnabled())flushSports().catch(()=>{});
