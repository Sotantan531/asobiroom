// A plate's animation and damage share the same simulation clock.
const trapPeriod = 8;
const warningStart = 4.8;
const riseStart = 6.2;
let plates = [];
function trapPhase(plate, time) {
  const t = (time + plate.offset) % trapPeriod;
  const height = Math.max(0, Math.min(1, (t-riseStart)/.22, (7.75-t)/.38));
  return {height, warning: t >= warningStart && t < riseStart, dangerous: height > .23};
}
function resetTraps(switches) {
  plates = [];
  function place(x,z) {
    if (!free(x,z) || plates.some(s=>s.x===x && s.z===z)) return;
    plates.push({x,z,offset:(plates.length*1.87)%trapPeriod});
  }
  for(const [i,cells] of trapCrossings.entries()){const offset=(i*1.87)%trapPeriod;for(const [x,z] of cells){place(x+.5,z+.5);plates.at(-1).offset=offset;}}
}
function tickTraps(player,time) {
  let warning = false;
  for (const s of plates) {
    if (Math.abs(s.x-player.x)>.51 || Math.abs(s.z-player.z)>.51) continue;
    const phase = trapPhase(s,time);
    if (phase.dangerous) return 'hit';
    if (phase.warning || phase.height>0) warning = true;
  }
  return warning?'warning':'safe';
}
