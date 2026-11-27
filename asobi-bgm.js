/* Original synthesized music for asobiroom.
   Zero Dive: a distinct, progressively grander arrangement for each of 11 areas.
   No external samples or licensed tracks. */
(() => {
  'use strict';
  const midiHz = n => 440 * 2 ** ((n - 69) / 12);
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const OCEAN_BPM = 104;
  const OCEAN_STAGES = [
    // 0: Surface — light and sunny.
    { chords:[[48,4],[43,4],[45,3],[41,4]], pad:.018, bass:.025, arp:.016, shine:.008, pulse:0, lead:.066 },
    // 1: Shallows — bright bubbles and more forward movement.
    { chords:[[50,4],[45,4],[47,3],[43,4]], pad:.020, bass:.028, arp:.020, shine:.012, pulse:0, lead:.068 },
    // 2: Coral reef — playful sparkles and gentle percussion.
    { chords:[[52,4],[47,4],[49,3],[45,4]], pad:.023, bass:.031, arp:.024, shine:.016, pulse:.007, lead:.070 },
    // 3: Underwater forest — layered melodic echoes.
    { chords:[[53,4],[48,4],[50,3],[46,4]], pad:.026, bass:.035, arp:.027, shine:.018, pulse:.009, lead:.073 },
    // 4: Turtle waters — warm, sweeping strings.
    { chords:[[55,4],[50,4],[52,3],[48,4]], pad:.029, bass:.039, arp:.030, shine:.020, pulse:.011, lead:.076 },
    // 5: Shipwreck — mystery arrives with a minor-key theme.
    { chords:[[52,3],[48,4],[55,4],[50,4]], pad:.033, bass:.043, arp:.032, shine:.022, pulse:.013, lead:.079 },
    // 6: Jellyfish waters — glowing, ringing upper voices.
    { chords:[[45,3],[41,4],[48,4],[43,4]], pad:.036, bass:.047, arp:.034, shine:.025, pulse:.015, lead:.081 },
    // 7: Abyss entrance — deep drones and spacious harmonies.
    { chords:[[50,3],[46,4],[53,4],[48,4]], pad:.040, bass:.051, arp:.036, shine:.027, pulse:.018, lead:.083 },
    // 8: Undersea volcano — low rhythmic force.
    { chords:[[43,3],[39,4],[46,4],[41,4]], pad:.044, bass:.055, arp:.038, shine:.030, pulse:.021, lead:.085 },
    // 9: Ancient ruins — solemn, cathedral-like depth.
    { chords:[[48,3],[44,4],[39,4],[46,4]], pad:.048, bass:.060, arp:.040, shine:.034, pulse:.023, lead:.087 },
    // 10: Ryugu Castle — full, hopeful, cinematic finale.
    { chords:[[53,4],[46,4],[50,3],[48,4]], pad:.052, bass:.064, arp:.043, shine:.038, pulse:.025, lead:.090 },
  ];
  const OCEAN_MOTIFS = [
    [0,1,2,4,3,2,1,4],
    [0,2,4,5,4,2,3,4],
    [0,1,4,5,6,4,2,4],
    [0,2,3,4,5,3,2,1],
    [0,1,2,6,5,4,2,4],
    [0,2,1,4,3,2,5,1],
    [0,1,4,6,4,2,3,5],
    [0,2,4,5,6,4,3,2],
    [0,1,2,4,6,5,4,2],
    [0,2,4,6,5,4,2,6],
    [0,2,4,6,7,6,5,7],
  ];

  class AsobiBgm {
    constructor(mode, contextFactory) {
      this.mode = mode;
      this.contextFactory = contextFactory;
      this.depth = 0;
      this.activeDepth = 0;
      this.urgent = false;
      this.enabled = true;
      this.playing = false;
      this.step = 0;
      this.timer = null;
      this.ctx = null;
      this.bus = null;
      this.noiseBuffer = null;
    }

    start() {
      if (this.playing || !this.enabled) return;
      let ctx;
      try { ctx = this.contextFactory(); } catch { return; }
      if (!ctx || ctx.state === 'closed') return;
      this.ctx = ctx;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.0001, ctx.currentTime);
      bus.gain.linearRampToValueAtTime(this.mode === 'dobon' ? 0.36 : 0.5, ctx.currentTime + 0.6);
      bus.connect(ctx.destination);
      this.bus = bus;
      this.playing = true;
      this.step = 0;
      this.activeDepth = this.depth;
      this.nextTime = ctx.currentTime + 0.08;
      this.timer = setInterval(() => this.schedule(), 55);
      this.schedule();
    }

    stop() {
      if (this.timer !== null) clearInterval(this.timer);
      this.timer = null;
      this.playing = false;
      const oldBus = this.bus;
      this.bus = null;
      if (!oldBus || !this.ctx) return;
      const now = this.ctx.currentTime;
      oldBus.gain.cancelScheduledValues(now);
      oldBus.gain.setValueAtTime(Math.max(0.0001, oldBus.gain.value), now);
      oldBus.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      setTimeout(() => { try { oldBus.disconnect(); } catch {} }, 600);
    }

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      if (!this.enabled) this.stop();
    }

    setDepth(depth) {
      const next = clamp(Math.round(depth), 0, 10);
      if (this.depth === next) return;
      this.depth = next;
      if (this.mode === 'ocean' && this.playing && this.ctx) {
        const t = this.ctx.currentTime + .08;
        const root = OCEAN_STAGES[next].chords[0][0];
        // A brief rising flourish announces each newly reached area.
        [0, 7, 12].forEach((interval, i) => {
          this.note(root + 24 + interval, t + i * .14, .38 + next * .025,
            .018 + next * .002, 'sine', .03, .22);
        });
      }
    }

    setUrgent(urgent) {
      const next = Boolean(urgent);
      if (next === this.urgent) return;
      this.urgent = next;
      if (next && this.playing && this.ctx) {
        const now = this.ctx.currentTime + 0.04;
        [76, 73, 70, 67].forEach((m, i) => this.note(m, now + i * 0.1, 0.24, 0.078, 'square', 0.008, 0.12));
      }
    }

    schedule() {
      if (!this.playing || !this.ctx || !this.bus || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      if (this.nextTime < now - .25) this.nextTime = now + .04;
      while (this.nextTime < now + 0.16) {
        if (this.mode === 'dobon') this.dobonStep(this.step, this.nextTime);
        else this.oceanStep(this.step, this.nextTime);
        const bpm = this.mode === 'dobon' ? (this.urgent ? 156 : 114) : OCEAN_BPM;
        this.nextTime += 60 / bpm / 4;
        this.step++;
      }
    }

    note(midi, at, length, volume, type = 'sine', attack = 0.012, release = 0.18, cutoff = 0) {
      if (!this.ctx || !this.bus) return;
      const ctx = this.ctx, osc = ctx.createOscillator(), gain = ctx.createGain();
      const end = at + length, rise = Math.min(attack, length * 0.34);
      const fall = Math.max(at + rise + 0.001, end - Math.min(release, length * 0.45));
      osc.type = type;
      osc.frequency.setValueAtTime(midiHz(midi), at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(volume, at + rise);
      gain.gain.setValueAtTime(volume * 0.68, fall);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      if (cutoff) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = cutoff;
        osc.connect(filter); filter.connect(gain);
      } else osc.connect(gain);
      gain.connect(this.bus);
      osc.start(at); osc.stop(end + 0.01);
    }

    percussion(at, duration, volume, cutoff = 3500) {
      if (!this.ctx || !this.bus) return;
      const ctx = this.ctx;
      if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== ctx.sampleRate) {
        const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.22), ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        this.noiseBuffer = buffer;
      }
      const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      src.buffer = this.noiseBuffer;
      filter.type = 'highpass'; filter.frequency.value = cutoff;
      gain.gain.setValueAtTime(volume, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      src.connect(filter); filter.connect(gain); gain.connect(this.bus);
      src.start(at); src.stop(at + duration);
    }

    // The Dobon Quiz music is intentionally unchanged.
    dobonStep(step, at) {
      const beat = step % 16, bar = Math.floor(step / 16) % 4;
      const root = (this.urgent ? [45, 41, 43, 40] : [48, 43, 45, 41])[bar];
      const scale = this.urgent ? [0, 3, 7, 10, 12, 15] : [0, 4, 7, 9, 12, 16];
      if (beat % 4 === 0) {
        this.note(root - 12, at, this.urgent ? 0.19 : 0.26, 0.16, 'triangle', 0.009, 0.11);
        this.note(36, at, 0.14, 0.18, 'sine', 0.006, 0.09);
      }
      if (beat === 4 || beat === 12) this.percussion(at, 0.12, this.urgent ? 0.12 : 0.09, 650);
      if (beat % 2 === 0) this.percussion(at, 0.06, this.urgent ? 0.048 : 0.028, 5200);
      if (this.urgent) {
        if (beat % 2 === 1) this.note(root + 24 + scale[(beat * 3) % scale.length], at, 0.14, 0.073, 'square', 0.006, 0.07, 2400);
        if (beat % 4 === 2) this.note(root + 12, at, 0.27, 0.065, 'sawtooth', 0.02, 0.16, 1100);
        if (beat === 0) this.note(81, at, 0.48, 0.095, 'triangle', 0.01, 0.3);
      } else {
        const melody = { 0: 4, 3: 2, 6: 1, 8: 3, 11: 2, 14: 5 };
        if (Object.prototype.hasOwnProperty.call(melody, beat)) {
          const n = root + 12 + scale[melody[beat]];
          this.note(n, at, 0.27, 0.11, 'triangle', 0.006, 0.19);
          this.note(n + 12, at, 0.19, 0.027, 'sine', 0.01, 0.13);
        }
      }
    }

    oceanStep(step, at) {
      const beat = step % 16, bar = Math.floor(step / 16) % 4;
      // Harmony changes at the next bar boundary rather than mid-chord.
      if (beat === 0) this.activeDepth = this.depth;
      const depth = this.activeDepth, stage = OCEAN_STAGES[depth];
      const [root, third] = stage.chords[bar];
      const octave = root < 48 ? 24 : 12;
      const quarter = 60 / OCEAN_BPM;
      const intervals = [0, third, 7, 9, 12, 14, third + 12, 19];
      const motif = OCEAN_MOTIFS[depth];
      if (beat === 0) {
        const sustain = quarter * 3.8;
        [0, third, 7, 12].forEach((n, i) => {
          this.note(root + n, at, sustain, stage.pad * (i === 0 ? 1.1 : .7),
            i === 0 ? 'sine' : 'triangle', .32 + depth * .025, .7, 1250 - depth * 40);
        });
        if (depth >= 4) this.note(root + 19, at + .06, sustain - .1, stage.pad * .43,
          'sine', .6, .7);
        if (depth >= 7) {
          this.note(root - 24, at, sustain, stage.bass * .85, 'sine', .7, 1.0, 500);
          this.note(root + 24, at + .12, sustain - .2, stage.pad * .4, 'triangle', .7, .8, 950);
        }
        if (depth >= 9) this.note(root + third + 24, at + .14, sustain - .2,
          stage.pad * .34, 'sine', .75, .9);
      }
      if (beat % 2 === 0) {
        const index = beat / 2;
        const note = root + octave + intervals[motif[index]];
        const length = index === 3 || index === 7 ? quarter * .83 : quarter * .43;
        this.note(note, at, length, stage.lead, 'triangle', .008, .18,
          depth >= 7 ? 1600 : 2800);
        if (depth >= 3 && (index === 2 || index === 6)) {
          this.note(note + 12, at + .04, quarter * .38, stage.shine * .65,
            'sine', .018, .16);
        }
        if (depth >= 8 && (index === 0 || index === 4)) {
          this.note(note - 12, at, quarter * .75, stage.lead * .35,
            'sawtooth', .05, .3, 850);
        }
      }
      if (beat % 2 === 1 && (depth >= 2 || beat % 4 === 1)) {
        const ripple = [7, 12, third + 12, 19, 12, third + 12, 7, 19][Math.floor(beat / 2)];
        this.note(root + 12 + ripple, at, quarter * .33, stage.arp, 'sine', .007, .12);
      }
      if (beat === 3 || beat === 11 || (depth >= 6 && beat === 7)) {
        const high = root + octave + 19 + (beat === 11 ? 3 : 0);
        this.note(high, at, quarter * (depth >= 6 ? 1.45 : .9), stage.shine,
          'sine', .03, .36);
        if (depth >= 6) this.note(high + 7, at + .19, quarter * 1.2,
          stage.shine * .38, 'sine', .11, .4);
      }
      if (beat === 0 || beat === 8 || (depth >= 5 && beat === 12)) {
        this.note(root - 12, at, quarter * (depth >= 7 ? 1.4 : .72),
          stage.bass, 'triangle', .025, .24, 600);
      }
      if (depth >= 2 && (beat === 4 || beat === 12)) {
        this.percussion(at, .075, stage.pulse, depth >= 7 ? 850 : 1800);
      }
      if (depth >= 4 && beat % 4 === 0) {
        this.note(root + 7, at, quarter * .55, stage.pulse * 1.2,
          'triangle', .02, .18, 800);
      }
      if (depth >= 6 && beat === 8) {
        this.note(root - 17, at, quarter * 1.8, stage.bass * .55,
          'sine', .1, .5, 400);
      }
      if (depth >= 8 && (beat === 0 || beat === 8)) {
        this.note(root - 24, at, quarter * .9, stage.bass * .6,
          'triangle', .04, .3, 350);
      }
      if (depth === 10 && (beat === 0 || beat === 8)) {
        this.note(root + octave + 19, at, quarter * 1.6, stage.pad * .72,
          'triangle', .18, .45, 1700);
      }
    }
  }

  window.AsobiBgm = AsobiBgm;
})();
