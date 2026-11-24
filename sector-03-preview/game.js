const walkSpeed=2.15, dashSpeed=3.5;
const $=s=>document.querySelector(s),canvas=$('#world'),dialog=$('dialog');
let p,hunters=[],state='menu',switches=[],clock=0,angle=0,pitch=0,last=0,foot=0,notice=0,sound=true,ac,moveX=0,moveY=0,stickID=null,lookID=null,lastX,lastY,phase=0,keys={},scareTime=0;
const world=renderer(canvas),cover=renderer($('#cover'));
function titleArt(){cover?.([1.5,1.05,1.5],0,0,[{x:1.5,z:2.5,heading:0,face:0,pose:0,expression:0}],[],true)}
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
// Fire on pointerdown: a second finger must not wait for a synthesized click.
$('#run').addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();dash();});
$('#run').onclick=e=>{if(e.detail===0)dash();};


$('#guide').onclick=()=>openModal('追跡実験・生存手順','実験体は常にあなたの位置を知っています。後退やその場での反転はできません。分岐で進路を変えるため、回遊路を利用して逃げてください。<br>黄色い鍵に触れると自動取得。すべて集めて緑の出口へ。赤い点はテスト用の敵位置。<br>PC：WASD、マウス、Shift。スマホ：スティック、スワイプ、ダッシュ。','閉じる',()=>{},false);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),cell=o=>Math.floor(o.z)*gardenSize+Math.floor(o.x),center=id=>({x:id%gardenSize+.5,z:Math.floor(id/gardenSize)+.5});
const links=grid.flatMap((row,z)=>row.map((_,x)=>free(x,z)?[[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>free(x+a,z+b)).map(([a,b])=>(z+b)*gardenSize+x+a):[]));
function distances(id){let d=new Int16Array(links.length).fill(-1),q=[id];d[id]=0;for(let i=0;i<q.length;i++)for(let n of links[q[i]])if(d[n]<0){d[n]=d[q[i]]+1;q.push(n)}return d}
function count(){return switches.filter(s=>s.on).length}
function setObjective(){$('#objective').textContent=count()===switches.length?'出口へ向かえ':'鍵を集めろ '+count()+' / '+switches.length}
function say(t){$('#message').textContent=t;notice=3}
function start(){if(!world)return openModal('描画エラー','ブラウザを変更してください。','戻る',home,false);if(!ac)try{ac=new (window.AudioContext||window.webkitAudioContext)()}catch{}ac?.resume();inputsOff();p={...spawn};clock=angle=pitch=phase=foot=0;dashEnds=dashReady=0;updateDashButton();let d=distances(cell(p)),sites=links.map((l,i)=>i).filter(i=>d[i]>10&&dist(center(i),gate)>2);let chosen=[];for(let i=0;i<levels[prefs.level].count;i++){let opts=sites.filter(id=>chosen.every(o=>dist(center(id),center(o))>4));chosen.push(opts[Math.floor(Math.random()*opts.length)]??sites[i]);}switches=chosen.map(id=>({...center(id),on:false}));hunters=[[19.5,3.5],[3.5,19.5],[19.5,19.5]].map((o,i)=>{let id=cell({x:o[0],z:o[1]}),next=links[id][0];return {...center(id),id,next,prev:-1,heading:0,face:0,pose:0,expression:i,heard:0}});state='play';$('#menu').hidden=true;$('#hud').hidden=false;setObjective();say('実験体3体が起動した');}
function pause(){if(state!=='play')return;state='paused';inputsOff();document.exitPointerLock?.();openModal('一時停止','鍵 '+count()+' / '+switches.length,'再開',()=>{state='play'})}
$('#start').onclick=start;$('#pause').onclick=pause;document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
function activateDetector(){}function use(){}
function end(win){state='end';document.body.classList.remove('scare');inputsOff();document.exitPointerLock?.();openModal(win?'脱出成功':'実験体に捕まった','鍵 '+count()+' / '+switches.length+'　／　'+Math.floor(clock)+'秒','もう一度挑戦',start)}
function caught(){state='scare';scareTime=0;inputsOff();document.body.classList.add('scare');tone(120,.8,.25,'sawtooth');tone(680,.4,.1,'square')}
function enemy(h,dt,d){let remaining=dt*levels[prefs.level].speed;while(remaining>0){let t=center(h.next),gap=dist(h,t);if(gap>remaining){h.x+=(t.x-h.x)*remaining/gap;h.z+=(t.z-h.z)*remaining/gap;remaining=0;}else{h.x=t.x;h.z=t.z;remaining-=gap;h.prev=h.id;h.id=h.next;let opts=links[h.id].filter(n=>n!==h.prev);if(!opts.length){remaining=0;h.next=h.prev;break;}opts.sort((a,b)=>d[a]-d[b]+(hunters.some(o=>o!==h&&o.next===a)?4:0)-(hunters.some(o=>o!==h&&o.next===b)?4:0));h.next=opts[0];}let t2=center(h.next);h.heading=h.face=Math.atan2(h.x-t2.x,h.z-t2.z);}if(dist(h,p)<.48)caught();}
function update(dt){clock+=dt;updateDashButton();if((notice-=dt)<=0)$('#message').textContent='';angle+=((keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0))*dt*1.9*prefs.sensitivity/100;let f=moveY+(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0),s=moveX+(keys.KeyD?1:0)-(keys.KeyA?1:0),v=dt*(clock<dashEnds?dashSpeed:walkSpeed)/Math.max(1,Math.hypot(f,s));let dx=(f*Math.sin(angle)+s*Math.cos(angle))*v,dz=(f*Math.cos(angle)-s*Math.sin(angle))*v;const fits=(x,z)=>[-.22,.22].every(a=>[-.22,.22].every(b=>free(x+a,z+b)));if(fits(p.x+dx,p.z))p.x+=dx;if(fits(p.x,p.z+dz))p.z+=dz;if(f||s)phase+=dt*9;for(let k of switches)if(!k.on&&dist(k,p)<.42){k.on=true;tone(620,.25,.1);setObjective();say('鍵を取得');}if(dist(p,gate)<.45&&count()===switches.length){end(true);return}let d=distances(cell(p));for(let h of hunters){enemy(h,dt,d);if(state!=='play')return}}
function mini(){let el=$('#mapview'),g=el.getContext('2d');el.width=el.height=280;let k=248/gardenSize;g.fillStyle='#101418';g.fillRect(0,0,280,280);g.fillStyle='#62666a';for(let z=0;z<gardenSize;z++)for(let x=0;x<gardenSize;x++)if(free(x,z))g.fillRect(16+x*k,264-(z+1)*k,k,k);function dot(o,c,r){g.fillStyle=c;g.beginPath();g.arc(16+o.x*k,264-o.z*k,r,0,7);g.fill()}for(let s of switches)if(!s.on)dot(s,'#ffcf53',4);dot(gate,count()===switches.length?'#4cff93':'#758d80',5);for(let h of hunters)dot(h,'#ff4545',5);dot(p,'#fff',4)}
function frame(t){let dt=Math.min(.05,(t-last)/1000);last=t;if(state==='play'){update(dt);if(state==='play'){world([p.x,.74+Math.sin(phase)*.012*prefs.bob,p.z],angle,pitch,hunters,switches.filter(s=>!s.on),false,clock);mini()}}if(state==='scare'){scareTime+=dt;world([1.5,1.25,1.5],0,0,[{x:1.5,z:2.4-.45*Math.min(1,scareTime*4),heading:0,face:0,pose:2,expression:2}],[],true);if(scareTime>1.2)end(false)}requestAnimationFrame(frame)}requestAnimationFrame(frame);
