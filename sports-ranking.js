// Shared online records use the server-reserved profile name automatically.
const KEY='asobiroom-sports-pending-v1';let pending=[],sending=null;
try{pending=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(pending))pending=[];}catch{}
const api=path=>window.asobiApi?window.asobiApi(path):'https://asobiroom-stats.aza106302.workers.dev'+path;
export function publishEnabled(){return true;}
export function setPublish(){window.dispatchEvent(new CustomEvent('sports-rank-status'));}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(pending));}catch{}}
function notify(detail={}){window.dispatchEvent(new CustomEvent('sports-rank-status',{detail}));}
export function isSportsPending(id){return pending.some(x=>x.id===id);}
export function pendingCount(){return pending.length;}
export async function flushSports(){if(sending)return sending;if(navigator.onLine===false)return;sending=(async()=>{await window.asobiPlayer?.ready?.();for(const entry of [...pending]){const profile=window.asobiPlayer?.get?.();let r;try{r=await fetch(api('/api/sports-ranks'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...entry,...(profile?.id===entry.playerId?{name:profile.name}:{}),publish:true})});}catch{break;}if(r.ok){pending=pending.filter(x=>x.id!==entry.id);persist();notify();}else if(r.status>=400&&r.status<500&&r.status!==429){pending=pending.filter(x=>x.id!==entry.id);persist();notify({id:entry.id,error:true});throw Error('記録を登録できませんでした。プレイ条件をご確認ください。');}else break;}})().finally(()=>{sending=null;});return sending;}
export async function submitSports(record){const profile=window.asobiPlayer?.get?.();if(profile?.loggedOut)throw Error('ほかの端末へ引き継がれたためログアウトしています。');if(!profile?.id)throw Error('プロフィールを準備できませんでした。再読み込みしてください。');if(pending.length>=50)throw Error('未送信の記録が多いため、接続後に再試行してください。');if(!pending.some(x=>x.id===record.id)){pending.push({...record,name:profile.name,playerId:profile.id,...window.asobiPlayer?.credentials?.(),publish:true});persist();}try{await flushSports();}catch(error){if(!pending.some(x=>x.id===record.id))throw error;}return {queued:pending.some(x=>x.id===record.id)};}
export async function getSportsRankings(board){const r=await fetch(api('/api/sports-ranks?board='+encodeURIComponent(board)),{cache:'no-store'});if(!r.ok)throw Error('ランキングを取得できませんでした。');const rows=await r.json();if(!Array.isArray(rows))throw Error('ランキングの応答が不正です。');return rows;}
export function addPublishControl(input){if(!input)return;input.checked=true;input.disabled=true;const label=input.closest('label');if(label){label.classList.add('automatic-ranking-note');label.textContent='● 対象モードの成績はプロフィール名で自動記録・公開されます';}}
window.addEventListener('online',()=>flushSports().catch(()=>{}));if(pending.length)flushSports().catch(()=>{});

window.addEventListener('asobi:session-revoked',()=>{pending=[];persist();notify({loggedOut:true});});window.addEventListener('asobi:session-restored',()=>{pending=[];persist();notify();});
