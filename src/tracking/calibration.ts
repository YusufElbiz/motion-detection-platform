import {clamp01} from './coordinates.ts';
import type {Bounds, Point} from './types.ts';
export class CalibrationManager {
  private samples: Point[]=[];
  stage: 'idle'|'one'|'two'|'reach'|'ready'='idle';
  bounds?: Bounds;
  progress=0;
  private stableSince?: number;
  reset() {this.samples=[];this.stage='idle';this.bounds=undefined;this.progress=0;this.stableSince=undefined;}
  start() {this.reset();this.stage='one';}
  observe(points: Point[], timestamp: number) {
    if(this.stage==='one'||this.stage==='two') {
      const enough=points.length>=(this.stage==='one'?1:2);
      if(!enough){this.stableSince=undefined;this.progress=0;return;}
      this.stableSince ??= timestamp;
      this.progress=Math.min(1,(timestamp-this.stableSince)/700);
      if(this.progress>=1){this.stage=this.stage==='one'?'two':'reach';this.progress=0;this.stableSince=undefined;}
    } else if(this.stage==='reach') {
      this.samples.push(...points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).map(p=>({...p,x:clamp01(p.x),y:clamp01(p.y)})));
      // Bounded in-memory rolling sample set; never persisted.
      if(this.samples.length>1500)this.samples.splice(0,this.samples.length-1500);
    }
  }
  finish(): boolean {
    const bounds=this.measureBounds();if(!bounds)return false;
    this.bounds=bounds;this.stage='ready';this.samples=[];return true;
  }
  get canFinish(){return this.measureBounds()!==undefined;}
  private measureBounds():Bounds|undefined {
    if(this.stage!=='reach'||this.samples.length<20)return;
    const quantile=(values:number[],fraction:number)=>values.sort((a,b)=>a-b)[Math.floor((values.length-1)*fraction)];
    const x=this.samples.map(p=>p.x),y=this.samples.map(p=>p.y);
    const left=quantile([...x],.03),right=quantile([...x],.97),top=quantile([...y],.03),bottom=quantile([...y],.97);
    if(right-left<.2||bottom-top<.2)return;
    return {left,top,right,bottom};
  }
}
