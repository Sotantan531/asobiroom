import {DurableObject} from 'cloudflare:workers';
import {BilliardsPhysics,TABLE} from './physics.js';
import {MatchRules} from './rules.js';
const origins=['https://asobiroom.net','https://www.asobiroom.net'];
const json=(data,status=200)=>Response.json(data,{status});
const clone=v=>JSON.parse(JSON.stringify(v));
const validOptions=(g,o={})=>g==='billiards'?{mode:o.mode==='8'?'8':'9'}:{mode:['301','501','701','cr','cu'].includes(o.mode)?o.mode:'501',out:['open','double','master'].includes(o.out)?o.out:'open',bull:o.bull==='split'?'split':'fat'};
const key=(g,o)=>g+':'+JSON.stringify(o);
export default {async fetch(req,env){
 const origin=req.headers.get('Origin');
 if(origin&&!origins.includes(origin))return json({error:'アクセスできません'},403);
 const headers={'Access-Control-Allow-Origin':origin||origins[0],'Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method==='GET')return new Response('asobiroom multiplayer v1',{headers});
 if(req.method!=='POST')return json({error:'Method'},405);
 try{
  if(Number(req.headers.get('Content-Length'))>20000)return json({error:'Too large'},413);
  const text=await req.text();if(text.length>20000)throw Error('リクエストが大きすぎます');
  const b=JSON.parse(text),path=new URL(req.url).pathname;
  let result;
  if(path==='/match'){
   if(!['darts','billiards'].includes(b.game))throw Error('ゲームが不正です');
   b.options=validOptions(b.game,b.options);
   result=await env.MATCHMAKER.getByName(key(b.game,b.options)).match(b);
  }else if(path==='/room'){
   if(!/^[A-Z0-9]{8}$/.test(b.code||''))throw Error('8文字の部屋コードを入力してください');
   result=await env.ROOMS.getByName(b.code).action(b,req.headers.get('Authorization')?.replace(/^Bearer /,''));
  }else throw Error('Not found');
  return new Response(JSON.stringify(result),{headers});
 }catch(e){return new Response(JSON.stringify({error:e.message||'接続に失敗しました'}),{status:400,headers});}
}};
export class Matchmaker extends DurableObject{
 async match(b){const previous=this.lock||Promise.resolve();let release;this.lock=new Promise(r=>release=r);await previous;try{return await this.doMatch(b);}finally{release();}}
 async doMatch(b){
  const token=typeof b.token==='string'&&/^[a-f0-9-]{36}$/.test(b.token)?b.token:crypto.randomUUID();
  const name=String(b.name||'プレイヤー').slice(0,20);
  if(b.kind==='random'){
   const q=await this.ctx.storage.get('queue');
   if(q&&q.until>Date.now()){
    const room=this.env.ROOMS.getByName(q.code);
    const joined=await room.action({type:'join',game:b.game,name,options:b.options},token);
    if(!joined.error){if(joined.seat===1)await this.ctx.storage.delete('queue');return {...joined,token};}
   }
  }
  const code=crypto.randomUUID().replace(/-/g,'').slice(0,8).toUpperCase();
  await this.env.ROOMS.getByName(code).create({code,game:b.game,options:b.options,token,name});
  if(b.kind==='random')await this.ctx.storage.put('queue',{code,until:Date.now()+120000});
  return {code,token,seat:0};
 }
}
export class GameRoom extends DurableObject{
 async create(b){await this.ctx.storage.put('room',{code:b.code,game:b.game,options:b.options,players:[{token:b.token,name:b.name,seen:Date.now()}],phase:'waiting',seq:0,created:Date.now()});await this.ctx.storage.setAlarm(Date.now()+180000);}
 async action(b,token){const previous=this.lock||Promise.resolve();let release;this.lock=new Promise(r=>release=r);await previous;try{return await this.doAction(b,token);}finally{release();}}
 async doAction(b,token){
  const r=await this.ctx.storage.get('room');if(!r)return {error:'部屋が見つかりません'};
  let seat=r.players.findIndex(p=>p.token===token);
  if(b.type==='join'){
   if(r.game!==b.game)return {error:'別のゲームの部屋です'};
   if(seat<0){if(r.players.length>=2||r.phase!=='waiting'||Date.now()-r.created>180000)return {error:'満員、または終了した部屋です'};seat=1;r.players.push({token,name:String(b.name||'プレイヤー').slice(0,20),seen:Date.now()});this.start(r);}
  }
  if(seat<0)throw Error('参加情報が無効です');
  r.players[seat].seen=Date.now();
  if(r.phase==='playing'&&r.players.some(p=>Date.now()-p.seen>45000)){r.phase='ended';r.message='相手との接続が切れました。';delete r.pending;r.winner=seat;r.seq++;}
  if(r.pending&&Date.now()>=r.pending.readyAt){Object.assign(r,r.pending.final);delete r.pending;r.seq++;}
  if(b.type==='leave'){r.phase='ended';r.message='相手が対戦を退出しました。';delete r.pending;r.winner=1-seat;r.seq++;}
  if(b.type==='move'){
   if(r.phase!=='playing'||r.pending||r.turn!==seat)throw Error('今はあなたの手番ではありません');
   if(b.seq!==r.seq)throw Error('状態を更新しています。もう一度お試しください');
   if(r.game==='billiards')this.poolMove(r,b.move);else this.dartMove(r,b.move);
   r.seq++;
  }
  await this.ctx.storage.put('room',r);await this.ctx.storage.setAlarm(Date.now()+600000);
  return {code:r.code,seat,game:r.game,options:r.options,players:r.players.map(p=>p.name),phase:r.phase,seq:r.seq,turn:r.turn,balls:r.balls,rules:r.rules,darts:r.darts,pending:r.pending?{id:r.seq,move:r.pending.move,balls:r.pending.balls,readyAt:r.pending.readyAt}:null,winner:r.winner,message:r.message,last:r.last};
 }
 start(r){
  r.phase='playing';r.turn=crypto.getRandomValues(new Uint8Array(1))[0]%2;r.seq++;
  if(r.game==='billiards'){r.balls=new BilliardsPhysics(r.options.mode).balls;r.rules=clone(new MatchRules(r.options.mode,r.turn));}
  else r.darts={scores:[0,0].map(()=>isNaN(+r.options.mode)?0:+r.options.mode),marks:[{},{}],hits:[],round:1,count:0,first:r.turn,start:isNaN(+r.options.mode)?0:+r.options.mode};
 }
 poolMove(r,m){
  if(!m||![m.angle,m.power,m.spinX,m.spinY].every(Number.isFinite)||m.power<.09||m.power>1||Math.abs(m.angle)>Math.PI||Math.abs(m.spinX)>1||Math.abs(m.spinY)>1)throw Error('ショットが不正です');
  const p=new BilliardsPhysics(r.options.mode),rules=Object.assign(new MatchRules(r.options.mode),r.rules);p.balls=clone(r.balls);
  if(rules.ballInHand){if(!Number.isFinite(m.x)||!Number.isFinite(m.z)||(rules.ballInHand==='kitchen'&&m.z<TABLE.headString)||!p.placeCue(m.x,m.z))throw Error('手球の位置が不正です');}
  const call=m.call;
  if(r.options.mode==='8'&&!rules.breaking&&(!call||!rules.targets(p.balls).includes(call.ball)||!Number.isInteger(call.pocket)||call.pocket<0||call.pocket>5))throw Error('球とポケットを指定してください');
  const before=p.active.filter(b=>b.id!==0).map(b=>b.id),initial=clone(p.balls);
  p.shoot(m.angle,m.power,m.spinX,m.spinY);
  for(let i=0;i<4200&&p.inShot;i++)p.update(1/180);
  const result=rules.finishShot(p.log,before,call);result.spot.forEach(id=>p.spotBall(id));
  if(result.ballInHand){p.cue.pocketed=false;p.placeClosest(0,result.ballInHand==='kitchen'?1.63:1.35,result.ballInHand==='kitchen');}
  const final={balls:p.balls,rules:clone(rules),turn:rules.turn,message:result.reason,winner:rules.winner,phase:rules.winner===null?'playing':'ended'};
  r.pending={move:m,balls:initial,readyAt:Date.now()+Math.ceil(p.log.duration*1000)+500,final};
 }
 dartMove(r,m){
  if(!m||![m.x,m.y].every(Number.isFinite)||Math.abs(m.x)>5000||Math.abs(m.y)>5000)throw Error('投球が不正です');
  const s=r.darts,p=r.turn,o=r.options,rad=Math.hypot(m.x,m.y),scale=170/196.85;
  const nums=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
  let n=rad>170?0:rad<44.5*scale/2?25:nums[(Math.floor(Math.atan2(m.x,-m.y)/(Math.PI/10)+.5)+20)%20];
  let mult=!n?0:n===25?(rad<15.9*scale/2?2:1):rad>170-19.1*scale?2:rad>=104.7*scale&&rad<123.8*scale?3:1;
  const v=n===25?(mult===2||o.bull==='fat'?50:25):n*mult;
  let bust=false,win=false;
  if(!isNaN(+o.mode)){
   s.scores[p]-=v;const finish=o.out==='open'||mult===2||(o.out==='master'&&(mult===3||n===25));
   bust=s.scores[p]<0||(s.scores[p]===0&&!finish)||(s.scores[p]===1&&o.out!=='open');
   if(bust)s.scores[p]=s.start;else win=s.scores[p]===0;
  }else if(o.mode==='cr'){
   if(n>=15&&n<=20||n===25){const old=s.marks[p][n]||0;s.marks[p][n]=Math.min(3,old+mult);if((s.marks[1-p][n]||0)<3)s.scores[p]+=Math.max(0,old+mult-3)*n;win=[15,16,17,18,19,20,25].every(n=>s.marks[p][n]===3)&&s.scores[p]>=s.scores[1-p];}
  }else s.scores[p]+=v;
  (s.hits||=[]).push({x:m.x,y:m.y});s.count++;r.last={x:m.x,y:m.y,n,m:mult,v,bust,player:p,id:r.seq+1};
  if(win){r.phase='ended';r.winner=p;r.message='ナイスフィニッシュ！';return;}
  if(bust||s.count>=3){const complete=p!==s.first;const cap=o.mode==='cr'?20:o.mode==='cu'?8:15;
   if(complete&&s.round>=cap){const d=s.scores[0]-s.scores[1];r.winner=d===0?-1:(!isNaN(+o.mode)?d<0:d>0)?0:1;r.phase='ended';r.message='規定ラウンド終了';return;}
   if(complete)s.round++;r.turn=1-p;s.count=0;s.hits=[];s.start=s.scores[r.turn];
  }
 }
 async alarm(){await this.ctx.storage.deleteAll();}
}
