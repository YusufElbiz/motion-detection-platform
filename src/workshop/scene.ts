import type {GameInputEvent,Position} from '../input.ts';
import {attachMouse} from '../input.ts';
import type {AudioFeedback} from '../audio.ts';
import type {HandCursor} from '../motion/input.ts';
import {MascotSpeech,squirrelArt,registerVoiceClips} from '../mascot.ts';
import {wasteDefinition} from '../waste.ts';
import {WorkshopWorld,workshopLayout,targetIds,type WorkshopEvent,type WorkshopPhase} from './world.ts';
import {chooseRecipes,paintColors,type Recipe} from './recipes.ts';
import {workshopSpeech,workshopVoiceLines,colorSpeech} from './speech.ts';
import './style.css';

registerVoiceClips(workshopVoiceLines);
export {workshopSpeech};

const L=workshopLayout;
const place=(node:HTMLElement,x:number,y:number)=>{node.style.left=`${x/1280*100}%`;node.style.top=`${y/720*100}%`;};
const photo=(id:string)=>`<img src="/waste/${id}.png" alt="" draggable="false" decoding="async">`;
const nameOf=(id:string)=>wasteDefinition(id)?.name??id;
// Unpainted parts show a soft dot pattern: "this part can be painted".
const dots='<defs><pattern id="ws-dots" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#fffdf5"/><circle cx="8" cy="8" r="2.2" fill="#ddcfb6"/></pattern></defs>';
const craftSvg=(recipe:Recipe,cls:string)=>`<svg class="${cls}" viewBox="0 0 400 320" aria-hidden="true">${dots}${recipe.art}</svg>`;

interface Options {audio:AudioFeedback;mode:()=>'mouse'|'hand';onExit:(choice:'replay'|'menu')=>void}
export class WorkshopScene {
  readonly world:WorkshopWorld;
  readonly root:HTMLElement;
  active=false;
  private options:Options;
  private mascot:MascotSpeech;
  private items=new Map<number,HTMLElement>();
  private phaseUntil=0;
  private lastProgress=0;
  private colorfulSaid=false;
  private needColorAt=-Infinity;
  private mouseBrush:HTMLElement;
  constructor(game:HTMLElement,options:Options){
    this.options=options;
    this.world=new WorkshopWorld(point=>this.regionAt(point));
    this.root=document.createElement('section');this.root.id='workshop';this.root.className='workshop';this.root.hidden=true;
    this.root.setAttribute('aria-label','Geri dönüşüm atölyesi');
    this.root.innerHTML=`<div class="ws-title"><b>GERİ DÖNÜŞÜM ATÖLYESİ</b><span id="ws-step"></span></div>
      <div class="ws-panel ws-tray"><b>Malzemeler</b></div><div class="ws-panel ws-palette"><b>Boyalar</b></div>
      <div class="ws-table"></div><div class="ws-slot"></div><div class="ws-slot"></div>
      <button class="ws-combine" data-target="${targetIds.combine}" type="button">✨<span>Birleştir</span></button>
      <div class="ws-craft"></div><div class="ws-burst" aria-hidden="true">✦ ✧ ★ ✦ ✧</div>
      ${paintColors.map((color,i)=>`<button class="ws-pot" type="button" data-target="${targetIds.pot+i}" style="--paint:${color.value}" aria-label="${color.name} boya"><i></i><span>${color.name}</span></button>`).join('')}
      <button class="ws-done ws-button" type="button" data-target="${targetIds.done}">Bitti ✓</button>
      <aside class="ws-mascot"><div class="mascot-bubble"><b>Topik</b><p id="ws-message" role="status" aria-live="polite"></p></div><div class="ws-squirrel">${squirrelArt('workshop')}</div></aside>
      <div class="ws-gallery"><h2>Küçük mucidin <em>sergisi</em></h2><div class="ws-gallery-row"></div></div>
      <button class="ws-button ws-replay" type="button" data-target="${targetIds.replay}">Yeniden Oyna ↻</button><button class="ws-button ws-menu" type="button" data-target="${targetIds.menu}">Ana Menü ⌂</button>
      <span class="ws-part-label" aria-hidden="true"></span><p class="ws-hint" role="status"></p><div class="ws-mouse-brush" aria-hidden="true"></div>`;
    game.insertBefore(this.root,game.querySelector('#hand-cursors'));
    this.mouseBrush=this.root.querySelector('.ws-mouse-brush')!;
    paintColors.forEach((_,i)=>place(this.root.querySelector<HTMLElement>(`[data-target="${targetIds.pot+i}"]`)!,L.pots[i].x,L.pots[i].y));
    place(this.root.querySelector('.ws-combine')!,L.combine.x,L.combine.y);place(this.root.querySelector('.ws-done')!,L.done.x,L.done.y);
    place(this.root.querySelector('.ws-replay')!,L.gallery.replay.x,L.gallery.replay.y);place(this.root.querySelector('.ws-menu')!,L.gallery.menu.x,L.gallery.menu.y);
    this.root.querySelectorAll<HTMLElement>('.ws-slot').forEach((slot,i)=>place(slot,L.slots[i].x,L.slots[i].y));
    this.mascot=new MascotSpeech(this.root.querySelector('.ws-mascot')!,this.root.querySelector('#ws-message')!,()=>options.audio.muted,active=>options.audio.setVoiceActive('workshop',active));
    attachMouse(this.root,event=>{if(this.active&&options.mode()==='mouse')this.dispatch(event);},1280,720);
    this.root.addEventListener('pointermove',event=>{const r=this.root.getBoundingClientRect();this.mouseBrush.style.left=`${event.clientX-r.left}px`;this.mouseBrush.style.top=`${event.clientY-r.top}px`;});
  }
  start(collected:readonly string[]){
    this.active=true;this.root.hidden=false;this.colorfulSaid=false;
    this.world.start(chooseRecipes(collected));this.load();
    this.say(`${workshopSpeech.welcome} ${this.world.recipe.gather}`);
  }
  stop(){this.active=false;this.world.cancelAll();this.world.phase='idle';this.mascot.hide();this.root.hidden=true;}
  pauseVoice(){this.mascot.stop();}
  // Short spoken prompt for the current step, used as an on-screen hint too.
  hint(){
    const hand=this.options.mode()==='hand',p=this.world.phase;
    return p==='gather'?(hand?'✊ Malzemede yumruk yap → tezgaha taşı → elini aç':'☝ Malzemeyi tut → tezgaha bırak')
      :p==='combine'?(hand?'✊ Sihirli düğmede yumruk yap':'☝ Sihirli düğmeye dokun')
      :p==='paint'?(hand?(this.world.brushOnHold?'🤏 Boyayı iki parmağınla tut → parlayan yere götür → parmaklarını aç':'✋ Boyada bekle → boyanacak yerde bekle'):'☝ Boyayı tut → boyanacak yere sürükle → bırak')
      :p==='gallery'?(hand?'✊ Bir düğmede yumruk yap':'☝ Bir düğme seç'):'';
  }
  dispatch(event:GameInputEvent){
    const result=this.world.dispatch(event);if(result)this.handle(result);
    if(event.source==='mouse')this.render(performance.now());
  }
  private paintSpeech(){return this.options.mode()==='mouse'?workshopSpeech.paintMouse:this.world.brushOnHold?workshopSpeech.paintHand:workshopSpeech.paintDwell;}
  private say(message:string,force=true){this.mascot.say(message,force);}
  private handle(result:WorkshopEvent){
    const now=performance.now();this.lastProgress=now;
    const audio=this.options.audio;
    if(result.kind==='placed'){
      audio.play(true);
      if(result.remaining)this.say(workshopSpeech.another);
      else this.say(this.options.mode()==='hand'?workshopSpeech.readyHand:workshopSpeech.readyMouse);
    }else if(result.kind==='wrong'){audio.play(false);this.say(workshopSpeech.wrong);}
    else if(result.kind==='combine'){audio.play(true);this.root.classList.add('crafting');this.phaseUntil=now+1900;}
    else if(result.kind==='color'){const color=paintColors.find(c=>c.value===result.color);if(color)this.say(colorSpeech(color.id),true);}
    else if(result.kind==='need-color'){if(now-this.needColorAt>4000){this.needColorAt=now;this.say(workshopSpeech.needColor);}this.root.classList.add('need-color');setTimeout(()=>this.root.classList.remove('need-color'),900);}
    else if(result.kind==='painted'){
      const path=this.root.querySelector<SVGPathElement>(`.ws-craft [data-region="${result.region}"]`);
      path?.classList.remove('splash');void path?.getBoundingClientRect();path?.classList.add('splash');
      if(result.complete&&!this.colorfulSaid){this.colorfulSaid=true;this.say(workshopSpeech.colorful);}
    }else if(result.kind==='done'){audio.play(true);this.say(this.world.gallery.at(-1)!.recipe.finished);this.phaseUntil=now+4200;}
    else if(result.kind==='replay'||result.kind==='menu'){const choice=result.kind;this.stop();this.options.onExit(choice);}
  }
  private load(){
    const recipe=this.world.recipe;
    for(const node of this.items.values())node.remove();this.items.clear();
    for(const item of this.world.items){
      const node=document.createElement('button');node.type='button';node.className='ws-item';node.dataset.target=String(item.id);
      node.innerHTML=`${photo(item.wasteId)}<span>${nameOf(item.wasteId)}</span>`;node.setAttribute('aria-label',nameOf(item.wasteId));
      this.root.append(node);this.items.set(item.id,node);
    }
    this.root.querySelectorAll<HTMLElement>('.ws-slot').forEach((slot,i)=>{slot.innerHTML=photo(recipe.items[i]);});
    this.root.querySelector('.ws-craft')!.innerHTML=craftSvg(recipe,'ws-craft-art');
    this.root.querySelector('#ws-step')!.textContent=`${this.world.index+1} / ${this.world.recipes.length} · ${recipe.name}`;
    this.colorfulSaid=false;this.lastProgress=performance.now();
  }
  tick(now:number,cursors:readonly HandCursor[]){
    if(!this.active)return;
    const world=this.world;
    if(world.phase==='crafting'&&now>=this.phaseUntil){world.finishCrafting();this.root.classList.remove('crafting');this.say(`${world.recipe.crafted} ${this.paintSpeech()}`);this.lastProgress=now;}
    if(world.phase==='celebrate'&&now>=this.phaseUntil){
      world.next();
      // next() changes the phase; re-read it rather than the narrowed value.
      const phase:WorkshopPhase=world.phase as WorkshopPhase;
      if(phase==='gather'){this.load();this.say(world.recipe.gather);}
      else if(phase==='gallery'){this.renderGallery();this.say(workshopSpeech.gallery);}
    }
    // A quiet child gets the current instruction again; no penalty, no timer shown.
    if(now-this.lastProgress>15000&&(world.phase==='gather'||world.phase==='combine')){
      this.lastProgress=now;this.say(world.phase==='gather'?world.recipe.gather:this.options.mode()==='hand'?workshopSpeech.readyHand:workshopSpeech.readyMouse);
    }
    // Each hand shows the colour it is carrying on the brush.
    for(const cursor of cursors){
      const node=document.querySelector<HTMLElement>(`#hand-cursors [data-pointer-id="${cursor.id}"]`);if(!node)continue;
      const color=world.phase==='paint'?world.brushes.get(cursor.id):undefined;
      node.classList.toggle('has-brush',!!color);if(color)node.style.setProperty('--brush',color);
    }
    this.render(now);
  }
  private render(_now:number){
    const world=this.world,held=world.heldIds,hovered=new Set(world.hovered.values());
    this.root.dataset.phase=world.phase;
    for(const item of world.items){
      const node=this.items.get(item.id);if(!node)continue;place(node,item.x,item.y);
      node.classList.toggle('held',held.has(item.id));node.classList.toggle('hovered',hovered.has(item.id));
      node.classList.toggle('needed',item.needed&&!item.placed&&world.phase==='gather');node.classList.toggle('placed',item.placed);
    }
    this.root.querySelectorAll<HTMLElement>('[data-target]').forEach(node=>{if(!node.classList.contains('ws-item'))node.classList.toggle('hovered',hovered.has(Number(node.dataset.target)));});
    const brush=world.brushes.get('mouse');
    this.root.querySelectorAll<HTMLElement>('.ws-pot').forEach((pot,i)=>pot.classList.toggle('selected',[...world.brushes.values()].includes(paintColors[i].value)));
    this.mouseBrush.hidden=!(brush&&world.phase==='paint'&&this.options.mode()==='mouse');if(brush)this.mouseBrush.style.setProperty('--brush',brush);
    this.root.querySelectorAll<HTMLElement>('.ws-slot').forEach((slot,i)=>slot.classList.toggle('filled',world.items.some(item=>item.placed&&item.x===L.slots[i].x)));
    const drops=new Set(world.dropTargets.values());
    // Name the part the carried paint will land on, just above the hand.
    const label=this.root.querySelector<HTMLElement>('.ws-part-label')!,carrier=[...world.dropTargets.keys()][0];
    const point=carrier===undefined?undefined:world.dropPoints.get(carrier);
    label.hidden=!point;
    if(point&&carrier!==undefined){label.textContent=world.recipe.regions[world.dropTargets.get(carrier)!];place(label,point.x,Math.max(40,point.y-70));}
    this.root.querySelectorAll<SVGPathElement>('.ws-craft [data-region]').forEach(path=>{const region=Number(path.dataset.region),value=world.paint.get(region)??'';if(path.style.fill!==value)path.style.fill=value;path.classList.toggle('drop-target',drops.has(region));});
    const hint=this.hint(),node=this.root.querySelector('.ws-hint')!;if(node.textContent!==hint)node.textContent=hint;
  }
  private renderGallery(){
    this.root.querySelector('.ws-gallery-row')!.innerHTML=this.world.gallery.map(({recipe,paint})=>{
      const art=craftSvg(recipe,'ws-gallery-art').replace(/data-region="(\d+)"/g,(match,index)=>`${match} style="fill:${paint.get(Number(index))??''}"`);
      return `<figure>${art}<figcaption>${recipe.name}</figcaption></figure>`;
    }).join('');
  }
  // DOM hit test so paint follows each part's real outline. A small ring of
  // samples makes a child's hand a forgiving, wide brush.
  private regionAt(point:Position):number|undefined {
    const svg=this.root.querySelector('.ws-craft-art');if(!svg||this.root.hidden)return;
    const r=this.root.getBoundingClientRect();if(!r.width)return;
    const samples=[[0,0],[16,0],[-16,0],[0,16],[0,-16]];
    for(const [dx,dy] of samples){
      const x=r.left+(point.x+dx)/1280*r.width,y=r.top+(point.y+dy)/720*r.height;
      const hit=document.elementsFromPoint(x,y).find(el=>el instanceof SVGElement&&el.dataset.region!==undefined&&svg.contains(el));
      if(hit)return Number((hit as SVGElement).dataset.region);
    }
  }
}
