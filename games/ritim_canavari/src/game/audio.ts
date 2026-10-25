export class BeatAudio{
 ctx:AudioContext|null=null;enabled=true;
 wake(){try{this.ctx??=new AudioContext();if(this.ctx.state==='suspended')void this.ctx.resume()}catch{/* Browsers without Web Audio are allowed. */}}
 note(type:'beat'|'good'|'level'|'oops'|'win',pitch=0){if(!this.enabled)return;this.wake();if(!this.ctx)return;
  const t=this.ctx.currentTime;const notes=type==='good'?[620,830]:type==='level'?[520,680,840,1020]:type==='win'?[440,580,780,1030,1280]:type==='oops'?[185]:[210+pitch*24];
  notes.forEach((hz,i)=>{const osc=this.ctx!.createOscillator(),vol=this.ctx!.createGain(),st=t+i*(type==='beat'?0:.105);osc.type=type==='beat'?'sine':type==='oops'?'sawtooth':'triangle';osc.frequency.setValueAtTime(hz,st);vol.gain.setValueAtTime(.0001,st);vol.gain.exponentialRampToValueAtTime(type==='beat'?.032:.068,st+.008);vol.gain.exponentialRampToValueAtTime(.0001,st+(type==='beat'?.075:.15));osc.connect(vol).connect(this.ctx!.destination);osc.start(st);osc.stop(st+.17);});
 }
}
