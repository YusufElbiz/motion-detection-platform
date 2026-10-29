import type {ModelGesture,Point} from '../tracking/types.ts';
export type HandPose='OPEN'|'CLOSED'|'UNKNOWN';
export type FistState=HandPose|'CLOSING'|'OPENING';
export const fistDefaults={confirmMs:70,modelEnter:.7,modelKeep:.55,openAngle:150,closedAngle:110,maxGapMs:170};
export interface FingerMetric {name:string;pipAngle:number;dipAngle:number;reach:number;curl:number;state:'extended'|'curled'|'ambiguous'}
export interface PoseMeasurement {pose:HandPose;score:number;source:'model'|'heuristic';fingers:FingerMetric[]}
const length=(p:Point)=>Math.hypot(p.x,p.y,p.z);
const sub=(a:Point,b:Point)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
function angle(a:Point,b:Point,c:Point){const ab=sub(a,b),cb=sub(c,b),size=length(ab)*length(cb);return size<1e-8?NaN:Math.acos(Math.max(-1,Math.min(1,(ab.x*cb.x+ab.y*cb.y+ab.z*cb.z)/size)))*180/Math.PI;}
export function landmarkPose(raw:Point[],aspect=4/3,thresholds=fistDefaults):PoseMeasurement {
  const unknown:PoseMeasurement={pose:'UNKNOWN',score:0,source:'heuristic',fingers:[]};
  if(raw.length!==21||raw.some(p=>![p.x,p.y,p.z].every(Number.isFinite)))return unknown;
  const p=raw.map(p=>({x:p.x*aspect,y:p.y,z:p.z*aspect}));
  const size=Math.max(length(sub(p[0],p[9])),length(sub(p[5],p[17])));if(size<.025)return unknown;
  const fingers:FingerMetric[]=[['İşaret',5],['Orta',9],['Yüzük',13],['Serçe',17]].map(([name,index])=>{
    const i=Number(index),pipAngle=angle(p[i],p[i+1],p[i+2]),dipAngle=angle(p[i+1],p[i+2],p[i+3]);
    const reach=length(sub(p[i+3],p[0]))/Math.max(.0001,length(sub(p[i],p[0])));
    const curl=Math.max(0,Math.min(1,1-(pipAngle+dipAngle)/360));
    const state=pipAngle>=thresholds.openAngle&&dipAngle>=thresholds.openAngle-10&&reach>1.25?'extended':pipAngle<=thresholds.closedAngle&&reach<1.3?'curled':'ambiguous';
    return {name:String(name),pipAngle,dipAngle,reach,curl,state};
  });
  if(fingers.some(f=>!Number.isFinite(f.pipAngle)||!Number.isFinite(f.dipAngle)))return {...unknown,fingers};
  const extended=fingers.filter(f=>f.state==='extended').length,curled=fingers.filter(f=>f.state==='curled').length;
  const pose=extended>=3&&curled===0?'OPEN':curled>=3&&extended===0?'CLOSED':'UNKNOWN';
  return {pose,score:(pose==='OPEN'?extended:pose==='CLOSED'?curled:0)/4,source:'heuristic',fingers};
}
export function modelPose(gesture:ModelGesture|undefined,previous:HandPose,fingers:FingerMetric[]=[],thresholds=fistDefaults):PoseMeasurement {
  const pose:HandPose=gesture?.label==='Open_Palm'?'OPEN':gesture?.label==='Closed_Fist'?'CLOSED':'UNKNOWN';
  const score=Number.isFinite(gesture?.score)?gesture!.score:0;
  return {pose:score>=(pose===previous?thresholds.modelKeep:thresholds.modelEnter)?pose:'UNKNOWN',score,source:'model',fingers};
}
export class FistRecognizer {
  state:FistState='UNKNOWN';
  stable:HandPose='UNKNOWN';
  armed=false;
  confirmationMs=fistDefaults.confirmMs;
  minimumSamples=2;
  lastConfirmationMs=0;
  private candidate?:HandPose;
  private since=0;
  private last=-Infinity;
  private samples=0;
  reset(){this.state='UNKNOWN';this.stable='UNKNOWN';this.armed=false;this.candidate=undefined;this.last=-Infinity;this.samples=0;}
  resumeCarry(){this.reset();this.stable='CLOSED';this.state='CLOSED';this.armed=true;}
  update(pose:HandPose,now:number){
    let grabbed=false,released=false;
    if(now-this.last>fistDefaults.maxGapMs||now<this.last){this.candidate=undefined;if(this.last!==-Infinity){this.stable='UNKNOWN';this.armed=false;}}
    this.last=now;
    if(pose==='UNKNOWN'){this.state='UNKNOWN';this.candidate=undefined;this.samples=0;return {grabbed,released,progress:0};}
    if(pose===this.stable){this.state=pose;this.candidate=undefined;return {grabbed,released,progress:0};}
    if(this.candidate!==pose){this.candidate=pose;this.since=now;this.samples=0;}
    this.samples++;this.state=pose==='CLOSED'?'CLOSING':'OPENING';
    const progress=Math.min(1,(now-this.since)/Math.max(40,this.confirmationMs));
    if(progress>=1&&this.samples>=this.minimumSamples){
      const previous=this.stable;this.lastConfirmationMs=now-this.since;this.stable=pose;this.state=pose;this.candidate=undefined;
      if(pose==='OPEN'){released=previous==='CLOSED'&&this.armed;this.armed=true;}
      else grabbed=previous==='OPEN'&&this.armed;
    }
    return {grabbed,released,progress};
  }
}
