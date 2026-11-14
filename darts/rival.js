// Spread is a standard deviation in board units, shared by scoring and checkout shots.
// Slightly tighter grouping at every rating, without making low-level CPUs perfect.
const scoringSpread=[64.5,27.1,20.5,17,14.8,11.1,8];
const cricketSpread=[48,32,22.9,18.5,15.8,12.1,9.3];
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
  // With split bull, T20 is the highest scoring standard target (60 > 50).
  // Bull-focused training modes still aim at bull by design.
  const preferT20=rules.bull==='split'&&!['eagle','center','jack'].includes(mode);
  let target=preferT20?[20,3]:[25,2],spread=scoringSpread[effectiveLevel()];
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
    const remaining=scores[1],shotsLeft=3-darts.length;
    const path=checkoutRoute(remaining,shotsLeft);
    // Prefer a legal T20-first checkout in split-bull games; never aim at T20
    // if it would bust or prevent an available finish.
    if(preferT20&&remaining>60&&shotsLeft>1&&checkoutRoute(remaining-60,shotsLeft-1).length)
      target=[20,3];
    else if(path.length)target=[path[0].n,path[0].m];
    else if(remaining<50)target=[Math.min(20,remaining-1),1];
  }
  cpuFlight(...groupAround(targetCenter(...target),spread));
}
