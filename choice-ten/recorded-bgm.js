/* Choice Ten: continuous 90-second V4 extension plus original 30-second finale. */
(() => {
  'use strict';
  const raw = {};
  const pending = {};
  for (const key of ['normal','urgent']) raw[key] = new Promise(resolve => { pending[key] = resolve; });
  let worker;
  const fail = () => { for (const key of Object.keys(pending)) pending[key](null); if(worker)worker.terminate(); };
  try {
    worker = new Worker('bgm-synth-worker.js?v=20261128choice90');
    worker.onmessage = ({data}) => {
      if (pending[data.key]) {
        pending[data.key](data.error ? null : data);
        delete pending[data.key];
      }
      if (!Object.keys(pending).length) worker.terminate();
    };
    worker.onerror = fail;
    worker.onmessageerror = fail;
    worker.postMessage({key:'normal'});
    worker.postMessage({key:'urgent'});
  } catch { fail(); }
  class DobonRecordedBgm {
    constructor(contextFactory, remainingTime, roundSeconds = 80) {
      this.roundSeconds = roundSeconds;
      this.contextFactory = contextFactory;
      this.remainingTime = remainingTime;
      this.fallback = new window.AsobiBgm('dobon', contextFactory);
      this.enabled = true;
      this.playing = false;
      this.urgent = false;
      this.generation = 0;
      this.decoded = {};
      this.node = null;
    }
    setEnabled(value) {
      this.enabled = Boolean(value);
      this.fallback.setEnabled(this.enabled);
      if (!this.enabled) this.stop();
    }
    start() {
      if (!this.enabled || this.playing || document.hidden) return;
      this.playing = true;
      this.urgent = this.remainingTime() <= 30000;
      this.switchTrack();
    }
    stop() {
      this.playing = false;
      ++this.generation;
      this.clearNode();
      this.fallback.stop();
    }
    clearNode() {
      if (!this.node) return;
      try { this.node.stop(); } catch {}
      try { this.node.disconnect(); } catch {}
      this.node = null;
    }
    setUrgent(value) {
      value = Boolean(value);
      if (value === this.urgent) return;
      this.urgent = value;
      if (this.playing) this.switchTrack();
    }
    async switchTrack() {
      const token = ++this.generation;
      this.clearNode();
      this.fallback.stop();
      const urgent = this.urgent, key = urgent ? 'urgent' : 'normal';
      const ctx = this.contextFactory();
      if (!ctx || ctx.state === 'closed') return;
      const fallback = () => {
        if (token !== this.generation || !this.playing || !this.enabled) return;
        this.fallback.setUrgent(urgent);
        this.fallback.start();
      };
      try {
        if (!this.decoded[key]) {
          this.decoded[key] = raw[key].then(data => {
            if (!data) return null;
            const buffer = ctx.createBuffer(2, data.channels[0].length, data.sr);
            data.channels.forEach((samples, i) => buffer.copyToChannel(samples, i));
            return buffer;
          }).catch(() => null);
          fallback();
        }
        const buffer = await this.decoded[key];
        if (token !== this.generation || !this.playing || !this.enabled) return;
        if (!buffer) { fallback(); return; }
        const remaining = this.remainingTime();
        const section = urgent ? 30 : this.roundSeconds - 30;
        const elapsed = Math.max(0, Math.min(section, urgent ? 30 - remaining / 1000 : this.roundSeconds - remaining / 1000));
        if (remaining <= 0 || elapsed >= section) { this.fallback.stop(); return; }
        const speed = buffer.duration / section;
        const src = ctx.createBufferSource(), gain = ctx.createGain();
        src.buffer = buffer;
        src.playbackRate.value = speed;
        src.loop = false;
        gain.gain.value = 0.36;
        src.connect(gain); gain.connect(ctx.destination);
        src.onended = () => { try { src.disconnect(); gain.disconnect(); } catch {} if (this.node === src) this.node = null; };
        this.fallback.stop();
        this.node = src;
        src.start(0, elapsed * speed);
      } catch { fallback(); }
    }
  }
  window.DobonRecordedBgm = DobonRecordedBgm;
})();
