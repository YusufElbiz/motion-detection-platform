import type {ModelGesture} from '../tracking/types.ts';
export type Pose='UNKNOWN'|'OPEN'|'CLOSED';
export type GestureState=Pose|'CLOSING'|'OPENING';
export interface GestureSettings {threshold:number;openMs:number;closedMs:number}
export const gestureDefaults:GestureSettings={threshold:.6,openMs:60,closedMs:60};
export class GestureMachine {
  state:GestureState='UNKNOWN';
  stable:Pose='UNKNOWN';
  confirmationMs=0;
  private candidate?:Pose;
  private since=0;
  private last=-Infinity;
  private unknownSince?:number;
  reset(){this.state=this.stable='UNKNOWN';this.candidate=undefined;this.last=-Infinity;this.unknownSince=undefined;this.confirmationMs=0;}
  update(gesture:ModelGesture|undefined,time:number,settings:GestureSettings){
    const pose:Pose=gesture?.label==='Open_Palm'?'OPEN':gesture?.label==='Closed_Fist'?'CLOSED':'UNKNOWN';
    const threshold=pose===this.stable?Math.max(0,settings.threshold-.12):settings.threshold;
    const accepted=gesture&&Number.isFinite(gesture.score)&&gesture.score>=threshold?pose:'UNKNOWN';
    this.updatePose(accepted,time,settings);
  }
  updatePose(accepted:Pose,time:number,settings:GestureSettings){
    if(time<=this.last||time-this.last>200)this.reset();
    this.last=time;
    if(accepted==='UNKNOWN'){
      this.candidate=undefined;this.unknownSince??=time;
      if(time-this.unknownSince>=120)this.state=this.stable='UNKNOWN';
      else this.state=this.stable;
      return;
    }
    this.unknownSince=undefined;
    if(accepted===this.stable){this.state=accepted;this.candidate=undefined;return;}
    if(accepted!==this.candidate){this.candidate=accepted;this.since=time;}
    this.state=accepted==='OPEN'?'OPENING':'CLOSING';
    if(time-this.since>=(accepted==='OPEN'?settings.openMs:settings.closedMs)){
      this.confirmationMs=time-this.since;this.state=this.stable=accepted;this.candidate=undefined;
    }
  }
}
