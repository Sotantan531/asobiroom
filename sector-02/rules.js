// Difficulty changes only the randomized time between the creature's approach stages.
export const LEVELS={easy:{interval:[4.0,6.2]},normal:{interval:[2.6,4.8]},hard:{interval:[1.7,3.3]}};
export const LOCK={window:.095,turnsPerSecond:.62,gain:12,perfectGain:16,missLoss:10,decay:.9,recharge:2.2,cooldown:.42};
export const STAGE_DISTANCES=[16,10,5,1.8];
export function circleDistance(a,b){const d=Math.abs(a-b)%1;return Math.min(d,1-d);}
export function createGame(emit=()=>{},random=Math.random){
 const s={phase:'menu',level:'normal',time:0,progress:0,successes:0,misses:0,needle:.02,target:.5,look:0,lockCooldown:0,flashCooldown:0,flashTime:0,flashSide:0,scare:0,escape:0,enemies:[],success:false};
 const rand=(a,b)=>a+random()*(b-a),interval=()=>rand(...LEVELS[s.level].interval);
 function caught(){if(s.phase!=='play')return;s.phase='scare';s.scare=.0001;s.flashTime=0;emit('caught');}
 function start(level='normal'){Object.assign(s,{phase:'play',level:LEVELS[level]?level:'normal',time:0,progress:0,successes:0,misses:0,needle:.02,target:random(),look:0,lockCooldown:0,flashCooldown:0,flashTime:0,flashSide:0,scare:0,escape:0,success:false});s.enemies=[{side:random()<.5?-1:1,stage:1,distance:STAGE_DISTANCES[0],remaining:interval(),reveal:0,cadence:rand(.5,1.6)}];emit('start');return s;}
 function look(side){if(s.phase==='play'&&[-1,0,1].includes(side))s.look=side;}
 function action(){if(s.phase!=='play')return false;if(s.look===0){if(s.lockCooldown>0)return false;s.lockCooldown=LOCK.cooldown;const error=circleDistance(s.needle,s.target);if(error<=LOCK.window/2){const gain=error<=LOCK.window*.18?LOCK.perfectGain:LOCK.gain;s.progress=Math.min(100,s.progress+gain);s.successes++;s.target=random();emit('unlock',gain);if(s.progress>=100){s.phase='escape';s.escape=0;s.success=true;emit('escape');}}else{s.progress=Math.max(0,s.progress-LOCK.missLoss);s.misses++;emit('miss',LOCK.missLoss);}return true;}
 if(s.flashCooldown>0)return false;s.flashCooldown=LOCK.recharge;s.flashSide=s.look;const e=s.enemies[0];if(e.side===s.look&&e.stage===4){caught();return true;}s.flashTime=.55;
 if(e.side===s.look){e.reveal=STAGE_DISTANCES[e.stage-1];e.stage=Math.max(1,e.stage-1);e.distance=STAGE_DISTANCES[e.stage-1];e.remaining=interval();emit('repel',s.look);}else emit('flash',s.look);return true;}
 function update(seconds){if(!Number.isFinite(seconds)||seconds<0)return;const dt=Math.min(.05,seconds);if(s.phase==='scare'){s.scare+=dt;if(s.scare>=1.2){s.phase='end';emit('lose');}return;}if(s.phase==='escape'){s.escape+=dt;if(s.escape>=3.1){s.phase='end';emit('win');}return;}if(s.phase!=='play')return;s.time+=dt;s.progress=Math.max(0,s.progress-LOCK.decay*dt);s.flashTime=Math.max(0,s.flashTime-dt);s.flashCooldown=Math.max(0,s.flashCooldown-dt);s.lockCooldown=Math.max(0,s.lockCooldown-dt);s.needle=(s.needle+dt*LOCK.turnsPerSecond)%1;
 const e=s.enemies[0];e.remaining-=dt;e.cadence-=dt;if(e.cadence<=0){emit('step',{side:e.side,nearness:(e.stage-1)/3});e.cadence=rand(.9,2.4);}if(e.remaining<=0){e.stage++;if(e.stage>=5){caught();return;}e.distance=STAGE_DISTANCES[e.stage-1];e.remaining=interval();emit('step',{side:e.side,nearness:(e.stage-1)/3});}
 }
 function pause(){if(s.phase==='play'){s.phase='paused';emit('paused');}else if(s.phase==='paused'){s.phase='play';emit('resumed');}}
 return {state:s,start,look,action,update,pause,home(){s.phase='menu';s.look=0;s.flashTime=0;s.scare=0;emit('home');}};
}
