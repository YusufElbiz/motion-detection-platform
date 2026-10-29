import type {Category} from './config.ts';

export const binGuideX:Record<Category,number>={plastic:304,paper:528,glass:752,metal:976};
export const binGuideSpeech:Record<Category,string>={
 plastic:'Plastikler buraya! Sarı kutuya, birlikte atalım!',
 paper:'Kâğıtlar buraya! Mavi kutuya, birlikte atalım!',
 glass:'Camlar buraya! Yeşil kutuya, birlikte atalım!',
 metal:'Metaller buraya! Gri kutuya, birlikte atalım!',
};
type Behavior='watching'|'returning'|'celebrating'|'guiding';
interface WatchTarget {id:number;x:number;y:number}

// Driven by active game time: no wandering timers survive a pause or new round.
export class MascotDirector {
 private x=640;
 private destination=640;
 private elapsed=0;
 private expires=0;
 private behavior:Behavior='watching';
 private gaze={x:0,y:0};
 private bins:HTMLElement[];
 private reducedMotion:MediaQueryList;
 private panel:HTMLElement;
 constructor(panel:HTMLElement,game:HTMLElement){
  this.panel=panel;
  this.bins=Array.from(game.querySelectorAll<HTMLElement>('.bin'));
  this.reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
 }
 reset(){this.x=640;this.destination=640;this.elapsed=0;this.expires=0;this.behavior='watching';this.gaze={x:0,y:0};this.clearGuide();this.paint();}
 celebrate(){this.clearGuide();this.behavior='celebrating';this.expires=this.elapsed+1.65;this.paint();}
 guide(category:Category){
  this.clearGuide();this.behavior='guiding';this.destination=binGuideX[category];this.expires=this.elapsed+8;
  this.panel.dataset.guideCategory=category;
  const bin=this.bins.find(bin=>bin.dataset.category===category);bin?.classList.add('mascot-target');
  this.paint();
 }
 stop(){this.clearGuide();this.panel.dataset.behavior='resting';}
 tick(seconds:number,objects:readonly WatchTarget[]=[]){
  const dt=Math.max(0,Math.min(seconds,.05));this.elapsed+=dt;
  if((this.behavior==='guiding'||this.behavior==='celebrating')&&this.elapsed>=this.expires){
   this.clearGuide();this.behavior='returning';this.destination=640;
  }
  const delta=this.destination-this.x;
  if(this.behavior==='guiding'||this.behavior==='returning'){
   const speed=this.behavior==='guiding'?390:210;
   this.x=this.reducedMotion.matches?this.destination:this.x+Math.sign(delta)*Math.min(Math.abs(delta),speed*dt);
   if(Math.abs(this.destination-this.x)<2&&this.behavior==='returning'){this.x=640;this.behavior='watching';}
  }
  this.panel.dataset.direction=delta<0?'left':'right';
  const incoming=objects.reduce<WatchTarget|undefined>((selected,item)=>!selected||item.id>selected.id?item:selected,undefined);
  const target=this.behavior==='guiding'?{x:this.destination,y:570}:incoming;
  const dx=target?Math.max(-1,Math.min(1,(target.x-this.x)/300)):0;
  const dy=target?Math.max(-1,Math.min(1,(target.y-370)/200)):-.15;
  const blend=this.reducedMotion.matches?1:1-Math.exp(-dt/.12);
  this.gaze.x+=(dx*3.2-this.gaze.x)*blend;this.gaze.y+=(dy*2.3-this.gaze.y)*blend;
  this.panel.style.setProperty('--eye-x',`${this.gaze.x.toFixed(2)}px`);
  this.panel.style.setProperty('--eye-y',`${this.gaze.y.toFixed(2)}px`);
  this.panel.style.setProperty('--look-tilt',`${(this.gaze.x*1.4).toFixed(2)}deg`);
  if(incoming)this.panel.dataset.watchingObject=String(incoming.id);else delete this.panel.dataset.watchingObject;
  this.paint();
 }
 private clearGuide(){for(const bin of this.bins)bin.classList.remove('mascot-target');delete this.panel.dataset.guideCategory;}
 private paint(){
  this.panel.style.left=`${this.x/1280*100}%`;
  this.panel.style.top=`${(this.behavior==='guiding'?510:455)/720*100}%`;
  this.panel.dataset.behavior=this.behavior;
  this.panel.dataset.arrived=String(Math.abs(this.destination-this.x)<3);
 }
}
