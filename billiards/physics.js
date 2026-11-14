// Deterministic, fixed-timestep pool simulation. One world unit represents
// half a metre, so the 9-foot WPA dimensions retain useful scene precision.
export const WORLD_UNITS_PER_METRE = 2;
export const BALL_DIAMETER_METRES = 0.05715;
export const R = BALL_DIAMETER_METRES * WORLD_UNITS_PER_METRE / 2;
// Pool-cloth rolling resistance varies with cloth condition. A slightly
// slower tournament-cloth value within Marlow's measured .011–.024 range
// feels more natural here than .016, especially for short positioning shots.
export const ROLLING_DECELERATION = Object.freeze({
  object: .022 * 9.81 * WORLD_UNITS_PER_METRE,
  cue: .023 * 9.81 * WORLD_UNITS_PER_METRE
});
// After impact a ball briefly skids on the cloth before natural rolling.
// Its sliding friction is much higher than its rolling resistance.
export const SLIDING_DECELERATION = .20 * 9.81 * WORLD_UNITS_PER_METRE;
const slipDuration = speed => Math.min(.34,Math.max(0,speed)/(3.5*SLIDING_DECELERATION));
export const TABLE = Object.freeze({
  halfW: 1.27 * WORLD_UNITS_PER_METRE / 2,
  halfL: 2.54 * WORLD_UNITS_PER_METRE / 2,
  headString: 2.54 * WORLD_UNITS_PER_METRE / 4
});
// Mouths are measured between cushion noses, not the outer pocket liner.
// WPA: corner 4½–4⅝ in, side 5–5⅛ in. Use the midpoint of each range.
export const POCKET_SPEC = Object.freeze({
  cornerMouth: 4.5625 * .0254 * WORLD_UNITS_PER_METRE,
  sideMouth: 5.0625 * .0254 * WORLD_UNITS_PER_METRE,
  cornerReach: 4.5625 * .0254 * WORLD_UNITS_PER_METRE / Math.SQRT2,
  sideHalf: 5.0625 * .0254 * WORLD_UNITS_PER_METRE / 2
});
export const POCKETS = Object.freeze([
  { x: -TABLE.halfW, z: -TABLE.halfL, name: '左奥', index: 0 },
  { x: TABLE.halfW, z: -TABLE.halfL, name: '右奥', index: 1 },
  { x: -TABLE.halfW, z: 0, name: '左中央', index: 2 },
  { x: TABLE.halfW, z: 0, name: '右中央', index: 3 },
  { x: -TABLE.halfW, z: TABLE.halfL, name: '左手前', index: 4 },
  { x: TABLE.halfW, z: TABLE.halfL, name: '右手前', index: 5 }
]);
const CUSHION_JAWS = Object.freeze([-1,1].flatMap(sx=>[-1,1].flatMap(sz=>[
  {x:sx*TABLE.halfW,z:sz*POCKET_SPEC.sideHalf},
  {x:sx*TABLE.halfW,z:sz*(TABLE.halfL-POCKET_SPEC.cornerReach)},
  {x:sx*(TABLE.halfW-POCKET_SPEC.cornerReach),z:sz*TABLE.halfL}
])));

export const COLORS = ['#ffffff','#ead32e','#276de1','#d63b3e','#7435ac','#e78a28','#1c9b63','#7a3230','#161b23','#ead32e','#276de1','#d63b3e','#7435ac','#e78a28','#1c9b63','#7a3230'];
const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
const shuffled = list => {
  const copy = [...list];
  for (let i=copy.length-1;i>0;i--) {
    const j = Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }
  return copy;
};

export function createRack(mode) {
  const balls=[{id:0,x:0,z:1.62,vx:0,vz:0,spinX:0,spinY:0,slipTime:0,pocketed:false}];
  const rows=mode==='9'?[1,2,3,2,1]:[1,2,3,4,5];
  // Neighbouring triangular rows are sqrt(3)*R apart, not a full ball
  // diameter apart. A loose rack absorbs a hard break instead of spreading.
  const rowSpacing=Math.sqrt(3)*R+.0006;
  let others=shuffled(Array.from({length:mode==='9'?9:15},(_,i)=>i+1).filter(n=>mode==='9'?n!==1&&n!==9:n!==8));
  const fixed=mode==='9'?9:8;
  let count=0;
  rows.forEach((size,row)=>{
    for(let j=0;j<size;j++) {
      const number=mode==='9'&&row===0 ? 1
        : ((mode==='9' && row===2 && j===1)||(mode==='8' && row===2 && j===1)) ? fixed : others[count++];
      const x=(j-(size-1)/2)*(2*R+0.0008);
      const z=-TABLE.halfL/2-row*rowSpacing;
      balls.push({id:number,x,z,vx:0,vz:0,spinX:0,spinY:0,slipTime:0,pocketed:false});
    }
  });
  // In eight-ball the back corners must hold one solid and one stripe.
  if(mode==='8'){
    const corners=balls.filter(b=>Math.abs(b.z-(-TABLE.halfL/2-4*rowSpacing))<.003 && Math.abs(b.x)>1.8*R);
    if(corners.length===2 && (corners[0].id<=7)===(corners[1].id<=7)){
      const candidate=balls.find(b=>b!==corners[0] && b!==corners[1] && b.id!==8 && (b.id<=7)!==(corners[0].id<=7));
      if(candidate) [candidate.id,corners[1].id]=[corners[1].id,candidate.id];
    }
  }
  return balls;
}

export function createShotLog(){
  return {firstHit:null,railAfterContact:false,railBalls:new Set(),pocketed:[],railHits:0,crossedHead:new Set(),duration:0};
}

export class BilliardsPhysics {
  constructor(mode='9',events={}){
    this.balls=createRack(mode);
    this.events=events;
    this.inShot=false;
    this.log=createShotLog();
    this.accumulator=0;
    this.quiet=0;
    this.clock=0;
  }
  get cue(){return this.balls.find(b=>b.id===0);}
  get active(){return this.balls.filter(b=>!b.pocketed);}
  find(id){return this.balls.find(b=>b.id===id);}
  canPlace(x,z,cueOnly=true){
    if(x < -TABLE.halfW+R+.03 || x > TABLE.halfW-R-.03 || z < -TABLE.halfL+R+.03 || z>TABLE.halfL-R-.03)return false;
    return this.balls.every(b=>(!cueOnly||b.id!==0)&&!b.pocketed?Math.hypot(b.x-x,b.z-z)>2*R+.012:true);
  }
  placeCue(x,z){
    if(!this.canPlace(x,z))return false;
    Object.assign(this.cue,{x,z,vx:0,vz:0,spinX:0,spinY:0,slipTime:0,pocketed:false});
    return true;
  }
  placeClosest(x,z,kitchen=false){
    const zRange=kitchen?[TABLE.headString+R+.05,TABLE.halfL-R-.08]:[-TABLE.halfL+R+.08,TABLE.halfL-R-.08];
    for(let ring=0;ring<26;ring++){
      for(let a=0;a<24;a++){
        const rad=ring*.045,angle=a*Math.PI/12;
        const xx=clamp(x+rad*Math.cos(angle),-TABLE.halfW+R+.08,TABLE.halfW-R-.08);
        const zz=clamp(z+rad*Math.sin(angle),zRange[0],zRange[1]);
        if(this.placeCue(xx,zz))return true;
      }
    }
    return false;
  }
  spotBall(id){
    const ball=this.find(id);
    if(!ball)return;
    // The foot spot is near the apex; move towards the foot rail if occupied.
    for(let i=0;i<70;i++){
      const x=0,z=-TABLE.halfL/2-i*.028;
      if(this.balls.every(b=>b===ball||b.pocketed||Math.hypot(b.x-x,b.z-z)>2*R+.005)){
        Object.assign(ball,{x,z,vx:0,vz:0,pocketed:false,spinX:0,spinY:0,slipTime:0});
        return;
      }
    }
    for(let i=0;i<100;i++){
      const z=-TABLE.halfL/2+(i%20)*.14;
      const x=((Math.floor(i/20)%5)-2)*.22;
      if(this.canPlace(x,z,false)){
        Object.assign(ball,{x,z,vx:0,vz:0,pocketed:false,spinX:0,spinY:0,slipTime:0});
        return;
      }
    }
  }
  shoot(angle,power,spinX=0,spinY=0){
    if(this.inShot||this.cue.pocketed)return false;
    const cue=this.cue;
    // Finesse shots gain precision while full-power breaks stay forceful.
    const stroke=clamp(power,0,1);
    // An actual break stroke is considerably faster than a positioning shot.
    // Reserve extra speed for the very end of the pull gauge, keeping the
    // softer 0–75% range controllable.
    const speed=.12+Math.pow(stroke,1.55)*5.90+Math.pow(stroke,8)*2.75;
    cue.vx=-Math.sin(angle)*speed;
    cue.vz=-Math.cos(angle)*speed;
    cue.spinX=clamp(spinX,-1,1)*speed*.36;
    cue.spinY=clamp(spinY,-1,1)*speed*.60;
    cue.slipTime=Math.min(.20,slipDuration(speed)*(1-Math.max(0,spinY)*.38));
    this.log=createShotLog();
    this.inShot=true;this.accumulator=0;this.quiet=0;this.clock=0;
    this.events.onStrike?.({speed});
    return true;
  }
  update(frameSeconds){
    if(!this.inShot)return false;
    this.accumulator+=Math.min(.055,Math.max(0,frameSeconds));
    const tick=1/180;
    let n=0;
    while(this.accumulator>=tick && n++<15){this.step(tick);this.accumulator-=tick;}
    this.clock+=frameSeconds;
    const movement=this.active.some(b=>Math.hypot(b.vx,b.vz)>.028);
    this.quiet=movement?0:this.quiet+frameSeconds;
    if(this.quiet>.26||this.clock>22){
      for(const b of this.active){b.vx=0;b.vz=0;b.spinX=0;b.spinY=0;b.slipTime=0;}
      this.inShot=false;this.log.duration=this.clock;
      this.events.onSettle?.(this.log);
      return true;
    }
    return false;
  }
  step(dt){
    const active=this.active;
    for(const b of active){
      // Also capture a ball that comes to rest just across the pocket mouth.
      // Previously a slow ball bypassed capture because speed was checked first.
      if(this.capturePocket(b))continue;
      const speed=Math.hypot(b.vx,b.vz);
      if(speed<.018){b.vx=0;b.vz=0;continue;}
      // Side english bends the cue ball slightly. Follow/draw affects its
      // post-impact motion; this is an accessible approximation of cloth drag.
      if(b.id===0 && Math.abs(b.spinX)>.003){
        const bend=b.spinX*.105*dt;
        const vx=b.vx,vz=b.vz;
        b.vx+=-vz*bend;b.vz+=vx*bend;
      }
      const deceleration=b.slipTime>0?SLIDING_DECELERATION:
        (b.id===0?ROLLING_DECELERATION.cue:ROLLING_DECELERATION.object);
      const resistance=Math.min(speed,deceleration*dt);
      b.vx-=(b.vx/speed)*resistance;b.vz-=(b.vz/speed)*resistance;
      b.slipTime=Math.max(0,(b.slipTime||0)-dt);
      b.spinX*=Math.exp(-.95*dt);b.spinY*=Math.exp(-1.4*dt);
      const previousZ=b.z;
      b.x+=b.vx*dt;b.z+=b.vz*dt;
      if(previousZ<TABLE.headString && b.z>=TABLE.headString && b.id!==0)this.log.crossedHead.add(b.id);
      if(this.capturePocket(b))continue;
      this.rail(b);
    }
    for(let i=0;i<active.length;i++){
      const a=active[i];if(a.pocketed)continue;
      for(let j=i+1;j<active.length;j++){
        const b=active[j];if(b.pocketed)continue;
        const dx=b.x-a.x,dz=b.z-a.z;
        const dist=Math.hypot(dx,dz);
        if(dist>=2*R||dist<.000001)continue;
        const nx=dx/dist,nz=dz/dist,overlap=2*R-dist;
        a.x-=nx*overlap*.5;b.x+=nx*overlap*.5;
        a.z-=nz*overlap*.5;b.z+=nz*overlap*.5;
        const relative=(a.vx-b.vx)*nx+(a.vz-b.vz)*nz;
        if(relative<=0)continue;
        const impact=relative*.975;
        a.vx-=impact*nx;a.vz-=impact*nz;b.vx+=impact*nx;b.vz+=impact*nz;
        const cue=a.id===0?a:b.id===0?b:null;
        const other=cue===a?b:cue===b?a:null;
        if(cue&&other){
          if(this.log.firstHit===null)this.log.firstHit=other.id;
          const shotDx=cue===a?nx:-nx,shotDz=cue===a?nz:-nz;
          // Transfer draw/follow to the cue ball after it makes contact.
          cue.vx+=shotDx*cue.spinY*.48;
          cue.vz+=shotDz*cue.spinY*.48;
          other.vx+=-shotDz*cue.spinX*.04;
          other.vz+=shotDx*cue.spinX*.04;
          cue.spinY*=.45;cue.spinX*=.7;
        }
        // Rack contact pairs can overlap across ticks. A fresh skid starts
        // only on a meaningful impact, and has a bounded duration; otherwise
        // tiny repeated impulses would drain an entire break unrealistically.
        if(relative>.45){
          a.slipTime=Math.max(a.slipTime||0,Math.min(.095,slipDuration(Math.hypot(a.vx,a.vz))*.58));
          b.slipTime=Math.max(b.slipTime||0,Math.min(.095,slipDuration(Math.hypot(b.vx,b.vz))*.58));
        }
        this.events.onCollide?.({a:a.id,b:b.id,speed:relative});
      }
    }
    // A collision may nudge a ball over a pocket lip during the last tick.
    for(const b of active)if(!b.pocketed)this.capturePocket(b);
  }
  capturePocket(ball){
    if(ball.pocketed)return false;
    for(const p of POCKETS){
      let inside=false;
      if(p.z===0){
        // A side pocket is a narrow opening in the cushion, not a circle
        // that can swallow balls while they are still on the felt.
        inside=ball.x*Math.sign(p.x)>=TABLE.halfW-R*.65
          && Math.abs(ball.z)<=POCKET_SPEC.sideHalf-R*.84;
      }else{
        const fromX=TABLE.halfW-ball.x*Math.sign(p.x);
        const fromZ=TABLE.halfL-ball.z*Math.sign(p.z);
        // The two cushion jaws cut a diagonal entrance at the corner.
        inside=fromX<=POCKET_SPEC.cornerReach && fromZ<=POCKET_SPEC.cornerReach
          && fromX+fromZ<=POCKET_SPEC.cornerReach+R*.12;
      }
      if(inside){
        ball.pocketed=true;ball.vx=0;ball.vz=0;ball.spinX=0;ball.spinY=0;ball.slipTime=0;
        this.log.pocketed.push({id:ball.id,pocket:p.index});
        this.events.onPocket?.({id:ball.id,pocket:p.index});
        return true;
      }
    }
    return false;
  }
  rail(ball){
    const edgeX=TABLE.halfW-R,edgeZ=TABLE.halfL-R;
    const sideOpening=Math.abs(ball.z)<POCKET_SPEC.sideHalf;
    const cornerOpeningX=Math.abs(ball.z)>TABLE.halfL-POCKET_SPEC.cornerReach;
    const cornerOpeningZ=Math.abs(ball.x)>TABLE.halfW-POCKET_SPEC.cornerReach;
    let struck=false;
    if(Math.abs(ball.x)>edgeX&&!sideOpening&&!cornerOpeningX){
      ball.x=Math.sign(ball.x)*edgeX;
      ball.vx*=-.84;
      ball.vz+=ball.spinX*.28*Math.sign(ball.x);
      struck=true;
    }
    if(Math.abs(ball.z)>edgeZ&&!cornerOpeningZ){
      ball.z=Math.sign(ball.z)*edgeZ;
      ball.vz*=-.84;
      ball.vx+=ball.spinX*.28*Math.sign(ball.z);
      struck=true;
    }
    // Rounded cushion noses at the pocket mouths reject near misses.
    for(const jaw of CUSHION_JAWS){
      const dx=ball.x-jaw.x,dz=ball.z-jaw.z;
      const d=Math.hypot(dx,dz);
      if(d<.000001||d>=R+.003)continue;
      const nx=dx/d,nz=dz/d;
      ball.x=jaw.x+nx*(R+.003);
      ball.z=jaw.z+nz*(R+.003);
      const incoming=ball.vx*nx+ball.vz*nz;
      if(incoming<0){
        ball.vx-=1.78*incoming*nx;
        ball.vz-=1.78*incoming*nz;
        struck=true;
      }
    }
    // A grazing near-miss must rebound; it must never be assigned to a
    // nearest pocket merely because it crosses an invisible outer bound.
    if(Math.abs(ball.x)>TABLE.halfW+.10){
      ball.x=Math.sign(ball.x)*(TABLE.halfW-R*.25);
      ball.vx=-Math.sign(ball.x)*Math.abs(ball.vx)*.48;
      struck=true;
    }
    if(Math.abs(ball.z)>TABLE.halfL+.10){
      ball.z=Math.sign(ball.z)*(TABLE.halfL-R*.25);
      ball.vz=-Math.sign(ball.z)*Math.abs(ball.vz)*.48;
      struck=true;
    }
    if(struck){
      ball.slipTime=Math.min(.10,slipDuration(Math.hypot(ball.vx,ball.vz)));
      this.log.railHits++;
      this.log.railBalls.add(ball.id);
      if(this.log.firstHit!==null)this.log.railAfterContact=true;
      this.events.onRail?.({id:ball.id,speed:Math.hypot(ball.vx,ball.vz)});
    }
  }
}
