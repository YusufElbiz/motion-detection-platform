import type {Detection} from './types.ts';
export interface ThumbSignature {side:-1|1}
// Thumb MCP/IP relative to the wrist→middle-MCP axis, not screen position.
// Never interpret this sign alone as anatomical Left/Right: palm/back view
// reverses it. It corroborates a previously observed, model-labelled track.
export function thumbSignature(d:Detection):ThumbSignature|undefined {
 const p=d.landmarks;if(p.length!==21)return;
 const wrist=p[0],middle=p[9],index=p[5],little=p[17];
 const ax=middle.x-wrist.x,ay=middle.y-wrist.y,axis=Math.hypot(ax,ay);
 const width=Math.hypot(index.x-little.x,index.y-little.y);
 if(axis<.025||width<.025)return;
 const u={x:(index.x-wrist.x)*4/3,y:index.y-wrist.y,z:(index.z-wrist.z)*4/3};
 const v={x:(little.x-wrist.x)*4/3,y:little.y-wrist.y,z:(little.z-wrist.z)*4/3};
 const n={x:u.y*v.z-u.z*v.y,y:u.z*v.x-u.x*v.z,z:u.x*v.y-u.y*v.x};
 if(Math.abs(n.z)/Math.max(1e-8,Math.hypot(n.x,n.y,n.z))<.65)return;
 const offsets=[2,3].map(i=>(ax*(p[i].y-wrist.y)-ay*(p[i].x-wrist.x))/(axis*width));
 if(offsets.some(x=>!Number.isFinite(x)||Math.abs(x)<.28)||Math.sign(offsets[0])!==Math.sign(offsets[1]))return;
 return {side:offsets[0]>0?1:-1};
}
// Anatomical side under the game's assumption that the palm faces the camera
// (open palm / fist toward the screen). In the unmirrored camera image a right
// palm has its thumb toward +x, which thumbSignature reports as side +1.
// A back-of-hand view would invert this, so callers accumulate it as evidence.
export const thumbAnatomy=(signature:ThumbSignature|undefined)=>signature?signature.side:0;
export const thumbMatches=(a:ThumbSignature|undefined,b:ThumbSignature|undefined)=>!a||!b||a.side===b.side;
