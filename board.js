const scaleMM = 170 / (393.7 / 2);
const boardSize = {
  innerBull: 15.9 * scaleMM / 2, bull: 44.5 * scaleMM / 2,
  tripleIn: (123.8 - 19.1) * scaleMM, tripleOut: 123.8 * scaleMM,
  doubleIn: 170 - 19.1 * scaleMM, edge: 170
};
const bands = [
  ['I',boardSize.bull,boardSize.tripleIn,1], ['T',boardSize.tripleIn,boardSize.tripleOut,3],
  ['O',boardSize.tripleOut,boardSize.doubleIn,1], ['D',boardSize.doubleIn,170,2]
];
function drawBoard(){
  let svg='<defs><radialGradient id="rim"><stop offset=".8" stop-color="#171e24"/><stop offset=".96" stop-color="#2b373f"/><stop offset="1" stop-color="#10151a"/></radialGradient><pattern id="holes" width="4.1" height="3.7" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.3" r=".88" fill="#041017" opacity=".5"/></pattern></defs>'+circle(205,'url(#rim)','#5d7380');
  nums.forEach((n,i)=>{
    const ink=i%2?'#53dfb8':'#ff6855';
    svg+='<path class="led rim" data-n="'+n+'" style="--delay:'+i*22+'ms" fill="'+ink+'" d="'+wedge(194.8,200.8,i)+'"/>';
    for(let j=-2;j<=2;j++){
      const [x,y]=polar(198,(i+j*.15)*rad);
      svg+='<circle class="led lamp" data-n="'+n+'" cx="'+x+'" cy="'+y+'" r="1.65" fill="#c9e5ec" style="--delay:'+(i*24+j*8+16)+'ms"/>';
    }
    for(const [key,lo,hi,m] of bands){
      const fill=m===1?(i%2?'#a9bdc0':'#30414b'):ink;
      svg+='<path id="led-'+key+n+'" class="led" data-n="'+n+'" data-score="'+n*m+'" style="--delay:'+(i*22+lo*.7)+'ms" fill="'+fill+'" stroke="#152028" stroke-width="1.4" d="'+wedge(lo,hi,i)+'"/>';
    }
    const [x,y]=polar(184,i*rad);
    svg+='<text x="'+x+'" y="'+(y+6)+'" text-anchor="middle" fill="#f1f7f5" font-family="Arial" font-size="17" font-weight="700">'+n+'</text>';
  });
  for(const [key,r,color] of [['SB',boardSize.bull,'#52ddb3'],['DB',boardSize.innerBull,'#313d48']])
    svg+='<circle class="led" id="led-'+key+'" data-n="25" data-score="50" r="'+r+'" fill="'+color+'" stroke="#152028"/>';
  $('board').innerHTML=svg+circle(170,'url(#holes)')+'<g id="pins"></g><g id="moving"></g>';
}
function hit(x,y){
  const r=Math.hypot(x,y);
  if(r>170)return {n:0,m:0,v:0,label:'MISS',key:''};
  if(r<boardSize.bull){
    const inner=r<boardSize.innerBull;
    return {n:25,m:inner?2:1,v:50,label:inner?'D-BULL':'S-BULL',key:inner?'DB':'SB'};
  }
  const n=nums[(Math.floor(Math.atan2(x,-y)/rad+.5)+20)%20];
  const [key,,,m]=bands.find(b=>r<b[2])||bands[3];
  return {n,m,v:n*m,label:['','S','D','T'][m]+n,key:key+n};
}
function checkout(){
 document.querySelectorAll('.checkout').forEach(el=>el.classList.remove('checkout'));
 const path=is01()&&!over?checkoutRoute(scores[player],3-darts.length):[];
 if(path.length){
  const t=path[0],keys=t.n===25?(t.key==='DB'&&rules.bull==='fat'&&(path.length>1||rules.out!=='double')?['SB','DB']:[t.key]):t.m===1?['I'+t.n,'O'+t.n]:[t.key];
  keys.forEach(k=>$('led-'+k)?.classList.add('checkout'));
 }
 $('out').textContent=path.length?'上がり目　'+path.map(h=>h.key).join(' → '):'';
}
const palette={
 'LOW TON':['#247eff','#a9d7ff'],'HIGH TON':['#ffd132','#fff4a3'],'NICE ONE':['#22c46e','#b9ffd3'],
 'HAT TRICK':['#f64251','#ffc1c5'],'THREE IN THE BLACK':['#090c13','#ccd4ec'],
 'THREE IN A BED':['#9c52fa','#e8c8ff'],'TON 80':['#ff812a','#ffdda4'],'WHITE HORSE':['#f9ffff','#91eaff']
};
function awardFor(hits,mode,earned){
  const three=hits.length===3,all=test=>three&&hits.every(test),first=hits[0];
  if(all(h=>h.key==='DB'))return 'THREE IN THE BLACK';
  if(all(h=>h.key==='T20'))return 'TON 80';
  if(mode==='cr'&&all(h=>h.n>=15&&h.n<=20&&h.m===3&&h.available)&&new Set(hits.map(h=>h.n)).size===3)return 'WHITE HORSE';
  if(all(h=>h.n===25))return 'HAT TRICK';
  if(all(h=>h.n!==25&&h.m>=2&&h.key===first.key))return 'THREE IN A BED';
  if(mode!=='cr'&&earned>=151)return 'HIGH TON';
  if(mode!=='cr'&&earned>=100)return 'LOW TON';
  if(hits.filter(h=>h.n===25).length===1)return 'NICE ONE';
  return '';
}
function clearLights(){
  document.querySelectorAll('.rim-hit').forEach(el=>el.classList.remove('rim-hit'));
  $('stage').classList.remove('celebrate');
  $('award').textContent='';
  document.querySelectorAll('.struck').forEach(el=>el.classList.remove('struck'));
}
function lightHit(h){
  document.querySelectorAll('.struck').forEach(el=>el.classList.remove('struck'));
  document.querySelectorAll('.rim-hit').forEach(el=>el.classList.remove('rim-hit'));
  if(h.n){
    const selector=h.n===25?'.rim,.lamp':'.rim[data-n="'+h.n+'"],.lamp[data-n="'+h.n+'"]';
    document.querySelectorAll(selector).forEach(el=>{el.getBoundingClientRect();el.classList.add('rim-hit')});
  }
  const el=$('led-'+h.key);
  if(el){el.getBoundingClientRect();el.classList.add('struck')}
}
function celebrate(name){
  const stage=$('stage'), [color,edge]=palette[name];
  stage.style.setProperty('--award',color);stage.style.setProperty('--shine',edge);
  $('award').textContent=name;stage.classList.add('celebrate');
}

function cricketState(n){
  if(mode==='cc')return (round===8?targets.includes(n):n===targets[round-1])?'live':'off';
  if(!cricket())return '';
  if(!targets.includes(n))return 'off';
  const you=marks[0][n]===3,cpuOwn=marks[1][n]===3;
  if(you&&cpuOwn)return 'closed';
  return you?'you':cpuOwn?'cpu':'live';
}
function cricketLights(){
  document.querySelectorAll('#board [data-n]').forEach(el=>{
    const state=cricketState(Number(el.dataset.n));
    if(state)el.dataset.territory=state;
    else delete el.dataset.territory;
  });
}
