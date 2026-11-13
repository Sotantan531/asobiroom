// Spread is a standard deviation in board units, shared by scoring and checkout shots.
const scoringSpread=[72.4,31.1,23.9,20.1,17.7,13.4,9.6];
const cricketSpread=[54.1,36.7,26,21.3,18.4,14.5,11.6];
function groupAround(center,spread){
  const radius=Math.sqrt(-2*Math.log(1-Math.random()))*spread;
  const angle=2*Math.PI*Math.random();
  return [center[0]+radius*Math.cos(angle),center[1]+radius*Math.sin(angle)*1.06];
}
function targetCenter(n,m){
  if(n===25)return [m===1&&is01()&&rules.bull==='split'?(boardSize.innerBull+boardSize.bull)/2:0,0];
  const radius=m===3?(boardSize.tripleIn+boardSize.tripleOut)/2:
    m===2?(boardSize.doubleIn+boardSize.edge)/2:132;
  return polar(radius,nums.indexOf(n)*rad);
}
function cpu(){
  if(over||!aiTurn())return;
  let target=[25,2],spread=scoringSpread[effectiveLevel()];
  if(cricket()||mode==='cc'){
    spread=cricketSpread[effectiveLevel()];
    let n=targets[round-1]||20;
    if(cricket()){
      const open=targets.find(v=>(marks[1][v]||0)<3);
      const scoring=targets.find(v=>marks[1][v]===3&&(marks[0][v]||0)<3);
      n=((mode==='cut'?scores[1]>scores[0]:scores[1]<scores[0])&&scoring)||open||scoring;
    }
    target=[n,n===25?2:3];
  }else if(is01()){
    const remaining=scores[1],path=checkoutRoute(remaining,3-darts.length);
    if(path.length)target=[path[0].n,path[0].m];
    else if(remaining<50)target=[Math.min(20,remaining-1),1];
  }
  cpuFlight(...groupAround(targetCenter(...target),spread));
}
