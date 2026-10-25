import type {Point} from '../tracking/types.ts';
// CSS object-position:center; video is mirrored, canvas is not. No clamping:
// points outside a cover crop must remain outside, not gather at the edges.
export function videoTransform(sourceWidth:number,sourceHeight:number,width:number,height:number,fit:'contain'|'cover'='contain'){
  if(Math.min(sourceWidth,sourceHeight,width,height)<=0)throw new Error('Geçersiz görüntü boyutu');
  const scale=(fit==='cover'?Math.max:Math.min)(width/sourceWidth,height/sourceHeight);
  return {scale,x:(width-sourceWidth*scale)/2,y:(height-sourceHeight*scale)/2,sourceWidth,sourceHeight};
}
export function project(point:Pick<Point,'x'|'y'>,transform:ReturnType<typeof videoTransform>,mirrored=true){
  return {x:transform.x+(mirrored?1-point.x:point.x)*transform.sourceWidth*transform.scale,y:transform.y+point.y*transform.sourceHeight*transform.scale};
}
