import type {Landmark} from '../vision/types';
import {LANDMARKS,LINKS,type Joint,type Pose} from './poses';
export type FeedbackStatus='good'|'warn'|'bad'|'missing';
export interface SegmentFeedback { start:Joint; end:Joint; status:FeedbackStatus; error:number; label:string }
export interface MatchResult { score:number; accepted:boolean; visible:boolean; message:string; worst:string; maxError:number; jointFeedback:Partial<Record<Joint,FeedbackStatus>>; segmentFeedback:SegmentFeedback[]; highlights:string[]; }
const LABELS:Record<Joint,string>={head:'Baş',leftShoulder:'Sol omuz',rightShoulder:'Sağ omuz',leftElbow:'Sol dirsek',rightElbow:'Sağ dirsek',leftWrist:'Sol el',rightWrist:'Sağ el',leftHip:'Sol kalça',rightHip:'Sağ kalça',leftKnee:'Sol diz',rightKnee:'Sağ diz',leftAnkle:'Sol ayak',rightAnkle:'Sağ ayak'};
const emptyResult=(message='Oyuncu bekleniyor',visible=false,worst=''):{score:number;accepted:boolean;visible:boolean;message:string;worst:string;maxError:number;jointFeedback:Partial<Record<Joint,FeedbackStatus>>;segmentFeedback:SegmentFeedback[];highlights:string[]}=>({score:0,accepted:false,visible,message,worst,maxError:180,jointFeedback:{},segmentFeedback:[],highlights:[]});
const degrees=(a:number)=>a*180/Math.PI;
export const deltaAngle=(a:number,b:number)=>Math.abs((a-b+540)%360-180);
export function mirrorCenter(landmarks:Landmark[]):number{return 1-(landmarks[11].x+landmarks[12].x+landmarks[23].x+landmarks[24].x)/4;}
export function distribute(poses:Landmark[][]):[Landmark[]|null,Landmark[]|null]{
  const valid=poses.filter(p=>p.length>=29&&[11,12,23,24].every(j=>(p[j].visibility??1)>.42));
  const sorted=valid.sort((a,b)=>mirrorCenter(a)-mirrorCenter(b));
  if(sorted.length>=2){
    // A pair standing on top of each other cannot be assigned safely.
    const a=mirrorCenter(sorted[0]),b=mirrorCenter(sorted[1]);
    if(b-a<.15 || a>.58 || b<.42)return [null,null];
    return [sorted[0],sorted[1]];
  }
  if(sorted.length===1){return mirrorCenter(sorted[0])<.5?[sorted[0],null]:[null,sorted[0]];}
  return [null,null];
}
// A running exponential filter removes camera landmark jitter, but it is reset on lost tracks.
export function smoothPose(previous:Landmark[]|null,current:Landmark[],alpha=.53):Landmark[]{
  if(!previous||previous.length!==current.length)return current.map(p=>({...p}));
  return current.map((p,i)=>({x:previous[i].x*(1-alpha)+p.x*alpha,y:previous[i].y*(1-alpha)+p.y*alpha,z:(previous[i].z??0)*(1-alpha)+(p.z??0)*alpha,visibility:p.visibility,presence:p.presence}));
}
// A single camera inference can jitter by several degrees or lose a wrist for
// one frame. Never require pixel-perfect angles. The entire limb direction is
// compared against the target, and each segment reports its own pass margin.
export function scorePose(input:Landmark[]|null,target:Pose,aspect=16/9,precision=1,difficulty:'easy'|'normal'|'hard'='normal'):MatchResult{
  if(!input||input.length<29)return emptyResult('Kadraja gir · tüm vücudun görünsün');
  const visibility=0.35;
  const visible=(joint:Joint):boolean=>{
    const p=input[LANDMARKS[joint]];
    return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) &&
      p.x>=-.065&&p.x<=1.065&&p.y>=-.065&&p.y<=1.065&&
      Math.min(p.visibility??1,p.presence??1)>=visibility;
  };
  const angleLimit=({easy:78,normal:60,hard:47})[difficulty]/precision;
  const torsoLimit=({easy:48,normal:38,hard:30})[difficulty]/precision;
  const headLimit=({easy:85,normal:75,hard:63})[difficulty]/precision;
  const minScore=({easy:.67,normal:.72,hard:.77})[difficulty];
  const segments:SegmentFeedback[]=[];
  const statuses:Partial<Record<Joint,FeedbackStatus>>={};
  const ranked:{label:string;error:number;limit:number;joint:Joint}[]=[];
  let missing=false;
  let weightedError=0,totalWeight=0;
  const mark=(joint:Joint,status:FeedbackStatus)=>{
    const order:Record<FeedbackStatus,number>={good:0,warn:1,bad:2,missing:3};
    if(!statuses[joint]||order[status]>order[statuses[joint]!])statuses[joint]=status;
  };
  const classify=(error:number,limit:number):FeedbackStatus=>error<=limit*.70?'good':error<=limit?'warn':'bad';
  const add=(start:Joint,end:Joint,error:number,limit:number,weight:number,label:string)=>{
    const status=classify(error,limit);
    mark(start,status);mark(end,status);
    segments.push({start,end,status,error,label});
    ranked.push({joint:end,label,error,limit});
    totalWeight+=weight;
    weightedError+=weight*Math.min(1,error/(limit*1.6));
  };
  for(const [start,end] of LINKS){
    if(!visible(start)||!visible(end)){
      missing=true;
      if(!visible(start))mark(start,'missing');
      if(!visible(end))mark(end,'missing');
      continue;
    }
    const a=input[LANDMARKS[start]],b=input[LANDMARKS[end]];
    // The player sees a mirrored camera. Correct horizontal scale by video aspect ratio.
    const actual=degrees(Math.atan2(b.y-a.y,(a.x-b.x)*aspect));
    const expected=degrees(Math.atan2(target[end][1]-target[start][1],target[end][0]-target[start][0]));
    const error=deltaAngle(actual,expected);
    const weight=end.includes('Wrist')||end.includes('Ankle')?1.15:1;
    add(start,end,error,angleLimit,weight,`${LABELS[end]} yönü`);
  }
  if(visible('leftShoulder')&&visible('rightShoulder')&&visible('leftHip')&&visible('rightHip')){
    const shoulder=[(input[11].x+input[12].x)/2,(input[11].y+input[12].y)/2];
    const hip=[(input[23].x+input[24].x)/2,(input[23].y+input[24].y)/2];
    const shoulderTarget=[(target.leftShoulder[0]+target.rightShoulder[0])/2,(target.leftShoulder[1]+target.rightShoulder[1])/2];
    const hipTarget=[(target.leftHip[0]+target.rightHip[0])/2,(target.leftHip[1]+target.rightHip[1])/2];
    const actual=degrees(Math.atan2(shoulder[1]-hip[1],(hip[0]-shoulder[0])*aspect));
    const expected=degrees(Math.atan2(shoulderTarget[1]-hipTarget[1],hipTarget[0]-shoulderTarget[0]));
    const error=deltaAngle(actual,expected);
    const status=classify(error,torsoLimit);
    mark('leftHip',status);mark('rightHip',status);
    ranked.push({joint:'leftHip',label:'Gövde eğimi',error,limit:torsoLimit});
    totalWeight+=.85;weightedError+=.85*Math.min(1,error/(torsoLimit*1.6));
  }else missing=true;
  if(visible('head')&&visible('leftShoulder')&&visible('rightShoulder')){
    const shoulder=[(input[11].x+input[12].x)/2,(input[11].y+input[12].y)/2];
    const targetShoulder=[(target.leftShoulder[0]+target.rightShoulder[0])/2,(target.leftShoulder[1]+target.rightShoulder[1])/2];
    const actual=degrees(Math.atan2(input[0].y-shoulder[1],(shoulder[0]-input[0].x)*aspect));
    const expected=degrees(Math.atan2(target.head[1]-targetShoulder[1],target.head[0]-targetShoulder[0]));
    const error=deltaAngle(actual,expected);
    mark('head',classify(error,headLimit));
    ranked.push({joint:'head',label:'Baş yönü',error,limit:headLimit});
    totalWeight+=.35;weightedError+=.35*Math.min(1,error/(headLimit*1.6));
  }else missing=true;
  const score=totalWeight?Math.max(0,1-weightedError/totalWeight):0;
  const worst=ranked.sort((a,b)=>(b.error/b.limit)-(a.error/a.limit))[0];
  const outside=ranked.filter(d=>d.error>d.limit);
  const highlights=ranked.filter(d=>d.error>d.limit*.7).slice(0,3).map(d=>`${d.label}: ${Math.round(d.error)}°`);
  const missingKeys=(Object.keys(LANDMARKS) as Joint[]).filter(j=>!visible(j));
  if(missingKeys.length){
    missing=true;
    for(const j of missingKeys)mark(j,'missing');
    highlights.unshift(`${LABELS[missingKeys[0]]} kamerada görünmüyor`);
  }
  const accepted=!missing&&outside.length===0&&score>=minScore;
  const message=missing?`${LABELS[missingKeys[0]??'head']} görünmüyor · kadrajı düzelt`:
    accepted?'DOĞRU POZ · KISA SÜRE SABİT KAL':
    outside.length?`${outside[0].label} yanlış (${Math.round(outside[0].error)}°)`:
    'Çok yaklaştın · pozu biraz daha düzelt';
  return {score,accepted,visible:!missing,message,worst:worst?.joint??'',maxError:worst?.error??0,
    jointFeedback:statuses,segmentFeedback:segments,highlights};
}

// Cooperative stages require physical coordination between the two players.
// Pixel coordinates are aspect-corrected and divided by the average torso
// length; this makes the threshold independent of camera resolution and distance.
export function scoreContact(a:Landmark[]|null,b:Landmark[]|null,contact:import('./poses').Contact,aspect=16/9):{accepted:boolean;distance:number;message:string}{
  const fail={accepted:false,distance:Infinity,message:contact.hint};
  if(!a||!b)return fail;
  const indexA=LANDMARKS[contact.a],indexB=LANDMARKS[contact.b];
  const u=a[indexA],v=b[indexB];
  if(!u||!v||[u,v].some(p=>(p.visibility??1)<.45||(p.presence??1)<.45))return fail;
  const torso=(points:Landmark[]):number=>{
    const shoulder=[(points[11].x+points[12].x)/2,(points[11].y+points[12].y)/2];
    const hip=[(points[23].x+points[24].x)/2,(points[23].y+points[24].y)/2];
    return Math.hypot((shoulder[0]-hip[0])*aspect,shoulder[1]-hip[1]);
  };
  const span=(torso(a)+torso(b))/2;
  if(span<.025)return fail;
  const distance=Math.hypot((u.x-v.x)*aspect,u.y-v.y)/span;
  return {accepted:distance<=contact.maxTorso,distance,message:distance<=contact.maxTorso?'TAKIM TEMASI TAMAM ✓':contact.hint};
}
