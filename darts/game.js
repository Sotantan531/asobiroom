'use strict';
const $=id=>document.getElementById(id), nums=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5], targets=[20,19,18,17,16,15,25];
const levels=[['C',2,42,1.4],['CC',4,52,1.8],['B',6,62,2.2],['BB',8,72,2.6],['A',10,82,3],['AA',14,105,3.85],['SA',18,132,4.85]];
let mode='501',level=2,round,player,scores,marks,darts,log,points,startScore,over,timer,gesture,busy;
let countedDartsMatch=false;
const is01=()=>!isNaN(Number(mode)), cap=()=>cricket()?20:is01()?(+mode>=701?20:15):8;
function polar(r,a){return [r*Math.sin(a),-r*Math.cos(a)]}
const rad=Math.PI/10;
function wedge(inner,outer,i){let a=(i-.5)*rad,b=a+rad;return 'M'+polar(inner,a)+' L'+polar(outer,a)+' A'+outer+' '+outer+' 0 0 1 '+polar(outer,b)+' L'+polar(inner,b)+' A'+inner+' '+inner+' 0 0 0 '+polar(inner,a)+'Z'}
function circle(r,fill,stroke='none'){return '<circle r="'+r+'" fill="'+fill+'" stroke="'+stroke+'"/>'}
function reset(){countedDartsMatch=false;leg=0;legs=[0,0];first=0;beginLeg()}
function beginLeg(){
 clearTimeout(timer);cancelAnimationFrame(flightFrame);clearLights();
 rankedThrows=[0,0];
 mode=currentMode();round=1;player=first;pot=50;
 scores=rules.bonus.map(v=>is01()?Math.max(2,+mode-v):mode==='cut'?-v:v);
 marks=[{},{}];darts=[];log=[];points=[];startScore=scores[player];over=false;busy=false;gesture=null;
 drawBoard();$('flash').textContent='';render();if(aiTurn())timer=setTimeout(cpu,550);
}
function render(){
 checkout();cricketLights();
 const target=round===8?'ALL':targets[round-1]===25?'BULL':targets[round-1];
 $('mode').textContent=names[mode];
 $('round').textContent=(matchPlay()?'LEG '+(leg+1)+' · ':'')+'R '+round+' / '+cap();
 $('turn').textContent=(over?'ゲーム終了':aiTurn()?'CPUが投球中':labelFor(player)+'のターン')+(mode==='cc'?'　狙い：'+target:mode==='jack'?'　ポット '+pot:'');
 $('ammo').textContent=Array.from({length:3},(_,i)=>i<darts.length?'●':'○').join('　')+'　 DARTS';
 $('scores').innerHTML=scores.slice(0,solo()?1:2).map((v,p)=>'<div class="score '+(p===player?'active':'')+'"><div class="who"><span class="pin">P'+(p+1)+'</span><div><small>'+(matchPlay()?legs[p]+' LEG':'PLAYER 0'+(p+1))+'</small><b>'+labelFor(p)+(p&&rules.opponent==='cpu'?' · '+levels[effectiveLevel()][0]:'')+'</b></div></div><strong>'+v+'</strong></div>').join('');
 $('marks').innerHTML=cricket()?'<div class="legend"><b>● '+labelFor(0)+'</b><b>● '+labelFor(1)+'</b></div>'+targets.map(n=>'<div class="markrow" data-territory="'+cricketState(n)+'"><span>'+mark(0,n)+'</span><b>'+(n===25?'BULL':n)+'</b><span>'+mark(1,n)+'</span></div>').join(''):'';
 $('history').innerHTML=log.length?log.slice(-4).reverse().map(t=>'<div class="record"><small>'+t[0]+'</small><b>'+t[1]+'</b></div>').join(''):'<div class="empty">最初の1投を投げよう。</div>';
}
function mark(p,n){return ['–','／','×','◎'][marks[p][n]||0]}
function end(w){
 over=true;arcadeCue(w<0?"draw":"finish");recordResults(w);if(matchPlay()&&w>=0)legs[w]++;render();
 const more=matchPlay()&&Math.max(...legs)<2;
 const title=solo()?'練習終了':w<0?'引き分け':labelFor(w)+(more?' がレッグ獲得':'の勝利！');
 const result=solo()?scores[0]+' 点':labelFor(0)+' '+scores[0]+'　対　'+labelFor(1)+' '+scores[1];
 show('<h2>'+title+'</h2><small id="rankStatus"></small><p>'+names[mode]+' ／ '+round+' ラウンド<br>'+result+(matchPlay()?'<br>獲得レッグ　'+legs.join(' − '):'')+'</p><div class="buttons"><button onclick="setup()">設定変更</button><button class="primary" id="nextGame">'+(more?(w<0?'同じレッグを再戦':'次のレッグへ'):'もう一度遊ぶ')+'</button></div>');
 updateRankStatus();
 $('nextGame').onclick=()=>{closeModal();if(!more){reset();return}if(w>=0)leg++;first=1-first;beginLeg()};
}
function advance(){
 clearLights();const complete=solo()||player!==first;
 if(complete&&round>=cap()){
   const d=scores[0]-scores[1];end(solo()?0:d===0?-1:(is01()||mode==='cut'?d<0:d>0)?0:1);return;
 }
 arcadeCue('turn');if(complete)round++;player=solo()?0:1-player;startScore=scores[player];darts=[];busy=false;
 $('pins').innerHTML='';$('flash').textContent='';render();if(aiTurn())timer=setTimeout(cpu,450);
}
function play(x,y){if(over)return;if(!countedDartsMatch){countedDartsMatch=true;window.asobiActivity?.play('darts')}rankedThrows[player]++;let h=hit(x,y),label=h.label,bust=false,win=false;h.available=(marks[player][h.n]||0)<3||(marks[1-player][h.n]||0)<3;darts.push(h);if(is01()){scores[player]-=pointsOf(h);if(scores[player]<0||(scores[player]===0&&!finishes(h))||(scores[player]===1&&rules.out!=='open')){scores[player]=startScore;bust=true;label+=' · BUST'}else win=scores[player]===0}
 else if(cricket()){if(targets.includes(h.n)){let old=marks[player][h.n]||0;marks[player][h.n]=Math.min(3,old+h.m);if((marks[1-player][h.n]||0)<3)scores[mode==='cut'?1-player:player]+=Math.max(0,old+h.m-3)*h.n;win=targets.every(n=>marks[player][n]===3)&&(mode==='cut'?scores[player]<=scores[1-player]:scores[player]>=scores[1-player])}}
 else {const gain=trainingScore(h,x,y);scores[player]+=gain;label+=' +'+gain}
 lightHit(h);impactSound(h);
 const turnDone=win||bust||darts.length===3;
 const earned=is01()?startScore-scores[player]:scores[player]-startScore;
 const award=turnDone&&!bust?awardFor(darts,cricket()?'cr':mode,['center','jack','multi'].includes(mode)?darts.reduce((sum,v)=>sum+pointsOf(v),0):earned):'';
 if(award){celebrate(award);awardSound(award);label+=' · '+award}
 log.push(['R'+round+' · '+labelFor(player)+' · '+darts.length,label]);
 $('flash').textContent=award?label.slice(0,-(' · '+award).length):label;render();
 if(turnDone){busy=true;timer=setTimeout(win?()=>end(player):advance,award?2350:900)}
 else if(aiTurn())timer=setTimeout(cpu,720);
}
function show(html){$('content').innerHTML=html;if(!$('modal').open)$('modal').showModal()}
function closeModal(){$('modal').close()}
$('settings').onclick=()=>setup();const guide=["狙いたい方向に素早く払って離すと投球。離す直前の動きが遅いとキャンセルされ、残りの矢は減りません。離した位置から、速く払うほどその方向へ遠く飛びます。指に沿って矢を構え、指を離す瞬間の速さと角度で投げ分けます。01では上がれる手順の次の得点エリアが水色に光ります。PCではドラッグで投げられます。", "<b>01</b>　残りをぴったり0点にすると勝利。超えるとバーストし、そのターンの開始点に戻ります。ルール・ハンデで上がり方とブルの配点を変更できます。ダブルアウトはダブルかインブル、マスターアウトはダブル・トリプル・ブルで上がれます。", "<b>CRICKET</b>　15〜20とブルを各3マーク。相手が閉じるまで超過マークで加点。P1の陣地はオレンジ、P2の陣地は青。両者が3マークすると消灯します。全て閉じ、同点以上なら勝利。", "<b>COUNT-UP</b>　8ラウンドの合計点を競います。クリケット版は20から15、ブルの順に狙い、最終回は全対象が有効です。", "1ターン3投。上限ラウンドでは01は残りが少ない側、カットスロートは失点が少ない側、その他は得点が多い側の勝ちです。"];
function helpPage(i){
  show('<h2>遊び方</h2><p>'+guide[i]+'</p><div class="guideNav"><button '+(i===0?'disabled':'')+' onclick="helpPage('+(i-1)+')">前へ</button><span>'+(i+1)+' / '+guide.length+'</span><button '+(i===guide.length-1?'disabled':'')+' onclick="helpPage('+(i+1)+')">次へ</button></div><div class="buttons"><button onclick="closeModal()">ゲームに戻る</button></div>');
}
$('help').onclick=()=>helpPage(0);
$('logOpen').onclick=()=>show('<h2>投球記録</h2>'+$('history').innerHTML+'<div class="buttons"><button onclick="closeModal()">ゲームに戻る</button></div>');
function openKit(){
  show('<h2>詳細設定</h2><div class="kitTabs"><button id="partsTab">パーツ</button><button id="tuneTab">重量・音量</button></div>'+workshop()+'<div class="buttons"><button id="kitBack">ゲーム設定に戻る</button></div>');
  wireWorkshop();
  const tabs=[$('partsTab'),$('tuneTab')];
  function tab(i){
    document.querySelector('.workshop').dataset.tab=i;
    tabs.forEach((btn,k)=>btn.setAttribute('aria-pressed',k===i));
  }
  tabs.forEach((btn,i)=>btn.onclick=()=>tab(i));tab(0);
  $('kitBack').onclick=()=>setup(true);
}
installThrow();reset();
