import {categoryIds,type Category} from './config.ts';
import {sort,type GameState,type Waste} from './game.ts';
import type {GameInputEvent,Position} from './input.ts';
import {motionConfig} from './motion/config.ts';
interface Carry {objectId:number;offset:Position;position:Position;source:'mouse'|'hand'}
export interface InteractionResult {kind:'grabbed'|'correct'|'incorrect'|'recovered';object:Waste;bin?:Category}
export function binAt(point:Position,padding=0):Category|undefined {
  if(point.y<520-padding||point.y>689+padding)return;
  const nearest=categoryIds.map((category,index)=>({category,distance:Math.abs(point.x-(304+224*index))})).sort((a,b)=>a.distance-b.distance)[0];
  return nearest.distance<=94+padding?nearest.category:undefined;
}
export function objectContains(object:Waste,point:Position,source:'mouse'|'hand'){
  return source==='hand'?Math.hypot(object.x-point.x,object.y-point.y)<=motionConfig.grabRadius:Math.abs(object.x-point.x)<49&&Math.abs(object.y-point.y)<53;
}
export class InteractionController {
  private state:GameState;
  private carries=new Map<string,Carry>();
  readonly hovered=new Map<string,number>();
  readonly binHighlights=new Map<string,Category>();
  enabled=false;
  binPadding=motionConfig.binPadding;
  constructor(state:GameState){this.state=state;}
  get heldIds():ReadonlySet<number>{return new Set([...this.carries.values()].map(c=>c.objectId));}
  heldBy(pointerId:string){return this.carries.get(pointerId)?.objectId;}
  objectAt(point:Position,pointerId:string,source:'mouse'|'hand'='hand'){
    const held=this.heldIds;
    return [...this.state.objects].reverse().filter(object=>!held.has(object.id)||this.heldBy(pointerId)===object.id).find(object=>objectContains(object,point,source));
  }
  targetBin(point:Position,source:'mouse'|'hand'='hand'){return binAt(point,source==='hand'?this.binPadding:0);}
  enable(){this.enabled=true;}
  disable(){for(const id of this.carries.keys())this.cancel(id);this.hovered.clear();this.binHighlights.clear();this.enabled=false;}
  replaceState(state:GameState){this.disable();this.state=state;}
  cancel(pointerId:string){
    const carry=this.carries.get(pointerId);
    const object=this.state.objects.find(o=>o.id===carry?.objectId);
    if(object){object.x=Math.max(55,Math.min(1225,object.x));object.y=Math.min(476,Math.max(155,object.y));}
    this.carries.delete(pointerId);this.hovered.delete(pointerId);this.binHighlights.delete(pointerId);
  }
  dispatch(event:GameInputEvent):InteractionResult|undefined {
    const id=event.pointerId;
    if(event.type==='input-disabled'){this.cancel(id);return;}
    if(event.type==='pointer-lost'){this.hovered.delete(id);this.binHighlights.delete(id);return;}
    if(!this.enabled||this.state.complete||!event.position)return;
    const point=event.position;
    if(!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
    let carry=this.carries.get(id);
    if(event.type==='pointer'){
      const object=this.objectAt(point,id,event.source);
      if(object&&!carry)this.hovered.set(id,object.id);else this.hovered.delete(id);return;
    }
    if(event.type==='grab-start'){
      if(carry)return;
      const object=event.targetId===undefined?this.objectAt(point,id,event.source):this.state.objects.find(o=>o.id===event.targetId&&objectContains(o,point,event.source));
      if(!object||this.heldIds.has(object.id))return;
      carry={objectId:object.id,position:point,source:event.source,offset:event.source==='mouse'?{x:object.x-point.x,y:object.y-point.y}:{x:0,y:0}};
      this.carries.set(id,carry);this.hovered.delete(id);this.move(carry,point,id);return {kind:'grabbed',object};
    }
    if(!carry)return;
    const object=this.state.objects.find(o=>o.id===carry!.objectId);
    if(!object){this.cancel(id);return;}
    if(event.type==='grab-held'){this.move(carry,point,id);return;}
    if(event.type==='grab-release'){
      this.move(carry,point,id);
      const bin=this.targetBin(point,carry.source);
      // Clear ownership before classifying. Further release events become no-ops.
      this.carries.delete(id);this.binHighlights.delete(id);this.hovered.delete(id);
      if(bin){
        if(sort(this.state,object.id,bin))return {kind:'correct',object,bin};
        object.y=430;return {kind:'incorrect',object,bin};
      }
      object.y=Math.min(object.y,476);return {kind:'recovered',object};
    }
  }
  private move(carry:Carry,point:Position,id:string){
    const object=this.state.objects.find(o=>o.id===carry.objectId);if(!object)return;
    object.x=Math.max(50,Math.min(1230,point.x+carry.offset.x));object.y=Math.max(130,Math.min(675,point.y+carry.offset.y));carry.position=point;
    const bin=this.targetBin(point,carry.source);if(bin)this.binHighlights.set(id,bin);else this.binHighlights.delete(id);
  }
}
