import type {Bounds, Point} from './types.ts';
export const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
export function normalizePoint(point: Point): Point {
  return {x: clamp01(point.x), y: clamp01(point.y), z: Number.isFinite(point.z) ? point.z : 0};
}
export function mirrorPoint(point: Point, mirrored: boolean): Point {
  const normalized = normalizePoint(point);
  return {...normalized, x: mirrored ? 1-normalized.x : normalized.x};
}
export function mapPoint(point: Point, width: number, height: number, mirrored = false, bounds?: Bounds) {
  const display = mirrorPoint(point, mirrored);
  const x = bounds ? clamp01((display.x-bounds.left)/Math.max(0.01,bounds.right-bounds.left)) : display.x;
  const y = bounds ? clamp01((display.y-bounds.top)/Math.max(0.01,bounds.bottom-bounds.top)) : display.y;
  return {x: x*Math.max(0,width), y: y*Math.max(0,height)};
}
export function palmCenter(points: Point[]): Point {
  const palm = [0,5,9,13,17].map(index=>points[index]);
  return {x:palm.reduce((sum,p)=>sum+p.x,0)/5, y:palm.reduce((sum,p)=>sum+p.y,0)/5, z:palm.reduce((sum,p)=>sum+p.z,0)/5};
}
