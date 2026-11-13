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
  for (const s of switches) place(s.x,s.z);
  for (const [x,z] of [[15,6],[14,9],[16,13],[15,19],[8,10],[22,10],[6,19],[24,17],[15,25],[18,34],[32,10],[31,22],[7,33]]) place(x+.5,z+.5);
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
