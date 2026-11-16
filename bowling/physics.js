import * as C from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';
export const BALLS={10:{mass:4.536,speed:1.10,color:'#29bda6',dark:'#075c62',label:'10ポンド · 軽量'},13:{mass:5.897,speed:1,color:'#538ce8',dark:'#233a91',label:'13ポンド · 標準'},15:{mass:6.804,speed:.91,color:'#d568ce',dark:'#662774',label:'15ポンド · 重量'}};
export const OILS={house:{length:11.6,transition:3.5,label:'ハウス · 38 ft'},short:{length:9.8,transition:3,label:'ショート · 32 ft'},long:{length:13.4,transition:3.2,label:'ロング · 44 ft'}};
export const PIN_Z=-18.25, HALF=.535, BALL_R=.108;
export const PIN_PROFILE=[[.027,0],[.030,.025],[.044,.07],[.058,.125],[.060,.16],[.050,.20],[.031,.24],[.023,.28],[.033,.32],[.032,.355],[.017,.378],[0,.383]];
export function oilGrip(z,x=0,pattern="house"){const distance=-z,oil=OILS[pattern]||OILS.house;const transition=Math.max(0,Math.min(1,(distance-oil.length+1.2)/oil.transition));const edge=Math.min(.16,Math.abs(x)*.24);return Math.min(1,.035+transition*transition*(3-2*transition)+edge*transition);}
export class LanePhysics{
 constructor(onImpact=()=>{}){this.world=new C.World({gravity:new C.Vec3(0,-9.81,0),allowSleep:true});this.world.solver.iterations=20;this.world.broadphase=new C.SAPBroadphase(this.world);this.onImpact=onImpact;
  const floor=new C.Material('wood'),pin=new C.Material('pin'),ball=new C.Material('ball');this.pinMaterial=pin;this.ballMaterial=ball;
  this.world.addContactMaterial(new C.ContactMaterial(floor,pin,{friction:.24,restitution:.08}));this.world.addContactMaterial(new C.ContactMaterial(floor,ball,{friction:0,restitution:.02}));this.world.addContactMaterial(new C.ContactMaterial(pin,pin,{friction:.12,restitution:.35}));this.world.addContactMaterial(new C.ContactMaterial(ball,pin,{friction:.13,restitution:.52}));
  const box=(size,pos)=>{const b=new C.Body({mass:0,material:floor,shape:new C.Box(new C.Vec3(...size))});b.position.set(...pos);this.world.addBody(b);};
  box([HALF,.10,9.95],[0,-.10,-9.90]);
  // Concave trough from static tangent segments; sphere and pins collide in 3D.
  for(const side of [-1,1]){for(let i=0;i<12;i++){const a=Math.PI+(i+.5)/12*Math.PI,b=new C.Body({mass:0,material:floor,shape:new C.Box(new C.Vec3(.026,.014,10))});b.position.set(side*.715+Math.cos(a)*.18,.005+Math.sin(a)*.18-.013,-9.95);b.quaternion.setFromEuler(0,0,a+Math.PI/2);this.world.addBody(b);}box([.035,.10,10],[side*.94,-.045,-9.95]);}
  box([1,.10,1],[0,-.47,-20.9]);box([1,.5,.10],[0,.05,-21.9]);
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
 throw({x=0,angle=0,spin=0,speed=7,bumpers=false,weight=13,oil='house'}){if(this.active)return false;this.removeBall();const b=new C.Body({mass:(BALLS[weight]||BALLS[13]).mass,material:this.ballMaterial,shape:new C.Sphere(BALL_R),linearDamping:0,angularDamping:.01});b.position.set(x,BALL_R+.006,.12);b.velocity.set(Math.sin(angle)*speed,0,-Math.cos(angle)*speed);b.angularVelocity.set(-speed/BALL_R,0,spin*22);this.world.addBody(b);this.ball=b;this.active=true;this.elapsed=0;this.oil=oil;this.weight=weight;this.spin=spin;this.bumpers=bumpers;this.gutter=false;this.hitTime=null;return true;}
 step(dt){if(!this.active)return;this.elapsed+=dt;const b=this.ball;
  if(b.position.z>PIN_Z+.8&&!this.gutter){const grip=oilGrip(b.position.z,b.position.x,this.oil);b.applyForce(new C.Vec3(this.spin*1.95*grip*b.mass,0,Math.min(Math.max(0,-b.velocity.z)/dt,grip*.35)*b.mass));this.spin*=Math.exp(-grip*.22*dt);b.angularVelocity.set(b.velocity.z/BALL_R,0,-b.velocity.x/BALL_R+this.spin*10);
   if(Math.abs(b.position.x)>HALF+.025){if(this.bumpers){b.position.x=Math.sign(b.position.x)*(HALF-.03);b.velocity.x*=-.55;}else this.gutter=true;}
  }
  if(this.gutter){b.velocity.x*=Math.exp(-3*dt);}
  this.world.step(dt);
  
  if(b.position.z<PIN_Z+.6&&this.hitTime===null)this.hitTime=this.elapsed;
  if(this.trail.length<800)this.trail.push({x:b.position.x,z:b.position.z});
  if(this.elapsed>12||(this.hitTime!==null&&this.elapsed-this.hitTime>3.2)){this.active=false;return true;}return false;
 }
 knocked(){return this.pins.filter(p=>!p.removed&&(p.body.quaternion.vmult(new C.Vec3(0,1,0)).y<.72||Math.abs(p.body.position.x)>.78||p.body.position.z<-19.55||p.body.position.z>PIN_Z+.65||p.body.position.y<.10));}
 sweep(){const down=this.knocked();for(const p of down){this.world.removeBody(p.body);p.removed=true;}for(const p of this.pins.filter(p=>!p.removed)){p.body.velocity.setZero();p.body.angularVelocity.setZero();p.body.sleep();}this.removeBall();return down.length;}
}
