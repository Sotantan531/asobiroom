const catalog={
 '01':{'301':'301','501':'501','701':'701','901':'901','1101':'1101','1501':'1501'},
 'CRICKET':{cr:'STANDARD CRICKET',cut:'CUT-THROAT'},
 'トレーニング':{cu:'COUNT-UP',eagle:'EAGLE’S EYE',center:'CENTER COUNT-UP',cc:'CRICKET COUNT-UP'},
 'PARTY':{multi:'MULTIPLE COUNT-UP',jack:'BULL JACKPOT'},
 'AI':{ladder:'CPU LADDER',duel:'501 CPU DUEL'},
 'MATCH':{medley:'3 LEG MEDLEY',series:'501 BEST OF 3'}
};
const names=Object.assign({},...Object.values(catalog));
const descriptions={
 cr:'15〜20とブルを3マーク。自分の陣地で加点し、全陣地を開いて同点以上なら勝利。',
 cut:'超過マークは相手に加点。全陣地を開き、同点以下で勝利。',
 eagle:'8ラウンド。アウターブル25点、インブル50点。ブル以外は0点。',
 center:'8ラウンド。中心からの距離で50〜600点。インブル600点、アウターブル500点、盤外は0点。',
 cu:'8ラウンドの合計得点を競います。',cc:'20から15、ブルの順に狙い、最終ラウンドは全対象が有効。',
 multi:'各ターンの1投目は等倍、2投目は2倍、3投目は3倍。8ラウンドの合計で勝負。',
 jack:'オリジナルの8ラウンド戦。ブルで共有ポットを獲得。通常のヒットでは自分に得点、その数字がポットにも貯まります。',
 ladder:'8ラウンドのカウントアップ。2ラウンドごとにCPUが1段階強くなります。',
 duel:'指定した難易度のCPUと501で対戦します。',
 medley:'501 → クリケット → 501。2レッグ先取。先攻はレッグごとに交代します。',
 series:'501で2レッグ先取。先攻はレッグごとに交代します。'
};
let rules={entry:'501',opponent:'cpu',out:'open',bull:'fat',bonus:[0,0]},draft;
let legs=[0,0],leg=0,first=0,pot=50;
const cricket=()=>mode==='cr'||mode==='cut';
const matchPlay=()=>['medley','series'].includes(rules.entry);
const solo=()=>rules.opponent==='solo';
const aiTurn=()=>player===1&&rules.opponent==='cpu';
const labelFor=p=>rules.opponent==='local'?'P'+(p+1):p?'CPU':'あなた';
const effectiveLevel=()=>mode==='ladder'?Math.min(6,level+Math.floor((round-1)/2)):level;
function currentMode(){
 if(rules.entry==='medley')return leg===1?'cr':'501';
 if(['duel','series'].includes(rules.entry))return '501';
 return rules.entry;
}
function pointsOf(h){return h.key==='SB'&&rules.bull==='split'?25:h.v}
function finishes(h){
 if(!h.n)return false;
 if(rules.out==='open')return true;
 if(h.m===2)return true;
 return rules.out==='master'&&(h.m===3||h.n===25);
}
function checkoutRoute(total,count){
 if(total<=0||total>60*count||count<=0)return [];
 const candidates=[{n:25,m:2,v:50,key:'DB'},{n:25,m:1,v:50,key:'SB'}];
 for(const m of [1,3,2])for(let n=20;n>0;n--)candidates.push({n,m,v:n*m,key:['','S','D','T'][m]+n});
 function find(rem,left){
   const last=candidates.find(h=>pointsOf(h)===rem&&finishes(h));
   if(last)return [last];
   if(left===1)return [];
   for(const h of candidates){
     const next=rem-pointsOf(h);
     if(next<=0||next>60*(left-1))continue;
     const tail=find(next,left-1);if(tail.length)return [h,...tail];
   }
   return [];
 }
 return find(total,count);
}
function trainingScore(h,x,y){
 if(mode==='cc')return ((round===8&&targets.includes(h.n))||targets[round-1]===h.n)?h.n*h.m:0;
 if(mode==='eagle')return h.n===25?h.m*25:0;
 if(mode==='center'){
   if(!h.n)return 0;if(h.n===25)return h.m===2?600:500;
   const diameter=2*Math.hypot(x,y)/scaleMM;
   for(const [max,score] of [[54.6,480],[65.9,400],[84.8,350],[109,200],[130.4,100],[150.2,80],[173.8,70],[196,60]])if(diameter<=max)return score;
   return 50;
 }
 if(mode==='multi')return pointsOf(h)*darts.length;
 if(mode==='jack'){
   if(h.n===25){const won=pot;pot=50;return won}
   pot+=h.n;return pointsOf(h);
 }
 return pointsOf(h);
}
function options(obj,current){return Object.entries(obj).map(([k,v])=>'<option value="'+k+'" '+(k===current?'selected':'')+'>'+v+'</option>').join('')}
function categoryOf(k){return Object.keys(catalog).find(c=>k in catalog[c])}
function selectField(id,label,choices,val){return '<label>'+label+'<select id="'+id+'">'+options(choices,val)+'</select></label>'}
function setup(resume=false){
 if(resume!==true)draft={...rules,bonus:[...rules.bonus],level};
 const cat=categoryOf(draft.entry);
 show('<h2>ゲーム設定</h2><div class="chooser">'+selectField('category','カテゴリー',Object.fromEntries(Object.keys(catalog).map(k=>[k,k])),cat)+selectField('gm','ゲーム',catalog[cat],draft.entry)+selectField('op','プレイ人数',{},'')+selectField('lv','CPUの難易度',Object.fromEntries(levels.map(([f,r],i)=>[i,f+' ／ Rt.'+r])),String(draft.level))+'</div><p id="modeInfo"></p><div class="setupLinks"><button id="ruleEdit">ルール・ハンデ</button><button id="kitOpen">ダーツ詳細設定</button></div><div class="buttons"><button onclick="closeModal()">戻る</button><button class="primary" id="start">対戦を開始</button></div>');
 function sync(){
  draft.entry=$('gm').value;const c=categoryOf(draft.entry);
  const ops=c==='AI'?{cpu:'CPU対戦'}:c==='トレーニング'||c==='PARTY'?{cpu:'CPU対戦',local:'ローカル2人',solo:'ひとり'}:{cpu:'CPU対戦',local:'ローカル2人'};
  $('op').innerHTML=options(ops,draft.opponent);draft.opponent=$('op').value;
  $('lv').disabled=draft.opponent!=='cpu';$('modeInfo').textContent=descriptions[draft.entry]||'持ち点をぴったり0にすると勝利。上がり方はルール設定で変更できます。';
 }
 $('category').onchange=()=>{$('gm').innerHTML=options(catalog[$('category').value],'');sync()};
 $('gm').onchange=sync;$('op').onchange=()=>{draft.opponent=$('op').value;sync()};$('lv').onchange=()=>draft.level=+$('lv').value;
 $('ruleEdit').onclick=ruleMenu;$('kitOpen').onclick=()=>openKit();sync();
 $('start').onclick=()=>{unlockSound();arcadeCue('start');rules={...draft,bonus:[...draft.bonus]};level=draft.level;closeModal();reset()};
}
function ruleMenu(){
 const zero=categoryOf(draft.entry)==='01'||['series','medley','duel'].includes(draft.entry);
 const bull=zero||['cu','multi','jack','ladder'].includes(draft.entry);
 show('<h2>ルール・ハンデ</h2><div class="chooser">'+(zero?selectField('outRule','01の上がり方',{open:'オープンアウト',double:'ダブルアウト',master:'マスターアウト'},draft.out):'')+(bull?selectField('bullRule','ブルの配点',{fat:'内外とも50点',split:'セパレート（25 / 50）'},draft.bull):'')+[0,1].filter(p=>!p||draft.opponent!=='solo').map(p=>'<label>'+(p?(draft.opponent==='cpu'?'CPU':'P2'):'P1')+' のハンデ<select id="bonus'+p+'">'+options(Object.fromEntries([0,10,25,50,75,100,150,200].map(v=>[v,v+' 点'])),String(draft.bonus[p]))+'</select></label>').join('')+'</div><p>ハンデは01では開始点から引き、加点ゲームでは開始点に足します。カットスロートでは開始点から引きます。</p><div class="buttons"><button id="ruleBack">ゲーム設定に戻る</button></div>');
 $('ruleBack').onclick=()=>{if($('outRule'))draft.out=$('outRule').value;if($('bullRule'))draft.bull=$('bullRule').value;draft.bonus=draft.bonus.map((v,i)=>$('bonus'+i)?+$('bonus'+i).value:v);setup(true)};
}
