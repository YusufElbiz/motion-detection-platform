import {motionConfig} from './config.ts';
export class DwellTimer {
  private target?:string;
  private since=0;
  private last=0;
  private fired=false;
  reset(){this.target=undefined;this.since=0;this.last=0;this.fired=false;}
  update(target:string|undefined,now:number,durationMs:number){
    if(!target){this.reset();return {progress:0,complete:false};}
    if(this.target!==target||now-this.last>motionConfig.maxEvidenceGapMs||now<this.last){this.target=target;this.since=now;this.fired=false;}
    this.last=now;
    const progress=Math.min(1,Math.max(0,(now-this.since)/Math.max(200,durationMs)));
    const complete=progress>=1&&!this.fired;if(complete)this.fired=true;
    return {progress,complete};
  }
}
