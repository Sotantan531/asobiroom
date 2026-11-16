// Ten-pin scoring: unresolved strike/spare bonuses remain null.
export function totals(frames){const rolls=frames.flat(),out=[];let cursor=0,total=0,known=true;
 for(let i=0;i<frames.length&&i<10;i++){const f=frames[i];if(i===9){const done=f.length>=2&&(f[0]+f[1]<10||f.length===3);if(!done){out.push(null);break;}total+=f.reduce((a,b)=>a+b,0);out.push(known?total:null);break;}
 let add=null;if(f[0]===10){if(rolls.length>cursor+2)add=10+rolls[cursor+1]+rolls[cursor+2];cursor++;}
 else {if(f.length>=2){if(f[0]+f[1]===10){if(rolls.length>cursor+2)add=10+rolls[cursor+2];}else add=f[0]+f[1];}cursor+=f.length;}
 if(add===null)known=false;else total+=add;out.push(known?total:null);
 }return out;}
export class Scorecard{
 constructor(){this.frames=[[]];this.done=false;}
 get frame(){return this.frames.length-1;}get current(){return this.frames.at(-1);}
 get needsFreshRack(){const f=this.current;return !f.length||(this.frame===9&&(f.at(-1)===10||(f.length===2&&f[0]+f[1]===10)));}
 get remaining(){return this.needsFreshRack?10:10-this.current.slice(this.frame===9&&this.current[0]===10?1:0).reduce((a,b)=>a+b,0);}
 add(pins){if(this.done||!Number.isInteger(pins)||pins<0||pins>this.remaining)throw Error('Invalid pin count');const f=this.current;f.push(pins);if(this.frame<9){if(pins===10||f.length===2)this.frames.push([]);}else if(f.length>=2&&(f[0]+f[1]<10||f.length===3))this.done=true;return this.done;}
 get total(){return totals(this.frames).filter(n=>n!==null).at(-1)||0;}
}
export function swipeShot(samples,width,height){
 if(samples.length<3)return null;const first=samples[0],last=samples.at(-1),dy=first.y-last.y;
 if(dy<height*.10)return null;
 // The first half gives the initial line; the bend relative to that line gives side roll.
 const mid=samples.find(p=>first.y-p.y>=dy*.48)||samples[Math.floor(samples.length/2)];
 const progress=Math.max(1,first.y-mid.y),initial=(mid.x-first.x)/progress;
 const expected=first.x+initial*dy;
 const bend=(last.x-expected)/width;
 const recent=samples.filter(p=>last.t-p.t<=120),a=recent[0]||first;
 const speed=Math.hypot(last.x-a.x,last.y-a.y)/Math.max(32,last.t-a.t)/height;
 if(speed<.00032)return null;
 return {angle:Math.max(-.11,Math.min(.11,initial*.13)),spin:Math.max(-1,Math.min(1,bend*5)),speed:Math.max(5.2,Math.min(9.6,5+speed*1500))};
}
