import type {Detection,Point} from '../tracking/types.ts';
import type {Pose,GestureSettings} from './gesture.ts';

export interface FingerEvidence {
  name:string;pip:number;dip:number;straightness:number;outward:number;
  state:'extended'|'curled'|'uncertain';
}
export interface GeometryEvidence {
  pose:Pose;fingers:FingerEvidence[];space:'world'|'image';valid:boolean;
  extended:number;curled:number;
}
export interface PoseEvidence {
  pose:Pose;source:'model'|'geometry'|'agreement'|'unknown';
  geometry:GeometryEvidence;conflict:boolean;
}
const sub=(a:Point,b:Point):Point=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const length=(v:Point)=>Math.hypot(v.x,v.y,v.z);
const dot=(a:Point,b:Point)=>a.x*b.x+a.y*b.y+a.z*b.z;
const distance=(a:Point,b:Point)=>length(sub(a,b));
function joint(a:Point,b:Point,c:Point){
  const u=sub(a,b),v=sub(c,b),denominator=length(u)*length(v);
  return denominator>1e-12?Math.acos(Math.max(-1,Math.min(1,dot(u,v)/denominator)))*180/Math.PI:NaN;
}
const valid=(points:Point[]|undefined):points is Point[]=>points?.length===21&&points.every(p=>[p.x,p.y,p.z].every(Number.isFinite));

// No screen-axis tests: all measurements are 3D distances, joint angles and
// projections onto each finger's palm-relative axis. Global rotation cancels.
export function measureGeometry(detection:Detection,aspect:number):GeometryEvidence {
  const world=valid(detection.worldLandmarks);
  const space=world?'world':'image';
  const unknown:GeometryEvidence={pose:'UNKNOWN',fingers:[],space,valid:false,extended:0,curled:0};
  if(!valid(detection.landmarks)||!Number.isFinite(aspect)||aspect<=0)return unknown;
  const p=world?detection.worldLandmarks!:detection.landmarks.map(p=>({x:p.x*aspect,y:p.y,z:p.z*aspect}));
  const palmSize=Math.max(distance(p[0],p[9]),distance(p[5],p[17]));
  // World coordinates are metres; image coordinates are height-normalized.
  if(palmSize<(world ? .008 : .025))return unknown;
  const fingers:FingerEvidence[]=[];
  for(const [name,i] of [['İşaret',5],['Orta',9],['Yüzük',13],['Serçe',17]] as const){
    const a=distance(p[i],p[i+1]),b=distance(p[i+1],p[i+2]),c=distance(p[i+2],p[i+3]),chain=a+b+c;
    const axis=sub(p[i],p[0]),axisLength=length(axis);
    if(Math.min(a,b,c)<palmSize*.035||Math.max(a,b,c)>palmSize*1.3||chain<palmSize*.25||chain>palmSize*3||axisLength<palmSize*.25)return unknown;
    const pip=joint(p[i],p[i+1],p[i+2]),dip=joint(p[i+1],p[i+2],p[i+3]);
    const straightness=distance(p[i],p[i+3])/chain;
    const outward=dot(sub(p[i+3],p[i]),axis)/(chain*axisLength);
    const extended=pip>=140&&dip>=135&&straightness>=.82&&outward>=.4;
    // Flexion at the MCP also closes a finger: straight phalanges folded
    // toward the palm are not an open hand.
    const curled=(pip<=120&&straightness<=.78&&outward<.35)||(outward<-.12&&straightness<.92);
    fingers.push({name,pip,dip,straightness,outward,state:extended?'extended':curled?'curled':'uncertain'});
  }
  const extended=fingers.filter(f=>f.state==='extended').length,curled=fingers.filter(f=>f.state==='curled').length;
  return {pose:extended>=3&&curled===0?'OPEN':curled>=3&&extended===0?'CLOSED':'UNKNOWN',fingers,space,valid:true,extended,curled};
}

export function classifyPose(detection:Detection,previous:Pose,settings:GestureSettings,aspect:number):PoseEvidence {
  const geometry=measureGeometry(detection,aspect),g=detection.modelGesture;
  const raw:Pose=g?.label==='Open_Palm'?'OPEN':g?.label==='Closed_Fist'?'CLOSED':'UNKNOWN';
  const threshold=raw===previous?Math.max(0,settings.threshold-.12):settings.threshold;
  const model:Pose=g&&Number.isFinite(g.score)&&g.score>=threshold?raw:'UNKNOWN';
  const conflict=model!=='UNKNOWN'&&geometry.pose!=='UNKNOWN'&&model!==geometry.pose;
  if(geometry.pose!=='UNKNOWN'){
    const support=geometry.pose==='OPEN'?geometry.extended:geometry.curled;
    if(conflict&&support<4)return {pose:'UNKNOWN',source:'unknown',geometry,conflict};
    return {pose:geometry.pose,source:model===geometry.pose?'agreement':'geometry',geometry,conflict};
  }
  // Mixed bent/extended fingers contradict a whole-hand open/fist label.
  // A peace sign must not become OPEN just because the model claims it is.
  if(geometry.valid&&geometry.extended>0&&geometry.curled>0)return {pose:'UNKNOWN',source:'unknown',geometry,conflict:model!=='UNKNOWN'};
  return {pose:model,source:model==='UNKNOWN'?'unknown':'model',geometry,conflict};
}
