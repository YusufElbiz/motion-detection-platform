import type {Point} from '../tracking/types.ts';

// Original implementation of the One Euro equations; timestamps are milliseconds.
export class OneEuro {
  minCutoff=1.6;
  beta=12;
  derivativeCutoff=1;
  resetAfterMs=180;
  private time?:number;
  private raw=0;
  private value=0;
  private derivative=0;
  reset(){this.time=undefined;this.derivative=0;}
  update(value:number,time:number){
    if(this.time===undefined||time<=this.time||time-this.time>this.resetAfterMs){
      this.time=time;this.raw=this.value=value;this.derivative=0;return value;
    }
    const dt=(time-this.time)/1000;
    const alpha=(cutoff:number)=>1/(1+1/(2*Math.PI*Math.max(.01,cutoff)*dt));
    this.derivative+=alpha(this.derivativeCutoff)*((value-this.raw)/dt-this.derivative);
    this.value+=alpha(this.minCutoff+this.beta*Math.abs(this.derivative))*(value-this.value);
    this.raw=value;this.time=time;return this.value;
  }
}
export class PalmFilter {
  readonly axes=[new OneEuro(),new OneEuro(),new OneEuro()];
  reset(){this.axes.forEach(axis=>axis.reset());}
  update(point:Point,time:number,enabled:boolean,strength:number):Point {
    if(!enabled){this.reset();return {...point};}
    this.axes.forEach(axis=>{axis.minCutoff=3/strength;axis.beta=12;});
    return {x:this.axes[0].update(point.x,time),y:this.axes[1].update(point.y,time),z:this.axes[2].update(point.z,time)};
  }
}
