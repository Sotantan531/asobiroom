/* Dobon Quiz approved V4 audio tracks. Existing synthesized music remains a fallback. */
(() => {
  'use strict';
  const files = {
    normal: 'dobon_normal_bgm_v4.mp3',
    urgent: 'dobon_countdown_30s_v4.mp3'
  };
  const raw = Object.fromEntries(Object.entries(files).map(([key, url]) => [
    key, fetch(url).then(r => { if (!r.ok) throw Error('BGM unavailable'); return r.arrayBuffer(); }).catch(() => null)
  ]));
  class DobonRecordedBgm {
    constructor(contextFactory, remainingTime) {
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
          this.decoded[key] = raw[key].then(bytes => {
            if (!bytes) throw Error('BGM unavailable');
            return ctx.decodeAudioData(bytes.slice(0));
          }).catch(() => null);
          fallback();
        }
        const buffer = await this.decoded[key];
        if (token !== this.generation || !this.playing || !this.enabled) return;
        if (!buffer) { fallback(); return; }
        const remaining = this.remainingTime();
        const section = urgent ? 30 : 50;
        const elapsed = Math.max(0, Math.min(section, urgent ? 30 - remaining / 1000 : 80 - remaining / 1000));
        if (remaining <= 0 || elapsed >= section) { this.fallback.stop(); return; }
        const speed = buffer.duration / section;
        const src = ctx.createBufferSource(), gain = ctx.createGain();
        src.buffer = buffer;
        src.playbackRate.value = speed;
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
