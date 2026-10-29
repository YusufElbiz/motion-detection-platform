import {trackingConfig} from './config.ts';
import {palmCenter} from './coordinates.ts';
import {smoothPoints,adaptiveTimeConstant} from './smoothing.ts';
import {associateTemporal} from './association.ts';
import {thumbSignature,thumbMatches,type ThumbSignature} from './thumbIdentity.ts';
import type {Detection, Point, TrackedHand, TrackingFrame} from './types.ts';
interface History {id: number; colorSlot: number; handedness:string; thumb?:ThumbSignature; rawCenter: Point; smoothed: Point[]; lastSeen: number;velocity:Point}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export class TrackingProcessor {
  private history: History[]=[];
  private nextId=1;
  private lastTimestamp=-1;
  private overlapSide?:string;
  // +1 when the model's Left label sits on the camera image's right (true
  // anatomical labels for an unmirrored selfie view), -1 for the opposite.
  private conventionVotes=0;
  mirroredLabels?:boolean;
  smoothing=true;
  timeConstantMs=trackingConfig.smoothingTimeConstantMs;
  lossTimeoutMs=trackingConfig.lossTimeoutMs;
  adaptive=false;
  predictive=false;
  stationaryMs=55;
  fastMs=8;
  reset() {this.history=[]; this.nextId=1; this.lastTimestamp=-1;this.overlapSide=undefined;this.conventionVotes=0;this.mirroredLabels=undefined;}
  update(detections: Detection[], timestamp: number): TrackingFrame {
    if(timestamp<this.lastTimestamp) this.reset();
    this.lastTimestamp=timestamp;
    // The API's handedness score is NOT a detection/tracking confidence.
    let valid=detections.filter(d=>d.landmarks.length===21 && d.landmarks.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z))).slice(0,2);
    this.history=this.history.filter(h=>timestamp-h.lastSeen<this.lossTimeoutMs);
    // Resolve brief classification flips by nearby temporal continuity. A single
    // hand crossing the screen must never change its anatomical side.
    valid=valid.map(d=>{
      const center=palmCenter(d.landmarks);
      const thumb=thumbSignature(d);
      const thumbCandidates=thumb?this.history.filter(h=>h.thumb&&thumbMatches(thumb,h.thumb)&&distance(center,h.rawCenter)<Math.min(.65,.15+Math.max(0,timestamp-h.lastSeen)*.004)):[];
      if(thumbCandidates.length===1){
        const track=thumbCandidates[0];
        const claimedElsewhere=valid.some(other=>other!==d&&thumbSignature(other)?.side===thumb!.side&&distance(palmCenter(other.landmarks),track.rawCenter)<distance(center,track.rawCenter));
        if(!claimedElsewhere)return {...d,handedness:track.handedness};
      }
      const nearby=this.history.filter(h=>distance(center,h.rawCenter)<.12).sort((a,b)=>distance(center,a.rawCenter)-distance(center,b.rawCenter));
      const old=nearby[0];
      const unique=old&&(!nearby[1]||distance(center,nearby[1].rawCenter)-distance(center,old.rawCenter)>.05)&&!valid.some(other=>other!==d&&distance(palmCenter(other.landmarks),old.rawCenter)<distance(center,old.rawCenter));
      const corroborated=old&&(thumbMatches(thumb,old.thumb)||(this.history.length===1&&d.handedness===old.handedness));
      return unique&&corroborated&&!this.overlapSide?{...d,handedness:old.handedness}:d;
    });
    // Spatial continuity outranks the per-frame label: the model often swaps
    // Left/Right while a small hand closes into a fist and the thumb hides.
    // After an overlap the model label is trusted again (see HAND_IDENTITY.md).
    let continuous=false;
    if(this.history.length&&valid.length&&!this.overlapSide){
      const {matches,ambiguous}=associateTemporal(this.history,valid.map(d=>palmCenter(d.landmarks)),timestamp);
      // A visible thumb is anatomical evidence; when it contradicts the spatial
      // match the thumb/ambiguity handling below decides instead.
      if(!ambiguous&&matches.size&&[...matches].every(([i,track])=>thumbMatches(thumbSignature(valid[i]),track.thumb))){
        continuous=true;
        valid=valid.map((d,i)=>{const track=matches.get(i);return track?{...d,handedness:track.handedness}:d;});
        // A newly appearing hand cannot claim the side a continuing hand keeps.
        if(valid.length===2&&matches.size===1&&valid[0].handedness===valid[1].handedness){
          const fresh=matches.has(0)?1:0;valid[fresh]={...valid[fresh],handedness:valid[fresh].handedness==='Left'?'Right':'Left'};
        }
      }
    }
    // A visible thumb contradicting a proposed two-hand reassignment must not
    // silently move an owned object to the other hand. Await observable evidence.
    if(!continuous&&this.history.length===2&&valid.some(d=>{
      const old=this.history.find(h=>h.handedness===d.handedness);
      return old&&!thumbMatches(thumbSignature(d),old.thumb);
    }))return {timestamp,hands:[],ambiguous:true};
    let suppressed=false;
    if(valid.length===2){
      const size=(d:Detection)=>Math.hypot(d.landmarks[5].x-d.landmarks[17].x,d.landmarks[5].y-d.landmarks[17].y)+Math.hypot(d.landmarks[0].x-d.landmarks[9].x,d.landmarks[0].y-d.landmarks[9].y);
      const sizes=valid.map(size),gap=distance(palmCenter(valid[0].landmarks),palmCenter(valid[1].landmarks));
      const overlap=gap<Math.max(.065,Math.min(...sizes)*.55)*(this.overlapSide?1.3:1);
      if(overlap&&valid[0].handedness!==valid[1].handedness){
        // Relative landmark z is wrist-relative, not inter-hand camera depth.
        // Apparent palm size is only a foreground proxy; retain the winner
        // while sizes are close to prevent oscillation during occlusion.
        const previous=valid.findIndex(d=>d.handedness===this.overlapSide);
        const winner=previous>=0&&sizes[previous]>=Math.max(...sizes)*.8?previous:(sizes[1]>sizes[0]?1:0);
        this.overlapSide=valid[winner].handedness;valid=[valid[winner]];suppressed=true;
      }else this.overlapSide=undefined;
    }
    const centers=valid.map(d=>palmCenter(d.landmarks));
    if(!suppressed)this.voteConvention(valid,centers);
    const anatomical=new Map<number,History>();
    const assigned=new Set<number>();
    valid.forEach((d,i)=>{
      const old=this.history.find(h=>h.handedness===d.handedness&&!assigned.has(h.id));
      if(old&&distance(centers[i],old.rawCenter)<.65){anatomical.set(i,old);assigned.add(old.id);}
    });
    if(valid.every(d=>d.handedness==='Left'||d.handedness==='Right')&&new Set(valid.map(d=>d.handedness)).size===valid.length&&new Set(this.history.map(h=>h.handedness)).size===this.history.length){
      const frame=this.build(valid,centers,timestamp,anatomical,false);
      if(suppressed)frame.suppressedHandIds=this.history.filter(h=>!frame.hands.some(d=>d.id===h.id)).map(h=>h.id);
      return frame;
    }
    if(this.predictive){
      const {matches,ambiguous}=associateTemporal(this.history,centers,timestamp);
      if(ambiguous)this.history=[];
      return this.build(valid,centers,timestamp,matches,ambiguous);
    }
    let ambiguous=centers.length===2 && distance(centers[0],centers[1])<trackingConfig.ambiguityDistance;
    // If two spatial assignments have nearly equal cost, ownership cannot be
    // trusted. Expose ambiguity rather than choosing an arbitrary hand identity.
    if(this.history.length===2&&centers.length===2){
      const direct=distance(centers[0],this.history[0].rawCenter)+distance(centers[1],this.history[1].rawCenter);
      const crossed=distance(centers[0],this.history[1].rawCenter)+distance(centers[1],this.history[0].rawCenter);
      if(Math.abs(direct-crossed)<.04&&Math.min(direct,crossed)<trackingConfig.matchDistance*2)ambiguous=true;
    }
    if(this.history.length===2&&centers.length===1){
      const a=distance(centers[0],this.history[0].rawCenter),b=distance(centers[0],this.history[1].rawCenter);
      if(Math.max(a,b)<trackingConfig.matchDistance&&Math.abs(a-b)<.035)ambiguous=true;
    }
    if(ambiguous) this.history=[]; // Never blend two overlapping hands into one filter.
    const candidates=centers.flatMap((center,index)=>this.history.map(history=>({index,history,distance:distance(center,history.rawCenter)}))).sort((a,b)=>a.distance-b.distance);
    const matches=new Map<number,History>(); const used=new Set<number>();
    for(const candidate of candidates) if(candidate.distance<trackingConfig.matchDistance && !matches.has(candidate.index) && !used.has(candidate.history.id)) {matches.set(candidate.index,candidate.history);used.add(candidate.history.id);}
    return this.build(valid,centers,timestamp,matches,ambiguous);
  }
  // Uncrossed, well separated hands show which labelling convention the model
  // uses. Decide once per session so a child crossing arms later cannot flip it.
  private voteConvention(valid:Detection[],centers:Point[]){
    if(this.mirroredLabels!==undefined||valid.length!==2)return;
    const left=valid.findIndex(d=>d.handedness==='Left'),right=valid.findIndex(d=>d.handedness==='Right');
    if(left<0||right<0||Math.abs(centers[left].x-centers[right].x)<.25)return;
    this.conventionVotes+=centers[left].x>centers[right].x?1:-1;
    if(Math.abs(this.conventionVotes)<24)return;
    this.mirroredLabels=this.conventionVotes<0;
    // Arms of hands already tracked must come from the matching screen side.
    if(this.mirroredLabels)for(const h of this.history)h.colorSlot=h.colorSlot===0?1:0;
  }
  private build(valid:Detection[],centers:Point[],timestamp:number,matches:Map<number,History>,ambiguous:boolean):TrackingFrame {
    const used=new Set([...matches.values()].map(h=>h.id));
    const reserved=new Set([...matches.values()].map(h=>h.colorSlot));
    const hands: TrackedHand[]=valid.map((d,index)=>{
      const old=matches.get(index);
      const side=this.mirroredLabels?(d.handedness==='Left'?'Right':d.handedness==='Right'?'Left':d.handedness):d.handedness;
      const preferred=side==='Left'?0:side==='Right'?1:undefined;
      const slot=old?.colorSlot ?? (preferred!==undefined&&!reserved.has(preferred)?preferred:([0,1].find(value=>!reserved.has(value)) ?? index));
      reserved.add(slot);
      const raw=d.landmarks.map(p=>({...p}));
      const elapsed=old?timestamp-old.lastSeen:0;
      const speed=old?distance(centers[index],old.rawCenter)/(Math.max(1,elapsed)/1000):0;
      const tau=this.adaptive?adaptiveTimeConstant(speed,this.stationaryMs,this.fastMs):this.timeConstantMs;
      const points=old && this.smoothing ? smoothPoints(old.smoothed,raw,elapsed,tau) : raw.map(p=>({...p}));
      return {...d,id:old?.id??this.nextId++,colorSlot:slot,raw,landmarks:points,wrist:points[0],thumbTip:points[4],indexTip:points[8],palmCenter:palmCenter(points)};
    });
    // Missing hands yield no active output, even during the short identity grace period.
    this.history=[...hands.map((hand,index)=>{
      const old=matches.get(index),elapsed=old?timestamp-old.lastSeen:0;
      let velocity={x:0,y:0,z:0};
      if(old&&elapsed>0&&elapsed<=180){
        velocity={x:(centers[index].x-old.rawCenter.x)*1000/elapsed,y:(centers[index].y-old.rawCenter.y)*1000/elapsed,z:0};
        const speed=Math.hypot(velocity.x,velocity.y);if(speed>5){velocity.x*=5/speed;velocity.y*=5/speed;}
      }
      return {id:hand.id,colorSlot:hand.colorSlot,handedness:hand.handedness,thumb:old?.thumb??thumbSignature(hand),rawCenter:centers[index],smoothed:hand.landmarks,lastSeen:timestamp,velocity};
    }),...this.history.filter(h=>!used.has(h.id) && !hands.some(hand=>hand.colorSlot===h.colorSlot))].slice(0,2);
    return {timestamp,hands,ambiguous};
  }
}
