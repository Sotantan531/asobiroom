/* Original synthesized music for asobiroom. No external samples or licensed tracks. */
(() => {
  'use strict';
  const midiHz = n => 440 * 2 ** ((n - 69) / 12);
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  class AsobiBgm {
    constructor(mode, contextFactory) {
      this.mode = mode;
      this.contextFactory = contextFactory;
      this.depth = 0;
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
      // Every newly reached area gets a subtle, rising sonar-like accent.
      if (this.playing && this.ctx) {
        const t = this.ctx.currentTime + 0.06;
        this.note(72 - Math.floor(next / 3) * 2, t, 1.5, 0.028, 'sine', 0.08, 0.7);
        this.note(79 - Math.floor(next / 3) * 2, t + 0.2, 1.8, 0.021, 'sine', 0.12, 0.8);
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
      // Schedule ahead so mobile main-thread redraws do not interrupt the beat.
      while (this.nextTime < now + 0.16) {
        if (this.mode === 'dobon') this.dobonStep(this.step, this.nextTime);
        else this.oceanStep(this.step, this.nextTime);
        const bpm = this.mode === 'dobon' ? (this.urgent ? 156 : 114) : (this.depth >= 8 ? 78 : 72);
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
        // The last 30 seconds: faster, minor-key pulses and an alarm-like ostinato.
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
      const depth = this.depth;
      const roots = depth < 4 ? [48, 45, 41, 43] : depth < 7 ? [45, 41, 38, 43] : [38, 34, 41, 36];
      const root = roots[bar];
      const minor = depth >= 4;
      const third = minor ? 3 : 4;
      if (beat === 0) {
        const padLength = depth >= 7 ? 3.45 : 2.85;
        const padLevel = 0.032 + depth * 0.003;
        [0, third, 7, 12].forEach((interval, i) => {
          this.note(root + interval, at, padLength, padLevel * (i === 0 ? 1.15 : 0.75), i === 0 ? 'sine' : 'triangle', 0.8, 1.0, 1100 + depth * 85);
        });
        if (depth >= 3) this.note(root - 12, at, 3.1, 0.048 + depth * 0.004, 'sine', 0.45, 1.25);
        if (depth >= 8) {
          this.note(root - 24, at, 3.6, 0.07, 'sine', 0.75, 1.5);
          this.note(root + 19, at, 3.0, 0.034, 'sine', 0.9, 1.0);
        }
      }
      if (depth < 4 && (beat === 2 || beat === 7 || beat === 11)) {
        const shift = beat === 7 ? 19 : beat === 11 ? 16 : 12;
        this.note(root + shift, at, 1.0, 0.043, 'sine', 0.016, 0.7);
        this.note(root + shift + 12, at, 0.6, 0.012, 'triangle', 0.02, 0.3);
      } else if (depth >= 4 && (beat === 0 || beat === 5 || beat === 10)) {
        const shift = beat === 5 ? 15 : beat === 10 ? 19 : 12;
        this.note(root + shift, at, depth >= 8 ? 1.8 : 1.25, 0.026 + depth * 0.002, 'sine', 0.11, 0.65);
      }
      if (depth >= 6 && beat === 8) this.note(root - 5, at, 2.0, 0.034, 'triangle', 0.24, 1.0, 600);
      // Gentle deep sonar pulses become an epic rhythmic heartbeat near the ruins.
      if (depth >= 8 && beat % 4 === 0) this.note(root - 12, at, 0.56, 0.044, 'triangle', 0.045, 0.28, 500);
    }
  }

  window.AsobiBgm = AsobiBgm;
})();
