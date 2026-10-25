export class AudioFeedback {
  muted = false;
  private context?: AudioContext;
  play(success: boolean) {
    if (this.muted) return;
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
      const start = this.context.currentTime;
      for (let i=0; i<2; i++) {
        const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = success ? [523,659][i] : [392,440][i];
        gain.gain.setValueAtTime(0, start+i*0.13); gain.gain.linearRampToValueAtTime(0.07, start+i*0.13+0.02); gain.gain.exponentialRampToValueAtTime(0.001,start+i*0.13+0.24);
        oscillator.connect(gain); gain.connect(this.context.destination); oscillator.start(start+i*0.13); oscillator.stop(start+i*0.13+0.25);
      }
    } catch { /* Silent fallback when audio is unavailable. */ }
  }
}
