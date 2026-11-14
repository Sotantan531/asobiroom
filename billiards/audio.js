// Original generative lounge soundtrack; no externally licensed audio assets.
export class PoolAudio {
  constructor(){this.ctx=null;this.enabled=true;this.sfxOn=true;this.musicOn=true;this.timer=null;this.bar=0;this.startTime=0;}
  async unlock(){
    if(!this.ctx)this.ctx=new(window.AudioContext||window.webkitAudioContext)();
    if(this.ctx.state==='suspended')await this.ctx.resume();
    if(!this.timer)this.startMusic();
  }
  setEnabled(value){this.enabled=value;}
  setMusic(value){this.musicOn=value;if(value&&this.ctx&&!this.timer)this.startMusic();}
  tone(freq,when,duration,volume=.05,type='sine',destination=null){
    if(!this.ctx||!this.enabled)return;
    const ctx=this.ctx;
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,when);
    gain.gain.setValueAtTime(.0001,when);
    gain.gain.exponentialRampToValueAtTime(Math.max(.00011,volume),when+.025);
    gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
    osc.connect(gain);gain.connect(destination||ctx.destination);
    osc.start(when);osc.stop(when+duration+.03);
  }
  noise(when,duration,volume=.045,filterFreq=3000){
    if(!this.ctx||!this.enabled)return;
    const ctx=this.ctx,length=Math.floor(ctx.sampleRate*duration),buffer=ctx.createBuffer(1,length,ctx.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,1.8);
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();
    filter.type='lowpass';filter.frequency.value=filterFreq;g.gain.value=volume;
    src.buffer=buffer;src.connect(filter);filter.connect(g);g.connect(ctx.destination);
    src.start(when);
  }
  startMusic(){
    if(!this.ctx||this.timer)return;
    const chords=[[196,246.94,293.66,369.99],[174.61,220,261.63,329.63],[164.81,207.65,246.94,311.13],[174.61,220,277.18,349.23]];
    const tick=()=>{
      if(!this.musicOn||!this.enabled)return;
      const t=this.ctx.currentTime+.04;
      const chord=chords[this.bar%chords.length];
      this.tone(chord[0]/2,t,1.3,.029,'sine');
      chord.forEach((note,i)=>this.tone(note,t+i*.045,1.75,.012,'triangle'));
      this.tone(chord[0],t+1.25,.85,.014,'sine');
      this.noise(t+.0,.06,.006,1400);
      this.noise(t+1.05,.065,.007,2200);
      this.bar++;
    };
    tick();this.timer=setInterval(tick,2400);
  }
  cue(strength=1){
    if(!this.ctx||!this.enabled||!this.sfxOn)return;
    const t=this.ctx.currentTime;
    this.tone(86,t,.12,.12*Math.min(strength,1.5),'triangle');
    this.noise(t,.033,.042,700);
  }
  collide(strength=1){
    if(!this.ctx||!this.enabled||!this.sfxOn||strength<.15)return;
    const t=this.ctx.currentTime,v=Math.min(.065,strength*.017);
    this.tone(1020,t,.055,v,'sine');
    this.tone(620,t,.068,v*.8,'triangle');
  }
  rail(strength=1){
    if(!this.ctx||!this.enabled||!this.sfxOn||strength<.25)return;
    const t=this.ctx.currentTime;
    this.tone(310,t,.095,Math.min(strength*.013,.06),'triangle');
  }
  pocket(){
    if(!this.ctx||!this.enabled||!this.sfxOn)return;
    const t=this.ctx.currentTime;
    this.tone(145,t,.17,.10,'sine');this.noise(t,.12,.045,900);
    this.tone(510,t+.105,.33,.038,'sine');
    this.tone(760,t+.165,.48,.025,'sine');
  }
  foul(){
    if(!this.ctx||!this.enabled||!this.sfxOn)return;
    const t=this.ctx.currentTime;
    this.tone(225,t,.24,.058,'triangle');this.tone(180,t+.2,.34,.05,'triangle');
  }
  coin(){
    if(!this.ctx||!this.enabled||!this.sfxOn)return;
    const t=this.ctx.currentTime;
    for(let i=0;i<8;i++)this.tone(580+i*45,t+i*.09,.08,.037,'sine');
  }
  win(){
    if(!this.ctx||!this.enabled||!this.sfxOn)return;
    const notes=[392,493.88,587.33,783.99,987.77];
    const t=this.ctx.currentTime;
    notes.forEach((n,i)=>this.tone(n,t+i*.115,.56,.068,'triangle'));
    this.tone(392,t+.6,1,.035,'sine');
  }
}
