let curtain, finaleBus;
const endingThemes = {
 clear: {label:'クリア！', icon:'★', type:'triangle', notes:[[523,0,.15],[659,.15,.15],[784,.30,.22],[1047,.55,.55],[659,.55,.55]]},
 bomb: {label:'ドボン！', icon:'××', type:'sawtooth', notes:[[165,0,.17],[110,.17,.22],[65,.38,.48]]},
 timeout: {label:'時間切れ！', icon:'◷', type:'sine', notes:[[880,0,.09],[880,.23,.09],[440,.46,.55]]}
};
function clearFinale(){
 if(curtain?.open)curtain.close();
 curtain?.remove();
 curtain=null;
 if(finaleBus){finaleBus.disconnect();finaleBus=null}
}
function showFinale(kind,context){
 clearFinale();
 const theme=endingThemes[kind];
 const effect=document.createElement('dialog');
 effect.className='finale outcome-'+kind;
 effect.setAttribute('aria-labelledby','finale-title');
 effect.addEventListener('close',()=>effect.remove(),{once:true});
 const badge=document.createElement('div');
 badge.className='finale-badge';
 const icon=document.createElement('i'),label=document.createElement('b');
 icon.setAttribute('aria-hidden','true');icon.textContent=theme.icon;label.id='finale-title';
 label.textContent=kind==='bomb'?'ゲームオーバー':theme.label;
 const detail=document.createElement('p');
 detail.textContent=el('result').querySelector('p').textContent;
 const done=document.createElement('button');done.type='button';done.textContent='解答盤に戻る';done.className='action';
 done.onclick=()=>{clearFinale();el('start').focus({preventScroll:true})};
 const brand=document.querySelector('header .room-brand').cloneNode(true);
 badge.append(brand,icon,label,detail,done);effect.append(badge);
 if(kind!=='timeout'){
  const pieces=kind==='clear'?36:16;
  for(let i=0;i<pieces;i++){
   const bit=document.createElement('span');
   const angle=i*2*Math.PI/pieces;
   bit.style.setProperty('--x',Math.cos(angle)*(24+Math.random()*27)+'vmin');
   bit.style.setProperty('--y',Math.sin(angle)*(18+Math.random()*24)+'vmin');
   bit.style.setProperty('--rot',Math.round(Math.random()*360)+'deg');
   bit.style.setProperty('--color',(kind==='clear'?['#ffdc40','#fff8c0','#ffad29']:['#ff7646','#ffdb6c','#ea5673'])[i%3]);
   effect.append(bit);
  }
 }
 document.body.append(effect);curtain=effect;
 effect.showModal();
 if(!context||context.state!=='running')return;
 const bus=context.createGain();bus.gain.value=.11;bus.connect(context.destination);finaleBus=bus;
 for(const [frequency,delay,length] of theme.notes){
  const t=context.currentTime+delay;
  const osc=context.createOscillator(),env=context.createGain();
  osc.type=theme.type;osc.frequency.value=frequency;
  if(kind==='bomb')osc.frequency.exponentialRampToValueAtTime(frequency*.52,t+length);
  env.gain.setValueAtTime(.001,t);env.gain.exponentialRampToValueAtTime(.75,t+.015);
  env.gain.exponentialRampToValueAtTime(.001,t+length);
  osc.connect(env);env.connect(bus);osc.start(t);osc.stop(t+length+.02);
 }
}
