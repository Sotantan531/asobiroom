// Coordinates use +Z north and +X east. The camera and chart use this same basis.
const gardenSize=43, gate={x:21.5,z:41.15},spawn={x:15.5,z:2.5};
const grid=Array.from({length:gardenSize},(_,z)=>Array.from({length:gardenSize},(_,x)=>x===0||x===gardenSize-1||z===0||z===gardenSize-1?'S':'.'));
function bed(x,z,w,d,m='H'){for(let j=z;j<z+d;j++)for(let i=x;i<x+w;i++)grid[j][i]=m}
// The western alleys zigzag, while the eastern terraces fan out into long paths.
const outerBeds=[
  [2,3,7,1],[8,4,1,3],[4,6,2,4],[2,12,5,2],[6,14,1,3],
  [1,19,5,1],[3,20,1,4],[7,21,3,1],[9,22,1,5],[2,27,5,1],
  [11,2,1,3],[10,7,4,1],[13,8,1,2],[17,3,3,2],[22,2,1,5],
  [24,7,5,1],[26,3,2,2],[18,9,5,1],[22,10,1,3],[25,12,4,1],
  [28,13,1,5],[23,16,3,2],[25,18,1,4],[21,22,5,1],[19,23,1,3],
  [21,27,6,1],[11,24,5,1],[14,25,1,2],[8,29,5,1]
];
for(const b of outerBeds)bed(...b);
for(const b of [[2,16,2,1],[7,10,3,1],[25,5,3,1],[21,19,1,2],[17,27,1,2]])bed(...b,'S');
// Staggered tall screens leave traversable doglegs in the eastern gallery and northern walk.
for(const bounds of [[30,3,1,6],[32,8,4,1],[29,11,5,1],[33,12,1,4],
  [30,16,1,6],[31,20,3,1],[28,23,5,1],[32,24,1,4],[3,31,7,1],
  [9,32,1,3],[13,30,1,3],[14,32,3,1],[22,30,5,1],[26,31,1,3],
  [30,32,5,1]])bed(...bounds,'T');
// Cypress walks and offset screens surround the new northern and eastern galleries.
for(const b of [[35,3,1,5],[38,6,4,1],[36,12,4,1],[39,13,1,5],
 [34,19,4,1],[37,22,1,6],[39,27,3,1],[34,29,1,5],[36,34,4,1],
 [3,35,1,5],[6,37,5,1],[10,38,1,3],[14,35,4,1],[17,36,1,3],
 [25,35,1,4],[28,38,5,1],[32,36,1,2],[35,40,4,1]])bed(...b,'T');
// The open central court is reflected around both axes of the fountain.
bed(17,17,9,9,'.');
for(const x of [17,24])for(const z of [17,24])bed(x,z,2,2);
bed(20,20,3,3,'S');
const free=(x,z)=>grid[Math.floor(z)]?.[Math.floor(x)]==='.';
// Plinths sit beside the paths. Reserve their cells for collision and switch placement.
const decoys=[[13,5,.4],[20,8,-.6],[4,10,.9],[27,10,-1.2],[8,17,1.4],[23,14,-.9],[5,25,.2],[27,25,-.4],[13,28,1.1],[18,28,-1.2]].map(([x,z,heading])=>{
  if(!free(x,z))throw Error('Blocked statue plinth');
  grid[z][x]='D';
  return {x:x+.5,z:z+.5,heading};
});
function nearbyDecoys(cam,angle){
  const sn=Math.sin(angle),cs=Math.cos(angle);
  return decoys.filter(s=>{
    const dx=s.x-cam[0],dz=s.z-cam[2];
    return dx*dx+dz*dz<125 && dx*sn+dz*cs>-.95;
  });
}
const mat={stone:0,hedge:1,path:2,bark:3,leaf:4,iron:5,light:6,statue:7,dark:8,eye:9,moss:10,bronze:11};
let dest=[],seed=98172;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
function tri(a,b,c,m){let u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n)||1;for(let p of [a,b,c])dest.push(...p,...n.map(k=>k/l),m)}
function quad(a,b,c,d,m){tri(a,b,c,m);tri(a,c,d,m)}
function box(x,y,z,w,h,d,m){let X=x+w,Y=y+h,Z=z+d;quad([x,y,z],[x,Y,z],[X,Y,z],[X,y,z],m);quad([X,y,Z],[X,Y,Z],[x,Y,Z],[x,y,Z],m);quad([x,y,Z],[x,Y,Z],[x,Y,z],[x,y,z],m);quad([X,y,z],[X,Y,z],[X,Y,Z],[X,y,Z],m);quad([x,Y,z],[x,Y,Z],[X,Y,Z],[X,Y,z],m)}
function tube(a,b,r,R,m,k=7){let axis=b.map((v,i)=>v-a[i]),l=Math.hypot(...axis);if(!l)return;axis=axis.map(v=>v/l);let u=Math.abs(axis[1])>.97?[1,0,0]:[axis[2],0,-axis[0]];l=Math.hypot(...u);u=u.map(v=>v/l);let v=[axis[1]*u[2]-axis[2]*u[1],axis[2]*u[0]-axis[0]*u[2],axis[0]*u[1]-axis[1]*u[0]];function at(c,rad,i){let t=2*Math.PI*i/k;return c.map((q,j)=>q+rad*(u[j]*Math.cos(t)+v[j]*Math.sin(t)))}for(let i=0;i<k;i++){quad(at(a,r,i),at(a,r,i+1),at(b,R,i+1),at(b,R,i),m);tri(b,at(b,R,i),at(b,R,i+1),m)}}
function oval(x,y,z,w,h,d,m,k=12,rows=8){function at(i,j){let a=i*2*Math.PI/k,b=Math.PI*j/rows;return [x+w*Math.sin(b)*Math.cos(a),y+h*Math.cos(b),z+d*Math.sin(b)*Math.sin(a)]}for(let j=0;j<rows;j++)for(let i=0;i<k;i++)quad(at(i,j),at(i+1,j),at(i+1,j+1),at(i,j+1),m)}
function tree(x,z,height){tube([x,0,z],[x+.07,height*.7,z],.19,.075,3);function branch(a,t,len,h,r,n){let b=[a[0]+Math.cos(t)*len,a[1]+h,a[2]+Math.sin(t)*len];tube(a,b,r,r*.48,3,5);if(n){for(let s of [-1,1])branch(b,t+s*(.3+rnd()),len*.62,h*(.4+rnd()*.35),r*.5,n-1)}}for(let i=0;i<6;i++)branch([x,height*(.36+i*.055),z],i*2.4,.65+rnd(),.4+rnd()*.4,.08,2)}
function lamp(x,z){box(x-.13,0,z-.13,.26,.14,.26,0);tube([x,.12,z],[x,1.5,z],.048,.027,5);box(x-.15,1.46,z-.15,.3,.07,.3,5);box(x-.105,1.53,z-.105,.21,.26,.21,6);for(let a of [-.11,.11])for(let b of [-.11,.11])box(x+a,1.52,z+b,.024,.29,.024,5);tube([x,1.8,z],[x,1.95,z],.21,.012,5,4)}
const lamps=[[20.2,40.4],[22.8,40.4],[14.4,5.5],[16.6,5.5],[8.5,10.5],[22.5,10.5],[6.5,18.6],[24.5,18.6],[17.3,33.7],[19.7,33.7],[32.5,6.5],[5.5,33.5]];
function bench(x,z){
for(let dx of [-.45,.45]){box(x+dx,.01,z-.13,.07,.32,.3,5);box(x+dx,.28,z+.12,.04,.36,.05,5)}
for(let k=0;k<3;k++)box(x-.55,.32,z-.17+k*.12,1.1,.045,.09,3);
for(let y of [.49,.60])box(x-.55,y,z+.14,1.1,.075,.045,3)}
function fountain(){let x=21.5,z=21.5;tube([x,1.17,z],[x,1.31,z],.98,1.05,0,24);tube([x,1.3,z],[x,1.34,z],.91,.91,5,24);tube([x,1.3,z],[x,1.85,z],.26,.13,0,16);tube([x,1.84,z],[x,2,z],.14,.53,0,24);tube([x,2,z],[x,2.29,z],.11,.05,0,12);oval(x,2.33,z,.09,.09,.09,0)}
// Turned limestone urns stand on the corners of the formal court.
function urn(x,z){
 const profile=[[0,.25],[.09,.25],[.12,.16],[.26,.11],[.32,.16],[.42,.25],[.52,.28],[.58,.25],[.60,.29],[.64,.29]];
 for(let i=1;i<profile.length;i++){const [a,r]=profile[i-1],[b,R]=profile[i];tube([x,a,z],[x,b,z],r,R,0,14)}
 tube([x,.64,z],[x,.646,z],.24,.24,8,16);
 for(let j=0;j<9;j++){
   const t=j*2.4,dx=Math.cos(t),dz=Math.sin(t),tip=[x+.2*dx,.79+rnd()*.17,z+.2*dz];
   tube([x,.64,z],tip,.009,.003,3,4);
   oval(tip[0],tip[1],tip[2],.045,.075,.035,1,5,3);
 }
}
function gardenDetails(){
 for(const x of [16.85,26.15])for(const z of [16.85,26.15])urn(x,z);
 for(const [x,z] of [[11,3],[22,4],[8,15],[31,20],[36,12],[14,35],[3,36],[21,30]]){
   if(free(x,z))continue;
   for(let j=0;j<4;j++){
    let prev=[x+.12+j*.18,1.24,z-.038];
    for(let k=0;k<7;k++){const pt=[prev[0]+(rnd()-.5)*.105,prev[1]-.115,prev[2]-.002];
     tube(prev,pt,.009,.006,3,4);
     const sign=k%2?1:-1;
     quad(pt,[pt[0]+sign*.042,pt[1]+.024,pt[2]-.018],[pt[0]+sign*.094,pt[1]-.018,pt[2]-.026],[pt[0]+sign*.045,pt[1]-.045,pt[2]-.018],1);
     prev=pt;
    }
   }
 }
 for(let i=0;i<2500;i++){
   const x=1+rnd()*(gardenSize-2),z=1+rnd()*(gardenSize-2);
   if(!free(x,z)||[[-1,0],[1,0],[0,-1],[0,1]].every(([a,b])=>free(x+a,z+b)))continue;
   const t=rnd()*6.28,u=Math.cos(t)*.055,v=Math.sin(t)*.055;
   quad([x-u,.008,z-v],[x-v*.38,.02,z+u*.38],[x+u,.009,z+v],[x+v*.38,.012,z-u*.38],3);
 }
}
function grounds(){dest=[];seed=912;quad([0,0,0],[0,0,gardenSize],[gardenSize,0,gardenSize],[gardenSize,0,0],2);for(let z=0;z<gardenSize;z++)for(let x=0;x<gardenSize;x++){let m=grid[z][x];if(m==='D'){box(x+.13,0,z+.13,.74,.09,.74,0);continue}if(m==='.')continue;let border=x===0||z===0||x===gardenSize-1||z===gardenSize-1;if(border){if(z===gardenSize-1&&x===Math.floor(gate.x))continue;box(x,0,z,1,1.85,1,0);box(x-.02,1.84,z-.02,1.04,.09,1.04,0);if((x+z)%3===0)tree(x+.5,z+.5,3.6+rnd()*1.4)}else if(m==='H'||m==='T'){const extra=m==='T'?.8:0;box(x,0,z,1,.26,1,0);box(x+.012,.23,z+.012,.976,1.22+extra,.976,1);for(let i=0;i<4;i++)oval(x+.18+rnd()*.65,1.41+extra,z+.18+rnd()*.65,.28,.12+rnd()*.13,.25,1,6,3);if((x+z)%7===0)tree(x+.5,z+.5,3+rnd())}else{box(x,0,z,1,1.15,1,0);box(x-.03,1.15,z-.03,1.06,.09,1.06,0)}}for(let l of lamps)lamp(...l);for(let q of [[14,7],[19.5,23.5],[23.5,23.5],[19.5,19.5],[23.5,19.5],[7.2,22],[22.5,25.5]])bench(...q);fountain();gardenDetails();
for(let x of [gate.x-.8,gate.x+.8]){box(x-.16,0,41.5,.32,2.1,.42,0);oval(x,2.22,41.72,.17,.17,.17,0)}for(let i=0;i<13;i++){let x=20.88+i*.105,h=1.65+.18*Math.cos((x-gate.x)*2.8);tube([x,0,41.68],[x,h,41.68],.018,.018,5,5);tube([x,h,41.68],[x,h+.1,41.68],.045,0,5,4)}for(let y of [.25,1.32])box(20.88,y,41.66,1.27,.05,.05,5);return dest}
function effigy(pose=0,parts=false,expression=0){dest=[];let s=7;
// Pleated shroud with an uneven, eroded hem.
let rings=[[.04,.36,.25],[.33,.33,.22],[.87,.21,.16],[1.19,.24,.17],[1.44,.34,.19],[1.53,.17,.15]];
function fold(i,j){let t=i*Math.PI/30,[y,w,d]=rings[j],k=1+.083*Math.cos(t*13+j*.28);return [w*Math.cos(t)*k,y+.018*Math.sin(t*5+j),d*Math.sin(t)*k]}
for(let j=0;j<rings.length-1;j++)for(let i=0;i<60;i++)quad(fold(i,j),fold(i+1,j),fold(i+1,j+1),fold(i,j+1),s);
for(let side of [-1,1]){
const A=[side*.28,1.42,0];
let B=[side*.30,1.08,-.12],C=[side*.095,side<0?1.32:1.42,-.23];
if(pose===1){B=[side*.48,1.55,-.05];C=[side*.19,1.82,-.18]}
if(pose===2){B=[side*.56,1.26,-.21];C=[side*.44,1.39,-.57]}
if(pose===3){B=[side*.41,side<0?1.69:1.05,-.11];C=[side*.27,side<0?1.98:.91,-.24]}
tube(A,B,.142,.115,s,12);tube(B,C,.113,.055,s,12);oval(C[0],C[1]+.04,C[2],.062,.09,.038,s);
for(let i=0;i<5;i++){let x=C[0]+(i-2)*.024;tube([x,C[1]+.07,C[2]-.01],[x-side*.024,C[1]+.17-Math.abs(i-2)*.019,C[2]-.04],.015,.008,s)}
}
// Cross-body mantle: gravity pulls the cloth into layered, sloping folds.
for(let j=0;j<6;j++){
  let prev=null;
  for(let i=0;i<=20;i++){
    const u=i/20,x=(u-.5)*.53,y=.91+j*.064+.24*u+.09*u*u;
    const point=[x,y,-.11-.115*Math.sin(Math.PI*u)];
    if(prev)tube(prev,point,.014+.006*Math.sin(Math.PI*u),.014,s,6);
    prev=point;
  }
}
const bodyEnd=dest.length;
oval(0,1.56,.006,.092,.146,.088,s);
// A continuous open-front veil drapes over the crown and down onto the shoulders.
const veilRows=[[1.27,.34,.22,.07],[1.44,.27,.20,.04],[1.63,.218,.178,.02],
 [1.82,.209,.178,0],[1.94,.178,.152,-.02],[2.00,.113,.106,-.026],[2.025,.02,.035,-.018]];
function veilPoint(row,i){
 const [y,w,d,z]=veilRows[row],t=(i/44-.5)*(row>3?5.2:4.15);
 const fold=1+.045*Math.cos(t*11+row*.28);
 return [w*Math.sin(t)*fold,y+.013*Math.cos(t*7)*(1-row/7),z+d*Math.cos(t)*fold];
}
for(let j=0;j<veilRows.length-1;j++)for(let i=0;i<44;i++){
 quad(veilPoint(j,i),veilPoint(j,i+1),veilPoint(j+1,i+1),veilPoint(j+1,i),s);
}
const faceRings=[[1.545,.03,.044,-.075],[1.588,.078,.078,-.069],[1.66,.132,.10,-.059],[1.74,.163,.123,-.045],[1.82,.167,.13,-.042],[1.90,.15,.129,-.037],[1.954,.10,.089,-.025],[1.975,.025,.035,-.025]];
function skin(j,i){const [y,w,d,z]=faceRings[j],t=i*Math.PI/20;return [w*Math.sin(t),y,z-d*Math.cos(t)]}
for(let j=0;j<faceRings.length-1;j++)for(let i=0;i<40;i++)quad(skin(j,i),skin(j+1,i),skin(j+1,i+1),skin(j,i+1),s);
// Carved locks frame the face beneath the veil.
for(let side of [-1,1])for(let k=0;k<6;k++){
 let prev=null;
 for(let i=0;i<=14;i++){
   const t=i/14,angle=t*1.9+.04*k;
   const q=[side*(.028+.13*Math.sin(angle)+.007*Math.sin(t*15+k)),1.948-.20*t*t-k*.009,-.145+.082*t*t-.014*Math.sin(t*8+k*.3)];
   if(prev)tube(prev,q,.011,.011,s,6);prev=q;
 }
}
const eyeOpen=[.013,.010,.027,.020][expression],browSlope=[.008,-.016,.025,-.025][expression];
for(const side of [-1,1]){
 const x=side*.067;
 oval(x,1.782,-.157,.045,eyeOpen,.011,8,14,6);
 tube([side*.024,1.796+browSlope,-.17],[side*.113,1.799,-.141],.014,.009,s,8);
 tube([side*.032,1.769,-.168],[side*.103,1.771,-.146],.007,.006,s,6);
 for(let i=0;i<2;i++)tube([x+i*.008,1.766,-.158],[x+side*.012+i*.006,1.731-i*.014,-.157],.0028,.0016,8,5);
}
tube([0,1.807,-.162],[0,1.718,-.197],.013,.022,s,10);
oval(0,1.718,-.189,.031,.016,.025,s,12,7);
const smile=[0,.035,-.015,-.013][expression],open=[.003,.008,.032,.011][expression];
for(let i=0;i<20;i++){
 const lip=(j,upper)=>{let u=j/10-1,taper=1-u*u;
 return [u*.055,1.654+smile*u*u+(upper?open:-open)*taper,-.156+.013*u*u]};
 const a=lip(i,true),b=lip(i+1,true),c=lip(i+1,false),d=lip(i,false);
 quad(a,b,c,d,8);tube(a,b,.004,.004,s,6);tube(d,c,.005,.005,s,6);
}
return parts?{body:new Float32Array(dest.slice(0,bodyEnd)),head:new Float32Array(dest.slice(bodyEnd))}:dest}
function pillar(on){dest=[];box(-.20,0,-.20,.4,.12,.4,0);box(-.15,.12,-.15,.3,.72,.3,0);box(-.20,.82,-.20,.4,.08,.4,11);tube([0,.91,0],[0,1.06,0],.093,.07,on?9:6,10);return dest}
const geom={ground:new Float32Array(grounds()),statue:new Float32Array(effigy()),off:new Float32Array(pillar(false)),on:new Float32Array(pillar(true))};
for(let pose=0;pose<4;pose++){
  const model=effigy(pose,true,pose);
  geom['pose'+pose]=model.body;
  geom['head'+pose]=model.head;
}
dest=[];
box(-.18,.01,-.13,.36,.55,.26,11);
box(-.13,.32,-.14,.26,.16,.29,9);
tube([.11,.55,0],[.11,.87,0],.018,.012,11);
geom.detector=new Float32Array(dest);
// The tallest fingertip fits below the 1.24-unit masonry screens.
const statueScale=.55,statueHeight=2.16*statueScale;
function gardenStatue(mesh){
 const scaled=mesh.slice();
 for(let i=0;i<scaled.length;i+=7)for(let j=0;j<3;j++)scaled[i+j]*=statueScale;
 return scaled;
}
for(let i=0;i<4;i++)for(const part of ['head','pose']){
 const key=part+i;geom['small'+key]=gardenStatue(geom[key]);
}
function drawActors(statues,portrait,draw){
  if(!portrait&&detector.status==='ground')draw('detector',detector.x,0,detector.z,0);
  for(const s of statues){
    if(portrait&&s.expression===undefined){draw('statue',s.x,0,s.z,s.heading);continue}
    draw((portrait?'pose':'smallpose')+s.pose,s.x,0,s.z,s.heading);
    draw((portrait?'head':'smallhead')+s.expression,s.x,0,s.z,s.face);
  }
}
geom.decoy=gardenStatue(geom.statue);
for(let i=6;i<geom.decoy.length;i+=7)geom.decoy[i]=geom.decoy[i]===7?12:8;
function trapPlate(warning){
  dest=[];
  box(-.48,.006,-.48,.96,.023,.96,5);
  for(const x of [-.32,0,.32])for(const z of [-.32,0,.32])
    box(x-.085,.03,z-.085,.17,.012,.17,8);
  for(const z of [-.44,.415])box(-.44,.033,z,.88,.013,.025,warning?13:11);
  for(const x of [-.44,.415])box(x,.033,-.44,.025,.013,.88,warning?13:11);
  return new Float32Array(dest);
}
geom.plate=trapPlate(false);geom.warningPlate=trapPlate(true);dest=[];
for(const x of [-.32,0,.32])for(const z of [-.32,0,.32])
  tube([x,.035,z],[x,.82,z],.078,.002,7,7);
geom.needles=new Float32Array(dest);
function paintTraps(camera,time,draw){
  for(const plate of plates){
    if(Math.hypot(plate.x-camera[0],plate.z-camera[2])>12)continue;
    const phase=trapPhase(plate,time);
    draw(phase.warning||phase.dangerous?'warningPlate':'plate',plate.x,0,plate.z);
    if(phase.height>0)draw('needles',plate.x,(phase.height-1)*.79,plate.z);
  }
}
const vert=`attribute vec3 pos,norm;attribute float material;uniform vec3 cam,origin;uniform vec2 dir,rot;uniform float aspect,tilt;varying vec3 world,normal,local;varying float m,depth;void main(){local=pos;world=vec3(pos.x*rot.y+pos.z*rot.x,pos.y,-pos.x*rot.x+pos.z*rot.y)+origin;normal=vec3(norm.x*rot.y+norm.z*rot.x,norm.y,-norm.x*rot.x+norm.z*rot.y);vec3 d=world-cam;float side=d.x*dir.y-d.z*dir.x;float front=dot(d.xz,dir);float up=d.y*cos(tilt)-front*sin(tilt);float z=front*cos(tilt)+d.y*sin(tilt);gl_Position=vec4(side*1.48/aspect,up*1.48,z*1.0016-.064,z);depth=length(d);m=material;}`;
const frag=`precision highp float;varying vec3 world,normal,local;varying float m,depth;uniform vec3 cam;uniform vec2 dir;uniform float portrait,fogDistance;float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+1.),f.x),f.y),f.z);}void main(){vec3 n=normalize(normal);vec3 q=m>6.5?local:world;float broad=noise(q*3.),mid=noise(q*13.),grain=hash(floor(q*240.));vec3 col=vec3(.45,.45,.38);float detail=.67+.34*broad+.28*mid+.19*grain;if(m<.5){vec2 uv=abs(n.y)>.6?world.xz:vec2(abs(n.x)>.5?world.z:world.x,world.y);uv.y*=4.;uv.x=uv.x*1.8+mod(floor(uv.y),2.)*.5;vec2 seams=min(fract(uv),1.-fract(uv));detail*=.46+.54*smoothstep(.01,.07,min(seams.x,seams.y));col=mix(col,vec3(.19,.25,.13),smoothstep(.50,.74,broad+mid*.15));}else if(m<1.5){col=mix(vec3(.07,.13,.065),vec3(.30,.38,.17),mid);detail*=.46+.75*noise(q*34.);}else if(m<2.5){vec2 uv=q.xz*vec2(2.1,2.8);uv.x+=mod(floor(uv.y),2.)*.5;uv+=.08*mid;vec2 edge=min(fract(uv),1.-fract(uv));detail*=.39+.61*smoothstep(.01,.12,min(edge.x,edge.y));col=mix(vec3(.31,.32,.28),vec3(.46,.43,.32),broad);}else if(m<3.5){col=vec3(.25,.21,.16);detail*=.6+.5*noise(q*vec3(35.,2.,35.));}else if(m<5.5)col=vec3(.15,.18,.16);else if(m<6.5)col=vec3(1.,.72,.36);else if(m<7.5){col=mix(vec3(.37,.39,.34),vec3(.77,.75,.64),broad);float fissure=abs(noise(q*16.+noise(q*47.)*.3)-.5);detail*=.64+.36*smoothstep(.002,.045,fissure);}else if(m<8.5)col=vec3(.065,.06,.054);else if(m<9.5)col=vec3(.67,.82,.65);else if(m>12.5)col=vec3(.99,.16,.04);else if(m>11.5)col=mix(vec3(.055,.061,.065),vec3(.16,.17,.17),broad);else col=vec3(.42,.36,.23);
vec3 toCam=normalize(cam-world);float beam=smoothstep(.62,.98,dot(normalize(world.xz-cam.xz+.0001),dir));float torch=(.20+.79*beam)/(1.+depth*depth*.10);float fill=.15+.20*max(0.,dot(n,normalize(vec3(-.6,1.,-.45))));float key=portrait>.5?.54*max(0.,dot(n,normalize(vec3(-.7,.8,-1.)))):0.;vec3 light=vec3(.73,.81,.77)*fill+vec3(.96,.88,.70)*torch*(.43+.57*max(0.,dot(n,toCam)))+key;float lamplight=0.;lamplight+=1./(1.+6.*dot(world.xz-vec2(14.4,5.5),world.xz-vec2(14.4,5.5)));lamplight+=1./(1.+6.*dot(world.xz-vec2(16.6,5.5),world.xz-vec2(16.6,5.5)));lamplight+=1./(1.+6.*dot(world.xz-vec2(20.2,40.4),world.xz-vec2(20.2,40.4)));lamplight+=1./(1.+6.*dot(world.xz-vec2(22.8,40.4),world.xz-vec2(22.8,40.4)));lamplight+=1./(1.+6.*dot(world.xz-vec2(32.5,6.5),world.xz-vec2(32.5,6.5)));lamplight+=1./(1.+6.*dot(world.xz-vec2(5.5,33.5),world.xz-vec2(5.5,33.5)));light+=vec3(.39,.24,.095)*lamplight;float fog=exp(-pow(depth/(portrait>.5?12.:fogDistance),2.));if(m>5.5&&m<6.5||m>8.5&&m<9.5)light=vec3(1.25);if(m>12.5)light=vec3(1.3);gl_FragColor=vec4(mix(vec3(.021,.033,.033),col*detail*light,fog),1.);}`;
function renderer(canvas){let gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'high-performance'});if(!gl)return softwareRenderer(canvas);function shader(type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}let program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vert));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);let uniforms={};for(let key of ['cam','dir','rot','origin','aspect','tilt','portrait','fogDistance'])uniforms[key]=gl.getUniformLocation(program,key);let attr=['pos','norm','material'].map(k=>gl.getAttribLocation(program,k));for(let a of attr)gl.enableVertexAttribArray(a);let buffers={};for(let [key,data] of Object.entries(geom)){let b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);buffers[key]=b}gl.enable(gl.DEPTH_TEST);
return function(camera,angle,tilt,statues,switches,portrait=false,time=0){let ratio=Math.min(1.25,1150/canvas.clientWidth,940/canvas.clientHeight),w=Math.max(1,Math.round(canvas.clientWidth*ratio)),h=Math.max(1,Math.round(canvas.clientHeight*ratio));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);gl.clearColor(.021,.033,.033,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform3fv(uniforms.cam,camera);gl.uniform2f(uniforms.dir,Math.sin(angle),Math.cos(angle));gl.uniform1f(uniforms.aspect,w/h);gl.uniform1f(uniforms.tilt,tilt);gl.uniform1f(uniforms.fogDistance,levels[prefs.level].fog);gl.uniform1f(uniforms.portrait,portrait?1:0);function draw(k,x,y,z,a=0){gl.bindBuffer(gl.ARRAY_BUFFER,buffers[k]);attr.forEach((l,i)=>gl.vertexAttribPointer(l,i===2?1:3,gl.FLOAT,false,28,i*12));gl.uniform2f(uniforms.rot,Math.sin(a),Math.cos(a));gl.uniform3f(uniforms.origin,x,y,z);gl.drawArrays(gl.TRIANGLES,0,geom[k].length/7)}draw('ground',0,0,0);if(!portrait)paintTraps(camera,time,draw);for(let s of switches)draw(s.on?'on':'off',s.x,0,s.z);if(!portrait)for(const s of nearbyDecoys(camera,angle))draw('decoy',s.x,.09,s.z,s.heading);drawActors(statues,portrait,draw)}}
// Tile-binned software projection for browsers that disable GPU contexts.
let groundBatches=null;
function softwareRenderer(canvas){
const ctx=canvas.getContext('2d'),palette=[[110,115,95],[45,67,35],[95,96,79],[69,59,44],[],[45,50,44],[255,190,112],[171,171,150],[21,21,20],[180,209,171],[],[103,86,61],[34,36,37],[244,48,17]];
if(!groundBatches){let bins=new Map(),v=geom.ground;for(let i=0;i<v.length;i+=21){let key=i<6*7?-1:Math.floor(v[i]/4)+16*Math.floor(v[i+2]/4);if(!bins.has(key))bins.set(key,[]);for(let j=0;j<21;j++)bins.get(key).push(v[i+j])}groundBatches=[...bins].map(([key,v])=>({key,v:new Float32Array(v)}))}
let frame,depth;return function(cam,yaw,tilt,statues,switches,poster=false,time=0){
let scale=Math.min(1,(poster?860:480)/canvas.clientWidth,(poster?850:400)/canvas.clientHeight),W=Math.max(1,Math.round(canvas.clientWidth*scale)),H=Math.max(1,Math.round(canvas.clientHeight*scale));if(!frame||W!==canvas.width||H!==canvas.height){canvas.width=W;canvas.height=H;frame=ctx.createImageData(W,H);depth=new Float32Array(W*H)}
let pix=new Uint32Array(frame.data.buffer),sn=Math.sin(yaw),cs=Math.cos(yaw),ct=Math.cos(tilt),st=Math.sin(tilt),focus=H*.74;pix.fill(0xff0a0906);depth.fill(0);
function mesh(v,ox,oz,rot,oy=0){let sr=Math.sin(rot),cr=Math.cos(rot);for(let i=0;i<v.length;i+=21){let poly=[],m=v[i+6],nx=v[i+3]*cr+v[i+5]*sr,ny=v[i+4],nz=v[i+5]*cr-v[i+3]*sr;
for(let j=i;j<i+21;j+=7){let X=v[j]*cr+v[j+2]*sr+ox,Y=v[j+1]+oy,Z=v[j+2]*cr-v[j]*sr+oz,dx=X-cam[0],dy=Y-cam[1],dz=Z-cam[2],f=dx*sn+dz*cs;poly.push([dx*cs-dz*sn,dy*ct-f*st,f*ct+dy*st,X,Y,Z])}
if(poly.every(a=>a[2]<.04)||poly.every(a=>a[2]>16))continue;
if(poly.some(a=>a[2]<.04)){let cut=[];for(let j=0;j<3;j++){let a=poly[j],b=poly[(j+1)%3];if(a[2]>=.04)cut.push(a);if((a[2]>=.04)!==(b[2]>=.04)){let t=(.04-a[2])/(b[2]-a[2]);cut.push(a.map((n,k)=>n+(b[k]-n)*t))}}poly=cut}
let proj=poly.map(a=>[W/2+focus*a[0]/a[2],H/2-focus*a[1]/a[2],1/a[2],a[3]/a[2],a[4]/a[2],a[5]/a[2]]),base=palette[m],ambient=.23+.19*Math.max(0,ny*.82-nx*.45-nz*.35),front=.48+.52*Math.max(0,-nx*sn-nz*cs),key=poster?.46*Math.max(0,ny*.46-nx*.45-nz*.7):0;
for(let j=1;j<proj.length-1;j++){let [a,b,c]=[proj[0],proj[j],proj[j+1]],x0=Math.max(0,Math.ceil(Math.min(a[0],b[0],c[0]))),x1=Math.min(W-1,Math.floor(Math.max(a[0],b[0],c[0]))),y0=Math.max(0,Math.ceil(Math.min(a[1],b[1],c[1]))),y1=Math.min(H-1,Math.floor(Math.max(a[1],b[1],c[1])));if(x0>x1||y0>y1)continue;let det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(det)<.001)continue;let ax=(b[1]-c[1])/det,ay=(c[0]-b[0])/det,bx=(c[1]-a[1])/det,by=(a[0]-c[0])/det;
for(let y=y0;y<=y1;y++){let u=ax*(x0-c[0])+ay*(y-c[1]),v=bx*(x0-c[0])+by*(y-c[1]);for(let x=x0;x<=x1;x++,u+=ax,v+=bx){let w=1-u-v;if(u<0||v<0||w<0)continue;let iz=u*a[2]+v*b[2]+w*c[2],idx=y*W+x;if(iz<=depth[idx])continue;depth[idx]=iz;let z=1/iz,X=(u*a[3]+v*b[3]+w*c[3])*z,Y=(u*a[4]+v*b[4]+w*c[4])*z,Z=(u*a[5]+v*b[5]+w*c[5])*z,grain=(Math.imul(Math.floor(X*132),73856093)^Math.imul(Math.floor(Y*132),19349663)^Math.imul(Math.floor(Z*132),83492791))>>>0;let tex=.8+.32*(grain%101)/100;
if(m===0||m===2){let row=Math.floor((m===2?Z:Y)*3.2),tile=(m===2?X:Math.abs(nx)>.5?Z:X)*2+(row&1)*.5;if(tile-Math.floor(tile)<.056||((m===2?Z:Y)*3.2-row)<.09)tex*=.55}
let fog=Math.exp(-Math.pow(z/(poster?12:levels[prefs.level].fog),2)),light=m===6||m===9||m===13?1.3:ambient+key+front/(1+.13*z*z);let L=light*tex*fog;let r=Math.min(255,6*(1-fog)+base[0]*L),g=Math.min(255,9*(1-fog)+base[1]*L),bval=Math.min(255,10*(1-fog)+base[2]*L);pix[idx]=0xff000000|((bval|0)<<16)|((g|0)<<8)|(r|0)}}}}
}
for(let {key,v} of groundBatches){if(key!==-1){let dx=(key%16)*4+2-cam[0],dz=Math.floor(key/16)*4+2-cam[2];if(dx*dx+dz*dz>185||dx*sn+dz*cs< -4)continue}mesh(v,0,0,0)}if(!poster)paintTraps(cam,time,(k,x,y,z)=>mesh(geom[k],x,z,0,y));for(let s of switches)mesh(geom[s.on?'on':'off'],s.x,s.z,0);if(!poster)for(const s of nearbyDecoys(cam,yaw))mesh(geom.decoy,s.x,s.z,s.heading);drawActors(statues,poster,(k,x,y,z,h)=>mesh(geom[k],x,z,h,y));ctx.putImageData(frame,0,0)}}
