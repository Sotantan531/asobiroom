import { DurableObject } from 'cloudflare:workers';
const json=(v,status=200)=>Response.json(v,{status});
const uuid=()=>crypto.randomUUID();
const validId=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v);
const cleanName=v=>typeof v==='string'?v.normalize('NFKC').trim().slice(0,16):'';
export function validTime(v){return typeof v==='number'&&Number.isFinite(v)&&v>=100&&v<=5000;}
export function judge(a,b){const x=a?.falseStart||!validTime(a?.ms),y=b?.falseStart||!validTime(b?.ms);return x&&y?-1:x?1:y?0:Math.abs(a.ms-b.ms)<1?-1:a.ms<b.ms?0:1;}
export function validateRecord(b,run,now=Date.now()){
 if(!run||run.used||now-run.created>3600000||now-run.created<1000)return false;
 if(!Array.isArray(b.samples)||!b.samples.every(validTime))return false;
 if(run.mode==='reaction')return b.samples.length===5&&Number.isFinite(b.value)&&Math.abs(b.value-Math.min(...b.samples))<.1&&now-run.created>=b.samples.length*1500;
 return run.mode==='survival'&&Number.isInteger(b.value)&&b.value>=1&&b.value<=500&&b.samples.length===b.value&&now-run.created>=b.value*1500&&b.samples.every((t,i)=>t<=Math.max(160,620-i*22)+90);
}
export default {async fetch(req,env){
 const u=new URL(req.url),origin=req.headers.get('Origin'),allow=(env.ALLOWED_ORIGINS||'https://asobiroom.net').split(',');
 if(origin&&!allow.includes(origin))return json({error:'許可されていない接続元です'},403);
 const headers={'Access-Control-Allow-Origin':origin||allow[0],'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','Cache-Control':'no-store'};
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
 let res;
 if(u.pathname==='/health')res=json({ok:true,version:'1.0.0',service:'gunman'});
 else if(u.pathname==='/ws'&&req.headers.get('Upgrade')?.toLowerCase()==='websocket'){
 const room=u.searchParams.get('room');if(!room||!/^([0-9]{4}|r-[a-f0-9-]{36})$/.test(room))return json({error:'ルームIDが不正です'},400);
 return env.ROOMS.getByName(room).fetch(req);
 }else if(u.pathname==='/match'&&req.method==='POST'){
 const b=await body(req);if(!validId(b.client))throw Error('端末IDが不正です');
 res=json(await env.LOBBY.getByName('queue-v1').join(b.client));
 }else if(u.pathname==='/cancel'&&req.method==='POST'){const b=await body(req);if(validId(b.client))await env.LOBBY.getByName('queue-v1').cancel(b.client);res=json({ok:true});}else if(u.pathname==='/rankings'&&req.method==='GET'){
 const mode=u.searchParams.get('mode')==='survival'?'survival':'reaction';const order=mode==='reaction'?'ASC':'DESC';
 const rows=await env.DB.prepare(`SELECT name,value,created FROM records WHERE mode=? ORDER BY value ${order},created ASC LIMIT 20`).bind(mode).all();res=json({mode,rows:rows.results});
 }else if(u.pathname==='/runs'&&req.method==='POST'){
 const b=await body(req);if(!validId(b.client)||!['reaction','survival'].includes(b.mode))throw Error('計測モードが不正です');
 const ip=req.headers.get('CF-Connecting-IP')||'unknown';const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+new Date().toISOString().slice(0,10))))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const recent=await env.DB.prepare('SELECT COUNT(*) n FROM runs WHERE ip=? AND created>?').bind(hash,Date.now()-60000).first();if(recent.n>=12)return new Response(JSON.stringify({error:'少し時間をおいて再試行してください'}),{status:429,headers});
 const token=uuid(),now=Date.now();await env.DB.batch([env.DB.prepare('DELETE FROM runs WHERE created<?').bind(now-3600000),env.DB.prepare('INSERT INTO runs(id,client,mode,created,ip,used) VALUES(?,?,?,?,?,0)').bind(token,b.client,b.mode,now,hash)]);res=json({token});
 }else if(u.pathname==='/records'&&req.method==='POST'){
 const b=await body(req),name=cleanName(b.name);if(!name||/[<>@\r\n\x00-\x1f]/.test(name)||/https?:|死ね|殺す|fuck|nigger/i.test(name))throw Error('公開用の名前を変更してください');
 if(!validId(b.token)||!validId(b.client))throw Error('計測をやり直してください');
 const run=await env.DB.prepare('SELECT * FROM runs WHERE id=? AND client=?').bind(b.token,b.client).first();if(!validateRecord(b,run))throw Error('記録が検証条件を満たしていません（100ms未満・重複・期限切れ等）');
 const value=Math.round(b.value*10)/10,cmp=run.mode==='reaction'?'<':'>';
 const result=await env.DB.batch([env.DB.prepare(`INSERT INTO records(client,mode,name,value,created) SELECT client,mode,?,?,? FROM runs WHERE id=? AND used=0 ON CONFLICT(client,mode) DO UPDATE SET name=excluded.name,value=excluded.value,created=excluded.created WHERE excluded.value ${cmp} records.value`).bind(name,value,Date.now(),b.token),env.DB.prepare('UPDATE runs SET used=1 WHERE id=? AND used=0').bind(b.token)]);res=json({ok:true,improved:result[0].meta.changes>0});
 }else res=json({error:'Not found'},404);
 for(const [k,v] of Object.entries(headers))res.headers.set(k,v);return res;
 }catch(e){return new Response(JSON.stringify({error:e.message||'通信に失敗しました'}),{status:400,headers:{...headers,'Content-Type':'application/json'}});}
}};
async function body(req){const text=await req.text();if(text.length>20000)throw Error('データが大きすぎます');return JSON.parse(text);}
// A small matchmaking queue is its own coordination atom; gameplay is per-room.
export class Matchmaker extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.sql=ctx.storage.sql;this.sql.exec('CREATE TABLE IF NOT EXISTS queue(client TEXT PRIMARY KEY,room TEXT,created INTEGER,claimed INTEGER)');}
 cancel(client){this.sql.exec('DELETE FROM queue WHERE client=?',client);return true;}
 join(client){const now=Date.now();this.sql.exec('DELETE FROM queue WHERE created<?',now-45000);let own=this.sql.exec('SELECT room FROM queue WHERE client=?',client).toArray()[0];if(own)return own;
 const other=this.sql.exec('SELECT * FROM queue WHERE claimed=0 AND client<>? ORDER BY created LIMIT 1',client).toArray()[0];const room=other?.room||'r-'+uuid();if(other)this.sql.exec('UPDATE queue SET claimed=1 WHERE client=?',other.client);this.sql.exec('INSERT INTO queue VALUES(?,?,?,?)',client,room,now,other?1:0);return {room};}
}
export class DuelRoom extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.sql=ctx.storage.sql;this.sql.exec('CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT)');ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));}
 load(){const row=this.sql.exec('SELECT data FROM state WHERE id=1').toArray()[0];return row?JSON.parse(row.data):{phase:'lobby',wins:[0,0],ready:[],rematch:[],round:0};}
 save(s){this.sql.exec('INSERT INTO state VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',JSON.stringify(s));}
 peers(){return this.ctx.getWebSockets().filter(w=>w.readyState===1);}
 send(w,d){try{w.send(JSON.stringify(d));}catch{}}
 broadcast(d){for(const w of this.peers())this.send(w,d);}
 async fetch(req){const p=this.peers();if(p.length>=2)return json({error:'部屋は満員です'},409);let s=this.load();if(!p.length){s={phase:'lobby',wins:[0,0],ready:[],rematch:[],round:0};this.save(s);}else if(s.phase!=='lobby')return json({error:'対戦中です'},409);
 const slot=p.length?1-p[0].deserializeAttachment().slot:0;const pair=new WebSocketPair(),[client,server]=Object.values(pair);this.ctx.acceptWebSocket(server);server.serializeAttachment({slot,name:cleanName(new URL(req.url).searchParams.get('name'))||'旅のガンマン',last:0,count:0});this.send(server,{type:'hello',slot});this.broadcast({type:'lobby',players:this.peers().map(w=>({slot:w.deserializeAttachment().slot,name:w.deserializeAttachment().name}))});await this.ctx.storage.setAlarm(Date.now()+60000);return new Response(null,{status:101,webSocket:client});}
 async start(s){if(this.peers().length!==2)return;const delay=2200+Math.floor(Math.random()*2800);s.phase='round';s.round++;s.id=uuid();s.delay=delay;s.created=Date.now();s.shots=[null,null];s.rematch=[];s.feints=Math.random()<.55?[{at:Math.floor(delay*.45),kind:Math.random()<.5?'WAIT!':'crow',duration:420}]:[];this.save(s);await this.ctx.storage.setAlarm(s.created+delay+6500);this.broadcast({type:'round',id:s.id,round:s.round,delay,feints:s.feints,wins:s.wins});}
 async webSocketMessage(ws,message){if(typeof message!=='string'||message.length>1000){ws.close(1009,'Invalid message');return;}let b;try{b=JSON.parse(message);}catch{return;}const a=ws.deserializeAttachment(),now=Date.now();if(now-a.last>1000){a.last=now;a.count=0;}if(++a.count>20){ws.close(1008,'Rate limit');return;}ws.serializeAttachment(a);let s=this.load();
 if(b.type==='ready'&&s.phase==='lobby'){if(!s.ready.includes(a.slot))s.ready.push(a.slot);this.save(s);if(s.ready.length===2&&this.peers().length===2)await this.start(s);}
 else if(b.type==='shot'&&s.phase==='round'&&b.id===s.id&&s.shots[a.slot]===null){const early=b.falseStart===true;const valid=validTime(b.ms)&&now>=s.created+s.delay+80&&now<=s.created+s.delay+6500;s.shots[a.slot]={ms:valid?Math.round(b.ms*10)/10:null,falseStart:early||!valid};this.save(s);if(s.shots.every(Boolean))await this.resolve(s);}
 else if(b.type==='rematch'&&s.phase==='done'&&this.peers().length===2){if(!s.rematch.includes(a.slot))s.rematch.push(a.slot);this.save(s);this.broadcast({type:'rematch',count:s.rematch.length});if(s.rematch.length===2){s.wins=[0,0];s.round=0;await this.start(s);}}
 }
 async resolve(s){if(s.phase!=='round')return;const winner=judge(...s.shots);if(winner>=0)s.wins[winner]++;const done=s.wins.some(n=>n>=2)||s.round>=20;s.phase=done?'done':'break';this.save(s);await this.ctx.storage.setAlarm(Date.now()+(done?120000:2600));this.broadcast({type:'result',id:s.id,winner,shots:s.shots,wins:s.wins,done,draw:winner===-1});}
 async alarm(){const s=this.load();if(s.phase==='round'){s.shots=s.shots.map(x=>x||{ms:null,falseStart:true});await this.resolve(s);}else if(s.phase==='break')await this.start(s);else{for(const ws of this.peers())ws.close(1000,'Room expired');}}
 async webSocketClose(ws){const a=ws.deserializeAttachment(),s=this.load();if(a&&['round','break','done'].includes(s.phase)){if(s.phase!=='done'){s.phase='done';s.wins[1-a.slot]=2;this.save(s);this.broadcast({type:'forfeit',winner:1-a.slot,wins:s.wins});}}else{ s.ready=s.ready.filter(v=>v!==a?.slot);this.save(s);this.broadcast({type:'lobby',players:this.peers().map(w=>({slot:w.deserializeAttachment().slot,name:w.deserializeAttachment().name}))});}await this.ctx.storage.setAlarm(Date.now()+60000);}
 async webSocketError(ws){try{ws.close(1011,'Disconnected');}catch{}await this.webSocketClose(ws);}
}
