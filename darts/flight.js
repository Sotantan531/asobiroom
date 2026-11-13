// All distances are in board drawing units. Positive Z points away from the thrower.
const depth=2400, handDepth=720, gravity=6600;
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(x,hi));
const norm=v=>{const length=Math.hypot(...v);return v.map(x=>x/length)};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function dartMesh(spec){
  const faces=[];
  function tube(profile,base){
    const slices=10;
    function point(r,s,i){const a=i*2*Math.PI/slices;return [r*Math.cos(a),r*Math.sin(a),s]}
    for(let j=1;j<profile.length;j++)for(let i=0;i<slices;i++){
      const [s,r]=profile[j-1],[t,q]=profile[j];
      faces.push({verts:[point(r,s,i),point(r,s,i+1),point(q,t,i+1),point(q,t,i)],base,shade:.62+.35*Math.cos(i*2*Math.PI/slices+1)});
    }
  }
  const tipEnd=spec.tip==='ショート'?13:spec.tip==='ロングテーパー'?24:18;
  const offset=tipEnd-18,shaftDelta=spec.shaft==='ロング'?10:spec.shaft==='ショート'?-10:0;
  tube([[0,.22],[tipEnd*.67,spec.tip==='ロングテーパー'?1.1:1.55],[tipEnd,2.3]],spec.tipColor);
  const profile=spec.barrel==='ボム'?[[18,2.3],[24,4.4],[30,4.6],[38,3.8],[53,2.35]]:
    spec.barrel==='トルピード'?[[18,2.3],[24,4.25],[33,4.15],[44,3.05],[53,2.35]]:[[18,2.3],[23,3.5],[48,3.5],[53,2.35]];
  tube(profile.map(([s,r])=>[s+offset,r]),spec.barrelColor);
  for(let s=26;s<47;s+=3){
    const i=profile.findIndex(([z])=>z>s),[a,r]=profile[i-1],[b,q]=profile[i];
    const radius=r+(q-r)*(s-a)/(b-a)+.08;
    tube([[s+offset,radius],[s+offset+.7,radius]],'#43505b');
  }
  tube([[53+offset,2.35],[58+offset,1.95],[79+offset+shaftDelta,1.45],[110+offset+shaftDelta,1.05]],spec.shaftColor);
  const outlines={
    'スタンダード':[[74,.7],[85,8.7],[95,13.3],[104,13.7],[112,5.2],[113,.7]],
    'シェイプ':[[74,.7],[88,9.2],[99,12.8],[106,9],[113,.7]],
    'カイト':[[74,.7],[97,13.5],[113,.7]],
    'スリム':[[74,.7],[88,6.5],[107,7],[113,.7]]
  };
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2+.43;
    const shape=outlines[spec.flight].map(([s,r])=>[s+offset+shaftDelta,r]);
    faces.push({verts:shape.map(([s,r])=>[Math.cos(a)*r,Math.sin(a)*r,s]),base:spec.flightColor,shade:[.87,1.12,.57,1][i]});
  }
  return faces;
}
let playerMesh=dartMesh(kit);
const rivalMesh=dartMesh({...kit,barrel:parts[0][2][0],flight:parts[1][2][0],shaft:parts[2][2][0],tip:parts[3][2][0],barrelColor:"#c5d2de",flightColor:"#62bbda",shaftColor:"#476276",tipColor:"#575f65"});
function dartImage(pos,direction,cpuDart,roll=0){
  const axis=norm(direction),right=norm(cross([0,1,0],axis)),up=cross(axis,right);
  const visible=(cpuDart?rivalMesh:playerMesh).map(face=>{
    let distance=0;
    const vertices=face.verts.map(([a,b,s])=>{
      const x=a*Math.cos(roll)-b*Math.sin(roll),y=a*Math.sin(roll)+b*Math.cos(roll);
      const p=pos.map((v,i)=>v+right[i]*x+up[i]*y-axis[i]*s);
      distance+=p[2];return (p[0]*depth/p[2]).toFixed(2)+','+(p[1]*depth/p[2]).toFixed(2);
    });
    const rgb=face.base.slice(1).match(/../g).map(c=>clamp(Math.round(parseInt(c,16)*face.shade),0,255));
    const color='rgb('+rgb.join(',')+')';
    return {z:distance/vertices.length,svg:'<polygon points="'+vertices.join(' ')+'" fill="'+color+'" stroke="'+color+'" stroke-width=".28"/>'};
  });
  return visible.sort((a,b)=>b.z-a.z).map(f=>f.svg).join('');
}
let flightFrame=0;
function boardPoint(e){
  const p=new DOMPoint(e.clientX,e.clientY).matrixTransform($('board').getScreenCTM().inverse());
  return {x:p.x,y:p.y,t:e.timeStamp};
}
function atHand(p){return [p.x*handDepth/depth,p.y*handDepth/depth,handDepth]}
function hold(p){
  const pos=atHand(p),dir=norm([-.075,-.25,1]);
  // The barrel is gripped about 35 units behind the tip.
  const tip=pos.map((v,i)=>v+dir[i]*35);
  $('moving').innerHTML=dartImage(tip,dir,false);
  return tip;
}
function animateFlight(seconds,cpuDart,sample){
  busy=true;
  const begin=performance.now();
  function frame(now){
    const u=clamp((now-begin)/(1000*seconds),0,1);
    const {pos,direction}=sample(u);
    const image=dartImage(pos,direction,cpuDart,.15*u);
    if(u<1){$('moving').innerHTML=image;flightFrame=requestAnimationFrame(frame);return}
    $('moving').innerHTML='';
    if(Math.hypot(pos[0],pos[1])<204)$('pins').insertAdjacentHTML('beforeend',image);
    busy=false;play(pos[0],pos[1]);
  }
  flightFrame=requestAnimationFrame(frame);
}
function launch(start,velocity,seconds,cpuDart){
  animateFlight(seconds,cpuDart,u=>{
    const t=u*seconds;
    return {pos:[start[0]+velocity[0]*t,start[1]+velocity[1]*t+gravity*t*t/2,start[2]+velocity[2]*t],
      direction:[velocity[0],velocity[1]+gravity*t,velocity[2]]};
  });
}
function swipeFlight(start,vx,vy){
  const speed=Math.hypot(vx,vy);
  const power=speed/(speed+1.2);
  // Heavier barrels leave the hand a little slower for the same gesture.
  const forward=(6200+3100*power)*Math.sqrt(20/kit.weight);
  const duration=(depth-start[2])/forward;
  const steer=370/(1+speed/3.5);
  // Start along the release point's camera ray. Add the swipe impulse
  // and an upward launch angle; gravity alone bends the path after release.
  const velocity=[
    start[0]/start[2]*forward+vx*steer,
    start[1]/start[2]*forward+vy*steer-gravity*.23/2,
    forward
  ];
  launch(start,velocity,duration,false);
}
function cpuFlight(x,y){
  const start=[12,48,handDepth],t=.32;
  launch(start,[(x-start[0])/t,(y-start[1])/t-gravity*t/2,(depth-handDepth)/t],t,true);
}
function releaseSpeed(samples){
  const end=samples.at(-1),cutoff=end.t-90;
  let i=samples.length-1;
  while(i>0 && samples[i-1].t>cutoff)i--;
  const after=samples[i],before=samples[Math.max(0,i-1)];
  const startTime=Math.max(cutoff,before.t);
  const fraction=clamp((startTime-before.t)/Math.max(1,after.t-before.t),0,1);
  const elapsed=Math.max(32,end.t-startTime);
  return ['x','y'].map(axis=>{
    const start=before[axis]+fraction*(after[axis]-before[axis]);
    return (end[axis]-start)/elapsed;
  });
}
function installThrow(){
  const stage=$('stage');
  stage.onpointerdown=e=>{
    if(over||busy||aiTurn()||gesture||e.button!==0)return;
    $('swipeHint').textContent='狙う方向にスワイプして投げる';unlockSound();const p=boardPoint(e);gesture={id:e.pointerId,samples:[p]};stage.setPointerCapture(e.pointerId);hold(p);
  };
  stage.onpointermove=e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    const p=boardPoint(e);gesture.samples.push(p);hold(p);
  };
  stage.onpointerup=e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    const samples=gesture.samples,p=boardPoint(e),first=samples[0];gesture=null;samples.push(p);
    if(Math.hypot(first.x-p.x,first.y-p.y)<8){$('moving').innerHTML='';return}
    const [vx,vy]=releaseSpeed(samples);
    // Board units per millisecond, independent of the displayed board size.
    if(Math.hypot(vx,vy)<.45){
      $('moving').innerHTML='';
      $('swipeHint').textContent='投球キャンセル · もう少し速く払ってください';
      return;
    }
    swipeFlight(hold(p),vx,vy);
  };
  stage.onlostpointercapture=stage.onpointercancel=e=>{
    if(gesture?.id===e.pointerId){gesture=null;$('moving').innerHTML=''}
  };
}
