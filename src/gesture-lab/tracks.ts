import {palmCenter} from '../tracking/coordinates.ts';
import type {Detection,Point} from '../tracking/types.ts';
import {PalmFilter} from './filter.ts';
import {GestureMachine,gestureDefaults,type GestureSettings, type GestureState} from './gesture.ts';
import {classifyPose,type PoseEvidence} from './geometry.ts';
export interface LabSettings extends GestureSettings {smoothing:boolean;strength:number}
export const labDefaults:LabSettings={...gestureDefaults,smoothing:true,strength:2};
export interface Track {
  id:number;raw:Point;position:Point;lastSeen:number;handedness:string;handednessScore:number;
  detection?:Detection;status:'visible'|'lost'|'uncertain';velocity:Point;
  evidence?:PoseEvidence;
  filter:PalmFilter;gesture:GestureMachine;history:{time:number;state:GestureState}[];
}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export class HandTracks {
  tracks:Track[]=[];
  settings:LabSettings={...labDefaults};
  expiryMs=650;
  aspect=4/3;
  uncertain=false;
  identityResets=0;
  private nextId=1;
  private last=-Infinity;
  private reidentify=false;
  reset(){this.tracks=[];this.last=-Infinity;this.uncertain=false;this.reidentify=false;this.identityResets=0;}
  private record(track:Track,time:number){
    if(track.history.at(-1)?.state!==track.gesture.state){track.history.push({time,state:track.gesture.state});if(track.history.length>12)track.history.shift();}
  }
  age(time:number){
    this.tracks=this.tracks.filter(t=>time-t.lastSeen<this.expiryMs);
    for(const track of this.tracks)if(time-track.lastSeen>180){track.detection=undefined;if(track.status!=='uncertain')track.status='lost';track.gesture.reset();track.filter.reset();this.record(track,time);}
  }
  update(input:Detection[],time:number){
    if(time<=this.last){if(time<this.last)this.reset();else return this.tracks;}
    this.last=time;this.age(time);
    const detections=input.filter(d=>d.landmarks.length===21&&d.landmarks.every(p=>[p.x,p.y,p.z].every(Number.isFinite))).slice(0,2);
    const centers=detections.map(d=>palmCenter(d.landmarks));
    const prediction=(track:Track):Point=>{
      const dt=Math.min(120,time-track.lastSeen)/1000;
      return {x:track.raw.x+track.velocity.x*dt,y:track.raw.y+track.velocity.y*dt,z:track.raw.z};
    };
    const cost=(track:Track,index:number)=>{
      const d=distance(prediction(track),centers[index]);
      if(d>Math.min(.3,.14+(time-track.lastSeen)*.0004))return Infinity;
      const hint=detections[index];
      return d+(track.handednessScore>.8&&hint.handednessScore>.8&&track.handedness!==hint.handedness ? .015 : 0);
    };
    // Enumerate ALL assignments (at most two detections/tracks), including births.
    const options:{ids:number[];score:number}[]=[];
    const visit=(ids:number[],used:Set<number>,score:number)=>{
      if(ids.length===detections.length){options.push({ids,score});return;}
      const i=ids.length;
      visit([...ids,-1],used,score+.34);
      this.tracks.forEach((track,j)=>{const c=cost(track,i);if(!used.has(j)&&Number.isFinite(c))visit([...ids,j],new Set([...used,j]),score+c);});
    };
    visit([],new Set(),0);options.sort((a,b)=>a.score-b.score);
    const close=centers.length===2&&distance(centers[0],centers[1])<.065;
    const tied=options.length>1&&options[1].score-options[0].score<.035;
    this.uncertain=close||tied;
    if(this.uncertain){
      this.reidentify=true;
      for(const track of this.tracks){track.status='uncertain';track.detection=undefined;track.gesture.reset();track.filter.reset();this.record(track,time);}
      return this.tracks;
    }
    // After unobservable overlap there is no biometric identity proof. Explicitly
    // retire IDs, rather than attach somebody else's gesture to an old ID.
    if(this.reidentify&&detections.length){this.tracks=[];this.identityResets++;this.reidentify=false;options[0].ids=detections.map(()=>-1);}
    const previous=[...this.tracks];
    for(const track of previous){track.status='lost';track.detection=undefined;}
    detections.forEach((d,i)=>{
      let track=previous[options[0].ids[i]];
      if(!track){
        // A gated-out detection cannot inherit an old track. Retire a missing
        // track if both available slots are occupied; monotonic IDs expose it.
        if(this.tracks.length>=2){const reserved=new Set(options[0].ids.filter(j=>j>=0).map(j=>previous[j]));const lost=this.tracks.filter(t=>t.status==='lost'&&!reserved.has(t)).sort((a,b)=>a.lastSeen-b.lastSeen)[0];if(lost)this.tracks=this.tracks.filter(t=>t!==lost);}
        track={id:this.nextId++,raw:centers[i],position:centers[i],lastSeen:time,handedness:d.handedness,handednessScore:d.handednessScore,status:'visible',velocity:{x:0,y:0,z:0},filter:new PalmFilter(),gesture:new GestureMachine(),history:[]};
        this.tracks.push(track);
      }else{
        const gap=time-track.lastSeen;
        if(gap>180){track.filter.reset();track.gesture.reset();track.velocity={x:0,y:0,z:0};}
        else if(gap>0){const dt=gap/1000;track.velocity={x:(centers[i].x-track.raw.x)/dt,y:(centers[i].y-track.raw.y)/dt,z:0};}
      }
      track.raw=centers[i];track.lastSeen=time;track.detection=d;track.handedness=d.handedness;track.handednessScore=d.handednessScore;track.status='visible';
      track.position=track.filter.update(track.raw,time,this.settings.smoothing,this.settings.strength);
      track.evidence=classifyPose(d,track.gesture.stable,this.settings,this.aspect);
      track.gesture.updatePose(track.evidence.pose,time,this.settings);this.record(track,time);
    });
    for(const track of this.tracks)if(track.status==='lost'){track.gesture.reset();this.record(track,time);}
    return this.tracks;
  }
}
