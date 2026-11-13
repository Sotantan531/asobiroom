const parts=[
 ['barrel','バレル',['ストレート','トルピード','ボム'],'#c7cfd7'],
 ['flight','フライト',['スタンダード','シェイプ','カイト','スリム'],'#ff7745'],
 ['shaft','シャフト',['ミディアム','ショート','ロング'],'#657786'],
 ['tip','チップ',['スタンダード','ショート','ロングテーパー'],'#59636b']
];
function readKit(){
  let saved={};
  try{saved=JSON.parse(localStorage.getItem('flightline-kit'))||{}}catch{}
  const kit={weight:Math.min(26,Math.max(14,Number(saved.weight)||20)),volume:Math.min(1,Math.max(0,Number.isFinite(saved.volume)?saved.volume:.5))};
  for(const [key,,shapes,color] of parts){
    kit[key]=shapes.includes(saved[key])?saved[key]:shapes[0];
    kit[key+'Color']=/^#[0-9a-f]{6}$/i.test(saved[key+'Color'])?saved[key+'Color']:color;
  }
  return kit;
}
const kit=readKit();
function storeKit(){try{localStorage.setItem('flightline-kit',JSON.stringify(kit))}catch{}}
function workshop(){
  return '<div class="workshop"><svg id="kitView" viewBox="-100 -35 200 70" aria-label="マイダーツのプレビュー"></svg><label>バレル重量 <output id="grams">'+kit.weight+' g</output><input id="weight" type="range" min="14" max="26" value="'+kit.weight+'"></label><p>重いほど少し低く飛びます。形状と色は見た目に反映されます。</p>'+parts.map(([key,title,shapes])=>'<div class="part"><label for="part-'+key+'">'+title+'</label><select id="part-'+key+'">'+shapes.map(v=>'<option '+(v===kit[key]?'selected':'')+'>'+v+'</option>').join('')+'</select><input type="color" id="color-'+key+'" aria-label="'+title+'の色" value="'+kit[key+'Color']+'"></div>').join('')+'<label>効果音の音量 <output id="vol"></output><input id="volume" type="range" min="0" max="100" value="'+Math.round(kit.volume*100)+'"></label></div>';
}
function wireWorkshop(){
  function preview(){playerMesh=dartMesh(kit);$('kitView').innerHTML=dartImage([49,0,depth],[.98,-.06,.16],false,.5);storeKit()}
  for(const [key] of parts){
    $('part-'+key).onchange=e=>{kit[key]=e.target.value;preview()};
    $('color-'+key).oninput=e=>{kit[key+'Color']=e.target.value;preview()};
  }
  $('weight').oninput=e=>{kit.weight=+e.target.value;$('grams').textContent=kit.weight+' g';storeKit()};
  function volume(){kit.volume=+$('volume').value/100;$('vol').textContent=Math.round(kit.volume*100)+'%';storeKit()}
  $('volume').oninput=volume;$('volume').onchange=()=>{unlockSound();impactSound({n:20,m:2})};volume();preview();
}
let audioContext;
function unlockSound(){
  if(!kit.volume)return;
  try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audioContext||=new Audio();if(audioContext.state!=='running')audioContext.resume().catch(()=>{})}catch{}
}
function note(freq,end,delay,duration,type,level){
  if(!audioContext||audioContext.state!=='running'||!kit.volume)return;
  const t=audioContext.currentTime+delay,osc=audioContext.createOscillator(),amp=audioContext.createGain();
  osc.type=type;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(end,t+duration);
  amp.gain.setValueAtTime(.0001,t);amp.gain.exponentialRampToValueAtTime(Math.max(.0002,level*kit.volume),t+.005);amp.gain.exponentialRampToValueAtTime(.0001,t+duration);
  osc.connect(amp);amp.connect(audioContext.destination);osc.start(t);osc.stop(t+duration+.015);osc.onended=()=>{osc.disconnect();amp.disconnect()};
}
function impactSound(h){
  note(h.n?235:130,65,0,.09,'triangle',.43);
  const tones=h.n===25?(h.m===2?[740,1110,1480]:[660,990,1320]):h.m===3?[523,659,988]:h.m===2?[440,660]:h.n?[360]:[];
  tones.forEach((f,i)=>{
    note(f,f*1.01,.02+i*.055,.18,'triangle',.23);
    note(f*2,f*2,.025+i*.055,.09,'square',.045);
  });
  if(h.n===25)note(98,49,.04,.28,'sine',.36);
}
function awardSound(name){
  const root=[392,440,349,466,294,415,523,587][Object.keys(palette).indexOf(name)]||440;
  [0,4,7,12,16,19].forEach((n,i)=>{const f=root*2**(n/12);note(f,f,.24+i*.095,i===5?.48:.16,'triangle',.22)});
  [0,3,6].forEach(i=>note(root/4,root/8,.22+i*.09,.13,"triangle",.32));
  [0,4,7].forEach(n=>note(root*2**(n/12),root*2**(n/12),.73,.48,'sine',.1));
}
function arcadeCue(kind){
  const melody={start:[392,494,587,784],turn:[440,660],draw:[523,440,392],finish:[523,659,784,1047,988,1047]}[kind];
  melody.forEach((f,i)=>{
    const beat=kind==='finish'?.125:.075,last=i===melody.length-1;
    note(f,f,i*beat,last?.35:.1,'square',.075);
    note(f/2,f/2,i*beat,last?.4:.13,'triangle',.24);
  });
}
