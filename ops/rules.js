// WPA rules of play (2025-09-15), adapted for an approachable single-rack game.
// Physical equipment fouls and referee choices are outside a digital simulation.
const has = (n,arr) => arr.some(v=>v.id===n);
const groupFor = n => n>=1&&n<=7?'solid':n>=9&&n<=15?'stripe':null;
const pocketed = log => log.pocketed.filter(p=>p.id!==0);
const other = index => 1-index;

export class MatchRules {
  constructor(mode='9',breaker=0){
    this.mode=mode;
    this.turn=breaker;
    this.breaker=breaker;
    this.breaking=true;
    this.groups=[null,null];
    this.ballInHand='kitchen';
    this.winner=null;
    this.lastMessage='ブレイクからスタート。';
    this.fouls=[0,0];
    this.moves=0;
  }
  groupLabel(player){
    return this.groups[player]==='solid'?'ソリッド 1–7':this.groups[player]==='stripe'?'ストライプ 9–15':'オープン';
  }
  targets(balls){
    const on=balls.filter(b=>b.id!==0&&!b.pocketed).map(b=>b.id);
    if(this.mode==='9')return on.length?[Math.min(...on)]:[];
    if(this.breaking)return on;
    const g=this.groups[this.turn];
    if(!g)return on.filter(id=>id!==8);
    const own=on.filter(id=>groupFor(id)===g);
    return own.length?own:on.includes(8)?[8]:[];
  }
  finishShot(log,before,call=null){
    if(this.winner!==null)throw Error('Match already finished');
    const shooter=this.turn,receiver=other(shooter);
    const wasBreak=this.breaking;
    this.breaking=false;this.ballInHand=null;this.moves++;
    const fallen=pocketed(log),ids=fallen.map(p=>p.id);
    const scratch=log.pocketed.some(p=>p.id===0);
    const legalFirst=wasBreak&&this.mode==='8'?true:this.targetsBefore(before,shooter,wasBreak).includes(log.firstHit);
    const noRail=!fallen.length&&!log.railAfterContact;
    const breakInsufficient=wasBreak&&fallen.length===0&&log.railBalls.size<4;
    // The 9-ball 3-ball break regulation is simplified to the standard
    // four-to-a-rail requirement in this casual single-rack edition.
    let foul=scratch||!legalFirst||noRail||breakInsufficient;
    const messageParts=[];
    if(scratch)messageParts.push('スクラッチ');
    if(!legalFirst)messageParts.push('最初に当てる球が違う');
    if(noRail&&!scratch)messageParts.push('クッションに届かず');
    if(breakInsufficient)messageParts.push('ブレイク不足');
    const result={player:shooter,next:receiver,winner:null,ballInHand:null,spot:[],pocketed:fallen,foul,break:wasBreak,reason:'',keepsTurn:false};

    if(this.mode==='8'){
      if(ids.includes(8)){
        if(wasBreak){
          result.spot.push(8);
          messageParts.push('ブレイクの8番はフットスポットに戻す');
        }else {
          const group=this.groups[shooter];
          const ownRemaining=before.some(id=>groupFor(id)===group && !ids.includes(id));
          const called8=call?.ball===8 && fallen.some(p=>p.id===8&&p.pocket===call.pocket);
          if(foul||!group||ownRemaining||!called8){
            result.winner=receiver;
            result.reason='8番を規定外のショットで落としたため敗北';
          }else {
            result.winner=shooter;
            result.reason='8番をコールしたポケットに沈めて勝利！';
          }
        }
      }
      if(!wasBreak&&!foul&&result.winner===null){
        const called=call && fallen.some(p=>p.id===call.ball&&p.pocket===call.pocket);
        const targetOK=this.targetsBefore(before,shooter,false).includes(call?.ball);
        if(called&&targetOK){
          if(!this.groups[shooter]){
            const g=groupFor(call.ball);
            if(g){
              this.groups[shooter]=g;
              this.groups[receiver]=g==='solid'?'stripe':'solid';
              messageParts.push(g==='solid'?'ソリッド獲得':'ストライプ獲得');
            }
          }
          result.keepsTurn=true;
        }
      }
      if(wasBreak&&!foul&&fallen.some(p=>p.id!==8))result.keepsTurn=true;
    }else {
      if(ids.includes(9)){
        if(foul){result.spot.push(9);messageParts.push('9番はスポットに戻す');}
        else{result.winner=shooter;result.reason='9番を合法的にポケットして勝利！';}
      }
      if(!foul&&fallen.length)result.keepsTurn=true;
    }
    if(!foul)this.fouls[shooter]=0;
    else this.fouls[shooter]++;
    if(this.mode==='9'&&this.fouls[shooter]>=3){
      result.winner=receiver;
      result.reason='3回連続ファウルで敗北';
    }
    if(result.winner!==null){
      this.winner=result.winner;
      this.lastMessage=result.reason;
      return result;
    }
    if(foul){
      this.turn=receiver;
      this.ballInHand=wasBreak?'kitchen':'table';
      result.ballInHand=this.ballInHand;
      result.reason=(messageParts.filter(Boolean).join('・')||'ファウル')+'。相手がフリーボール';
      result.next=receiver;
    }else {
      this.turn=result.keepsTurn?shooter:receiver;
      result.next=this.turn;
      result.reason=[...messageParts,result.keepsTurn?'ナイスショット！ 続けてどうぞ':'相手のターンへ'].join(' / ');
    }
    this.lastMessage=result.reason;
    return result;
  }
  targetsBefore(before,shooter,wasBreak){
    const objects=before.filter(n=>n!==0);
    if(this.mode==='9')return objects.length?[Math.min(...objects)]:[];
    if(wasBreak)return objects;
    const g=this.groups[shooter];
    if(!g)return objects.filter(n=>n!==8);
    const own=objects.filter(n=>groupFor(n)===g);
    return own.length?own:objects.includes(8)?[8]:[];
  }
}
