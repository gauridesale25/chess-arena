class SoundManager {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // resume if suspended (browsers block autoplay until user gesture)
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Play standard move sound (subtle low click)
  playMove() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = "sine";
      // Slide frequency down to sound like a solid mechanical click
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.08);

      // Volume envelope to avoid speaker pops
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.start(t);
      osc.stop(t + 0.08);
    } catch (e) {
      console.warn("Audio playback failed", e);
    }
  }

  // Play capture sound (metallic tap followed by move click)
  playCapture() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Part 1: High frequency tick (collision impact)
      const oscTick = this.ctx.createOscillator();
      const gainTick = this.ctx.createGain();
      oscTick.connect(gainTick);
      gainTick.connect(this.ctx.destination);

      oscTick.type = "triangle";
      oscTick.frequency.setValueAtTime(750, t);
      oscTick.frequency.exponentialRampToValueAtTime(300, t + 0.04);

      gainTick.gain.setValueAtTime(0.001, t);
      gainTick.gain.linearRampToValueAtTime(0.1, t + 0.002);
      gainTick.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      oscTick.start(t);
      oscTick.stop(t + 0.04);

      // Part 2: Main thud (mechanic click) delayed slightly
      const oscThud = this.ctx.createOscillator();
      const gainThud = this.ctx.createGain();
      oscThud.connect(gainThud);
      gainThud.connect(this.ctx.destination);

      oscThud.type = "sine";
      oscThud.frequency.setValueAtTime(180, t + 0.02);
      oscThud.frequency.exponentialRampToValueAtTime(90, t + 0.02 + 0.08);

      gainThud.gain.setValueAtTime(0.001, t + 0.02);
      gainThud.gain.linearRampToValueAtTime(0.12, t + 0.02 + 0.005);
      gainThud.gain.exponentialRampToValueAtTime(0.001, t + 0.02 + 0.08);

      oscThud.start(t + 0.02);
      oscThud.stop(t + 0.02 + 0.08);
    } catch (e) {
      console.warn("Audio playback failed", e);
    }
  }

  // Play check sound (dual ringing beeps)
  playCheck() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const playBeep = (delay: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = "triangle";
        osc.frequency.setValueAtTime(450, t + delay);

        gain.gain.setValueAtTime(0.001, t + delay);
        gain.gain.linearRampToValueAtTime(0.08, t + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.12);

        osc.start(t + delay);
        osc.stop(t + delay + 0.12);
      };

      playBeep(0);
      playBeep(0.08);
    } catch (e) {
      console.warn("Audio playback failed", e);
    }
  }

  // Play game over sound (triumphant chord or low draw rumble)
  playGameOver(outcome: "win" | "loss" | "draw") {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      if (outcome === "win") {
        // Triumphant C Major ascending arpeggio
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t + idx * 0.1);

          gain.gain.setValueAtTime(0.001, t + idx * 0.1);
          gain.gain.linearRampToValueAtTime(0.08, t + idx * 0.1 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.25);

          osc.start(t + idx * 0.1);
          osc.stop(t + idx * 0.1 + 0.25);
        });
      } else {
        // Low minor chord/rumble
        const notes = [130.81, 155.56, 196.00]; // C3, Eb3, G3
        notes.forEach((freq) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0.001, t);
          gain.gain.linearRampToValueAtTime(0.05, t + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

          osc.start(t);
          osc.stop(t + 0.4);
        });
      }
    } catch (e) {
      console.warn("Audio playback failed", e);
    }
  }
}

export const sound = new SoundManager();
