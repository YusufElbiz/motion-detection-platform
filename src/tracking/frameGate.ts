// Preserve average target cadence on cameras whose FPS is not a multiple of the
// requested inference rate (e.g. 24 inferences from a 30 FPS camera).
export class FrameGate {
  private lastMediaTime=-1;
  private nextDue?:number;
  reset(){this.lastMediaTime=-1;this.nextDue=undefined;}
  accept(mediaTime:number,now:number,rate:number,busy:boolean){
    if(mediaTime===this.lastMediaTime)return {fresh:false,due:false};
    this.lastMediaTime=mediaTime;
    if(busy)return {fresh:true,due:false};
    const period=1000/Math.max(5,Math.min(30,rate));
    if(this.nextDue===undefined||now-this.nextDue>period)this.nextDue=now;
    if(now+.1<this.nextDue)return {fresh:true,due:false};
    this.nextDue+=period;
    return {fresh:true,due:true};
  }
}
