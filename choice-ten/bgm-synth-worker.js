/* Original Dobon V4 synthesis, ported from the approved offline arrangements. No external audio files. */
function synth(key) {
  const sr=44100, normal=key==='normal', bpm=normal?157.5:168, beat=60/bpm, bar=4*beat, duration=normal?32*bar:30, N=Math.round(sr*duration);
  const L=new Float32Array(N), R=new Float32Array(N);
  let state=normal?92:531;
  const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return (state+0.5)/4294967296};
  const gaussian=()=>Math.sqrt(-2*Math.log(rand()))*Math.cos(2*Math.PI*rand());
  const pi=2*Math.PI, hz=m=>440*2**((m-69)/12), min=Math.min, max=Math.max, exp=Math.exp, sin=Math.sin;
  const cache=new Map();
  const wave=(d,fn)=>{const a=new Float32Array(Math.round(d*sr));for(let i=0;i<a.length;i++)a[i]=fn(i/sr,i,a.length);return a};
  const env=(t,d,a=.005,r=.025)=>min(1,t/a)*min(1,max(0,(d-1/sr-t)/r));
  const decay=(t,a,d)=>min(t/a,1)*exp(-t/d);
  const filters={
    a:[[.133811366392,.267622732784,.133811366392,-.617382014110,.362517126193],[1,-2,1,-1.667660799493,.739795092078]],
    b:[[.103105272487,.206210544975,.103105272487,-.902811435755,.374152856531],[1,-2,1,-1.845347200271,.859868716280]],
    c:[[.062131808895,.124263617790,.062131808895,-1.119396349601,.548649923214],[1,-2,1,-1.709349961863,.784252676924]],
    d:[[.156724780053,.313449560106,.156724780053,-.556478527821,.293517938064],[1,-2,1,-1.785818976944,.812507596342]],
    e:[[.224424534563,.448849069126,.224424534563,.618170675585,.406073823451],[1,-2,1,-.896897918467,.458880478695]],
    f:[[.075040790652,.150081581305,.075040790652,-1.017938756424,.504688241854],[1,-2,1,-1.698118855812,.772652834655]],
    g:[[.239692417686,.479384835372,.239692417686,-.035726672810,.252166225205],[1,-2,1,-1.647083038115,.714839546172]],
    h:[[.511432042330,-1.022864084660,.511432042330,-.767915775285,.277812394035]]
  };
  function noise(d,k) {
    const x=wave(d,gaussian);
    for(const [b0,b1,b2,a1,a2] of filters[k]){
      let z1=0,z2=0;
      for(let i=0;i<x.length;i++){const v=x[i],y=b0*v+z1;z1=b1*v-a1*y+z2;z2=b2*v-a2*y;x[i]=y}
    }
    return x;
  }
  function put(t,x,amp=1,pan=0){
    const offset=Math.round(t*sr), n=min(x.length,N-offset), l=amp*Math.sqrt((1-pan)/2), r=amp*Math.sqrt((1+pan)/2);
    for(let i=0;i<n;i++){L[offset+i]+=x[i]*l;R[offset+i]+=x[i]*r}
  }
  function cached(k,fn){if(!cache.has(k))cache.set(k,fn());return cache.get(k)}
  function click(high) {
    const f=high?2050:1450,d=.055,x=noise(d,normal?'a':'f');
    return wave(d,(t,i)=>normal?( .55*sin(pi*f*t)+.28*sin(pi*f*2.14*t)+.65*x[i])*exp(-t*95)*min(1,t/.0007):(sin(pi*f*t)+.45*sin(pi*f*1.63*t)+.5*x[i])*decay(t,.001,.009));
  }
  function bass(m,d){return cached('b'+m+':'+d,()=>wave(d,t=>{const p=pi*hz(m)*t;return normal?(sin(p)+.30*sin(2*p)+.14*sin(3*p))*env(t,d,.008,.035)*exp(-t*5):(sin(p)+.32*sin(2*p)+.22*sin(3*p)+.10*sin(5*p))*decay(t,.003,.095)*min((d-t)/.018,1)}))}
  function kick(){
    if(normal)return cached('k',()=>wave(.17,t=>sin(pi*(48*t+70*(1-exp(-t*35))/35))*exp(-t*22)*min(1,t/.002)));
    const x=noise(.22,'c');return wave(.22,(t,i)=>sin(pi*(52*t+65*.028*(1-exp(-t/.028))))*decay(t,.002,.052)+.18*x[i]*decay(t,.001,.009));
  }
  function pluck(m,d){return cached('p'+m+':'+d,()=>wave(d,t=>{const p=pi*hz(m)*t;return normal?(sin(p+.65*sin(p*2)*exp(-t*20))+.19*sin(2*p))*exp(-t*15)*env(t,d,.003,.025):(sin(p+1.5*sin(2*p)*exp(-t/.05))+.30*sin(2*p))*decay(t,.003,.065)*min((d-t)/.018,1)}))}
  function hat(open=false){const d=normal?.055:open?.12:.055,x=noise(d,normal?'h':'e');return wave(d,(t,i)=>x[i]*(normal?exp(-t*44)*env(t,d,.001,.014):decay(t,.001,open?.036:.012)))}
  function stab(m,d){return cached('s'+m+':'+d,()=>wave(d,t=>{const f=hz(m),p=pi*f*t;let x=0;for(let k=1;k<=(normal?5:6);k++)x+=sin(p*k+(normal?0:.18*sin(pi*5*t)))/k;return normal?x*env(t,d,.012,.055)*exp(-t*7):(x+.5*sin(p*1.006))*min(t/.012,1)*exp(-t/.13)*min((d-t)/.04,1)}))}
  function pad(m,d){return cached('a'+m+':'+d,()=>wave(d,t=>{const p=pi*hz(m)*t;return (sin(p)+.4*sin(p*1.003)+.2*sin(2*p))*env(t,d,.09,.12)}))}
  function snare(){const d=normal?.10:.16,x=noise(d,normal?'b':'d');return wave(d,(t,i)=>normal?(.6*x[i]+.3*sin(pi*175*t))*exp(-t*28)*env(t,d,.002,.01):(.65*x[i]+.28*sin(pi*178*t))*decay(t,.002,.041))}
  if(normal){
    const roots=[45,45,43,47], patterns=[[0,0,7,0,3,0,7,0],[0,0,5,0,7,0,3,0],[0,0,7,0,2,0,7,0],[0,0,6,0,5,0,2,0]];
    for(let b=0;b<32;b++){const section=b>>2,root=roots[b%4];
      for(let s=0;s<8;s++){const t=b*bar+s*beat/2;
        put(t,click(s%2===0),s%2===0?.26:.19,s%2===0?-.12:.12);
        if(s%2===0)put(t,bass(root,.25),.14);
        if(section>=1){if(s%2===1)put(t,bass(root+patterns[b%4][s],.16),.13);if(s===0||s===4)put(t,kick(),.20)}
        if(section>=2&&s%2)put(t,pluck(root+24+[0,7,3,10][(Math.floor(s/2)+b)%4],.13),.095,-.30);
        if(section>=3){put(t,hat(),s%2?.055:.032,.34);if(s===2||s===6)put(t,snare(),.10,.05)}
        if(section>=4&&[0,3,6].includes(s))for(const m of [root+12,root+19,root+24])put(t,stab(m,.18),.046,.20);
        if(section>=5&&[1,2,5,7].includes(s))put(t,pluck(root+36+[7,0,2,5][(s+b)%4],.12),.058,.35);
        if(section>=6){if(s===0||s===4)for(const m of [root+12,root+19])put(t,pad(m,beat*1.94),.042,-.24);if(s===3||s===7)put(t,kick(),.10)}
        if(section>=7&&[0,2,3,4,6,7].includes(s))put(t,stab(root+24+[0,0,7,3,0,5,7,2][s],.11),.055,-.08);
      }
    }
  }else{
    const step=beat/2,roots=[38,38,34,36,38,38,41,36],motifs=[[0,7,12,3,7,10,12,7],[0,12,7,3,12,7,10,3],[0,7,12,5,7,12,3,7],[0,7,10,12,7,5,10,7]];
    for(let k=0;k<=Math.floor(duration/step);k++){
      const t=k*step,b=k>>3,p=k%8,root=roots[b%8],phase=t<12?0:t<22?1:2;
      put(t,click(k%2===0),k%2===0?.115:.10,k%2===0?-.12:.12);
      put(t+.007,hat(p===3||p===7),p%2?.15:.095,.38);
      if(p%2===0||(phase&&p===7&&b%2))put(t,kick(),p===0||p===4?.48:.33);
      if(p===2||p===6)put(t,snare(),.26,-.08);
      if(p===7&&b%4===3)put(t+step/2,snare(),.18,.15);
      put(t,bass(root+[0,0,0,12,0,7,0,0][p],step*.90),p%2===0?.32:.24,-.08);
      put(t+.014,pluck(root+24+motifs[b%4][p],step*.95),p%2===0?.115:.085,-.32);
      if([0,3,6].includes(p)||(phase===2&&[1,5].includes(p))) (b%4!==2?[0,7,12]:[0,5,12]).forEach((v,j)=>put(t+.012,stab(root+12+v,.24),[.09,.115,.14][phase],[-.45,.18,.45][j]));
      if(phase>=1&&p%2)put(t+step*.48,hat(),.065,.52);
      if(phase===2)put(t+step*.50,click(false),.055,.18);
    }
  }
  // Short stereo reflections; use a snapshot for each tap as in the approved offline arrangement.
  for(const [delay,gain] of normal?[[.043,.075],[.087,.045]]:[[.071,.055],[.121,.035]]){
    const k=Math.floor(delay*sr);for(let i=N-1;i>=k;i--){L[i]+=R[i-k]*gain;R[i]+=L[i-k]*gain}
  }
  let peak=0;for(let i=0;i<N;i++){L[i]=Math.tanh(L[i]*(normal?1.65:1.3));R[i]=Math.tanh(R[i]*(normal?1.65:1.3));peak=max(peak,Math.abs(L[i]),Math.abs(R[i]))}
  const scale=(normal?.89:.92)/max(.01,peak);
  for(let i=0;i<N;i++){L[i]*=scale;R[i]*=scale}
  if(normal){const n=Math.floor(.012*sr);for(let i=0;i<n;i++){const f=i/(n-1);L[i]*=f;R[i]*=f;L[N-1-i]*=f;R[N-1-i]*=f}}
  else{
    state=37;
    const start=20*bar,endhit=30-beat,idx=Math.round(endhit*sr),nf=Math.round(.045*sr);
    [0,1,1.5,2,2.5,2.75].forEach((p,j)=>{const d=.12,x=noise(d,'b');put(start+p*beat,wave(d,(t,i)=>.70710678*(.13*x[i]+.055*sin(pi*(185*t-130*t*t)))*exp(-t*35)*(.65+j*.10)*env(t,d,.008,.008)),2,(-1)**j*.12)});
    for(let i=0;i<nf;i++){const f=1-i/(nf-1);L[idx-nf+i]*=f;R[idx-nf+i]*=f}L.fill(0,idx);R.fill(0,idx);
    const d=(N-idx)/sr,tail=t=>min(1,max(0,(d-1/sr-t)/.06)),attack=t=>1-exp(-t/.003);
    [38,50,57,62,65,69,74].forEach((m,i)=>put(endhit,wave(d,t=>{const p=pi*hz(m)*t;return (sin(p)+.35*sin(2*p)+.13*sin(3*p))*attack(t)*exp(-t/.12)*tail(t)*(i<2?.15:.065)}),Math.SQRT2,(i%3-1)*.22));
    put(endhit,wave(d,t=>.37*sin(pi*(45*t+65*.04*(1-exp(-t/.04))))*attack(t)*exp(-t/.095)*tail(t)),Math.SQRT2);
    const x=noise(d,'g');put(endhit,wave(d,(t,i)=>.18*x[i]*attack(t)*exp(-t/.075)*tail(t)),Math.SQRT2,.1);
    peak=0;for(let i=0;i<N;i++)peak=max(peak,Math.abs(L[i]),Math.abs(R[i]));const g=min(1,.95/max(.01,peak));for(let i=0;i<N;i++){L[i]*=g;R[i]*=g}
  }
  return {key,sr,channels:[L,R]};
}
self.onmessage=({data})=>{try{const result=synth(data.key);self.postMessage(result,result.channels.map(c=>c.buffer))}catch(error){self.postMessage({key:data.key,error:String(error)})}};
