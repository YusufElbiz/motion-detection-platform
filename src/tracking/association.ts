import type {Point} from './types.ts';
export interface TemporalTrack {id:number;rawCenter:Point;lastSeen:number;velocity:Point}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);

// At most two hands: enumerate global assignments instead of picking the
// nearest pair greedily. Velocity is used only for identity, never to invent
// a visible hand, pointer position or gesture between camera samples.
export function associateTemporal<T extends TemporalTrack>(history:T[],centers:Point[],timestamp:number){
  const costs=centers.map(center=>history.map(track=>{
    const elapsed=Math.max(0,timestamp-track.lastSeen);
    const horizon=elapsed<=180?Math.min(100,elapsed)/1000:0;
    const predicted={x:track.rawCenter.x+track.velocity.x*horizon,y:track.rawCenter.y+track.velocity.y*horizon,z:track.rawCenter.z};
    // A deliberate turn/reversal can invalidate constant velocity. Retain a
    // slightly penalized last-position hypothesis rather than forcing inertia.
    const error=Math.min(distance(center,predicted),distance(center,track.rawCenter)+.04),gate=Math.min(.4,.12+elapsed*.0024);
    return error<=gate?error:Infinity;
  }));
  const options:{ids:number[];score:number}[]=[];
  const visit=(ids:number[],used:Set<number>,score:number)=>{
    if(ids.length===centers.length){options.push({ids,score});return;}
    const i=ids.length;visit([...ids,-1],used,score+.5);
    history.forEach((_,j)=>{if(!used.has(j)&&Number.isFinite(costs[i][j]))visit([...ids,j],new Set([...used,j]),score+costs[i][j]);});
  };
  visit([],new Set(),0);options.sort((a,b)=>a.score-b.score);
  const ambiguous=(centers.length===2&&distance(centers[0],centers[1])<.065)||(options.length>1&&options[1].score-options[0].score<.035);
  const matches=new Map<number,T>();
  if(!ambiguous)options[0].ids.forEach((j,i)=>{if(j>=0)matches.set(i,history[j]);});
  return {matches,ambiguous};
}
