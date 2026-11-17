// One source of truth for visible timing windows and difficulty-dependent pressure.
export const LEVELS={
 easy:{interval:[3.8,8.6],window:.115,pressure:[1,.94,.88],missRush:.08},
 normal:{interval:[2.2,6.2],window:.095,pressure:[1,.85,.70],missRush:.18},
 hard:{interval:[1.4,5.0],window:.072,pressure:[1,.82,.68],missRush:.30}
};
export const getLockWindow=level=>(LEVELS[level]||LEVELS.normal).window;
export const getApproachScale=(level,peakProgress)=>(LEVELS[level]||LEVELS.normal).pressure[peakProgress>=80?2:peakProgress>=50?1:0];
export const LOCK={window:.095,turnsPerSecond:.62,gain:6,perfectGain:8,missLoss:0,missCooldown:1.05,decay:.9,recharge:2.2,cooldown:.42};
export const STAGE_DISTANCES=[16,10,5,1.8];
export function circleDistance(a,b){const d=Math.abs(a-b)%1;return Math.min(d,1-d);}
export function createGame(emit=()=>{},random=Math.random){
 const s={phase:'menu',level:'normal',time:0,progress:0,peakProgress:0,successes:0,misses:0,needle:.02,target:.5,look:0,lockCooldown:0,flashCooldown:0,flashTime:0,flashSide:0,scare:0,escape:0,enemies:[],success:false};
 const rand=(a,b)=>a+random()*(b-a),interval=()=>rand(...LEVELS[s.level].interval)*getApproachScale(s.level,s.peakProgress);
 function caught(){if(s.phase!=='play')return;s.phase='scare';s.scare=.0001;s.flashTime=0;emit('caught');}
 function start(level='normal'){Object.assign(s,{phase:'play',level:LEVELS[level]?level:'normal',time:0,progress:0,peakProgress:0,successes:0,misses:0,needle:.02,target:random(),look:0,lockCooldown:0,flashCooldown:0,flashTime:0,flashSide:0,scare:0,escape:0,success:false});s.enemies=[{side:random()<.5?-1:1,stage:1,distance:STAGE_DISTANCES[0],remaining:interval(),reveal:0,retreat:null,cadence:rand(.5,1.6)}];emit('start');return s;}
 function look(side){if(s.phase==='play'&&[-1,0,1].includes(side))s.look=side;}
 function action(){if(s.phase!=='play')return false;if(s.look===0){if(s.lockCooldown>0)return false;s.lockCooldown=LOCK.cooldown;const error=circleDistance(s.needle,s.target),window=getLockWindow(s.level);if(error<=window/2){const gain=error<=window*.18?LOCK.perfectGain:LOCK.gain;const oldScale=getApproachScale(s.level,s.peakProgress);s.progress=Math.min(100,s.progress+gain);s.peakProgress=Math.max(s.peakProgress,s.progress);const nextScale=getApproachScale(s.level,s.peakProgress);if(nextScale<oldScale){s.enemies[0].remaining*=nextScale/oldScale;emit('pressure',s.peakProgress>=80?80:50);}s.successes++;s.target=random();emit('unlock',gain);if(s.progress>=100){s.phase='escape';s.escape=0;s.success=true;emit('escape');}}else{s.lockCooldown=LOCK.missCooldown;s.misses++;const e=s.enemies[0];if(!e.retreat){e.remaining=Math.max(Math.min(.55,e.remaining),e.remaining*(1-LEVELS[s.level].missRush));emit('step',{side:e.side,nearness:(e.stage-1)/3});}emit('miss',{noticed:!e.retreat});}return true;}
 if(s.flashCooldown>0)return false;s.flashCooldown=LOCK.recharge;s.flashSide=s.look;const e=s.enemies[0];if(e.side===s.look&&e.stage===4){caught();return true;}s.flashTime=.55;
 if(e.side===s.look){e.reveal=STAGE_DISTANCES[e.stage-1];e.retreat={age:0,from:e.distance,to:0};e.stage=Math.max(1,e.stage-1);e.distance=STAGE_DISTANCES[e.stage-1];e.retreat.to=Math.max(e.reveal+4,e.distance);e.remaining=interval();emit('repel',s.look);}else emit('flash',s.look);return true;}
 function update(seconds){if(!Number.isFinite(seconds)||seconds<0)return;const dt=Math.min(.05,seconds);if(s.phase==='scare'){s.scare+=dt;if(s.scare>=1.2){s.phase='end';emit('lose');}return;}if(s.phase==='escape'){s.escape+=dt;if(s.escape>=5.6){s.phase='end';emit('win');}return;}if(s.phase!=='play')return;s.time+=dt;s.progress=Math.max(0,s.progress-LOCK.decay*dt);s.flashTime=Math.max(0,s.flashTime-dt);s.flashCooldown=Math.max(0,s.flashCooldown-dt);s.lockCooldown=Math.max(0,s.lockCooldown-dt);s.needle=(s.needle+dt*LOCK.turnsPerSecond)%1;
 const e=s.enemies[0];if(e.retreat){e.retreat.age+=dt;if(e.retreat.age<1.65)return;e.retreat=null;e.side=random()<.5?-1:1;e.stage=1;e.distance=STAGE_DISTANCES[0];e.remaining=interval();}e.remaining-=dt;e.cadence-=dt;if(e.cadence<=0){emit('step',{side:e.side,nearness:(e.stage-1)/3});e.cadence=rand(.9,2.4);}if(e.remaining<=0){e.stage++;if(e.stage>=5){caught();return;}e.distance=STAGE_DISTANCES[e.stage-1];e.remaining=interval();emit('step',{side:e.side,nearness:(e.stage-1)/3});}
 }
 function pause(){if(s.phase==='play'){s.phase='paused';emit('paused');}else if(s.phase==='paused'){s.phase='play';emit('resumed');}}
 return {state:s,start,look,action,update,pause,home(){s.phase='menu';s.look=0;s.flashTime=0;s.scare=0;emit('home');}};
}
