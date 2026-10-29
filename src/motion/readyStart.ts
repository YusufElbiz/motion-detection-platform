import type {TrackingFrame} from '../tracking/types.ts';
export class TwoHandsReady {
 progress=0;
 private since?:number;
 private last=-Infinity;
 private pair='';
 private samples=0;
 reset(){this.progress=0;this.since=undefined;this.last=-Infinity;this.pair='';this.samples=0;}
 update(frame:TrackingFrame,enabled:boolean){
  const hands=frame.hands;
  if(!enabled||frame.ambiguous||hands.length!==2||hands[0].id===hands[1].id||!['Left','Right'].every(side=>hands.some(h=>h.handedness===side))){this.reset();return false;}
  const pair=hands.map(h=>h.id).sort((a,b)=>a-b).join(',');
  if(pair!==this.pair||frame.timestamp-this.last>250||frame.timestamp<=this.last){this.since=frame.timestamp;this.samples=0;this.pair=pair;}
  this.last=frame.timestamp;this.since??=frame.timestamp;this.samples++;
  this.progress=Math.min(1,(frame.timestamp-this.since)/400);
  return this.progress===1&&this.samples>=3;
 }
}
