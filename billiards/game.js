import * as THREE from './vendor/three.module.min.js';
import {BilliardsPhysics,R,TABLE,POCKETS,POCKET_SPEC,COLORS} from './physics.js';
import {MatchRules} from './rules.js';
import {PoolAudio} from './audio.js';

const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rad=deg=>deg*Math.PI/180;
const nameOf=id=>id===0?'白玉':id+'番';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const audio=new PoolAudio();

const ui={
  start:$('startOverlay'),coin:$('coinOverlay'),end:$('endOverlay'),rules:$('rulesOverlay'),
  canvas:$('gameCanvas'),world:$('worldWrap'),mode:$('gameModeBadge'),opponent:$('matchKindBadge'),
  p1:$('p1Chip'),p2:$('p2Chip'),p1Name:$('p1Name'),p2Name:$('p2Name'),
  p1Group:$('p1Group'),p2Group:$('p2Group'),stage:$('stageLabel'),message:$('statusMessage'),
  remaining:$('remainingLabel'),sceneHint:$('sceneHint'),hand:$('ballInHand'),turnTag:$('turnTag'),
  spinPad:$('spinPad'),spinDot:$('spinDot'),spinName:$('spinName'),spinDetail:$('spinDetail'),
  angle:$('aimAngle'),callPanel:$('callPanel'),callBall:$('callBall'),callPocket:$('callPocket'),
  powerTrack:$('powerTrack'),powerFill:$('powerFill'),powerKnob:$('powerKnob'),powerCount:$('powerCount'),
  warning:$('cueWarning'),flash:$('pocketFlash'),flashText:$('pocketText'),
  viewMode:$('viewModeLabel'),viewDetail:$('viewDetailLabel')
};

let selection={mode:'9',opponent:'cpu',difficulty:'normal'};
let physics=null,rules=null,started=false,matchToken=0,cpuThinking=false;
let aim=0,power=0,spin={x:0,y:0},shotBefore=[],shotCall=null,spinDrag=false,powerDrag=false;
let currentCall={ball:null,pocket:0},lastMessageTimer=null,lastPocketTime=0;
let cueVisible=true,coinQueued=false,sceneReady=false;

let renderer,scene,camera,tableGroup,ballsGroup,cueGroup,environmentGroup,overheadFixturesGroup,aimGuide,guideEnd,ballMeshes=new Map();
let cloth,playerShadow,headlamp,raycaster,aimCameraTarget=new THREE.Vector3(),cameraTarget=new THREE.Vector3();
let softwareRenderer=false,softwareContext=null,softwareCanvas=null;
let shotMarkersCanvas=null,shotMarkersContext=null;
const scratchColor='#cce4d5';
const animationClock=new THREE.Clock();
const tmp=new THREE.Vector3();

function makeWoodTexture(){
  const c=document.createElement('canvas');c.width=512;c.height=512;
  const ctx=c.getContext('2d');ctx.fillStyle='#2b1b14';ctx.fillRect(0,0,512,512);
  let seed=1259;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<460;i++){
    const y=random()*512,w=1+random()*3,alpha=.035+random()*.17;
    ctx.strokeStyle='rgba(214,155,92,'+alpha+')';ctx.lineWidth=w;
    ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(130,y-2+random()*5,330,y+random()*4,512,y-3+random()*5);ctx.stroke();
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;
  return t;
}

function ballTexture(id){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext('2d');
  const stripe=id>=9;
  ctx.fillStyle=stripe?'#f6f6e9':COLORS[id];ctx.fillRect(0,0,1024,512);
  if(stripe){ctx.fillStyle=COLORS[id];ctx.fillRect(0,118,1024,274);}
  if(id===0){const g=ctx.createLinearGradient(0,0,512,512);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#e3ede9');ctx.fillStyle=g;ctx.fillRect(0,0,1024,512);}
  if(id!==0){
    for(let x of [256,768]){
      ctx.fillStyle='#fffdf1';ctx.beginPath();ctx.ellipse(x,256,84,74,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#dddcd2';ctx.lineWidth=5;ctx.stroke();
      ctx.fillStyle='#101e22';ctx.font='900 103px Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(id),x,266);
    }
  }
  // Tiny seam highlights make the painted balls read as physical objects.
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;return tex;
}

const pocketDark=new THREE.MeshStandardMaterial({color:0x010908,roughness:.87});
const pocketRim=new THREE.MeshStandardMaterial({color:0xaab7bb,metalness:.72,roughness:.31});
const woodTex=makeWoodTexture();
const railMaterial=new THREE.MeshStandardMaterial({map:woodTex,color:0x79513a,metalness:.06,roughness:.38});
const cushionMaterial=new THREE.MeshStandardMaterial({color:0x095c76,metalness:.05,roughness:.9});
const baizeMaterial=new THREE.MeshStandardMaterial({color:0x1484b2,metalness:0,roughness:.97});
const floorMaterial=new THREE.MeshStandardMaterial({map:woodTex,color:0x2e2824,roughness:.77});
const sphereGeometry=new THREE.SphereGeometry(R,32,24);
const shadowGeometry=new THREE.CircleGeometry(R*1.1,24);
const ballMaterialCache=new Map();

function meshBox(w,h,d,x,y,z,material,parent=tableGroup){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;parent.add(m);return m;
}

// A single plan supplies both the WebGL and Canvas2D tables. Its openings
// follow the reference photographs: diagonal corner jaws and a U-shaped
// throat at each side pocket, rather than six circles on top of the cloth.
function clothOutline(){
  const w=TABLE.halfW,l=TABLE.halfL;
  const c=POCKET_SPEC.cornerReach,s=POCKET_SPEC.sideHalf;
  return [
    [-w+c,-l],[w-c,-l],[w,-l+c],[w,-s],
    [w-.038,-s*.66],[w-.038,s*.66],[w,s],
    [w,l-c],[w-c,l],[-w+c,l],[-w,l-c],
    [-w,s],[-w+.038,s*.66],[-w+.038,-s*.66],[-w,-s],[-w,-l+c]
  ];
}

function pocketOutline(p){
  const w=TABLE.halfW,l=TABLE.halfL;
  const c=POCKET_SPEC.cornerReach,s=POCKET_SPEC.sideHalf;
  const sx=Math.sign(p.x);
  if(p.z===0){
    const points=[[sx*(w-.043),-s*.66],[sx*w,-s],[sx*(w+.065),-s*1.09]];
    for(let i=0;i<=12;i++){
      const a=-Math.PI/2+i*Math.PI/12;
      points.push([sx*(w+.065+.12*Math.cos(a)),s*1.09*Math.sin(a)]);
    }
    return [...points,[sx*w,s],[sx*(w-.043),s*.66]];
  }
  const sz=Math.sign(p.z);
  return [
    [sx*(w-c),sz*l],[sx*(w-c*.65),sz*(l+.045)],
    [sx*(w-c*.28),sz*(l+.095)],[sx*(w+.035),sz*(l+.14)],
    [sx*(w+.105),sz*(l+.13)],[sx*(w+.135),sz*(l+.085)],
    [sx*(w+.14),sz*(l+.025)],[sx*(w+.095),sz*(l-c*.28)],
    [sx*(w+.045),sz*(l-c*.65)],[sx*w,sz*(l-c)]
  ];
}

function pocketMetalLip(p){
  const w=TABLE.halfW,l=TABLE.halfL;
  const c=POCKET_SPEC.cornerReach,s=POCKET_SPEC.sideHalf;
  const sx=Math.sign(p.x);
  if(p.z===0){
    return Array.from({length:19},(_,i)=>{
      const a=-Math.PI/2+i*Math.PI/18;
      return [sx*(w+.069+.115*Math.cos(a)),s*1.03*Math.sin(a)];
    });
  }
  const sz=Math.sign(p.z);
  return [
    [sx*(w-c*.96),sz*(l+.026)],
    [sx*(w-c*.53),sz*(l+.095)],
    [sx*(w+.015),sz*(l+.147)],
    [sx*(w+.095),sz*(l+.139)],
    [sx*(w+.142),sz*(l+.09)],
    [sx*(w+.147),sz*(l+.015)],
    [sx*(w+.095),sz*(l-c*.53)],
    [sx*(w+.026),sz*(l-c*.96)]
  ];
}

function flatPatch(points,y,material){
  const shape=new THREE.Shape();
  points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));
  shape.closePath();
  const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),material);
  mesh.rotation.x=-Math.PI/2;mesh.position.y=y;tableGroup.add(mesh);
  return mesh;
}
function initScene(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x0a211e);
  scene.fog=new THREE.FogExp2(0x0a211e,.035);
  camera=new THREE.PerspectiveCamera(54,1,.022,60);
  camera.position.set(0,1.25,3.55);camera.lookAt(0,.0,0);
  try{
    renderer=new THREE.WebGLRenderer({canvas:ui.canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.38;
    renderer.shadowMap.enabled=false;
  }catch(error){
    // Sandboxed browsers may disable WebGL entirely. Keep the game playable
    // using a projected software perspective instead of showing a blank table.
    console.warn('WebGL unavailable. Switching to perspective Canvas renderer.',error.message);
    softwareRenderer=true;
    // Do not reuse the canvas that failed WebGL initialization. A partially
    // initialized graphics context can make 2D draw calls silently disappear.
    softwareCanvas=document.createElement('canvas');
    softwareCanvas.setAttribute('aria-hidden','true');
    Object.assign(softwareCanvas.style,{position:'absolute',inset:'0',zIndex:'1',pointerEvents:'none'});
    ui.world.insertBefore(softwareCanvas,ui.canvas.nextSibling);
    softwareContext=softwareCanvas.getContext('2d');
    if(!softwareContext)throw error;
  }
  // Numbered, high-contrast markers make the balls identifiable while the
  // camera pulls back for a complete overhead view of a rolling shot.
  shotMarkersCanvas=document.createElement('canvas');
  shotMarkersCanvas.setAttribute('aria-hidden','true');
  Object.assign(shotMarkersCanvas.style,{position:'absolute',inset:'0',zIndex:'1',pointerEvents:'none'});
  ui.world.append(shotMarkersCanvas);
  shotMarkersContext=shotMarkersCanvas.getContext('2d');
  scene.add(new THREE.HemisphereLight(0xc8d4d5,0x152421,2.3));
  headlamp=new THREE.SpotLight(0xffe5b2,140,19,Math.PI/3,.6,1.7);
  headlamp.position.set(0,4.6,0);headlamp.target.position.set(0,0,0);scene.add(headlamp,headlamp.target);
  const edgeLight=new THREE.DirectionalLight(0x8fcfc6,1.45);edgeLight.position.set(4,4,-3);scene.add(edgeLight);

  tableGroup=new THREE.Group();scene.add(tableGroup);
  ballsGroup=new THREE.Group();scene.add(ballsGroup);
  cueGroup=new THREE.Group();scene.add(cueGroup);
  environmentGroup=new THREE.Group();scene.add(environmentGroup);
  buildRoom();buildTable();buildCue();buildAimGuide();
  raycaster=new THREE.Raycaster();
  const handleResize=()=>{
    const rect=ui.world.getBoundingClientRect();
    const w=Math.max(1,rect.width),h=Math.max(1,rect.height);
    if(softwareRenderer){
      const dpr=Math.min(window.devicePixelRatio||1,1.65);
      softwareCanvas.width=Math.floor(w*dpr);softwareCanvas.height=Math.floor(h*dpr);
      softwareContext.setTransform(dpr,0,0,dpr,0,0);
    }else renderer.setSize(w,h,false);
    const dpr=Math.min(window.devicePixelRatio||1,1.65);
    shotMarkersCanvas.width=Math.floor(w*dpr);shotMarkersCanvas.height=Math.floor(h*dpr);
    shotMarkersContext?.setTransform(dpr,0,0,dpr,0,0);
    camera.aspect=w/h;camera.fov=w<540?65:54;camera.updateProjectionMatrix();
  };
  new ResizeObserver(handleResize).observe(ui.world);
  handleResize();
  sceneReady=true;
  requestAnimationFrame(renderFrame);
}

function buildRoom(){
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),floorMaterial);
  floor.rotation.x=-Math.PI/2;floor.position.y=-.98;environmentGroup.add(floor);
  const wall=new THREE.Mesh(new THREE.PlaneGeometry(32,9),new THREE.MeshStandardMaterial({color:0x1a3934,roughness:.93}));
  wall.position.set(0,2,-9);environmentGroup.add(wall);
  for(let i=-4;i<=4;i++){
    const beam=new THREE.Mesh(new THREE.BoxGeometry(.055,3.4,.085),new THREE.MeshStandardMaterial({color:0x577064,roughness:.75}));
    beam.position.set(i*1.9,.8,-8.91);environmentGroup.add(beam);
  }
  for(const x of [-3.5,3.5]){
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.07,24),new THREE.MeshStandardMaterial({color:0x92733f,metalness:.75,roughness:.2}));
    base.position.set(x,2.4,-6.5);environmentGroup.add(base);
    const lamp=new THREE.PointLight(0xf7be6b,13,6);lamp.position.copy(base.position);environmentGroup.add(lamp);
  }
  // Overhead pool-table fixtures are three warm metal shades.
  // Keep the physical fixtures separate so the top camera can look through
  // their position without hiding the room or turning off its illumination.
  overheadFixturesGroup=new THREE.Group();environmentGroup.add(overheadFixturesGroup);
  for(const z of [-1.1,0,1.1]){
    const shade=new THREE.Mesh(new THREE.ConeGeometry(.39,.22,32,1,true),new THREE.MeshStandardMaterial({color:0x305144,metalness:.38,roughness:.35,side:THREE.DoubleSide}));
    shade.position.set(0,3,z);shade.rotation.z=Math.PI;overheadFixturesGroup.add(shade);
    meshBox(.016,.7,.016,0,3.4,z,new THREE.MeshStandardMaterial({color:0x7b8b80}),overheadFixturesGroup);
  }
}

function buildTable(){
  const w=TABLE.halfW,l=TABLE.halfL;
  const corner=POCKET_SPEC.cornerReach,side=POCKET_SPEC.sideHalf;
  meshBox(w*2+.48,.2,l*2+.48,0,-.16,0,railMaterial);
  meshBox(w*2+.055,.08,l*2+.055,0,-.048,0,baizeMaterial);
  cloth=flatPatch(clothOutline(),.004,baizeMaterial);
  const railH=.15;
  for(const sign of [-1,1]){
    for(const [start,end] of [[-l+corner,-side],[side,l-corner]]){
      const len=end-start,center=(end+start)/2;
      meshBox(.245,railH,len,sign*(w+.13),.045,center,railMaterial);
      meshBox(.06,.06,len,sign*(w+.012),.025,center,cushionMaterial);
    }
    meshBox(w*2-2*corner,railH,.235,0,.045,sign*(l+.12),railMaterial);
    meshBox(w*2-2*corner,.06,.06,0,.025,sign*(l+.012),cushionMaterial);
    for(const zz of [-1.905,-1.27,-.635,.635,1.27,1.905]){
      const sight=new THREE.Mesh(new THREE.BoxGeometry(.025,.005,.024),pocketRim);
      sight.rotation.y=Math.PI/4;sight.position.set(sign*(w+.15),.13,zz);tableGroup.add(sight);
    }
    // Three sights on each short rail complete the 18 WPA table diamonds.
    for(const x of [-w/2,0,w/2]){
      const sight=new THREE.Mesh(new THREE.BoxGeometry(.024,.005,.025),pocketRim);
      sight.rotation.y=Math.PI/4;sight.position.set(x,.13,sign*(l+.13));tableGroup.add(sight);
    }
  }
  for(const p of POCKETS){
    flatPatch(pocketOutline(p),.014,pocketDark);
    // The photos show nickel-colored castings around deep, black pockets.
    const lip=new THREE.CatmullRomCurve3(pocketMetalLip(p).map(([x,z])=>new THREE.Vector3(x,.132,z)));
    const casting=new THREE.Mesh(new THREE.TubeGeometry(lip,30,p.z===0?.022:.033,8,false),pocketRim);
    tableGroup.add(casting);
  }
  // Head, center and foot spots match the positions in the reference diagram.
  for(const z of [-l/2,0,l/2]){
    const spot=new THREE.Mesh(new THREE.CircleGeometry(.014,24),new THREE.MeshBasicMaterial({color:0xd8edf2,transparent:true,opacity:.55,depthWrite:false}));
    spot.rotation.x=-Math.PI/2;spot.position.set(0,.017,z);tableGroup.add(spot);
  }
  for(const x of [-w+.20,w-.20])for(const z of [-l+.27,l-.27]){
    meshBox(.18,.75,.2,x,-.59,z,railMaterial);
  }
}

function buildAimGuide(){
  const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
  aimGuide=new THREE.Line(geometry,new THREE.LineDashedMaterial({color:0xffefb0,dashSize:.075,gapSize:.055,transparent:true,opacity:.72,depthWrite:false}));
  aimGuide.frustumCulled=false;
  aimGuide.visible=false;
  scene.add(aimGuide);
  guideEnd=new THREE.Mesh(new THREE.RingGeometry(.018,.026,24),new THREE.MeshBasicMaterial({color:0xffe8a7,transparent:true,opacity:.74,side:THREE.DoubleSide,depthWrite:false}));
  guideEnd.rotation.x=-Math.PI/2;
  guideEnd.visible=false;
  scene.add(guideEnd);
}

function getAimGuide(){
  if(!physics||!started||physics.inShot||physics.cue.pocketed||cpuThinking||!ui.start.hidden||!ui.end.hidden)return null;
  const c=physics.cue,dx=-Math.sin(aim),dz=-Math.cos(aim);
  let distance=3.10,hit=false;
  // Only a first-contact cue-ball line: no perfect potting or bank previews.
  for(const b of physics.active){
    if(b.id===0)continue;
    const rx=b.x-c.x,rz=b.z-c.z;
    const projected=rx*dx+rz*dz;
    const lateralSq=rx*rx+rz*rz-projected*projected;
    if(projected<=0||lateralSq>(2*R)*(2*R))continue;
    const contact=projected-Math.sqrt(Math.max(0,(2*R)*(2*R)-lateralSq));
    if(contact>R && contact<distance){distance=contact;hit=true;}
  }
  const start=.11;
  return {x1:c.x+dx*start,z1:c.z+dz*start,x2:c.x+dx*distance,z2:c.z+dz*distance,hit};
}

function updateAimGuide(){
  const g=getAimGuide();
  aimGuide.visible=!!g;
  guideEnd.visible=!!g?.hit;
  if(!g)return;
  const position=aimGuide.geometry.attributes.position;
  position.setXYZ(0,g.x1,.035,g.z1);
  position.setXYZ(1,g.x2,.035,g.z2);
  position.needsUpdate=true;
  aimGuide.computeLineDistances();
  if(g.hit)guideEnd.position.set(g.x2,.041,g.z2);
}

function buildCue(){
  const darkLeather=new THREE.MeshStandardMaterial({color:0x211714,roughness:.55});
  const maple=new THREE.MeshStandardMaterial({color:0xe0ac75,roughness:.44});
  const gold=new THREE.MeshStandardMaterial({color:0xc7a566,metalness:.55,roughness:.3});
  const stick=new THREE.Mesh(new THREE.CylinderGeometry(.0105,.025,1.10,16),maple);
  const grip=new THREE.Mesh(new THREE.CylinderGeometry(.023,.024,.32,16),darkLeather);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.0108,.0108,.037,16),gold);
  const tip=new THREE.Mesh(new THREE.CylinderGeometry(.011,.011,.022,16),new THREE.MeshStandardMaterial({color:0x58b8a5,roughness:.83}));
  grip.position.y=-.37;cap.position.y=.555;tip.position.y=.58;
  cueGroup.add(stick,grip,cap,tip);
  cueGroup.visible=false;
}

function syncMeshes(){
  if(!physics)return;
  const existing=new Set();
  for(const b of physics.balls){
    existing.add(b.id);
    if(!ballMeshes.has(b.id)){
      const material=new THREE.MeshPhysicalMaterial({map:ballTexture(b.id),roughness:.24,metalness:0,clearcoat:.68,clearcoatRoughness:.12});
      const mesh=new THREE.Mesh(sphereGeometry,material);
      const shadow=new THREE.Mesh(shadowGeometry,new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.25,depthWrite:false}));
      shadow.rotation.x=-Math.PI/2;shadow.position.y=.006;
      ballsGroup.add(mesh,shadow);ballMeshes.set(b.id,{mesh,shadow,lastX:b.x,lastZ:b.z});
    }
    const item=ballMeshes.get(b.id);
    item.mesh.visible=!b.pocketed;item.shadow.visible=!b.pocketed;
    item.mesh.scale.setScalar(physics.inShot?1.12:1.06);
    if(!b.pocketed){
      item.mesh.position.set(b.x,R+.014,b.z);
      item.shadow.position.x=b.x;item.shadow.position.z=b.z;
      const dx=b.x-item.lastX,dz=b.z-item.lastZ;
      const d=Math.hypot(dx,dz);
      if(d>.00001){
        tmp.set(dz,0,-dx).normalize();
        item.mesh.rotateOnWorldAxis(tmp,d/R);
      }
      item.lastX=b.x;item.lastZ=b.z;
    }
  }
  for(const [id,item] of ballMeshes){
    if(!existing.has(id)){ballsGroup.remove(item.mesh,item.shadow);item.mesh.material.dispose();ballMeshes.delete(id);}
  }
}

function idealAimCamera(){
  if(!physics||physics.cue.pocketed)return;
  const c=physics.cue,dx=-Math.sin(aim),dz=-Math.cos(aim);
  const portrait=ui.world.clientWidth<580;
  const behind=portrait?1.02:1.23;
  const eye=portrait?.76:.91;
  return {
    position:new THREE.Vector3(c.x-dx*behind,eye+.12,c.z-dz*behind),
    look:new THREE.Vector3(c.x+dx*1.52,.078,c.z+dz*1.52)
  };
}

function idealShotCamera(){
  // Frame the entire regulation table for both landscape and portrait sizes.
  // A slight tilt maintains the table's orientation and avoids the vertical
  // lookAt singularity at a mathematically exact bird's-eye position.
  const height=(TABLE.halfL*2+.95)/(2*Math.tan(rad(camera.fov)/2));
  return {
    position:new THREE.Vector3(0,height,height*.20),
    look:new THREE.Vector3(0,.02,0)
  };
}

function renderShotMarkers(){
  const ctx=shotMarkersContext,w=shotMarkersCanvas.clientWidth,h=shotMarkersCanvas.clientHeight;
  if(!ctx||!w||!h)return;
  ctx.clearRect(0,0,w,h);
  if(!started||!physics?.inShot)return;
  camera.updateMatrixWorld();
  const radius=w<580?8:9.5;
  for(const b of physics.active){
    const v=new THREE.Vector3(b.x,R+.032,b.z).project(camera);
    if(v.z<=-1||v.z>=1||Math.abs(v.x)>1.05||Math.abs(v.y)>1.05)continue;
    const x=(v.x+1)*w/2,y=(1-v.y)*h/2;
    ctx.save();ctx.shadowColor='#001b2b';ctx.shadowBlur=6;
    ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);
    ctx.fillStyle=b.id===0?'#f9faf2':COLORS[b.id];ctx.fill();
    ctx.lineWidth=1.7;ctx.strokeStyle='#f7f9ec';ctx.stroke();
    ctx.shadowBlur=0;
    if(b.id!==0){
      ctx.beginPath();ctx.arc(x,y,radius*.62,0,Math.PI*2);
      ctx.fillStyle='#fffcf0';ctx.fill();
      ctx.font='900 '+(b.id>=10?8:10)+'px Arial,sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#182327';
      ctx.fillText(String(b.id),x,y+.4);
    }else{
      ctx.beginPath();ctx.arc(x-radius*.2,y-radius*.2,radius*.27,0,Math.PI*2);
      ctx.fillStyle='#ffffff';ctx.fill();
    }
    ctx.restore();
  }
}

function updateCue(){
  if(!physics||!sceneReady)return;
  const visible=started&&!physics.inShot&&!physics.cue.pocketed&&ui.start.hidden&&ui.end.hidden;
  cueGroup.visible=visible;
  if(!visible)return;
  const c=physics.cue,dx=-Math.sin(aim),dz=-Math.cos(aim);
  const dir=new THREE.Vector3(dx,0,dz).normalize();
  const pull=power*.20;
  const centerDist=.72+pull;
  cueGroup.position.set(c.x-dx*centerDist,R+.04,c.z-dz*centerDist);
  cueGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
}

function renderFrame(){
  requestAnimationFrame(renderFrame);
  if(!sceneReady)return;
  const dt=clamp(animationClock.getDelta(),0,.06);
  if(physics){physics.update(dt);syncMeshes();}
  if(physics){
    const view=physics.inShot?idealShotCamera():idealAimCamera();
    if(view){
      camera.position.lerp(view.position,Math.min(1,dt*(physics.inShot?5.2:5.8)));
      cameraTarget.lerp(view.look,Math.min(1,dt*(physics.inShot?5.5:6)));
      camera.lookAt(cameraTarget);
    }
    updateCue();
    updateAimGuide();
  }else{
    camera.position.set(Math.sin(performance.now()*.00012)*.25,1.75,4.5);
    camera.lookAt(0,0,-.45);
  }
  // Lights hang between the top camera and the balls. Hide just the shades
  // while shooting and until the camera returns below the fixtures.
  if(overheadFixturesGroup)overheadFixturesGroup.visible=!(physics?.inShot||camera.position.y>2.4);
  if(softwareRenderer)renderSoftwarePerspective();
  else renderer.render(scene,camera);
  renderShotMarkers();
}

function renderSoftwarePerspective(){
  const ctx=softwareContext,w=softwareCanvas.clientWidth,h=softwareCanvas.clientHeight;
  if(!ctx||!w||!h)return;
  ctx.clearRect(0,0,w,h);
  const background=ctx.createLinearGradient(0,0,0,h);
  background.addColorStop(0,'#0d2522');background.addColorStop(.6,'#152f27');background.addColorStop(1,'#0b1918');
  ctx.fillStyle=background;ctx.fillRect(0,0,w,h);
  camera.updateMatrixWorld();
  const point=(x,y,z)=>{
    const projected=new THREE.Vector3(x,y,z).project(camera);
    return {x:(1+projected.x)*w/2,y:(1-projected.y)*h/2,depth:projected.z};
  };
  const polygon=(points,fill,stroke=null,lineWidth=1)=>{
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.closePath();ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
  };
  // A low player camera can cross the near edge of the tabletop. Ordinary
  // point.project() flips vertices behind the camera to the other side of
  // the screen; clip every planar surface in camera space first.
  const polygon3d=(vertices,fill,stroke=null,lineWidth=1)=>{
    const clipZ=-Math.max(.12,camera.near*1.1);
    const source=vertices.map(([x,y,z])=>new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
    const visible=[];
    for(let i=0;i<source.length;i++){
      const prev=source[(i+source.length-1)%source.length],next=source[i];
      const prevIn=prev.z<=clipZ,nextIn=next.z<=clipZ;
      if(prevIn!==nextIn){
        const t=(clipZ-prev.z)/(next.z-prev.z);
        visible.push(prev.clone().lerp(next,t));
      }
      if(nextIn)visible.push(next);
    }
    if(visible.length<3)return;
    polygon(visible.map(v=>{
      v.applyMatrix4(camera.projectionMatrix);
      return {x:(1+v.x)*w/2,y:(1-v.y)*h/2};
    }),fill,stroke,lineWidth);
  };
  const w1=TABLE.halfW,z1=TABLE.halfL;
  const corner=POCKET_SPEC.cornerReach,side=POCKET_SPEC.sideHalf;
  polygon3d([[-w1-.23,-.04,-z1-.21],[w1+.23,-.04,-z1-.21],
    [w1+.23,-.04,z1+.21],[-w1-.23,-.04,z1+.21]],'#382418','#9b7040',7);
  const a=point(-w1,0,-z1),b=point(w1,0,-z1),c=point(w1,0,z1),d=point(-w1,0,z1);
  const felt=ctx.createLinearGradient(0,a.y,0,d.y);
  felt.addColorStop(0,'#086f9e');felt.addColorStop(1,'#1596c9');
  polygon3d(clothOutline().map(([x,z])=>[x,0,z]),felt,'#0a6a91',2);
  // Separate rail sections leave visible gaps for the real pocket mouths.
  const rails=[];
  for(const sx of [-1,1]){
    for(const [lo,hi] of [[-z1+corner,-side],[side,z1-corner]]){
      rails.push([[sx*w1,lo],[sx*(w1+.23),lo],[sx*(w1+.23),hi],[sx*w1,hi]]);
    }
    rails.push([[-w1+corner,sx*z1],[w1-corner,sx*z1],[w1-corner,sx*(z1+.20)],[-w1+corner,sx*(z1+.20)]]);
  }
  // The rail cap is physically above the felt: keep its projected height
  // aligned with the silver pocket castings instead of letting them float.
  for(const corners of rails)polygon3d(corners.map(([x,z])=>[x,.12,z]),'#6d4830','#a77a4d',1.5);
  for(const p of POCKETS){
    polygon3d(pocketOutline(p).map(([x,z])=>[x,.082,z]),'#030b13','#142633',1.6);
    const lip=pocketMetalLip(p).map(([x,z])=>point(x,.134,z));
    ctx.beginPath();lip.forEach((pt,i)=>i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y));
    ctx.strokeStyle='#9cabb3';ctx.lineWidth=p.z===0?4.5:7;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
    ctx.lineWidth=1;ctx.strokeStyle='#e7ebed';ctx.stroke();
  }
  const sight=(x,z)=>{
    const p=point(x,.14,z);
    ctx.beginPath();ctx.moveTo(p.x,p.y-3);ctx.lineTo(p.x+3,p.y);
    ctx.lineTo(p.x,p.y+3);ctx.lineTo(p.x-3,p.y);ctx.closePath();
    ctx.fillStyle='#d1d6d7';ctx.fill();
  };
  for(const sx of [-1,1]){
    for(const z of [-1.905,-1.27,-.635,.635,1.27,1.905])sight(sx*(w1+.15),z);
    for(const x of [-w1/2,0,w1/2])sight(x,sx*(z1+.13));
  }
  for(const z of [-z1/2,0,z1/2]){
    const pt=point(0,.019,z);
    ctx.beginPath();ctx.arc(pt.x,pt.y,2,0,2*Math.PI);
    ctx.fillStyle='#daeaefb3';ctx.fill();
  }
  if(physics){
    const guide=getAimGuide();
    if(guide){
      const start=point(guide.x1,.04,guide.z1),end=point(guide.x2,.04,guide.z2);
      ctx.save();ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);
      ctx.setLineDash([7,6]);ctx.lineWidth=2;ctx.strokeStyle='#ffe8a6bb';ctx.stroke();ctx.setLineDash([]);
      if(guide.hit){ctx.beginPath();ctx.arc(end.x,end.y,4,0,2*Math.PI);ctx.stroke();}
      ctx.restore();
    }
    const entries=physics.active.filter(b=>!b.pocketed).map(b=>({
      ball:b,at:point(b.x,R+.015,b.z),scale:Math.abs(point(b.x+R,R+.015,b.z).x-point(b.x-R,R+.015,b.z).x)/2
    })).sort((a,b)=>b.at.depth-a.at.depth);
    for(const {ball,at,scale} of entries){
      const rr=Math.max(physics.inShot?6.5:4.5,scale*(physics.inShot?1.12:1.06));
      ctx.beginPath();ctx.ellipse(at.x,at.y+rr*.85,rr*.95,rr*.30,0,0,2*Math.PI);
      ctx.fillStyle='#031d18aa';ctx.fill();
      const grad=ctx.createRadialGradient(at.x-rr*.34,at.y-rr*.44,rr*.04,at.x,at.y,rr);
      grad.addColorStop(0,ball.id===0?'#ffffff':'#ffffffa5');
      grad.addColorStop(.27,COLORS[ball.id]);grad.addColorStop(1,ball.id===8?'#090b11':'#121616');
      ctx.beginPath();ctx.arc(at.x,at.y,rr,0,2*Math.PI);ctx.fillStyle=grad;ctx.fill();
      if(ball.id>0){
        ctx.beginPath();ctx.arc(at.x,at.y,rr*.52,0,2*Math.PI);
        ctx.fillStyle='#fff9ed';ctx.fill();
        ctx.fillStyle='#10161c';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font='900 '+Math.max(8,rr*.80)+'px Arial,sans-serif';
        ctx.fillText(String(ball.id),at.x,at.y+rr*.03);
      }
    }
    if(started&&!physics.inShot&&!physics.cue.pocketed){
      const b=physics.cue,dx=-Math.sin(aim),dz=-Math.cos(aim),pull=power*.20;
      const tip=point(b.x-dx*(.12+pull),R+.09,b.z-dz*(.12+pull));
      const butt=point(b.x-dx*(1.28+pull),R+.11,b.z-dz*(1.28+pull));
      ctx.lineCap='round';ctx.beginPath();ctx.moveTo(tip.x,tip.y);ctx.lineTo(butt.x,butt.y);
      ctx.strokeStyle='#070f0baa';ctx.lineWidth=15;ctx.stroke();
      ctx.lineWidth=9;ctx.strokeStyle='#d5a06e';ctx.stroke();
      ctx.beginPath();ctx.moveTo(butt.x,butt.y);
      const mid=point(b.x-dx*(.95+pull),R+.10,b.z-dz*(.95+pull));
      ctx.lineTo(mid.x,mid.y);ctx.lineWidth=10;ctx.strokeStyle='#292021';ctx.stroke();
      ctx.beginPath();ctx.arc(tip.x,tip.y,4,0,Math.PI*2);ctx.fillStyle='#6bc9c4';ctx.fill();
    }
  }
}

function setStatus(message,temporary=false){
  clearTimeout(lastMessageTimer);
  ui.message.textContent=message;
  if(temporary)lastMessageTimer=setTimeout(()=>{ui.message.textContent=rules?.lastMessage||'';},3300);
}
function showPocket(id,pocket){
  const name=POCKETS[pocket]?.name||'ポケット';
  ui.flashText.textContent=id===0?'SCRATCH!':name+' / '+nameOf(id);
  ui.flash.querySelector('strong').textContent=id===0?'SCRATCH!':'POCKET!';
  ui.flash.classList.remove('show');
  void ui.flash.offsetWidth;
  ui.flash.classList.add('show');
  lastPocketTime=performance.now();
}
function updateSpinText(){
  const x=spin.x,y=spin.y;
  let label='センター',detail='自然な転がり';
  if(Math.abs(y)>.26){label=y>0?'押し球（上回転）':'引き球（下回転）';detail=y>0?'衝突後も前へ進みやすい':'衝突後に手前へ戻りやすい';}
  if(Math.abs(x)>.26){label+=(label==='センター'?'':'+')+(x>0?'右ひねり':'左ひねり');detail='クッションの反射や球筋が変わる';}
  ui.spinName.textContent=label;ui.spinDetail.textContent=detail;
  ui.spinDot.style.left=(50+spin.x*39)+'%';
  ui.spinDot.style.top=(50-spin.y*39)+'%';
  ui.spinPad.setAttribute('aria-valuetext',label);
}
function setSpin(x,y){
  const length=Math.hypot(x,y);
  if(length>.92){x*=.92/length;y*=.92/length;}
  spin={x,y};updateSpinText();
}
function setAim(newAngle){
  aim=Math.atan2(Math.sin(newAngle),Math.cos(newAngle));
  ui.angle.textContent=(aim*180/Math.PI).toFixed(1)+'°';
}
function setPower(amount){
  power=clamp(amount,0,1);
  const height=ui.powerTrack.clientHeight;
  ui.powerFill.style.height=(power*100)+'%';
  ui.powerKnob.style.transform='translateY('+(Math.max(0,power*(height-24)))+'px)';
  ui.powerCount.textContent=Math.round(power*100);
  ui.powerTrack.setAttribute('aria-valuenow',String(Math.round(power*100)));
}
function activePlayerName(index){
  return index===0?'あなた':selection.opponent==='cpu'?'CPU': 'プレイヤー2';
}
function isOwnTurn(){
  return started&&physics&&!physics.inShot&&rules?.winner===null&&!(selection.opponent==='cpu'&&rules.turn===1)&&!cpuThinking&&!coinQueued&&ui.rules.hidden&&ui.end.hidden;
}
function targetCueAngle(){
  if(!physics||!rules)return 0;
  const target=physics.balls.find(b=>rules.targets(physics.balls).includes(b.id)&&!b.pocketed);
  if(!target)return 0;
  const dx=target.x-physics.cue.x,dz=target.z-physics.cue.z;
  return Math.atan2(-dx,-dz);
}
function choosePocketForBall(id){
  const b=physics?.find(id);if(!b)return 0;
  return POCKETS.slice().sort((a,c)=>Math.hypot(b.x-a.x,b.z-a.z)-Math.hypot(b.x-c.x,b.z-c.z))[0].index;
}
function updateCallOptions(){
  const visible=rules?.mode==='8'&&!rules.breaking&&rules.winner===null;
  ui.callPanel.hidden=!visible;
  if(!visible||!physics)return;
  const valid=rules.targets(physics.balls);
  const previous=Number(ui.callBall.value);
  ui.callBall.replaceChildren();
  for(const id of valid){
    const opt=document.createElement('option');opt.value=String(id);opt.textContent=id+' 番ボール';ui.callBall.append(opt);
  }
  const chosen=valid.includes(previous)?previous:valid[0];
  if(chosen!==undefined){
    ui.callBall.value=String(chosen);
    if(currentCall.ball!==chosen)ui.callPocket.value=String(choosePocketForBall(chosen));
    currentCall={ball:chosen,pocket:Number(ui.callPocket.value)};
  }
  const disabled=!isOwnTurn();
  ui.callBall.disabled=disabled;ui.callPocket.disabled=disabled;
}
function refreshUI(){
  if(!rules||!physics)return;
  const active=physics.active.filter(b=>b.id!==0),player=rules.turn;
  ui.mode.textContent=rules.mode+'-BALL';
  ui.opponent.textContent=selection.opponent==='cpu'?'SOLO VS CPU':'LOCAL 2 PLAYERS';
  ui.p1Name.textContent='あなた';
  ui.p2Name.textContent=selection.opponent==='cpu'?'CPU · '+({easy:'BEGINNER',normal:'REGULAR',hard:'EXPERT'}[selection.difficulty]):'プレイヤー 2';
  ui.p1.classList.toggle('active',player===0);
  ui.p2.classList.toggle('active',player===1);
  ui.p1Group.textContent=rules.mode==='9'?'9-BALL':rules.groupLabel(0);
  ui.p2Group.textContent=rules.mode==='9'?'9-BALL':rules.groupLabel(1);
  ui.stage.textContent=physics.inShot?'BALLS IN MOTION':cpuThinking?'CPU THINKING':rules.breaking?'BREAK SHOT':rules.ballInHand?'BALL IN HAND':'READY TO SHOOT';
  ui.viewMode.textContent=physics.inShot?'TOP VIEW':'PLAYER VIEW';
  ui.viewDetail.textContent=physics.inShot?'BALL NUMBERS':'SHORT AIM GUIDE';
  ui.remaining.textContent=active.length+' BALL'+(active.length===1?'':'S')+' ON TABLE';
  const human=isOwnTurn();
  ui.turnTag.textContent=player===0?'あなたのターン':selection.opponent==='cpu'?'CPUのターン':'プレイヤー2のターン';
  ui.sceneHint.textContent=physics.inShot?'俯瞰視点で球の動きを確認中':cpuThinking?'CPUがショットを考えています…':rules.ballInHand?'台をタップして手球の位置を選択':human?'画面を左右にドラッグして狙う':'球が止まるまで待ってね';
  $('cueMoveLabel').hidden=physics.inShot;
  ui.hand.hidden=!(rules.ballInHand&&!cpuThinking&&!physics.inShot&&human);
  if(!ui.hand.hidden){
    ui.hand.querySelector('span').textContent=rules.breaking?'🎱 ブレイクの手球':'✋ フリーボール';
    ui.hand.querySelector('small').textContent=rules.breaking?'ヘッドラインより手前で位置を決めよう':'台をタップして手球を置いてね';
  }
  ui.warning.textContent=human?'':physics.inShot?'球の転がりを上から確認中':'順番を待ってね';
  ui.powerTrack.style.opacity=human?1:.42;
  updateCallOptions();
}
function finishMatch(result){
  started=false;
  if(result.winner===0)window.asobiPlayer?.record('billiards','clear');
  ui.end.hidden=false;
  const player=activePlayerName(result.winner);
  $('endTitle').textContent=(result.winner===0?'YOU WIN!':selection.opponent==='cpu'?'CPU WINS':'PLAYER 2 WINS');
  $('endDetail').textContent=player+'の勝ち！ '+result.reason;
  audio.win();
  refreshUI();
}
function shotSettled(log){
  if(!physics||!rules)return;
  const result=rules.finishShot(log,shotBefore,shotCall);
  result.spot.forEach(id=>physics.spotBall(id));
  if(result.winner!==null){
    if(result.foul)audio.foul();
    finishMatch(result);return;
  }
  if(result.ballInHand){
    // The next player can adjust this provisional placement by tapping felt.
    if(physics.cue.pocketed)physics.cue.pocketed=false;
    physics.placeClosest(0,result.ballInHand==='kitchen'?1.63:1.35,result.ballInHand==='kitchen');
    audio.foul();
  }
  setPower(0);setSpin(0,0);
  setAim(targetCueAngle());
  currentCall={ball:null,pocket:0};
  refreshUI();
  setStatus(result.reason, true);
  if(selection.opponent==='cpu'&&rules.turn===1)scheduleCpu();
}
function pocketEvent({id,pocket}){
  audio.pocket();showPocket(id,pocket);
}
function initMatch(breaker=0){
  const token=++matchToken;
  physics=new BilliardsPhysics(selection.mode,{
    onStrike:({speed})=>audio.cue(speed/5),
    onCollide:({speed})=>audio.collide(speed),
    onRail:({speed})=>audio.rail(speed),
    onPocket:pocketEvent,
    onSettle:shotSettled
  });
  rules=new MatchRules(selection.mode,breaker);
  started=true;cpuThinking=false;coinQueued=false;
  window.asobiPlayer?.record('billiards','start');
  for(const [,entry] of ballMeshes){
    ballsGroup.remove(entry.mesh,entry.shadow);entry.mesh.material.dispose();
  }
  ballMeshes.clear();
  setPower(0);setSpin(0,0);setAim(targetCueAngle());
  currentCall={ball:null,pocket:0};
  cameraTarget.set(0,.12,0);
  const view=idealAimCamera();
  if(view){camera.position.copy(view.position);cameraTarget.copy(view.look);camera.lookAt(cameraTarget);}
  syncMeshes();refreshUI();setStatus(rules.lastMessage);
  if(breaker===1&&selection.opponent==='cpu')scheduleCpu();
  return token;
}
function commitShot(force){
  if(!isOwnTurn())return false;
  if(force<.09){ui.warning.textContent='もう少しキューを引いてね';return false;}
  const cue=physics.cue;
  if(!cue||cue.pocketed){ui.warning.textContent='手球を置いてね';return false;}
  shotBefore=physics.active.filter(b=>b.id!==0).map(b=>b.id);
  shotCall=rules.mode==='8'&&!rules.breaking?{ball:Number(ui.callBall.value),pocket:Number(ui.callPocket.value)}:null;
  if(rules.mode==='8'&&!rules.breaking&&!rules.targets(physics.balls).includes(shotCall.ball)){
    ui.warning.textContent='先に狙うボールを指定してね';return false;
  }
  const struck=physics.shoot(aim,force,spin.x,spin.y);
  if(struck){rules.ballInHand=null;setPower(0);ui.warning.textContent='';ui.hand.hidden=true;refreshUI();}
  return struck;
}
async function coinToss(){
  if(coinQueued)return;
  const token=++matchToken;
  coinQueued=true;
  ui.start.hidden=true;ui.end.hidden=true;ui.coin.hidden=false;
  const coin=$('coinObject');
  const breaker=Math.random()<.5?0:1;
  const back=breaker===1;
  coin.classList.remove('flipping');
  coin.style.transform='rotateY(0deg)';
  coin.style.setProperty('--coin-stop',`${6*360+(back?180:0)}deg`);
  coin.setAttribute('aria-label','コインを投げています');
  void coin.offsetWidth;
  coin.classList.add('flipping');
  $('coinResult').textContent='コインを投げています…';
  await audio.unlock();audio.coin();
  await wait(1300);
  if(token!==matchToken)return;
  coin.classList.remove('flipping');
  coin.style.transform=`rotateY(${back?180:0}deg)`;
  coin.setAttribute('aria-label',back?'コインの裏面':'コインの表面');
  $('coinResult').textContent=(back?'裏！ ':'表！ ')+activePlayerName(breaker)+'が先攻！';
  await wait(750);
  if(token!==matchToken)return;
  ui.coin.hidden=true;coinQueued=false;
  initMatch(breaker);
}

// CPU evaluates ghost-ball potting lines and legal first-ball contacts.
const lineClear=(from,to,ignoreIds,all)=>{
  const vx=to.x-from.x,vz=to.z-from.z,lenSq=vx*vx+vz*vz;
  if(lenSq<.0001)return true;
  for(const b of all){
    if(b.pocketed||ignoreIds.includes(b.id))continue;
    const t=clamp(((b.x-from.x)*vx+(b.z-from.z)*vz)/lenSq,0,1);
    const nx=from.x+vx*t,nz=from.z+vz*t;
    if(Math.hypot(b.x-nx,b.z-nz)<R*2.14)return false;
  }
  return true;
};
function evaluateCpuShot(){
  const cue=physics.cue,valid=rules.targets(physics.balls),choices=[];
  for(const id of valid){
    const ball=physics.find(id);if(!ball||ball.pocketed)continue;
    for(const p of POCKETS){
      const pdx=p.x-ball.x,pdz=p.z-ball.z,pdist=Math.hypot(pdx,pdz);
      if(pdist<.001)continue;
      const gx=ball.x-(pdx/pdist)*2.04*R,gz=ball.z-(pdz/pdist)*2.04*R;
      const ghost={x:gx,z:gz};
      const cueDist=Math.hypot(gx-cue.x,gz-cue.z);
      if(cueDist<2*R)continue;
      const clearCue=lineClear(cue,ghost,[0,id],physics.balls);
      const clearPocket=lineClear(ball,p,[0,id],physics.balls);
      const toCueX=(ball.x-cue.x)/Math.max(.01,Math.hypot(ball.x-cue.x,ball.z-cue.z));
      const toCueZ=(ball.z-cue.z)/Math.max(.01,Math.hypot(ball.x-cue.x,ball.z-cue.z));
      const toPocketX=pdx/pdist,toPocketZ=pdz/pdist;
      const straightness=toCueX*toPocketX+toCueZ*toPocketZ;
      choices.push({id,pocket:p.index,ghost,score:(clearCue?7:0)+(clearPocket?5:0)+straightness*3-pdist*.5-cueDist*.38,clean:clearCue&&clearPocket,dist:cueDist+pdist});
    }
  }
  choices.sort((a,b)=>b.score-a.score);
  if(choices.length)return choices[0];
  const fallback=physics.find(valid[0])||physics.balls.find(b=>b.id>0&&!b.pocketed);
  return {id:fallback?.id,pocket:0,ghost:{x:fallback?.x??0,z:fallback?.z??-1},score:0,clean:false,dist:3};
}
async function scheduleCpu(){
  if(selection.opponent!=='cpu'||rules?.turn!==1||rules.winner!==null)return;
  cpuThinking=true;
  const token=matchToken;
  refreshUI();setStatus('CPUがショットを組み立てています…');
  await wait(550+Math.random()*400);
  if(token!==matchToken||!physics||rules.turn!==1)return;
  if(rules.ballInHand){
    const legal=physics.find(rules.targets(physics.balls)[0]);
    const baseZ=legal?clamp(legal.z+1.2,-TABLE.halfL+.2,TABLE.halfL-.2):1.4;
    const baseX=legal?clamp(legal.x+(.15*(Math.random()-.5)),-.95,.95):0;
    physics.cue.pocketed=true;
    physics.cue.pocketed=false;
    physics.placeClosest(baseX,rules.ballInHand==='kitchen'?Math.max(TABLE.headString+.17,baseZ):baseZ,rules.ballInHand==='kitchen');
  }
  let choice=evaluateCpuShot();
  if(rules.breaking){
    const apex=physics.find(1)||physics.balls.find(b=>b.id!==0);
    choice={id:apex.id,pocket:0,ghost:{x:apex.x,z:apex.z},dist:4,clean:true};
  }
  const cue=physics.cue;
  const dx=choice.ghost.x-cue.x,dz=choice.ghost.z-cue.z;
  const baseAngle=Math.atan2(-dx,-dz);
  const noise=({easy:.125,normal:.054,hard:.018}[selection.difficulty]||.055)*(Math.random()+Math.random()+Math.random()-1.5)*1.5;
  setAim(baseAngle+noise);
  const strength=rules.breaking?(selection.difficulty==='easy'?.93:1.04):clamp(.28+choice.dist*.12,.33,.82);
  const poor=selection.difficulty==='easy'?.12:selection.difficulty==='normal'?.05:.016;
  const pull=clamp(strength+(Math.random()-.5)*poor,.19,1);
  setSpin((Math.random()-.5)*.30,choice.clean?.12:.01);
  currentCall={ball:choice.id,pocket:choice.pocket};
  if(rules.mode==='8'&&!rules.breaking){
    ui.callBall.value=String(choice.id);ui.callPocket.value=String(choice.pocket);
  }
  refreshUI();
  await wait(480);
  if(token!==matchToken||rules.turn!==1)return;
  shotBefore=physics.active.filter(b=>b.id!==0).map(b=>b.id);
  shotCall=rules.mode==='8'&&!rules.breaking?{...currentCall}:null;
  if(physics.shoot(aim,pull,spin.x,spin.y)){
    rules.ballInHand=null;cpuThinking=false;setPower(0);refreshUI();
  }else{
    cpuThinking=false;refreshUI();setStatus('CPUのショットに失敗しました。',true);
  }
}

function setSelectedChoices(container,key,value){
  for(const button of $(container).querySelectorAll('[data-'+key+']')){
    const yes=button.dataset[key]===value;
    button.classList.toggle('selected',yes);
    button.setAttribute('aria-pressed',String(yes));
  }
}
for(const button of document.querySelectorAll('#ruleChoice button')){
  button.addEventListener('click',()=>{selection.mode=button.dataset.mode;setSelectedChoices('ruleChoice','mode',selection.mode);});
}
for(const button of document.querySelectorAll('#playerChoice button')){
  button.addEventListener('click',()=>{
    selection.opponent=button.dataset.player;
    setSelectedChoices('playerChoice','player',selection.opponent);
    $('difficultySetting').hidden=selection.opponent!=='cpu';
  });
}
$('difficulty').addEventListener('change',event=>{selection.difficulty=event.target.value;});
$('startButton').addEventListener('click',()=>coinToss().catch(error=>setStatus('開始できませんでした: '+error.message)));
$('rematchButton').addEventListener('click',()=>coinToss());
$('restartButton').addEventListener('click',()=>{if(coinQueued)return;coinToss();});
function openSetupMenu(){
  matchToken++;started=false;cpuThinking=false;coinQueued=false;setPower(0);
  if(physics){physics.inShot=false;for(const b of physics.active){b.vx=0;b.vz=0;}}
  ui.end.hidden=true;ui.coin.hidden=true;ui.start.hidden=false;
}
$('menuButton').addEventListener('click',openSetupMenu);
$('backToMenu').addEventListener('click',openSetupMenu);
$('rulesButton').addEventListener('click',()=>{ui.rules.hidden=false;});
$('closeRules').addEventListener('click',()=>{ui.rules.hidden=true;});
ui.rules.addEventListener('click',e=>{if(e.target===ui.rules)ui.rules.hidden=true;});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!ui.rules.hidden){ui.rules.hidden=true;return;}
  if(!isOwnTurn()||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  if(e.key==='ArrowLeft'&&document.activeElement!==ui.powerTrack){e.preventDefault();setAim(aim-.012);}
  if(e.key==='ArrowRight'&&document.activeElement!==ui.powerTrack){e.preventDefault();setAim(aim+.012);}
  if(e.key===' '&&document.activeElement===document.body){e.preventDefault();commitShot(.55);}
});

const heldAim={timer:null};
const stopAim=()=>{if(heldAim.timer){clearInterval(heldAim.timer);heldAim.timer=null;}};
function bindAim(button,delta){
  button.addEventListener('pointerdown',e=>{
    if(!isOwnTurn())return;
    e.preventDefault();setAim(aim+delta);stopAim();
    heldAim.timer=setInterval(()=>{if(isOwnTurn())setAim(aim+delta);},50);
    button.setPointerCapture(e.pointerId);
  });
  button.addEventListener('pointerup',stopAim);
  button.addEventListener('pointercancel',stopAim);
  button.addEventListener('lostpointercapture',stopAim);
  button.addEventListener('click',e=>{if(e.detail===0&&isOwnTurn())setAim(aim+delta);});
}
bindAim($('aimLeft'),-.012);
bindAim($('aimRight'),.012);

function spinFromEvent(event){
  const rect=ui.spinPad.getBoundingClientRect();
  const xx=(event.clientX-(rect.left+rect.width/2))/(rect.width/2-8);
  const yy=((rect.top+rect.height/2)-event.clientY)/(rect.height/2-8);
  setSpin(xx,yy);
}
ui.spinPad.addEventListener('pointerdown',e=>{
  if(!isOwnTurn())return;
  spinDrag=true;ui.spinPad.setPointerCapture(e.pointerId);spinFromEvent(e);
});
ui.spinPad.addEventListener('pointermove',e=>{if(spinDrag&&isOwnTurn())spinFromEvent(e);});
ui.spinPad.addEventListener('pointerup',()=>{spinDrag=false;});
ui.spinPad.addEventListener('pointercancel',()=>{spinDrag=false;});
ui.spinPad.addEventListener('keydown',e=>{
  if(!isOwnTurn())return;
  const offset=.12;
  if(e.key==='ArrowLeft')setSpin(spin.x-offset,spin.y);
  else if(e.key==='ArrowRight')setSpin(spin.x+offset,spin.y);
  else if(e.key==='ArrowUp')setSpin(spin.x,spin.y+offset);
  else if(e.key==='ArrowDown')setSpin(spin.x,spin.y-offset);
  else if(e.key==='Home')setSpin(0,0);
  else return;
  e.preventDefault();
});
$('spinReset').addEventListener('click',()=>{if(isOwnTurn())setSpin(0,0);});

const powerFromEvent=e=>{
  const rect=ui.powerTrack.getBoundingClientRect();
  setPower(clamp((e.clientY-rect.top)/Math.max(1,rect.height),0,1));
};
ui.powerTrack.addEventListener('pointerdown',e=>{
  if(!isOwnTurn())return;
  e.preventDefault();
  powerDrag=true;ui.powerTrack.classList.add('dragging');
  ui.powerTrack.setPointerCapture(e.pointerId);
  powerFromEvent(e);
});
ui.powerTrack.addEventListener('pointermove',e=>{if(powerDrag&&isOwnTurn())powerFromEvent(e);});
ui.powerTrack.addEventListener('pointerup',e=>{
  if(!powerDrag)return;
  powerFromEvent(e);powerDrag=false;ui.powerTrack.classList.remove('dragging');
  const amount=power;
  if(!commitShot(amount))setPower(0);
});
ui.powerTrack.addEventListener('pointercancel',()=>{powerDrag=false;setPower(0);ui.powerTrack.classList.remove('dragging');});
ui.powerTrack.addEventListener('keydown',e=>{
  if(!isOwnTurn())return;
  if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();setPower(power+.08);}
  if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();setPower(power-.08);}
  if(e.key==='Home'){e.preventDefault();setPower(0);}
  if(e.key==='End'){e.preventDefault();setPower(1);}
  if(e.key==='Enter'||e.key===' '){e.preventDefault();const amount=power||.55;commitShot(amount);}
});
ui.callBall.addEventListener('change',e=>{
  const ball=Number(e.target.value);
  currentCall={ball,pocket:choosePocketForBall(ball)};
  ui.callPocket.value=String(currentCall.pocket);
});
ui.callPocket.addEventListener('change',e=>{currentCall.pocket=Number(e.target.value);});

let worldPointer=null;
ui.canvas.addEventListener('pointerdown',e=>{
  if(!isOwnTurn())return;
  worldPointer={id:e.pointerId,startX:e.clientX,lastX:e.clientX,startY:e.clientY,moved:false};
  ui.canvas.setPointerCapture(e.pointerId);
});
ui.canvas.addEventListener('pointermove',e=>{
  if(!worldPointer||worldPointer.id!==e.pointerId||!isOwnTurn())return;
  const dx=e.clientX-worldPointer.lastX;
  if(Math.abs(e.clientX-worldPointer.startX)>5||Math.abs(e.clientY-worldPointer.startY)>5)worldPointer.moved=true;
  if(worldPointer.moved)setAim(aim-dx*.0053);
  worldPointer.lastX=e.clientX;
});
ui.canvas.addEventListener('pointerup',e=>{
  if(!worldPointer||worldPointer.id!==e.pointerId)return;
  const tapped=!worldPointer.moved;
  worldPointer=null;
  if(tapped&&rules?.ballInHand&&isOwnTurn()){
    const rect=ui.canvas.getBoundingClientRect();
    const x=((e.clientX-rect.left)/rect.width)*2-1;
    const y=-((e.clientY-rect.top)/rect.height)*2+1;
    raycaster.setFromCamera(new THREE.Vector2(x,y),camera);
    const hit=new THREE.Vector3();
    const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    if(raycaster.ray.intersectPlane(plane,hit)){
      if(rules.ballInHand==='kitchen'&&hit.z<TABLE.headString){
        setStatus('ブレイクではヘッドラインより手前に置いてね。',true);return;
      }
      if(physics.placeCue(hit.x,hit.z)){
        setAim(targetCueAngle());refreshUI();setStatus('白玉を置いたよ。向きと回転を決めてショット！',true);
      }else setStatus('他の球やクッションに近すぎるよ。',true);
    }
  }
});
ui.canvas.addEventListener('pointercancel',()=>worldPointer=null);

$('musicToggle').addEventListener('click',async()=>{
  await audio.unlock();
  audio.setMusic(!audio.musicOn);
  $('musicToggle').classList.toggle('off',!audio.musicOn);
  $('musicToggle').querySelector('.toggle-label').textContent=audio.musicOn?'BGM ON':'BGM OFF';
});
$('soundToggle').addEventListener('click',()=>{
  audio.sfxOn=!audio.sfxOn;
  $('soundToggle').classList.toggle('off',!audio.sfxOn);
  $('soundToggle').querySelector('.toggle-label').textContent=audio.sfxOn?'SOUND ON':'SOUND OFF';
});
document.addEventListener('visibilitychange',()=>{
  if(audio.ctx)document.hidden?audio.ctx.suspend():audio.ctx.resume();
});

try{
  initScene();
  setSpin(0,0);setAim(0);setPower(0);
  setSelectedChoices('ruleChoice','mode',selection.mode);
  setSelectedChoices('playerChoice','player',selection.opponent);
}catch(error){
  console.error(error);
  ui.sceneHint.textContent='3D表示を起動できませんでした。WebGL対応のブラウザで開いてください。';
  $('startButton').disabled=true;
}
