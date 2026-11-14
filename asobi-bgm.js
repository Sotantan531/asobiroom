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
        // Keep the ocean theme adventurous: lively near the surface, expansive below.
        const bpm = this.mode === 'dobon' ? (this.urgent ? 156 : 114)
          : this.depth >= 8 ? 92 : this.depth >= 6 ? 90 : this.depth >= 3 ? 94 : 98;
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
      const scene = depth < 3 ? 0 : depth < 6 ? 1 : depth < 8 ? 2 : 3;
      // Each entry is [chord root, major/minor third]. Even the abyss has a
      // hopeful resolution, so descending feels like a discovery, not a defeat.
      const progressions = [
        [[48, 4], [43, 4], [45, 3], [41, 4]], // C - G - Am - F: sunlit adventure
        [[45, 3], [41, 4], [48, 4], [43, 4]], // Am - F - C - G: deeper discovery
        [[43, 4], [38, 3], [41, 4], [48, 4]], // G - Dm - F - C: mysterious wonder
        [[38, 3], [34, 4], [41, 4], [36, 4]], // Dm - Bb - F - C: grand finale
      ];
      const [root, third] = progressions[scene][bar];
      const melodyOctave = root < 42 ? 24 : 12;
      if (beat === 0) {
        const padLength = 60 / (scene === 0 ? 98 : scene === 1 ? 94 : scene === 2 ? 90 : 92) * 3.75;
        const padLevel = 0.028 + scene * 0.005;
        [0, third, 7, 12].forEach((interval, i) => {
          this.note(root + interval, at, padLength, padLevel * (i === 0 ? 1.15 : 0.75), i === 0 ? 'sine' : 'triangle', 0.42, 0.8, 1250 + depth * 70);
        });
        if (scene >= 1) this.note(root - 12, at, padLength, 0.036 + scene * 0.008, 'sine', 0.35, 0.9);
        if (scene === 3) {
          this.note(root - 24, at, padLength, 0.06, 'sine', 0.55, 1.0);
          this.note(root + 19, at, padLength, 0.032, 'triangle', 0.6, 0.85, 1300);
        }
      }
      // A playful, memorable melody takes the lead instead of sparse sonar.
      const melody = { 0: 0, 2: third, 5: 7, 7: scene >= 2 ? 12 : 9,
        10: 7, 13: third, 15: scene >= 2 ? 7 : 12 };
      if (Object.prototype.hasOwnProperty.call(melody, beat)) {
        const note = root + melodyOctave + melody[beat];
        this.note(note, at, beat === 7 || beat === 15 ? 0.45 : 0.28,
          0.067 + scene * 0.009, 'triangle', 0.009, 0.17, scene >= 2 ? 1900 : 2700);
        if (beat === 5 || beat === 7) this.note(note + 12, at, 0.22, 0.014 + scene * 0.003, 'sine', 0.012, 0.12);
      }
      // Rippling arpeggios and a soft heartbeat give forward motion underwater.
      const ripples = { 1: 7, 4: 12, 8: third + 12, 11: 7, 14: 12 };
      if (Object.prototype.hasOwnProperty.call(ripples, beat)) {
        this.note(root + 12 + ripples[beat], at, 0.2, 0.022 + scene * 0.005,
          'sine', 0.008, 0.12);
      }
      if (beat % 4 === 0) {
        this.note(root - 12, at, 0.3, 0.045 + scene * 0.007, 'triangle', 0.015, 0.18, 680);
        if (scene >= 2) this.note(root + 7, at, 0.3, 0.019 + scene * 0.004, 'triangle', 0.025, 0.18, 900);
      }
      if (scene >= 1 && (beat === 4 || beat === 12)) this.percussion(at, 0.08, 0.012 + scene * 0.004, 1400);
      if (scene === 3 && beat === 8) this.note(root + 12, at, 0.8, 0.038, 'sawtooth', 0.08, 0.45, 580);
    }
  }

  window.AsobiBgm = AsobiBgm;
})();
