class GameAudio {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private ambienceGain: GainNode | null = null;
  private ambienceOsc: OscillatorNode | null = null;
  private ambienceLfo: OscillatorNode | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.ctx) {
      if (this.isMuted) this.ctx.suspend();
      else this.ctx.resume();
    }
    return this.isMuted;
  }

  getMuted() { return this.isMuted; }

  private tone(freq: number, type: OscillatorType, gainPeak: number, attack: number, decay: number, delay = 0) {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
    gain.gain.setValueAtTime(0, this.ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(gainPeak, this.ctx.currentTime + delay + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + attack + decay);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime + delay);
    osc.stop(this.ctx.currentTime + delay + attack + decay + 0.02);
  }

  playDing() {
    if (!this.ctx || this.isMuted) return;
    this.tone(523.25, "sine", 0.22, 0.03, 0.55, 0);
    this.tone(659.25, "sine", 0.16, 0.03, 0.45, 0.09);
    this.tone(783.99, "sine", 0.10, 0.03, 0.35, 0.18);
  }

  playBuzz() {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(210, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(170, this.ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playHazard() {
    if (!this.ctx || this.isMuted) return;
    this.tone(330, "triangle", 0.10, 0.04, 0.35, 0);
    this.tone(277.18, "triangle", 0.09, 0.04, 0.35, 0.18);
    this.tone(220, "triangle", 0.08, 0.04, 0.45, 0.36);
  }

  playBonus() {
    if (!this.ctx || this.isMuted) return;
    this.tone(392, "sine", 0.18, 0.03, 0.35, 0);
    this.tone(523.25, "sine", 0.16, 0.03, 0.35, 0.1);
    this.tone(659.25, "sine", 0.14, 0.03, 0.45, 0.2);
    this.tone(783.99, "sine", 0.12, 0.03, 0.55, 0.3);
  }

  playTick() {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(480, this.ctx.currentTime);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.07, this.ctx.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playFanfare() {
    if (!this.ctx || this.isMuted) return;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 523.25, 392.00, 523.25];
    notes.forEach((freq, i) => this.tone(freq, "triangle", 0.22, 0.04, 0.38, i * 0.12));
  }

  playCountdownUrgent() {
    if (!this.ctx || this.isMuted) return;
    this.tone(528, "triangle", 0.11, 0.015, 0.10, 0);
    this.tone(528, "triangle", 0.11, 0.015, 0.10, 0.18);
  }

  setAmbience(zone: string) {
    if (!this.ctx) return;

    if (this.ambienceOsc) {
      try {
        this.ambienceGain?.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);
        this.ambienceOsc.stop(this.ctx.currentTime + 1.3);
        this.ambienceLfo?.stop(this.ctx.currentTime + 1.3);
      } catch (_) {}
      this.ambienceOsc = null;
      this.ambienceLfo = null;
      this.ambienceGain = null;
    }

    if (this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const masterGain = this.ctx.createGain();

    lfo.type = "sine";
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    masterGain.connect(this.ctx.destination);
    osc.connect(masterGain);

    masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.055, this.ctx.currentTime + 2.5);

    switch (zone) {
      case "forest":
        osc.type = "sine";
        osc.frequency.setValueAtTime(130, this.ctx.currentTime);
        lfo.frequency.setValueAtTime(0.18, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(4, this.ctx.currentTime);
        break;
      case "ocean":
        osc.type = "sine";
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(6, this.ctx.currentTime);
        break;
      case "desert":
        osc.type = "sine";
        osc.frequency.setValueAtTime(110, this.ctx.currentTime);
        lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(2, this.ctx.currentTime);
        break;
      case "human_impact":
        osc.type = "triangle";
        osc.frequency.setValueAtTime(90, this.ctx.currentTime);
        lfo.frequency.setValueAtTime(0.22, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(3, this.ctx.currentTime);
        masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 2.5);
        break;
      case "restoration":
        osc.type = "sine";
        osc.frequency.setValueAtTime(160, this.ctx.currentTime);
        lfo.frequency.setValueAtTime(0.14, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(5, this.ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 2.5);
        break;
      default:
        osc.type = "sine";
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        lfo.frequency.setValueAtTime(0.1, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(3, this.ctx.currentTime);
    }

    osc.start(this.ctx.currentTime);
    lfo.start(this.ctx.currentTime);

    this.ambienceOsc = osc;
    this.ambienceLfo = lfo;
    this.ambienceGain = masterGain;
  }
}

export const audio = new GameAudio();
