import type {Point} from '../tracking/types.ts';
import {motionConfig} from './config.ts';
export type PinchState='OPEN'|'CLOSING'|'GRABBED'|'RELEASING';
export function pinchRatio(points:Point[],aspect=4/3):number|undefined {
  if(points.length!==21||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return;
  const distance=(a:number,b:number)=>Math.hypot((points[a].x-points[b].x)*aspect,points[a].y-points[b].y);
  const size=Math.max(distance(0,9),distance(5,17));
  return size>=.02?distance(4,8)/size:undefined;
}
export class PinchRecognizer {
  state:PinchState='OPEN';
  armed=false;
  private since?:number;
  private armSince?:number;
  reset(){this.state='OPEN';this.armed=false;this.since=undefined;this.armSince=undefined;}
  update(ratio:number,now:number){
    let started=false,released=false;
    if(!this.armed){
      if(ratio>=motionConfig.pinchRelease){this.armSince??=now;if(now-this.armSince>=motionConfig.pinchArmMs)this.armed=true;}
      else this.armSince=undefined;
      return {started,released};
    }
    if(this.state==='OPEN'&&ratio<=motionConfig.pinchClose){this.state='CLOSING';this.since=now;}
    else if(this.state==='CLOSING'){
      if(ratio>motionConfig.pinchClose){this.state='OPEN';this.since=undefined;}
      else if(now-this.since!>=motionConfig.pinchCloseMs){this.state='GRABBED';started=true;}
    }else if(this.state==='GRABBED'&&ratio>=motionConfig.pinchRelease){this.state='RELEASING';this.since=now;}
    else if(this.state==='RELEASING'){
      if(ratio<motionConfig.pinchRelease){this.state='GRABBED';this.since=undefined;}
      else if(now-this.since!>=motionConfig.pinchReleaseMs){this.state='OPEN';released=true;this.since=undefined;}
    }
    return {started,released};
  }
  resumeCarry(){this.state='GRABBED';this.armed=true;this.since=undefined;}
}
