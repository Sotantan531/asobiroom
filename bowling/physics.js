import * as C from './cannon-es.js';
export const PIN_Z=-18.25, HALF=.535, BALL_R=.108;
export const PIN_PROFILE=[[.027,0],[.030,.025],[.044,.07],[.058,.125],[.060,.16],[.050,.20],[.031,.24],[.023,.28],[.033,.32],[.032,.355],[.017,.378],[0,.383]];
export function oilGrip(z,x=0){const distance=-z;const transition=Math.max(0,Math.min(1,(distance-10.8)/4));const edge=Math.min(.16,Math.abs(x)*.24);return Math.min(1,.035+transition*transition*(3-2*transition)+edge*transition);}
export class LanePhysics{
 constructor(onImpact=()=>{}){this.world=new C.World({gravity:new C.Vec3(0,-9.81,0),allowSleep:true});this.world.solver.iterations=14;this.world.broadphase=new C.SAPBroadphase(this.world);this.onImpact=onImpact;
  const floor=new C.Material('wood'),pin=new C.Material('pin'),ball=new C.Material('ball');this.pinMaterial=pin;this.ballMaterial=ball;
  this.world.addContactMaterial(new C.ContactMaterial(floor,pin,{friction:.24,restitution:.08}));this.world.addContactMaterial(new C.ContactMaterial(floor,ball,{friction:0,restitution:.02}));this.world.addContactMaterial(new C.ContactMaterial(pin,pin,{friction:.12,restitution:.35}));this.world.addContactMaterial(new C.ContactMaterial(ball,pin,{friction:.13,restitution:.52}));
  const box=(size,pos)=>{const b=new C.Body({mass:0,material:floor,shape:new C.Box(new C.Vec3(...size))});b.position.set(...pos);this.world.addBody(b);};
  box([HALF,.10,11],[0,-.10,-9]);for(const side of [-1,1]){box([.18,.10,11],[side*.715,-.24,-9]);box([.04,.25,11],[side*.92,.05,-9]);}box([1.0,.6,.1],[0,.45,-20]);
  this.pins=[];this.ball=null;this.active=false;this.elapsed=0;this.hitTime=null;this.trail=[];this.rack();
 }
 rack(){for(const p of this.pins)this.world.removeBody(p.body);this.pins=[];let id=1;for(let row=0;row<4;row++)for(let col=0;col<=row;col++){
  const x=(col-row/2)*.305,z=PIN_Z-row*.264;
  const body=new C.Body({mass:1.55,material:this.pinMaterial,linearDamping:.12,angularDamping:.15,sleepSpeedLimit:.06,sleepTimeLimit:.6});
  // Several short convex rings approximate the pin's belly, narrow neck, and head.
  const sections=[[.030,.030,.035,.018],[.052,.030,.09,.077],[.059,.052,.07,.155],[.027,.059,.09,.235],[.025,.027,.045,.302],[.032,.025,.045,.347]];
  for(const [top,bottom,h,y] of sections)body.addShape(new C.Cylinder(top,bottom,h,10),new C.Vec3(0,y-.16,0));
  body.position.set(x,.164,z);body.addEventListener('collide',e=>{const v=Math.abs(e.contact.getImpactVelocityAlongNormal());if(v>.4)this.onImpact(v);});this.world.addBody(body);this.pins.push({id:id++,body,home:{x,z},removed:false});
  }for(let i=0;i<90;i++)this.world.step(1/180);for(const p of this.pins)p.body.sleep();this.removeBall();
 }
 removeBall(){if(this.ball)this.world.removeBody(this.ball);this.ball=null;this.active=false;this.trail=[];}
 throw({x=0,angle=0,spin=0,speed=7,bumpers=false}){if(this.active)return false;this.removeBall();const b=new C.Body({mass:6.4,material:this.ballMaterial,shape:new C.Sphere(BALL_R),linearDamping:0,angularDamping:.01});b.position.set(x,BALL_R+.006,.12);b.velocity.set(Math.sin(angle)*speed,0,-Math.cos(angle)*speed);b.angularVelocity.set(-speed/BALL_R,0,spin*22);this.world.addBody(b);this.ball=b;this.active=true;this.elapsed=0;this.spin=spin;this.bumpers=bumpers;this.gutter=false;this.hitTime=null;return true;}
 step(dt){if(!this.active)return;this.elapsed+=dt;const b=this.ball;
  if(b.position.z>PIN_Z+.8&&!this.gutter){const grip=oilGrip(b.position.z,b.position.x);b.velocity.x+=this.spin*1.95*grip*dt;b.velocity.z+=Math.min(-b.velocity.z,grip*.35*dt);this.spin*=Math.exp(-grip*.22*dt);b.angularVelocity.set(b.velocity.z/BALL_R,0,-b.velocity.x/BALL_R+this.spin*10);
   if(Math.abs(b.position.x)>HALF+.025){if(this.bumpers){b.position.x=Math.sign(b.position.x)*(HALF-.03);b.velocity.x*=-.55;}else this.gutter=true;}
  }
  if(this.gutter){b.velocity.x*=Math.exp(-12*dt);b.position.x=Math.sign(b.position.x||1)*.72;}
  this.world.step(dt);
  if(this.gutter&&b.position.z<PIN_Z+.8)b.collisionFilterMask=0;
  if(b.position.z<PIN_Z+.6&&this.hitTime===null)this.hitTime=this.elapsed;
  if(this.trail.length<800)this.trail.push({x:b.position.x,z:b.position.z});
  if(this.elapsed>12||(this.hitTime!==null&&this.elapsed-this.hitTime>3.2)){this.active=false;return true;}return false;
 }
 knocked(){return this.pins.filter(p=>!p.removed&&(p.body.quaternion.vmult(new C.Vec3(0,1,0)).y<.72||Math.abs(p.body.position.x)>.78||p.body.position.z<-19.55||p.body.position.z>PIN_Z+.65||p.body.position.y<.10));}
 sweep(){const down=this.knocked();for(const p of down){this.world.removeBody(p.body);p.removed=true;}for(const p of this.pins.filter(p=>!p.removed)){p.body.velocity.setZero();p.body.angularVelocity.setZero();p.body.sleep();}this.removeBall();return down.length;}
}
