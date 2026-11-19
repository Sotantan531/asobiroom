import {PIN_COM,PIN_Z,DECK_END} from './physics.js?v=20261119real';
// Deterministic pinsetter choreography. Physics is paused while machinery owns bodies.
export class Pinsetter {
 constructor(physics,onSound=()=>{}){this.p=physics;this.sound=onSound;this.active=false;this.t=0;this.table=1.65;this.sweepY=1.1;this.sweepZ=PIN_Z+.60;this.returnT=-1;this.label='';}
 start(fresh,onDone){this.fresh=fresh;this.onDone=onDone;this.t=0;this.active=true;this.loaded=false;this.returnT=-1;this.down=this.p.knocked();this.up=this.p.pins.filter(p=>!p.removed&&!this.down.includes(p));this.starts=new Map(this.p.pins.map(p=>[p.id,{x:p.body.position.x,y:p.body.position.y,z:p.body.position.z}]));this.p.removeBall();this.lastStage=-1;}
 finishNow(){if(this.active)this.step(2);}
 step(dt){if(this.returnT>=0)this.returnT+=dt;if(!this.active)return;this.t+=dt;const t=this.t*5,lerp=(a,b,v)=>a+(b-a)*Math.max(0,Math.min(1,v)),stage=t<.65?0:t<1.45?1:t<2.25?2:t<3.45?3:t<4.1?4:t<5?5:6;
 if(stage!==this.lastStage){this.lastStage=stage;this.sound(stage===3?'sweep':stage===5?'clack':'motor');}
 this.label='';
 this.sweepY=t<.65?lerp(1.1,.14,t/.65):t<5?.14:lerp(.14,1.1,(t-5)/.7);
 this.sweepZ=t<2.25?-17.65:t<3.45?lerp(-17.65,-20.2,(t-2.25)/1.2):t<4.1?lerp(-20.2,-17.65,(t-3.45)/.65):-17.65;
 this.table=t<.65?1.65:t<1.45?lerp(1.65,.45,(t-.65)/.8):t<2.25?lerp(.45,1.65,(t-1.45)/.8):t<4.1?1.65:t<5?lerp(1.65,.45,(t-4.1)/.9):lerp(.45,1.65,(t-5)/.7);
 if(this.fresh&&t<4.1)this.table=1.65;
 if(t>=2.25&&t<3.45)for(const p of (this.fresh?this.p.pins.filter(p=>!p.removed):this.down)){const a=this.starts.get(p.id);p.body.position.z=Math.min(a.z,this.sweepZ-.2);p.body.position.y=a.y-(Math.max(0,DECK_END-p.body.position.z)*1.3);}
 if(!this.fresh&&t>=1.45){for(const p of this.up){const a=this.starts.get(p.id);p.body.quaternion.set(0,0,0,1);p.body.position.set(a.x,(PIN_COM+.004)+(t<5?Math.max(0,this.table-.45):0),a.z);p.body.velocity.setZero();p.body.angularVelocity.setZero();}}
 if(t>=3.45&&!this.loaded){if(this.fresh)this.p.rack();else for(const p of this.down){this.p.world.removeBody(p.body);p.removed=true;}this.loaded=true;}
 if(this.fresh&&this.loaded){for(const p of this.p.pins){p.body.position.y=(PIN_COM+.004)+(t<5?Math.max(0,this.table-.45):0);p.body.sleep();}}
 if(t>=5.7){this.active=false;this.returnT=0;this.table=1.65;this.sweepY=1.1;for(const p of this.p.pins.filter(p=>!p.removed)){p.body.sleep();}this.onDone();}}
}

