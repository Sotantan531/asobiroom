// The opaque browser player ID is never returned by public ranking/feed APIs.
// Administrator roles are provisioned in D1, never inferred from a submitted name.
export const SECRET_AVATARS=new Map([['🦅',12],['🦁',15],['🪐',20],['🦚',25],['🔮',30],['🌌',40],['🛡️',0],['🗝️',0]]);
export const SECRET_FRAMES=new Map([['aurora',12],['obsidian',15],['starlight',20],['phoenix',25],['diamond',30],['infinity',40],['admin-gold',0],['admin-eclipse',0]]);
export const ADMIN_AVATARS=new Set(['🛡️','🗝️']);
export const ADMIN_FRAMES=new Set(['admin-gold','admin-eclipse']);
export const identityKey=name=>String(name).normalize('NFKC').trim().toLowerCase().replace(/\s+/gu,'');
const uuid=/^[a-f\d-]{36}$/i;
export function guestName(){const alphabet='abcdefghijklmnopqrstuvwxyz0123456789',bytes=crypto.getRandomValues(new Uint8Array(4));let suffix=Array.from(bytes,b=>alphabet[b%36]).join('');if(!/[a-z]/.test(suffix))suffix='a'+suffix.slice(1);if(!/\d/.test(suffix))suffix=suffix.slice(0,3)+(bytes[3]%10);return 'ゲスト'+suffix;}
export async function canonicalId(env,id){if(!uuid.test(id||''))throw Object.assign(Error('input'),{status:400});const alias=await env.DB.prepare('SELECT player_id FROM player_aliases WHERE alias_id=?').bind(id).first();return alias?.player_id||id;}
export async function ensureIdentity(env,id,requested='ゲスト',nameOK=()=>true){
 const playerId=await canonicalId(env,id);let row=await env.DB.prepare('SELECT * FROM player_profiles WHERE player_id=?').bind(playerId).first();if(row)return row;
 let candidate=nameOK(requested)&&requested!=='ゲスト'&&identityKey(requested)!=='sotantan'?requested.normalize('NFKC').trim():guestName();
 for(let i=0;i<32;i++){
  await env.DB.prepare("INSERT OR IGNORE INTO player_profiles(player_id,name,name_key,avatar,frame,role,created,updated) VALUES(?,?,?,'🐣','classic','player',?,?)").bind(playerId,candidate,identityKey(candidate),Date.now(),Date.now()).run();
  row=await env.DB.prepare('SELECT * FROM player_profiles WHERE player_id=?').bind(playerId).first();if(row)return row;candidate=guestName();
 }
 throw Object.assign(Error('name_busy'),{status:503});
}
export function decorateAvatar(value,role){let [avatar,frame='classic']=String(value||'🐣|classic').split('|');if(role!=='admin'){if(ADMIN_AVATARS.has(avatar))avatar='🐣';if(ADMIN_FRAMES.has(frame))frame='classic';}return avatar+'|'+frame;}
export async function identityEndpoint(request,env,h){
 if(request.method!=='POST')return h.json({error:'method'},405);const d=await h.payload(request);if(d?.action==='restore')return recoverIdentity(env,d,h);if(!d||!h.idOK(d.playerId)||!['sync','rename','backup'].includes(d.action||'sync'))return h.json({error:'input'},400);
 const row=await authenticateIdentity(env,d.playerId,d.sessionToken,d.name,h.nameOK);let progress=progressPayload(d.progress);if(progress){const old=await env.DB.prepare('SELECT profile_json FROM player_sessions WHERE player_id=?').bind(row.player_id).first();progress=mergeProgress(JSON.parse(old?.profile_json||'{}'),progress);}if(progress)await env.DB.prepare('UPDATE player_sessions SET profile_json=?,updated=? WHERE player_id=? AND session_hash=?').bind(JSON.stringify(progress),Date.now(),row.player_id,row.sessionHash).run();if(d.action==='backup')return createBackup(env,row,h);let name=row.name;
 if(d.action==='rename'){
  if(!h.nameOK(d.name))return h.json({error:'name_invalid'},400);name=h.normalizeName(d.name);
  if(row.role==='admin')name='sotantan';
  if(identityKey(name)==='sotantan'&&row.role!=='admin')return h.json({error:'name_taken'},409);
  // UNIQUE name_key is the authority: two concurrent requests cannot reserve the same name.
  await env.DB.prepare('UPDATE OR IGNORE player_profiles SET name=?,name_key=?,updated=? WHERE player_id=? AND EXISTS(SELECT 1 FROM player_sessions s WHERE s.player_id=player_profiles.player_id AND s.session_hash=?)').bind(name,identityKey(name),Date.now(),row.player_id,row.sessionHash).run();
  const after=await env.DB.prepare('SELECT name,name_key FROM player_profiles WHERE player_id=?').bind(row.player_id).first();if(after.name_key!==identityKey(name))return h.json({error:'name_taken'},409);name=after.name;
 }
 const packed=decorateAvatar((d.avatar||row.avatar)+'|'+(d.frame||row.frame),row.role);if(h.avatarOK(packed)){const [avatar,frame]=packed.split('|');await env.DB.prepare('UPDATE player_profiles SET avatar=?,frame=?,updated=? WHERE player_id=? AND EXISTS(SELECT 1 FROM player_sessions s WHERE s.player_id=player_profiles.player_id AND s.session_hash=?)').bind(avatar,frame,Date.now(),row.player_id,row.sessionHash).run();}
 const final=await env.DB.prepare('SELECT name,avatar,frame,role FROM player_profiles WHERE player_id=?').bind(row.player_id).first();return h.json({...final,...(progress?{progress}:{})});
}

const validToken=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const sameHash=(a,b)=>{let mismatch=0;for(let i=0;i<64;i++)mismatch|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return mismatch===0;};
export async function authenticateIdentity(env,id,token,requested,nameOK,legacy=false){
 const row=await ensureIdentity(env,id,requested,nameOK);let session=await env.DB.prepare('SELECT session_hash FROM player_sessions WHERE player_id=?').bind(row.player_id).first();
 if(!session&&validToken(token)){const digest=await hash(token);await env.DB.prepare("INSERT OR IGNORE INTO player_sessions(player_id,session_hash,profile_json,updated) VALUES(?,?,'{}',?)").bind(row.player_id,digest,Date.now()).run();session=await env.DB.prepare('SELECT session_hash FROM player_sessions WHERE player_id=?').bind(row.player_id).first();}
 if(!session&&legacy)return row;
 if(!session||!validToken(token)||!sameHash(await hash(token),session.session_hash))throw Object.assign(Error('session_revoked'),{status:401});return {...row,sessionHash:session.session_hash};
}
function progressPayload(value){if(!value||typeof value!=='object'||Array.isArray(value))return null;const result={};for(const key of ['xp','starts','clears'])result[key]=Number.isSafeInteger(value[key])&&value[key]>=0&&value[key]<=1e9?value[key]:0;result.games=Object.fromEntries(Object.entries(value.games||{}).filter(([k,v])=>/^[a-z0-9-]{1,32}$/.test(k)&&Number.isSafeInteger(v)&&v>=0).slice(0,32));result.claimed=Object.fromEntries(Object.entries(value.claimed||{}).filter(([k,v])=>/^\d{4}-\d{2}-\d{2}:[a-z]+$/.test(k)&&v===true).slice(-1200));result.recent=Array.isArray(value.recent)?value.recent.filter(e=>e&&/^[a-z0-9-]{1,32}$/.test(e.game)&&['start','clear'].includes(e.action)&&Number.isFinite(e.time)).slice(-800).map(e=>({game:e.game,action:e.action,time:e.time})):[];return result;}
function mergeProgress(old,value){const result={...value};for(const k of ['xp','starts','clears'])result[k]=Math.max(old[k]||0,value[k]||0);result.games={...old.games};for(const [k,v]of Object.entries(value.games))result.games[k]=Math.max(result.games[k]||0,v);result.claimed={...old.claimed,...value.claimed};const seen=new Map();for(const e of [...(old.recent||[]),...value.recent])seen.set(e.game+':'+e.action+':'+e.time,e);result.recent=[...seen.values()].sort((a,b)=>a.time-b.time).slice(-800);return result;}
export async function recoverIdentity(env,d,h){
 if(!validToken(d.sessionToken)||typeof d.key!=='string'||!/^ASOBI-[A-F0-9-]{64,80}$/i.test(d.key))return h.json({error:'backup_invalid'},400);const digest=await hash(d.key.toUpperCase().replace(/-/g,'')),session=await env.DB.prepare('SELECT player_id,profile_json FROM player_sessions WHERE recovery_hash=?').bind(digest).first();if(!session)return h.json({error:'backup_invalid'},400);
 const rotated=await env.DB.prepare('UPDATE player_sessions SET session_hash=?,recovery_hash=NULL,updated=? WHERE player_id=? AND recovery_hash=?').bind(await hash(d.sessionToken),Date.now(),session.player_id,digest).run();if(!rotated.meta?.changes)return h.json({error:'backup_invalid'},400);
 const row=await env.DB.prepare('SELECT player_id AS id,name,avatar,frame,role FROM player_profiles WHERE player_id=?').bind(session.player_id).first();return h.json({...row,progress:JSON.parse(session.profile_json||'{}'),restored:true});
}
export async function createBackup(env,row,h){const raw=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('').toUpperCase(),key='ASOBI-'+raw.match(/.{1,8}/g).join('-');const saved=await env.DB.prepare('UPDATE player_sessions SET recovery_hash=?,updated=? WHERE player_id=? AND session_hash=?').bind(await hash(key.replace(/-/g,'')),Date.now(),row.player_id,row.sessionHash).run();if(!saved.meta?.changes)throw Object.assign(Error('session_revoked'),{status:401});return h.json({key,name:row.name,oneTime:true});}
