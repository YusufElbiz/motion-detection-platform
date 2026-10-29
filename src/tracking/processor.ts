import {trackingConfig} from './config.ts';
import {palmCenter} from './coordinates.ts';
import {smoothPoints,adaptiveTimeConstant} from './smoothing.ts';
import {associateTemporal} from './association.ts';
import {thumbSignature,thumbMatches,thumbAnatomy,type ThumbSignature} from './thumbIdentity.ts';
import type {Detection, Point, TrackedHand, TrackingFrame} from './types.ts';
// side: accumulated anatomical evidence, positive = right hand, negative = left.
interface History {id: number; colorSlot: number; handedness:string; side:number; thumb?:ThumbSignature; rawCenter: Point; smoothed: Point[]; lastSeen: number;velocity:Point}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export class TrackingProcessor {
  private history: History[]=[];
  private nextId=1;
  private lastTimestamp=-1;
  private overlapSide?:string;
  // Track IDs currently carrying something; they win an overlap.
  priority=new Set<number>();
  // Positive when the model's labels agree with the thumb direction; learned
  // per session so either labelling convention ends up usable.
  labelConvention=0;
  smoothing=true;
  timeConstantMs=trackingConfig.smoothingTimeConstantMs;
  lossTimeoutMs=trackingConfig.lossTimeoutMs;
  adaptive=false;
  predictive=false;
  stationaryMs=55;
  fastMs=8;
  reset() {this.history=[]; this.nextId=1; this.lastTimestamp=-1;this.overlapSide=undefined;this.labelConvention=0;}
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
    if(this.history.length&&valid.length){
      const {matches,ambiguous}=associateTemporal(this.history,valid.map(d=>palmCenter(d.landmarks)),timestamp);
      // A visible thumb is anatomical evidence; when it contradicts the spatial
      // match the thumb/ambiguity handling below decides instead.
      continuous=!ambiguous&&matches.size>0&&[...matches].every(([i,track])=>thumbMatches(thumbSignature(valid[i]),track.thumb));
      if(continuous&&!this.overlapSide){
        valid=valid.map((d,i)=>{const track=matches.get(i);return track?{...d,handedness:track.handedness}:d;});
        // A newly appearing hand cannot claim the side a continuing hand keeps.
        if(valid.length===2&&matches.size===1&&valid[0].handedness===valid[1].handedness){
          const fresh=matches.has(0)?1:0;valid[fresh]={...valid[fresh],handedness:valid[fresh].handedness==='Left'?'Right':'Left'};
        }
      }
    }
    // A visible thumb contradicting a proposed two-hand reassignment must not
    // silently move an owned object to the other hand. Await observable evidence.
    // Identical labels propose no reassignment, so there is nothing to veto.
    if(!continuous&&this.history.length===2&&new Set(valid.map(d=>d.handedness)).size===valid.length&&valid.some(d=>{
      const old=this.history.find(h=>h.handedness===d.handedness);
      return old&&!thumbMatches(thumbSignature(d),old.thumb);
    }))return {timestamp,hands:[],ambiguous:true};
    let suppressed=false;
    if(valid.length===2){
      const size=(d:Detection)=>Math.hypot(d.landmarks[5].x-d.landmarks[17].x,d.landmarks[5].y-d.landmarks[17].y)+Math.hypot(d.landmarks[0].x-d.landmarks[9].x,d.landmarks[0].y-d.landmarks[9].y);
      const sizes=valid.map(size),gap=distance(palmCenter(valid[0].landmarks),palmCenter(valid[1].landmarks));
      const overlap=gap<Math.max(.065,Math.min(...sizes)*.55)*(this.overlapSide?1.3:1);
      // Overlapping palms are suppressed to one hand, also when the model gives
      // both the same label but the hands arrived there continuously; clearing
      // every identity would drop the carry. A teleport stays ambiguous.
      const carrier=this.history.find(h=>this.priority.has(h.id));
      // Same reach gate as temporal association: how far a hand can move since last seen.
      const carrierNear=!!carrier&&Math.min(...valid.map(d=>distance(palmCenter(d.landmarks),carrier.rawCenter)))<Math.min(.4,.12+(timestamp-carrier.lastSeen)*.0024);
      if(overlap&&(valid[0].handedness!==valid[1].handedness||continuous||carrierNear)){
        // Relative landmark z is wrist-relative, not inter-hand camera depth.
        // Apparent palm size is only a foreground proxy; retain the winner
        // while sizes are close to prevent oscillation during occlusion.
        // A hand carrying an object must not vanish behind the other hand:
        // the carry would be cancelled just before reaching the bin.
        // The carrier is found by position: labels are unreliable exactly here.
        const previous=valid.findIndex(d=>d.handedness===this.overlapSide);
        const winner=carrierNear?(distance(palmCenter(valid[0].landmarks),carrier.rawCenter)<=distance(palmCenter(valid[1].landmarks),carrier.rawCenter)?0:1)
          :previous>=0&&sizes[previous]>=Math.max(...sizes)*.8?previous:(sizes[1]>sizes[0]?1:0);
        // The visible hand keeps the carrier's identity (and its object).
        valid=[carrierNear?{...valid[winner],handedness:carrier!.handedness}:valid[winner]];
        this.overlapSide=valid[0].handedness;suppressed=true;
      }else this.overlapSide=undefined;
    }
    const centers=valid.map(d=>palmCenter(d.landmarks));
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
  // Thumb direction counts double; the model label counts once the session has
  // learned whether its convention agrees with the thumb.
  private sideEvidence(d:Detection,old:History|undefined){
    const thumb=thumbAnatomy(thumbSignature(d)),model=d.handedness==='Right'?1:d.handedness==='Left'?-1:0;
    if(thumb&&model)this.labelConvention=Math.max(-40,Math.min(40,this.labelConvention+(thumb===model?1:-1)));
    const label=Math.abs(this.labelConvention)>=8?model*Math.sign(this.labelConvention):0;
    return Math.max(-12,Math.min(12,(old?.side??0)+thumb*2+label));
  }
  // Slot 0 is the arm from the screen's left edge (the child's left hand in the
  // mirrored view). Confident anatomy decides; otherwise the screen position.
  private armSlots(sides:number[],centers:Point[],previous:(number|undefined)[]){
    const confident=sides.map(side=>Math.abs(side)>=4);
    // The image is unmirrored: a large raw x is the screen's left half.
    const slots=sides.map((side,i)=>confident[i]?(side>0?1:0):previous[i]??(centers[i].x>=.5?0:1));
    if(slots.length===2){
      const left=centers[0].x>centers[1].x?0:1,separated=Math.abs(centers[0].x-centers[1].x)>.1;
      if(!confident[0]&&!confident[1]&&separated){slots[left]=0;slots[1-left]=1;}
      else if(slots[0]===slots[1]){
        if(confident[0]!==confident[1]){const keep=confident[0]?0:1;slots[1-keep]=slots[keep]===0?1:0;}
        else{slots[left]=0;slots[1-left]=1;}
      }
    }
    return slots;
  }
  private build(valid:Detection[],centers:Point[],timestamp:number,matches:Map<number,History>,ambiguous:boolean):TrackingFrame {
    const used=new Set([...matches.values()].map(h=>h.id));
    const sides=valid.map((d,index)=>this.sideEvidence(d,matches.get(index)));
    const slots=this.armSlots(sides,centers,valid.map((_,index)=>matches.get(index)?.colorSlot));
    const hands: TrackedHand[]=valid.map((d,index)=>{
      const old=matches.get(index),slot=slots[index];
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
      return {id:hand.id,colorSlot:hand.colorSlot,handedness:hand.handedness,side:sides[index],thumb:old?.thumb??thumbSignature(hand),rawCenter:centers[index],smoothed:hand.landmarks,lastSeen:timestamp,velocity};
    }),...this.history.filter(h=>!used.has(h.id) && !hands.some(hand=>hand.colorSlot===h.colorSlot))].slice(0,2);
    return {timestamp,hands,ambiguous};
  }
}
