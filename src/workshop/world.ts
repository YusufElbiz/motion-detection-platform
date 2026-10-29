import type {GameInputEvent,Position} from '../input.ts';
import type {MotionWorld} from '../motion/input.ts';
import {paintColors,type Recipe} from './recipes.ts';

// Logical 1280 × 720 layout, shared by hit tests and rendering.
export const workshopLayout={
  trayX:140,trayY:[230,380,530],itemRadius:70,
  table:{left:400,right:880,top:380,bottom:610},slots:[{x:560,y:478},{x:720,y:478}],
  combine:{x:640,y:250,r:95},
  pots:paintColors.map((_,i)=>({x:i%2?192:88,y:225+Math.floor(i/2)*130,r:48})),
  done:{x:1110,y:640,w:230,h:90},
  gallery:{replay:{x:390,y:625,w:300,h:90},menu:{x:710,y:625,w:300,h:90}},
};
export const targetIds={pot:100,region:200,combine:300,done:301,replay:400,menu:401} as const;
const BRUSH=999;

export type WorkshopPhase='idle'|'gather'|'combine'|'crafting'|'paint'|'celebrate'|'gallery';
export interface WorkshopItem {id:number;wasteId:string;needed:boolean;x:number;y:number;home:Position;placed:boolean}
export type WorkshopEvent=
  {kind:'picked';item:WorkshopItem}|{kind:'placed';item:WorkshopItem;remaining:number}|{kind:'wrong';item:WorkshopItem}|{kind:'returned';item:WorkshopItem}
  |{kind:'combine'}|{kind:'color';color:string;pointerId:string}|{kind:'painted';region:number;color:string;complete:boolean}
  |{kind:'need-color'}|{kind:'done'}|{kind:'replay'}|{kind:'menu'};
interface Carry {target:number;offset:Position}
const inCircle=(p:Position,c:{x:number;y:number;r:number},pad=0)=>Math.hypot(p.x-c.x,p.y-c.y)<=c.r+pad;
const inBox=(p:Position,b:{x:number;y:number;w:number;h:number},pad=0)=>Math.abs(p.x-b.x)<=b.w/2+pad&&Math.abs(p.y-b.y)<=b.h/2+pad;

export class WorkshopWorld implements MotionWorld {
  phase:WorkshopPhase='idle';
  recipes:Recipe[]=[];
  index=0;
  items:WorkshopItem[]=[];
  paint=new Map<number,string>();
  gallery:{recipe:Recipe;paint:Map<number,string>}[]=[];
  readonly brushes=new Map<string,string>();
  readonly hovered=new Map<string,number>();
  // Region the carried paint would land on, highlighted before release.
  readonly dropTargets=new Map<string,number>();
  readonly dropPoints=new Map<string,Position>();
  // Dwell control cannot "hold" a brush; it paints with single touches.
  brushOnHold=true;
  private carries=new Map<string,Carry>();
  private regionAt:(point:Position)=>number|undefined;
  constructor(regionAt:(point:Position)=>number|undefined){this.regionAt=regionAt;}
  get recipe(){return this.recipes[this.index];}
  // Paint is picked up with a thumb + index pinch (a fist works too).
  get pinchGrab(){return this.phase==='paint'&&this.brushOnHold;}
  get heldIds(){return new Set([...this.carries.values()].map(c=>c.target).filter(id=>id!==BRUSH));}
  start(recipes:Recipe[],random:()=>number=Math.random){
    this.recipes=recipes;this.index=0;this.gallery=[];this.brushes.clear();this.load(random);
  }
  private load(random:()=>number){
    this.cancelAll();this.paint=new Map();this.phase='gather';
    const recipe=this.recipe,ids=[...recipe.items,recipe.distractor];
    // Shuffle tray order so the needed pair is not always on top.
    for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
    this.items=ids.map((wasteId,i)=>{const home={x:workshopLayout.trayX,y:workshopLayout.trayY[i]};return {id:i+1,wasteId,needed:recipe.items.includes(wasteId),...home,home,placed:false};});
  }
  heldBy(pointerId:string){return this.carries.get(pointerId)?.target;}
  objectAt(point:Position,_pointerId?:string):{id:number}|undefined {
    const id=this.targetAt(point);return id===undefined?undefined:{id};
  }
  targetAt(point:Position):number|undefined {
    const L=workshopLayout;
    if(this.phase==='gather'){
      const held=this.heldIds;
      const item=this.items.filter(i=>!i.placed&&!held.has(i.id)).map(i=>({i,d:Math.hypot(i.x-point.x,i.y-point.y)})).filter(e=>e.d<=L.itemRadius+20).sort((a,b)=>a.d-b.d)[0];
      return item?.i.id;
    }
    if(this.phase==='combine')return inCircle(point,L.combine,40)?targetIds.combine:undefined;
    if(this.phase==='paint'){
      const pot=L.pots.findIndex(p=>inCircle(point,p,8));if(pot>=0)return targetIds.pot+pot;
      if(inBox(point,L.done,10))return targetIds.done;
      const region=this.regionAt(point);return region===undefined?undefined:targetIds.region+region;
    }
    if(this.phase==='gallery'){
      if(inBox(point,L.gallery.replay,10))return targetIds.replay;
      if(inBox(point,L.gallery.menu,10))return targetIds.menu;
    }
  }
  // Dwell release target: the craft table while carrying an item.
  targetBin(point:Position){return this.phase==='gather'&&this.overTable(point)?'table':undefined;}
  overTable(point:Position){const t=workshopLayout.table;return point.x>=t.left-30&&point.x<=t.right+30&&point.y>=t.top-60&&point.y<=t.bottom+30;}
  cancel(pointerId:string){
    const carry=this.carries.get(pointerId);this.carries.delete(pointerId);this.hovered.delete(pointerId);this.dropTargets.delete(pointerId);this.dropPoints.delete(pointerId);
    const item=this.items.find(i=>i.id===carry?.target);if(item&&!item.placed){item.x=item.home.x;item.y=item.home.y;}
  }
  cancelAll(){for(const id of [...this.carries.keys()])this.cancel(id);this.hovered.clear();}
  finishCrafting(){if(this.phase==='crafting'){this.phase='paint';this.brushes.clear();}}
  // Called by the scene after the celebration so speech is not cut short.
  next(random:()=>number=Math.random){
    if(this.phase!=='celebrate')return;
    if(this.index+1<this.recipes.length){this.index++;this.load(random);}else{this.cancelAll();this.phase='gallery';}
  }
  dispatch(event:GameInputEvent):WorkshopEvent|undefined {
    const id=event.pointerId;
    if(event.type==='input-disabled'){this.cancel(id);return;}
    if(event.type==='pointer-lost'){this.hovered.delete(id);return;}
    const point=event.position;
    if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
    const carry=this.carries.get(id);
    if(event.type==='pointer'){const target=this.targetAt(point);if(target!==undefined&&!carry)this.hovered.set(id,target);else this.hovered.delete(id);return;}
    if(event.type==='grab-start'){
      if(carry)return;
      const target=event.targetId!==undefined&&event.targetId===this.targetAt(point)?event.targetId:this.targetAt(point);
      if(target===undefined)return;this.hovered.delete(id);
      return this.press(id,target,point,event.source);
    }
    if(!carry)return;
    if(carry.target===BRUSH){
      if(event.type==='grab-held'){const region=this.regionAt(point);this.dropPoints.set(id,point);if(region===undefined)this.dropTargets.delete(id);else this.dropTargets.set(id,region);return;}
      // Opening the fingers drops the paint: the whole part under it is filled.
      if(event.type==='grab-release'){this.carries.delete(id);this.dropTargets.delete(id);this.dropPoints.delete(id);return this.fill(id,point);}
      return;
    }
    const item=this.items.find(i=>i.id===carry.target);
    if(!item||this.phase!=='gather'){this.cancel(id);return;}
    item.x=Math.max(60,Math.min(1220,point.x+carry.offset.x));item.y=Math.max(90,Math.min(680,point.y+carry.offset.y));
    if(event.type==='grab-release'){
      this.carries.delete(id);
      if(!this.overTable(item)){item.x=item.home.x;item.y=item.home.y;return {kind:'returned',item};}
      if(!item.needed){item.x=item.home.x;item.y=item.home.y;return {kind:'wrong',item};}
      const used=new Set(this.items.filter(i=>i.placed).map(i=>i.x));
      const slot=workshopLayout.slots.find(s=>!used.has(s.x))!;
      item.placed=true;item.x=slot.x;item.y=slot.y;
      const remaining=this.items.filter(i=>i.needed&&!i.placed).length;
      if(!remaining){this.cancelAll();this.phase='combine';}
      return {kind:'placed',item,remaining};
    }
  }
  private press(id:string,target:number,point:Position,source:GameInputEvent['source']):WorkshopEvent|undefined {
    if(this.phase==='gather'){
      const item=this.items.find(i=>i.id===target);if(!item)return;
      const offset=source==='mouse'?{x:item.x-point.x,y:item.y-point.y}:{x:0,y:0};
      this.carries.set(id,{target,offset});item.x=point.x+offset.x;item.y=point.y+offset.y;
      return {kind:'picked',item};
    }
    if(target===targetIds.combine&&this.phase==='combine'){this.phase='crafting';return {kind:'combine'};}
    if(this.phase==='gallery')return target===targetIds.replay?{kind:'replay'}:target===targetIds.menu?{kind:'menu'}:undefined;
    if(this.phase!=='paint')return;
    if(target===targetIds.done){this.gallery.push({recipe:this.recipe,paint:new Map(this.paint)});this.cancelAll();this.phase='celebrate';return {kind:'done'};}
    const holdBrush=this.brushOnHold||source==='mouse';
    if(target>=targetIds.pot&&target<targetIds.pot+paintColors.length){
      const color=paintColors[target-targetIds.pot].value;this.brushes.set(id,color);
      // Pinched paint travels with the hand until the fingers open.
      if(holdBrush)this.carries.set(id,{target:BRUSH,offset:{x:0,y:0}});
      return {kind:'color',color,pointerId:id};
    }
    // Touching a part with a colour already chosen fills it straight away.
    if(target>=targetIds.region)return this.brushes.has(id)?this.fill(id,point):{kind:'need-color'};
  }
  private fill(id:string,point:Position):WorkshopEvent|undefined {
    const color=this.brushes.get(id);if(!color||this.phase!=='paint')return;
    const region=this.regionAt(point);
    if(region===undefined||this.paint.get(region)===color)return;
    this.paint.set(region,color);
    return {kind:'painted',region,color,complete:this.paint.size>=this.recipe.regions.length};
  }
}
