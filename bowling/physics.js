import * as C from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';
// Metres and kilograms throughout. USBC Equipment Specifications, nominal values.
export const SPEC=Object.freeze({laneWidth:41.5*.0254,headPin:60*.3048,gutterWidth:9.25*.0254,gutterDepth:3.5*.0254,ballDiameter:.218,pinHeight:15*.0254,pinDiameter:4.75*.0254,pinBase:2.25*.0254,pinMass:1.5875733,pinSpacing:12*.0254,pinCOM:5.78125*.0254,lanePitch:1.9});
export const BALLS={10:{mass:4.5359237,speed:1.10,color:'#29bda6',dark:'#075c62',label:'10ポンド · 軽量'},13:{mass:5.89670081,speed:1,color:'#538ce8',dark:'#233a91',label:'13ポンド · 標準'},15:{mass:6.80388555,speed:.96,color:'#d568ce',dark:'#662774',label:'15ポンド · 基準の実質量'}};
export const OILS={house:{length:11.6,transition:3.5,label:'ハウス · 38 ft'},short:{length:9.8,transition:3,label:'ショート · 32 ft'},long:{length:13.4,transition:3.2,label:'ロング · 44 ft'}};
export const PIN_Z=-SPEC.headPin,HALF=SPEC.laneWidth/2,BALL_R=SPEC.ballDiameter/2,PIN_COM=SPEC.pinCOM,ROW_DEPTH=SPEC.pinSpacing*Math.sqrt(3)/2,DECK_END=PIN_Z-3*ROW_DEPTH-.0762;
export const PIN_PROFILE=[[.028575,0],[.034,.0254],[.048,.0635],[.059,.1016],[.060325,.1143],[.058,.1397],[.051,.1778],[.035,.2286],[.023,.2667],[.022,.2921],[.031,.3175],[.033,.3429],[.029,.3651],[.018,.377],[0,.381]];
export function pinSpots(){let id=1;return Array.from({length:4},(_,row)=>Array.from({length:row+1},(_,col)=>({id:id++,x:(col-row/2)*SPEC.pinSpacing,z:PIN_Z-row*ROW_DEPTH}))).flat();}
export function gutterProfile(t){const w=SPEC.gutterWidth,d=SPEC.gutterDepth,r=(w*w/4+d*d)/(2*d),a=Math.asin(w/(2*r))*t;return {x:Math.sin(a)*r,y:r-d-Math.cos(a)*r,angle:a};}
export function oilGrip(z,x=0,pattern='house'){const oil=OILS[pattern]||OILS.house,t=Math.max(0,Math.min(1,(-z-oil.length)/Math.min(2.4,oil.transition)));return Math.min(1,.035+t*t*(3-2*t)+Math.min(.16,Math.abs(x)*.24)*t);}
const STATIC=1,BALL=2,PIN=4;
export class LanePhysics{
 constructor(onImpact=()=>{}){this.world=new C.World({gravity:new C.Vec3(0,-9.81,0),allowSleep:true});this.world.solver.iterations=12;this.world.solver.tolerance=.0001;this.world.broadphase=new C.SAPBroadphase(this.world);this.onImpact=onImpact;this.contactClock=0;this.lastContact=new Map();
 const floor=new C.Material('wood'),pin=new C.Material('pin'),ball=new C.Material('ball');this.pinMaterial=pin;this.ballMaterial=ball;
 for(const [a,b,friction,restitution]of [[floor,pin,.105,.18],[floor,ball,0,.035],[pin,pin,.16,.62],[ball,pin,.10,.58]])this.world.addContactMaterial(new C.ContactMaterial(a,b,{friction,restitution,contactEquationStiffness:2e7,contactEquationRelaxation:3,frictionEquationStiffness:2e7}));
 const box=(size,pos,angle=0)=>{const b=new C.Body({mass:0,material:floor,shape:new C.Box(new C.Vec3(...size)),collisionFilterGroup:STATIC});b.position.set(...pos);b.quaternion.setFromEuler(0,0,angle);this.world.addBody(b);return b;};
 this.staticBodies=[];const add=(...a)=>{const b=box(...a);this.staticBodies.push(b);return b;};
 const length=-DECK_END;add([HALF,.10,length/2],[0,-.10,-length/2]);
 const roundEnd=PIN_Z+.381,roundLength=-roundEnd;
 for(const side of [-1,1]){const cx=side*(HALF+SPEC.gutterWidth/2);for(let i=0;i<12;i++){const p=gutterProfile(-1+(i+.5)/6),a=gutterProfile(-1+i/6),b=gutterProfile(-1+(i+1)/6),half=Math.hypot(b.x-a.x,b.y-a.y)/2+.0006;add([half,.005,roundLength/2],[cx+p.x+Math.sin(p.angle)*.005,p.y-Math.cos(p.angle)*.005,-roundLength/2],p.angle);}
 // At the pin deck the channels are flat-bottomed, with full-depth kickbacks.
 add([SPEC.gutterWidth/2,.007,(roundEnd-DECK_END)/2],[cx,-SPEC.gutterDepth-.007,(roundEnd+DECK_END)/2]);
 add([.025,.25,(-DECK_END+.7)/2],[side*(HALF+SPEC.gutterWidth+.025),.15,(DECK_END-.7)/2]);}
 add([.82,.06,.7],[0,-.45,DECK_END-.7]);add([.82,.55,.08],[0,.05,DECK_END-1.4]);
 this.pinShapes=[new C.Cylinder(SPEC.pinDiameter/2,SPEC.pinBase/2,.17,10),new C.Cylinder(.023,SPEC.pinDiameter/2,.14,8),new C.Sphere(.034)];this.pins=[];this.ball=null;this.active=false;this.elapsed=0;this.hitTime=null;this.trail=[];this.rack();}
 rack(ids=null){for(const p of this.pins)this.world.removeBody(p.body);this.pins=[];this.removeBall();const selected=ids?new Set(ids):null;
 for(const spot of pinSpots()){const body=new C.Body({mass:SPEC.pinMass,material:this.pinMaterial,linearDamping:.025,angularDamping:.025,sleepSpeedLimit:.025,sleepTimeLimit:.85,collisionFilterGroup:PIN});for(let k=0;k<3;k++)body.addShape(this.pinShapes[k],new C.Vec3(0,[.085,.24,.347][k]-PIN_COM,0));
 // Transverse radius of gyration: 13.9 square inches. Low CG and correct inertia,
 // rather than impulses or forced tipping, preserve natural secondary collisions.
 body.inertia.set(SPEC.pinMass*.008967724,SPEC.pinMass*.0011,SPEC.pinMass*.008967724);body.invInertia.set(1/body.inertia.x,1/body.inertia.y,1/body.inertia.z);body.updateInertiaWorld(true);body.position.set(spot.x,PIN_COM+.001,spot.z);
 body.addEventListener('collide',e=>{const v=Math.abs(e.contact.getImpactVelocityAlongNormal()),other=e.body,key=[body.id,other.id].sort((a,b)=>a-b).join(':');if(v>.24&&this.contactClock-(this.lastContact.get(key)??-1)>.045){this.lastContact.set(key,this.contactClock);this.onImpact(v,{kind:other===this.ball?'ball':'pin',pin:spot.id});}if(other===this.ball&&v>1.5){if(this.hitTime===null)this.hitTime=this.elapsed;this.impactStrength=Math.max(this.impactStrength||0,v);}});
 const p={id:spot.id,body,home:{x:spot.x,z:spot.z},removed:!!selected&&!selected.has(spot.id),fallen:false};if(!p.removed)this.world.addBody(body);this.pins.push(p);}
 for(let i=0;i<20;i++)this.world.step(1/120);for(const p of this.pins)if(!p.removed)p.body.sleep();this.lastContact.clear();this.impactStrength=0;this.hitTime=null;this.contactClock=0;}
 removeBall(){if(this.ball)this.world.removeBody(this.ball);this.ball=null;this.active=false;this.trail=[];}
 throw({x=0,angle=0,spin=0,speed=7,bumpers=false,weight=15,oil='house'}){if(this.active)return false;this.removeBall();const b=new C.Body({mass:(BALLS[weight]||BALLS[15]).mass,material:this.ballMaterial,shape:new C.Sphere(BALL_R),linearDamping:0,angularDamping:.015,collisionFilterGroup:BALL});b.position.set(x,BALL_R+.003,.10);b.velocity.set(Math.sin(angle)*speed,0,-Math.cos(angle)*speed);b.angularVelocity.set(-speed/BALL_R,0,spin*22);this.world.addBody(b);this.ball=b;this.active=true;this.elapsed=0;this.oil=oil;this.weight=weight;this.spin=spin;this.bumpers=bumpers;this.gutter=false;this.gutterHeard=false;this.hitTime=null;this.impactStrength=0;return true;}
 step(dt){if(!this.active)return false;this.elapsed+=dt;this.contactClock+=dt;const b=this.ball;
 if(b.position.z>PIN_Z+.55&&!this.gutter){const grip=oilGrip(b.position.z,b.position.x,this.oil);this.force||=new C.Vec3();this.force.set(this.spin*1.70*grip*b.mass,0,Math.min(Math.max(0,-b.velocity.z)/dt,grip*.25)*b.mass);b.applyForce(this.force);this.spin*=Math.exp(-grip*.06*dt);b.angularVelocity.set(b.velocity.z/BALL_R,0,-b.velocity.x/BALL_R+this.spin*10);
 if(this.bumpers&&Math.abs(b.position.x)>HALF-BALL_R){b.position.x=Math.sign(b.position.x)*(HALF-BALL_R-.001);b.velocity.x=-Math.sign(b.position.x)*Math.abs(b.velocity.x)*.55;}
 else if(!this.bumpers&&Math.abs(b.position.x)>HALF+.022){this.gutter=true;this.gutterSide=Math.sign(b.position.x);b.position.x=this.gutterSide*(HALF+SPEC.gutterWidth/2);b.velocity.x=0;b.angularVelocity.z=0;b.collisionFilterMask=STATIC;b.aabbNeedsUpdate=true;}}
 this.world.step(dt);if(this.gutter&&b.position.z>DECK_END){const center=this.gutterSide*(HALF+SPEC.gutterWidth/2),limit=(SPEC.gutterWidth/2-BALL_R)*.65;if(Math.abs(b.position.x-center)>limit){b.position.x=Math.max(center-limit,Math.min(center+limit,b.position.x));b.velocity.x=0;}if(b.position.y<BALL_R-SPEC.gutterDepth){b.position.y=BALL_R-SPEC.gutterDepth;b.velocity.y=Math.max(0,b.velocity.y);}b.aabbNeedsUpdate=true;}const down=this.knocked();if(this.hitTime===null&&b.position.z<PIN_Z-.15)this.hitTime=this.elapsed;if(this.trail.length<900)this.trail.push({x:b.position.x,z:b.position.z});
 const alive=this.pins.filter(p=>!p.removed).length,after=this.hitTime===null?0:this.elapsed-this.hitTime;
 if(this.gutter&&b.position.z<DECK_END-.15){b.sleep();this.active=false;return true;}
 if(this.elapsed>=8.5||after>=2.8||(after>.85&&down.length===alive)){this.active=false;return true;}return false;}
 knocked(){const up=this.upVector||(this.upVector=new C.Vec3(0,1,0)),axis=this.axisVector||(this.axisVector=new C.Vec3());return this.pins.filter(p=>{if(p.removed)return false;p.body.quaternion.vmult(up,axis);if(axis.y<Math.cos(38*Math.PI/180)||Math.abs(p.body.position.x)>HALF+SPEC.gutterWidth||p.body.position.z<DECK_END||p.body.position.y<PIN_COM*.58)p.fallen=true;return p.fallen;});}
 sweep(){const down=this.knocked();for(const p of down){this.world.removeBody(p.body);p.removed=true;}for(const p of this.pins.filter(p=>!p.removed)){p.body.velocity.setZero();p.body.angularVelocity.setZero();p.body.sleep();}this.removeBall();return down.length;}
}
