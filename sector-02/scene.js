/* True 3D triangle meshes, shared by the GPU and depth-buffered CPU renderer. */
export function createManorRenderer(canvas){
const PI=Math.PI;let gl=null;try{gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});}catch{}
const VS=`attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;attribute float aE;uniform mat4 uPV;uniform mat4 uModel;varying vec3 vP;varying vec3 vN;varying vec3 vC;varying float vE;void main(){vec4 world=uModel*vec4(aP,1.);vP=world.xyz;vN=normalize(mat3(uModel)*aN);vC=aC;vE=aE;gl_Position=uPV*world;}`;
const FS=`precision mediump float;varying vec3 vP,vN,vC;varying float vE;uniform vec3 uEye;uniform vec3 uForward;uniform float uFlash,uTime,uGhost;void main(){vec3 n=normalize(vN);vec3 toEye=uEye-vP;float dst=length(toEye);float warm=.0;float lampX=(floor(abs(vP.x)/7.0+.5))*7.0;float lx=abs(abs(vP.x)-lampX);float ly=abs(vP.y-2.55);float lz=min(abs(vP.z+1.12),abs(vP.z-5.95));float ld=sqrt(lx*lx+ly*ly+lz*lz);warm=1.05/(1.0+ld*ld*.37)*(1.0+.12*sin(uTime*4.0+lampX));float central=0.38/(1.0+length(vP-vec3(0.,3.1,-6.7))*0.38);float ambient=.072+warm*.25+central*.12;vec3 base=vC*(ambient+max(dot(n,normalize(vec3(.4,.82,.27))),0.)*(warm*.55+central*.7));vec3 towards=normalize(vP-uEye);float cone=pow(max(dot(towards,normalize(uForward)),0.),10.);float flashAtt=1.0/(1.0+dst*dst*.008);float lit=uFlash*2.8*cone*flashAtt*max(dot(n,normalize(toEye)),0.22);vec3 col=base+vC*lit+vec3(.93,.65,.32)*vC*(warm*.06)+vC*vE;float fogStrength=.038+(1.0-uFlash)*.034;float fog=exp(-dst*dst*fogStrength*fogStrength);vec3 fogColor=vec3(.008,.009,.012);col=mix(fogColor,col,clamp(fog,.0,1.));if(uGhost>0.5){col=mix(fogColor,col,clamp(fog+.20,0.,1.));}col*=.94+.06*sin(dot(vP,vec3(283.1,321.7,199.3)));col=col/(col+vec3(.72));col=pow(clamp(col,0.,1.),vec3(.90));gl_FragColor=vec4(col,1.);}`;
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
let program;const loc={};if(gl){try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,VS));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program))}catch(e){console.error(e);throw e;}
gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
Object.assign(loc,{P:gl.getAttribLocation(program,'aP'),N:gl.getAttribLocation(program,'aN'),C:gl.getAttribLocation(program,'aC'),E:gl.getAttribLocation(program,'aE'),PV:gl.getUniformLocation(program,'uPV'),Model:gl.getUniformLocation(program,'uModel'),Eye:gl.getUniformLocation(program,'uEye'),Forward:gl.getUniformLocation(program,'uForward'),Flash:gl.getUniformLocation(program,'uFlash'),Time:gl.getUniformLocation(program,'uTime'),Ghost:gl.getUniformLocation(program,'uGhost')});}
function color(hex){if(Array.isArray(hex))return hex;const h=hex.replace('#','');return [parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255]}
class Mesh{constructor(){this.v=[];this.buffer=null;this.count=0}triangle(a,b,c,col,emit=0){const v=this.v,n=[(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]),(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]),(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])];const ll=Math.hypot(...n)||1;let co=color(col);for(const p of [a,b,c])v.push(...p,n[0]/ll,n[1]/ll,n[2]/ll,...co,emit)}quad(a,b,c,d,col,e=0){this.triangle(a,b,c,col,e);this.triangle(a,c,d,col,e)}box(x,y,z,w,h,d,col,e=0){const x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-d/2,z1=z+d/2;this.quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],col,e);this.quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],col,e);this.quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],col,e);this.quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],col,e);this.quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],col,e);this.quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],col,e)}cylinder(x,y,z,r,h,col,segments=9,e=0){for(let i=0;i<segments;i++){const a=i/segments*2*PI,b=(i+1)/segments*2*PI,p=t=>[x+Math.cos(t)*r,y,z+Math.sin(t)*r],q=t=>[x+Math.cos(t)*r,y+h,z+Math.sin(t)*r];this.quad(p(a),p(b),q(b),q(a),col,e);this.triangle([x,y+h,z],q(a),q(b),col,e);this.triangle([x,y,z],p(b),p(a),col,e)}}sphere(x,y,z,rx,ry,rz,col,e=0){const seg=12,steps=8;for(let i=0;i<steps;i++){let a=i/steps*PI,b=(i+1)/steps*PI;for(let j=0;j<seg;j++){let c=j*2*PI/seg,d=(j+1)*2*PI/seg;const p=(v,u)=>[x+Math.sin(v)*Math.cos(u)*rx,y+Math.cos(v)*ry,z+Math.sin(v)*Math.sin(u)*rz];const start=this.v.length;this.quad(p(a,c),p(b,c),p(b,d),p(a,d),col,e);for(let k=start;k<this.v.length;k+=10){const n=[(this.v[k]-x)/(rx*rx),(this.v[k+1]-y)/(ry*ry),(this.v[k+2]-z)/(rz*rz)],l=Math.hypot(...n)||1;this.v[k+3]=n[0]/l;this.v[k+4]=n[1]/l;this.v[k+5]=n[2]/l;}}}}build(){this.count=this.v.length/10;this.data=new Float32Array(this.v);if(!gl){this.v=[];return;}this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,this.data,gl.STATIC_DRAW);}draw(){gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);for(let [id,size,offset] of [[loc.P,3,0],[loc.N,3,3],[loc.C,3,6],[loc.E,1,9]]){gl.enableVertexAttribArray(id);gl.vertexAttribPointer(id,size,gl.FLOAT,false,40,offset*4)}gl.drawArrays(gl.TRIANGLES,0,this.count)}}
const main=new Mesh(),door=new Mesh(),ghost=new Mesh();
const wall='#393642',timber='#34281d',darkWood='#1b1614',stone='#39342e',metal='#77716b',gold='#95744e';
// Main hall and perpendicular wings are built out of real 3D wall, ceiling, and floor solids.
main.box(0,-.14,-3.1,5.9,.28,20.2,'#2c241e');main.box(0,3.91,-3.1,5.9,.29,20.2,'#171615');main.box(0,1.95,-8.62,5.9,3.9,.3,wall);
for(let side of [-1,1]){main.box(side*2.95,1.93,-4.6,.2,3.87,8.3,wall);main.box(side*2.85,1.35,-4.6,.16,1.8,8.2,'#3e342b');main.box(side*2.84,2.85,-4.6,.18,.16,8.2,'#1d1613');main.box(side*2.84,.72,-4.6,.18,.16,8.2,'#231812');main.box(side*2.84,3.7,-4.6,.24,.2,8.3,'#2d241d');for(let z=-8;z<-1;z+=1.38){main.box(side*2.75,1.6,z,.11,1.48,.08,'#796b56');main.box(side*2.75,2.0,z+.08,.13,.065,1.14,'#594a37');main.box(side*2.75,1.05,z+.08,.13,.065,1.14,'#594a37')}}
main.box(0,-.16,2.5,69,.27,7.8,'#27232e');main.box(0,3.93,2.5,69,.3,7.8,'#171615');
for(let side of [-1,1]){main.box(side*34.5,1.9,2.5,.28,3.8,7.8,wall)}
for(let z of [-1.52,6.52]){const sections=z<0?[[-18.7,31.6],[18.7,31.6]]:[[0,69]];for(const [cx,wide] of sections){main.box(cx,1.94,z,wide,3.86,.23,wall);main.box(cx,1.45,z+(z<0?.13:-.13),wide,2.65,.13,'#554939');main.box(cx,.66,z+(z<0?.18:-.18),wide,.19,.18,'#201b16');main.box(cx,3.52,z+(z<0?.18:-.18),wide,.2,.18,'#211914')}for(let x=-34;x<=34;x+=2.4){if(z<0&&Math.abs(x)<3.2)continue;main.box(x,1.75,z+(z<0?.2:-.2),.14,2.9,.11,'#68513a');main.box(x+1.2,1.65,z+(z<0?.19:-.19),2.3,.13,.11,'#6b5138');main.box(x+1.2,2.65,z+(z<0?.19:-.19),2.3,.11,.11,'#6b5138')}}
for(let i=-30;i<=30;i+=3){main.box(i,3.78,2.5,.2,.25,7.8,'#413326');main.box(i,.08,2.5,.06,.05,7.8,'#4c3c30')}
// Floorboards, patterned runners, and furniture silhouettes.
for(let x=-34;x<34;x+=1.2){main.box(x,.027,2.52,1.12,.025,7.73,(Math.floor((x+34)/1.2)%3===0)?'#453326':'#3e2e23');main.box(x,.04,2.52,.025,.01,7.72,'#180f0c')}
for(let z=-8.3;z<4.3;z+=1.12){main.box(0,.05,z,2.1,.035,1.03,(Math.round(z*3)%2)?'#553b2b':'#482e26');main.box(0,.073,z,.035,.007,.96,'#b2845633')}
for(let x=-33;x<33;x+=2.5){main.box(x,.052,2.5,2.3,.037,2.2,'#543326');main.box(x,.076,2.5,2.28,.005,.04,'#82603b')}
// Wall sconces with real glowing geometry; repeated to establish deep perspective.
for(let side of [-1,1])for(let x of [5,12,19,26,33]){let xx=side*x;for(let wallZ of [-1.39,6.39]){let sign=wallZ<0?1:-1;main.box(xx,2.49,wallZ+sign*.14,.22,.48,.19,'#756044');main.box(xx,2.49,wallZ+sign*.22,.12,.18,.12,'#bd9a61',1.6);main.cylinder(xx,2.39,wallZ+sign*.28,.11,.22,'#dfb871',8,1.5);main.box(xx,2.88,wallZ+sign*.24,.23,.11,.18,'#503a2b');}}
// Frames and abandoned doors, complete with raised molding.
for(let side of [-1,1])for(let x of [8.5,22.4]){let z=-1.35;main.box(side*x,1.59,z,.98,2.77,.08,'#181311');main.box(side*x,1.55,z+.07,.75,2.49,.06,'#3c271b');main.box(side*x,1.57,z+.11,.56,.88,.07,'#59422d');main.box(side*x,2.35,z+.11,.56,.37,.07,'#54412b');main.sphere(side*x+.26,1.4,z+.18,.045,.05,.045,'#cbab74',.25);main.box(side*x,3.04,z,.99,.15,.25,'#6a533d')}
for(let z=-7.8;z<-.4;z+=1.4)for(let side of [-1,1]){main.box(side*2.62,2.18,z,.16,.8,.8,'#3c2e24');main.box(side*2.59,2.1,z,.17,.62,.63,'#695039')}
// Ceiling beams and chandelier hanging over central entrance.
for(let z=-7.8;z<5.9;z+=2.4)main.box(0,3.71,z,5.8,.27,.16,'#35261d');main.cylinder(0,3.04,-4.4,.037,.65,'#7e6951');main.cylinder(0,2.82,-4.4,.5,.07,'#705336',12);for(let j=0;j<7;j++){let a=j*2*PI/7;main.cylinder(Math.cos(a)*.42,2.72,-4.4+Math.sin(a)*.42,.055,.18,'#a57e4b',7,.65)}
// Full depth exit portal: door is a separate animated 3D model.
main.box(0,1.9,-8.42,2.88,3.48,.16,'#7a593b');main.box(0,1.91,-8.29,2.43,3.19,.08,'#1a1511');main.box(0,1.77,-8.65,2.1,3.05,.04,'#766d54',1.7);main.box(0,.15,-8.18,2.8,.27,.28,'#302119');
// The door is authored with its hinge at x=-1.02 and swings inward toward the hall.
door.box(1.03,1.7,0,2.05,3.19,.15,'#3d271b');door.box(1.03,3.1,.12,1.76,.11,.12,'#9a744b');door.box(1.03,.32,.12,1.76,.11,.12,'#8c6949');door.box(.15,1.72,.12,.12,2.9,.13,'#98724d');door.box(1.91,1.72,.12,.12,2.9,.13,'#98724d');for(let y of [.93,2.29]){door.box(1.02,y,.132,1.62,1.12,.09,'#513628');door.box(1.02,y,.186,1.38,.88,.055,'#2b1b15');door.box(1.02,y,.22,1.2,.7,.02,'#4e3021')}door.cylinder(1.7,1.56,.25,.066,.06,'#d6b373',10,1.2);door.box(1.65,1.56,.28,.4,.06,.08,'#ba9860',.75);door.box(1.68,1.38,.22,.27,.42,.14,'#6a6256');door.box(1.68,1.38,.31,.16,.23,.08,'#232125');

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
 const rect=canvas.getBoundingClientRect(),ratio=gl?Math.min(devicePixelRatio||1,1.5):Math.min(1,800/Math.max(1,rect.width),550/Math.max(1,rect.height));
 const w=Math.max(1,Math.round(rect.width*ratio)),h=Math.max(1,Math.round(rect.height*ratio));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 let eye=[0,1.68,2.5],forward=[Math.sin(yaw),-.018,-Math.cos(yaw)],objects=[{mesh:main,model:identity()},{mesh:door,model:matrixMultiply(translate(-1.02,0,-8.17),rotateY(escape*1.9))}],flash=reveal?2.6:0;
 if(menu){eye=[1.05,1.9,3.9];forward=[-.05,.01,-1];objects.push({mesh:ghost,model:matrixMultiply(translate(1.55,-.10,2.0),rotateY(-.10))});flash=.95;}
 if(reveal){objects.push({mesh:ghost,model:matrixMultiply(translate(reveal.side*reveal.distance,0,2.5),rotateY(reveal.side===-1?PI/2:-PI/2))});}
 if(scare>0){const age=scare-.0001,rush=.64+.94*Math.exp(-age*10),shake=Math.exp(-age*5)*.03*motion;eye=[Math.sin(age*70)*shake,2.16+Math.cos(age*83)*shake,2.5];forward=[0,-.025,-1];objects=[{mesh:ghost,model:translate(0,0,2.5-rush-.15)}];flash=2.4;}
 if(!gl){const key=[w,h,Math.round(yaw*1200),menu,Math.round(scare*24),Math.round(escape*30),reveal?reveal.side+':'+Math.round(reveal.distance*10):''].join('|');if(key===cpuKey)return;if(time-cpuLast<1/24&&!scare&&!reveal)return;cpuKey=key;cpuLast=time;cpuScene(objects,eye,forward,flash,time,scare>0);frames++;return;}
 gl.viewport(0,0,w,h);gl.clearColor(.008,.009,.014,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const pv=matrixMultiply(perspective(73*PI/180,w/h,.08,95),lookAt(eye,eye.map((x,k)=>x+forward[k])));
 gl.uniformMatrix4fv(loc.PV,false,pv);gl.uniform3fv(loc.Eye,eye);gl.uniform3fv(loc.Forward,forward);gl.uniform1f(loc.Flash,flash);gl.uniform1f(loc.Time,time);
 for(const o of objects){gl.uniformMatrix4fv(loc.Model,false,o.model);gl.uniform1f(loc.Ghost,o.mesh===ghost?1:0);o.mesh.draw();}frames++;
}
return {render,gpu:!!gl,counts:{room:main.count,door:door.count,monster:ghost.count},dispose(){if(gl)for(const m of [main,door,ghost])gl.deleteBuffer(m.buffer);}};
}
