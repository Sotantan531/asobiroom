// Shared metre/second simulation: forecasts, visible ball and fence all use these rules.
export const POSITIONS=[[-18,-25],[18,-25],[-10,-39],[11,-39],[-48,-77],[0,-94],[48,-77]];
export const FENCE_HEIGHT=3.5, BALL_RADIUS=.037;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function fenceDistance(angle){return 122-22*Math.pow(Math.min(1,Math.abs(angle)/(Math.PI/4)),1.4);}
export function insideField(p,margin=0){return Math.hypot(p.x,p.z)<=fenceDistance(Math.atan2(p.x,-p.z))-margin;}
export function fieldDestination(p,margin=1.15){const angle=clamp(Math.atan2(p.x,-p.z),-Math.PI/4,Math.PI/4),r=Math.min(Math.hypot(p.x,p.z),fenceDistance(angle)-margin);return {x:Math.sin(angle)*r,y:p.y||0,z:-Math.cos(angle)*r};}
export function fenceCrossing(a,b){
 const signed=p=>Math.hypot(p.x,p.z)-fenceDistance(Math.atan2(p.x,-p.z));
 if(signed(a)>=0||signed(b)<0)return null;
 let lo=0,hi=1;const q={x:0,y:0,z:0};for(let i=0;i<14;i++){const t=(lo+hi)/2;q.x=a.x+(b.x-a.x)*t;q.z=a.z+(b.z-a.z)*t;if(signed(q)<0)lo=t;else hi=t;}
 const t=(lo+hi)/2;q.x=a.x+(b.x-a.x)*t;q.y=a.y+(b.y-a.y)*t;q.z=a.z+(b.z-a.z)*t;const angle=Math.atan2(q.x,-q.z);
 return {point:q,fraction:t,fair:Math.abs(angle)<=Math.PI/4+1e-8,over:q.y-BALL_RADIUS>FENCE_HEIGHT};
}
export function reboundAtFence(p,v,cross){const r=Math.hypot(cross.point.x,cross.point.z),nx=cross.point.x/r,nz=cross.point.z/r,dot=v.x*nx+v.z*nz;p.x=cross.point.x-nx*.12;p.z=cross.point.z-nz*.12;p.y=cross.point.y;v.x-=1.38*dot*nx;v.z-=1.38*dot*nz;v.y*=.8;}
export function contactBall({pitchSpeed,head,dx,dy,radius,sweet,timing,hand=1,height=1,pitchVy=0}){
 const nx=dx/(radius+.037),ny=dy/(radius+.037),nt=clamp(timing/.16,-1,1);
 const quality=clamp(1-.72*(nx*nx+ny*ny)-.48*nt*nt,.03,1);
 const incoming=pitchSpeed/3.6;
 const speed=(head*(.64+.38*quality)+incoming*(.10+.14*quality))*(1-.20*nt*nt);
 const attack=8+(1.1-height)*4;
 const incomingAngle=Math.atan2(pitchVy,incoming)*180/Math.PI;
 const angle=clamp(attack+Math.asin(clamp(dy/(radius*.90),-.98,.98))*180/Math.PI-incomingAngle*.18-Math.abs(nx)*4,-55,84);
 const spray=clamp((timing*6.0+nx*.23)*hand,-1.4,1.4),rad=angle*Math.PI/180;
 const spin={back:clamp((dy/(radius*.9)*280+attack*3-pitchVy*1.3)*(.55+.45*quality),-230,390),side:clamp((-nx*135-timing*350)*hand,-210,210)};
 return {speed,angle,spray,spin,quality,sweetHit:Math.hypot(dx,dy)<=sweet,velocity:{x:Math.sin(spray)*Math.cos(rad)*speed,y:Math.sin(rad)*speed,z:-Math.cos(spray)*Math.cos(rad)*speed}};
}
export function integrateBall(p,v,spin,_legacyArtist,dt){
 const speed=Math.hypot(v.x,v.y,v.z);if(speed<1e-8){v.y-=9.81*dt;p.y+=v.y*dt;return;}
 const back=typeof spin==='number'?spin:spin?.back||0,side=typeof spin==='number'?0:spin?.side||0,horizontal=Math.max(.001,Math.hypot(v.x,v.z));
 const wx=-v.z/horizontal*back,wy=side,wz=v.x/horizontal*back;
 const cx=wy*v.z-wz*v.y,cy=wz*v.x-wx*v.z,cz=wx*v.y-wy*v.x,cross=Math.hypot(cx,cy,cz),rpmAxis=Math.hypot(back,side);
 const spinRatio=BALL_RADIUS*rpmAxis/speed,cl=.35*spinRatio/(.30+spinRatio),lift=.0174*cl*speed*speed,drag=.0061*speed;
 v.x+=(-drag*v.x+(cross?lift*cx/cross:0))*dt;v.y+=(-9.81-drag*v.y+(cross?lift*cy/cross:0))*dt;v.z+=(-drag*v.z+(cross?lift*cz/cross:0))*dt;
 p.x+=v.x*dt;p.y+=v.y*dt;p.z+=v.z*dt;
}
export function predictFlight(f){
 const p={x:f.pos.x,y:f.pos.y,z:f.pos.z},v={x:f.vel.x,y:f.vel.y,z:f.vel.z},old={...p};let t=0,apex=p.y,catchPoint=null,wallPoint=null,homeRun=false,wall=false;
 const dt=1/120;for(let i=0;i<1800;i++){
  Object.assign(old,p);integrateBall(p,v,f.spin,false,dt);t+=dt;apex=Math.max(apex,p.y);
  if(!wall&&!homeRun){const crossing=fenceCrossing(old,p);if(crossing?.fair){wallPoint={...crossing.point,t:t-dt+dt*crossing.fraction};if(crossing.over)homeRun=true;else{wall=true;reboundAtFence(p,v,crossing);}}}
  if(!wall&&!homeRun&&v.y<0&&old.y>=1.85&&p.y<=1.85&&!catchPoint&&insideField(p,.20)){const k=(old.y-1.85)/Math.max(.0001,old.y-p.y);catchPoint={x:old.x+(p.x-old.x)*k,y:1.85,z:old.z+(p.z-old.z)*k,t:t-dt+dt*k};}
  if(p.y<=.075){return {landing:{x:p.x,y:.075,z:p.z,t},catchPoint,apex,homeRun,wallPoint,wall};}
 }
 return {landing:{...p,t},catchPoint,apex,homeRun,wallPoint,wall};
}
export function fielderProfile(index){return {speed:index<4?6.9:8.0,acceleration:index<4?4.5:4.0,reaction:index<4?.30:.36};}
export function arrivalTime(distance,profile){const {speed,acceleration,reaction}=profile,d=Math.max(0,distance-.8),ramp=speed*speed/(2*acceleration);return reaction+(d<=ramp?Math.sqrt(2*d/acceleration):speed/acceleration+(d-ramp)/speed);}
export function planDefense(f){
 const forecast=predictFlight(f),dest=forecast.catchPoint||forecast.landing,destination=fieldDestination(dest);let best=null;
 POSITIONS.forEach(([x,z],index)=>{const profile=fielderProfile(index),arrival=arrivalTime(Math.hypot(destination.x-x,destination.z-z),profile);if(!best||arrival<best.arrival)best={index,arrival,...profile,start:{x,z}};});
 const catchable=Boolean(forecast.catchPoint&&!forecast.homeRun&&!f.foul&&insideField(forecast.catchPoint,.2)&&best.arrival<=dest.t);
 return {...forecast,...best,destination,catchable,high:f.angle>=25&&dest.t>1.5};
}
export function canCatch(f,defender){return Boolean(!f.hr&&!f.wall&&!f.foul&&!f.landed&&f.defense?.catchable&&f.age>=f.defense.catchPoint.t&&insideField(f.pos,.12)&&insideField(defender,.7)&&f.pos.y<=2.15&&f.pos.y>BALL_RADIUS&&Math.hypot(defender.x-f.pos.x,defender.z-f.pos.z)<1.05);}
export function groundResult(f,positions){const d=Math.hypot(f.pos.x,f.pos.z);let pickup=Infinity;positions.forEach((p,i)=>{const chase=arrivalTime(Math.hypot(f.pos.x-p.x,f.pos.z-p.z),fielderProfile(i)),throwTime=Math.hypot(f.pos.x-19.4,f.pos.z+19.4)/28+.45;pickup=Math.min(pickup,chase+throwTime);});if(f.angle<8&&f.speed<175&&f.age+pickup<4.5)return {label:'ゴロアウト',out:true,bases:0};const returnTime=pickup+f.age,bases=d>95&&returnTime>10?3:d>55&&returnTime>7?2:1;return {label:bases===3?'三塁打':bases===2?'二塁打':'単打',out:false,bases};}
export const SWEET_OFFSET=.65;
export function swingPose(aim,elapsed,hand=1){if(elapsed<=0){const axis={x:hand*.32,y:.94,z:.12},n=Math.hypot(.32,.94,.12);for(const k of ['x','y','z'])axis[k]/=n;return {axis,grip:{x:-hand*.68,y:1.18,z:.35}};}const tilt=Math.max(-.12,Math.min(.12,(aim.y-1)*.1)),norm=Math.hypot(1,tilt),impact={x:hand/norm,y:tilt/norm,z:0},theta=(elapsed-.07)*22,axis={x:impact.x*Math.cos(theta),y:impact.y,z:Math.sin(theta)/norm};return {axis,grip:{x:aim.x-impact.x*SWEET_OFFSET,y:aim.y-impact.y*SWEET_OFFSET,z:0},contact:{x:aim.x,y:aim.y,z:0}};}
