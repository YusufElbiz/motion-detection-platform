import type {Point} from './types.ts';
// Time-based EMA: behavior is independent of the configured inference rate.
export function smoothPoints(previous: Point[], current: Point[], elapsedMs: number, timeConstantMs: number): Point[] {
  if(previous.length!==current.length || timeConstantMs<=0) return current.map(point=>({...point}));
  const alpha=1-Math.exp(-Math.max(0,elapsedMs)/timeConstantMs);
  return current.map((point,index)=>({
    x:previous[index].x+alpha*(point.x-previous[index].x),
    y:previous[index].y+alpha*(point.y-previous[index].y),
    z:previous[index].z+alpha*(point.z-previous[index].z),
  }));
}
export function adaptiveTimeConstant(speed:number,stationaryMs=55,fastMs=8){
  const blend=Math.max(0,Math.min(1,(speed-.04)/.8));
  return stationaryMs+(fastMs-stationaryMs)*blend;
}
