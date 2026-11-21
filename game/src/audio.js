// Synthesized sound, no audio files: soft moth footsteps, a guard's heavier
// tread that tells you where the patrol is, a chime for a moon-moth, a sting
// when a guard spots you, and a low night hum underneath it all. Everything
// is built with the Web Audio API and starts only after a first key or click.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.ambientStarted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.12);
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  startAmbient() {
    if (!this.ctx || this.ambientStarted) return;
    this.ambientStarted = true;
    try {
      const gain = this.ctx.createGain();
      gain.gain.value = 0.035;
      gain.connect(this.master);
      for (const freq of [55, 55.7, 110.4]) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start();
      }
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.018;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
    } catch {
      // Silence is fine; the game plays without it.
    }
  }

  blip(freq, dur, type, vol, when = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch {
      // Ignore audio failures.
    }
  }

  footstep(loud, pan) {
    if (!this.ctx || this.muted || !this.noiseBuffer) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = loud ? 900 : 480;
      const gain = this.ctx.createGain();
      gain.gain.value = loud ? 0.22 : 0.08;
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      src.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.master);
      src.start();
    } catch {
      // Ignore audio failures.
    }
  }

  mothChime() {
    this.blip(880, 0.18, 'sine', 0.16);
    this.blip(1318, 0.26, 'sine', 0.12, 0.09);
  }

  letterChime() {
    this.blip(523, 0.16, 'triangle', 0.16);
    this.blip(659, 0.16, 'triangle', 0.16, 0.1);
    this.blip(784, 0.3, 'triangle', 0.16, 0.2);
  }

  alertSting() {
    this.blip(220, 0.22, 'sawtooth', 0.14);
    this.blip(165, 0.34, 'sawtooth', 0.14, 0.14);
  }

  gateChime() {
    this.blip(392, 0.2, 'sine', 0.16);
    this.blip(523, 0.2, 'sine', 0.16, 0.12);
    this.blip(659, 0.42, 'sine', 0.16, 0.24);
  }

  caughtThud() {
    this.blip(98, 0.4, 'sine', 0.25);
    this.blip(65, 0.5, 'sine', 0.2, 0.12);
  }
}
