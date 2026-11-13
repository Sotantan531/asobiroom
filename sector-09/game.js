const walkSpeed=1.75, dashSpeed=3.1;
const $=s=>document.querySelector(s),canvas=$('#world'),dialog=$('dialog');
let p,hunters=[],state='menu',switches=[],clock=0,angle=0,pitch=0,last=0,foot=0,notice=0,sound=true,ac,moveX=0,moveY=0,stickID=null,lookID=null,lastX,lastY,phase=0,keys={},scareTime=0;
const world=renderer(canvas),cover=renderer($('#cover'));
function titleArt(){cover?.([15.32,1.56,4.98],.10,-.06,[{x:15.65,z:6.24,heading:.12}],[],true)}
requestAnimationFrame(titleArt);window.addEventListener('resize',()=>{if(state==='menu')titleArt()});
function tone(freq,len,vol,type='sine'){if(!sound||!ac)return;let o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,ac.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*.52),ac.currentTime+len);g.gain.setValueAtTime(vol,ac.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+len);o.connect(g).connect(ac.destination);o.start();o.stop(ac.currentTime+len)}
$('.audio').onclick=()=>{sound=!sound;$('.audio').textContent='▥　 SOUND '+(sound?'ON':'OFF')};
function openModal(title,copy,button,fn,back=true){dialog.querySelector('h2').textContent=title;$('#copy').innerHTML=copy;$('#confirm').textContent=button;$('#confirm').onclick=()=>{dialog.close();fn()};$('#back').hidden=!back;dialog.showModal()}
function home(){state='menu';$('#hud').hidden=true;$('#menu').hidden=false;document.exitPointerLock?.();titleArt()}
$('#back').onclick=()=>{dialog.close();home()};dialog.oncancel=e=>{e.preventDefault();if(state==='paused'||state==='menu')$('#confirm').click();else $('#back').click()};
function inputsOff(){keys={};moveX=moveY=0;stickID=lookID=null;$('#stick i').style.transform=''}
onkeydown=e=>{if(state!=='play')return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();keys[e.code]=true;if((e.code==='ShiftLeft'||e.code==='ShiftRight')&&!e.repeat)dash();if(e.code==='KeyR'&&!e.repeat)activateDetector();if(e.code==='KeyE'&&!e.repeat)use();if(e.code==='Escape'||e.code==='KeyP')pause()};onkeyup=e=>{keys[e.code]=false};
const hud=$('#hud');hud.onpointerdown=e=>{if(state!=='play'||e.target.closest('button'))return;if(e.target.closest('#stick')){stickID=e.pointerId;hud.setPointerCapture(stickID);stick(e);return}if(e.pointerType==='mouse'&&!document.pointerLockElement){try{hud.requestPointerLock?.()?.catch(()=>{})}catch{}}lookID=e.pointerId;lastX=e.clientX;lastY=e.clientY;hud.setPointerCapture(e.pointerId)};
function stick(e){let r=$('#stick').getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/32,y=(e.clientY-r.top-r.height/2)/32,l=Math.max(1,Math.hypot(x,y));moveX=x/l;moveY=-y/l;$('#stick i').style.transform='translate('+moveX*29+'px,'+(-moveY*29)+'px)'}
function look(x,y){const gain=prefs.sensitivity/100;angle+=x*.004*gain;pitch=Math.max(-.3,Math.min(.3,pitch-y*.002*gain*(prefs.invert?-1:1)))}
hud.onpointermove=e=>{if(state!=='play')return;if(e.pointerId===stickID)stick(e);else if(document.pointerLockElement)look(e.movementX,e.movementY);else if(e.pointerId===lookID){look(e.clientX-lastX,e.clientY-lastY);lastX=e.clientX;lastY=e.clientY}};
hud.onpointerup=hud.onpointercancel=e=>{if(e.pointerId===stickID){stickID=null;moveX=moveY=0;$('#stick i').style.transform=''}if(e.pointerId===lookID)lookID=null};
const dashDuration=3, dashCooldown=6;
let dashEnds=0, dashReady=0;
function updateDashButton(){
  const button=$('#run');
  const remaining=Math.ceil(dashReady-clock);
  const label=clock<dashEnds?'加速中 '+Math.ceil(dashEnds-clock)+'秒':remaining>0?'あと '+remaining+'秒':'ダッシュ';
  button.disabled=clock<dashReady;
  if(button.textContent!==label)button.textContent=label;
}
function dash(){
  if(state!=='play'||clock<dashReady)return;
  dashEnds=clock+dashDuration;dashReady=dashEnds+dashCooldown;
  updateDashButton();
}
$('#run').onclick=dash;

$('#guide').onclick=()=>openModal('庭園での生存手順','庭園図は北が上。白い矢印があなた、琥珀色の点が未点灯のスイッチです。すべてを好きな順に灯して、北の鉄門を開けてください。水色の◆は探知器です。拾ったあと、Rキーか探知ボタンで1回だけ、30秒間石像の位置を表示できます。<br><br>難易度によって石像の速さとスイッチの数、霧の濃さが変わります。1体は最短経路を詰め、1体は側面から回り込み、1体は移動方向の先で待ち伏せます。壁や生垣を挟んでいても、こちらが向いている方の石像は止まります。視界の外にいる石像は、そのまま追ってきます。庭園に立つ黒い石像は動きません。<br><br>床板の縁が赤く光ったら針が出る合図です。針は庭園に設置された床板から周期的に突き出します。スイッチや鉄門は正面に捉えて操作してください。<br><br>ダッシュは3秒間加速し、終了から6秒で再使用できます。<br><br><b>PC</b>　WASDで移動、画面クリック後マウスまたは左右キーで見回す。Shiftでダッシュ、Eで操作。<br><b>スマホ</b>　スティックで移動、空いている場所をスワイプして視点操作。「ダッシュ」をタップ。','閉じる',()=>{},false);
function sampleSwitches(){let result=[];for(let [a,b,c,d] of [[2,17,2,16],[25,41,3,18],[2,18,25,41],[25,41,25,41]]){let options=[];for(let x=a;x<=b;x++)for(let z=c;z<=d;z++)if(free(x,z)&&Math.hypot(x+.5-spawn.x,z+.5-spawn.z)>2&&[[1,0],[-1,0],[0,1],[0,-1]].some(([i,j])=>free(x+i,z+j)))options.push({x:x+.5,z:z+.5,on:false});result.push(options[Math.floor(Math.random()*options.length)])}const needed=levels[prefs.level].count;
if(needed===3)result.splice(Math.floor(Math.random()*4),1);
while(result.length<needed){
 const options=grid.flatMap((row,z)=>row.map((_,x)=>({x:x+.5,z:z+.5,on:false}))).filter(s=>free(s.x,s.z)&&distance(s,spawn)>4&&distance(s,gate)>2&&result.every(o=>distance(s,o)>5));
 result.push(options[Math.floor(Math.random()*options.length)]);
}
return result}
let warned=false,travelHeading={x:0,z:1};
let detector={status:'spent'};
function resetDetector(){
  const sites=[[9.5,5.5],[16.5,7.5],[19.5,6.5],[11.5,9.5]];
  const choices=sites.filter(([x,z])=>free(x,z)&&!switches.some(s=>s.x===x&&s.z===z)&&!plates.some(s=>s.x===x&&s.z===z));
  const [x,z]=choices[Math.floor(Math.random()*choices.length)];
  detector={x,z,status:'ground',expires:0};
  updateDetectorUI();
}
function updateDetectorUI(){
  const button=$('#detect');
  button.hidden=detector.status!=='ready'&&detector.status!=='active';
  button.disabled=detector.status==='active';
  button.textContent=detector.status==='active'?'探知中　'+Math.ceil(detector.expires-clock)+'秒':'探知器を使う［R］';
}
function activateDetector(){
  if(state!=='play'||detector.status!=='ready')return;
  detector.status='active';detector.expires=clock+30;updateDetectorUI();
  tone(780,.22,.07);say('探知開始。赤い点が3体の石像。');
}
function updateDetector(){
  if(detector.status==='ground'&&Math.hypot(p.x-detector.x,p.z-detector.z)<.78&&clearLine(p,detector)){
    detector.status='ready';say('探知器を入手。必要なときに1回だけ使える。');tone(490,.3,.07);
  }
  if(detector.status==='active'&&clock>=detector.expires){detector.status='spent';say('探知終了')}
  updateDetectorUI();
}
$('#detect').onclick=activateDetector;
function start(){if(!world){openModal('3D描画を開始できません','WebGLを使用できるブラウザで開いてください。','戻る',home,false);return}if(!ac)try{ac=new (window.AudioContext||window.webkitAudioContext)()}catch{}ac?.resume();inputsOff();p={...spawn};travelHeading={x:0,z:1};hunters=[[6.5,23.5],[31.5,13.5],[23.5,32.5]].map(([x,z],i)=>({x,z,role:['chase','flank','ambush'][i],closeUntil:0,planUntil:0,heading:0,face:0,expression:i,pose:0,frozen:false,route:[],goalCell:-1,heard:0}));switches=sampleSwitches();resetTraps(switches);resetDetector();nextLaugh=18+Math.random()*20;stepWeight=0;warned=false;clock=foot=pitch=phase=angle=0;dashEnds=dashReady=0;updateDashButton();state='play';$('#menu').hidden=true;$('#hud').hidden=false;setObjective();say('水色の◆は探知器。近づくと拾えます。');tone(160,.4,.08)}
function count(){return switches.filter(s=>s.on).length}
function setObjective(){let n=count();$('#objective').textContent=n===switches.length?'北門から脱出せよ':'庭園のスイッチを灯せ　'+n+' / '+switches.length}
function say(text){$('#message').textContent=text;notice=3}
function pause(){if(state!=='play')return;state='paused';inputsOff();document.exitPointerLock?.();openModal('一時停止','点灯済み　'+count()+' / '+switches.length,'探索を再開',()=>{state='play'})}
$('#start').onclick=start;$('#pause').onclick=pause;document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
function end(win,spiked=false){state='end';document.body.classList.remove('scare');document.exitPointerLock?.();inputsOff();if(win)tone(520,.8,.09);openModal(win?'脱出成功':spiked?'床の針に倒れた':'石像に捕まった',win?'すべての灯が夜霧に浮かび、鉄門が開いた。<br>脱出時間　'+Math.floor(clock/60)+'分 '+Math.floor(clock%60)+'秒':'点灯済み　'+count()+' / '+switches.length+'<br>'+(spiked?'赤く光った床から離れ、針が沈んでから渡ろう。':'石を擦る音が迫ったら振り返れ。石像は視界の中では動けない。'),'もう一度挑戦',start)}
function sting(){if(!sound||!ac)return;let buf=ac.createBuffer(1,ac.sampleRate*.56,ac.sampleRate),v=buf.getChannelData(0);for(let i=0;i<v.length;i++)v[i]=(Math.random()*2-1)*Math.exp(-5*i/v.length);let src=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain();src.buffer=buf;filter.type='bandpass';filter.frequency.setValueAtTime(2400,ac.currentTime);filter.frequency.exponentialRampToValueAtTime(370,ac.currentTime+.52);gain.gain.value=.36;src.connect(filter).connect(gain).connect(ac.destination);src.start();tone(162,.76,.16,'sawtooth');tone(615,.43,.07,'square')}
function caught(){state='scare';scareTime=0;inputsOff();document.exitPointerLock?.();document.body.classList.add('scare');sting()}
function clearLine(a,b){let d=Math.hypot(a.x-b.x,a.z-b.z);for(let j=.05;j<d;j+=.09)if(!free(a.x+(b.x-a.x)*j/d,a.z+(b.z-a.z)*j/d))return false;return true}
function near(){return [...switches,gate].find(s=>!s.on&&Math.hypot(s.x-p.x,s.z-p.z)<1.12&&clearLine(p,s)&&((s.x-p.x)*Math.sin(angle)+(s.z-p.z)*Math.cos(angle)>=.55*Math.hypot(s.x-p.x,s.z-p.z)))}
function use(){if(state!=='play')return;let s=near();if(!s)return;if(s===gate){if(count()===switches.length)end(true);else say('鉄門は閉ざされている　残り '+(switches.length-count())+' 灯');return}s.on=true;tone(370,.35,.09,'triangle');say(count()===switches.length?'すべての灯が揃った。北門へ。':'石灯籠のスイッチを入れた');setObjective()}
$('#use').onclick=use;
function cell(o){return Math.floor(o.z)*gardenSize+Math.floor(o.x)}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const tileCenter=id=>({x:id%gardenSize+.5,z:Math.floor(id/gardenSize)+.5});
const walkLinks=grid.flatMap((row,z)=>row.map((_,x)=>{
  const links=[];
  if(free(x,z))for(const dx of [-1,0,1])for(const dz of [-1,0,1]){
    if(!(dx||dz)||!free(x+dx,z+dz)||!free(x+dx,z)||!free(x,z+dz))continue;
    links.push({id:(z+dz)*gardenSize+x+dx,cost:Math.hypot(dx,dz)});
  }
  return links;
}));
function clearPassage(a,b){
  const steps=Math.max(1,Math.ceil(distance(a,b)/.1));
  for(let i=0;i<=steps;i++){
    const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
    if(!free(x-.13,z-.13)||!free(x+.13,z-.13)||!free(x-.13,z+.13)||!free(x+.13,z+.13))return false;
  }
  return true;
}
function pathTo(a,b){
  const first=cell(a),last=cell(b);
  if(first===last)return [];
  const costs=new Float64Array(walkLinks.length).fill(Infinity),parents=new Int16Array(walkLinks.length).fill(-1);
  const open=new Map([[first,0]]);
  costs[first]=0;
  while(open.size){
    let current=first,lowest=Infinity;
    for(const [id,priority] of open)if(priority<lowest){current=id;lowest=priority}
    open.delete(current);
    if(current===last)break;
    for(const link of walkLinks[current]){
      const next=costs[current]+link.cost;
      if(next>=costs[link.id])continue;
      costs[link.id]=next;parents[link.id]=current;
      open.set(link.id,next+distance(tileCenter(link.id),tileCenter(last)));
    }
  }
  if(parents[last]===-1)return [];
  const route=[];
  for(let id=last;id!==first;id=parents[id])route.push(tileCenter(id));
  route.reverse();
  if(!clearPassage(a,route[0]))route.unshift(tileCenter(first));
  return route;
}
// Choose a reachable point several steps from the player in the requested direction.
function approachPoint(direction){
  const origin=cell(p),queue=[origin],depth=new Map([[origin,0]]);
  let best=origin,score=-Infinity;
  for(let i=0;i<queue.length;i++){
    const id=queue[i],steps=depth.get(id),at=tileCenter(id);
    const dx=at.x-p.x,dz=at.z-p.z;
    const value=dx*direction.x+dz*direction.z-.6*Math.abs(dx*direction.z-dz*direction.x)-.22*steps;
    if(value>score){score=value;best=id}
    if(steps===6)continue;
    for(const {id:next} of walkLinks[id])if(!depth.has(next)){depth.set(next,steps+1);queue.push(next)}
  }
  return tileCenter(best);
}
function strategyTarget(h){
  const gap=distance(h,p);
  if(h.role==='chase'||gap<1.35)return p;
  if(h.role==='flank'){
    if(h.flankPoint&&(distance(h,h.flankPoint)<.4||distance(h.flankPoint,p)>11)){
      h.flankPoint=null;h.closeUntil=clock+3.2;
    }
    if(clock<h.closeUntil)return p;
    if(!h.flankPoint){
      const lead=hunters[0],dx=p.x-lead.x,dz=p.z-lead.z,l=Math.hypot(dx,dz)||1;
      const side=(h.x-p.x)*(-dz)+(h.z-p.z)*dx>=0?1:-1;
      h.flankPoint=approachPoint({x:(.65*dx-side*.76*dz)/l,z:(.65*dz+side*.76*dx)/l});
    }
    return h.flankPoint;
  }
  const atPost=h.ambushPoint&&distance(h,h.ambushPoint)<.25;
  if(atPost&&!h.waitUntil)h.waitUntil=clock+2.4;
  const expired=h.waitUntil?clock>=h.waitUntil:clock>=h.planUntil;
  if(!h.ambushPoint||expired){
    h.ambushPoint=approachPoint(travelHeading);
    h.waitUntil=0;h.planUntil=clock+Math.max(4,distance(h,h.ambushPoint)/dashSpeed+3);
  }
  return h.ambushPoint;
}
function nextWaypoint(h,goal){
  if(clearPassage(h,goal))return goal;
  const goalId=cell(goal);
  if(h.goalCell!==goalId||!h.route.length||!clearPassage(h,h.route[0])){
    h.route=pathTo(h,goal);h.goalCell=goalId;
  }
  for(let i=h.route.length-1;i>0;i--)if(clearPassage(h,h.route[i])){h.route.splice(0,i);break}
  return h.route[0]||h;
}
// Project the statue bounds into the very same camera frustum used by WebGL. Occluders deliberately do not participate.
function inFrame(monster){let dx=monster.x-p.x,dz=monster.z-p.z,f=dx*Math.sin(angle)+dz*Math.cos(angle),side=dx*Math.cos(angle)-dz*Math.sin(angle),aspect=canvas.clientWidth/canvas.clientHeight;
let depths=[-.74,statueHeight-.74].map(y=>f*Math.cos(pitch)+y*Math.sin(pitch)),top=(statueHeight-.74)*Math.cos(pitch)-f*Math.sin(pitch),bottom=-.74*Math.cos(pitch)-f*Math.sin(pitch),far=Math.max(...depths)+.27;
return far>.032&&Math.abs(side)<=far*aspect/1.48+.48&&bottom<=far/1.48&&top>=-far/1.48}
function pursue(monster,dt){if(Math.hypot(monster.x-p.x,monster.z-p.z)<.40&&clearLine(monster,p)){caught();return}const visible=inFrame(monster);if(!monster.frozen||!visible)monster.face=Math.atan2(monster.x-p.x,monster.z-p.z);
if(visible){
  if(!monster.frozen){
    monster.pose=(monster.pose+1+Math.floor(Math.random()*3))%4;
    monster.expression=(monster.expression+1+Math.floor(Math.random()*3))%4;
  }
  monster.frozen=true;return;
}
monster.frozen=false;
const target=nextWaypoint(monster,strategyTarget(monster));
const dx=target.x-monster.x,dz=target.z-monster.z,l=Math.hypot(dx,dz),step=dt*levels[prefs.level].speed;
const travel=l>0?Math.min(step/l,1):0;
const nextX=monster.x+dx*travel,nextZ=monster.z+dz*travel;
const crowded=hunters.some(other=>other!==monster&&Math.hypot(nextX-other.x,nextZ-other.z)<.62&&Math.hypot(nextX-other.x,nextZ-other.z)<Math.hypot(monster.x-other.x,monster.z-other.z));
if(crowded)return;
monster.x=nextX;monster.z=nextZ;
if(l<=step&&target===monster.route[0])monster.route.shift();
monster.heading=Math.atan2(monster.x-p.x,monster.z-p.z);
let dist=Math.hypot(monster.x-p.x,monster.z-p.z);if(dist<7&&(monster.heard-=dt)<0){tone(78,.24,.105*(1-dist/8),'triangle');monster.heard=.48}if(dist<.52&&clearLine(monster,p))caught()}
let stepWeight=0,nextLaugh=0;
function distantLaugh(){
 if(!sound||!ac)return;
 const now=ac.currentTime, pan=ac.createStereoPanner?.(),filter=ac.createBiquadFilter();
 filter.type='bandpass';filter.frequency.value=680;filter.Q.value=.8;
 if(pan){pan.pan.value=(Math.random()<.5?-1:1)*.68;filter.connect(pan);pan.connect(ac.destination)}else filter.connect(ac.destination);
 for(let i=0;i<4;i++)for(const echo of [0,1]){
   const t=now+i*.21+echo*.34, voice=ac.createOscillator(),gain=ac.createGain();
   voice.type='sawtooth';voice.frequency.setValueAtTime(298-i*16,t);voice.frequency.exponentialRampToValueAtTime(173-i*9,t+.15);
   gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(echo?.004:.016,t+.032);gain.gain.exponentialRampToValueAtTime(.0001,t+.17);
   voice.connect(gain);gain.connect(filter);voice.start(t);voice.stop(t+.18);
   voice.onended=()=>{voice.disconnect();gain.disconnect();if(i===3&&echo){filter.disconnect();pan?.disconnect()}};
 }
}
function update(dt){clock+=dt;if(clock>=nextLaugh){nextLaugh=clock+29+Math.random()*28;distantLaugh()}updateDashButton();if((notice-=dt)<=0)$('#message').textContent='';angle+=((keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0))*dt*1.9*prefs.sensitivity/100;
let f=moveY+(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0),s=moveX+(keys.KeyD?1:0)-(keys.KeyA?1:0),fast=clock<dashEnds,v=dt*(fast?dashSpeed:walkSpeed)/Math.max(1,Math.hypot(f,s));let dx=(f*Math.sin(angle)+s*Math.cos(angle))*v,dz=(f*Math.cos(angle)-s*Math.sin(angle))*v;
function fits(x,z){return [-.18,.18].every(a=>[-.18,.18].every(b=>free(x+a,z+b)))}
const oldX=p.x,oldZ=p.z;
if(fits(p.x+dx,p.z))p.x+=dx;if(fits(p.x,p.z+dz))p.z+=dz;const moved=Math.hypot(p.x-oldX,p.z-oldZ);if(moved>.00001)travelHeading={x:(p.x-oldX)/moved,z:(p.z-oldZ)/moved};
stepWeight+=(Number(moved>.00001)-stepWeight)*Math.min(1,dt*10);if(moved>.00001){phase+=dt*(fast?12:8);if((foot-=dt)<0){tone(63,.10,.044);foot=fast?.28:.44}}const trap=tickTraps(p,clock);
if(trap==='hit'){
  world([p.x,.56,p.z],angle,-.55,hunters,switches,false,clock);
  tone(154,.48,.13,'sawtooth');end(false,true);return;
}
if(trap==='warning'&&!warned)tone(580,.2,.065,'square');
warned=trap==='warning';
for(const hunter of hunters){pursue(hunter,dt);if(state!=='play')return}updateDetector();let target=near();$('#hint').textContent=warned?'⚠ 足元に針！　床板から離れろ':target?(target===gate?'［調べる / E］ 鉄門':'［調べる / E］ スイッチを入れる'):''}
function mini(){let el=$('#mapview'),g=el.getContext('2d');if(el.width!==280)el.width=el.height=280;let k=248/gardenSize,ox=16,oy=264,xx=x=>ox+x*k,yy=z=>oy-z*k;g.clearRect(0,0,280,280);g.fillStyle='#0c1411cf';g.fillRect(0,0,280,280);g.fillStyle='#56645a';for(let z=0;z<gardenSize;z++)for(let x=0;x<gardenSize;x++)if(free(x,z))g.fillRect(xx(x),yy(z+1),k,k);for(let s of switches){g.fillStyle=s.on?'#8ac5a9':'#ffbd61';g.beginPath();g.arc(xx(s.x),yy(s.z),5,0,7);g.fill()}if(detector.status==='ground'){
  const x=xx(detector.x),y=yy(detector.z);
  g.fillStyle='#65f3f2';g.beginPath();g.moveTo(x,y-7);g.lineTo(x+7,y);g.lineTo(x,y+7);g.lineTo(x-7,y);g.fill();
}
if(detector.status==='active'){
  for(const h of hunters){g.beginPath();g.arc(xx(h.x),yy(h.z),6,0,2*Math.PI);g.fillStyle='#ff514a';g.fill();g.strokeStyle='#31100e';g.lineWidth=2;g.stroke()}
}
g.fillStyle=count()===switches.length?'#abf9c2':'#aaaea3';g.fillRect(xx(gate.x)-6,yy(gate.z)-3,12,6);g.fillStyle='#eee9d9';g.font='bold 13px monospace';g.fillText('N',7,14);g.save();g.translate(xx(p.x),yy(p.z));g.rotate(angle);g.beginPath();g.moveTo(0,-9);g.lineTo(5,5);g.lineTo(0,3);g.lineTo(-5,5);g.closePath();g.fill();g.restore()}
function frame(t){let dt=Math.min(.06,(t-last)/1000);last=t;if(state==='play'){update(dt);if(state==='play'){const w=prefs.bob*stepWeight,side=.014*w*Math.sin(phase*.5);world([p.x+side*Math.cos(angle),.74+Math.sin(phase)*.022*w,p.z-side*Math.sin(angle)],angle,pitch+.004*w*Math.sin(phase),hunters,switches,false,clock);mini()}}if(state==='scare'){scareTime+=dt;let rush=.24+.94*Math.exp(-scareTime*10),shake=Math.exp(-scareTime*5)*.03;world([15.5+Math.sin(scareTime*70)*shake,1.76,6-rush-.15],0,-.025,[{x:15.5,z:6,heading:0,pose:2,face:0,expression:2}],[],true);if(scareTime>=1.20)end(false)}requestAnimationFrame(frame)}requestAnimationFrame(frame);
