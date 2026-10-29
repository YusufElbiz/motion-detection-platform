export class AudioFeedback {
  private isMuted=false;
  private music?:HTMLAudioElement;
  private musicActive=false;
  private voices=new Set<string>();
  private fadeTimer?:ReturnType<typeof setInterval>;
  get muted(){return this.isMuted;}
  set muted(value:boolean){this.isMuted=value;if(value){this.music?.pause();this.clearFade();}else if(this.musicActive)this.playMusic();}
  startMusic(){this.musicActive=true;this.playMusic();}
  pauseMusic(){this.musicActive=false;this.music?.pause();this.clearFade();}
  stopMusic(){this.pauseMusic();if(this.music)this.music.currentTime=0;}
  setVoiceActive(id:string,active:boolean){if(active)this.voices.add(id);else this.voices.delete(id);this.fadeMusic();}
  private playMusic(){
    if(this.muted||!this.musicActive)return;
    this.music??=new Audio('/audio/music/dogaya-dost-ol-no-intro.mp3');
    this.music.dataset.role='background-music';this.music.loop=true;this.music.preload='metadata';
    this.music.volume=this.voices.size?.035:.13;
    void this.music.play().catch(()=>{});
  }
  private clearFade(){if(this.fadeTimer!==undefined){clearInterval(this.fadeTimer);this.fadeTimer=undefined;}}
  private fadeMusic(){
    this.clearFade();if(!this.music||this.music.paused)return;
    const target=this.voices.size?.035:.13;
    this.fadeTimer=setInterval(()=>{
      if(!this.music||this.music.paused){this.clearFade();return;}
      const gap=target-this.music.volume;
      this.music.volume=Math.abs(gap)<.008?target:this.music.volume+Math.sign(gap)*.008;
      if(this.music.volume===target)this.clearFade();
    },30);
  }
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
