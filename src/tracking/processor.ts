import {trackingConfig} from './config.ts';
import {palmCenter} from './coordinates.ts';
import {smoothPoints,adaptiveTimeConstant} from './smoothing.ts';
import {associateTemporal} from './association.ts';
import type {Detection, Point, TrackedHand, TrackingFrame} from './types.ts';
interface History {id: number; colorSlot: number; rawCenter: Point; smoothed: Point[]; lastSeen: number;velocity:Point}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export class TrackingProcessor {
  private history: History[]=[];
  private nextId=1;
  private lastTimestamp=-1;
  smoothing=true;
  timeConstantMs=trackingConfig.smoothingTimeConstantMs;
  lossTimeoutMs=trackingConfig.lossTimeoutMs;
  adaptive=false;
  predictive=false;
  stationaryMs=55;
  fastMs=8;
  reset() {this.history=[]; this.nextId=1; this.lastTimestamp=-1;}
  update(detections: Detection[], timestamp: number): TrackingFrame {
    if(timestamp<this.lastTimestamp) this.reset();
    this.lastTimestamp=timestamp;
    // The API's handedness score is NOT a detection/tracking confidence.
    const valid=detections.filter(d=>d.landmarks.length===21 && d.landmarks.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z))).slice(0,2);
    this.history=this.history.filter(h=>timestamp-h.lastSeen<this.lossTimeoutMs);
    const centers=valid.map(d=>palmCenter(d.landmarks));
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
  private build(valid:Detection[],centers:Point[],timestamp:number,matches:Map<number,History>,ambiguous:boolean):TrackingFrame {
    const used=new Set([...matches.values()].map(h=>h.id));
    const reserved=new Set([...matches.values()].map(h=>h.colorSlot));
    const hands: TrackedHand[]=valid.map((d,index)=>{
      const old=matches.get(index);
      const slot=old?.colorSlot ?? ([0,1].find(value=>!reserved.has(value)) ?? index);
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
      return {id:hand.id,colorSlot:hand.colorSlot,rawCenter:centers[index],smoothed:hand.landmarks,lastSeen:timestamp,velocity};
    }),...this.history.filter(h=>!used.has(h.id) && !hands.some(hand=>hand.colorSlot===h.colorSlot))].slice(0,2);
    return {timestamp,hands,ambiguous};
  }
}
