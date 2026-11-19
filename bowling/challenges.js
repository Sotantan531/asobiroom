export const CHALLENGES=Object.freeze([
 {title:'10番ピンを狙え',pins:[10],tip:'右奥の1本。角度をつけすぎず、右端を狙おう。'},
 {title:'7番ピンを狙え',pins:[7],tip:'左奥の1本。立ち位置から球筋を組み立てよう。'},
 {title:'ベビースプリット 3–10',pins:[3,10],tip:'3番ピンの外側を薄く狙い、10番へつなげよう。'},
 {title:'2–7 スプリット',pins:[2,7],tip:'2番の外側を薄く当てて、奥の7番を狙おう。'},
 {title:'4–6 スプリット',pins:[4,6],tip:'片側を横へ飛ばす、難しいカバー。'},
 {title:'6–7–10 ビッグスプリット',pins:[6,7,10],tip:'ピンを横へ走らせて、反対側へつなげよう。'},
 {title:'7–10 スプリット',pins:[7,10],tip:'最難関。キックバックからのピンの跳ね返りが鍵。'},
 {title:'フィナーレ・ストライク',pins:[1,2,3,4,5,6,7,8,9,10],tip:'最後は10本。ポケットへ鋭く入れよう。'}
]);
export class ChallengeRun{
 constructor(kind='ladder',random=Math.random){this.kind=['ladder','random','streak'].includes(kind)?kind:'ladder';this.random=random;this.index=0;this.tries=0;this.cleared=0;this.streak=0;this.done=false;this.results=[];this.questions=[...CHALLENGES];if(this.kind==='random')for(let i=this.questions.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.questions[i],this.questions[j]]=[this.questions[j],this.questions[i]];}this.current=this.pick();}
 pick(){return this.kind==='streak'?{title:'連続ストライク',pins:[1,2,3,4,5,6,7,8,9,10],tip:'1投でも10本を倒しきれなければ終了。連続記録へ挑戦。'}:(this.kind==='random'?this.questions[this.index]:CHALLENGES[this.index]);}
 resolve(ids){if(this.done)throw Error('Challenge complete');const hit=new Set(ids),success=this.current.pins.every(id=>hit.has(id));this.tries++;this.results.push({title:this.current.title,success,pins:[...this.current.pins],knocked:[...hit]});if(this.kind==='streak'){if(success)this.streak++;else this.done=true;this.cleared=this.streak;}else if(this.kind==='random'){if(success)this.cleared++;this.index++;this.done=this.index>=5;this.tries=0;}else if(success){this.cleared++;this.index++;this.tries=0;this.done=this.index===CHALLENGES.length;}else if(this.tries>=3)this.done=true;if(!this.done)this.current=this.pick();return {success,done:this.done,cleared:this.cleared};}
 get progress(){if(this.done)return this.kind==='streak'?this.streak+'連続で終了':this.cleared+' / '+(this.kind==='random'?5:8)+'クリア';return this.kind==='streak'?this.streak+'連続':this.kind==='random'?'問題 '+(this.index+1)+' / 5':'ステージ '+(this.index+1)+' / '+CHALLENGES.length+' · 残り'+(3-this.tries)+'投';}
}
