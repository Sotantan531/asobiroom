/* True 3D triangle meshes, shared by the GPU and depth-buffered CPU renderer. */
export function createManorRenderer(canvas){
const PI=Math.PI;let gl=null;try{gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});}catch{}
const VS=`attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;attribute float aE;uniform mat4 uPV;uniform mat4 uModel;varying vec3 vP;varying vec3 vN;varying vec3 vC;varying float vE;void main(){vec4 world=uModel*vec4(aP,1.);vP=world.xyz;vN=normalize(mat3(uModel)*aN);vC=aC;vE=aE;gl_Position=uPV*world;}`;
const FS=`precision mediump float;varying vec3 vP,vN,vC;varying float vE;uniform vec3 uEye;uniform vec3 uForward;uniform float uFlash,uTime,uGhost;void main(){vec3 n=normalize(vN);vec3 toEye=uEye-vP;float dst=length(toEye);float warm=.0;float lampX=(floor(abs(vP.x)/5.0+.5))*5.0;float lx=abs(abs(vP.x)-lampX);float ly=abs(vP.y-2.55);float lz=min(abs(vP.z-1.58),abs(vP.z-3.42));float ld=sqrt(lx*lx+ly*ly+lz*lz);warm=1.05/(1.0+ld*ld*.37)*(1.0+.12*sin(uTime*4.0+lampX));float central=0.38/(1.0+length(vP-vec3(0.,3.1,-6.7))*0.38);float ambient=.072+warm*.25+central*.12;vec3 base=vC*(ambient+max(dot(n,normalize(vec3(.4,.82,.27))),0.)*(warm*.55+central*.7));vec3 towards=normalize(vP-uEye);float cone=pow(max(dot(towards,normalize(uForward)),0.),10.);float flashAtt=1.0/(1.0+dst*dst*.008);float lit=uFlash*2.8*cone*flashAtt*max(dot(n,normalize(toEye)),0.22);vec3 col=base+vC*lit+vec3(.93,.65,.32)*vC*(warm*.06)+vC*vE;float fogStrength=.038+(1.0-uFlash)*.034;float fog=exp(-dst*dst*fogStrength*fogStrength);vec3 fogColor=vec3(.008,.009,.012);col=mix(fogColor,col,clamp(fog,.0,1.));if(uGhost>0.5){col=mix(fogColor,col,clamp(fog+.20,0.,1.));}col*=.94+.06*sin(dot(vP,vec3(283.1,321.7,199.3)));col=col/(col+vec3(.72));col=pow(clamp(col,0.,1.),vec3(.90));gl_FragColor=vec4(col,1.);}`;
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
let program;const loc={};if(gl){try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,VS));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program))}catch(e){console.error(e);throw e;}
gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
Object.assign(loc,{P:gl.getAttribLocation(program,'aP'),N:gl.getAttribLocation(program,'aN'),C:gl.getAttribLocation(program,'aC'),E:gl.getAttribLocation(program,'aE'),PV:gl.getUniformLocation(program,'uPV'),Model:gl.getUniformLocation(program,'uModel'),Eye:gl.getUniformLocation(program,'uEye'),Forward:gl.getUniformLocation(program,'uForward'),Flash:gl.getUniformLocation(program,'uFlash'),Time:gl.getUniformLocation(program,'uTime'),Ghost:gl.getUniformLocation(program,'uGhost')});}
function color(hex){if(Array.isArray(hex))return hex;const h=hex.replace('#','');return [parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255]}
class Mesh{constructor(){this.v=[];this.buffer=null;this.count=0}triangle(a,b,c,col,emit=0){const v=this.v,n=[(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]),(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]),(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])];const ll=Math.hypot(...n)||1;let co=color(col);for(const p of [a,b,c])v.push(...p,n[0]/ll,n[1]/ll,n[2]/ll,...co,emit)}quad(a,b,c,d,col,e=0){this.triangle(a,b,c,col,e);this.triangle(a,c,d,col,e)}box(x,y,z,w,h,d,col,e=0){const x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-d/2,z1=z+d/2;this.quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],col,e);this.quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],col,e);this.quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],col,e);this.quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],col,e);this.quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],col,e);this.quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],col,e)}cylinder(x,y,z,r,h,col,segments=9,e=0){for(let i=0;i<segments;i++){const a=i/segments*2*PI,b=(i+1)/segments*2*PI,p=t=>[x+Math.cos(t)*r,y,z+Math.sin(t)*r],q=t=>[x+Math.cos(t)*r,y+h,z+Math.sin(t)*r];this.quad(p(a),p(b),q(b),q(a),col,e);this.triangle([x,y+h,z],q(a),q(b),col,e);this.triangle([x,y,z],p(b),p(a),col,e)}}sphere(x,y,z,rx,ry,rz,col,e=0){const seg=12,steps=8;for(let i=0;i<steps;i++){let a=i/steps*PI,b=(i+1)/steps*PI;for(let j=0;j<seg;j++){let c=j*2*PI/seg,d=(j+1)*2*PI/seg;const p=(v,u)=>[x+Math.sin(v)*Math.cos(u)*rx,y+Math.cos(v)*ry,z+Math.sin(v)*Math.sin(u)*rz];const start=this.v.length;this.quad(p(a,c),p(b,c),p(b,d),p(a,d),col,e);for(let k=start;k<this.v.length;k+=10){const n=[(this.v[k]-x)/(rx*rx),(this.v[k+1]-y)/(ry*ry),(this.v[k+2]-z)/(rz*rz)],l=Math.hypot(...n)||1;this.v[k+3]=n[0]/l;this.v[k+4]=n[1]/l;this.v[k+5]=n[2]/l;}}}}build(){this.count=this.v.length/10;this.data=new Float32Array(this.v);if(!gl){this.v=[];return;}this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,this.data,gl.STATIC_DRAW);}draw(){gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);for(let [id,size,offset] of [[loc.P,3,0],[loc.N,3,3],[loc.C,3,6],[loc.E,1,9]]){gl.enableVertexAttribArray(id);gl.vertexAttribPointer(id,size,gl.FLOAT,false,40,offset*4)}gl.drawArrays(gl.TRIANGLES,0,this.count)}}
const main=new Mesh(),door=new Mesh(),ghost=new Mesh();
// A sealed T-junction: 1.9m side corridors, a low 2.55m ceiling, no open background.
const wood='#30272e',wall='#34313e',trim='#524654';
main.box(0,-.1,2.5,49,.2,1.95,'#242029');main.box(0,2.67,2.5,49,.24,2.13,'#15131b');
main.box(0,-.1,.35,2.5,.2,4.45,'#28212b');main.box(0,2.67,.35,2.65,.24,4.45,'#15131b');
for(const side of [-1,1]){
 main.box(side*1.30,1.3,-.05,.20,2.6,3.2,wall);
 main.box(side*24.3,1.3,2.5,.25,2.6,2.1,wall);
 for(const z of [1.47,3.53]){const sign=z<2.5?1:-1,start=side<0?-12.8:12.8;
 main.box(start,1.3,z,23.0,2.6,.18,wall);main.box(start,.62,z+sign*.11,23,.12,.10,trim);main.box(start,2.4,z+sign*.10,23,.11,.12,trim);
 for(let d=2;d<24;d+=1.25){main.box(side*d,1.15,z+sign*.10,.075,2.25,.08,trim);}
 for(const d of [4,9,14,21]){main.box(side*d,1.95,z+sign*.15,.15,.33,.14,'#4b3e45');main.box(side*d,1.95,z+sign*.23,.065,.16,.05,'#ad917c',.45);}
 }
 for(let d=1.5;d<24;d+=.48){main.box(side*d,.015,2.5,.455,.025,1.9,'#3c2c32');main.box(side*d,.035,2.5,.012,.01,1.9,'#17141a');}
 // Four distance landmarks: covered trunk, crowded bookcase, broken chair, junction pillar.
 main.box(side*16,.42,3.22,1.3,.83,.42,wood);main.box(side*16,.88,3.18,1.42,.08,.52,'#62535c');
 main.box(side*10,.95,1.76,.90,1.9,.46,'#211c29');for(let y=.28;y<1.9;y+=.38){main.box(side*10,y,1.99,.83,.055,.45,trim);for(let n=0;n<6;n++)main.box(side*(9.68+n*.12),y+.14,1.99,.07,.24,.14,n%2?'#56474f':'#3d3e46');}
 main.box(side*5,.45,3.12,.60,.09,.60,wood);main.box(side*5,.95,3.36,.60,1.05,.075,trim);for(const dx of [-.23,.23])for(const dz of [-.23,.23])main.box(side*5+dx,.22,3.12+dz,.06,.44,.06,wood);
 main.box(side*1.70,1.3,3.36,.24,2.6,.31,'#25202d');
 for(const d of [6.8,12.8,19.5]){main.box(side*d,1.28,1.57,1.02,2.35,.09,'#16121c');main.box(side*d,1.26,1.64,.84,2.18,.06,wood);main.sphere(side*d+.24,1.15,1.72,.035,.035,.035,'#867471');}
}
for(let z=-1.5;z<1.5;z+=.45){main.box(0,.02,z,2.5,.04,.43,'#392b32');}
for(const x of [-1.11,1.11])main.box(x,1.3,-1.82,.38,2.6,.20,wall);main.box(0,2.49,-1.82,1.85,.22,.20,wall);
// Real exterior geometry beyond the doorway.
main.box(0,-.12,-11,18,.2,20,'#303b35',.18);main.box(0,-.005,-8,1.8,.06,13,'#62616a',.2);for(const x of [-1.16,1.16]){main.box(x,.22,-2.3,.22,.44,1.5,trim);for(let z=-4;z>-17;z-=2.7){main.cylinder(x*3,.9,z,.10,1.8,'#211e2a',8);main.sphere(x*3,2.2,z,.8,1.5,.8,'#202d29');}}main.sphere(-3,8,-22,1.1,1.1,1.1,'#b5bed5',.8);
for(const x of [-.93,.93])main.box(x,1.16,-1.51,.14,2.35,.22,trim);main.box(0,2.30,-1.51,2.0,.15,.22,trim);
// A solid door, with its hinge as the local origin.
door.box(.82,1.10,0,1.63,2.18,.13,wood);for(const y of [.53,1.57]){door.box(.82,y,.09,1.37,.86,.08,'#55404a');door.box(.82,y,.14,1.17,.65,.035,'#2b2230');}
door.box(1.42,1.05,.16,.16,.27,.12,'#958993');door.cylinder(1.42,1.20,.18,.055,.11,'#b4a5b4',10);
// THE HOLLOW: a hollow-eyed, dislocated figure. No image planes or face sprites.
const skin='#8f8a88',bone='#b3aa94',shadow='#111019';
ghost.sphere(0,2.26,-.02,.29,.35,.24,skin);ghost.sphere(-.035,2.04,.05,.255,.23,.20,'#68606a');
ghost.sphere(0,2.00,.208,.165,.225,.075,'#08060c');
ghost.sphere(0,1.80,.11,.22,.12,.17,'#7c7380');ghost.sphere(0,1.845,.231,.15,.05,.035,'#28202d');
for(const side of [-1,1]){
 ghost.sphere(side*.142,2.28,.204,.091,.069,.066,'#171019');ghost.sphere(side*.146,2.288,.252,.059,.044,.031,'#020207');
 ghost.sphere(side*.158,2.292,.280,.008,.009,.004,'#b8beb3',.5);
 ghost.sphere(side*.20,2.08,.13,.083,.18,.10,'#69646c');
 ghost.sphere(side*.13,2.39,.19,.105,.021,.064,'#655d68');
 ghost.sphere(side*.30,1.66,-.02,.25,.14,.15,skin);
 ghost.sphere(side*.40,1.27,.05,.074,.43,.071,'#7c7280');
 ghost.sphere(side*.49,.84,.13,.071,.19,.073,skin);
 ghost.sphere(side*.49,.63,.19,.085,.13,.055,'#9b9099');
 for(let finger=0;finger<4;finger++){let x=side*(.438+finger*.035);ghost.sphere(x,.43-finger*.023,.23,.017,.18,.025,'#a49b9e');ghost.sphere(x,.26-finger*.023,.255,.013,.055,.018,'#4d4551');}
 ghost.sphere(side*.15,.72,0,.079,.50,.095,'#24202a');ghost.sphere(side*.17,.19,.03,.065,.26,.067,'#34303d');ghost.sphere(side*.17,.04,.12,.079,.045,.17,'#19171f');
}
ghost.sphere(0,1.65,-.025,.065,.24,.064,'#78717a');ghost.sphere(0,1.30,-.06,.22,.40,.15,'#201d28');
for(let rib=0;rib<6;rib++)for(let side of [-1,1])ghost.sphere(side*.11,1.55-rib*.073,.06,.14,.025,.08,'#544c5d');
ghost.sphere(0,2.17,.265,.037,.091,.045,'#a09a91');ghost.sphere(0,2.105,.285,.048,.026,.020,'#25202b');
for(let j=-4;j<=4;j++){const y=2.115-Math.abs(j)*.010;ghost.sphere(j*.029,y,.267,.011,.027+(j%2?0:.01),.013,bone);ghost.sphere(j*.029,1.862+Math.abs(j)*.008,.271,.010,.023,.012,'#9f988b');}
// Uneven black hair and creases follow the skull surface in 3D.
for(let i=0;i<19;i++){let a=i*2*PI/19,x=Math.cos(a)*.265,z=Math.sin(a)*.22;ghost.sphere(x,2.48,z,.044,.11,.05,'#111019');if(i%3!==0)ghost.sphere(x*1.03,2.26,z*.94,.027,.26+(i%3)*.06,.03,'#17121d');}
for(let i=0;i<12;i++){let x=(i%2?1:-1)*(.08+(i%5)*.035);ghost.sphere(x,2.41-(i%4)*.12,.225,.004,.052,.004,'#38313f');}
for(const m of [main,door,ghost])m.build();
function identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}function matrixMultiply(a,b){const out=new Float32Array(16);for(let j=0;j<4;j++)for(let i=0;i<4;i++){out[i+j*4]=a[i+0]*b[j*4+0]+a[i+4]*b[j*4+1]+a[i+8]*b[j*4+2]+a[i+12]*b[j*4+3]}return out}
function translate(x,y,z){const m=identity();m[12]=x;m[13]=y;m[14]=z;return m}function rotateY(a){const m=identity(),s=Math.sin(a),c=Math.cos(a);m[0]=c;m[8]=s;m[2]=-s;m[10]=c;return m}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),o=new Float32Array(16);o[0]=f/aspect;o[5]=f;o[10]=(far+near)/(near-far);o[11]=-1;o[14]=2*far*near/(near-far);return o}
function lookAt(eye,target){let f=[target[0]-eye[0],target[1]-eye[1],target[2]-eye[2]],fl=Math.hypot(...f);f=f.map(v=>v/fl);let s=[-f[2],0,f[0]];let up=[-f[0]*f[1],f[0]*f[0]+f[2]*f[2],-f[2]*f[1]];return new Float32Array([s[0],up[0],-f[0],0,s[1],up[1],-f[1],0,s[2],up[2],-f[2],0,-(s[0]*eye[0]+s[1]*eye[1]+s[2]*eye[2]),-(up[0]*eye[0]+up[1]*eye[1]+up[2]*eye[2]),f[0]*eye[0]+f[1]*eye[1]+f[2]*eye[2],1])}

function multiplyPoint(m,p){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
// Normalize all view axes; screen projection and lighting share the same camera.
function view(eye,forward){const f=forward.map(x=>x/Math.hypot(...forward)),len=Math.hypot(f[0],f[2]),s=[-f[2]/len,0,f[0]/len],u=[-s[2]*f[1],s[2]*f[0]-s[0]*f[2],s[0]*f[1]];return {f,s,u};}
let ctx=gl?null:canvas.getContext('2d',{alpha:false}),image=null,zbuffer=null;let frames=0;
function cpuScene(objects,eye,forward,flash,time,scare){
 const W=canvas.width,H=canvas.height,V=view(eye,forward),focus=H/(2*Math.tan(73*Math.PI/360));
 if(!image||image.width!==W||image.height!==H){image=ctx.createImageData(W,H);zbuffer=new Float32Array(W*H);}
 const pixels=new Uint32Array(image.data.buffer);pixels.fill(0xff050403);zbuffer.fill(0);
 for(const {mesh,model} of objects){const d=mesh.data;for(let i=0;i<d.length;i+=30){let poly=[];for(let j=0;j<30;j+=10){const p=multiplyPoint(model,[d[i+j],d[i+j+1],d[i+j+2]]),a=p.map((x,k)=>x-eye[k]);poly.push([a.reduce((s,x,k)=>s+x*V.s[k],0),a.reduce((s,x,k)=>s+x*V.u[k],0),a.reduce((s,x,k)=>s+x*V.f[k],0)]);}
 if(poly.every(p=>p[2]<.09)||poly.every(p=>p[2]>55))continue;
 if(poly.some(p=>p[2]<.09)){let cut=[];for(let j=0;j<3;j++){const a=poly[j],b=poly[(j+1)%3];if(a[2]>=.09)cut.push(a);if((a[2]>=.09)!==(b[2]>=.09)){const t=(.09-a[2])/(b[2]-a[2]);cut.push(a.map((x,k)=>x+(b[k]-x)*t));}}poly=cut;}
 if(poly.length<3)continue;const dst=Math.max(.1,poly.reduce((s,p)=>s+p[2],0)/poly.length),normal=multiplyPoint(model,[d[i+3],d[i+4],d[i+5]]).map((x,k)=>x-model[12+k]);
 const front=Math.max(.18,-normal.reduce((s,x,k)=>s+x*V.f[k],0)),ambient=scare?.32:.22,light=ambient+Math.max(0,normal[1])*.10+flash*1.25*front/(1+dst*dst*.014)+d[i+9],fog=Math.exp(-dst*dst*.0022);
 const c=[6,5,9].map((v,k)=>{const linear=d[i+6+k]*light,tone=Math.pow(linear/(linear+.72),.90);return Math.min(255,Math.round(v*(1-fog)+255*tone*fog));}),packed=0xff000000|(c[2]<<16)|(c[1]<<8)|c[0];
 const pts=poly.map(p=>[W/2+focus*p[0]/p[2],H/2-focus*p[1]/p[2],1/p[2]]);
 for(let t=1;t<pts.length-1;t++){const [a,b,c]=[pts[0],pts[t],pts[t+1]],x0=Math.max(0,Math.ceil(Math.min(a[0],b[0],c[0]))),x1=Math.min(W-1,Math.floor(Math.max(a[0],b[0],c[0]))),y0=Math.max(0,Math.ceil(Math.min(a[1],b[1],c[1]))),y1=Math.min(H-1,Math.floor(Math.max(a[1],b[1],c[1])));if(x0>x1||y0>y1)continue;const det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(det)<.0001)continue;const ax=(b[1]-c[1])/det,ay=(c[0]-b[0])/det,bx=(c[1]-a[1])/det,by=(a[0]-c[0])/det;
 for(let y=y0;y<=y1;y++){let u=ax*(x0-c[0])+ay*(y-c[1]),v=bx*(x0-c[0])+by*(y-c[1]);for(let x=x0;x<=x1;x++,u+=ax,v+=bx){const w=1-u-v;if(u<0||v<0||w<0)continue;const iz=u*a[2]+v*b[2]+w*c[2],k=y*W+x;if(iz>zbuffer[k]){zbuffer[k]=iz;pixels[k]=packed;}}}}
 }}ctx.putImageData(image,0,0);
}
let cpuLast=-1000,cpuKey='';function render(opts){const {time=0,yaw=0,reveal=null,menu=false,scare=0,escape=0,motion=1}=opts;
 const rect=canvas.getBoundingClientRect(),ratio=gl?Math.min(devicePixelRatio||1,1.5):Math.min(1,(menu?800:480)/Math.max(1,rect.width),(menu?550:360)/Math.max(1,rect.height));
 const w=Math.max(1,Math.round(rect.width*ratio)),h=Math.max(1,Math.round(rect.height*ratio));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 let eye=[0,1.68,2.5],forward=[Math.sin(yaw),-.018,-Math.cos(yaw)],objects=[{mesh:main,model:identity()},{mesh:door,model:matrixMultiply(translate(-.82,0,-1.49),rotateY(Math.min(1,escape/.30)*1.9))}],flash=reveal?2.6:0;
 if(escape>0){const walk=Math.max(0,Math.min(1,(escape-.28)/.72));const ease=walk*walk*(3-2*walk);eye=[0,1.68+Math.sin(walk*32)*.035*motion,2.5-ease*9];forward=[0,-.018,-1];flash=.3;}
 if(menu){eye=[0,1.86,2.9];forward=[0,.01,-1];objects.push({mesh:ghost,model:matrixMultiply(translate(.70,-.10,1.1),rotateY(-.10))});flash=.95;}
 if(reveal){objects.push({mesh:ghost,model:matrixMultiply(translate(reveal.side*reveal.distance,0,2.5),rotateY((reveal.side===-1?PI/2:-PI/2)+(reveal.turn||0)))});}
 if(scare>0){const age=scare-.0001,rush=.64+.94*Math.exp(-age*10),shake=Math.exp(-age*5)*.03*motion;eye=[Math.sin(age*70)*shake,2.16+Math.cos(age*83)*shake,2.5];forward=[0,-.025,-1];objects=[{mesh:ghost,model:translate(0,0,2.5-rush-.15)}];flash=2.4;}
 if(!gl){const key=[w,h,Math.round(yaw*50),menu,Math.round(scare*12),Math.round(escape*30),reveal?reveal.side+':'+Math.round(reveal.distance*10)+':'+Math.round((reveal.turn||0)*10):''].join('|');if(key===cpuKey)return;if(time-cpuLast<1/24&&!scare&&!reveal)return;cpuKey=key;cpuLast=time;cpuScene(objects,eye,forward,flash,time,scare>0);frames++;return;}
 gl.viewport(0,0,w,h);gl.clearColor(.008,.009,.014,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const pv=matrixMultiply(perspective(73*PI/180,w/h,.08,95),lookAt(eye,eye.map((x,k)=>x+forward[k])));
 gl.uniformMatrix4fv(loc.PV,false,pv);gl.uniform3fv(loc.Eye,eye);gl.uniform3fv(loc.Forward,forward);gl.uniform1f(loc.Flash,flash);gl.uniform1f(loc.Time,time);
 for(const o of objects){gl.uniformMatrix4fv(loc.Model,false,o.model);gl.uniform1f(loc.Ghost,o.mesh===ghost?1:0);o.mesh.draw();}frames++;
}
return {render,gpu:!!gl,counts:{room:main.count,door:door.count,monster:ghost.count},dispose(){if(gl)for(const m of [main,door,ghost])gl.deleteBuffer(m.buffer);}};
}

